"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { uploadImage, compressImage } from "@/lib/image-upload";
import { exportToCSV, formatForExport } from "@/lib/export";
import { saveCart, loadCart, clearCart } from "@/lib/cart-storage";
import {
  useKeyboardShortcuts,
  createShortcuts,
} from "@/lib/keyboard-shortcuts";
import { notifications } from "@/lib/notifications";
import { getCurrentDate, toLocalDateString } from "@/utils/formatting";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Sale {
  id: string;
  amount: number;
  payment_method: string;
  description: string;
  date: string;
  created_at: string;
  created_by_name: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  created_at: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

function SalesContent() {
  const router = useRouter();
  const { user, userData, hasPermission, loading: authLoading } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [additional, setAdditional] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Main Dishes");
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [newItemImage, setNewItemImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState<"all" | "cash" | "upi">(
    "all",
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [showExportDateRange, setShowExportDateRange] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const [selectedDate, setSelectedDate] = useState(() => getCurrentDate());
  const isAdmin = userData?.role === "admin";

  // Navigate to previous day
  const goToPreviousDay = () => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() - 1);
    const prevDate = toLocalDateString(current);
    setSelectedDate(prevDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() + 1);
    const nextDate = toLocalDateString(current);
    const today = getCurrentDate();
    // Don't go beyond today
    if (nextDate <= today) {
      setSelectedDate(nextDate);
    }
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = loadCart();
    if (savedCart.length > 0) {
      setCart(savedCart);
      const cartSubtotal = savedCart.reduce((sum, i) => sum + i.total, 0);
      setSubtotal(cartSubtotal.toFixed(2));
      calculateTotal(cartSubtotal.toString(), discount, additional);
      const desc = savedCart.map((i) => `${i.name} x${i.quantity}`).join(", ");
      setDescription(desc);
      notifications.info(
        "Cart Restored",
        `${savedCart.length} items recovered from previous session`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      saveCart(cart);
    } else {
      clearCart();
    }
  }, [cart]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    createShortcuts.newItem(() => {
      setShowAddItem(true);
    }),
    createShortcuts.save(() => {
      if (cart.length > 0 && amount && description) {
        const form = document.querySelector("form");
        if (form) {
          form.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true }),
          );
        }
      }
    }),
    createShortcuts.search(() => {
      searchInputRef.current?.focus();
    }),
    createShortcuts.cancel(() => {
      if (showAddItem) {
        setShowAddItem(false);
      } else if (editingItem) {
        setEditingItem(null);
      } else if (cart.length > 0) {
        if (confirm("Clear cart?")) {
          setCart([]);
          setAmount("");
          setQuantity("1");
          setUnitPrice("");
          setDiscount("");
          setAdditional("");
          setSubtotal("");
          setDescription("");
        }
      }
    }),
  ]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Expand all categories
  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(groupedMenuItems)));
  };

  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Group menu items by category
  const groupedMenuItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    menuItems.forEach((item) => {
      const category = item.category || "Main Dishes";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [menuItems]);

  // Filter and search sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Payment filter
      if (filterPayment !== "all" && sale.payment_method !== filterPayment) {
        return false;
      }

      // Category filter - check if sale description includes items from selected category
      if (filterCategory !== "all") {
        const categoryMatch = sale.description
          .toLowerCase()
          .includes(filterCategory.toLowerCase());
        if (!categoryMatch) {
          return false;
        }
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          sale.description.toLowerCase().includes(search) ||
          sale.amount.toString().includes(search) ||
          sale.created_by_name.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [sales, searchTerm, filterPayment, filterCategory]);

  // Get recently used menu items for quick actions
  const recentItems = useMemo(() => {
    const itemCounts: Record<string, number> = {};

    sales.slice(0, 20).forEach((sale) => {
      const items = sale.description.split(",").map((s) => s.trim());
      items.forEach((itemName) => {
        itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
      });
    });

    return Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name]) => menuItems.find((item) => item.name === name))
      .filter(Boolean) as MenuItem[];
  }, [sales, menuItems]);

  // Auto-expand categories with frequently used items (logical default)
  useEffect(() => {
    if (recentItems.length > 0 && expandedCategories.size === 0) {
      const categoriesToExpand = new Set<string>();
      recentItems.forEach((item) => {
        if (item.category) {
          categoriesToExpand.add(item.category);
        }
      });
      // If no categories from recent items, expand the first category
      if (
        categoriesToExpand.size === 0 &&
        Object.keys(groupedMenuItems).length > 0
      ) {
        categoriesToExpand.add(Object.keys(groupedMenuItems)[0]);
      }
      setExpandedCategories(categoriesToExpand);
    }
  }, [recentItems, groupedMenuItems, expandedCategories.size]);

  // Check permission - Only users with canAddSales permission can access
  useEffect(() => {
    console.log(
      `🔐 Sales page auth check: authLoading=${authLoading}, user=${!!user}, userData=${!!userData}, role=${userData?.role}`,
    );

    // Wait for auth to finish loading
    if (authLoading) {
      console.log("⏳ Auth still loading, waiting...");
      return;
    }

    // If user exists but userData not loaded yet, wait
    if (user && !userData) {
      console.warn(
        "⚠️ userData is null but user exists - waiting for userData to load",
      );
      return;
    }

    // Now check permission only if userData is available
    if (userData && !hasPermission("canAddSales")) {
      console.log("❌ No canAddSales permission - redirecting to dashboard");
      router.push("/dashboard");
    } else if (userData) {
      console.log("✅ Sales access confirmed");
    }
  }, [userData, user, hasPermission, router, authLoading]);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    if (type === "success") {
      notifications.success(text);
    } else {
      notifications.error(text);
    }
    // Keep old state for backwards compatibility
    setMessageType(type);
    setMessage(text);
    setTimeout(() => setMessage(""), 4000);
  }, []);

  const fetchMenuItems = useCallback(async () => {
    try {
      console.log("🔍 Fetching menu items...");
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .is("deleted_at", null)
        .order("name")
        .limit(100); // Limit for faster load

      if (error) {
        console.error("❌ Menu items error:", error);
        return;
      }
      console.log("✅ Menu items fetched:", data?.length || 0, "items");
      if (data) setMenuItems(data);
    } catch (error) {
      console.error("❌ Error fetching menu items:", error);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .is("deleted_at", null)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false })
        .limit(50); // Limit for faster load

      if (error) throw error;
      if (data) setSales(data);
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    console.log("Sales page useEffect - user:", user ? "logged in" : "null");
    if (user && hasPermission("canAddSales")) {
      fetchSales();
      fetchMenuItems();
    }
  }, [user, hasPermission, fetchSales, fetchMenuItems]);

  const handleSelectItem = (item: MenuItem) => {
    const qty = parseFloat(quantity) || 1;
    const itemTotal = item.price * qty;

    const newCartItem: CartItem = {
      id: item.id + "-" + Date.now(),
      name: item.name,
      price: item.price,
      quantity: qty,
      total: itemTotal,
    };

    const updatedCart = [...cart, newCartItem];
    setCart(updatedCart);

    // Calculate cart subtotal
    const cartSubtotal = updatedCart.reduce((sum, i) => sum + i.total, 0);
    setSubtotal(cartSubtotal.toFixed(2));
    calculateTotal(cartSubtotal.toString(), discount, additional);

    // Update description with all items
    const desc = updatedCart.map((i) => `${i.name} x${i.quantity}`).join(", ");
    setDescription(desc);

    // Reset quantity for next item
    setQuantity("1");
    setSelectedItem("");
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    const updatedCart = cart.filter((i) => i.id !== cartItemId);
    setCart(updatedCart);

    // Recalculate
    const cartSubtotal = updatedCart.reduce((sum, i) => sum + i.total, 0);
    setSubtotal(cartSubtotal.toFixed(2));
    calculateTotal(cartSubtotal.toString(), discount, additional);

    const desc = updatedCart.map((i) => `${i.name} x${i.quantity}`).join(", ");
    setDescription(desc);
  };

  const calculateTotal = (sub: string, disc: string, add: string) => {
    const subtotalVal = parseFloat(sub) || 0;
    const discountVal = parseFloat(disc) || 0;
    const additionalVal = parseFloat(add) || 0;
    const total = subtotalVal - discountVal + additionalVal;
    setAmount(total.toFixed(2));
  };

  const handleQuantityChange = (newQty: string) => {
    setQuantity(newQty);
    if (unitPrice && parseFloat(unitPrice) > 0) {
      const qty = parseFloat(newQty) || 1;
      const price = parseFloat(unitPrice);
      const sub = price * qty;
      setSubtotal(sub.toFixed(2));
      calculateTotal(sub.toString(), discount, additional);
    }
  };

  const handleDiscountChange = (newDisc: string) => {
    setDiscount(newDisc);
    calculateTotal(subtotal, newDisc, additional);
  };

  const handleAdditionalChange = (newAdd: string) => {
    setAdditional(newAdd);
    calculateTotal(subtotal, discount, newAdd);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Compress image before upload
      const compressedFile = await compressImage(file);

      // Upload to Supabase Storage
      const imageUrl = await uploadImage(compressedFile);

      if (imageUrl) {
        setNewItemImage(imageUrl);
        showMessage("success", "✓ Image uploaded!");
      } else {
        showMessage("error", "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      showMessage("error", "Failed to upload image");
    } finally {
      setUploadingImage(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleEditImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditUploadingImage(true);
    try {
      // Compress image before upload
      const compressedFile = await compressImage(file);

      // Upload to Supabase Storage
      const imageUrl = await uploadImage(compressedFile);

      if (imageUrl) {
        setEditImage(imageUrl);
        showMessage("success", "✓ Image uploaded!");
      } else {
        showMessage("error", "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      showMessage("error", "Failed to upload image");
    } finally {
      setEditUploadingImage(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleAddMenuItem = async () => {
    if (
      !newItemName.trim() ||
      newItemPrice.trim() === "" ||
      isNaN(parseFloat(newItemPrice)) ||
      parseFloat(newItemPrice) < 0
    ) {
      showMessage("error", "Enter item name and valid price (0 or more)");
      return;
    }

    try {
      console.log(
        "🔍 Adding menu item:",
        newItemName,
        parseFloat(newItemPrice),
      );
      const { data, error } = await supabase
        .from("menu_items")
        .insert([
          {
            name: newItemName.trim(),
            price: parseFloat(newItemPrice),
            category:
              newItemCategory === "Custom"
                ? newCustomCategory.trim()
                : newItemCategory,
            image_url: newItemImage.trim() || null,
          },
        ])
        .select();

      if (error) {
        console.error("❌ Error adding menu item:", error);
        throw error;
      }

      console.log("✅ Menu item added:", data);
      showMessage("success", `✓ ${newItemName} added to menu!`);
      setNewItemName("");
      setNewItemPrice("");
      setNewItemCategory("Main Dishes");
      setNewCustomCategory("");
      setNewItemImage("");
      setShowAddItem(false);
      await fetchMenuItems();
    } catch (error: any) {
      console.error("❌ Failed to add menu item:", error);
      const errorMsg = error?.message || error?.hint || JSON.stringify(error);
      showMessage("error", `Failed to add item: ${errorMsg}`);
    }
  };

  const handleUpdateMenuItem = async () => {
    if (
      !editName.trim() ||
      editPrice.trim() === "" ||
      isNaN(parseFloat(editPrice)) ||
      parseFloat(editPrice) < 0 ||
      !editingItem
    ) {
      showMessage("error", "Enter valid name and price (0 or more)");
      return;
    }

    try {
      const { error } = await supabase
        .from("menu_items")
        .update({
          name: editName.trim(),
          price: parseFloat(editPrice),
          category:
            editCategory === "Custom"
              ? editCustomCategory.trim()
              : editCategory,
          image_url: editImage.trim() || null,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      showMessage("success", `✓ ${editName} updated!`);
      setEditingItem(null);
      setEditName("");
      setEditPrice("");
      setEditCategory("");
      setEditCustomCategory("");
      setEditImage("");
      await fetchMenuItems();
    } catch (error: any) {
      console.error("❌ Failed to update menu item:", error);
      const errorMsg = error?.message || error?.hint || JSON.stringify(error);
      showMessage("error", `Failed to update item: ${errorMsg}`);
    }
  };

  const handleDeleteMenuItem = async (item: MenuItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      showMessage("success", `✓ ${item.name} deleted`);
      await fetchMenuItems();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      showMessage("error", "Failed to delete item");
    }
  };

  const startEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    const itemCategory = item.category || "Main Dishes";
    const predefinedCategories = [
      "Main Dishes",
      "Sides",
      "Beverages",
      "Desserts",
      "Specials",
    ];
    if (predefinedCategories.includes(itemCategory)) {
      setEditCategory(itemCategory);
      setEditCustomCategory("");
    } else {
      setEditCategory("Custom");
      setEditCustomCategory(itemCategory);
    }
    setEditImage(item.image_url || "");
  };

  const handleExportSales = async () => {
    // If date range is selected, fetch data for that range
    if (showExportDateRange && exportStartDate && exportEndDate) {
      try {
        const { data, error } = await supabase
          .from("sales")
          .select("*")
          .is("deleted_at", null)
          .gte("date", exportStartDate)
          .lte("date", exportEndDate)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          showMessage("error", "No sales data in selected date range");
          return;
        }

        const exportData = formatForExport(data, {
          date: "Date",
          amount: "Amount (₹)",
          payment_method: "Payment Method",
          description: "Description",
          created_by_name: "Created By",
          created_at: "Time",
        });

        exportToCSV(exportData, `sales_${exportStartDate}_to_${exportEndDate}`);
        showMessage("success", "✓ Sales exported!");
        notifications.success(
          "Export Complete",
          `${data.length} sales records exported`,
        );
        setShowExportDateRange(false);
      } catch (error) {
        console.error("Error exporting sales:", error);
        showMessage("error", "Failed to export sales");
      }
    } else {
      // Export current filtered sales
      if (filteredSales.length === 0) {
        showMessage("error", "No sales data to export");
        return;
      }

      const exportData = formatForExport(filteredSales, {
        date: "Date",
        amount: "Amount (₹)",
        payment_method: "Payment Method",
        description: "Description",
        created_by_name: "Created By",
        created_at: "Time",
      });

      exportToCSV(exportData, `sales_${selectedDate}`);
      showMessage("success", "✓ Sales exported!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      amount.trim() === "" ||
      isNaN(parseFloat(amount)) ||
      parseFloat(amount) < 0
    ) {
      showMessage("error", "₹ Please enter valid amount (0 or more)");
      return;
    }

    if (!description.trim()) {
      showMessage("error", "Please enter what you sold");
      return;
    }

    if (!user || !userData) {
      showMessage("error", "User not authenticated");
      return;
    }

    setLoading(true);

    // Timeout to prevent infinite loading (15 seconds)
    const saveTimeout = setTimeout(() => {
      setLoading(false);
      showMessage("error", "Connection timeout. Check Supabase");
    }, 15000);

    try {
      console.log("💾 Attempting to save sale...");
      console.log("User ID:", user.id);
      console.log("Amount:", amount);
      console.log("Description:", description);

      const { data, error } = await supabase
        .from("sales")
        .insert({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          description: description.trim(),
          date: selectedDate,
          created_by: user.id,
          created_by_name: userData.displayName,
        })
        .select();

      clearTimeout(saveTimeout);

      if (error) {
        console.error("Supabase error:", error);
        showMessage(
          "error",
          `Save failed: ${error.message || error.code || "Unknown error"}`,
        );
        setLoading(false);
        return;
      }

      showMessage("success", `✓ ₹${amount} sale saved!`);
      notifications.success("Sale Saved", `₹${amount} recorded successfully`);
      setCart([]);
      clearCart(); // Clear localStorage
      setAmount("");
      setAmount("");
      setQuantity("1");
      setUnitPrice("");
      setDiscount("");
      setAdditional("");
      setSubtotal("");
      setDescription("");
      setSelectedItem("");

      // Don't await - fetch in background
      fetchSales().catch(console.error);
    } catch (error) {
      clearTimeout(saveTimeout);
      console.error("Error saving sale:", error);
      showMessage("error", "Failed to save. Try again");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sale?")) return;

    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (!error) {
      showMessage("success", "Sale deleted");
      fetchSales();
    }
  };

  const totalCash = useMemo(
    () =>
      sales
        .filter((s) => s.payment_method === "cash")
        .reduce((sum, s) => sum + s.amount, 0),
    [sales],
  );
  const totalUPI = useMemo(
    () =>
      sales
        .filter((s) => s.payment_method === "upi")
        .reduce((sum, s) => sum + s.amount, 0),
    [sales],
  );
  const totalSales = useMemo(() => totalCash + totalUPI, [totalCash, totalUPI]);

  console.log(
    "Sales page render - authLoading:",
    authLoading,
    "user:",
    user ? "logged in" : "null",
    "userData:",
    userData,
  );

  // Only show loading on initial mount (when there's no user yet)
  // If user exists, show page even during auth checks
  if (authLoading && !user) {
    return <LoadingSpinner size="lg" text="Loading sales..." fullScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300 text-lg font-medium">
            Please log in to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-center font-medium ${
              messageType === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {message}
          </div>
        )}

        {/* Header with Date Selector */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                💰 Record Sale
              </h1>
              <p className="text-gray-600 text-sm">
                {selectedDate === getCurrentDate() ? (
                  <span className="font-semibold text-blue-600">📅 Today</span>
                ) : (
                  new Date(selectedDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                )}
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  📅 View Date:
                </label>
                <button
                  type="button"
                  onClick={goToPreviousDay}
                  className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-lg text-gray-700 font-bold transition-colors"
                  title="Previous Day"
                >
                  ←
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getCurrentDate()}
                  className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={goToNextDay}
                  disabled={selectedDate >= getCurrentDate()}
                  className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-lg text-gray-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Day"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Sale Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 mb-4">
          <div className="space-y-4">
            {/* Menu Items Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-bold text-gray-900">
                  🍗 Select Item
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
                >
                  {showAddItem ? "✕ Cancel" : "+ New"}
                </button>
              </div>

              {/* Quick Actions - Frequently Used Items */}
              {recentItems.length > 0 && !showAddItem && (
                <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-yellow-800 mb-2">
                    ⚡ Quick Add (Frequently Used)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recentItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className="bg-white hover:bg-yellow-100 border-2 border-yellow-300 text-gray-900 p-2 rounded-lg text-sm font-medium transition-all"
                      >
                        <div className="font-bold">{item.name}</div>
                        <div className="text-xs text-gray-600">
                          ₹{item.price}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Menu Item */}
              {showAddItem && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Item name"
                      className="p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Price ₹"
                      className="p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none mb-2"
                  >
                    <option value="Main Dishes">Main Dishes</option>
                    <option value="Sides">Sides</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Specials">Specials</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {newItemCategory === "Custom" && (
                    <input
                      type="text"
                      value={newCustomCategory}
                      onChange={(e) => setNewCustomCategory(e.target.value)}
                      placeholder="Enter custom category name"
                      className="w-full p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none mb-2"
                    />
                  )}
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Image (URL or Upload)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItemImage}
                        onChange={(e) => setNewItemImage(e.target.value)}
                        placeholder="Image URL (optional)"
                        className="flex-1 p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                      />
                      <label className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                        <span
                          className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all inline-block ${
                            uploadingImage
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {uploadingImage ? "📤..." : "📷 Upload"}
                        </span>
                      </label>
                    </div>
                    {newItemImage && (
                      <div className="mt-2 relative w-20 h-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={newItemImage}
                          alt="Preview"
                          className="w-full h-full object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => setNewItemImage("")}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMenuItem}
                    className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    ✓ Add to Menu
                  </button>
                </div>
              )}

              {/* Edit Menu Item Modal */}
              {editingItem && userData?.role === "admin" && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-900">
                      Edit: {editingItem.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Item name"
                      className="p-2 border rounded-md text-sm text-gray-900"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Price ₹"
                      className="p-2 border rounded-md text-sm text-gray-900"
                    />
                  </div>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm text-gray-900 mb-2"
                  >
                    <option value="Main Dishes">Main Dishes</option>
                    <option value="Sides">Sides</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Specials">Specials</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {editCategory === "Custom" && (
                    <input
                      type="text"
                      value={editCustomCategory}
                      onChange={(e) => setEditCustomCategory(e.target.value)}
                      placeholder="Enter custom category name"
                      className="w-full p-2 border rounded-md text-sm text-gray-900 mb-2"
                    />
                  )}
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Image (URL or Upload)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        placeholder="Image URL (optional)"
                        className="flex-1 p-2 border rounded-md text-sm text-gray-900"
                      />
                      <label className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageUpload}
                          disabled={editUploadingImage}
                          className="hidden"
                        />
                        <span
                          className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all inline-block ${
                            editUploadingImage
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {editUploadingImage ? "📤..." : "📷 Upload"}
                        </span>
                      </label>
                    </div>
                    {editImage && (
                      <div className="mt-2 relative w-20 h-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editImage}
                          alt="Preview"
                          className="w-full h-full object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => setEditImage("")}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateMenuItem}
                    className="w-full bg-orange-600 text-white py-2 rounded-md text-sm font-medium hover:bg-orange-700"
                  >
                    ✓ Update Item
                  </button>
                </div>
              )}

              {/* Menu Items Grid */}
              <div>
                {/* Category Expand/Collapse Controls */}
                {menuItems.length > 0 && (
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                    <span className="text-sm font-bold text-gray-700">
                      📂 {Object.keys(groupedMenuItems).length} Categories
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={expandAll}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
                      >
                        ▼ Expand All
                      </button>
                      <button
                        type="button"
                        onClick={collapseAll}
                        className="text-xs px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium"
                      >
                        ▲ Collapse All
                      </button>
                    </div>
                  </div>
                )}

                {menuItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No menu items yet. Click &quot;+ New&quot; to add items.
                  </div>
                ) : (
                  Object.entries(groupedMenuItems).map(([category, items]) => {
                    const isExpanded = expandedCategories.has(category);
                    return (
                      <div
                        key={category}
                        className="mb-3 border border-gray-200 rounded-lg overflow-hidden"
                      >
                        {/* Category Header - Clickable */}
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-all"
                        >
                          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-red-600">
                              {isExpanded ? "▼" : "▶"}
                            </span>
                            {category}
                            <span className="text-xs font-normal text-gray-600 bg-white px-2 py-0.5 rounded-full">
                              {items.length}
                            </span>
                          </h3>
                        </button>

                        {/* Category Items - Collapsible */}
                        {isExpanded && (
                          <div className="p-3 bg-white">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {items.map((item) => (
                                <div key={item.id} className="relative">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectItem(item)}
                                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                                      selectedItem === item.name
                                        ? "bg-red-600 text-white border-red-700"
                                        : "bg-white text-gray-900 border-gray-300 hover:border-red-500"
                                    }`}
                                  >
                                    {item.image_url ? (
                                      <div className="w-full h-16 mb-1 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={item.image_url}
                                          alt={item.name}
                                          className="max-w-full max-h-full object-contain rounded"
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-2xl mb-1">🍗</div>
                                    )}
                                    <div className="font-bold text-sm">
                                      {item.name}
                                    </div>
                                    <div className="text-base font-bold mt-1">
                                      ₹{item.price}
                                    </div>
                                  </button>
                                  {userData?.role === "admin" && (
                                    <div className="absolute top-1 right-1 flex gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditItem(item);
                                        }}
                                        className="bg-blue-600 text-white rounded-full w-6 h-6 text-xs hover:bg-blue-700"
                                        title="Edit"
                                      >
                                        ✎
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteMenuItem(item);
                                        }}
                                        className="bg-red-600 text-white rounded-full w-6 h-6 text-xs hover:bg-red-700"
                                        title="Delete"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cart Items List */}
            {cart.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  🛒 Cart ({cart.length} items)
                </h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          ₹{item.price} × {item.quantity} = ₹
                          {item.total.toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="ml-2 bg-red-600 text-white rounded-full w-7 h-7 text-xs hover:bg-red-700 flex items-center justify-center"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity, Subtotal, Discount, Additional, Total */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  🔢 Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full p-2.5 text-base border-2 border-gray-300 rounded-lg text-gray-900 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  💵 Subtotal (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={subtotal}
                  readOnly
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full p-2.5 text-base border-2 border-gray-300 bg-gray-100 rounded-lg text-gray-900 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Discount and Additional */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  💸 Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className="w-full p-2.5 text-base border-2 border-gray-300 rounded-lg text-gray-900 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  ➕ Additional (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additional}
                  onChange={(e) => handleAdditionalChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className="w-full p-2.5 text-base border-2 border-gray-300 rounded-lg text-gray-900 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Final Total */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                ✅ Final Total (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="Auto-calculated"
                className="w-full p-3 text-lg font-bold border-2 border-green-500 bg-slate-700 rounded-lg text-green-400 focus:border-green-400 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                📝 Details (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Auto-filled or add notes"
                className="w-full p-2.5 text-base border-2 border-gray-300 rounded-lg text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                💳 Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    paymentMethod === "cash"
                      ? "bg-green-600 text-white border-green-700"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    paymentMethod === "upi"
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                  }`}
                >
                  📱 UPI/Card
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Saving..." : "✓ Save Sale"}
            </button>
          </div>
        </form>

        {/* Today's Summary */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 mb-4 text-white">
          <h2 className="text-base font-bold mb-3">📊 Today&apos;s Total</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs opacity-90">Total</div>
              <div className="text-xl font-bold">
                ₹{totalSales.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-90">Cash</div>
              <div className="text-xl font-bold">
                ₹{totalCash.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-90">UPI</div>
              <div className="text-xl font-bold">
                ₹{totalUPI.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>

        {/* Sales List */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-gray-900">
              Today&apos;s Sales ({filteredSales.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportDateRange(!showExportDateRange)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
              >
                📅 {showExportDateRange ? "Cancel" : "Date Range"}
              </button>
              <button
                onClick={handleExportSales}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
              >
                📥 Export
              </button>
            </div>
          </div>

          {/* Export Date Range Selection */}
          {showExportDateRange && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-bold text-blue-800 mb-2">
                Select Date Range for Export
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-700 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    max={getCurrentDate()}
                    className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-700 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    max={getCurrentDate()}
                    min={exportStartDate}
                    className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="mb-3 space-y-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by description, amount, or user..."
              className="w-full p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />

            {/* Category Filter */}
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">🍽️ All Categories</option>
                {Object.keys(groupedMenuItems).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterPayment("all")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  filterPayment === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterPayment("cash")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  filterPayment === "cash"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setFilterPayment("upi")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  filterPayment === "upi"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📱 UPI
              </button>
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">
                {searchTerm || filterPayment !== "all"
                  ? "No matching sales found"
                  : "No sales yet today"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-green-600">
                          ₹{sale.amount.toLocaleString("en-IN")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            sale.payment_method === "cash"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {sale.payment_method === "cash"
                            ? "💵 Cash"
                            : "📱 UPI"}
                        </span>
                      </div>
                      <div className="text-gray-700 text-sm font-medium">
                        {sale.description}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {new Date(sale.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {sale.created_by_name && ` • ${sale.created_by_name}`}
                      </div>
                    </div>
                    {userData?.role === "admin" && (
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="ml-3 bg-red-100 text-red-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-200"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  return (
    <ProtectedRoute>
      <SalesContent />
    </ProtectedRoute>
  );
}

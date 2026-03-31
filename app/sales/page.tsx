"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Receipt,
  RotateCcw,
  Tag,
  CreditCard,
  Wallet,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Image as ImageIcon,
  LayoutGrid,
  X,
  Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { uploadImage, compressImage } from "@/lib/image-upload";
import { exportToCSV, formatForExport } from "@/lib/export";
import { saveCart, loadCart, clearCart } from "@/lib/cart-storage";
import { queueOperation } from "@/lib/offline-queue";
import {
  useKeyboardShortcuts,
  createShortcuts,
} from "@/lib/keyboard-shortcuts";
import { notifications } from "@/lib/notifications"
import { logger } from "@/lib/logger";
import { getCurrentDate, toLocalDateString } from "@/utils/formatting";
import { formatINR } from "@/lib/currency";
import PremiumLoader from "@/components/PremiumLoader";
import { cn } from "@/lib/utils";


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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [quickSaleMode, setQuickSaleMode] = useState(false);
  const [quickSaleAmount, setQuickSaleAmount] = useState("");
  const [quickSalePayment, setQuickSalePayment] = useState<"cash" | "upi">("cash");
  const [quickSaleDesc, setQuickSaleDesc] = useState("");
  const [savingQuickSale, setSavingQuickSale] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

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

  // Filter menu items by search
  const filteredMenuItems = useMemo(() => {
    if (!searchTerm) return menuItems;
    const term = searchTerm.toLowerCase();
    return menuItems.filter((item) =>
      item.name.toLowerCase().includes(term) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
  }, [menuItems, searchTerm]);

  // Group menu items by category
  const groupedMenuItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredMenuItems.forEach((item) => {
      const category = item.category || "Main Dishes";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [filteredMenuItems]);

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(groupedMenuItems)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

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
    if (searchTerm) {
      setExpandedCategories(new Set(Object.keys(groupedMenuItems)));
    } else {
      setExpandedCategories(new Set());
    }
  }, [searchTerm, groupedMenuItems]);

  // Initial expand for first category on mount
  useEffect(() => {
    if (!searchTerm && recentItems.length > 0 && expandedCategories.size === 0) {
      const categoriesToExpand = new Set<string>();
      recentItems.forEach((item) => {
        if (item.category) {
          categoriesToExpand.add(item.category);
        }
      });
      if (categoriesToExpand.size === 0 && Object.keys(groupedMenuItems).length > 0) {
        categoriesToExpand.add(Object.keys(groupedMenuItems)[0]);
      }
      setExpandedCategories(categoriesToExpand);
    }
  }, [recentItems, groupedMenuItems, expandedCategories.size, searchTerm]);

  // Check permission - Only users with canAddSales permission can access
  useEffect(() => {
    logger.debug(
      `🔐 Sales page auth check: authLoading=${authLoading}, user=${!!user}, userData=${!!userData}, role=${userData?.role}`,
    );

    // Wait for auth to finish loading
    if (authLoading) {
      logger.debug("⏳ Auth still loading, waiting...");
      return;
    }

    // If user exists but userData not loaded yet, wait
    if (user && !userData) {
      logger.warn(
        "⚠️ userData is null but user exists - waiting for userData to load",
      );
      return;
    }

    // Now check permission only if userData is available
    if (userData && !hasPermission("canAddSales")) {
      logger.debug("❌ No canAddSales permission - redirecting to dashboard");
      router.push("/dashboard");
    } else if (userData) {
      logger.debug("✅ Sales access confirmed");
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
      logger.debug("🔍 Fetching menu items...");
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .is("deleted_at", null)
        .order("name")
        .limit(100); // Limit for faster load

      if (error) {
        logger.error("❌ Menu items error:", error);
        return;
      }
      logger.debug("✅ Menu items fetched:", data?.length || 0, "items");
      if (data) setMenuItems(data);
    } catch (error) {
      logger.error("❌ Error fetching menu items:", error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchCustomers = async () => {
      try {
        const { data } = await supabase
          .from("customers")
          .select("id, name, phone")
          .order("name")
          .limit(200);
        if (data) setCustomers(data);
      } catch (err) {
        logger.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, [user]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const term = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))
    );
  }, [customers, customerSearch]);

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
      logger.error("Error fetching sales:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    logger.debug("Sales page useEffect - user:", user ? "logged in" : "null");
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
    const val = parseFloat(newDisc);
    if (!isNaN(val) && val < 0) return;
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
      logger.error("Image upload error:", error);
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
      logger.error("Image upload error:", error);
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
      logger.debug(
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
        logger.error("❌ Error adding menu item:", error);
        throw error;
      }

      logger.debug("✅ Menu item added:", data);
      showMessage("success", `✓ ${newItemName} added to menu!`);
      setNewItemName("");
      setNewItemPrice("");
      setNewItemCategory("Main Dishes");
      setNewCustomCategory("");
      setNewItemImage("");
      setShowAddItem(false);
      await fetchMenuItems();
    } catch (error: any) {
      logger.error("❌ Failed to add menu item:", error);
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
      logger.error("❌ Failed to update menu item:", error);
      const errorMsg = error?.message || error?.hint || JSON.stringify(error);
      showMessage("error", `Failed to update item: ${errorMsg}`);
    }
  };

  const handleDeleteMenuItem = async (item: MenuItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) throw error;

      showMessage("success", `✓ ${item.name} deleted`);
      await fetchMenuItems();
    } catch (error) {
      logger.error("Error deleting menu item:", error);
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
        logger.error("Error exporting sales:", error);
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

    // Prevent duplicate submissions
    if (loading) return;

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

    const salePayload = {
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      description: description.trim(),
      date: selectedDate,
      created_by: user.id,
      created_by_name: userData.displayName,
      customer_id: selectedCustomerId || null,
    };

    try {
      if (!navigator.onLine) {
        await queueOperation({ type: "sale", payload: salePayload });
        showMessage("success", `✓ ₹${amount} queued (offline)`);
        notifications.info("Sale Queued", `₹${amount} saved offline, will sync when online`);
        clearCart();
        setCart([]);
        setAmount("");
        setQuantity("1");
        setUnitPrice("");
        setDiscount("");
        setAdditional("");
        setSubtotal("");
        setDescription("");
        setSelectedItem("");
        setLoading(false);
        return;
      }

      logger.debug("💾 Attempting to save sale...");
      logger.debug("User ID:", user.id);
      logger.debug("Amount:", amount);
      logger.debug("Description:", description);

      const { data, error } = await supabase
        .from("sales")
        .insert(salePayload)
        .select();

      if (error) {
        if (error.message?.includes("network") || error.message?.includes("fetch")) {
          await queueOperation({ type: "sale", payload: salePayload });
          showMessage("success", `✓ ₹${amount} queued (offline)`);
          notifications.info("Sale Queued", `₹${amount} saved offline, will sync when online`);
        } else {
          logger.error("Supabase error:", error);
          showMessage("error", `Save failed: ${error.message || error.code || "Unknown error"}`);
          setLoading(false);
          return;
        }
      } else {
        showMessage("success", `✓ ₹${amount} sale saved!`);
        notifications.success("Sale Saved", `₹${amount} recorded successfully`);
      }

      clearCart();
      setCart([]);
      setAmount("");
      setQuantity("1");
      setUnitPrice("");
      setDiscount("");
      setAdditional("");
      setSubtotal("");
      setDescription("");
      setSelectedItem("");

      fetchSales().catch(console.error);
    } catch (error: any) {
      if (error.message?.includes("network") || error.message?.includes("fetch") || error.message?.includes("Failed to fetch")) {
        await queueOperation({ type: "sale", payload: salePayload });
        showMessage("success", `✓ ₹${amount} queued (offline)`);
        notifications.info("Sale Queued", `₹${amount} saved offline, will sync when online`);
        clearCart();
        setCart([]);
        setAmount("");
        setQuantity("1");
        setUnitPrice("");
        setDiscount("");
        setAdditional("");
        setSubtotal("");
        setDescription("");
        setSelectedItem("");
      } else {
        logger.error("Error saving sale:", error);
        showMessage("error", "Failed to save. Try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sale?")) return;
    if (!hasPermission("canDeleteRecords") && !isAdmin) return;

    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (!error) {
      showMessage("success", "Sale deleted");
      fetchSales();
    }
  };

  const handleQuickSale = async () => {
    if (savingQuickSale) return;
    if (!quickSaleAmount.trim() || isNaN(parseFloat(quickSaleAmount)) || parseFloat(quickSaleAmount) <= 0) {
      showMessage("error", "Enter a valid amount");
      return;
    }
    if (!user || !userData) {
      showMessage("error", "Not authenticated");
      return;
    }
    setSavingQuickSale(true);
    const qsPayload = {
      amount: parseFloat(quickSaleAmount),
      payment_method: quickSalePayment,
      description: quickSaleDesc.trim() || "Quick Sale",
      date: selectedDate,
      created_by: user.id,
      created_by_name: userData.displayName,
    };
    try {
      if (!navigator.onLine) {
        await queueOperation({ type: "sale", payload: qsPayload });
        showMessage("success", `✓ ₹${quickSaleAmount} queued (offline)`);
        notifications.info("Sale Queued", `₹${quickSaleAmount} saved offline`);
        setQuickSaleAmount("");
        setQuickSaleDesc("");
        setQuickSaleMode(false);
        return;
      }
      const { error } = await supabase.from("sales").insert(qsPayload);
      if (error) {
        if (error.message?.includes("network") || error.message?.includes("fetch") || error.message?.includes("Failed to fetch")) {
          await queueOperation({ type: "sale", payload: qsPayload });
          showMessage("success", `✓ ₹${quickSaleAmount} queued (offline)`);
          notifications.info("Sale Queued", `₹${quickSaleAmount} saved offline`);
        } else {
          throw error;
        }
      } else {
        showMessage("success", `✓ ₹${quickSaleAmount} quick sale saved!`);
        notifications.success("Quick Sale Saved", `₹${quickSaleAmount} recorded`);
      }
      setQuickSaleAmount("");
      setQuickSaleDesc("");
      setQuickSaleMode(false);
      fetchSales().catch(console.error);
    } catch (err: any) {
      showMessage("error", `Failed: ${err.message}`);
    } finally {
      setSavingQuickSale(false);
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

  // Analytics summary data
  const stats = useMemo(() => [
    { label: "Total Revenue", value: totalSales, icon: ShoppingCart, color: "text-primary" },
    { label: "Cash Income", value: totalCash, icon: Wallet, color: "text-green-400" },
    { label: "Digital (UPI)", value: totalUPI, icon: CreditCard, color: "text-blue-400" },
  ], [totalSales, totalCash, totalUPI]);

  logger.debug(
    "Sales page render - authLoading:",
    authLoading,
    "user:",
    user ? "logged in" : "null",
    "userData:",
    userData,
  );

  // Custom Premium Loading Component
  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <PremiumLoader icon="bag" message="Opening Terminal..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 font-inter text-slate-200">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
             <div className="flex items-center gap-5 mb-4">
               <div className="w-14 h-14 bg-crispy-gradient rounded-2xl flex items-center justify-center shadow-3xl shadow-red-500/20 transform -rotate-6 border border-white/20 text-white overflow-hidden">
                 <Image
                   src="/logo.png"
                   alt="Crunchy Time Logo"
                   width={56}
                   height={56}
                   className="w-full h-full object-cover"
                 />
               </div>
               <div>
                 <h1 className="text-4xl font-outfit font-black text-white tracking-tight uppercase leading-none italic">CRUNCHY TIME</h1>
                 <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                   {selectedDate === getCurrentDate() ? "Counter Terminal" : "Store Archive"} • {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }).toUpperCase()}
                 </p>
               </div>
             </div>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md"
          >
            {isAdmin && (
              <>
                <button 
                  onClick={goToPreviousDay}
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={getCurrentDate()}
                    className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer px-4"
                  />
                </div>
                <button 
                  onClick={goToNextDay}
                  disabled={selectedDate >= getCurrentDate()}
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground hover:text-white disabled:opacity-30"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
            <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              <button 
                onClick={() => setActiveTab("pos")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "pos" ? "bg-crispy-gradient text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                POS
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "history" ? "bg-crispy-gradient text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                History
              </button>
            </div>
            <button 
              onClick={() => setShowExportDateRange(true)}
              className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Save All
            </button>
          </motion.div>
        </header>

        {/* Global Notifications */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-4 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-xl",
                messageType === "success" 
                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                messageType === "success" ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                {messageType === "success" ? "✓" : "!"}
              </div>
              <p className="font-bold text-sm">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Main POS Interface (Left/Center) */}
          <div className="xl:col-span-7 space-y-8">
            
            {/* Quick Actions & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Menu (F for focus)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all font-medium"
                />
              </div>
              <button 
                onClick={() => setQuickSaleMode(!quickSaleMode)}
                className={cn(
                  "px-6 py-4 rounded-2xl font-bold hover-lift active-scale transition-all flex items-center justify-center gap-2 shrink-0",
                  quickSaleMode
                    ? "bg-crispy-gradient text-white border border-white/20 shadow-lg shadow-primary/20"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                )}
              >
                <Wallet className="w-5 h-5" />
                Quick Sale
              </button>
              <button 
                onClick={() => setShowAddItem(!showAddItem)}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 hover-lift active-scale transition-all flex items-center justify-center shrink-0"
                title="New Product"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-12">
              {Object.entries(groupedMenuItems).map(([category, items], catIdx) => {
                const isExpanded = expandedCategories.has(category);
                return (
                <motion.section 
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIdx * 0.1 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-crispy-gradient rounded-full" />
                    <h3
                      onClick={() => toggleCategory(category)}
                      className="text-xl font-outfit font-black text-white tracking-tight uppercase cursor-pointer hover:text-primary transition-colors"
                    >{category}</h3>
                    <div className="h-px bg-white/5 flex-1" />
                    <span className="text-[10px] font-black text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{items.length} OPTIONS</span>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded ? "" : "rotate-180")} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pt-2">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectItem(item)}
                        className="glass-card group relative p-3 text-left border-white/10 hover:border-primary/50 transition-all flex flex-col gap-2 cursor-pointer hover-lift active-scale"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectItem(item);
                          }
                        }}
                      >
                         <div className="aspect-[4/3] rounded-lg bg-white/5 overflow-hidden relative mb-0.5">
                          {item.image_url ? (
                            <Image 
                              src={item.image_url} 
                              alt={item.name} 
                              width={300} 
                              height={225} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-xs font-black text-white border border-white/10 shadow-2xl">
                            {formatINR(item.price)}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-outfit font-black text-white tracking-tight line-clamp-1">{item.name}</h4>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{category}</p>
                        </div>
                        
                        {isAdmin && (
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEditItem(item); }}
                              className="w-6 h-6 rounded-md bg-blue-500 text-white shadow-xl flex items-center justify-center"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteMenuItem(item); }}
                              className="w-6 h-6 rounded-md bg-red-500 text-white shadow-xl flex items-center justify-center"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
                );
              })}
            </div>
          </div>

          {/* Cart Section (Sticky Sidebar) */}
          <div className="xl:col-span-5 lg:sticky lg:top-8">
            <div className="glass-card flex flex-col border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              {quickSaleMode ? (
                /* Quick Sale Form */
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b border-white/10 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-2xl font-outfit font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Wallet className="w-6 h-6 text-primary" />
                        Quick Sale
                      </h3>
                      <button onClick={() => setQuickSaleMode(false)} className="text-muted-foreground hover:text-white transition-colors"><RotateCcw className="w-5 h-5" /></button>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Enter total amount directly</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount (₹)</label>
                      <input 
                        type="number"
                        value={quickSaleAmount}
                        onChange={(e) => setQuickSaleAmount(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-3xl font-outfit font-black text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Payment Method</label>
                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={() => setQuickSalePayment("cash")}
                          className={cn("flex-1 py-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1", quickSalePayment === "cash" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-white/5 border-white/10 text-muted-foreground")}
                        >
                          <Wallet className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase">CASH</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setQuickSalePayment("upi")}
                          className={cn("flex-1 py-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1", quickSalePayment === "upi" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-muted-foreground")}
                        >
                          <CreditCard className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase">DIGITAL</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Description (optional)</label>
                      <input 
                        type="text"
                        value={quickSaleDesc}
                        onChange={(e) => setQuickSaleDesc(e.target.value)}
                        placeholder="e.g. Party order, Bulk sale"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div className="p-8 bg-white/[0.03] border-t border-white/10 space-y-4">
                    <motion.button 
                      type="button"
                      onClick={handleQuickSale}
                      disabled={savingQuickSale || !quickSaleAmount}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-6 bg-crispy-gradient text-white rounded-3xl font-black text-xl tracking-tight shadow-3xl shadow-primary/40 flex items-center justify-center gap-3 transition-all disabled:opacity-30"
                    >
                      <Save className="w-7 h-7" />
                      {savingQuickSale ? "SAVING..." : "SAVE QUICK SALE"}
                    </motion.button>
                  </div>
                </div>
              ) : (
                <>
              <div className="p-8 border-b border-white/10 bg-white/5">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-2xl font-outfit font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <ShoppingCart className="w-6 h-6 text-primary" />
                    DONE
                  </h3>
                  <button onClick={() => { setCart([]); clearCart(); notifications.info("Cart Cleared", "System reset performed"); }} className="text-muted-foreground hover:text-red-500 transition-colors"><RotateCcw className="w-5 h-5" /></button>
                </div>
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{cart.length} ITEMS</p>
              </div>

              <div className="p-4 space-y-2">
                <AnimatePresence mode="popLayout">
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ x: -4, backgroundColor: "rgba(255,255,255,0.08)" }}
                      className="group bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between transition-colors cursor-default"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-crispy-gradient flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg shadow-primary/20">
                          {item.quantity}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white leading-tight truncate">{item.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground mt-0.5">{formatINR(item.price)} × {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <p className="text-sm font-outfit font-black text-white">{formatINR(item.total)}</p>
                        <button onClick={() => handleRemoveFromCart(item.id)} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                    <ShoppingCart className="w-20 h-20" />
                    <p className="font-black tracking-widest text-sm uppercase">Waiting for order</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white/[0.03] border-t border-white/10 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                    <span>Total before discount</span>
                    <span className="text-white font-outfit font-bold">{formatINR(parseFloat(subtotal) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase leading-none">Discount (₹)</span>
                    <input 
                      type="number"
                      value={discount}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-20 bg-transparent text-right font-black text-primary border-none focus:ring-0 p-0"
                    />
                  </div>
                </div>

                <div className="pt-2">
                   <p className="text-[10px] font-black text-primary tracking-[.4em] uppercase mb-1">Total to pay</p>
                   <motion.p 
                     key={amount}
                     initial={{ scale: 0.95, opacity: 0.8 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ type: "spring", stiffness: 400, damping: 10 }}
                     className="text-5xl font-outfit font-black text-white tracking-tighter leading-none"
                   >
                     {formatINR(parseFloat(amount) || 0)}
                   </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name || "" : customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomerId(""); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Select customer (optional)"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <AnimatePresence>
                      {showCustomerDropdown && filteredCustomers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-50 w-full mt-1 bg-slate-900 border border-white/10 rounded-xl max-h-40 overflow-y-auto shadow-2xl"
                        >
                          {filteredCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                            >
                              <span>{c.name}</span>
                              {c.phone && <span className="text-[10px] text-muted-foreground">{c.phone}</span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {selectedCustomerId && (
                      <button type="button" onClick={() => { setSelectedCustomerId(""); setCustomerSearch(""); }} className="absolute right-3 top-3 text-muted-foreground hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setPaymentMethod("cash")}
                      className={cn("flex-1 py-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1", paymentMethod === "cash" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-white/5 border-white/10 text-muted-foreground")}
                    >
                      <Wallet className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase">CASH</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPaymentMethod("upi")}
                      className={cn("flex-1 py-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1", paymentMethod === "upi" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-muted-foreground")}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase">DIGITAL</span>
                    </button>
                  </div>
                  <motion.button 
                    type="submit" 
                    disabled={loading || cart.length === 0}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-6 bg-crispy-gradient text-white rounded-3xl font-black text-xl tracking-tight shadow-3xl shadow-primary/40 flex items-center justify-center gap-3 transition-all disabled:opacity-30 ripple active-scale"
                  >
                    <Save className="w-7 h-7" />
                    {loading ? "SAVING..." : "SAVE SALE"}
                  </motion.button>
                </form>
              </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Audit Overlay (History) */}
        <AnimatePresence>
          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Transactions List */}
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredSales.map((sale, i) => (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-6 border-white/5 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <p className="text-3xl font-outfit font-black text-white tracking-tighter">{formatINR(sale.amount)}</p>
                        <div className={cn("inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter shadow-sm", sale.payment_method === 'cash' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-400')}>
                          {sale.payment_method}
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(sale.id)} className="p-2 rounded-lg bg-red-500 text-white shadow-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-300 mb-6 italic leading-relaxed">&quot;{sale.description || "No memo attached"}&quot;</p>
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-crispy-gradient flex items-center justify-center text-[10px] font-black text-white shadow-lg">{sale.created_by_name?.charAt(0)}</div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{sale.created_by_name}</span>
                      </div>
                      <span className="text-[10px] font-black text-muted-foreground opacity-50">{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredSales.length === 0 && (
                <div className="py-32 text-center glass-card border-white/10 opacity-20">
                  <Receipt className="w-24 h-24 mx-auto mb-4 opacity-50" />
                  <p className="font-black tracking-[0.4em] uppercase text-sm">No sales here</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Overlays */}
        <AnimatePresence>
          {/* New/Edit Item Overlay */}
          {(showAddItem || editingItem) && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 lg:p-8"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-card w-full max-w-2xl border-primary/20 overflow-hidden shadow-3xl shadow-primary/10"
              >
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="text-3xl font-outfit font-black text-white uppercase tracking-tight">
                    {showAddItem ? "Add New Food" : "Change Food"}
                  </h3>
                  <button onClick={() => { setShowAddItem(false); setEditingItem(null); }} className="hover:rotate-90 transition-transform"><Plus className="w-8 h-8 text-muted-foreground rotate-45" /></button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Food Name</label>
                       <input 
                         type="text" 
                         placeholder="e.g. Broiler Drumsticks"
                         value={showAddItem ? newItemName : editName}
                         onChange={(e) => showAddItem ? setNewItemName(e.target.value) : setEditName(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Price (₹)</label>
                       <input 
                         type="number" 
                         placeholder="0.00"
                         value={showAddItem ? newItemPrice : editPrice}
                         onChange={(e) => showAddItem ? setNewItemPrice(e.target.value) : setEditPrice(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all font-outfit font-bold"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Main Dishes", "Sides", "Beverages", "Desserts", "Specials"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => showAddItem ? setNewItemCategory(cat) : setEditCategory(cat)}
                          className={cn(
                            "py-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                            (showAddItem ? newItemCategory : editCategory) === cat ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Picture</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="https://..."
                        value={showAddItem ? newItemImage : editImage}
                        onChange={(e) => showAddItem ? setNewItemImage(e.target.value) : setEditImage(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-xs"
                      />
                      <label className="bg-primary hover:bg-primary-dark text-white px-6 py-4 rounded-2xl cursor-pointer flex items-center gap-2 font-black text-xs transition-all shadow-xl">
                        <ImageIcon className="w-4 h-4" />
                        UPLOAD
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={showAddItem ? handleImageUpload : handleEditImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-white/[0.02] border-t border-white/10">
                  <button 
                    onClick={showAddItem ? handleAddMenuItem : handleUpdateMenuItem}
                    disabled={uploadingImage || editUploadingImage}
                    className="w-full py-5 bg-crispy-gradient text-white rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 flex items-center justify-center gap-3"
                  >
                    {uploadingImage || editUploadingImage ? "UPLOADING..." : "SAVE FOOD"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Export Date Range Selection */}
          {showExportDateRange && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="glass-card w-full max-w-md p-8 border-primary/20 shadow-3xl shadow-primary/10">
                <h3 className="text-2xl font-outfit font-black text-white mb-6 uppercase tracking-tight">Pick Dates</h3>
                <div className="space-y-4 mb-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Start Date</label>
                    <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">End Date</label>
                    <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setShowExportDateRange(false)} className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black transition-colors hover:bg-white/10">CANCEL</button>
                  <button onClick={handleExportSales} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-xl hover:bg-primary-dark transition-colors">SAVE DATA</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";

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
  const [newItemImage, setNewItemImage] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImage, setEditImage] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState(today);
  const isAdmin = userData?.role === "admin";

  // Check permission - Only users with canAddSales permission can access
  useEffect(() => {
    if (userData && !hasPermission("canAddSales")) {
      router.push("/dashboard");
    }
  }, [userData, hasPermission, router]);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
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

  const handleAddMenuItem = async () => {
    if (!newItemName.trim() || !newItemPrice || parseFloat(newItemPrice) <= 0) {
      showMessage("error", "Enter item name and price");
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
      setNewItemImage("");
      setShowAddItem(false);
      await fetchMenuItems();
    } catch (error) {
      showMessage("error", "Failed to add item");
    }
  };

  const handleUpdateMenuItem = async () => {
    if (
      !editName.trim() ||
      !editPrice ||
      parseFloat(editPrice) <= 0 ||
      !editingItem
    ) {
      showMessage("error", "Enter valid name and price");
      return;
    }

    try {
      const { error } = await supabase
        .from("menu_items")
        .update({
          name: editName.trim(),
          price: parseFloat(editPrice),
          image_url: editImage.trim() || null,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      showMessage("success", `✓ ${editName} updated!`);
      setEditingItem(null);
      setEditName("");
      setEditPrice("");
      setEditImage("");
      await fetchMenuItems();
    } catch (error) {
      console.error("Error updating menu item:", error);
      showMessage("error", "Failed to update item");
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
    setEditImage(item.image_url || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      showMessage("error", "₹ Please enter amount");
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
          date: today,
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
      setCart([]);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg font-medium animate-pulse">
            Loading authentication...
          </p>
        </div>
      </div>
    );
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
                {new Date(selectedDate).toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  📅 View Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={today}
                  className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
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
                      placeholder="Price ₹"
                      className="p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={newItemImage}
                    onChange={(e) => setNewItemImage(e.target.value)}
                    placeholder="Image URL (optional)"
                    className="w-full p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none mb-2"
                  />
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
                      placeholder="Price ₹"
                      className="p-2 border rounded-md text-sm text-gray-900"
                    />
                  </div>
                  <input
                    type="text"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="Image URL (optional)"
                    className="w-full p-2 border rounded-md text-sm text-gray-900 mb-2"
                  />
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {menuItems.length === 0 ? (
                  <div className="col-span-2 md:col-span-4 text-center text-gray-500 py-4">
                    No menu items yet. Click &quot;+ New&quot; to add items.
                  </div>
                ) : (
                  menuItems.map((item) => (
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
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="max-w-full max-h-full object-contain rounded"
                            />
                          </div>
                        ) : (
                          <div className="text-2xl mb-1">🍗</div>
                        )}
                        <div className="font-bold text-sm">{item.name}</div>
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
                  ))
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
          <h2 className="text-base font-bold text-gray-900 mb-3">
            Today&apos;s Sales ({sales.length})
          </h2>

          {sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">No sales yet today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
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

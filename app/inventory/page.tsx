"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/currency";
import ProtectedRoute from "@/components/ProtectedRoute";
import { notifications } from "@/lib/notifications"
import { logger } from "@/lib/logger";
import LoadingSpinner from "@/components/LoadingSpinner";

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit_price: number;
  stock_quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

const defaultCategories = [
  "chicken",
  "rice",
  "oil",
  "masala",
  "vegetables",
  "gas",
  "packaging",
  "other",
];
const defaultUnits = ["kg", "litre", "piece", "packet", "box"];

function InventoryContent() {
  const router = useRouter();
  const { user, userData, hasPermission, hasAnyPermission } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [units, setUnits] = useState<string[]>(defaultUnits);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showUnitInput, setShowUnitInput] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    category: "chicken",
    unit_price: "",
    stock_quantity: "",
    unit: "kg",
  });

  // Check permission - Purchase Register requires permission
  useEffect(() => {
    if (
      userData &&
      !hasAnyPermission([
        "canViewPurchases",
        "canAddPurchases",
        "canManagePurchases",
      ])
    ) {
      router.push("/dashboard");
    }
  }, [userData, router, hasAnyPermission]);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory.toLowerCase())) {
      setCategories([...categories, newCategory.toLowerCase()]);
      setFormData({ ...formData, category: newCategory.toLowerCase() });
      setNewCategory("");
      setShowCategoryInput(false);
      showMessage("success", "Category added!");
    }
  };

  const addUnit = () => {
    if (newUnit && !units.includes(newUnit.toLowerCase())) {
      setUnits([...units, newUnit.toLowerCase()]);
      setFormData({ ...formData, unit: newUnit.toLowerCase() });
      setNewUnit("");
      setShowUnitInput(false);
      showMessage("success", "Unit added!");
    }
  };

  const fetchInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("item_name");

      if (error) throw error;
      setItems(data || []);

      // Extract unique categories and units from existing items
      const uniqueCategories = Array.from(
        new Set(data?.map((item) => item.category) || []),
      );
      const uniqueUnits = Array.from(
        new Set(data?.map((item) => item.unit) || []),
      );

      // Merge with defaults
      setCategories(
        Array.from(new Set([...defaultCategories, ...uniqueCategories])),
      );
      setUnits(Array.from(new Set([...defaultUnits, ...uniqueUnits])));
    } catch (error) {
      logger.error("Error fetching purchase records:", error);
      showMessage("error", "Failed to load purchase records");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (user && userData?.role === "admin") {
      fetchInventory();
    }
  }, [user, userData, fetchInventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.item_name ||
      !formData.unit_price ||
      !formData.stock_quantity
    ) {
      showMessage("error", "Please fill in all fields");
      return;
    }

    if (parseFloat(formData.unit_price) <= 0) {
      showMessage("error", "Unit price must be greater than 0");
      return;
    }

    if (parseFloat(formData.stock_quantity) < 0) {
      showMessage("error", "Stock quantity cannot be negative");
      return;
    }

    // Check for duplicate item name (only when adding new item)
    if (
      !editingItem &&
      items.some(
        (item) =>
          item.item_name.toLowerCase() === formData.item_name.toLowerCase(),
      )
    ) {
      showMessage("error", "An item with this name already exists");
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from("inventory")
          .update({
            item_name: formData.item_name,
            category: formData.category,
            unit_price: parseFloat(formData.unit_price),
            stock_quantity: parseFloat(formData.stock_quantity),
            unit: formData.unit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        showMessage("success", "Item updated successfully!");
      } else {
        // Add new item
        logger.debug("Attempting to insert item:", {
          item_name: formData.item_name,
          category: formData.category,
          unit_price: parseFloat(formData.unit_price),
          stock_quantity: parseFloat(formData.stock_quantity),
          unit: formData.unit,
        });

        const { data, error } = await supabase
          .from("inventory")
          .insert([
            {
              item_name: formData.item_name,
              category: formData.category,
              unit_price: parseFloat(formData.unit_price),
              stock_quantity: parseFloat(formData.stock_quantity),
              unit: formData.unit,
            },
          ])
          .select();

        logger.debug("Insert result:", { data, error });

        if (error) throw error;
        showMessage("success", "Item added successfully!");
      }

      setFormData({
        item_name: "",
        category: "chicken",
        unit_price: "",
        stock_quantity: "",
        unit: "kg",
      });
      setShowForm(false);
      setEditingItem(null);
      fetchInventory();
    } catch (error: any) {
      logger.error("Error saving item:", error);
      showMessage("error", error.message || "Failed to save item");
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      unit_price: item.unit_price.toString(),
      stock_quantity: item.stock_quantity.toString(),
      unit: item.unit,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase.from("inventory").delete().eq("id", id);

      if (error) throw error;
      showMessage("success", "Item deleted successfully!");
      fetchInventory();
    } catch (error: any) {
      logger.error("Error deleting item:", error);
      showMessage("error", error.message || "Failed to delete item");
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      item_name: "",
      category: "chicken",
      unit_price: "",
      stock_quantity: "",
      unit: "kg",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading purchase records...</div>
      </div>
    );
  }

  if (userData?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-4">
            Only administrators can manage purchase records.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Your role: {userData?.role || "Not set"}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-red-600 hover:underline font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            📦 Purchase Register
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-bold"
          >
            + Record Purchase
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="text-blue-800 font-bold mb-2">
            💡 Track Your Purchases
          </h3>
          <p className="text-blue-700 text-sm">
            Record purchases from suppliers to track spending and compare prices
            over time
          </p>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? "Edit Purchase Record" : "Record New Purchase"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Item Purchased *
                  </label>
                  <input
                    type="text"
                    aria-label="Item name"
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                    className="w-full p-2 border rounded text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Category *
                  </label>
                  {showCategoryInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        aria-label="New category"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Enter new category"
                        className="flex-1 p-2 border rounded text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={addCategory}
                        className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryInput(false);
                          setNewCategory("");
                        }}
                        className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        aria-label="Category"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="flex-1 p-2 border rounded text-gray-900"
                        required
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCategoryInput(true)}
                        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                        title="Add new category"
                      >
                        + New
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Unit Price (₹) *
                  </label>
                  <input
                    type="number"
                    aria-label="Unit price"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_price: e.target.value })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full p-2 border rounded text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Quantity Purchased *
                  </label>
                  <input
                    type="number"
                    aria-label="Quantity purchased"
                    step="0.01"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_quantity: e.target.value,
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full p-2 border rounded text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Unit *
                  </label>
                  {showUnitInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        aria-label="New unit"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="Enter new unit"
                        className="flex-1 p-2 border rounded text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={addUnit}
                        className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUnitInput(false);
                          setNewUnit("");
                        }}
                        className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        aria-label="Unit"
                        value={formData.unit}
                        onChange={(e) =>
                          setFormData({ ...formData, unit: e.target.value })
                        }
                        className="flex-1 p-2 border rounded text-gray-900"
                        required
                      >
                        {units.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowUnitInput(true)}
                        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                        title="Add new unit"
                      >
                        + New
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                  {editingItem ? "Update" : "Record"} Purchase
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price/Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No purchase records yet. Record your first purchase!
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatINR(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {item.stock_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">
                      {formatINR(item.unit_price * item.stock_quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-red-600 hover:text-red-900 mr-3 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}

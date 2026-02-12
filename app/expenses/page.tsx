"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { exportToCSV, formatForExport } from "@/lib/export";
import { notifications } from "@/lib/notifications";
import { getCurrentDate } from "@/utils/formatting";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Expense {
  id: string;
  amount: number;
  category: string;
  payment_mode: string;
  description: string;
  date: string;
  created_at: string;
  created_by_name: string;
}

const CATEGORIES = [
  { value: "chicken", label: "Chicken", emoji: "🍗" },
  { value: "oil", label: "Oil", emoji: "🛢️" },
  { value: "masala", label: "Masala/Spices", emoji: "🌶️" },
  { value: "gas", label: "Gas", emoji: "🔥" },
  { value: "wages", label: "Wages/Salary", emoji: "👤" },
  { value: "rent", label: "Rent", emoji: "🏠" },
  { value: "electricity", label: "Electricity", emoji: "💡" },
  { value: "other", label: "Other", emoji: "📦" },
];

function ExpensesContent() {
  const router = useRouter();
  const { user, userData, hasPermission, loading: authLoading } = useAuth();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("chicken");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<"all" | "cash" | "upi">(
    "all",
  );
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [showExportDateRange, setShowExportDateRange] = useState(false);

  // Category management states
  const [categories, setCategories] = useState(CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("📦");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    value: string;
    label: string;
    emoji: string;
  } | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => getCurrentDate());
  const isAdmin = userData?.role === "admin";

  // Load custom categories from localStorage on mount
  useEffect(() => {
    const savedCategories = localStorage.getItem("expenseCategories");
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories));
      } catch (e) {
        console.error("Failed to load custom categories", e);
      }
    }
  }, []);

  // Save categories to localStorage whenever they change
  const saveCategories = useCallback((newCategories: typeof CATEGORIES) => {
    setCategories(newCategories);
    localStorage.setItem("expenseCategories", JSON.stringify(newCategories));
  }, []);

  // Add new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      notifications.error("Please enter a category name");
      return;
    }

    const categoryValue = newCategoryName.toLowerCase().replace(/\s+/g, "_");

    if (categories.some((cat) => cat.value === categoryValue)) {
      notifications.error("Category already exists");
      return;
    }

    const newCategory = {
      value: categoryValue,
      label: newCategoryName.trim(),
      emoji: newCategoryEmoji || "📦",
    };

    saveCategories([...categories, newCategory]);
    setCategory(categoryValue);
    setNewCategoryName("");
    setNewCategoryEmoji("📦");
    setShowAddCategory(false);
    notifications.success(`Category "${newCategory.label}" added!`);
  };

  // Edit existing category
  const handleEditCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return;

    const updatedCategories = categories.map((cat) =>
      cat.value === editingCategory.value
        ? { ...cat, label: newCategoryName.trim(), emoji: newCategoryEmoji }
        : cat,
    );

    saveCategories(updatedCategories);
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryEmoji("📦");
    notifications.success("Category updated!");
  };

  // Delete category
  const handleDeleteCategory = (categoryValue: string) => {
    if (categories.length <= 1) {
      notifications.error("Cannot delete the last category");
      return;
    }

    if (confirm("Are you sure you want to delete this category?")) {
      const updatedCategories = categories.filter(
        (cat) => cat.value !== categoryValue,
      );
      saveCategories(updatedCategories);

      // If current selected category is deleted, switch to first category
      if (category === categoryValue) {
        setCategory(updatedCategories[0].value);
      }

      notifications.success("Category deleted!");
    }
  };

  // Start editing category
  const startEditCategory = (cat: (typeof CATEGORIES)[0]) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.label);
    setNewCategoryEmoji(cat.emoji);
    setShowAddCategory(true);
  };

  // Reset categories to default
  const resetCategories = () => {
    if (
      confirm(
        "Reset to default categories? This will remove all custom categories.",
      )
    ) {
      saveCategories(CATEGORIES);
      setCategory("chicken");
      notifications.success("Categories reset to default!");
    }
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() - 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() + 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const nextDate = `${year}-${month}-${day}`;
    const today = getCurrentDate();
    // Don't go beyond today
    if (nextDate <= today) {
      setSelectedDate(nextDate);
    }
  };

  // Filter and search expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Category filter
      if (filterCategory !== "all" && expense.category !== filterCategory) {
        return false;
      }

      // Payment filter
      if (filterPayment !== "all" && expense.payment_mode !== filterPayment) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          expense.description.toLowerCase().includes(search) ||
          expense.amount.toString().includes(search) ||
          expense.created_by_name.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [expenses, searchTerm, filterCategory, filterPayment]);

  // Check if user has permission to view expenses
  useEffect(() => {
    console.log(
      `🔐 Expenses page auth check: authLoading=${authLoading}, user=${!!user}, userData=${!!userData}, role=${userData?.role}`,
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
    if (userData && !hasPermission("canViewExpenses")) {
      console.log(
        "❌ No canViewExpenses permission - redirecting to dashboard",
      );
      router.push("/dashboard");
    } else if (userData) {
      console.log("✅ Expenses access confirmed");
    }
  }, [userData, user, hasPermission, router, authLoading]);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    if (type === "success") {
      notifications.success(text);
    } else {
      notifications.error(text);
    }
    setMessageType(type);
    setMessage(text);
    setTimeout(() => setMessage(""), 4000);
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .is("deleted_at", null)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (user && hasPermission("canViewExpenses")) {
      fetchExpenses();
    }
  }, [user, userData, fetchExpenses, hasPermission]);

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
      showMessage("error", "Please enter details");
      return;
    }

    if (!user || !userData) {
      showMessage("error", "User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("expenses").insert([
        {
          amount: parseFloat(amount),
          category,
          payment_mode: paymentMode,
          description: description.trim(),
          date: selectedDate,
          created_at: new Date().toISOString(),
          created_by: user.id,
          created_by_name: userData.displayName,
        },
      ]);

      if (error) throw error;

      showMessage("success", `✓ ₹${amount} expense saved!`);
      setAmount("");
      setDescription("");
      await fetchExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      showMessage("error", "Failed to save. Try again");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) {
      showMessage("success", "Expense deleted");
      fetchExpenses();
    }
  };

  const handleExportExpenses = async () => {
    // If date range is selected, fetch data for that range
    if (showExportDateRange && exportStartDate && exportEndDate) {
      try {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .is("deleted_at", null)
          .gte("date", exportStartDate)
          .lte("date", exportEndDate)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          showMessage("error", "No expenses data in selected date range");
          return;
        }

        const exportData = formatForExport(data, {
          date: "Date",
          amount: "Amount (₹)",
          category: "Category",
          payment_mode: "Payment Mode",
          description: "Description",
          created_by_name: "Created By",
          created_at: "Time",
        });

        exportToCSV(
          exportData,
          `expenses_${exportStartDate}_to_${exportEndDate}`,
        );
        showMessage("success", "✓ Expenses exported!");
        setShowExportDateRange(false);
      } catch (error) {
        console.error("Error exporting expenses:", error);
        showMessage("error", "Failed to export expenses");
      }
    } else {
      // Export current filtered expenses
      if (filteredExpenses.length === 0) {
        showMessage("error", "No expenses data to export");
        return;
      }

      const exportData = formatForExport(filteredExpenses, {
        date: "Date",
        amount: "Amount (₹)",
        category: "Category",
        payment_mode: "Payment Mode",
        description: "Description",
        created_by_name: "Created By",
        created_at: "Time",
      });

      exportToCSV(exportData, `expenses_${selectedDate}`);
      showMessage("success", "✓ Expenses exported!");
    }
  };

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const totalCash = useMemo(
    () =>
      expenses
        .filter((e) => e.payment_mode === "cash")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const totalUPI = useMemo(
    () =>
      expenses
        .filter((e) => e.payment_mode === "upi")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  if (!user || (userData && !hasPermission("canViewExpenses"))) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-xl">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            {!user
              ? "Please log in to access expenses."
              : "You don't have permission to view expenses."}
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
        <div className="bg-white rounded-lg p-6 mb-4 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <div className="text-4xl">💸</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Record Expense
                </h1>
                <p className="text-gray-500 text-sm">
                  {selectedDate === getCurrentDate() ? (
                    <span className="font-semibold text-red-600">📅 Today</span>
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
                  className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-red-500 focus:outline-none"
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
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              📅{" "}
              {new Date(selectedDate).toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Add Expense Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 mb-4">
          <div className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                💵 Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-2.5 text-base border-2 border-gray-300 rounded-lg text-gray-900 focus:border-red-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-bold text-gray-900">
                  📦 Select Category
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(true);
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryEmoji("📦");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Category
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <div key={cat.value} className="relative group">
                    <button
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        category === cat.value
                          ? "bg-red-600 text-white border-red-700"
                          : "bg-white text-gray-700 border-gray-300 hover:border-red-500"
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.emoji}</div>
                      <div className="text-sm font-bold">{cat.label}</div>
                    </button>
                    {!CATEGORIES.some(
                      (defaultCat) => defaultCat.value === cat.value,
                    ) && (
                      <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditCategory(cat);
                          }}
                          className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded hover:bg-blue-600"
                          title="Edit category"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.value);
                          }}
                          className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-600"
                          title="Delete category"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {categories.length > CATEGORIES.length && (
                <button
                  type="button"
                  onClick={resetCategories}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Reset to defaults
                </button>
              )}
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
                placeholder="Add notes"
                className="w-full p-2.5 text-base border-2 border-gray-300 rounded-lg text-gray-900 focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                💳 Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode("cash")}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    paymentMode === "cash"
                      ? "bg-green-600 text-white border-green-700"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("upi")}
                  className={`p-3 rounded-lg border-2 font-medium transition-all ${
                    paymentMode === "upi"
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
              {loading ? "⏳ Saving..." : "✓ Save Expense"}
            </button>
          </div>
        </form>

        {/* Today's Summary */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-4 mb-4 text-white">
          <h2 className="text-base font-bold mb-3">
            📊 Today&apos;s Total Expense
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs opacity-90">Total</div>
              <div className="text-xl font-bold">
                ₹{totalExpenses.toLocaleString("en-IN")}
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

        {/* Expenses List */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-gray-900">
              Today&apos;s Expenses ({filteredExpenses.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportDateRange(!showExportDateRange)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
              >
                📅 {showExportDateRange ? "Cancel" : "Date Range"}
              </button>
              <button
                onClick={handleExportExpenses}
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
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by description, amount, or user..."
              className="w-full p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>

              {/* Payment Filter */}
              <select
                value={filterPayment}
                onChange={(e) =>
                  setFilterPayment(e.target.value as "all" | "cash" | "upi")
                }
                className="p-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Payments</option>
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">
                {searchTerm ||
                filterCategory !== "all" ||
                filterPayment !== "all"
                  ? "No matching expenses found"
                  : "No expenses yet today"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((expense) => {
                const cat = categories.find(
                  (c) => c.value === expense.category,
                );
                return (
                  <div
                    key={expense.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-red-600">
                            ₹{expense.amount.toLocaleString("en-IN")}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {cat?.emoji || "📦"}{" "}
                            {cat?.label || expense.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              expense.payment_mode === "cash"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {expense.payment_mode === "cash" ? "💵" : "📱"}
                          </span>
                        </div>
                        <div className="text-gray-700 text-sm font-medium">
                          {expense.description}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          {new Date(expense.created_at).toLocaleTimeString(
                            "en-IN",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                          {expense.created_by_name &&
                            ` • ${expense.created_by_name}`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="ml-3 bg-red-100 text-red-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-200"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add/Edit Category Modal */}
        {showAddCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingCategory ? "✏️ Edit Category" : "➕ Add New Category"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryEmoji("📦");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Transportation, Utilities"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                {/* Emoji Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Icon
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {[
                      "📦",
                      "🚗",
                      "🏪",
                      "📱",
                      "🍽️",
                      "💧",
                      "🔧",
                      "🛍️",
                      "🎓",
                      "💊",
                      "🎬",
                      "🎮",
                      "✈️",
                      "🏋️",
                      "📚",
                      "🎨",
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCategoryEmoji(emoji)}
                        className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                          newCategoryEmoji === emoji
                            ? "bg-red-100 border-red-500"
                            : "bg-gray-50 border-gray-200 hover:border-red-300"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newCategoryEmoji}
                    onChange={(e) => setNewCategoryEmoji(e.target.value)}
                    placeholder="Or type emoji"
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-center text-2xl"
                    maxLength={2}
                  />
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Preview:</div>
                  <div className="flex items-center justify-center">
                    <div className="bg-white p-3 rounded-lg border-2 border-gray-300">
                      <div className="text-2xl mb-1">
                        {newCategoryEmoji || "📦"}
                      </div>
                      <div className="text-sm font-bold text-gray-700">
                        {newCategoryName || "Category Name"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false);
                      setEditingCategory(null);
                      setNewCategoryName("");
                      setNewCategoryEmoji("📦");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={
                      editingCategory ? handleEditCategory : handleAddCategory
                    }
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    {editingCategory ? "Update" : "Add Category"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <ExpensesContent />
    </ProtectedRoute>
  );
}

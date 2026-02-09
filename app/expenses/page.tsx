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

  const [selectedDate, setSelectedDate] = useState(() => getCurrentDate());
  const isAdmin = userData?.role === "admin";

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

    if (amount.trim() === "" || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
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
          date: getCurrentDate(),
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
                  Track your daily expenses
                </p>
              </div>
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
                  max={getCurrentDate()}
                  className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-red-500 focus:outline-none"
                />
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
              <label className="block text-base font-bold text-gray-900 mb-2">
                📦 Select Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      category === cat.value
                        ? "bg-red-600 text-white border-red-700"
                        : "bg-white text-gray-700 border-gray-300 hover:border-red-500"
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.emoji}</div>
                    <div className="text-sm font-bold">{cat.label}</div>
                  </button>
                ))}
              </div>
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
                {CATEGORIES.map((cat) => (
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
                const cat = CATEGORIES.find(
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

interface Sale {
  id: string;
  amount: number;
  payment_method: string;
  description: string;
  date: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  payment_mode: string;
  description: string;
  date: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  price_per_unit: number;
}

function ReportsContent() {
  const router = useRouter();
  const { user, userData, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dateRange, setDateRange] = useState<
    "7days" | "30days" | "90days" | "all"
  >("30days");

  // Check permission - Reports should be admin only or have canViewReports permission
  useEffect(() => {
    if (userData && !hasPermission("canViewReports")) {
      router.push("/dashboard");
    }
  }, [userData, hasPermission, router]);

  useEffect(() => {
    if (user && hasPermission("canViewReports")) {
      setLoading(false);
    }
  }, [user, hasPermission]);

  const getDateFilter = useCallback(() => {
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        return null;
    }

    return startDate.toISOString();
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    const startDate = getDateFilter();

    // Fetch sales
    let salesQuery = supabase
      .from("sales")
      .select("*")
      .order("date", { ascending: false });

    if (startDate) {
      salesQuery = salesQuery.gte("date", startDate);
    }

    const { data: salesData } = await salesQuery;
    setSales(salesData || []);

    // Fetch expenses
    let expensesQuery = supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (startDate) {
      expensesQuery = expensesQuery.gte("date", startDate);
    }

    const { data: expensesData } = await expensesQuery;
    setExpenses(expensesData || []);

    // Fetch inventory (always all items)
    const { data: inventoryData } = await supabase
      .from("inventory")
      .select("*")
      .order("item_name");

    setInventory(inventoryData || []);
  }, [getDateFilter]);

  useEffect(() => {
    if (!loading && hasPermission("canViewReports")) {
      fetchData();
    }
  }, [loading, fetchData, hasPermission]);

  // Sales Analytics
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalTransactions = sales.length;
  const averageSale =
    totalTransactions > 0 ? totalSales / totalTransactions : 0;

  // Sales by payment method
  const salesByPayment = sales.reduce(
    (acc, sale) => {
      if (!acc[sale.payment_method]) {
        acc[sale.payment_method] = { count: 0, total: 0 };
      }
      acc[sale.payment_method].count += 1;
      acc[sale.payment_method].total += sale.amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number }>,
  );

  const totalCashSales = salesByPayment["cash"]?.total || 0;
  const totalUPISales = salesByPayment["upi"]?.total || 0;

  // Expense Analytics
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const expensesByCategory = expenses.reduce(
    (acc, exp) => {
      if (!acc[exp.category]) {
        acc[exp.category] = 0;
      }
      acc[exp.category] += exp.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topExpenseCategories = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Inventory Analytics
  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.min_stock_level,
  );
  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.price_per_unit,
    0,
  );

  // Profit Calculation
  const profit = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  // Daily sales trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const dailySales = last7Days.map((date) => {
    const daySales = sales.filter((s) => s.date.startsWith(date));
    return {
      date: new Date(date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      amount: daySales.reduce((sum, s) => sum + s.amount, 0),
    };
  });

  const maxDailySale = Math.max(...dailySales.map((d) => d.amount), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="flex items-center justify-center h-96">
          <div className="text-white text-xl">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            📊 Reports & Analytics
          </h1>
          <p className="text-gray-400">
            Business insights and performance metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <label className="text-gray-900 font-medium mr-4">Date Range:</label>
          <div className="inline-flex gap-2 flex-wrap">
            {[
              { value: "7days", label: "Last 7 Days" },
              { value: "30days", label: "Last 30 Days" },
              { value: "90days", label: "Last 90 Days" },
              { value: "all", label: "All Time" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value as any)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  dateRange === option.value
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
            <div className="text-green-100 text-sm font-medium mb-1">
              Total Sales
            </div>
            <div className="text-3xl font-bold mb-1">
              ₹{totalSales.toLocaleString("en-IN")}
            </div>
            <div className="text-green-100 text-sm">
              {totalTransactions} transactions
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 text-white">
            <div className="text-red-100 text-sm font-medium mb-1">
              Total Expenses
            </div>
            <div className="text-3xl font-bold mb-1">
              ₹{totalExpenses.toLocaleString("en-IN")}
            </div>
            <div className="text-red-100 text-sm">
              {expenses.length} expenses
            </div>
          </div>

          {/* Net Profit */}
          <div
            className={`bg-gradient-to-br ${profit >= 0 ? "from-blue-600 to-blue-700" : "from-orange-600 to-orange-700"} rounded-lg p-6 text-white`}
          >
            <div className="text-blue-100 text-sm font-medium mb-1">
              Net Profit
            </div>
            <div className="text-3xl font-bold mb-1">
              ₹{profit.toLocaleString("en-IN")}
            </div>
            <div className="text-blue-100 text-sm">
              {profitMargin.toFixed(1)}% margin
            </div>
          </div>

          {/* Average Sale */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white">
            <div className="text-purple-100 text-sm font-medium mb-1">
              Average Sale
            </div>
            <div className="text-3xl font-bold mb-1">
              ₹
              {averageSale.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-purple-100 text-sm">per transaction</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Sales Chart */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📈 Daily Sales Trend (Last 7 Days)
            </h2>
            <div className="space-y-3">
              {dailySales.map((day, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{day.date}</span>
                    <span className="text-gray-900 font-medium">
                      ₹{day.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${(day.amount / maxDailySale) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              💰 Expense Breakdown
            </h2>
            <div className="space-y-3">
              {topExpenseCategories.length > 0 ? (
                topExpenseCategories.map((cat, index) => {
                  const percentage = (cat.amount / totalExpenses) * 100;
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat.category}</span>
                        <span className="text-gray-900 font-medium">
                          ₹{cat.amount.toLocaleString("en-IN")} (
                          {percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-600 text-center py-8">
                  No expenses recorded
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods & Low Stock Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Payment Method */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              💳 Sales by Payment Method
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-900 font-medium">💵 Cash</div>
                  <div className="text-green-600 font-bold">
                    ₹{totalCashSales.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="text-gray-600 text-sm">
                  {salesByPayment["cash"]?.count || 0} transactions
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${totalSales > 0 ? (totalCashSales / totalSales) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-gray-900 font-medium">📱 UPI</div>
                  <div className="text-blue-600 font-bold">
                    ₹{totalUPISales.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="text-gray-600 text-sm">
                  {salesByPayment["upi"]?.count || 0} transactions
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${totalSales > 0 ? (totalUPISales / totalSales) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              {sales.length === 0 && (
                <p className="text-gray-600 text-center py-8">
                  No sales recorded
                </p>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ⚠️ Low Stock Alerts
            </h2>
            <div className="mb-3">
              <div className="text-gray-600 text-sm">
                Total Inventory Value:{" "}
                <span className="text-gray-900 font-medium">
                  ₹{totalInventoryValue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-red-900/20 border border-red-800 rounded-lg"
                  >
                    <div>
                      <div className="text-gray-900 font-medium">
                        {item.item_name}
                      </div>
                      <div className="text-red-600 text-sm">
                        {item.quantity} {item.unit} (Min: {item.min_stock_level}
                        )
                      </div>
                    </div>
                    <span className="text-red-500 font-bold text-2xl">!</span>
                  </div>
                ))
              ) : (
                <p className="text-green-600 text-center py-8">
                  ✅ All items well stocked
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}

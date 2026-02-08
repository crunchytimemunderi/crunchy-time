"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { formatTime, getCurrentDate } from "@/utils/formatting";
import { formatINR } from "@/lib/currency";

interface Sale {
  id: string;
  amount: number;
  paymentMethod: "cash" | "upi";
  description: string;
  date: string;
  createdAt: any;
  createdBy: string;
  createdByName: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  paymentMode: "cash" | "upi";
  description: string;
  date: string;
  createdAt: any;
  createdBy: string;
  createdByName: string;
}

interface CashReconciliation {
  id: string;
  date: string;
  actualClosingCash: number;
  actualClosingUPI: number;
  difference: number;
  upiDifference: number;
}

function DashboardContent() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashReconciliation, setCashReconciliation] = useState<CashReconciliation | null>(null);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [cashLoaded, setCashLoaded] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = userData?.role === "admin";
  const today = getCurrentDate();
  
  // Only show loading on initial mount (when there's no data yet)
  const isInitialLoad = !salesLoaded || !expensesLoaded || (isAdmin && !cashLoaded);
  const hasNoData = sales.length === 0 && expenses.length === 0;
  const dataLoading = isInitialLoad && hasNoData;

  // Fetch and subscribe to sales data
  useEffect(() => {
    // Only wait for user and userData, not authLoading
    if (!user || !userData) {
      return;
    }

    const fetchAndSubscribe = async () => {
      // Fetch today's sales
      const { data: salesData } = await supabase
        .from("sales")
        .select("*")
        .eq("date", today)
        .order("created_at", { ascending: false });

      if (salesData) {
        setSales(
          salesData.map((s: any) => ({
            id: s.id,
            amount: s.amount,
            paymentMethod: s.payment_method,
            description: s.description,
            date: s.date,
            createdAt: s.created_at,
            createdBy: s.created_by,
            createdByName: s.created_by_name,
          }))
        );
      }

      setSalesLoaded(true);

      // Subscribe to real-time updates
      const channel = supabase
        .channel("dashboard-sales")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sales",
            filter: `date=eq.${today}`,
          },
          async () => {
            const { data } = await supabase
              .from("sales")
              .select("*")
              .eq("date", today)
              .order("created_at", { ascending: false });

            if (data) {
              setSales(
                data.map((s: any) => ({
                  id: s.id,
                  amount: s.amount,
                  paymentMethod: s.payment_method,
                  description: s.description,
                  date: s.date,
                  createdAt: s.created_at,
                  createdBy: s.created_by,
                  createdByName: s.created_by_name,
                }))
              );
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    fetchAndSubscribe();
  }, [user, userData, today]);

  // Fetch and subscribe to expenses data
  useEffect(() => {
    // Only wait for user and userData, not authLoading
    if (!user || !userData) {
      return;
    }

    const fetchAndSubscribe = async () => {
      // Fetch today's expenses
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .eq("date", today)
        .order("created_at", { ascending: false });

      if (expensesData) {
        setExpenses(
          expensesData.map((e: any) => ({
            id: e.id,
            amount: e.amount,
            category: e.category,
            paymentMode: e.payment_mode,
            description: e.description,
            date: e.date,
            createdAt: e.created_at,
            createdBy: e.created_by,
            createdByName: e.created_by_name,
          }))
        );
      }

      setExpensesLoaded(true);

      // Subscribe to real-time updates
      const channel = supabase
        .channel("dashboard-expenses")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "expenses",
            filter: `date=eq.${today}`,
          },
          async () => {
            const { data } = await supabase
              .from("expenses")
              .select("*")
              .eq("date", today)
              .order("created_at", { ascending: false });

            if (data) {
              setExpenses(
                data.map((e: any) => ({
                  id: e.id,
                  amount: e.amount,
                  category: e.category,
                  paymentMode: e.payment_mode,
                  description: e.description,
                  date: e.date,
                  createdAt: e.created_at,
                  createdBy: e.created_by,
                  createdByName: e.created_by_name,
                }))
              );
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    fetchAndSubscribe();
  }, [user, userData, today]);

  // Fetch and subscribe to cash reconciliation (admin only)
  useEffect(() => {
    if (!user || !userData) return;
    
    // If not admin, mark cash as loaded immediately
    if (!isAdmin) {
      setCashLoaded(true);
      return;
    }

    const fetchAndSubscribe = async () => {
      const { data } = await supabase
        .from("cash_reconciliation")
        .select("*")
        .eq("date", today)
        .maybeSingle();

      if (data) {
        setCashReconciliation({
          id: data.id,
          date: data.date,
          actualClosingCash: data.actual_closing_cash,
          actualClosingUPI: data.actual_closing_upi,
          difference: data.difference,
          upiDifference: data.upi_difference,
        });
      }

      setCashLoaded(true);

      // Subscribe to real-time updates
      const channel = supabase
        .channel("dashboard-cash")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cash_reconciliation",
            filter: `date=eq.${today}`,
          },
          async () => {
            const { data: updated } = await supabase
              .from("cash_reconciliation")
              .select("*")
              .eq("date", today)
              .maybeSingle();

            if (updated) {
              setCashReconciliation({
                id: updated.id,
                date: updated.date,
                actualClosingCash: updated.actual_closing_cash,
                actualClosingUPI: updated.actual_closing_upi,
                difference: updated.difference,
                upiDifference: updated.upi_difference,
              });
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    fetchAndSubscribe();
  }, [user, userData, authLoading, isAdmin, today]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const cashSales = sales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, sale) => sum + sale.amount, 0);
    const upiSales = sales
      .filter((s) => s.paymentMethod === "upi")
      .reduce((sum, sale) => sum + sale.amount, 0);

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const cashExpenses = expenses
      .filter((e) => e.paymentMode === "cash")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const upiExpenses = expenses
      .filter((e) => e.paymentMode === "upi")
      .reduce((sum, expense) => sum + expense.amount, 0);

    const netProfit = totalSales - totalExpenses;

    return {
      totalSales,
      cashSales,
      upiSales,
      totalExpenses,
      cashExpenses,
      upiExpenses,
      netProfit,
    };
  }, [sales, expenses]);

  // Get recent activity (last 5 sales and expenses)
  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Dashboard
            </h1>
            <p className="text-gray-400">Today&apos;s Overview - {new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
              {userData?.displayName || user?.email}
            </span>
            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm capitalize">
              {userData?.role || 'User'}
            </span>
          </div>
        </div>

        {/* Message */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-lg shadow-lg text-white">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-blue-100 text-sm">Total Sales</p>
                <p className="text-3xl font-bold mt-1">{formatINR(stats.totalSales)}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-500">
              <div className="flex justify-between text-sm">
                <span className="text-blue-100">Cash:</span>
                <span className="font-semibold">{formatINR(stats.cashSales)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-blue-100">UPI:</span>
                <span className="font-semibold">{formatINR(stats.upiSales)}</span>
              </div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 rounded-lg shadow-lg text-white">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-red-100 text-sm">Total Expenses</p>
                <p className="text-3xl font-bold mt-1">{formatINR(stats.totalExpenses)}</p>
              </div>
              <div className="text-3xl">💸</div>
            </div>
            <div className="mt-4 pt-4 border-t border-red-500">
              <div className="flex justify-between text-sm">
                <span className="text-red-100">Cash:</span>
                <span className="font-semibold">{formatINR(stats.cashExpenses)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-red-100">UPI:</span>
                <span className="font-semibold">{formatINR(stats.upiExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Net Profit - Admin Only */}
          {isAdmin && (
            <div className={`bg-gradient-to-br ${
              stats.netProfit >= 0 
                ? 'from-green-600 to-green-700' 
                : 'from-orange-600 to-orange-700'
            } p-6 rounded-lg shadow-lg text-white`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-green-100 text-sm">Net Profit</p>
                  <p className="text-3xl font-bold mt-1">{formatINR(stats.netProfit)}</p>
                </div>
                <div className="text-3xl">{stats.netProfit >= 0 ? '📈' : '📉'}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-500">
                <div className="text-sm">
                  <span className="text-green-100">Margin:</span>
                  <span className="font-semibold ml-2">
                    {stats.totalSales > 0 
                      ? ((stats.netProfit / stats.totalSales) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cash Status - Admin Only */}
          {isAdmin && cashReconciliation && (
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 rounded-lg shadow-lg text-white">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-purple-100 text-sm">Cash Status</p>
                  <p className="text-2xl font-bold mt-1">
                    {Math.abs(cashReconciliation.difference) < 0.01 && 
                     Math.abs(cashReconciliation.upiDifference) < 0.01 ? '✅' : '⚠️'}
                  </p>
                </div>
                <div className="text-3xl">💵</div>
              </div>
              <div className="mt-4 pt-4 border-t border-purple-500">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-100">Cash Diff:</span>
                  <span className={`font-semibold ${
                    Math.abs(cashReconciliation.difference) < 0.01 
                      ? 'text-green-300' 
                      : 'text-red-300'
                  }`}>
                    {cashReconciliation.difference >= 0 ? '+' : ''}{formatINR(cashReconciliation.difference)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-purple-100">UPI Diff:</span>
                  <span className={`font-semibold ${
                    Math.abs(cashReconciliation.upiDifference) < 0.01 
                      ? 'text-green-300' 
                      : 'text-red-300'
                  }`}>
                    {cashReconciliation.upiDifference >= 0 ? '+' : ''}{formatINR(cashReconciliation.upiDifference)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/sales"
            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all text-center"
          >
            <div className="text-3xl mb-2">🛒</div>
            <p className="font-semibold text-gray-900">Add Sale</p>
          </Link>
          <Link
            href="/expenses"
            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all text-center"
          >
            <div className="text-3xl mb-2">💳</div>
            <p className="font-semibold text-gray-900">Add Expense</p>
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/cash"
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all text-center"
              >
                <div className="text-3xl mb-2">💰</div>
                <p className="font-semibold text-gray-900">Cash Balance</p>
              </Link>
              <Link
                href="/inventory"
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all text-center"
              >
                <div className="text-3xl mb-2">📦</div>
                <p className="font-semibold text-gray-900">Inventory</p>
              </Link>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Recent Sales
              </h2>
              <Link
                href="/sales"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
            {recentSales.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No sales recorded today
              </p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {formatINR(sale.amount)}
                      </p>
                      {sale.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {sale.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(
                          sale.createdAt?.toDate
                            ? sale.createdAt.toDate()
                            : new Date(sale.createdAt)
                        )}
                        {isAdmin && ` • ${sale.createdByName}`}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
                          sale.paymentMethod === "cash"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {sale.paymentMethod === "cash" ? "💵 Cash" : "📱 UPI"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Expenses */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Recent Expenses
              </h2>
              <Link
                href="/expenses"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
            {recentExpenses.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No expenses recorded today
              </p>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {formatINR(expense.amount)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(
                          expense.createdAt?.toDate
                            ? expense.createdAt.toDate()
                            : new Date(expense.createdAt)
                        )}
                        {isAdmin && ` • ${expense.createdByName}`}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-lg mb-1">
                        {expense.category === 'chicken' && '🍗'}
                        {expense.category === 'oil' && '🛢️'}
                        {expense.category === 'masala' && '🌶️'}
                        {expense.category === 'gas' && '🔥'}
                        {expense.category === 'wages' && '👤'}
                        {expense.category === 'other' && '📦'}
                      </div>
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                          expense.paymentMode === "cash"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {expense.paymentMode === "cash" ? "💵" : "📱"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin-Only Cash Reconciliation Section */}
        {isAdmin && (
          <div className="mt-6 bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-lg shadow-lg text-white">
            <h2 className="text-xl font-bold mb-4">💰 Today&apos;s Cash Reconciliation</h2>
            {!cashReconciliation ? (
              <div className="text-center py-4">
                <p className="mb-4">No reconciliation recorded yet for today</p>
                <Link
                  href="/cash"
                  className="inline-block px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Record Cash Reconciliation
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/10 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-lg">💵 Cash</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Closing Balance:</span>
                      <span className="font-bold">{formatINR(cashReconciliation.actualClosingCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Difference:</span>
                      <span className={`font-bold ${
                        Math.abs(cashReconciliation.difference) < 0.01 
                          ? 'text-green-300' 
                          : 'text-red-300'
                      }`}>
                        {cashReconciliation.difference >= 0 ? '+' : ''}{formatINR(cashReconciliation.difference)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-lg">📱 UPI</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Closing Balance:</span>
                      <span className="font-bold">{formatINR(cashReconciliation.actualClosingUPI)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Difference:</span>
                      <span className={`font-bold ${
                        Math.abs(cashReconciliation.upiDifference) < 0.01 
                          ? 'text-green-300' 
                          : 'text-red-300'
                      }`}>
                        {cashReconciliation.upiDifference >= 0 ? '+' : ''}{formatINR(cashReconciliation.upiDifference)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

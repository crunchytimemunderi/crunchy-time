"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatTime, getCurrentDate } from "@/utils/formatting";
import { validateAmount } from "@/utils/validation";
import { formatINR } from "@/lib/currency";

interface CashReconciliation {
  id: string;
  date: string;
  openingCash: number;
  cashSales: number;
  cashExpenses: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  difference: number;
  notes?: string;
  // UPI fields
  openingUPI: number;
  upiSales: number;
  upiExpenses: number;
  expectedClosingUPI: number;
  actualClosingUPI: number;
  upiDifference: number;
  upiNotes?: string;
  createdAt: any;
  createdBy: string;
  createdByName: string;
}

function CashContent() {
  const router = useRouter();
  const { user, userData, hasPermission } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());

  // Cash fields
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [cashSales, setCashSales] = useState(0);
  const [cashExpenses, setCashExpenses] = useState(0);

  // UPI fields
  const [openingUPI, setOpeningUPI] = useState("");
  const [actualUPI, setActualUPI] = useState("");
  const [upiNotes, setUpiNotes] = useState("");
  const [upiSales, setUpiSales] = useState(0);
  const [upiExpenses, setUpiExpenses] = useState(0);

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CashReconciliation[]>([]);
  const [todayReconciliation, setTodayReconciliation] =
    useState<CashReconciliation | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const today = getCurrentDate();

  // Check permission - Cash reconciliation is admin only
  useEffect(() => {
    if (userData && userData.role !== "admin") {
      router.push("/dashboard");
    }
  }, [userData, router]);

  // Cash calculations
  const expectedClosingCash =
    parseFloat(openingCash || "0") + cashSales - cashExpenses;
  const cashDifference = parseFloat(actualCash || "0") - expectedClosingCash;

  // UPI calculations
  const expectedClosingUPI =
    parseFloat(openingUPI || "0") + upiSales - upiExpenses;
  const upiDifference = parseFloat(actualUPI || "0") - expectedClosingUPI;

  // Fetch today's cash and UPI sales and expenses
  useEffect(() => {
    if (!user) return;

    const fetchAndSubscribe = async () => {
      // Fetch cash sales
      const { data: cashSalesData } = await supabase
        .from("sales")
        .select("amount")
        .eq("date", selectedDate)
        .eq("payment_method", "cash");

      const cashSalesTotal = (cashSalesData || []).reduce(
        (sum, s) => sum + (s.amount || 0),
        0,
      );
      setCashSales(cashSalesTotal);

      // Fetch UPI sales
      const { data: upiSalesData } = await supabase
        .from("sales")
        .select("amount")
        .eq("date", selectedDate)
        .eq("payment_method", "upi");

      const upiSalesTotal = (upiSalesData || []).reduce(
        (sum, s) => sum + (s.amount || 0),
        0,
      );
      setUpiSales(upiSalesTotal);

      // Fetch cash expenses
      const { data: cashExpensesData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("date", selectedDate)
        .eq("payment_mode", "cash");

      const cashExpensesTotal = (cashExpensesData || []).reduce(
        (sum, e) => sum + (e.amount || 0),
        0,
      );
      setCashExpenses(cashExpensesTotal);

      // Fetch UPI expenses
      const { data: upiExpensesData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("date", selectedDate)
        .eq("payment_mode", "upi");

      const upiExpensesTotal = (upiExpensesData || []).reduce(
        (sum, e) => sum + (e.amount || 0),
        0,
      );
      setUpiExpenses(upiExpensesTotal);

      // Subscribe to realtime changes
      const salesChannel = supabase
        .channel("all-sales-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sales",
            filter: `date=eq.${selectedDate}`,
          },
          async () => {
            // Refetch cash sales
            const { data: cashData } = await supabase
              .from("sales")
              .select("amount")
              .eq("date", selectedDate)
              .eq("payment_method", "cash");
            const cashTotal = (cashData || []).reduce(
              (sum, s) => sum + (s.amount || 0),
              0,
            );
            setCashSales(cashTotal);

            // Refetch UPI sales
            const { data: upiData } = await supabase
              .from("sales")
              .select("amount")
              .eq("date", selectedDate)
              .eq("payment_method", "upi");
            const upiTotal = (upiData || []).reduce(
              (sum, s) => sum + (s.amount || 0),
              0,
            );
            setUpiSales(upiTotal);
          },
        )
        .subscribe();

      const expensesChannel = supabase
        .channel("all-expenses-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "expenses",
            filter: `date=eq.${selectedDate}`,
          },
          async () => {
            // Refetch cash expenses
            const { data: cashData } = await supabase
              .from("expenses")
              .select("amount")
              .eq("date", selectedDate)
              .eq("payment_mode", "cash");
            const cashTotal = (cashData || []).reduce(
              (sum, e) => sum + (e.amount || 0),
              0,
            );
            setCashExpenses(cashTotal);

            // Refetch UPI expenses
            const { data: upiData } = await supabase
              .from("expenses")
              .select("amount")
              .eq("date", selectedDate)
              .eq("payment_mode", "upi");
            const upiTotal = (upiData || []).reduce(
              (sum, e) => sum + (e.amount || 0),
              0,
            );
            setUpiExpenses(upiTotal);
          },
        )
        .subscribe();

      return () => {
        salesChannel.unsubscribe();
        expensesChannel.unsubscribe();
      };
    };

    fetchAndSubscribe();
  }, [user, selectedDate]);

  // Fetch reconciliation history (last 7 days)
  useEffect(() => {
    if (!user) return;

    const fetchAndSubscribe = async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

      // Fetch initial data
      const { data, error } = await supabase
        .from("cash_reconciliation")
        .select("*")
        .gte("date", sevenDaysAgoStr)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching reconciliation history:", error);
      } else {
        const reconciliations = (data || []).map((r) => ({
          id: r.id,
          date: r.date,
          openingCash: r.opening_cash,
          cashSales: r.cash_sales,
          cashExpenses: r.cash_expenses,
          expectedClosingCash: r.expected_closing_cash,
          actualClosingCash: r.actual_closing_cash,
          difference: r.difference,
          notes: r.notes,
          openingUPI: r.opening_upi,
          upiSales: r.upi_sales,
          upiExpenses: r.upi_expenses,
          expectedClosingUPI: r.expected_closing_upi,
          actualClosingUPI: r.actual_closing_upi,
          upiDifference: r.upi_difference,
          upiNotes: r.upi_notes,
          createdAt: r.created_at,
          createdBy: r.created_by,
          createdByName: r.created_by_name,
        }));
        setHistory(reconciliations);

        // Check if today's reconciliation exists
        const todayRec = reconciliations.find((r) => r.date === selectedDate);
        setTodayReconciliation(todayRec || null);

        // If today's reconciliation exists, populate form
        if (todayRec) {
          setOpeningCash(todayRec.openingCash.toString());
          setActualCash(todayRec.actualClosingCash.toString());
          setCashNotes(todayRec.notes || "");
          setOpeningUPI(todayRec.openingUPI.toString());
          setActualUPI(todayRec.actualClosingUPI.toString());
          setUpiNotes(todayRec.upiNotes || "");
        } else {
          // Fetch previous day's closing balance to use as opening balance
          const previousDate = new Date(selectedDate);
          previousDate.setDate(previousDate.getDate() - 1);
          const prevDateStr = previousDate.toISOString().split("T")[0];

          const { data: prevData } = await supabase
            .from("cash_reconciliation")
            .select("actual_closing_cash, actual_closing_upi")
            .eq("date", prevDateStr)
            .single();

          if (prevData) {
            setOpeningCash(prevData.actual_closing_cash.toString());
            setOpeningUPI(prevData.actual_closing_upi.toString());
          }
        }
      }

      // Subscribe to realtime changes
      const channel = supabase
        .channel("reconciliation-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cash_reconciliation",
          },
          async () => {
            const { data } = await supabase
              .from("cash_reconciliation")
              .select("*")
              .gte("date", sevenDaysAgoStr)
              .order("date", { ascending: false });

            const reconciliations = (data || []).map((r) => ({
              id: r.id,
              date: r.date,
              openingCash: r.opening_cash,
              cashSales: r.cash_sales,
              cashExpenses: r.cash_expenses,
              expectedClosingCash: r.expected_closing_cash,
              actualClosingCash: r.actual_closing_cash,
              difference: r.difference,
              notes: r.notes,
              openingUPI: r.opening_upi,
              upiSales: r.upi_sales,
              upiExpenses: r.upi_expenses,
              expectedClosingUPI: r.expected_closing_upi,
              actualClosingUPI: r.actual_closing_upi,
              upiDifference: r.upi_difference,
              upiNotes: r.upi_notes,
              createdAt: r.created_at,
              createdBy: r.created_by,
              createdByName: r.created_by_name,
            }));
            setHistory(reconciliations);

            const todayRec = reconciliations.find(
              (r) => r.date === selectedDate,
            );
            setTodayReconciliation(todayRec || null);
          },
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    fetchAndSubscribe();
  }, [user, selectedDate]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if editing past date and user is not admin
    const isPastDate = selectedDate < today;
    if (isPastDate && userData?.role !== "admin") {
      showMessage(
        "error",
        "Only admins can edit previous reconciliation records",
      );
      return;
    }

    // Validation for Cash
    if (!validateAmount(openingCash)) {
      showMessage("error", "Please enter a valid opening cash amount");
      return;
    }

    if (!validateAmount(actualCash)) {
      showMessage("error", "Please enter a valid actual cash amount");
      return;
    }

    // Validation for UPI
    if (!validateAmount(openingUPI)) {
      showMessage("error", "Please enter a valid opening UPI amount");
      return;
    }

    if (!validateAmount(actualUPI)) {
      showMessage("error", "Please enter a valid actual UPI amount");
      return;
    }

    setLoading(true);

    try {
      const reconciliationData = {
        date: selectedDate,
        opening_cash: parseFloat(openingCash),
        cash_sales: cashSales,
        cash_expenses: cashExpenses,
        expected_closing_cash: expectedClosingCash,
        actual_closing_cash: parseFloat(actualCash),
        difference: cashDifference,
        notes: cashNotes.trim(),
        // UPI fields
        opening_upi: parseFloat(openingUPI),
        upi_sales: upiSales,
        upi_expenses: upiExpenses,
        expected_closing_upi: expectedClosingUPI,
        actual_closing_upi: parseFloat(actualUPI),
        upi_difference: upiDifference,
        upi_notes: upiNotes.trim(),
        created_at: new Date().toISOString(),
        created_by: user!.id,
        created_by_name: userData!.displayName,
      };

      if (todayReconciliation) {
        // Update existing reconciliation
        const { error } = await supabase
          .from("cash_reconciliation")
          .update(reconciliationData)
          .eq("id", todayReconciliation.id);

        if (error) throw error;
        showMessage("success", "Reconciliation updated successfully!");
      } else {
        // Create new reconciliation
        const { error } = await supabase
          .from("cash_reconciliation")
          .insert([reconciliationData]);

        if (error) throw error;
        showMessage("success", "Reconciliation saved successfully!");
      }
    } catch (error: any) {
      console.error("Error saving reconciliation:", error);
      showMessage(
        "error",
        error.message || "Failed to save reconciliation. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recId: string) => {
    // Only admin can delete records
    if (userData?.role !== "admin") {
      showMessage("error", "Only admins can delete reconciliation records");
      return;
    }

    if (!confirm("Are you sure you want to delete this reconciliation?"))
      return;

    try {
      const { error } = await supabase
        .from("cash_reconciliation")
        .delete()
        .eq("id", recId);

      if (error) throw error;

      showMessage("success", "Reconciliation deleted successfully");

      // Clear form if deleted today's record
      if (todayReconciliation?.id === recId) {
        setOpeningCash("");
        setActualCash("");
        setCashNotes("");
        setOpeningUPI("");
        setActualUPI("");
        setUpiNotes("");
      }
    } catch (error: any) {
      console.error("Error deleting reconciliation:", error);
      showMessage("error", "Failed to delete reconciliation");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            💵 Cash & UPI Reconciliation
          </h1>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline self-start md:self-auto"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:gap-8">
          {/* Date Selection */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <label
              htmlFor="date"
              className="block text-sm font-medium mb-2 text-gray-900"
            >
              Select Date
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />

            {/* Warning for non-admin viewing past dates */}
            {selectedDate < today && userData?.role !== "admin" && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ You are viewing a past date. Only admins can edit or delete
                  previous reconciliation records.
                </p>
              </div>
            )}
          </div>

          {/* CASH & UPI SIDE BY SIDE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT SIDE - CASH */}
            <div className="space-y-6">
              {/* Cash Flow Summary */}
              <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-green-200">
                <h2 className="text-2xl font-bold mb-6 text-green-700">
                  💵 Cash Flow
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <span className="font-medium text-blue-700">
                      💰 Opening Cash
                    </span>
                    <span className="text-2xl font-bold text-blue-700">
                      {openingCash ? formatINR(parseFloat(openingCash)) : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="text-green-700">+ Cash Sales</span>
                    <span className="text-xl font-bold text-green-700">
                      {formatINR(cashSales)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <span className="text-red-700">− Cash Expenses</span>
                    <span className="text-xl font-bold text-red-700">
                      {formatINR(cashExpenses)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                    <span className="font-bold text-purple-700">
                      = Expected Closing
                    </span>
                    <span className="text-2xl font-bold text-purple-700">
                      {formatINR(expectedClosingCash)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Reconciliation Form */}
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-green-700">
                  Record Cash
                </h2>

                <div className="space-y-4">
                  {/* Opening Cash */}
                  <div>
                    <label
                      htmlFor="openingCash"
                      className="block text-sm font-medium mb-2 text-gray-900"
                    >
                      Opening Cash (₹) *
                    </label>
                    <input
                      type="number"
                      id="openingCash"
                      step="0.01"
                      min="0"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cash in drawer at start of day
                    </p>
                  </div>

                  {/* Actual Cash Count */}
                  <div>
                    <label
                      htmlFor="actualCash"
                      className="block text-sm font-medium mb-2"
                    >
                      Actual Cash Count (₹) *
                    </label>
                    <input
                      type="number"
                      id="actualCash"
                      step="0.01"
                      min="0"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Physical cash counted in drawer
                    </p>
                  </div>

                  {/* Cash Difference Display */}
                  {actualCash && openingCash && (
                    <div
                      className={`p-4 rounded-lg border-2 ${
                        Math.abs(cashDifference) < 0.01
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                          : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold">
                          {Math.abs(cashDifference) < 0.01
                            ? "✓ Perfect!"
                            : "⚠️ Difference"}
                        </span>
                        <span
                          className={`text-2xl font-bold ${
                            Math.abs(cashDifference) < 0.01
                              ? "text-green-700 dark:text-green-300"
                              : "text-red-700 dark:text-red-300"
                          }`}
                        >
                          {cashDifference >= 0 ? "+" : ""}
                          {formatINR(cashDifference)}
                        </span>
                      </div>
                      {Math.abs(cashDifference) >= 0.01 && (
                        <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                          {cashDifference > 0
                            ? "Cash over - more than expected"
                            : "Cash short - less than expected"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cash Notes */}
                  <div>
                    <label
                      htmlFor="cashNotes"
                      className="block text-sm font-medium mb-2"
                    >
                      Cash Notes (Optional)
                    </label>
                    <textarea
                      id="cashNotes"
                      value={cashNotes}
                      onChange={(e) => setCashNotes(e.target.value)}
                      placeholder="Any cash discrepancies..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700"
                      rows={2}
                      disabled={loading}
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {cashNotes.length}/200
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - UPI */}
            <div className="space-y-6">
              {/* UPI Flow Summary */}
              <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-blue-200">
                <h2 className="text-2xl font-bold mb-6 text-blue-700">
                  📱 UPI Flow
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <span className="font-medium text-blue-700">
                      💳 Opening UPI
                    </span>
                    <span className="text-2xl font-bold text-blue-700">
                      {openingUPI ? formatINR(parseFloat(openingUPI)) : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="text-green-700">+ UPI Sales</span>
                    <span className="text-xl font-bold text-green-700">
                      {formatINR(upiSales)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <span className="text-red-700">− UPI Expenses</span>
                    <span className="text-xl font-bold text-red-700">
                      {formatINR(upiExpenses)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                    <span className="font-bold text-purple-700">
                      = Expected Closing
                    </span>
                    <span className="text-2xl font-bold text-purple-700">
                      {formatINR(expectedClosingUPI)}
                    </span>
                  </div>
                </div>
              </div>

              {/* UPI Reconciliation Form */}
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-blue-700">
                  Record UPI
                </h2>

                <div className="space-y-4">
                  {/* Opening UPI */}
                  <div>
                    <label
                      htmlFor="openingUPI"
                      className="block text-sm font-medium mb-2 text-gray-900"
                    >
                      Opening UPI Balance (₹) *
                    </label>
                    <input
                      type="number"
                      id="openingUPI"
                      step="0.01"
                      min="0"
                      value={openingUPI}
                      onChange={(e) => setOpeningUPI(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      UPI balance at start of day
                    </p>
                  </div>

                  {/* Actual UPI */}
                  <div>
                    <label
                      htmlFor="actualUPI"
                      className="block text-sm font-medium mb-2"
                    >
                      Actual UPI Balance (₹) *
                    </label>
                    <input
                      type="number"
                      id="actualUPI"
                      step="0.01"
                      min="0"
                      value={actualUPI}
                      onChange={(e) => setActualUPI(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Actual UPI balance verified
                    </p>
                  </div>

                  {/* UPI Difference Display */}
                  {actualUPI && openingUPI && (
                    <div
                      className={`p-4 rounded-lg border-2 ${
                        Math.abs(upiDifference) < 0.01
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                          : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold">
                          {Math.abs(upiDifference) < 0.01
                            ? "✓ Perfect!"
                            : "⚠️ Difference"}
                        </span>
                        <span
                          className={`text-2xl font-bold ${
                            Math.abs(upiDifference) < 0.01
                              ? "text-green-700 dark:text-green-300"
                              : "text-red-700 dark:text-red-300"
                          }`}
                        >
                          {upiDifference >= 0 ? "+" : ""}
                          {formatINR(upiDifference)}
                        </span>
                      </div>
                      {Math.abs(upiDifference) >= 0.01 && (
                        <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                          {upiDifference > 0
                            ? "UPI over - more than expected"
                            : "UPI short - less than expected"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* UPI Notes */}
                  <div>
                    <label
                      htmlFor="upiNotes"
                      className="block text-sm font-medium mb-2"
                    >
                      UPI Notes (Optional)
                    </label>
                    <textarea
                      id="upiNotes"
                      value={upiNotes}
                      onChange={(e) => setUpiNotes(e.target.value)}
                      placeholder="Any UPI discrepancies..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                      rows={2}
                      disabled={loading}
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {upiNotes.length}/200
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button - Full Width */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-md hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg shadow-lg"
              >
                {loading
                  ? "Saving..."
                  : todayReconciliation
                    ? "✓ Update Cash & UPI Reconciliation"
                    : "✓ Save Cash & UPI Reconciliation"}
              </button>
            </form>
          </div>

          {/* History - Full Width */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              📅 Last 7 Days
            </h2>

            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-sm">No reconciliation history</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {history.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-4 border-2 rounded-lg transition ${
                      rec.date === selectedDate
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">
                          {new Date(rec.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTime(
                            rec.createdAt?.toDate
                              ? rec.createdAt.toDate()
                              : new Date(),
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-3">
                          <div>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Cash
                            </p>
                            <span
                              className={`text-lg font-bold ${
                                Math.abs(rec.difference) < 0.01
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {rec.difference >= 0 ? "+" : ""}
                              {formatINR(rec.difference)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              UPI
                            </p>
                            <span
                              className={`text-lg font-bold ${
                                Math.abs(rec.upiDifference) < 0.01
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {rec.upiDifference >= 0 ? "+" : ""}
                              {formatINR(rec.upiDifference)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cash Section */}
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 border-l-2 border-green-400 pl-2">
                        <p className="font-semibold text-green-700 dark:text-green-400 mb-1">
                          💵 Cash
                        </p>
                        <div className="flex justify-between">
                          <span>Opening:</span>
                          <span className="font-medium">
                            {formatINR(rec.openingCash)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected:</span>
                          <span className="font-medium">
                            {formatINR(rec.expectedClosingCash)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Actual:</span>
                          <span className="font-medium">
                            {formatINR(rec.actualClosingCash)}
                          </span>
                        </div>
                        {rec.notes && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            &quot;{rec.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* UPI Section */}
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 border-l-2 border-blue-400 pl-2">
                        <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">
                          📱 UPI
                        </p>
                        <div className="flex justify-between">
                          <span>Opening:</span>
                          <span className="font-medium">
                            {formatINR(rec.openingUPI)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected:</span>
                          <span className="font-medium">
                            {formatINR(rec.expectedClosingUPI)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Actual:</span>
                          <span className="font-medium">
                            {formatINR(rec.actualClosingUPI)}
                          </span>
                        </div>
                        {rec.upiNotes && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            &quot;{rec.upiNotes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {userData?.role === "admin" && (
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-3"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <CashContent />
    </ProtectedRoute>
  );
}

"use client";

import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, PieChart, BarChart3, 
  Calendar, Download, FileText, FileSpreadsheet, AlertTriangle, 
  CheckCircle2, ChevronDown, ArrowUpRight, ArrowDownRight, 
  Zap, Search, Filter, RotateCcw, MoreHorizontal, X, ArrowLeft, ArrowRight,
  LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toLocalDateString, getCurrentDate } from "@/utils/formatting";
import { formatINR } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import { exportReportAsExcel, exportReportAsPDF } from "@/lib/reports-export";
import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback, useMemo } from "react";

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

function ReportsContent() {
  const router = useRouter();
  const { user, userData, hasPermission } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dateRange, setDateRange] = useState<
    "today" | "yesterday" | "7days" | "30days" | "90days" | "custom" | "all"
  >("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
    const todayStr = getCurrentDate();

    switch (dateRange) {
      case "today":
        return { start: todayStr, end: todayStr };
      case "yesterday": {
        const d = new Date(todayStr + "T00:00:00");
        d.setDate(d.getDate() - 1);
        const yStr = toLocalDateString(d);
        return { start: yStr, end: yStr };
      }
      case "7days": {
        const d = new Date(todayStr + "T00:00:00");
        d.setDate(d.getDate() - 7);
        return { start: toLocalDateString(d), end: todayStr };
      }
      case "30days": {
        const d = new Date(todayStr + "T00:00:00");
        d.setDate(d.getDate() - 30);
        return { start: toLocalDateString(d), end: todayStr };
      }
      case "90days": {
        const d = new Date(todayStr + "T00:00:00");
        d.setDate(d.getDate() - 90);
        return { start: toLocalDateString(d), end: todayStr };
      }
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return null;
      case "all":
        return null;
    }
  }, [dateRange, customStartDate, customEndDate]);

  const fetchData = useCallback(async () => {
    const dateFilter = getDateFilter();

    // Fetch sales
    let salesQuery = supabase
      .from("sales")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false });

    if (dateFilter) {
      salesQuery = salesQuery
        .gte("date", dateFilter.start)
        .lte("date", dateFilter.end);
    }

    try {
    const { data: salesData, error: salesError } = await salesQuery;
    if (salesError) throw salesError;
    setSales(salesData || []);

    // Fetch expenses
    let expensesQuery = supabase
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false });

    if (dateFilter) {
      expensesQuery = expensesQuery
        .gte("date", dateFilter.start)
        .lte("date", dateFilter.end);
    }

    const { data: expensesData, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;
    setExpenses(expensesData || []);
    } catch (err: any) {
      addToast(err.message || "Failed to load reports data", "error");
    }
  }, [getDateFilter]);

  useEffect(() => {
    if (!loading && hasPermission("canViewReports")) {
      fetchData();
    }
  }, [loading, fetchData, hasPermission]);

  // Sales Analytics
  const totalSales = useMemo(() => sales.reduce((sum, sale) => sum + sale.amount, 0), [sales]);
  const totalTransactions = sales.length;
  const averageSale = useMemo(() => totalTransactions > 0 ? totalSales / totalTransactions : 0, [totalSales, totalTransactions]);

  // Sales by payment method
  const salesByPayment = useMemo(() => sales.reduce(
    (acc, sale) => {
      if (!acc[sale.payment_method]) {
        acc[sale.payment_method] = { count: 0, total: 0 };
      }
      acc[sale.payment_method].count += 1;
      acc[sale.payment_method].total += sale.amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number }>,
  ), [sales]);

  const totalCashSales = salesByPayment["cash"]?.total || 0;
  const totalUPISales = salesByPayment["upi"]?.total || 0;

  // Expense Analytics
  const totalExpenses = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses]);

  const expensesByCategory = useMemo(() => expenses.reduce(
    (acc, exp) => {
      if (!acc[exp.category]) {
        acc[exp.category] = 0;
      }
      acc[exp.category] += exp.amount;
      return acc;
    },
    {} as Record<string, number>,
  ), [expenses]);

  const topExpenseCategories = useMemo(() => Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount), [expensesByCategory]);

  // Profit Calculation
  const profit = useMemo(() => totalSales - totalExpenses, [totalSales, totalExpenses]);
  const profitMargin = useMemo(() => totalSales > 0 ? (profit / totalSales) * 100 : 0, [profit, totalSales]);

  const stats = useMemo(() => [
    { label: "Total Sales", value: totalSales, icon: TrendingUp, color: "text-green-400", sub: `${totalTransactions} sales` },
    { label: "Spent", value: totalExpenses, icon: TrendingDown, color: "text-red-400", sub: `${expenses.length} checks` },
    { label: "Profit", value: profit, icon: Zap, color: profit >= 0 ? "text-blue-400" : "text-orange-400", sub: `${profitMargin.toFixed(1)}% margin` },
    { label: "Average Sale", value: averageSale, icon: CreditCard, color: "text-purple-400", sub: "per customer" },
  ], [totalSales, totalExpenses, profit, averageSale, totalTransactions, expenses.length, profitMargin]);

  // Daily sales trend (last 7 days)
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  }), []);

  const dailySales = useMemo(() => last7Days.map((date) => {
    const daySales = sales.filter((s) => s.date.startsWith(date));
    return {
      date: new Date(date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      amount: daySales.reduce((sum, s) => sum + s.amount, 0),
    };
  }), [sales, last7Days]);

  const maxDailySale = useMemo(() => Math.max(...dailySales.map((d) => d.amount), 1), [dailySales]);

  // Export Handlers
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "90days":
        return "Last 90 Days";
      case "custom":
        return "Custom Range";
      case "all":
        return "All Time";
      default:
        return dateRange;
    }
  };

  const getDateRangeDates = () => {
    const dateFilter = getDateFilter();
    if (!dateFilter) {
      const oldestSale = sales.length > 0 ? sales[sales.length - 1].date : null;
      const oldestExpense =
        expenses.length > 0 ? expenses[expenses.length - 1].date : null;
      let startDate = oldestSale;
      if (oldestExpense && (!startDate || oldestExpense < startDate)) {
        startDate = oldestExpense;
      }
      return {
        start: startDate
          ? new Date(startDate).toLocaleDateString("en-GB")
          : "Beginning",
        end: new Date().toLocaleDateString("en-GB"),
      };
    }
    return {
      start: new Date(dateFilter.start).toLocaleDateString("en-GB"),
      end: new Date(dateFilter.end).toLocaleDateString("en-GB"),
    };
  };

  const handleExportExcel = async () => {
    try {
      setShowExportMenu(false);
      setExporting("excel");
      addToast("Generating Excel report...", "info");
      
      const dates = getDateRangeDates();

      await exportReportAsExcel({
        dateRange: getDateRangeLabel(),
        startDate: dates.start,
        endDate: dates.end,
        sales,
        expenses,
        totalSales,
        totalExpenses,
        profit,
        totalCashSales,
        totalUPISales,
      });
      
      addToast("Excel report saved!", "success");
    } catch (error) {
      logger.error("Error exporting Excel:", error);
      addToast("Failed to export Excel", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      setShowExportMenu(false);
      setExporting("pdf");
      addToast("Generating PDF report...", "info");
      
      const dates = getDateRangeDates();

      await exportReportAsPDF({
        dateRange: getDateRangeLabel(),
        startDate: dates.start,
        endDate: dates.end,
        sales,
        expenses,
        totalSales,
        totalExpenses,
        profit,
        totalCashSales,
        totalUPISales,
      });
      
      addToast("PDF report saved!", "success");
    } catch (error) {
      logger.error("Error exporting PDF:", error);
      addToast("Failed to export PDF", "error");
    } finally {
      setExporting(null);
    }
  };

  // Custom Premium Loading Component
   if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 relative"
        >
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-full h-full bg-crispy-gradient rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/20 text-white">
            <BarChart3 className="w-10 h-10" />
          </div>
        </motion.div>
        <div className="space-y-2 text-center font-outfit">
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Summary</h2>
          <p className="text-muted-foreground text-sm font-medium">Loading summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-inter text-slate-200">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[10%] -right-[10%] w-[60%] h-[60%] bg-blue-600 blur-[180px] rounded-full" />
        <div className="absolute bottom-0 -left-[5%] w-[40%] h-[40%] bg-indigo-600 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto p-4 lg:p-12 space-y-12 relative z-10">
        
        {/* Header & Controls */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
             <div className="flex items-center gap-5 mb-4">
               <div className="w-14 h-14 bg-crispy-gradient rounded-2xl flex items-center justify-center shadow-3xl shadow-red-500/20 transform -rotate-6 border border-white/20 text-white">
                 <Image
                   src="/logo.png"
                   alt="Crunchy Time"
                   width={56}
                   height={56}
                   className="w-full h-full object-cover"
                 />
               </div>
               <div>
                 <h1 className="text-4xl font-outfit font-black text-white tracking-tight uppercase leading-none italic">CRUNCHY TIME</h1>
                 <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                   Business Intelligence • {dateRange.toUpperCase()}
                   {hasMounted && (
                     <span className="opacity-50 ml-1">
                       ({getDateRangeDates().start} - {getDateRangeDates().end})
                     </span>
                   )}
                 </p>
               </div>
             </div>
          </motion.div>

          <div className="flex flex-wrap items-center gap-4">
             {/* Backup Tool */}
            <Link
              href="/backup"
              className="glass-card px-6 py-3 border-white/10 hover:border-white/30 text-[10px] font-black tracking-widest uppercase text-muted-foreground hover:text-white flex items-center gap-2 transition-all group"
            >
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> SAVE
            </Link>

            {/* Export System */}
            <div className="relative group/export">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-crispy-gradient text-white px-8 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-3xl shadow-blue-500/30 flex items-center gap-3 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" /> SAVE REPORT
              </button>

              <AnimatePresence>
                {showExportMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-64 glass-card border-white/20 shadow-4xl backdrop-blur-3xl overflow-hidden z-[60]"
                  >
                    <div className="p-2 space-y-1">
                      <button
                        onClick={handleExportExcel}
                        disabled={exporting !== null}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10 text-green-400 group-hover:bg-green-500/20">
                            {exporting === "excel" ? (
                              <RotateCcw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4" />
                            )}
                          </div>
                          <span className="font-medium">Excel Report (.xlsx)</span>
                        </div>
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={handleExportPDF}
                        disabled={exporting !== null}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors group border-t border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:bg-red-500/20">
                            {exporting === "pdf" ? (
                              <RotateCcw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <span className="font-medium">PDF Document (.pdf)</span>
                        </div>
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Temporal Filters */}
        <div className="glass-card p-2 border-white/10 shadow-inner flex flex-col md:flex-row gap-2">
          <div className="flex flex-wrap gap-1 p-1">
            {[
              { value: "today", label: "TODAY" },
              { value: "yesterday", label: "YESTERDAY" },
              { value: "7days", label: "7 DAYS" },
              { value: "30days", label: "30 DAYS" },
              { value: "custom", label: "PICK DATES" },
              { value: "all", label: "HISTORY" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all",
                  dateRange === option.value 
                    ? "bg-white/10 text-white shadow-xl border border-white/10" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {dateRange === "custom" && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-1 items-center gap-4 px-4 bg-white/5 rounded-2xl border border-white/5 ml-auto"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-muted-foreground uppercase">From</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-transparent border-none text-[10px] font-black text-white focus:ring-0 p-0"
                  />
                </div>
                <div className="w-4 h-px bg-white/10" />
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-muted-foreground uppercase">To</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-transparent border-none text-[10px] font-black text-white focus:ring-0 p-0"
                  />
                </div>
                <button
                  onClick={fetchData}
                  disabled={!customStartDate || !customEndDate}
                  className="ml-auto w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-all disabled:opacity-30 ripple"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card group p-8 border-white/5 overflow-hidden relative"
            >
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform rotate-12 group-hover:scale-110 transition-transform duration-700">
                <stat.icon className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 shadow-inner", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-4xl font-outfit font-black text-white tracking-tight">{formatINR(stat.value)}</h3>
                </div>
                <p className="text-[10px] font-black text-primary flex items-center gap-1.5">
                   <span className="w-1 h-1 rounded-full bg-primary" /> {stat.sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trends & Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Performance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 border-white/5 space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-outfit font-black text-white uppercase tracking-tight italic">Sales Progress</h3>
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-1">Last 7 days</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-6">
              {dailySales.map((day, index) => (
                <div key={index} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">{day.date}</span>
                    <span className="text-sm font-outfit font-black text-white">{formatINR(day.amount)}</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${maxDailySale > 0 ? (day.amount / maxDailySale) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="h-full bg-crispy-gradient rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Expense Allocation */}
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="glass-card p-10 border-white/5 space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-outfit font-black text-white uppercase tracking-tight italic">Expenses Breakdown</h3>
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-1">Where money is spent</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <PieChart className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-6">
              {topExpenseCategories.length > 0 ? (
                topExpenseCategories.map((cat, index) => {
                  const percentage = (cat.amount / totalExpenses) * 100;
                  return (
                    <div key={index} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">{cat.category}</span>
                        <div className="text-right">
                          <span className="text-sm font-outfit font-black text-white">{formatINR(cat.amount)}</span>
                          <span className="text-[9px] font-black text-red-400 ml-2">-{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className="h-full bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center opacity-20">
                  <Wallet className="w-16 h-16 mb-4" />
                  <p className="text-[10px] font-black tracking-widest uppercase">Nothing spent yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Secondary Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Terminal Mode Breakdown */}
          <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             className="glass-card p-10 border-white/5 space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-outfit font-black text-white uppercase tracking-tight italic">Payment Types</h3>
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-1">Cash vs UPI</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Cash</span>
                </div>
                <h4 className="text-3xl font-outfit font-black text-white mb-1">{formatINR(totalCashSales)}</h4>
                <p className="text-[10px] font-black text-muted-foreground uppercase">{salesByPayment["cash"]?.count || 0} Sales</p>
                <div className="mt-6 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${totalSales > 0 ? (totalCashSales / totalSales) * 100 : 0}%` }}
                     className="h-full bg-orange-500"
                   />
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                   <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">UPI</span>
                </div>
                <h4 className="text-3xl font-outfit font-black text-white mb-1">{formatINR(totalUPISales)}</h4>
                <p className="text-[10px] font-black text-muted-foreground uppercase">{salesByPayment["upi"]?.count || 0} Sales</p>
                 <div className="mt-6 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${totalSales > 0 ? (totalUPISales / totalSales) * 100 : 0}%` }}
                     className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                   />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl pointer-events-auto",
                toast.type === "success" 
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : toast.type === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              )}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toast.type === "error" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <RotateCcw className="w-5 h-5 animate-spin" />
              )}
              <span className="font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
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

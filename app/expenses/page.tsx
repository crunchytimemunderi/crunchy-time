"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import { exportToCSV, formatForExport } from "@/lib/export";
import { queueOperation } from "@/lib/offline-queue";
import { notifications } from "@/lib/notifications"
import { logger } from "@/lib/logger";
import { getCurrentDate, toLocalDateString } from "@/utils/formatting";
import { formatINR } from "@/lib/currency";
import PremiumLoader from "@/components/PremiumLoader";
import { 
  ShoppingCart, Wallet, CreditCard, Receipt, Plus, Trash2, Edit2, 
  ArrowLeft, ArrowRight, Search, Filter, RotateCcw, FileText, 
  ChevronDown, Package, Flame, Droplets, Users, Zap, MoreHorizontal,
  X, Check, AlertCircle, PieChart, TrendingUp, Calendar, LayoutGrid,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionContainer, MotionItem } from "@/components/shared/MotionList";

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
        logger.error("Failed to load custom categories", e);
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

    const categoryValue = newCategoryName.toLowerCase().replace(/\s+/g, "_");

    if (categories.some((cat) => cat.value === categoryValue && cat.value !== editingCategory.value)) {
      notifications.error("Category already exists");
      return;
    }

    const updatedCategories = categories.map((cat) =>
      cat.value === editingCategory.value
        ? { ...cat, label: newCategoryName.trim(), emoji: newCategoryEmoji, value: categoryValue }
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

  useEffect(() => {
    logger.debug(
      `🔐 Expenses page auth check: authLoading=${authLoading}, user=${!!user}, userData=${!!userData}, role=${userData?.role}`,
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
    if (userData && !hasPermission("canViewExpenses")) {
      logger.debug(
        "❌ No canViewExpenses permission - redirecting to dashboard",
      );
      router.push("/dashboard");
    } else if (userData) {
      logger.debug("✅ Expenses access confirmed");
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
      logger.error("Error fetching expenses:", error);
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

    if (!user || !userData) {
      showMessage("error", "User not authenticated");
      return;
    }

    setLoading(true);
    const expPayload = {
      amount: parseFloat(amount),
      category,
      payment_mode: paymentMode,
      description: description.trim(),
      date: selectedDate,
      created_at: new Date().toISOString(),
      created_by: user.id,
      created_by_name: userData.displayName,
    };
    try {
      if (!navigator.onLine) {
        await queueOperation({ type: "expense", payload: expPayload });
        showMessage("success", `✓ ₹${amount} queued (offline)`);
        notifications.info("Expense Queued", `₹${amount} saved offline`);
        setAmount("");
        setDescription("");
        setLoading(false);
        return;
      }
      const { error } = await supabase.from("expenses").insert([expPayload]);
      if (error) {
        if (error.message?.includes("network") || error.message?.includes("fetch") || error.message?.includes("Failed to fetch")) {
          await queueOperation({ type: "expense", payload: expPayload });
          showMessage("success", `✓ ₹${amount} queued (offline)`);
          notifications.info("Expense Queued", `₹${amount} saved offline`);
        } else {
          throw error;
        }
      } else {
        showMessage("success", `✓ ₹${amount} expense saved!`);
        await fetchExpenses();
      }
      setAmount("");
      setDescription("");
    } catch (error) {
      logger.error("Error saving expense:", error);
      let errorMessage = "Failed to save. Try again";
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error) {
        const supaError = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };
        const parts = [supaError.message, supaError.details, supaError.hint]
          .filter(
            (part): part is string =>
              typeof part === "string" && part.length > 0,
          )
          .join(" | ");
        if (parts) {
          errorMessage = supaError.code ? `${supaError.code}: ${parts}` : parts;
        }
      }
      showMessage("error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) {
        let errorText = error.message || "Failed to delete expense";
        if (error.code === "PGRST116") {
          errorText = "Permission denied. You don't have permission to delete expenses.";
        }
        showMessage("error", errorText);
      } else {
        showMessage("success", "✓ Expense deleted");
        fetchExpenses();
      }
    } catch (err) {
      logger.error("Delete error:", err);
      showMessage("error", "Failed to delete. Try again");
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
        logger.error("Error exporting expenses:", error);
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

  const stats = useMemo(() => [
    { label: "Total spent", value: totalExpenses, icon: TrendingUp, color: "text-red-400" },
    { label: "Cash Out", value: totalCash, icon: Wallet, color: "text-orange-400" },
    { label: "Digital Pay", value: totalUPI, icon: CreditCard, color: "text-blue-400" },
  ], [totalExpenses, totalCash, totalUPI]);

  // Custom Premium Loading Component
  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <PremiumLoader icon="flame" message="Analyzing Outflows..." />
      </div>
    );
  }

  if (!user || (userData && !hasPermission("canViewExpenses"))) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md text-center border-white/10 shadow-3xl"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-500/20">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-outfit font-black text-white mb-2 uppercase tracking-tight">Security Restriction</h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            {!user
              ? "Access denied. Please authenticate to view the audit logs."
              : "Administrative clearance required. Please contact system admin."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-inter text-slate-200">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-red-600 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-orange-600 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto p-4 lg:p-12 space-y-12 relative z-10">
        
        {/* Header & Overview */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
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
                  Expense Ledger • {new Date(selectedDate).toLocaleDateString("en-IN", { month: "long", day: "numeric" }).toUpperCase()}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Real-time Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-1 max-w-3xl lg:ml-auto">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                className="glass-card p-5 border-white/5 flex items-center gap-5 hover:border-white/20 transition-all cursor-default"
              >
                <div className={cn("p-3 rounded-xl bg-white/5 shadow-inner group-hover:scale-110 transition-transform", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                  <p className="text-xl font-outfit font-black text-white">{formatINR(stat.value)}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-4 bg-white/5 p-2.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
            {isAdmin && (
              <>
                <button onClick={goToPreviousDay} className="p-3 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90"><ArrowLeft className="w-5 h-5" /></button>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={getCurrentDate()}
                    className="bg-transparent border-none text-sm font-black text-white focus:ring-0 cursor-pointer px-4 text-center hover:text-primary transition-colors"
                  />
                </div>
                <button onClick={goToNextDay} disabled={selectedDate >= getCurrentDate()} className="p-3 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 disabled:opacity-20"><ArrowRight className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </header>

        {/* Global Notifications */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "p-4 rounded-2xl border flex items-center gap-4 shadow-3xl backdrop-blur-2xl max-w-2xl mx-auto",
                messageType === "success" 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-500"
              )}
            >
               <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg", messageType === "success" ? "bg-green-500/20" : "bg-red-500/20")}>
                {messageType === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <p className="font-bold tracking-tight">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Record Asset Entry (Entry Form) */}
          <div className="lg:col-span-5">
            <motion.div 
               initial={{ opacity: 0, x: -30 }} 
               animate={{ opacity: 1, x: 0 }}
               className="glass-card p-10 border-white/10 shadow-[0_0_80px_rgba(239,68,68,0.1)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Receipt className="w-32 h-32" />
              </div>

              <div className="relative z-10 space-y-8">
                <div>
                  <h2 className="text-3xl font-outfit font-black text-white uppercase tracking-tight mb-2">Add Expense</h2>
                  <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Record what you spent</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Amount Entry */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] px-1">Amount (₹)</label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-primary group-focus-within:scale-125 transition-transform">₹</div>
                      <input 
                        type="number" 
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 rounded-3xl py-8 pl-14 pr-8 text-4xl font-outfit font-black text-white focus:outline-none focus:border-red-500/50 focus:bg-white/[0.08] transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Category Grid */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">Category</label>
                      <button 
                         type="button" 
                         onClick={() => { setShowAddCategory(true); setEditingCategory(null); setNewCategoryName(""); setNewCategoryEmoji("📦"); }}
                         className="flex items-center gap-1.5 text-[10px] font-black text-primary hover:text-white transition-colors"
                      >
                         <Plus className="w-3.5 h-3.5" /> NEW
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={cn(
                            "group p-4 rounded-2xl border transition-all text-left relative overflow-hidden",
                            category === cat.value 
                              ? "bg-red-500/20 border-red-500 shadow-xl shadow-red-500/10" 
                              : "bg-white/5 border-white/10 hover:border-white/30"
                          )}
                        >
                          <div className="text-2xl mb-2 grayscale group-hover:grayscale-0 transition-all">{cat.emoji}</div>
                          <p className={cn("text-[11px] font-black uppercase tracking-tighter", category === cat.value ? "text-white" : "text-muted-foreground")}>{cat.label}</p>
                          {category === cat.value && (
                            <motion.div layoutId="active-cat" className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] px-1">Descriptor</label>
                    <div className="relative">
                      <FileText className="absolute left-5 top-5 w-5 h-5 text-muted-foreground opacity-30" />
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Audit notes or vendor details..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white focus:outline-none focus:border-red-500/50 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] px-1">Pay from</label>
                    <div className="flex gap-3">
                       <button 
                        type="button" 
                        onClick={() => setPaymentMode("cash")}
                        className={cn("flex-1 py-5 rounded-2xl border transition-all flex flex-col items-center gap-2", paymentMode === "cash" ? "bg-orange-500/20 border-orange-500 text-orange-400 shadow-xl shadow-orange-500/10" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10")}
                      >
                        <Wallet className="w-6 h-6" />
                        <span className="text-[10px] font-black tracking-widest">CASH</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPaymentMode("upi")}
                        className={cn("flex-1 py-5 rounded-2xl border transition-all flex flex-col items-center gap-2", paymentMode === "upi" ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-xl shadow-blue-500/10" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10")}
                      >
                        <CreditCard className="w-6 h-6" />
                        <span className="text-[10px] font-black tracking-widest">ONLINE</span>
                      </button>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-6 bg-crispy-gradient text-white rounded-3xl font-black text-xl tracking-tight shadow-3xl shadow-red-500/30 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-30 ripple"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 rotate-180" />
                    </div>
                    {loading ? "SAVING..." : "SAVE EXPENSE"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>

          {/* Audit Trail (Expenses List) */}
          <div className="lg:col-span-7 space-y-8">
            {/* List Header & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <h2 className="text-2xl font-outfit font-black text-white uppercase tracking-tight">Expense List</h2>
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">List of everything spent</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setShowExportDateRange(!showExportDateRange)}
                   className={cn("flex-1 sm:flex-none px-5 py-3 rounded-2xl border text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-2", showExportDateRange ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30")}
                >
                  <Calendar className="w-4 h-4" /> SELECT DATES
                </button>
                <button 
                  onClick={handleExportExpenses}
                  className="flex-1 sm:flex-none px-5 py-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-2xl text-[10px] font-black tracking-widest hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> SAVE FILE
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card p-3 border-white/5 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-medium text-white focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative">
                   <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-[10px] font-black text-white hover:border-white/30 transition-all appearance-none cursor-pointer focus:outline-none focus:border-red-500/50"
                  >
                    <option value="all">ALL CLASSES</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <div className="relative">
                  <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value as "all" | "cash" | "upi")}
                    className="bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-[10px] font-black text-white hover:border-white/30 transition-all appearance-none cursor-pointer focus:outline-none focus:border-red-500/50"
                  >
                    <option value="all">ALL MODES</option>
                    <option value="cash">CASH ONLY</option>
                    <option value="upi">DIGITAL ONLY</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Range Picker Overlay */}
            <AnimatePresence>
              {showExportDateRange && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-6 border-blue-500/30 bg-blue-500/5 space-y-4">
                    <div className="flex items-center gap-3 text-blue-400">
                      <Calendar className="w-5 h-5" />
                      <p className="text-sm font-black uppercase tracking-widest">Select Audit Window</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400/60 uppercase px-1">Initial Date</label>
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          max={getCurrentDate()}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-black text-white focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-blue-400/60 uppercase px-1">Terminal Date</label>
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          max={getCurrentDate()}
                          min={exportStartDate}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-black text-white focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Grid */}
            <div className="space-y-4">
              {filteredExpenses.length === 0 ? (
                <motion.div 
                   initial={{ opacity: 0 }} 
                   animate={{ opacity: 1 }}
                   className="py-20 text-center glass-card border-white/5"
                >
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground opacity-20">
                    <Search className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-outfit font-black text-white uppercase tracking-tight">Ledger Empty</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-widest">No authorized outflows detected for this query</p>
                </motion.div>
              ) : (
                <MotionContainer className="grid gap-4">
                  {filteredExpenses.map((expense, idx) => {
                    const cat = categories.find(c => c.value === expense.category);
                    return (
                      <MotionItem
                        key={expense.id}
                        className="glass-card group p-6 border-white/5 flex items-center justify-between gap-6 hover:border-white/20 transition-all cursor-default relative overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-crispy-gradient opacity-0 group-hover:opacity-[0.02] transition-opacity pointer-events-none" />
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 group-hover:-rotate-6 transition-all">
                             {cat?.emoji || "📦"}
                           </div>
                           <div>
                             <div className="flex items-center gap-3 mb-1">
                               <h4 className="text-xl font-outfit font-black text-white">{formatINR(expense.amount)}</h4>
                               <span className={cn(
                                 "px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase",
                                 expense.payment_mode === 'cash' ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                               )}>
                                 {expense.payment_mode === 'cash' ? 'CASH' : 'DIGITAL'}
                               </span>
                             </div>
                             <div className="flex items-center gap-3">
                               <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{expense.description || "Unlabeled Outflow"}</p>
                               <span className="w-1 h-1 rounded-full bg-white/10" />
                               <p className="text-[10px] font-black text-muted-foreground uppercase">{cat?.label || 'General'}</p>
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                             <p className="text-[10px] font-black text-white uppercase tracking-tighter">{expense.created_by_name || "Auth User"}</p>
                             <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">
                               {new Date(expense.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                             </p>
                           </div>
                           <button 
                            onClick={() => handleDelete(expense.id)}
                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform active:scale-90"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </MotionItem>
                    );
                  })}
                </MotionContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Management Modal */}
      <AnimatePresence>
        {showAddCategory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setShowAddCategory(false)}
               className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="glass-card max-w-lg w-full relative z-10 overflow-hidden border-white/10 shadow-[0_0_100px_rgba(239,68,68,0.2)]"
            >
              <div className="p-10 space-y-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-outfit font-black text-white uppercase tracking-tight">Tag Manager</h3>
                    <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Classroom Classification System</p>
                  </div>
                  <button onClick={() => setShowAddCategory(false)} className="p-3 hover:bg-white/10 rounded-xl transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] px-1">Identity</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="TAG NAME"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-xl font-outfit font-black text-white focus:outline-none focus:border-red-500/50 transition-all placeholder:opacity-20"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] px-1">Visual ID</label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                      {["📦", "🚗", "🏪", "📱", "🍽️", "💧", "🔧", "🛍️", "🎓", "💊", "🎬", "🎮", "✈️", "🏋️", "📚", "🎨", "⚡", "👤"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewCategoryEmoji(emoji)}
                          className={cn(
                            "text-2xl p-3 rounded-xl border transition-all hover:scale-110 active:scale-90",
                            newCategoryEmoji === emoji ? "bg-red-500/20 border-red-500 shadow-lg shadow-red-500/10" : "bg-white/5 border-white/10"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 flex items-center justify-between border border-white/5">
                    <div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Live Preview</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">{newCategoryEmoji}</div>
                        <p className="text-xl font-outfit font-black text-white uppercase tracking-tight">{newCategoryName || "TAG NAME"}</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(false)}
                      className="flex-1 py-5 rounded-2xl border border-white/10 text-[11px] font-black tracking-widest text-muted-foreground hover:bg-white/10 transition-all"
                    >
                      ABORT
                    </button>
                    <button
                      type="button"
                      onClick={editingCategory ? handleEditCategory : handleAddCategory}
                      className="flex-1 py-5 bg-crispy-gradient rounded-2xl text-[11px] font-black tracking-widest text-white shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                    >
                      {editingCategory ? "COMMIT" : "EXECUTE"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

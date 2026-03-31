"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Wallet, 
  CreditCard, 
  Clock, 
  Calendar,
  Zap,
  ArrowRight,
  Plus,
  LayoutGrid,
  FileText,
  BadgeAlert,
  ArrowUpRight,
  MoreVertical,
  Target,
  ArrowRightCircle,
  Sparkles,
  Users
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase"
import { logger } from "@/lib/logger";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { formatTime, getCurrentDate } from "@/utils/formatting";
import { formatINR } from "@/lib/currency";
import AnimatedMascot, { MascotMood } from "@/components/AnimatedMascot";
import { cn } from "@/lib/utils";
import PremiumLoader from "@/components/PremiumLoader";

// --- Types ---
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

// --- Helper Components ---
function GlassCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn("glass-card rounded-[2.5rem] border border-white/10 overflow-hidden", className)}
    >
      {children}
    </motion.div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, delay = 0, trend, subtitle }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay }}
      className="glass-card p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-6 group hover:border-white/20 transition-all shadow-2xl"
    >
      <div className={cn("w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", color)}>
        <Icon className="w-8 h-8" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] truncate">{label}</p>
          {trend !== undefined && trend !== 0 && (
             <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0", trend >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
               {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
               {Math.abs(trend).toFixed(1)}%
             </span>
          )}
        </div>
        <p className="text-2xl font-outfit font-black text-white leading-none tracking-tight truncate">{value}</p>
        {(subtitle) && <p className="text-[9px] font-black text-muted-foreground mt-2 uppercase tracking-widest truncate">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const {
    user,
    userData,
    loading: authLoading,
    hasPermission,
    hasAnyPermission,
  } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashReconciliation, setCashReconciliation] =
    useState<CashReconciliation | null>(null);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [cashLoaded, setCashLoaded] = useState(false);
  const [comparativeStats, setComparativeStats] = useState<{
    yesterdaySales: number;
    lastWeekSales: number;
    bestSellers: { item: string; count: number; revenue: number }[];
    peakHours: { hour: string; sales: number; count: number }[];
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [mascotMood, setMascotMood] = useState<MascotMood>("idle");

  const isAdmin = userData?.role === "admin";
  const today = getCurrentDate();

  const isInitialLoad = !salesLoaded || !expensesLoaded || (isAdmin && !cashLoaded);
  const hasNoData = sales.length === 0 && expenses.length === 0;
  const dataLoading = isInitialLoad && hasNoData;

  // Fetch and subscribe to data
  useEffect(() => {
    if (!user || !userData) return;

    const mapSale = (s: any): Sale => ({
      id: s.id,
      amount: s.amount,
      paymentMethod: s.payment_method,
      description: s.description,
      date: s.date,
      createdAt: s.created_at,
      createdBy: s.created_by,
      createdByName: s.created_by_name,
    });

    const mapExpense = (e: any): Expense => ({
      id: e.id,
      amount: e.amount,
      category: e.category,
      paymentMode: e.payment_mode,
      description: e.description,
      date: e.date,
      createdAt: e.created_at,
      createdBy: e.created_by,
      createdByName: e.created_by_name,
    });

    const fetchData = async () => {
      // Sales
      const { data: salesData } = await supabase
        .from("sales")
        .select("*")
        .eq("date", today)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (salesData) setSales(salesData.map(mapSale));
      setSalesLoaded(true);

      // Expenses
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .eq("date", today)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (expensesData) setExpenses(expensesData.map(mapExpense));
      setExpensesLoaded(true);

      // Cash (Admin only)
      if (isAdmin) {
        const { data: cashData } = await supabase
          .from("cash_reconciliation")
          .select("*")
          .eq("date", today)
          .maybeSingle();
        if (cashData) {
          setCashReconciliation({
            id: cashData.id,
            date: cashData.date,
            actualClosingCash: cashData.actual_closing_cash,
            actualClosingUPI: cashData.actual_closing_upi,
            difference: cashData.difference,
            upiDifference: cashData.upi_difference,
          });
        }
        setCashLoaded(true);
      } else {
        setCashLoaded(true);
      }
    };

    fetchData();

    // Subscriptions
    const salesChannel = supabase.channel("dashboard-sales").on("postgres_changes", { event: "*", schema: "public", table: "sales", filter: `date=eq.${today}` }, fetchData).subscribe();
    const expensesChannel = supabase.channel("dashboard-expenses").on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `date=eq.${today}` }, fetchData).subscribe();
    const cashChannel = isAdmin ? supabase.channel("dashboard-cash").on("postgres_changes", { event: "*", schema: "public", table: "cash_reconciliation", filter: `date=eq.${today}` }, fetchData).subscribe() : null;

    return () => {
      salesChannel.unsubscribe();
      expensesChannel.unsubscribe();
      if (cashChannel) cashChannel.unsubscribe();
    };
  }, [user, userData, today, isAdmin]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const cashSales = sales.filter((s) => s.paymentMethod === "cash").reduce((sum, sale) => sum + sale.amount, 0);
    const upiSales = sales.filter((s) => s.paymentMethod === "upi").reduce((sum, sale) => sum + sale.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalSales - totalExpenses;

    return { totalSales, cashSales, upiSales, totalExpenses, netProfit };
  }, [sales, expenses]);

  // Fetch comparative stats
  useEffect(() => {
    if (!user || !userData) return;

    const fetchComparative = async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const { data: yesterdayData } = await supabase.from("sales").select("amount").eq("date", yesterdayStr).is("deleted_at", null);
      const yesterdaySales = yesterdayData?.reduce((sum: number, s: any) => sum + s.amount, 0) || 0;

      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const { data: lastWeekData } = await supabase.from("sales").select("amount, description").gte("date", lastWeekStart.toISOString().split("T")[0]).is("deleted_at", null);
      const lastWeekSales = lastWeekData?.reduce((sum: number, s: any) => sum + s.amount, 0) || 0;

      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      lastWeekData?.forEach((sale: any) => {
        const items = sale.description.split(",").map((i: string) => i.trim());
        items.forEach((item: string) => {
          if (!itemCounts[item]) itemCounts[item] = { count: 0, revenue: 0 };
          itemCounts[item].count++;
          itemCounts[item].revenue += sale.amount / items.length;
        });
      });
      const bestSellers = Object.entries(itemCounts)
        .map(([item, data]: [string, any]) => ({ item, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const hourCounts: Record<string, { sales: number; count: number }> = {};
      sales.forEach((sale: Sale) => {
        const hour = new Date(sale.createdAt).getHours();
        const hourStr = `${hour}:00`;
        if (!hourCounts[hourStr]) hourCounts[hourStr] = { sales: 0, count: 0 };
        hourCounts[hourStr].sales += sale.amount;
        hourCounts[hourStr].count++;
      });
      const peakHours = Object.entries(hourCounts)
        .map(([hour, data]: [string, any]) => ({ hour, sales: data.sales, count: data.count }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 3);

      setComparativeStats({ yesterdaySales, lastWeekSales, bestSellers, peakHours });
    };

    fetchComparative();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, today]);

  // Mascot mood logic
  useEffect(() => {
    if (sales.length > 0) {
      if (stats.totalSales > (comparativeStats?.yesterdaySales || 0)) {
        setMascotMood("success");
      } else {
        setMascotMood("idle");
      }
    }
  }, [sales.length, stats.totalSales, comparativeStats?.yesterdaySales]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#050B18] flex flex-col items-center justify-center gap-6">
        <PremiumLoader icon="bag" message="Synchronizing Shop Intel..." />
      </div>
    );
  }

  if (!user) return null;

  const salesTrend = comparativeStats?.yesterdaySales 
    ? ((stats.totalSales - comparativeStats.yesterdaySales) / comparativeStats.yesterdaySales) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-[#050B18] text-white p-4 lg:p-8 relative overflow-hidden font-inter">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6"
          >
            <div className="w-16 h-16 bg-crispy-gradient rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/20 transform -rotate-6 border border-white/20 text-white overflow-hidden shrink-0">
               <Image
                 src="/logo.png"
                 alt="Logo"
                 width={64}
                 height={64}
                 className="w-full h-full object-cover"
               />
            </div>
            <div>
              <h1 className="text-4xl font-outfit font-black text-white tracking-tight uppercase italic leading-none">Dashboard</h1>
              <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live Shop Intelligence • {new Date().toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
              </p>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{userData?.role || 'Operator'}</p>
                <p className="text-sm font-bold text-white">{userData?.displayName || user?.email}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                <span className="text-xs font-black">{(userData?.displayName || 'U')[0].toUpperCase()}</span>
             </div>
          </div>
        </header>

        {/* Mascot Welcome */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex justify-center md:justify-start pt-4"
        >
           <AnimatedMascot mood={mascotMood} size="sm" className="!items-start !w-auto" />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard 
            icon={ShoppingCart} 
            label="Gross Revenue" 
            value={formatINR(stats.totalSales)} 
            color="text-red-400" 
            trend={salesTrend}
            subtitle={`Cash: ${formatINR(stats.cashSales)} • UPI: ${formatINR(stats.upiSales)}`}
          />
          <SummaryCard 
            icon={Wallet} 
            label="Operating Expenses" 
            value={formatINR(stats.totalExpenses)} 
            color="text-amber-400" 
            subtitle={`${expenses.length} records today`}
          />
          {isAdmin && (
            <SummaryCard 
              icon={TrendingUp} 
              label="Net Earnings" 
              value={formatINR(stats.netProfit)} 
              color={stats.netProfit >= 0 ? "text-green-400" : "text-orange-400"} 
              subtitle={`Margin: ${stats.totalSales > 0 ? ((stats.netProfit / stats.totalSales) * 100).toFixed(1) : 0}%`}
            />
          )}
          {isAdmin && cashReconciliation && (
             <SummaryCard 
               icon={BadgeAlert} 
               label="Cash Audit" 
               value={Math.abs(cashReconciliation.difference) < 1 ? "Balanced" : "Review Req."} 
               color={Math.abs(cashReconciliation.difference) < 1 ? "text-blue-400" : "text-red-400"} 
               subtitle={`Diff: ${formatINR(cashReconciliation.difference)}`}
             />
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Recent Activity Column */}
          <div className="xl:col-span-8 space-y-8">
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-outfit font-black text-white italic tracking-tight uppercase">Recent Terminal Activity</h3>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Latest sales transactions</p>
                </div>
                <Zap className="w-6 h-6 text-red-500 animate-pulse" />
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {sales.slice(0, 5).map((sale) => (
                    <motion.div 
                      key={sale.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                           <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white line-clamp-1">{sale.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[9px] font-black uppercase text-muted-foreground px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                               {sale.paymentMethod}
                             </span>
                             <span className="text-[9px] font-bold text-muted-foreground border-l border-white/10 pl-2">
                               {formatTime(sale.createdAt)}
                             </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-lg font-outfit font-black text-white">{formatINR(sale.amount)}</p>
                    </motion.div>
                  ))}
                  {sales.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground font-bold italic text-sm">No activity recorded today yet...</p>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/sales" className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all text-muted-foreground hover:text-white group">
                 View Full Terminal History
                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </GlassCard>

            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-outfit font-black text-white italic tracking-tight uppercase">Operational Payouts</h3>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Latest business expenses</p>
                </div>
                <CreditCard className="w-6 h-6 text-amber-500" />
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {expenses.slice(0, 5).map((expense) => (
                    <motion.div 
                      key={expense.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                           <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white line-clamp-1">{expense.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[9px] font-black uppercase text-muted-foreground px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                               {expense.category}
                             </span>
                             <span className="text-[9px] font-bold text-muted-foreground border-l border-white/10 pl-2">
                               {formatTime(expense.createdAt)}
                             </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-lg font-outfit font-black text-white">{formatINR(expense.amount)}</p>
                    </motion.div>
                  ))}
                  {expenses.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground font-bold italic text-sm">No expenses recorded today...</p>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/expenses" className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all text-muted-foreground hover:text-white group">
                 Open Expense Registry
                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </GlassCard>
          </div>

          {/* Right Column: Nav & Metrics */}
          <div className="xl:col-span-4 space-y-8">
            <GlassCard className="p-8">
               <h3 className="text-lg font-outfit font-black text-white italic tracking-tight uppercase mb-6">Quick Launch</h3>
               <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Sales", icon: ShoppingCart, href: "/sales", color: "bg-red-500/20 text-red-400" },
                    { label: "Cash", icon: Wallet, href: "/cash", color: "bg-blue-500/20 text-blue-400" },
                    { label: "Expenses", icon: CreditCard, href: "/expenses", color: "bg-amber-500/20 text-amber-400" },
                    { label: "Backup", icon: FileText, href: "/backup", color: "bg-purple-500/20 text-purple-400" },
                  ].map((item) => (
                    <Link key={item.label} href={item.href}>
                      <motion.div 
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center gap-3 hover:bg-white/[0.08] transition-all"
                      >
                         <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg", item.color)}>
                            <item.icon className="w-6 h-6" />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                      </motion.div>
                    </Link>
                  ))}
               </div>
               {isAdmin && (
                 <Link href="/users" className="mt-4 block">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center gap-3 hover:bg-white/[0.08] transition-all group"
                    >
                       <Users className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">User Management</span>
                    </motion.div>
                 </Link>
               )}
            </GlassCard>

            <GlassCard className="p-8">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-outfit font-black text-white italic tracking-tight uppercase">Performance</h3>
                 <Target className="w-5 h-5 text-red-500" />
               </div>

               <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Peak Velocity
                    </p>
                    {comparativeStats?.peakHours.length ? (
                      <div className="space-y-2">
                         {comparativeStats.peakHours.slice(0, 3).map((p) => (
                           <div key={p.hour} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                              <span className="text-[11px] font-bold text-white/70">{p.hour}</span>
                              <span className="text-[11px] font-black text-amber-400">{formatINR(p.sales)}</span>
                           </div>
                         ))}
                      </div>
                    ) : <p className="text-[10px] italic text-muted-foreground">Monitoring...</p>}
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Power Sellers
                    </p>
                    {comparativeStats?.bestSellers.length ? (
                      <div className="space-y-3">
                         {comparativeStats.bestSellers.slice(0, 3).map((s, i) => (
                           <div key={s.item} className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-white/70 truncate max-w-[120px]">{s.item}</span>
                                <span className="text-red-400">{s.count} sold</span>
                              </div>
                              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(s.count / comparativeStats.bestSellers[0].count) * 100}%` }}
                                  className="bg-red-500 h-full rounded-full" 
                                />
                              </div>
                           </div>
                         ))}
                      </div>
                    ) : <p className="text-[10px] italic text-muted-foreground">Analyzing...</p>}
                  </div>
               </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

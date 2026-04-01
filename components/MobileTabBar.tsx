"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CircleDollarSign,
  ReceiptText,
  Wallet,
  BarChart3,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useState, useMemo } from "react";

const tabs = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, permission: "canViewDashboard" as const },
  { name: "Sales", href: "/sales", icon: CircleDollarSign, permission: "canAddSales" as const },
  { name: "Expenses", href: "/expenses", icon: ReceiptText, permission: "canViewExpenses" as const },
  { name: "Cash", href: "/cash", icon: Wallet, permission: "canViewCash" as const },
  { name: "Reports", href: "/reports", icon: BarChart3, permission: "canViewReports" as const },
  { name: "Customers", href: "/customers", icon: Users, permission: "canViewDashboard" as const },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, hasPermission, user, loading } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const visibleTabs = useMemo(() => {
    if (!userData) return tabs.slice(0, 3);
    return tabs.filter((tab) => {
      if (userData.role === "admin") return true;
      return hasPermission(tab.permission);
    });
  }, [userData, hasPermission]);

  const primaryTabs = visibleTabs.slice(0, 4);
  const moreTabs = visibleTabs.slice(4);

  if (!user || loading) return null;
  if (pathname === "/login" || pathname === "/") return null;

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/10" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="relative flex items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
            {primaryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
              return (
                <button
                  key={tab.href}
                  onClick={() => router.push(tab.href)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative",
                    isActive ? "text-white" : "text-white/40"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab-bg"
                      className="absolute inset-0 rounded-xl bg-white/10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive && "text-orange-400")} />
                  <span className={cn("text-[10px] font-bold mt-0.5 relative z-10", isActive && "text-orange-400")}>
                    {tab.name}
                  </span>
                </button>
              );
            })}

            {moreTabs.length > 0 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative",
                  showMore ? "text-white" : "text-white/40"
                )}
              >
                {showMore && (
                  <motion.div
                    layoutId="mobile-tab-bg"
                    className="absolute inset-0 rounded-xl bg-white/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <MoreHorizontal className="w-5 h-5 relative z-10" />
                <span className="text-[10px] font-bold mt-0.5 relative z-10">More</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* More Tabs Sheet */}
      {showMore && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-slate-900 border-t border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-4">More</h3>
              <div className="grid grid-cols-2 gap-3">
                {moreTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.href}
                      onClick={() => { router.push(tab.href); setShowMore(false); }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 active:bg-white/10 transition-colors min-h-[80px]"
                    >
                      <Icon className="w-6 h-6 text-white" />
                      <span className="text-xs font-bold text-white">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  CircleDollarSign, 
  ReceiptText, 
  BarChart3, 
  Wallet, 
  Users, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import { getPendingCount, syncPendingOperations } from "@/lib/offline-queue";
import { notifications } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const navLinks = [
  {
    name: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "staff"],
    permission: "canViewDashboard" as const,
  },
  {
    name: "Sales",
    href: "/sales",
    icon: CircleDollarSign,
    allowedRoles: ["admin", "staff"],
    permission: "canAddSales" as const,
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: ReceiptText,
    allowedRoles: ["admin", "staff"],
    permission: "canViewExpenses" as const,
  },
  {
    name: "Summary",
    href: "/reports",
    icon: BarChart3,
    allowedRoles: ["admin", "staff"],
    permission: "canViewReports" as const,
  },
  {
    name: "Cash",
    href: "/cash",
    icon: Wallet,
    allowedRoles: ["admin", "staff"],
    multiPermission: ["canViewCash", "canDoCashReconciliation"] as const,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    allowedRoles: ["admin", "staff"],
    permission: "canViewDashboard" as const,
  },
  {
    name: "Team",
    href: "/users",
    icon: Users,
    allowedRoles: ["admin"],
    permission: "canManageUsers" as const,
  },
];

export default function Navbar() {
  // - [x] Shared Elements: Add `layoutId` to `BrandLogo.tsx` and `Navbar.tsx`
  const { user, userData, signOut, hasPermission, hasAnyPermission, loading } =
    useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    getPendingCount().then(setPendingCount);
    const interval = setInterval(() => getPendingCount().then(setPendingCount), 5000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleSync = useCallback(async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    try {
      const result = await syncPendingOperations();
      if (result.synced > 0) {
        notifications.success("Sync Complete", `${result.synced} records synced`);
      }
      if (result.failed > 0) {
        notifications.error("Sync Partial", `${result.failed} records failed to sync`);
      }
      const remaining = await getPendingCount();
      setPendingCount(remaining);
    } catch (err) {
      logger.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }, [syncing, isOnline]);

  useEffect(() => {
    if (!isOnline || pendingCount === 0 || syncing) return;
    handleSync();
  }, [isOnline, pendingCount, syncing, handleSync]);

  const visibleLinks = useMemo(() => {
    if (!userData) {
      return navLinks.filter(
        (link) =>
          link.href === "/dashboard" ||
          link.href === "/sales" ||
          link.href === "/expenses",
      );
    }

    return navLinks.filter((link) => {
      if ("multiPermission" in link && link.multiPermission) {
        if (!hasAnyPermission(link.multiPermission as any)) {
          return false;
        }
      } else if ("permission" in link && link.permission) {
        if (!hasPermission(link.permission)) {
          return false;
        }
      }
      return link.allowedRoles.includes(userData.role);
    });
  }, [userData, hasPermission, hasAnyPermission]);

  if (!user || pathname === "/login" || pathname === "/") {
    return null;
  }

  if (loading && !user) {
    return null;
  }

  const handleLogout = async () => {
    // We remove confirm() to prevent browser-level blocking which was causing failure.
    setIsLoggingOut(true);
    try {
      // 1. Perform absolute signOut
      await signOut();
      
      // 2. Add an artificial delay to allow storage/cookies to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Force hard redirect to clear all contexts
      window.location.assign("/login");
    } catch (error) {
      console.error("Logout error in Navbar:", error);
      setIsLoggingOut(false);
      // Failsafe redirect even on error
      window.location.assign("/login");
    }
  };

  if (!mounted) return null;

  return (
    <nav className="sticky top-0 z-50 w-full px-4 py-3 pointer-events-none hidden md:block" suppressHydrationWarning={true}>
      <div className="max-w-7xl mx-auto pointer-events-auto">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-panel rounded-2xl overflow-hidden shadow-2xl border-white/10"
        >
          <div className="px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <Image
                  src="/logo-text.png"
                  alt="Crunchy Time"
                  width={140}
                  height={40}
                  className="h-9 w-auto group-hover:scale-105 transition-transform"
                />
                <span className="premium-brand text-xl hidden sm:block font-outfit uppercase italic tracking-tighter">
                  CRUNCHY TIME
                </span>
              </Link>
              </div>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-1">
                {visibleLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "relative px-4 py-2 rounded-xl text-sm font-medium transition-all group overflow-hidden hover:bg-white/5",
                        isActive ? "text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="active-nav-pill"
                          className="absolute inset-0 bg-crispy-gradient"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                        />
                      )}
                      <div className="relative flex items-center gap-2">
                        <motion.div
                          animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                          className="flex items-center"
                        >
                          <Icon className={cn("w-4 h-4", isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
                        </motion.div>
                        <span>{link.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* User Section & Mobile Toggle */}
              <div className="flex items-center gap-3">
                {mounted && pendingCount > 0 && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                    title={`${pendingCount} pending records`}
                  >
                    <div className={cn("w-2 h-2 rounded-full", syncing ? "bg-amber-400 animate-pulse" : "bg-amber-400")} />
                    <span className="text-xs font-bold hidden sm:inline">{syncing ? "Syncing..." : `${pendingCount} pending`}</span>
                  </button>
                )}
                {mounted && !isOnline && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400" title="Offline">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-xs font-bold hidden sm:inline">Offline</span>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white leading-tight">
                      {userData?.displayName || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-crispy-gradient font-bold uppercase tracking-wider">
                      {userData?.role || "Staff"}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/5 text-white"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:hidden border-t border-white/5 overflow-hidden"
              >
                <div className="p-4 space-y-2">
                  {visibleLinks.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl transition-all",
                          isActive ? "bg-crispy-gradient text-white shadow-lg" : "hover:bg-white/5 text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{link.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </Link>
                    );
                  })}
                  
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-crispy-gradient flex items-center justify-center font-bold text-white shadow-lg">
                        {(userData?.displayName || user?.email)?.[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{userData?.displayName || "User"}</p>
                        <p className="text-xs text-slate-400 capitalize">{userData?.role || "Staff"}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </nav>
  );
}

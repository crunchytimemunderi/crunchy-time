"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

// Define navLinks outside component to avoid recreation
const navLinks = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    allowedRoles: ["admin", "staff"],
    permission: "canViewDashboard" as const,
  },
  {
    name: "Sales",
    href: "/sales",
    icon: "💰",
    allowedRoles: ["admin", "staff"],
    permission: "canAddSales" as const,
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: "📝",
    allowedRoles: ["admin", "staff"],
    permission: "canViewExpenses" as const,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: "📊",
    allowedRoles: ["admin", "staff"],
    permission: "canViewReports" as const,
  },
  {
    name: "Cash",
    href: "/cash",
    icon: "💵",
    allowedRoles: ["admin"],
    permission: "canDoCashReconciliation" as const,
  },
];

export default function Navbar() {
  const { user, userData, signOut, hasPermission, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Calculate visible links - MUST be before early returns (React hooks rules)
  const visibleLinks = useMemo(() => {
    if (!userData) return [];

    return navLinks.filter((link) => {
      // Check permission if defined
      if (link.permission && !hasPermission(link.permission)) {
        return false;
      }
      // Check role
      return link.allowedRoles.includes(userData.role);
    });
  }, [userData, hasPermission]);

  // Don't show navbar on login page or home page
  if (!user || pathname === "/login" || pathname === "/") {
    return null;
  }

  // Wait for userData to load before showing navbar
  if (loading || !userData) {
    return null;
  }

  const isAdmin = userData?.role === "admin";

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;

    setIsLoggingOut(true);
    try {
      await signOut();

      // Use window.location.href for hard redirect to ensure it completes
      // before component unmounts
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <nav
      key={
        userData
          ? `navbar-${userData.username}-${userData.role}`
          : "navbar-loading"
      }
      className="sticky top-0 z-50 backdrop-blur-lg bg-gradient-to-r from-slate-900/95 to-slate-800/95 shadow-2xl border-b border-red-500/20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="CRUNCHY TIME"
                loading="eager"
                className="h-12 w-12 rounded-full object-cover shadow-lg ring-2 ring-red-500 group-hover:ring-orange-500 transition-all"
              />
              <span
                className="text-2xl font-black tracking-wider hidden sm:block transition-all group-hover:scale-105"
                style={{
                  fontFamily:
                    '"Comic Sans MS", "Arial Black", Impact, sans-serif',
                  fontWeight: 900,
                  color: "#FFFFFF",
                  textShadow: `
                    inset 0px -2px 4px rgba(220, 0, 0, 0.8),
                    3px 3px 0px #FF0000,
                    5px 5px 0px #D00000,
                    7px 7px 0px #880000,
                    9px 9px 8px rgba(136, 0, 0, 0.5),
                    -1px -1px 0px #FF0000,
                    1px -1px 0px #FF0000,
                    -1px 1px 0px #FF0000,
                    0px 0px 15px rgba(255, 0, 0, 0.9)
                  `,
                  WebkitTextStroke: "3px #FF0000",
                  paintOrder: "stroke fill",
                  letterSpacing: "0.05em",
                }}
              >
                CRUNCHY TIME
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-2">
            {visibleLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 ${
                    isActive
                      ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/50"
                      : "text-slate-200 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <span className="mr-2 text-lg">{link.icon}</span>
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* User Info & Logout */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <div className="text-right bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
              <p className="text-sm font-semibold text-white">
                {userData?.displayName || user?.email}
              </p>
              <p className="text-xs bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent font-bold capitalize">
                {userData?.role || "User"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-semibold rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transform hover:scale-105"
            >
              {isLoggingOut ? "Logging out..." : "🚪 Logout"}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-slate-200 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            >
              <span className="sr-only">Open menu</span>
              <svg
                className="h-6 w-6 transition-transform duration-300"
                style={{
                  transform: isMenuOpen ? "rotate(90deg)" : "rotate(0)",
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-red-500/20 bg-slate-900/95 backdrop-blur-lg animate-slide-in">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {visibleLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg"
                      : "text-slate-200 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <span className="mr-2 text-lg">{link.icon}</span>
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Mobile User Info */}
          <div className="pt-4 pb-3 border-t border-red-500/20">
            <div className="px-4 mb-3 bg-slate-800/50 rounded-lg p-3 mx-2">
              <p className="text-base font-semibold text-white">
                {userData?.displayName || user.email}
              </p>
              <p className="text-sm bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent font-bold capitalize">
                {userData?.role || "User"}
              </p>
            </div>
            <div className="px-2">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-base font-semibold rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/30"
              >
                {isLoggingOut ? "Logging out..." : "🚪 Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

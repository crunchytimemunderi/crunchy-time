"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { logger } from "@/lib/logger";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "staff";
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  
  // Check if user was previously authenticated - use state to avoid hydration mismatch
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  useEffect(() => {
    setWasAuthenticated(localStorage.getItem('was_authenticated') === 'true');
  }, []);

  useEffect(() => {
    logger.debug(
      `🔍 ProtectedRoute useEffect: loading=${loading}, user=${!!user}, userData=${!!userData}, role=${userData?.role}, requiredRole=${requiredRole}`,
    );

    if (!loading) {
      // Not logged in - redirect to login
      if (!user) {
        logger.debug("🔒 No user - redirecting to login");
        router.push("/login");
        return;
      }

      // If user exists but userData is not loaded yet, wait
      if (user && !userData) {
        logger.debug("⏳ User exists but userData not loaded yet - waiting");
        return;
      }

      // Check role requirement only if userData is available
      if (requiredRole && userData) {
        logger.debug(
          `🔍 Checking role: required=${requiredRole}, actual=${userData.role}`,
        );

        // Admin can access everything
        if (userData.role === "admin") {
          logger.debug("✅ Admin access granted");
          return;
        }

        // Staff can only access staff-level routes
        if (requiredRole === "admin" && userData.role === "staff") {
          logger.debug(
            "❌ Staff trying to access admin page - redirecting to dashboard",
          );
          router.push("/dashboard"); // Redirect staff away from admin pages
          return;
        }
      }
    }
  }, [user, userData, loading, requiredRole, router]);

  // Only show loading on first visit (never authenticated before)
  if (loading && !wasAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content until auth is confirmed (but only on first visit)
  if (!loading && !user && !wasAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <p className="text-slate-300">Redirecting to login...</p>
      </div>
    );
  }

  // Wait for userData to load before rendering (but only on first visit)
  if (user && !userData && loading && !wasAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Check admin role requirement - ONLY after userData has loaded
  if (requiredRole === "admin" && userData && userData.role !== "admin") {
    console.log("❌ Access denied - not an admin");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <p className="text-slate-300">Access denied. Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}

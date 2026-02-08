"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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

  useEffect(() => {
    console.log(
      `🔍 ProtectedRoute useEffect: loading=${loading}, user=${!!user}, userData=${!!userData}, requiredRole=${requiredRole}`,
    );

    if (!loading) {
      // Not logged in - redirect to login
      if (!user) {
        console.log("🔒 No user - redirecting to login");
        router.push("/login");
        return;
      }

      // Check role requirement
      if (requiredRole && userData) {
        console.log(
          `🔍 Checking role: required=${requiredRole}, actual=${userData.role}`,
        );

        // Admin can access everything
        if (userData.role === "admin") {
          console.log("✅ Admin access granted");
          return;
        }

        // Staff can only access staff-level routes
        if (requiredRole === "admin" && userData.role === "staff") {
          console.log(
            "❌ Staff trying to access admin page - redirecting to dashboard",
          );
          router.push("/dashboard"); // Redirect staff away from admin pages
          return;
        }
      }
    }
  }, [user, userData, loading, requiredRole, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content until auth is confirmed
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <p className="text-slate-300">Redirecting to login...</p>
      </div>
    );
  }

  // Wait for userData to load before checking roles
  if (user && !userData) {
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

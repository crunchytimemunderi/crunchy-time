"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { signIn, user } = useAuth();

  // Function to trigger daily backup on login
  const triggerDailyBackup = async () => {
    try {
      // Check if backup already done today
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const lastBackupDate = localStorage.getItem("lastBackupDate");

      if (lastBackupDate === today) {
        console.log("📦 Backup already downloaded today, skipping...");
        return;
      }

      console.log("📥 Triggering daily backup download...");

      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("⚠️ No session found, skipping backup");
        return;
      }

      // Call backup API
      const response = await fetch("/api/cron/daily-backup", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        // Download the file
        const blob = await response.blob();
        const statsHeader = response.headers.get("X-Backup-Stats");

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const fileName = filenameMatch
          ? filenameMatch[1]
          : `CrunchyTime_Backup_${new Date().toISOString().split("T")[0]}.xlsx`;

        // Download to "Crunchy Time Backup" subfolder in Downloads
        a.download = `Crunchy Time Backup/${fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Save today's date to prevent duplicate downloads
        localStorage.setItem("lastBackupDate", today);

        console.log("✅ Daily backup downloaded successfully:", fileName);
        if (statsHeader) {
          const stats = JSON.parse(statsHeader);
          console.log("📊 Backup stats:", stats);
        }
      } else {
        console.log("⚠️ Backup download failed:", response.status);
      }
    } catch (err) {
      console.error("❌ Error downloading backup:", err);
      // Don't block login if backup fails
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Add timeout
    const timeoutId = setTimeout(() => {
      setError(
        "Login is taking too long. Please refresh the page and try again.",
      );
      setLoading(false);
    }, 15000); // 15 second timeout

    try {
      let loginEmail = "";

      // Check if input is an email or username
      if (username.includes("@")) {
        // User entered email - use it directly
        console.log("Attempting login with email:", username);
        loginEmail = username.toLowerCase();
      } else {
        // User entered username - convert to dummy email
        console.log("Attempting login with username:", username);
        const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        loginEmail = `${cleanUsername}@crunchy-times.local`;
      }

      await signIn(loginEmail, password);
      clearTimeout(timeoutId);
      console.log("✅ Login successful, auth state set");

      // Trigger daily backup automatically (non-blocking)
      triggerDailyBackup().catch((err) =>
        console.log("Backup trigger failed:", err),
      );

      // Wait a bit for auth state to update, then redirect
      setTimeout(() => {
        console.log("🔄 Redirecting to dashboard...");
        router.push("/dashboard");
        router.refresh(); // Force refresh to ensure state is updated
      }, 100);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setLoading(false);
      console.error("Login error:", err);
      // Handle different Supabase error codes
      let errorMessage = "Failed to login. Please try again.";

      if (err.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email/username or password.";
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage = "Account not confirmed. Please contact administrator.";
      } else if (err.message?.includes("User data not found")) {
        errorMessage =
          "User data not found. Please ensure your account is set up in the users table.";
      } else if (err.message?.includes("Timeout")) {
        errorMessage =
          "Login timed out. Please check your internet connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="CRUNCHY TIME"
                loading="eager"
                className="h-32 w-32 rounded-full object-cover shadow-2xl"
              />
            </div>
            <h1 className="brand-title text-5xl md:text-6xl mb-4">
              CRUNCHY TIME
            </h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Sign in to your account
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-2"
              >
                Email or Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700"
                placeholder="username or email@example.com"
                required
                disabled={loading}
                autoComplete="username"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your username or email address
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-lg"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-red-600 hover:underline text-sm font-medium"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Development Hint */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <strong>For Development:</strong> Create users in Supabase
              Dashboard
              <br />
              Add user record in &apos;users&apos; table with role column
              <br />
              Admin role: role = &quot;admin&quot; | Staff role: role =
              &quot;staff&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

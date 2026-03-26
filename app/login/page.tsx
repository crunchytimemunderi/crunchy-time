"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const router = useRouter();
  const { signIn, user } = useAuth();

  // Restore lockout state from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("loginLockout");
      if (stored) {
        const { until, attempts } = JSON.parse(stored);
        if (until && until > Date.now()) {
          setLockedUntil(until);
          setLoginAttempts(attempts || MAX_LOGIN_ATTEMPTS);
        } else {
          sessionStorage.removeItem("loginLockout");
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) {
      setLockoutRemaining(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLoginAttempts(0);
        sessionStorage.removeItem("loginLockout");
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Function to trigger daily backup on login
  const triggerDailyBackup = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const lastBackupDate = localStorage.getItem("lastBackupDate");

      if (lastBackupDate === today) {
        logger.debug("📦 Backup already downloaded today, skipping...");
        return;
      }

      logger.debug("📥 Triggering daily backup download...");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        logger.debug("⚠️ No session found, skipping backup");
        return;
      }

      const response = await fetch("/api/cron/daily-backup", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const statsHeader = response.headers.get("X-Backup-Stats");

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const fileName = filenameMatch
          ? filenameMatch[1]
          : `CrunchyTime_Backup_${new Date().toISOString().split("T")[0]}.xlsx`;

        a.download = `Crunchy Time Backup/${fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        localStorage.setItem("lastBackupDate", today);

        logger.debug("✅ Daily backup downloaded successfully:", fileName);
        if (statsHeader) {
          const stats = JSON.parse(statsHeader);
          logger.debug("📊 Backup stats:", stats);
        }
      } else {
        logger.debug("⚠️ Backup download failed:", response.status);
      }
    } catch (err) {
      logger.error("❌ Error downloading backup:", err);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const isLockedOut = lockedUntil !== null && lockedUntil > Date.now();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Check lockout
    if (isLockedOut) {
      const secs = Math.ceil(lockoutRemaining / 1000);
      setError(`Too many failed attempts. Try again in ${secs} seconds.`);
      return;
    }

    setLoading(true);

    const timeoutId = setTimeout(() => {
      setError(
        "Login is taking too long. Please refresh the page and try again.",
      );
      setLoading(false);
    }, 15000);

    try {
      let loginEmail = "";

      if (username.includes("@")) {
        logger.debug("Attempting login with email:", username);
        loginEmail = username.toLowerCase();
      } else {
        logger.debug("Attempting login with username:", username);
        const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        loginEmail = `${cleanUsername}@crunchy-times.local`;
      }

      await signIn(loginEmail, password);
      clearTimeout(timeoutId);
      logger.debug("✅ Login successful, auth state set");

      // Reset attempts on success
      setLoginAttempts(0);
      setLockedUntil(null);
      sessionStorage.removeItem("loginLockout");

      // Trigger daily backup automatically (non-blocking)
      triggerDailyBackup().catch((err) =>
        logger.debug("Backup trigger failed:", err),
      );

      setTimeout(() => {
        logger.debug("🔄 Redirecting to dashboard...");
        router.push("/dashboard");
        router.refresh();
      }, 100);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setLoading(false);
      logger.error("Login error:", err);

      // Increment failed attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockedUntil(until);
        try {
          sessionStorage.setItem(
            "loginLockout",
            JSON.stringify({ until, attempts: newAttempts }),
          );
        } catch {
          // Ignore storage errors
        }
        setError(
          "Too many failed login attempts. Please wait 2 minutes before trying again.",
        );
        return;
      }

      // Build error message with remaining attempts
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
      let errorMessage = "Failed to login. Please try again.";

      if (err.message?.includes("Invalid login credentials")) {
        errorMessage = `Invalid email/username or password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`;
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage = "Account not confirmed. Please contact administrator.";
      } else if (err.message?.includes("User data not found")) {
        errorMessage =
          "User data not found. Please ensure your account is set up in the users table.";
      } else if (err.message?.includes("Timeout")) {
        errorMessage =
          "Login timed out. Please check your internet connection and try again.";
      } else if (err.message) {
        errorMessage = `${err.message} (${remaining} attempt${remaining !== 1 ? "s" : ""} remaining)`;
      }

      setError(errorMessage);
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

          {isLockedOut && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md text-center">
              <p className="text-orange-700 dark:text-orange-400 text-sm font-medium">
                🔒 Account locked for{" "}
                {Math.ceil(lockoutRemaining / 1000)} seconds
              </p>
              <div className="mt-2 w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: `${(lockoutRemaining / LOCKOUT_DURATION_MS) * 100}%`,
                  }}
                />
              </div>
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
                disabled={loading || isLockedOut}
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
                disabled={loading || isLockedOut}
              />
            </div>

            <button
              type="submit"
              disabled={loading || isLockedOut}
              className="w-full bg-red-600 text-white py-3 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-lg"
            >
              {isLockedOut
                ? "🔒 Locked"
                : loading
                  ? "Signing in..."
                  : "Sign In"}
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

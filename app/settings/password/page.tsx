"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

function ChangePasswordContent() {
  const { user, userData } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("error", "Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      showMessage("error", "New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("error", "New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      showMessage(
        "error",
        "New password must be different from current password",
      );
      return;
    }

    try {
      setLoading(true);

      // Verify current password by attempting to re-authenticate
      // Note: This creates a new session temporarily to verify password
      const dummyEmail = `${userData?.username}@crunchy-times.local`;

      // Store current session
      const { data: currentSession } = await supabase.auth.getSession();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: currentPassword,
      });

      if (signInError) {
        showMessage("error", "Current password is incorrect");
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      showMessage("success", "Password successfully changed! ✅");

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      showMessage("error", error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">🔑 Change Password</h1>
          <Link href="/settings" className="text-blue-600 hover:underline">
            ← Back to Settings
          </Link>
        </div>

        {/* User Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {userData?.displayName?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="text-xl font-bold">{userData?.displayName}</h2>
              <p className="text-gray-600 dark:text-gray-400">
                @{userData?.username}
              </p>
              <span
                className={`inline-flex text-xs leading-5 font-semibold rounded-full px-3 py-1 mt-2 ${
                  userData?.role === "admin"
                    ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                    : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                }`}
              >
                {userData?.role === "admin" ? "👑 Admin" : "👤 Staff"}
              </span>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Change Password Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6">Change Your Password</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your current password"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter new password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>💡 Password Requirements:</strong>
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-300 mt-2 space-y-1 ml-4 list-disc">
                <li>Minimum 6 characters</li>
                <li>Must be different from current password</li>
                <li>Both new password fields must match</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Changing Password..." : "🔑 Change Password"}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-2">
            ⚠️ Important Information
          </h3>
          <div className="text-sm text-orange-800 dark:text-orange-300 space-y-1">
            <p>• You will remain logged in after changing your password</p>
            <p>
              • If you forget your password, contact an administrator to reset
              it
            </p>
            <p>
              • Keep your password secure and don&apos;t share it with anyone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <ProtectedRoute>
      <ChangePasswordContent />
    </ProtectedRoute>
  );
}

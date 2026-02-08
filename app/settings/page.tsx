"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

function SettingsContent() {
  const { userData, user } = useAuth();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">⚙️ Settings</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">User Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Name
                </label>
                <p className="font-medium">{userData?.displayName || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Email
                </label>
                <p className="font-medium">
                  {userData?.email || user?.email || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Role
                </label>
                <p className="font-medium capitalize">
                  {userData?.role || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  User ID
                </label>
                <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
                  {user?.id || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">🔒 Security</h2>
            <div className="space-y-4">
              <Link
                href="/settings/password"
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      🔑 Change Password
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Update your account password
                    </p>
                  </div>
                  <span className="text-2xl">→</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Placeholder Settings */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">App Settings</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Additional settings coming soon:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• Notification preferences</li>
              <li>• Currency format</li>
              <li>• Date format</li>
              <li>• Default categories</li>
              <li>• Backup and export</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

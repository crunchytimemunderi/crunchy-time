"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function BackupPage() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerBackup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get current Supabase session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/cron/daily-backup", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Backup failed");
        return;
      }

      // Get stats from headers
      const statsHeader = response.headers.get("X-Backup-Stats");
      const stats = statsHeader ? JSON.parse(statsHeader) : null;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Download to "Crunchy Time Backup" subfolder in Downloads
      const fileName = `CrunchyTime_DailySlip_${stats?.date || new Date().toISOString().split("T")[0]}.xlsx`;
      a.download = `Crunchy Time Backup/${fileName}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setResult({
        success: true,
        message: "Daily Slip backup downloaded successfully",
        fileName: `CrunchyTime_DailySlip_${stats?.date}.xlsx`,
        ...stats,
      });
    } catch (err: any) {
      setError(err.message || "Failed to trigger backup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      {!hasPermission("canViewBackup") ? (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You don&apos;t have permission to access the backup system. Please
              contact an administrator.
            </p>
            <a
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-block transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                💾 Daily Slip Backups
              </h1>
              <p className="text-gray-400">
                Daily Slip backups download automatically when you log in. Use
                this page for manual downloads.
              </p>
            </div>

            {/* Auto Backup Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
                ✨ Automatic Daily Slip Backup on Login
              </h2>
              <div className="space-y-2 text-gray-700">
                <p>
                  <span className="font-medium">📥 Auto-download:</span> Every
                  time you log in, yesterday&apos;s Daily Slip downloads
                  automatically
                </p>
                <p>
                  <span className="font-medium">🔄 Once per day:</span> Only
                  downloads the first time you log in each day
                </p>
                <p>
                  <span className="font-medium">📂 Location:</span> Downloads
                  folder → <strong>Crunchy Time Backup</strong> subfolder
                </p>
                <p>
                  <span className="font-medium">📝 Format:</span> Daily Slip
                  format with opening balances, sales (AIC/CASH), and expenses
                </p>
                <p className="text-sm text-gray-600 mt-3 italic">
                  💡 No setup needed - just log in as usual!
                </p>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📋 Backup Details
              </h2>
              <div className="space-y-2 text-gray-700">
                <p>
                  <span className="font-medium">Content:</span> Yesterday&apos;s
                  Daily Slip with sales and expenses
                </p>
                <p>
                  <span className="font-medium">Format:</span> Excel (.xlsx)
                  with Daily Slip format
                </p>
                <p>
                  <span className="font-medium">Includes:</span> Opening
                  balances, AIC/CASH breakdown, totals
                </p>
                <p>
                  <span className="font-medium">Save Location:</span> Downloads
                  \ Crunchy Time Backup \ [filename].xlsx
                </p>
                <p>
                  <span className="font-medium">Filename:</span>{" "}
                  CrunchyTime_DailySlip_YYYY-MM-DD.xlsx
                </p>
              </div>
            </div>

            {/* Manual Trigger */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📥 Manual Download
              </h2>
              <p className="text-gray-700 mb-4">
                Download a Daily Slip backup manually (if you need it right now
                or missed the auto-download)
              </p>
              <button
                onClick={triggerBackup}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white flex items-center gap-2`}
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generating Backup...
                  </>
                ) : (
                  <>📥 Download Yesterday&apos;s Backup</>
                )}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
                  ✅ Backup Successful!
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p>
                    <span className="font-medium">Date:</span> {result.date}
                  </p>
                  <p>
                    <span className="font-medium">File:</span> {result.fileName}
                  </p>
                  <p>
                    <span className="font-medium">Sales Count:</span>{" "}
                    {result.salesCount}
                  </p>
                  <p>
                    <span className="font-medium">Total Sales:</span> ₹
                    {result.totalSales?.toLocaleString("en-IN")}
                  </p>
                  <p>
                    <span className="font-medium">Expenses Count:</span>{" "}
                    {result.expensesCount}
                  </p>
                  <p>
                    <span className="font-medium">Total Expenses:</span> ₹
                    {result.totalExpenses?.toLocaleString("en-IN")}
                  </p>
                  <p>
                    <span className="font-medium">Net Profit:</span>{" "}
                    <span
                      className={
                        result.profit >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      ₹{result.profit?.toLocaleString("en-IN")}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-red-900 mb-2 flex items-center gap-2">
                  ❌ Download Failed
                </h3>
                <p className="text-red-700">{error}</p>
                <div className="mt-4 text-sm text-gray-600">
                  <p className="font-medium">Common issues:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Not logged in or session expired</li>
                    <li>No data available for the selected date</li>
                    <li>Server error generating Excel file</li>
                  </ul>
                  <p className="mt-3">
                    Try refreshing the page and logging in again.
                  </p>
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                ℹ️ How Automatic Backups Work
              </h3>
              <p className="text-gray-700 mb-3">
                Backups are configured to download automatically when you log
                in:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>✅ Triggers automatically on login</li>
                <li>✅ Downloads only once per day (prevents duplicates)</li>
                <li>✅ Saves to your browser&apos;s Downloads folder</li>
                <li>✅ Non-blocking (doesn&apos;t slow down login)</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <span className="font-medium">💡 Tip:</span> Check your
                browser&apos;s download history or Downloads folder to see all
                backup files.
              </p>
              <p className="text-gray-700 mt-2 text-sm">
                <span className="font-medium">⚙️ Advanced:</span> To reset the
                backup timer and force a new download, clear your browser&apos;s
                localStorage or use the manual download button above.
              </p>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

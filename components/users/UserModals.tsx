"use client";

import { useState } from "react";
import { User, CustomPermissions } from "@/hooks/useUsers";

// ─── Permission definitions ────────────────────────────────────────────────────

const PERMISSIONS = {
  admin: [
    "✅ View Dashboard",
    "✅ Add Sales & Expenses",
    "✅ View All Sales & Expenses",
    "✅ Edit Any Record",
    "✅ Delete Any Record",
    "✅ Cash Reconciliation",
    "✅ Edit Past Reconciliation",
    "✅ View Inventory",
    "✅ Manage Inventory",
    "✅ User Management",
    "✅ Full System Access",
  ],
  staff: [
    "✅ View Dashboard",
    "✅ Add Sales & Expenses",
    "✅ View Own Records",
    "❌ Edit Past Reconciliation",
    "❌ Delete Records",
    "❌ Manage Inventory",
    "❌ User Management",
    "❌ Edit Other Users' Data",
  ],
};

const EDITABLE_PERMISSIONS = [
  { key: "canViewDashboard", label: "View Dashboard", defaultAdmin: true, defaultStaff: true },
  { key: "canAddSales", label: "Add Sales", defaultAdmin: true, defaultStaff: true },
  { key: "canAddExpenses", label: "Add Expenses", defaultAdmin: true, defaultStaff: true },
  { key: "canViewReports", label: "View Reports Page", defaultAdmin: true, defaultStaff: false },
  { key: "canViewExpenses", label: "View Expenses Page", defaultAdmin: true, defaultStaff: true },
  { key: "canViewAllSales", label: "View All Sales", defaultAdmin: true, defaultStaff: false },
  { key: "canViewAllExpenses", label: "View All Expenses", defaultAdmin: true, defaultStaff: false },
  { key: "canEditRecords", label: "Edit Records", defaultAdmin: true, defaultStaff: false },
  { key: "canDeleteRecords", label: "Delete Records", defaultAdmin: true, defaultStaff: false },
  { key: "canViewCash", label: "View Cash Page", defaultAdmin: true, defaultStaff: false },
  { key: "canDoCashReconciliation", label: "Do Cash Reconciliation", defaultAdmin: true, defaultStaff: false },
  { key: "canEditPastReconciliation", label: "Edit Past Reconciliation", defaultAdmin: true, defaultStaff: false },
  { key: "canViewPurchases", label: "View Purchase Register", defaultAdmin: true, defaultStaff: false },
  { key: "canAddPurchases", label: "Add Purchases", defaultAdmin: true, defaultStaff: false },
  { key: "canManagePurchases", label: "Edit/Delete Purchases", defaultAdmin: true, defaultStaff: false },
  { key: "canViewBackup", label: "View Backup Page", defaultAdmin: true, defaultStaff: false },
  { key: "canDownloadBackup", label: "Download Backups", defaultAdmin: true, defaultStaff: false },
  { key: "canManageUsers", label: "User Management", defaultAdmin: true, defaultStaff: false },
];

// ─── View Permissions Modal ───────────────────────────────────────────────────

interface ViewPermissionsModalProps {
  role: "admin" | "staff";
  onClose: () => void;
}

export function ViewPermissionsModal({ role, onClose }: ViewPermissionsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {role === "admin" ? "👑 Admin Permissions" : "👤 Staff Permissions"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {PERMISSIONS[role].map((permission, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                permission.startsWith("✅")
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  permission.startsWith("✅")
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {permission}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Edit Permissions Modal ───────────────────────────────────────────────────

interface EditPermissionsModalProps {
  user: User;
  onSave: (permissions: CustomPermissions) => void;
  onReset: () => void;
  onClose: () => void;
}

export function EditPermissionsModal({
  user,
  onSave,
  onReset,
  onClose,
}: EditPermissionsModalProps) {
  // Initialise with role defaults, overlaid by existing custom permissions
  const buildInitialPermissions = (): CustomPermissions => {
    const defaults: CustomPermissions = {};
    EDITABLE_PERMISSIONS.forEach((perm) => {
      defaults[perm.key as keyof CustomPermissions] =
        user.role === "admin" ? perm.defaultAdmin : perm.defaultStaff;
    });
    if (user.custom_permissions) Object.assign(defaults, user.custom_permissions);
    return defaults;
  };

  const [permissions, setPermissions] = useState<CustomPermissions>(
    buildInitialPermissions
  );

  const toggle = (key: keyof CustomPermissions) =>
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              ✏️ Edit Permissions: {user.display_name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Role: {user.role === "admin" ? "👑 Admin" : "👤 Staff"}
              {user.custom_permissions && (
                <span className="ml-2 text-purple-600 dark:text-purple-400 font-medium">
                  (Custom Permissions Active)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>💡 Tip:</strong> Customise permissions per user. Click
            &quot;Reset to Defaults&quot; to remove custom settings.
          </p>
        </div>

        <div className="space-y-3">
          {EDITABLE_PERMISSIONS.map((perm) => {
            const isEnabled = permissions[perm.key as keyof CustomPermissions];
            const defaultValue =
              user.role === "admin" ? perm.defaultAdmin : perm.defaultStaff;
            const hasCustom =
              user.custom_permissions?.[perm.key as keyof CustomPermissions] !==
              undefined;

            return (
              <div
                key={perm.key}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isEnabled
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={perm.label}
                    checked={isEnabled || false}
                    onChange={() => toggle(perm.key as keyof CustomPermissions)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <label
                      className={`font-medium cursor-pointer ${
                        isEnabled
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {isEnabled ? "✅" : "❌"} {perm.label}
                    </label>
                    {hasCustom && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                        Modified
                      </span>
                    )}
                    {!hasCustom && defaultValue !== isEnabled && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Default: {defaultValue ? "✅" : "❌"})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(permissions)}
            className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700"
          >
            💾 Save Permissions
          </button>
          <button
            onClick={onReset}
            className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600"
          >
            🔄 Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create User Modal ─────────────────────────────────────────────────────────

interface CreateUserModalProps {
  onSubmit: (payload: {
    username: string;
    password: string;
    display_name: string;
    role: "admin" | "staff";
  }) => Promise<void>;
  onClose: () => void;
}

export function CreateUserModal({ onSubmit, onClose }: CreateUserModalProps) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    display_name: "",
    role: "staff" as "admin" | "staff",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(form);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      if (msg.includes("rate limit") || msg.includes("Email rate limit")) {
        setError(
          "⚠️ Email rate limit exceeded! Disable email confirmations in Supabase Dashboard: Authentication → Settings → Email Auth → UNCHECK 'Enable email confirmations'"
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">➕ Create New User</h2>

        <div className="mb-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <p className="text-xs text-orange-800 dark:text-orange-300">
            <strong>⚠️ Getting &quot;Email rate limit exceeded&quot; error?</strong>
            <br />
            Disable email confirmations in Supabase Dashboard:
            <br />
            Authentication → Settings → Email Auth → UNCHECK &quot;Enable email
            confirmations&quot;
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm({
                  ...form,
                  username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              placeholder="john_doe"
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9_]+"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lowercase letters, numbers, and underscores only (min 3 chars)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              aria-label="New user role"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "admin" | "staff" })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="staff">👤 Staff</option>
              <option value="admin">👑 Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {form.role === "admin"
                ? "Full access to all features"
                : "Limited access – can add sales/expenses only"}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

interface ResetPasswordModalProps {
  user: User;
  onSave: (newPassword: string) => Promise<void>;
  onClose: () => void;
}

export function ResetPasswordModal({ user, onSave, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      setSubmitting(true);
      await onSave(password);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to reset password"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">
          🔑 Reset Password: {user.display_name}
        </h2>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800 dark:text-orange-300">
            <strong>⚠️ Warning:</strong> The user will need to use this new
            password to login.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">New Password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-orange-500"
            placeholder="Minimum 6 characters"
            minLength={6}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the new password for this user
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
          >
            {submitting ? "Resetting..." : "🔑 Reset Password"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

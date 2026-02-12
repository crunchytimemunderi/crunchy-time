"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: "admin" | "staff";
  created_at: string;
  custom_permissions?: CustomPermissions | null;
}

interface CustomPermissions {
  canViewDashboard?: boolean;
  canAddSales?: boolean;
  canAddExpenses?: boolean;
  canViewReports?: boolean;
  canViewExpenses?: boolean;
  canViewAllSales?: boolean;
  canViewAllExpenses?: boolean;
  canEditRecords?: boolean;
  canDeleteRecords?: boolean;
  canViewCash?: boolean;
  canDoCashReconciliation?: boolean;
  canEditPastReconciliation?: boolean;
  canViewPurchases?: boolean;
  canAddPurchases?: boolean;
  canManagePurchases?: boolean;
  canViewBackup?: boolean;
  canDownloadBackup?: boolean;
  canManageUsers?: boolean;
}

// Permission definitions for each role
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

// Editable permission list with keys
const EDITABLE_PERMISSIONS = [
  {
    key: "canViewDashboard",
    label: "View Dashboard",
    defaultAdmin: true,
    defaultStaff: true,
  },
  {
    key: "canAddSales",
    label: "Add Sales",
    defaultAdmin: true,
    defaultStaff: true,
  },
  {
    key: "canAddExpenses",
    label: "Add Expenses",
    defaultAdmin: true,
    defaultStaff: true,
  },
  {
    key: "canViewReports",
    label: "View Reports Page",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canViewExpenses",
    label: "View Expenses Page",
    defaultAdmin: true,
    defaultStaff: true,
  },
  {
    key: "canViewAllSales",
    label: "View All Sales",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canViewAllExpenses",
    label: "View All Expenses",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canEditRecords",
    label: "Edit Records",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canDeleteRecords",
    label: "Delete Records",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canViewCash",
    label: "View Cash Page",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canDoCashReconciliation",
    label: "Do Cash Reconciliation",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canEditPastReconciliation",
    label: "Edit Past Reconciliation",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canViewPurchases",
    label: "View Purchase Register",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canAddPurchases",
    label: "Add Purchases",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canManagePurchases",
    label: "Edit/Delete Purchases",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canViewBackup",
    label: "View Backup Page",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canDownloadBackup",
    label: "Download Backups",
    defaultAdmin: true,
    defaultStaff: false,
  },
  {
    key: "canManageUsers",
    label: "User Management",
    defaultAdmin: true,
    defaultStaff: false,
  },
];

function UsersContent() {
  const { user: currentUser, userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<
    "admin" | "staff" | null
  >(null);
  const [showEditPermissionsModal, setShowEditPermissionsModal] =
    useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] =
    useState<User | null>(null);
  const [customPermissions, setCustomPermissions] = useState<CustomPermissions>(
    {},
  );
  const [creatingUser, setCreatingUser] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    display_name: "",
    role: "staff" as "admin" | "staff",
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = useCallback(
    (type: "success" | "error", text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 5000);
    },
    [setMessage],
  );

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(
        (data || []).map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          display_name: u.display_name,
          role: u.role,
          created_at: u.created_at,
          custom_permissions: u.custom_permissions,
        })),
      );
    } catch (error: any) {
      console.error("Error fetching users:", error);
      showMessage("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (currentUser && userData) {
      fetchUsers();
    }
  }, [currentUser, userData, fetchUsers]);

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;

    // Prevent user from changing their own role
    if (editingUser.id === currentUser?.id) {
      showMessage("error", "You cannot change your own role");
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", editingUser.id);

      if (error) throw error;

      showMessage(
        "success",
        `Successfully updated ${editingUser.display_name}'s role to ${newRole}`,
      );
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      showMessage("error", "Failed to update role");
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.username || !newUser.password || !newUser.display_name) {
      showMessage("error", "Please fill in all fields");
      return;
    }

    if (newUser.username.length < 3) {
      showMessage("error", "Username must be at least 3 characters");
      return;
    }

    if (newUser.password.length < 6) {
      showMessage("error", "Password must be at least 6 characters");
      return;
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", newUser.username)
      .single();

    if (existingUser) {
      showMessage("error", "Username already exists. Please choose another.");
      return;
    }

    try {
      setCreatingUser(true);

      // Call API route to create user (won't affect current session)
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          display_name: newUser.display_name,
          role: newUser.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      showMessage(
        "success",
        `Successfully created user! Username: ${newUser.username} | Password: ${newUser.password}`,
      );
      setShowCreateModal(false);
      setNewUser({
        username: "",
        password: "",
        display_name: "",
        role: "staff",
      });

      // Reload users list
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);

      // Handle email rate limit error specifically
      if (
        error.message?.includes("rate limit") ||
        error.message?.includes("Email rate limit exceeded")
      ) {
        showMessage(
          "error",
          "⚠️ Email rate limit exceeded! Please disable email confirmations in Supabase Dashboard: Authentication → Settings → Email Auth → UNCHECK 'Enable email confirmations'",
        );
      } else {
        showMessage("error", error.message || "Failed to create user");
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      showMessage("error", "You cannot delete your own account");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${user.display_name}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      // Delete from users table (auth user will still exist but won't have access)
      const { error } = await supabase.from("users").delete().eq("id", user.id);

      if (error) throw error;

      showMessage("success", `Successfully deleted ${user.display_name}`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      showMessage("error", "Failed to delete user");
    }
  };

  const viewPermissions = (role: "admin" | "staff") => {
    setSelectedUserPermissions(role);
    setShowPermissionsModal(true);
  };

  const handleEditPermissions = (user: User) => {
    setEditingPermissionsUser(user);

    // Initialize with defaults based on role
    const defaults: CustomPermissions = {};
    EDITABLE_PERMISSIONS.forEach((perm) => {
      const defaultValue =
        user.role === "admin" ? perm.defaultAdmin : perm.defaultStaff;
      defaults[perm.key as keyof CustomPermissions] = defaultValue;
    });

    // Override with custom permissions if they exist
    if (user.custom_permissions) {
      Object.assign(defaults, user.custom_permissions);
    }

    setCustomPermissions(defaults);
    setShowEditPermissionsModal(true);
  };

  const handleSaveCustomPermissions = async () => {
    if (!editingPermissionsUser) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ custom_permissions: customPermissions })
        .eq("id", editingPermissionsUser.id);

      if (error) throw error;

      showMessage(
        "success",
        `Successfully updated permissions for ${editingPermissionsUser.display_name}`,
      );
      setShowEditPermissionsModal(false);
      setEditingPermissionsUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      showMessage("error", "Failed to update permissions");
    }
  };

  const handleResetPermissions = async () => {
    if (!editingPermissionsUser) return;

    if (
      !confirm(
        "Reset to default role permissions? This will remove all custom permissions.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ custom_permissions: null })
        .eq("id", editingPermissionsUser.id);

      if (error) throw error;

      showMessage(
        "success",
        `Reset permissions for ${editingPermissionsUser.display_name} to ${editingPermissionsUser.role} defaults`,
      );
      setShowEditPermissionsModal(false);
      setEditingPermissionsUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error resetting permissions:", error);
      showMessage("error", "Failed to reset permissions");
    }
  };

  const togglePermission = (key: keyof CustomPermissions) => {
    setCustomPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setShowPasswordResetModal(true);
  };

  const handleSavePassword = async () => {
    if (!resetPasswordUser) return;

    if (newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters");
      return;
    }

    try {
      // Update password using Supabase Admin API
      const { error } = await supabase.auth.admin.updateUserById(
        resetPasswordUser.id,
        { password: newPassword },
      );

      if (error) throw error;

      showMessage(
        "success",
        `Successfully reset password for ${resetPasswordUser.display_name}. New password: ${newPassword}`,
      );
      setShowPasswordResetModal(false);
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      showMessage(
        "error",
        error.message ||
          "Failed to reset password. Make sure you have admin privileges.",
      );
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold">👥 User Management</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 shadow-lg transition-all"
            >
              ➕ Create New User
            </button>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:underline self-center"
            >
              ← Back to Dashboard
            </Link>
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

        {/* Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold">All Users</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage user roles and permissions
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-4xl mb-2">👥</p>
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium">
                              {user.display_name}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                  (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        @{user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser?.id === user.id ? (
                          <select
                            value={newRole}
                            onChange={(e) =>
                              setNewRole(e.target.value as "admin" | "staff")
                            }
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                          </select>
                        ) : (
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === "admin"
                                ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                                : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            }`}
                          >
                            {user.role === "admin" ? "👑 Admin" : "👤 Staff"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewPermissions(user.role)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                          >
                            View
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleEditPermissions(user)}
                            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium text-sm"
                          >
                            {user.custom_permissions
                              ? "✏️ Edit (Custom)"
                              : "✏️ Edit"}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUser?.id === user.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveRole}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleEditRole(user)}
                              disabled={user.id === currentUser?.id}
                              className={`font-medium ${
                                user.id === currentUser?.id
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              }`}
                            >
                              {user.id === currentUser?.id
                                ? "Cannot edit"
                                : "Edit"}
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
                            >
                              🔑 Reset PW
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ About User Management
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p>
              <strong>Username Login:</strong> Users login with username +
              password (no email required)
            </p>
            <p>
              <strong>Admin:</strong> Full access to all features including user
              management, cash reconciliation, editing/deleting records
            </p>
            <p>
              <strong>Staff:</strong> Can add sales and expenses, view their own
              records
            </p>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">➕ Create New User</h2>

              {/* Email Rate Limit Warning */}
              <div className="mb-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <p className="text-xs text-orange-800 dark:text-orange-300">
                  <strong>
                    ⚠️ Getting &quot;Email rate limit exceeded&quot; error?
                  </strong>
                  <br />
                  Disable email confirmations in Supabase Dashboard:
                  <br />
                  Authentication → Settings → Email Auth → UNCHECK &quot;Enable
                  email confirmations&quot;
                </p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, ""),
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
                    Lowercase letters, numbers, and underscores only (min 3
                    chars)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newUser.display_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, display_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value as "admin" | "staff",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="staff">👤 Staff</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {newUser.role === "admin"
                      ? "Full access to all features"
                      : "Limited access - can add sales/expenses only"}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
                  >
                    {creatingUser ? "Creating..." : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {showPermissionsModal && selectedUserPermissions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {selectedUserPermissions === "admin"
                    ? "👑 Admin Permissions"
                    : "👤 Staff Permissions"}
                </h2>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                {PERMISSIONS[selectedUserPermissions].map(
                  (permission, index) => (
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
                  ),
                )}
              </div>

              <button
                onClick={() => setShowPermissionsModal(false)}
                className="w-full mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Edit Permissions Modal */}
        {showEditPermissionsModal && editingPermissionsUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    ✏️ Edit Permissions: {editingPermissionsUser.display_name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Role:{" "}
                    {editingPermissionsUser.role === "admin"
                      ? "👑 Admin"
                      : "👤 Staff"}
                    {editingPermissionsUser.custom_permissions && (
                      <span className="ml-2 text-purple-600 dark:text-purple-400 font-medium">
                        (Custom Permissions Active)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowEditPermissionsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>💡 Tip:</strong> Customize permissions per user.
                  Unchecked permissions will be denied. Click &quot;Reset to
                  Defaults&quot; to remove custom settings.
                </p>
              </div>

              <div className="space-y-3">
                {EDITABLE_PERMISSIONS.map((perm) => {
                  const isEnabled =
                    customPermissions[perm.key as keyof CustomPermissions];
                  const defaultValue =
                    editingPermissionsUser.role === "admin"
                      ? perm.defaultAdmin
                      : perm.defaultStaff;
                  const isCustom =
                    editingPermissionsUser.custom_permissions?.[
                      perm.key as keyof CustomPermissions
                    ] !== undefined;

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
                          checked={isEnabled || false}
                          onChange={() =>
                            togglePermission(
                              perm.key as keyof CustomPermissions,
                            )
                          }
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
                          {isCustom && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                              Modified
                            </span>
                          )}
                          {!isCustom && defaultValue !== isEnabled && (
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
                  onClick={handleSaveCustomPermissions}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700"
                >
                  💾 Save Permissions
                </button>
                <button
                  onClick={handleResetPermissions}
                  className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600"
                >
                  🔄 Reset to Defaults
                </button>
                <button
                  onClick={() => setShowEditPermissionsModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showPasswordResetModal && resetPasswordUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">
                🔑 Reset Password: {resetPasswordUser.display_name}
              </h2>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  <strong>⚠️ Warning:</strong> The user will need to use this
                  new password to login.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    onClick={handleSavePassword}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700"
                  >
                    🔑 Reset Password
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordResetModal(false);
                      setResetPasswordUser(null);
                      setNewPassword("");
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UsersContent />
    </ProtectedRoute>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useUsers, User, CustomPermissions } from "@/hooks/useUsers";
import { useMessage } from "@/hooks/useMessage";
import { UserTable } from "@/components/users/UserTable";
import {
  CreateUserModal,
  ViewPermissionsModal,
  EditPermissionsModal,
  ResetPasswordModal,
} from "@/components/users/UserModals";

function UsersContent() {
  const { message, messageType, showMessage } = useMessage();

  // Data layer
  const {
    users,
    loading,
    currentUserId,
    updateRole,
    createUser,
    deleteUser,
    savePermissions,
    resetPermissions,
    resetPassword,
  } = useUsers(showMessage);

  // UI state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedPermissionsRole, setSelectedPermissionsRole] = useState<
    "admin" | "staff" | null
  >(null);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    try {
      await updateRole(editingUser.id, newRole);
      showMessage(
        "success",
        `Updated ${editingUser.display_name}'s role to ${newRole}`
      );
    } catch {
      showMessage("error", "Failed to update role");
    } finally {
      setEditingUser(null);
    }
  };

  const handleCreateUser = async (payload: {
    username: string;
    password: string;
    display_name: string;
    role: "admin" | "staff";
  }) => {
    await createUser(payload);
    showMessage(
      "success",
      `Created user! Username: ${payload.username} | Password: ${payload.password}`
    );
  };

  const handleDeleteUser = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to delete ${user.display_name}? This action cannot be undone.`
      )
    )
      return;
    try {
      await deleteUser(user);
      showMessage("success", `Deleted ${user.display_name}`);
    } catch {
      showMessage("error", "Failed to delete user");
    }
  };

  const handleSavePermissions = async (permissions: CustomPermissions) => {
    if (!editingPermissionsUser) return;
    try {
      await savePermissions(editingPermissionsUser.id, permissions);
      showMessage(
        "success",
        `Updated permissions for ${editingPermissionsUser.display_name}`
      );
    } catch {
      showMessage("error", "Failed to update permissions");
    } finally {
      setShowEditPermissionsModal(false);
      setEditingPermissionsUser(null);
    }
  };

  const handleResetPermissions = async () => {
    if (!editingPermissionsUser) return;
    if (
      !confirm(
        "Reset to default role permissions? This will remove all custom permissions."
      )
    )
      return;
    try {
      await resetPermissions(editingPermissionsUser.id);
      showMessage(
        "success",
        `Reset permissions for ${editingPermissionsUser.display_name}`
      );
    } catch {
      showMessage("error", "Failed to reset permissions");
    } finally {
      setShowEditPermissionsModal(false);
      setEditingPermissionsUser(null);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetPasswordUser) return;
    await resetPassword(resetPasswordUser.id, newPassword);
    showMessage(
      "success",
      `Reset password for ${resetPasswordUser.display_name}. New password: ${newPassword}`
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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

        {/* Message Banner */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              messageType === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            }`}
          >
            <p className="font-medium">{message}</p>
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
              <div
                className="text-5xl animate-spin mx-auto mb-4"
                style={{ animationDuration: "1s" }}
              >
                🍗
              </div>
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-4xl mb-2">👥</p>
              <p>No users found</p>
            </div>
          ) : (
            <UserTable
              users={users}
              currentUserId={currentUserId}
              editingUserId={editingUser?.id ?? null}
              newRole={newRole}
              onNewRoleChange={setNewRole}
              onEditRole={handleEditRole}
              onSaveRole={handleSaveRole}
              onCancelEdit={() => setEditingUser(null)}
              onViewPermissions={(role) => {
                setSelectedPermissionsRole(role);
                setShowPermissionsModal(true);
              }}
              onEditPermissions={(user) => {
                setEditingPermissionsUser(user);
                setShowEditPermissionsModal(true);
              }}
              onResetPassword={(user) => {
                setResetPasswordUser(user);
                setShowPasswordResetModal(true);
              }}
              onDeleteUser={handleDeleteUser}
            />
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
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {showCreateModal && (
        <CreateUserModal
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showPermissionsModal && selectedPermissionsRole && (
        <ViewPermissionsModal
          role={selectedPermissionsRole}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedPermissionsRole(null);
          }}
        />
      )}

      {showEditPermissionsModal && editingPermissionsUser && (
        <EditPermissionsModal
          user={editingPermissionsUser}
          onSave={handleSavePermissions}
          onReset={handleResetPermissions}
          onClose={() => {
            setShowEditPermissionsModal(false);
            setEditingPermissionsUser(null);
          }}
        />
      )}

      {showPasswordResetModal && resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onSave={handleResetPassword}
          onClose={() => {
            setShowPasswordResetModal(false);
            setResetPasswordUser(null);
          }}
        />
      )}
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

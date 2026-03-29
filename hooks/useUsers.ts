"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: "admin" | "staff";
  created_at: string;
  custom_permissions?: CustomPermissions | null;
}

export interface CustomPermissions {
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

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  currentUserId: string | undefined;
  fetchUsers: () => Promise<void>;
  updateRole: (userId: string, newRole: "admin" | "staff") => Promise<void>;
  createUser: (payload: {
    username: string;
    password: string;
    display_name: string;
    role: "admin" | "staff";
  }) => Promise<void>;
  deleteUser: (user: User) => Promise<void>;
  savePermissions: (userId: string, permissions: CustomPermissions) => Promise<void>;
  resetPermissions: (userId: string) => Promise<void>;
  resetPassword: (userId: string, newPassword: string) => Promise<void>;
}

/**
 * Data-fetching and mutation hook for the User Management page.
 * Isolates all Supabase calls from the UI layer.
 */
export function useUsers(
  showMessage: (type: "success" | "error", text: string) => void
): UseUsersReturn {
  const { user: currentUser, userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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
        }))
      );
    } catch {
      showMessage("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    if (currentUser && userData) fetchUsers();
  }, [currentUser, userData, fetchUsers]);

  const updateRole = useCallback(
    async (userId: string, newRole: "admin" | "staff") => {
      if (userId === currentUser?.id) {
        showMessage("error", "You cannot change your own role");
        return;
      }
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      await fetchUsers();
    },
    [currentUser?.id, fetchUsers, showMessage]
  );

  const createUser = useCallback(
    async (payload: {
      username: string;
      password: string;
      display_name: string;
      role: "admin" | "staff";
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create user");

      await fetchUsers();
    },
    [fetchUsers]
  );

  const deleteUser = useCallback(
    async (user: User) => {
      if (user.id === currentUser?.id) {
        showMessage("error", "You cannot delete your own account");
        return;
      }
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", user.id);

      if (error) throw error;
      await fetchUsers();
    },
    [currentUser?.id, fetchUsers, showMessage]
  );

  const savePermissions = useCallback(
    async (userId: string, permissions: CustomPermissions) => {
      const { error } = await supabase
        .from("users")
        .update({ custom_permissions: permissions })
        .eq("id", userId);

      if (error) throw error;
      await fetchUsers();
    },
    [fetchUsers]
  );

  const resetPermissions = useCallback(
    async (userId: string) => {
      const { error } = await supabase
        .from("users")
        .update({ custom_permissions: null })
        .eq("id", userId);

      if (error) throw error;
      await fetchUsers();
    },
    [fetchUsers]
  );

  const resetPassword = useCallback(
    async (userId: string, newPassword: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset password");
    },
    []
  );

  return {
    users,
    loading,
    currentUserId: currentUser?.id,
    fetchUsers,
    updateRole,
    createUser,
    deleteUser,
    savePermissions,
    resetPermissions,
    resetPassword,
  };
}

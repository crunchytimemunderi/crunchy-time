"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "staff";

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

interface UserData {
  email: string;
  username: string;
  role: UserRole;
  displayName: string;
  customPermissions?: CustomPermissions | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: UserRole) => boolean;
  hasPermission: (permission: keyof CustomPermissions) => boolean;
  hasAnyPermission: (permissions: (keyof CustomPermissions)[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  // Start with loading true to avoid hydration mismatch
  const [loading, setLoading] = useState(true);

  // Helper to save userData to localStorage
  const saveUserDataToCache = (data: UserData | null) => {
    try {
      if (data) {
        localStorage.setItem("cached_user_data", JSON.stringify(data));
        console.log("💾 userData cached to localStorage");
      }
    } catch (e) {
      console.warn("Failed to cache userData", e);
    }
  };

  // Helper to load userData from localStorage
  const loadUserDataFromCache = (): UserData | null => {
    try {
      const cached = localStorage.getItem("cached_user_data");
      if (cached) {
        const data = JSON.parse(cached) as UserData;
        console.log("📂 Loaded cached userData:", data.role);
        return data;
      }
    } catch (e) {
      console.warn("Failed to load cached userData", e);
    }
    return null;
  };

  // Fetch user data from Supabase users table
  const fetchUserData = async (uid: string): Promise<UserData | null> => {
    try {
      // Increased timeout to 30 seconds for slow connections
      const queryPromise = supabase
        .from("users")
        .select("email, username, role, display_name, custom_permissions")
        .eq("id", uid)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("Query timeout - Check your internet connection")),
          30000, // 30 seconds
        ),
      );

      const { data, error } = (await Promise.race([
        queryPromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        console.error("❌ Database error:", error);
        return null;
      }

      if (!data) {
        console.error("❌ No user found in database for ID:", uid);
        return null;
      }

      return {
        email: data.email,
        username: data.username,
        role: data.role as UserRole,
        displayName: data.display_name,
        customPermissions: data.custom_permissions as CustomPermissions | null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        console.warn(
          "⏰ Database connection slow - This is expected on slower networks. App will continue to work.",
        );
        // Don't throw, just return null to allow offline mode
      } else {
        console.error("❌ Fatal error in fetchUserData:", error);
      }
      return null;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    let mounted = true;

    // Load cached userData immediately if available
    const cachedUserData = loadUserDataFromCache();
    if (cachedUserData) {
      console.log("⚡ Using cached userData while verifying session");
      setUserData(cachedUserData);
    }

    // Force loading off after 40 seconds max (increased for slow connections)
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("⏰ Auth loading timeout reached - proceeding anyway");
        setLoading(false);
      }
    }, 40000);

    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        let userData = null;

        if (session?.user) {
          // Try cache first, then fetch fresh
          userData = cachedUserData || (await fetchUserData(session.user.id));
          if (mounted && userData) {
            setUserData(userData);
            saveUserDataToCache(userData);
            if (userData?.role) {
              document.cookie = `userRole=${userData.role}; path=/; max-age=604800`;
            }
            // Mark that user was authenticated - this persists forever
            try {
              localStorage.setItem("was_authenticated", "true");
            } catch (e) {}
          }
        } else {
          // No session, clear cached data
          if (mounted) {
            setUserData(null);
            try {
              localStorage.removeItem("cached_user_data");
            } catch (e) {}
          }
        }

        // Only set loading to false AFTER userData is loaded
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth error:", err);
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      });

    // Listen for auth changes (sign in/out only)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(
        `🔄 Auth state change: event=${event}, hasSession=${!!session}`,
      );

      if (event === "SIGNED_OUT") {
        console.log("👋 User signed out - clearing all cached data");
        setUser(null);
        setUserData(null);
        setLoading(false);
        document.cookie = "userRole=; path=/; max-age=0";
        // Clear all cached data on sign out
        try {
          localStorage.removeItem("was_authenticated");
          localStorage.removeItem("cached_user_data");
        } catch (e) {}
      } else if (event === "SIGNED_IN" && session?.user) {
        console.log("👍 User signed in, fetching userData");
        setUser(session.user);
        const data = await fetchUserData(session.user.id);
        if (mounted && data) {
          setUserData(data);
          saveUserDataToCache(data);
          console.log(`✅ userData set and cached: role=${data.role}`);
          if (data.role) {
            document.cookie = `userRole=${data.role}; path=/; max-age=604800`;
          }
          // Set the persistent flag
          try {
            localStorage.setItem("was_authenticated", "true");
          } catch (e) {}
          setLoading(false);
        }
      }
      // Ignore TOKEN_REFRESHED and other events - keep existing userData
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Real-time listener for user data changes (permissions, role, etc.)
  useEffect(() => {
    if (!user?.id) return;

    console.log("🔔 Setting up real-time listener for user data changes");

    const channel = supabase
      .channel(`user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("🔄 User data changed, refreshing...", payload.new);

          // Refetch user data
          const freshData = await fetchUserData(user.id);
          if (freshData) {
            setUserData(freshData);
            saveUserDataToCache(freshData);
            console.log("✅ User data refreshed with new permissions/role");

            // Update role cookie
            if (freshData.role) {
              document.cookie = `userRole=${freshData.role}; path=/; max-age=604800`;
            }
          }
        },
      )
      .subscribe();

    return () => {
      console.log("🔕 Cleaning up real-time listener");
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error("No user returned from sign in");
      }

      // Set user state immediately
      setUser(authData.user);

      // Fetch user data with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout fetching user data")),
          10000,
        ),
      );

      const data = (await Promise.race([
        fetchUserData(authData.user.id),
        timeoutPromise,
      ])) as UserData | null;

      if (!data) {
        // Sign out if no user data found
        await supabase.auth.signOut();
        setUser(null);
        throw new Error(
          "User data not found. Please ensure your account is in the users table with a role column.",
        );
      }

      setUserData(data);
      saveUserDataToCache(data);
      setLoading(false);

      // Store role in cookie for middleware
      document.cookie = `userRole=${data.role}; path=/; max-age=604800`; // 7 days
    } catch (error: any) {
      console.error("Sign in error:", error);
      // Clear states on error
      setUser(null);
      setUserData(null);
      setLoading(false);
      document.cookie = "userRole=; path=/; max-age=0";
      try {
        localStorage.removeItem("cached_user_data");
      } catch (e) {}
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear all auth state
      setUser(null);
      setUserData(null);

      // Clear cookie
      document.cookie = "userRole=; path=/; max-age=0";

      // Clear all localStorage items
      try {
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("cached_user_data");
        localStorage.removeItem("was_authenticated");
        console.log("🧹 Cleared all cached auth data");
      } catch (e) {
        console.warn("Failed to clear localStorage", e);
      }
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission: keyof CustomPermissions): boolean => {
    if (!userData) return false;

    // Admin always has all permissions
    if (userData.role === "admin") return true;

    // Check custom permissions if set
    if (
      userData.customPermissions &&
      permission in userData.customPermissions
    ) {
      return userData.customPermissions[permission] === true;
    }

    // Default permissions for staff
    const staffDefaults: CustomPermissions = {
      canViewDashboard: true,
      canAddSales: true,
      canAddExpenses: true,
      canViewReports: false,
      canViewExpenses: true,
      canViewAllSales: false,
      canViewAllExpenses: false,
      canEditRecords: false,
      canDeleteRecords: false,
      canViewCash: false,
      canDoCashReconciliation: false,
      canEditPastReconciliation: false,
      canViewPurchases: false,
      canAddPurchases: false,
      canManagePurchases: false,
      canViewBackup: false,
      canDownloadBackup: false,
      canManageUsers: false,
    };

    return staffDefaults[permission] === true;
  };

  // Check if user has ANY of the specified permissions (OR logic)
  const hasAnyPermission = (
    permissions: (keyof CustomPermissions)[],
  ): boolean => {
    if (!userData) return false;

    // Admin always has all permissions
    if (userData.role === "admin") return true;

    // Check if user has at least one of the permissions
    return permissions.some((permission) => hasPermission(permission));
  };

  // Check if user has required role
  const hasRole = (requiredRole: UserRole): boolean => {
    if (!userData) return false;

    // Admin has access to everything
    if (userData.role === "admin") return true;

    // Staff can only access staff-level features
    return userData.role === requiredRole;
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signOut,
    hasRole,
    hasPermission,
    hasAnyPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

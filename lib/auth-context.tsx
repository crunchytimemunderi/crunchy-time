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
  canDoCashReconciliation?: boolean;
  canEditPastReconciliation?: boolean;
  canViewInventory?: boolean;
  canManageInventory?: boolean;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Check if we have cached auth data to avoid showing loading screen
  const getCachedAuth = () => {
    if (typeof window === 'undefined') return { user: null, userData: null };
    try {
      const cached = sessionStorage.getItem('auth_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only use cache if it's less than 30 seconds old
        if (Date.now() - parsed.timestamp < 30000) {
          return { user: parsed.user, userData: parsed.userData };
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return { user: null, userData: null };
  };

  const cachedAuth = getCachedAuth();
  const [user, setUser] = useState<User | null>(cachedAuth.user);
  const [userData, setUserData] = useState<UserData | null>(cachedAuth.userData);
  // Only show loading if we have no cached data
  const [loading, setLoading] = useState(!cachedAuth.user);

  // Fetch user data from Supabase users table
  const fetchUserData = async (uid: string): Promise<UserData | null> => {
    try {
      const queryPromise = supabase
        .from("users")
        .select("email, username, role, display_name, custom_permissions")
        .eq("id", uid)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Query timeout after 5 seconds")),
          5000,
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
      console.error("❌ Fatal error in fetchUserData:", error);
      return null;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    let mounted = true;

    // Force loading off after 10 seconds max
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 10000);

    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        let userData = null;

        if (session?.user) {
          userData = await fetchUserData(session.user.id);
          if (mounted) {
            setUserData(userData);
            if (userData?.role) {
              document.cookie = `userRole=${userData.role}; path=/; max-age=604800`;
            }
            // Cache auth data for fast loading
            try {
              sessionStorage.setItem('auth_cache', JSON.stringify({
                user: currentUser,
                userData: userData,
                timestamp: Date.now()
              }));
            } catch (e) {
              // Ignore storage errors
            }
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

      if (event === "SIGNED_OUT") {
        setUser(null);
        setUserData(null);
        setLoading(false);
        document.cookie = "userRole=; path=/; max-age=0";
        // Clear auth cache
        try {
          sessionStorage.removeItem('auth_cache');
        } catch (e) {
          // Ignore storage errors
        }
      } else if (event === "SIGNED_IN" && session?.user) {
        setLoading(true);
        setUser(session.user);
        const data = await fetchUserData(session.user.id);
        if (mounted) {
          setUserData(data);
          if (data?.role) {
            document.cookie = `userRole=${data.role}; path=/; max-age=604800`;
          }
          // Cache auth data
          try {
            sessionStorage.setItem('auth_cache', JSON.stringify({
              user: session.user,
              userData: data,
              timestamp: Date.now()
            }));
          } catch (e) {
            // Ignore storage errors
          }
          // Only set loading to false AFTER userData is loaded
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

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

      // Clear localStorage
      localStorage.removeItem("supabase.auth.token");
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
      canDoCashReconciliation: false,
      canEditPastReconciliation: false,
      canViewInventory: false,
      canManageInventory: false,
      canManageUsers: false,
    };

    return staffDefaults[permission] === true;
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

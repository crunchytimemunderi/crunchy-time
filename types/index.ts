// ============================================================
// Shared Types — Single source of truth for all data models
// These match the Supabase database schema (snake_case fields)
// ============================================================

// --- Auth & Users ---

export type UserRole = "admin" | "staff";

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

export interface UserData {
  email: string;
  username: string;
  role: UserRole;
  displayName: string;
  customPermissions?: CustomPermissions | null;
}

// --- Sales ---

export interface Sale {
  id: string;
  amount: number;
  payment_method: "cash" | "upi";
  description: string;
  date: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  deleted_at?: string | null;
}

// --- Menu Items ---

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

// --- Expenses ---

export interface Expense {
  id: string;
  amount: number;
  category: string;
  payment_mode: "cash" | "upi";
  description: string;
  date: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  deleted_at?: string | null;
}

export interface ExpenseCategory {
  value: string;
  label: string;
  emoji: string;
}

// --- Cash Reconciliation ---

export interface CashReconciliation {
  id: string;
  date: string;
  opening_cash: number;
  cash_sales: number;
  cash_expenses: number;
  expected_closing_cash: number;
  actual_closing_cash: number;
  difference: number;
  notes?: string;
  opening_upi: number;
  upi_sales: number;
  upi_expenses: number;
  expected_closing_upi: number;
  actual_closing_upi: number;
  upi_difference: number;
  upi_notes?: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  deleted_at?: string | null;
}

// --- Dashboard-specific (camelCase mapped from DB) ---

export interface DashboardSale {
  id: string;
  amount: number;
  paymentMethod: "cash" | "upi";
  description: string;
  date: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface DashboardExpense {
  id: string;
  amount: number;
  category: string;
  paymentMode: "cash" | "upi";
  description: string;
  date: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface DashboardCashStatus {
  id: string;
  date: string;
  actualClosingCash: number;
  actualClosingUPI: number;
  difference: number;
  upiDifference: number;
}

// --- Message ---

export interface AppMessage {
  type: "success" | "error";
  text: string;
}

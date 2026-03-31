import { supabase } from "@/lib/supabase";

interface Sale {
  payment_method: string;
  amount: number;
}

interface Expense {
  payment_mode: string;
  amount: number;
}

export interface CashValidationResult {
  expectedCash: number;
  expectedUPI: number;
  actualCash: number;
  actualUPI: number;
  cashDifference: number;
  upiDifference: number;
  totalDifference: number;
  isSignificantDifference: boolean;
  suggestions: string[];
}

/**
 * Validate cash reconciliation against actual sales, expenses, and opening balance
 */
export async function validateCashReconciliation(
  date: string,
  actualCash: number,
  actualUPI: number,
): Promise<CashValidationResult> {
  try {
    console.log("🔍 Validating cash reconciliation for date:", date);
    
    // 1. Get Opening Balances (from previous day's actual closing)
    const openingBalances = await getOpeningBalances(date);
    
    // 2. Get all sales for the specified date
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("payment_method, amount")
      .eq("date", date)
      .is("deleted_at", null);

    if (salesError) {
      console.error("❌ Error fetching sales for validation:", salesError);
      throw new Error(`Database error: ${salesError.message}`);
    }

    // 3. Get all expenses for the specified date
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("payment_mode, amount")
      .eq("date", date)
      .is("deleted_at", null);

    if (expensesError) {
      console.error("❌ Error fetching expenses for validation:", expensesError);
      throw new Error(`Database error: ${expensesError.message}`);
    }

    console.log("✅ Data fetched: ", {
      sales: sales?.length || 0,
      expenses: expenses?.length || 0,
      openingCash: openingBalances.cash,
      openingUPI: openingBalances.upi
    });

    // Calculate totals
    let totalSalesCash = 0;
    let totalSalesUPI = 0;
    let totalExpensesCash = 0;
    let totalExpensesUPI = 0;

    (sales || []).forEach((sale: any) => {
      if (sale.payment_method === "cash") totalSalesCash += sale.amount;
      else if (sale.payment_method === "upi") totalSalesUPI += sale.amount;
    });

    (expenses || []).forEach((exp: any) => {
      if (exp.payment_mode === "cash") totalExpensesCash += exp.amount;
      else if (exp.payment_mode === "upi") totalExpensesUPI += exp.amount;
    });
    
    // Expected = Opening + Sales - Expenses
    const expectedCash = openingBalances.cash + totalSalesCash - totalExpensesCash;
    const expectedUPI = openingBalances.upi + totalSalesUPI - totalExpensesUPI;

    console.log("💰 Expected Result:", { expectedCash, expectedUPI });

    // Calculate differences
    const cashDifference = actualCash - expectedCash;
    const upiDifference = actualUPI - expectedUPI;
    const totalDifference = cashDifference + upiDifference;

    // Generate suggestions
    const suggestions: string[] = [];
    const THRESHOLD = 50; // ₹50 threshold

    if (Math.abs(cashDifference) > THRESHOLD) {
      if (cashDifference > 0) {
        suggestions.push(`Cash extra of ₹${Math.abs(cashDifference).toFixed(2)}. Check for unrecorded sales.`);
      } else {
        suggestions.push(`Cash missing of ₹${Math.abs(cashDifference).toFixed(2)}. Check for unrecorded expenses or errors.`);
      }
    }

    if (Math.abs(upiDifference) > THRESHOLD) {
      if (upiDifference > 0) {
        suggestions.push(`UPI extra of ₹${Math.abs(upiDifference).toFixed(2)}. Verify app transactions.`);
      } else {
        suggestions.push(`UPI missing of ₹${Math.abs(upiDifference).toFixed(2)}. Check for failed payments.`);
      }
    }

    if (cashDifference < 0 && upiDifference > 0 && Math.abs(cashDifference) === Math.abs(upiDifference)) {
      suggestions.push("Likely payment method mix-up: A UPI sale recorded as cash or vice versa.");
    }

    if (suggestions.length === 0) {
      suggestions.push("✅ All amounts match expected values!");
    }

    return {
      expectedCash,
      expectedUPI,
      actualCash,
      actualUPI,
      cashDifference,
      upiDifference,
      totalDifference,
      isSignificantDifference: Math.abs(totalDifference) > THRESHOLD,
      suggestions,
    };
  } catch (error: any) {
    console.error("❌ Validation error:", error);
    throw new Error(error.message || "Failed to validate cash reconciliation");
  }
}

/**
 * Get opening balances (previous day's actual closing)
 */
export async function getOpeningBalances(date: string): Promise<{ cash: number; upi: number }> {
  try {
    const { data, error } = await supabase
      .from("cash_reconciliation")
      .select("actual_closing_cash, actual_closing_upi")
      .lt("date", date)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { cash: 0, upi: 0 };
    }

    return {
      cash: data.actual_closing_cash || 0,
      upi: data.actual_closing_upi || 0
    };
  } catch (err) {
    console.error("Error fetching opening balances:", err);
    return { cash: 0, upi: 0 };
  }
}


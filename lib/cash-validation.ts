import { supabase } from "@/lib/supabase";

interface Sale {
  payment_method: string;
  total_amount: number;
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
 * Validate cash reconciliation against actual sales data
 */
export async function validateCashReconciliation(
  date: string,
  actualCash: number,
  actualUPI: number,
): Promise<CashValidationResult> {
  // Get all sales for the specified date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: sales, error } = await supabase
    .from("sales")
    .select("payment_method, total_amount")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) {
    console.error("Error fetching sales:", error);
    throw new Error("Failed to validate cash reconciliation");
  }

  // Calculate expected amounts from sales
  let expectedCash = 0;
  let expectedUPI = 0;

  (sales || []).forEach((sale: Sale) => {
    if (sale.payment_method === "cash") {
      expectedCash += sale.total_amount;
    } else if (sale.payment_method === "upi") {
      expectedUPI += sale.total_amount;
    }
  });

  // Calculate differences
  const cashDifference = actualCash - expectedCash;
  const upiDifference = actualUPI - expectedUPI;
  const totalDifference = cashDifference + upiDifference;

  // Generate suggestions based on differences
  const suggestions: string[] = [];
  const THRESHOLD = 50; // ₹50 threshold for significant difference

  if (Math.abs(cashDifference) > THRESHOLD) {
    if (cashDifference > 0) {
      suggestions.push(
        `Cash excess of ₹${Math.abs(cashDifference).toFixed(2)}. Check for unrecorded sales or counting errors.`,
      );
    } else {
      suggestions.push(
        `Cash shortage of ₹${Math.abs(cashDifference).toFixed(2)}. Verify all sales were recorded and check for theft or misplacement.`,
      );
    }
  }

  if (Math.abs(upiDifference) > THRESHOLD) {
    if (upiDifference > 0) {
      suggestions.push(
        `UPI excess of ₹${Math.abs(upiDifference).toFixed(2)}. Verify all UPI transactions in payment app.`,
      );
    } else {
      suggestions.push(
        `UPI shortage of ₹${Math.abs(upiDifference).toFixed(2)}. Check for failed/pending UPI transactions or recording errors.`,
      );
    }
  }

  if (
    cashDifference < 0 &&
    upiDifference > 0 &&
    Math.abs(cashDifference) === Math.abs(upiDifference)
  ) {
    suggestions.push(
      "Possible payment method mix-up: A UPI sale may have been recorded as cash or vice versa.",
    );
  }

  if (Math.abs(totalDifference) < 10 && suggestions.length === 0) {
    suggestions.push(
      "Small difference likely due to rounding. No action needed.",
    );
  }

  if (suggestions.length === 0 && Math.abs(totalDifference) <= THRESHOLD) {
    suggestions.push(
      "✅ Reconciliation looks good! All amounts match expected values.",
    );
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
}

/**
 * Get opening balance for a given date
 */
export async function getOpeningBalance(date: string): Promise<number> {
  // Get the previous day's closing balance
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayString = previousDay.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cash_reconciliation")
    .select("closing_balance")
    .eq("date", previousDayString)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 0; // No previous balance found
  }

  return data.closing_balance || 0;
}

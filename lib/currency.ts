/**
 * Currency formatting utilities for Indian Rupee (₹)
 */

/**
 * Formats a number as Indian Rupee currency
 * @param amount - The amount to format
 * @returns Formatted string with ₹ symbol (e.g., "₹1,234.50")
 */
export function formatINR(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₹0.00';
  }
  
  return `₹${numAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Parses an INR formatted string to a number
 * @param formattedAmount - String like "₹1,234.50" or "1234.50"
 * @returns Numeric value
 */
export function parseINR(formattedAmount: string): number {
  const cleaned = formattedAmount.replace(/₹|,/g, '').trim();
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

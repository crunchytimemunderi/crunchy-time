/**
 * Daily Slip Export - Combines Sales and Expenses in a single report
 */

interface Sale {
  id: string;
  amount: number;
  payment_method: string;
  description: string;
  date: string;
  created_at: string;
  created_by_name: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  payment_mode: string;
  description: string;
  date: string;
  created_at: string;
  created_by_name: string;
}

interface DailySlipData {
  date: string;
  openingCash: number;
  openingUPI: number;
  cashInHand: number;
  sales: Sale[];
  expenses: Expense[];
}

/**
 * Export Daily Slip in CSV format matching the template
 */
export function exportDailySlip(data: DailySlipData) {
  const { date, openingCash, openingUPI, cashInHand, sales, expenses } = data;

  // Format date for display
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Separate sales by payment method
  const cashSales = sales.filter(s => s.payment_method === 'cash');
  const upiSales = sales.filter(s => s.payment_method === 'upi');
  
  // Separate expenses by payment mode
  const cashExpenses = expenses.filter(e => e.payment_mode === 'cash');
  const upiExpenses = expenses.filter(e => e.payment_mode === 'upi');

  // Calculate totals
  const totalCashSales = cashSales.reduce((sum, s) => sum + s.amount, 0);
  const totalUPISales = upiSales.reduce((sum, s) => sum + s.amount, 0);
  const totalCashExpenses = cashExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalUPIExpenses = upiExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Build CSV rows
  const rows: string[] = [];

  // Header
  rows.push('"CRUNCHY TIME - DAILY SLIP"');
  rows.push('');
  
  // Opening Balance Section
  rows.push(`"OPENING BALANCE :","${openingCash}","","","","","DATE:","${formattedDate}"`);
  rows.push(`"CASH IN HAND :","${cashInHand}"`);
  rows.push(`"AIC OPENING BALANCE","${openingUPI}"`);
  rows.push('');
  
  // Column Headers
  rows.push('"","SALES","","","EXPENSE","","",""');
  rows.push('"SL NO","AIC","CASH","","EXPENSE","AIC","CASH","REMARKS"');
  
  // Determine max rows needed
  const maxRows = Math.max(sales.length, expenses.length);
  
  // Data rows
  let slNo = 1;
  for (let i = 0; i < maxRows; i++) {
    const sale = sales[i];
    const expense = expenses[i];
    
    const saleSlNo = sale ? slNo : '';
    const saleAIC = sale && sale.payment_method === 'upi' ? sale.amount : '';
    const saleCash = sale && sale.payment_method === 'cash' ? sale.amount : '';
    
    const expenseDesc = expense ? getCategoryDisplay(expense.category) : '';
    const expenseAIC = expense && expense.payment_mode === 'upi' ? expense.amount : '';
    const expenseCash = expense && expense.payment_mode === 'cash' ? expense.amount : '';
    const expenseRemarks = expense ? expense.description : '';
    
    const row = `"${saleSlNo}","${saleAIC}","${saleCash}","","${expenseDesc}","${expenseAIC}","${expenseCash}","${expenseRemarks}"`;
    rows.push(row);
    
    if (sale) slNo++;
  }
  
  // Empty rows for spacing
  rows.push('"","","","","","","",""');
  
  // Total row
  rows.push(`"","TOTAL","${totalUPISales}","${totalCashSales}","","${totalUPIExpenses}","${totalCashExpenses}",""`);
  
  // Create CSV content
  const csvContent = rows.join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `Daily_Slip_${date}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get display text for expense category
 */
function getCategoryDisplay(category: string): string {
  const categoryMap: Record<string, string> = {
    'chicken': 'Chicken',
    'oil': 'Oil',
    'masala': 'Masala/Spices',
    'gas': 'Gas',
    'wages': 'Wages/Salary',
    'rent': 'Rent',
    'electricity': 'Electricity',
    'other': 'Other'
  };
  
  return categoryMap[category] || category;
}

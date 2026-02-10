/**
 * Daily Slip Export - Combines Sales and Expenses in a formatted Excel report
 */

import ExcelJS from "exceljs";

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
 * Export Daily Slip in Excel format with formatting
 */
export async function exportDailySlip(data: DailySlipData) {
  const { date, openingCash, openingUPI, cashInHand, sales, expenses } = data;

  // Format date for display
  const dateObj = new Date(date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Calculate totals
  const totalCashSales = sales
    .filter((s) => s.payment_method === "cash")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalUPISales = sales
    .filter((s) => s.payment_method === "upi")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalCashExpenses = expenses
    .filter((e) => e.payment_mode === "cash")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalUPIExpenses = expenses
    .filter((e) => e.payment_mode === "upi")
    .reduce((sum, e) => sum + e.amount, 0);

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Slip");

  // Set column widths
  worksheet.columns = [
    { width: 10 }, // A - SL NO
    { width: 12 }, // B - AIC (Sales)
    { width: 12 }, // C - CASH (Sales)
    { width: 3 }, // D - Separator
    { width: 15 }, // E - EXPENSE
    { width: 12 }, // F - AIC (Expense)
    { width: 12 }, // G - CASH (Expense)
    { width: 20 }, // H - REMARKS
  ];

  // Title Row
  const titleRow = worksheet.addRow(["CRUNCHY TIME - DAILY SLIP"]);
  worksheet.mergeCells("A1:H1");
  titleRow.height = 25;
  titleRow.getCell(1).font = { size: 16, bold: true };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.getCell(1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Empty row
  worksheet.addRow([]);

  // Opening Balance Row (sum of cash + UPI)
  const totalOpeningBalance = openingCash + openingUPI;
  const openingRow = worksheet.addRow([
    "OPENING BALANCE :",
    totalOpeningBalance,
    "",
    "",
    "",
    "",
    "DATE:",
    formattedDate,
  ]);
  openingRow.getCell(1).font = { bold: true };
  openingRow.getCell(7).font = { bold: true };

  // Cash in Hand Row (opening cash amount)
  const cashInHandRow = worksheet.addRow(["CASH IN HAND :", openingCash]);
  cashInHandRow.getCell(1).font = { bold: true };

  // AIC Opening Balance Row (opening UPI amount)
  const aicOpeningRow = worksheet.addRow(["AIC OPENING BALANCE", openingUPI]);
  aicOpeningRow.getCell(1).font = { bold: true };

  // Empty row
  worksheet.addRow([]);

  // Header Row 1: SALES and EXPENSE
  const headerRow1 = worksheet.addRow([
    "",
    "SALES",
    "",
    "",
    "EXPENSE",
    "",
    "",
    "",
  ]);
  worksheet.mergeCells(`B${headerRow1.number}:C${headerRow1.number}`);
  worksheet.mergeCells(`E${headerRow1.number}:G${headerRow1.number}`);

  headerRow1.getCell(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF92D050" }, // Green
  };
  headerRow1.getCell(5).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC000" }, // Orange
  };
  headerRow1.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Header Row 2: Column Names
  const headerRow2 = worksheet.addRow([
    "SL NO",
    "AIC",
    "CASH",
    "",
    "EXPENSE",
    "AIC",
    "CASH",
    "REMARKS",
  ]);
  headerRow2.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Data rows
  const maxRows = Math.max(sales.length, expenses.length);
  let slNo = 1;

  for (let i = 0; i < maxRows; i++) {
    const sale = sales[i];
    const expense = expenses[i];

    const saleSlNo = sale ? slNo : "";
    const saleAIC = sale && sale.payment_method === "upi" ? sale.amount : "";
    const saleCash = sale && sale.payment_method === "cash" ? sale.amount : "";

    const expenseDesc = expense ? getCategoryDisplay(expense.category) : "";
    const expenseAIC =
      expense && expense.payment_mode === "upi" ? expense.amount : "";
    const expenseCash =
      expense && expense.payment_mode === "cash" ? expense.amount : "";
    const expenseRemarks = expense ? expense.description : "";

    const dataRow = worksheet.addRow([
      saleSlNo,
      saleAIC,
      saleCash,
      "",
      expenseDesc,
      expenseAIC,
      expenseCash,
      expenseRemarks,
    ]);

    // Add borders to all cells
    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      // Center align numbers
      if (colNumber !== 5 && colNumber !== 8) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    if (sale) slNo++;
  }

  // Total Row
  const totalRow = worksheet.addRow([
    "TOTAL",
    totalUPISales,
    totalCashSales,
    "",
    "",
    totalUPIExpenses,
    totalCashExpenses,
    "",
  ]);
  totalRow.getCell(1).font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Generate Excel file and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Daily_Slip_${date}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Get display text for expense category
 */
function getCategoryDisplay(category: string): string {
  const categoryMap: Record<string, string> = {
    chicken: "Chicken",
    oil: "Oil",
    masala: "Masala/Spices",
    gas: "Gas",
    wages: "Wages/Salary",
    rent: "Rent",
    electricity: "Electricity",
    other: "Other",
  };

  return categoryMap[category] || category;
}

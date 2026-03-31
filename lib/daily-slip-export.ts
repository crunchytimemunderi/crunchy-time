/**
 * Daily Slip Export - Combines Sales and Expenses in a formatted Excel report
 */

import * as ExcelJS from "exceljs";

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

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Slip");

  // Set column widths
  worksheet.columns = [
    { width: 10 }, { width: 12 }, { width: 12 }, { width: 3 }, 
    { width: 15 }, { width: 12 }, { width: 12 }, { width: 20 },
  ];

  // Title Row
  const titleRow = worksheet.addRow(["CRUNCHY TIME - DAILY SLIP"]);
  worksheet.mergeCells("A1:H1");
  titleRow.height = 25;
  titleRow.getCell(1).font = { size: 16, bold: true };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.getCell(1).border = { 
    top: { style: "thin" }, left: { style: "thin" }, 
    bottom: { style: "thin" }, right: { style: "thin" } 
  };

  worksheet.addRow([]);

  // Header information
  const totalOpeningBalance = openingCash + openingUPI;
  worksheet.addRow(["OPENING BALANCE :", totalOpeningBalance, "", "", "", "", "DATE:", formattedDate]).getCell(1).font = { bold: true };
  worksheet.addRow(["CASH IN HAND :", cashInHand]).getCell(1).font = { bold: true };
  worksheet.addRow(["AIC OPENING BALANCE", openingUPI]).getCell(1).font = { bold: true };

  worksheet.addRow([]);

  // Table Headers
  const headerRow1 = worksheet.addRow(["", "SALES", "", "", "EXPENSE", "", "", ""]);
  worksheet.mergeCells(`B${headerRow1.number}:C${headerRow1.number}`);
  worksheet.mergeCells(`E${headerRow1.number}:G${headerRow1.number}`);
  
  headerRow1.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
  headerRow1.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
  headerRow1.eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  const headerRow2 = worksheet.addRow(["SL NO", "AIC", "CASH", "", "EXPENSE", "AIC", "CASH", "REMARKS"]);
  headerRow2.eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  // Calculate totals
  const totalUPISales = sales.filter(s => s.payment_method === "upi").reduce((sum, s) => sum + s.amount, 0);
  const totalCashSales = sales.filter(s => s.payment_method === "cash").reduce((sum, s) => sum + s.amount, 0);
  const totalUPIExpenses = expenses.filter(e => e.payment_mode === "upi").reduce((sum, e) => sum + e.amount, 0);
  const totalCashExpenses = expenses.filter(e => e.payment_mode === "cash").reduce((sum, e) => sum + e.amount, 0);

  // Data rows
  const maxRows = Math.max(sales.length, expenses.length);
  for (let i = 0; i < maxRows; i++) {
    const sale = sales[i];
    const expense = expenses[i];
    const row = worksheet.addRow([
      sale ? i + 1 : "",
      sale && sale.payment_method === "upi" ? sale.amount : "",
      sale && sale.payment_method === "cash" ? sale.amount : "",
      "",
      expense ? getCategoryDisplay(expense.category) : "",
      expense && expense.payment_mode === "upi" ? expense.amount : "",
      expense && expense.payment_mode === "cash" ? expense.amount : "",
      expense ? expense.description : "",
    ]);
    row.eachCell(cell => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  }

  // Total row
  const totalRow = worksheet.addRow(["TOTAL", totalUPISales, totalCashSales, "", "", totalUPIExpenses, totalCashExpenses, ""]);
  totalRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  // Generation with Force-Save pattern
  const buffer = await workbook.xlsx.writeBuffer();
  if (!buffer || buffer.byteLength === 0) throw new Error("Generated daily slip is empty");

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, "-");
  const fileName = `Daily_Slip_${sanitize(date)}.xlsx`;

  console.log(`[Deep-Fix:DailySlip:Ready] Preparing download: ${fileName}`);

  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = () => {
    const base64data = reader.result as string;
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = base64data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      console.log(`[Deep-Fix:DailySlip:Success] Triggered for ${fileName}`);
    }, 10000);
  };
}

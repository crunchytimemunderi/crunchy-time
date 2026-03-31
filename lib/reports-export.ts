/**
 * Reports Export - Excel and PDF generation for reports
 */

import * as ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Sale {
  id: string;
  amount: number;
  payment_method: string;
  description: string;
  date: string;
  created_by_name: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  payment_mode: string;
  description: string;
  date: string;
  created_by_name: string;
}

interface ReportData {
  dateRange: string;
  startDate: string;
  endDate: string;
  sales: Sale[];
  expenses: Expense[];
  totalSales: number;
  totalExpenses: number;
  profit: number;
  totalCashSales: number;
  totalUPISales: number;
}

/**
 * Export report as Excel file
 */
export async function exportReportAsExcel(data: ReportData) {
  const {
    dateRange,
    startDate,
    endDate,
    sales,
    expenses,
    totalSales,
    totalExpenses,
    profit,
    totalCashSales,
    totalUPISales,
  } = data;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");

  // Set column widths
  worksheet.columns = [
    { width: 5 }, // A - No
    { width: 15 }, // B - Date
    { width: 30 }, // C - Description
    { width: 15 }, // D - Payment
    { width: 15 }, // E - Amount
    { width: 20 }, // F - Created By
  ];

  // Title
  const titleRow = worksheet.addRow(["CRUNCHY TIME - BUSINESS REPORT"]);
  worksheet.mergeCells("A1:F1");
  titleRow.height = 30;
  titleRow.getCell(1).font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };

  // Date Range
  worksheet.addRow([]);
  const dateRangeRow = worksheet.addRow(["Report Period:", dateRange]);
  dateRangeRow.getCell(1).font = { bold: true };
  const datesRow = worksheet.addRow(["From:", startDate, "To:", endDate]);
  datesRow.getCell(1).font = { bold: true };
  datesRow.getCell(3).font = { bold: true };

  // Summary Section
  worksheet.addRow([]);
  const summaryHeaderRow = worksheet.addRow(["SUMMARY"]);
  worksheet.mergeCells(`A${summaryHeaderRow.number}:F${summaryHeaderRow.number}`);
  summaryHeaderRow.getCell(1).font = { size: 14, bold: true };
  summaryHeaderRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };
  summaryHeaderRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const summaryData = [
    ["Total Sales:", totalSales],
    ["  - Cash Sales:", totalCashSales],
    ["  - UPI Sales:", totalUPISales],
    ["Total Expenses:", totalExpenses],
    ["Net Profit:", profit],
  ];

  summaryData.forEach((row) => {
    const label = String(row[0] || "");
    const value = typeof row[1] === "number" && !isNaN(row[1]) ? row[1] : 0;
    const summaryRow = worksheet.addRow([label, value]);
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(2).numFmt = "₹#,##0";
    if (label === "Net Profit:") {
      summaryRow.getCell(2).font = {
        bold: true,
        color: { argb: value >= 0 ? "FF008000" : "FFFF0000" },
      };
    }
  });

  // Sales Section
  worksheet.addRow([]);
  const salesHeaderRow = worksheet.addRow(["SALES TRANSACTIONS"]);
  worksheet.mergeCells(`A${salesHeaderRow.number}:F${salesHeaderRow.number}`);
  salesHeaderRow.height = 25;
  salesHeaderRow.getCell(1).font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  salesHeaderRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF70AD47" },
  };
  salesHeaderRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const salesColHeaderRow = worksheet.addRow(["No.", "Date", "Description", "Payment", "Amount", "Created By"]);
  salesColHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  if (sales.length > 0) {
    sales.forEach((sale, index) => {
      const row = worksheet.addRow([
        index + 1,
        new Date(sale.date).toLocaleDateString("en-GB"),
        sale.description,
        sale.payment_method.toUpperCase(),
        sale.amount,
        sale.created_by_name,
      ]);
      row.eachCell((cell, colNumber) => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        if (colNumber === 5) {
          cell.numFmt = "₹#,##0";
          cell.alignment = { horizontal: "right" };
        }
      });
    });

    const salesTotalRow = worksheet.addRow(["", "", "", "TOTAL", totalSales, ""]);
    salesTotalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      if (colNumber === 5) {
        cell.numFmt = "₹#,##0";
        cell.alignment = { horizontal: "right" };
      }
    });
  } else {
    worksheet.addRow(["", "", "No sales recorded", "", "", ""]);
  }

  // Expenses Section
  worksheet.addRow([]);
  const expensesHeaderRow = worksheet.addRow(["EXPENSES"]);
  worksheet.mergeCells(`A${expensesHeaderRow.number}:F${expensesHeaderRow.number}`);
  expensesHeaderRow.height = 25;
  expensesHeaderRow.getCell(1).font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  expensesHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B6B" } };
  expensesHeaderRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const expensesColHeaderRow = worksheet.addRow(["No.", "Date", "Category", "Payment", "Amount", "Description"]);
  expensesColHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4EC" } };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  if (expenses.length > 0) {
    expenses.forEach((expense, index) => {
      const row = worksheet.addRow([
        index + 1,
        new Date(expense.date).toLocaleDateString("en-GB"),
        expense.category,
        expense.payment_mode.toUpperCase(),
        expense.amount,
        expense.description,
      ]);
      row.eachCell((cell, colNumber) => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        if (colNumber === 5) {
          cell.numFmt = "₹#,##0";
          cell.alignment = { horizontal: "right" };
        }
      });
    });

    const expensesTotalRow = worksheet.addRow(["", "", "", "TOTAL", totalExpenses, ""]);
    expensesTotalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      if (colNumber === 5) {
        cell.numFmt = "₹#,##0";
        cell.alignment = { horizontal: "right" };
      }
    });
  } else {
    worksheet.addRow(["", "", "No expenses recorded", "", "", ""]);
  }

  // Generate and download with Force-Save pattern
  const buffer = await workbook.xlsx.writeBuffer();
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("Generated report is empty");
  }

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, "-");
  const fileName = `Report_${sanitize(startDate)}_to_${sanitize(endDate)}.xlsx`;

  console.log(`[Deep-Fix:Excel:Ready] Preparing download: ${fileName}`);

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
      console.log(`[Deep-Fix:Excel:Success] Download triggered`);
    }, 10000);
  };
}

/**
 * Export report as PDF file
 */
export async function exportReportAsPDF(data: ReportData) {
  const {
    dateRange,
    startDate,
    endDate,
    sales,
    expenses,
    totalSales,
    totalExpenses,
    profit,
    totalCashSales,
    totalUPISales,
  } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFillColor(68, 114, 196);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("CRUNCHY TIME - BUSINESS REPORT", pageWidth / 2, 15, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Report Period:", 14, 35);
  doc.setFont("helvetica", "normal");
  doc.text(dateRange, 50, 35);

  doc.setFont("helvetica", "bold");
  doc.text("From:", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.text(startDate, 30, 42);

  doc.setFont("helvetica", "bold");
  doc.text("To:", 80, 42);
  doc.setFont("helvetica", "normal");
  doc.text(endDate, 92, 42);

  // Summary Section
  doc.setFillColor(217, 225, 242);
  doc.rect(14, 50, pageWidth - 28, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SUMMARY", pageWidth / 2, 56, { align: "center" });

  let yPos = 66;
  doc.setFontSize(11);

  const safeFormat = (val: any) => {
    const num = typeof val === "number" && !isNaN(val) ? val : 0;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const summaryData = [
    ["Total Sales:", safeFormat(totalSales)],
    ["  - Cash Sales:", safeFormat(totalCashSales)],
    ["  - UPI Sales:", safeFormat(totalUPISales)],
    ["Total Expenses:", safeFormat(totalExpenses)],
    ["Net Profit:", safeFormat(profit)],
  ];

  summaryData.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.text(row[0], 20, yPos);
    doc.setFont("helvetica", "normal");
    if (row[0] === "Net Profit:") {
      const isNegative = typeof profit === "number" && profit < 0;
      doc.setTextColor(isNegative ? 255 : 0, isNegative ? 0 : 128, 0);
      doc.setFont("helvetica", "bold");
    }
    doc.text(row[1], 80, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  });

  // Sales Table
  yPos += 5;
  autoTable(doc, {
    startY: yPos,
    head: [["No.", "Date", "Description", "Payment", "Amount"]],
    body: sales.length > 0
      ? sales.map((sale, index) => [
          index + 1,
          new Date(sale.date).toLocaleDateString("en-GB"),
          sale.description,
          sale.payment_method.toUpperCase(),
          safeFormat(sale.amount),
        ])
      : [["", "", "No sales recorded", "", ""]],
    foot: sales.length > 0 ? [["", "", "", "TOTAL", safeFormat(totalSales)]] : [],
    theme: "grid",
    headStyles: { fillColor: [112, 173, 71], fontSize: 10, fontStyle: "bold" },
    footStyles: { fillColor: [226, 239, 218], textColor: [0, 0, 0], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const tableTop = data.cursor?.y || yPos;
      doc.setFillColor(112, 173, 71);
      doc.rect(14, tableTop - 10, pageWidth - 28, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SALES TRANSACTIONS", pageWidth / 2, tableTop - 4, { align: "center" });
      doc.setTextColor(0, 0, 0);
    },
  });

  // Expenses Table
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 30;
  autoTable(doc, {
    startY: finalY + 15,
    head: [["No.", "Date", "Category", "Payment", "Amount"]],
    body: expenses.length > 0
      ? expenses.map((expense, index) => [
          index + 1,
          new Date(expense.date).toLocaleDateString("en-GB"),
          expense.category,
          expense.payment_mode.toUpperCase(),
          safeFormat(expense.amount),
        ])
      : [["", "", "No expenses recorded", "", ""]],
    foot: expenses.length > 0 ? [["", "", "", "TOTAL", safeFormat(totalExpenses)]] : [],
    theme: "grid",
    headStyles: { fillColor: [255, 107, 107], fontSize: 10, fontStyle: "bold" },
    footStyles: { fillColor: [252, 228, 236], textColor: [0, 0, 0], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const tableTop = data.cursor?.y || finalY + 15;
      doc.setFillColor(255, 107, 107);
      doc.rect(14, tableTop - 10, pageWidth - 28, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("EXPENSES", pageWidth / 2, tableTop - 4, { align: "center" });
      doc.setTextColor(0, 0, 0);
    },
  });

  const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, "-");
  const fileName = `Report_${sanitize(startDate)}_to_${sanitize(endDate)}.pdf`;
  console.log(`[Reports:PDF] Deep-Save initiated: ${fileName}`);
  doc.save(fileName);
}

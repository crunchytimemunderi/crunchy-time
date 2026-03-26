/**
 * Google Drive Integration for Daily Backups
 */

import { google } from "googleapis";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { logger } from "@/lib/logger";

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

interface BackupData {
  date: string;
  sales: Sale[];
  expenses: Expense[];
  totalSales: number;
  totalExpenses: number;
  profit: number;
  totalCashSales: number;
  totalUPISales: number;
}

/**
 * Initialize Google Drive client
 */
function getGoogleDriveClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!credentials) {
    throw new Error("Google Service Account credentials not found");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Generate Excel backup file for a specific date
 */
async function generateExcelBackup(data: BackupData): Promise<Buffer> {
  const {
    date,
    sales,
    expenses,
    totalSales,
    totalExpenses,
    profit,
    totalCashSales,
    totalUPISales,
  } = data;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Report");

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
  const titleRow = worksheet.addRow(["CRUNCHY TIME - DAILY BACKUP"]);
  worksheet.mergeCells("A1:F1");
  titleRow.height = 30;
  titleRow.getCell(1).font = {
    size: 18,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  titleRow.getCell(1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Date
  worksheet.addRow([]);
  const dateRow = worksheet.addRow([
    "Date:",
    new Date(date).toLocaleDateString("en-GB"),
  ]);
  dateRow.getCell(1).font = { bold: true };

  // Summary Section
  worksheet.addRow([]);
  const summaryHeaderRow = worksheet.addRow(["SUMMARY"]);
  worksheet.mergeCells(
    `A${summaryHeaderRow.number}:F${summaryHeaderRow.number}`,
  );
  summaryHeaderRow.getCell(1).font = { size: 14, bold: true };
  summaryHeaderRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };
  summaryHeaderRow.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const summaryData = [
    ["Total Sales:", totalSales],
    ["  - Cash Sales:", totalCashSales],
    ["  - UPI Sales:", totalUPISales],
    ["Total Expenses:", totalExpenses],
    ["Net Profit:", profit],
  ];

  summaryData.forEach((row) => {
    const summaryRow = worksheet.addRow([row[0], row[1]]);
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(2).numFmt = "₹#,##0";
    if (row[0] === "Net Profit:") {
      summaryRow.getCell(2).font = {
        bold: true,
        color: { argb: profit >= 0 ? "FF008000" : "FFFF0000" },
      };
    }
  });

  // Sales Section
  worksheet.addRow([]);
  const salesHeaderRow = worksheet.addRow(["SALES TRANSACTIONS"]);
  worksheet.mergeCells(`A${salesHeaderRow.number}:F${salesHeaderRow.number}`);
  salesHeaderRow.height = 25;
  salesHeaderRow.getCell(1).font = {
    size: 14,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  salesHeaderRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF70AD47" },
  };
  salesHeaderRow.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // Sales column headers
  const salesColHeaderRow = worksheet.addRow([
    "No.",
    "Date",
    "Description",
    "Payment",
    "Amount",
    "Created By",
  ]);
  salesColHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2EFDA" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Sales data
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
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNumber === 5) {
          cell.numFmt = "₹#,##0";
          cell.alignment = { horizontal: "right" };
        }
      });
    });

    // Sales total
    const salesTotalRow = worksheet.addRow([
      "",
      "",
      "",
      "TOTAL",
      totalSales,
      "",
    ]);
    salesTotalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
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
  worksheet.mergeCells(
    `A${expensesHeaderRow.number}:F${expensesHeaderRow.number}`,
  );
  expensesHeaderRow.height = 25;
  expensesHeaderRow.getCell(1).font = {
    size: 14,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  expensesHeaderRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF6B6B" },
  };
  expensesHeaderRow.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // Expenses column headers
  const expensesColHeaderRow = worksheet.addRow([
    "No.",
    "Date",
    "Category",
    "Payment",
    "Amount",
    "Description",
  ]);
  expensesColHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFCE4EC" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Expenses data
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
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNumber === 5) {
          cell.numFmt = "₹#,##0";
          cell.alignment = { horizontal: "right" };
        }
      });
    });

    // Expenses total
    const expensesTotalRow = worksheet.addRow([
      "",
      "",
      "",
      "TOTAL",
      totalExpenses,
      "",
    ]);
    expensesTotalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber === 5) {
        cell.numFmt = "₹#,##0";
        cell.alignment = { horizontal: "right" };
      }
    });
  } else {
    worksheet.addRow(["", "", "No expenses recorded", "", "", ""]);
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Upload file to Google Drive
 */
export async function uploadToGoogleDrive(data: BackupData) {
  try {
    const drive = getGoogleDriveClient();
    const buffer = await generateExcelBackup(data);

    const fileName = `CrunchyTime_Backup_${data.date}.xlsx`;

    // Convert buffer to stream
    const stream = Readable.from(buffer);

    logger.debug(
      "📁 Attempting upload to folder:",
      process.env.GOOGLE_DRIVE_FOLDER_ID,
    );

    // Check if we can access the folder
    let parentFolder = null;

    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      try {
        const folderInfo = await drive.files.get({
          fileId: process.env.GOOGLE_DRIVE_FOLDER_ID!,
          fields: "id, name, driveId",
          supportsAllDrives: true,
        });

        logger.debug("📂 Folder accessible:", {
          id: folderInfo.data.id,
          name: folderInfo.data.name,
          driveId: folderInfo.data.driveId || "Not in shared drive",
        });

        parentFolder = [process.env.GOOGLE_DRIVE_FOLDER_ID];
      } catch (e: any) {
        logger.debug(
          "⚠️ Cannot access folder, will upload to service account root",
        );
        logger.debug("Error:", e.message);
      }
    }

    logger.debug(
      "📤 Starting file upload...",
      parentFolder ? "with parent folder" : "to root",
    );

    // Upload file with shared drive support
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        parents: parentFolder || undefined,
      },
      media: {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: stream,
      },
      supportsAllDrives: true,
      supportsTeamDrives: true,
    });

    return {
      success: true,
      fileId: response.data.id,
      fileName: fileName,
    };
  } catch (error: any) {
    logger.error("Error uploading to Google Drive:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

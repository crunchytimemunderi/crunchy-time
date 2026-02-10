/**
 * Daily Backup API Route
 * Scheduled to run at 6am daily via Vercel Cron
 * Backs up yesterday's data to Google Drive
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout

export async function GET(request: NextRequest) {
  try {
    // Check authorization - either CRON_SECRET or authenticated admin user
    const authHeader = request.headers.get("authorization");
    const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const hasAuthToken = authHeader?.startsWith("Bearer ") && !isCronRequest;

    if (!isCronRequest && !hasAuthToken) {
      console.log("❌ No valid authorization header");
      return NextResponse.json(
        { error: "Unauthorized - Missing authorization" },
        { status: 401 },
      );
    }

    if (hasAuthToken) {
      // Manual trigger with Bearer token - verify user is admin
      console.log("========== BACKUP API DEBUG ==========");
      console.log("🔑 Auth token provided, verifying...");

      const token = authHeader!.replace("Bearer ", "");

      // Create Supabase client to verify token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      // Verify the token and get user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.log("❌ Invalid token:", authError?.message);
        return NextResponse.json(
          { error: "Unauthorized - Invalid token" },
          { status: 401 },
        );
      }

      console.log("✅ User authenticated:", user.id);

      // Check if user is admin using service role client
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      console.log("👤 User role:", userData?.role || "not found");

      if (userError || !userData || userData.role !== "admin") {
        console.log("❌ Access denied - not admin");
        return NextResponse.json(
          { error: "Unauthorized - Admin only" },
          { status: 403 },
        );
      }

      console.log("✅✅ Admin access granted! Starting backup...");
      console.log("=====================================");
    }

    // Initialize Supabase client with service role key for data operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Fetch yesterday's sales
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .eq("date", yesterdayStr)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (salesError) throw salesError;

    // Fetch yesterday's expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("*")
      .eq("date", yesterdayStr)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (expensesError) throw expensesError;

    const sales = salesData || [];
    const expenses = expensesData || [];

    // Fetch yesterday's cash reconciliation for opening balances
    const { data: cashRecData } = await supabase
      .from("cash_reconciliation")
      .select("*")
      .eq("date", yesterdayStr)
      .is("deleted_at", null)
      .single();

    const openingCash = cashRecData?.opening_cash || 0;
    const openingUPI = cashRecData?.opening_upi || 0;

    // Calculate totals
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalCashSales = sales
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + s.amount, 0);
    const totalUPISales = sales
      .filter((s) => s.payment_method === "upi")
      .reduce((sum, s) => sum + s.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const profit = totalSales - totalExpenses;

    // Generate Excel backup (Daily Slip format)
    const fileName = `CrunchyTime_DailySlip_${yesterdayStr}.xlsx`;
    const buffer = await generateExcelBackup({
      date: yesterdayStr,
      openingCash,
      openingUPI,
      sales,
      expenses,
      totalSales,
      totalExpenses,
      profit,
      totalCashSales,
      totalUPISales,
    });

    console.log(`✅ Backup generated: ${fileName}`);

    // Return the Excel file for download
    // Convert Buffer to Uint8Array for NextResponsecompat
    const uint8Array = new Uint8Array(buffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Backup-Stats": JSON.stringify({
          date: yesterdayStr,
          totalSales,
          totalExpenses,
          profit,
          salesCount: sales.length,
          expensesCount: expenses.length,
        }),
      },
    });
  } catch (error: any) {
    console.error("Daily backup error:", error);
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * Generate Excel backup file in Daily Slip format
 */
async function generateExcelBackup(data: {
  date: string;
  openingCash: number;
  openingUPI: number;
  sales: any[];
  expenses: any[];
  totalSales: number;
  totalExpenses: number;
  profit: number;
  totalCashSales: number;
  totalUPISales: number;
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Slip");

  // Format date for display
  const dateObj = new Date(data.date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Calculate expense totals
  const totalCashExpenses = data.expenses
    .filter((e) => e.payment_mode === "cash")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalUPIExpenses = data.expenses
    .filter((e) => e.payment_mode === "upi")
    .reduce((sum, e) => sum + e.amount, 0);

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
  const totalOpeningBalance = data.openingCash + data.openingUPI;
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
  const cashInHandRow = worksheet.addRow(["CASH IN HAND :", data.openingCash]);
  cashInHandRow.getCell(1).font = { bold: true };

  // AIC Opening Balance Row (opening UPI amount)
  const aicOpeningRow = worksheet.addRow([
    "AIC OPENING BALANCE",
    data.openingUPI,
  ]);
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
  const maxRows = Math.max(data.sales.length, data.expenses.length);
  let slNo = 1;

  for (let i = 0; i < maxRows; i++) {
    const sale = data.sales[i];
    const expense = data.expenses[i];

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
    data.totalUPISales,
    data.totalCashSales,
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

  return await workbook.xlsx.writeBuffer();
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

// =====================================================
// AUTOMATIC SUPABASE DATA BACKUP TO CSV/EXCEL
// =====================================================
// This script exports all your data to CSV files
// Run manually or schedule it to run automatically
// =====================================================

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Create backups directory if it doesn't exist
const backupDir = path.join(process.cwd(), "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Get current date for filename
const getDateString = () => {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD format
};

// Convert JSON data to CSV
const jsonToCSV = (data: any[]): string => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","), // Header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (value === null || value === undefined) return "";
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(",") ? `"${stringValue}"` : stringValue;
        })
        .join(","),
    ),
  ];

  return csvRows.join("\n");
};

// Backup a single table
const backupTable = async (tableName: string): Promise<void> => {
  console.log(`📦 Backing up ${tableName}...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`❌ Error backing up ${tableName}:`, error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  ${tableName} is empty, skipping...`);
      return;
    }

    const csv = jsonToCSV(data);
    const filename = `${tableName}_${getDateString()}.csv`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, csv, "utf-8");
    console.log(
      `✅ ${tableName} backed up: ${data.length} records → ${filename}`,
    );
  } catch (err) {
    console.error(`❌ Failed to backup ${tableName}:`, err);
  }
};

// Main backup function
const runBackup = async () => {
  console.log("\n🚀 Starting automatic backup...\n");
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`📁 Backup directory: ${backupDir}\n`);

  // List of tables to backup
  const tables = ["sales", "expenses", "cash_reconciliation", "users"];

  // Backup each table
  for (const table of tables) {
    await backupTable(table);
  }

  console.log("\n✅ Backup completed!\n");
  console.log(`📂 Backups saved to: ${backupDir}`);
  console.log("💡 You can open these CSV files in Excel\n");
};

// Run the backup
runBackup().catch((error) => {
  console.error("❌ Backup failed:", error);
  process.exit(1);
});

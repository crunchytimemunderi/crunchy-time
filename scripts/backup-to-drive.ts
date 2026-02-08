// =====================================================
// GOOGLE DRIVE BACKUP UPLOADER
// =====================================================
// This script backs up data to Google Drive automatically
// =====================================================

import { config } from "dotenv";
import { resolve } from "path";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Google Drive setup
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "http://localhost:3000",
);

oauth2Client.setCredentials({
  refresh_token: GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

// Get current date for filename
const getDateString = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

// Convert JSON to CSV
const jsonToCSV = (data: any[]): string => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(",") ? `"${stringValue}"` : stringValue;
        })
        .join(","),
    ),
  ];

  return csvRows.join("\n");
};

// Upload file to Google Drive
const uploadToDrive = async (
  filename: string,
  csvContent: string,
): Promise<void> => {
  try {
    console.log(`📤 Uploading ${filename} to Google Drive...`);

    const fileMetadata = {
      name: filename,
      parents: GOOGLE_DRIVE_FOLDER_ID ? [GOOGLE_DRIVE_FOLDER_ID] : [],
    };

    const media = {
      mimeType: "text/csv",
      body: csvContent,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink",
    });

    console.log(`✅ Uploaded successfully!`);
    console.log(`   Link: ${response.data.webViewLink}`);
  } catch (error: any) {
    console.error(`❌ Failed to upload ${filename}:`, error.message);
    throw error;
  }
};

// Backup a single table and upload to Drive
const backupAndUploadTable = async (tableName: string): Promise<void> => {
  console.log(`\n📦 Backing up ${tableName}...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`❌ Database error for ${tableName}:`, error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  ${tableName} is empty, skipping...`);
      return;
    }

    const csv = jsonToCSV(data);
    const filename = `${tableName}_${getDateString()}.csv`;

    console.log(`✅ Exported ${data.length} records`);

    // Upload to Google Drive
    await uploadToDrive(filename, csv);
  } catch (err: any) {
    console.error(`❌ Failed to backup ${tableName}:`, err.message);
  }
};

// Main backup function
const runDriveBackup = async () => {
  console.log("\n🚀 Starting Google Drive Backup...\n");
  console.log(`📅 Date: ${new Date().toLocaleString()}`);

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    console.error("❌ Google Drive credentials not configured!");
    console.error(
      "Please follow GOOGLE_DRIVE_SETUP.md to set up authentication.",
    );
    process.exit(1);
  }

  console.log("☁️  Connected to Google Drive\n");

  const tables = ["sales", "expenses", "cash_reconciliation", "users"];

  for (const table of tables) {
    await backupAndUploadTable(table);
  }

  console.log("\n✅ Google Drive backup completed!\n");
  console.log("📂 Check your Google Drive folder for the CSV files");
};

// Run the backup
runDriveBackup().catch((error) => {
  console.error("❌ Backup failed:", error);
  process.exit(1);
});

// =====================================================
// GOOGLE DRIVE AUTHENTICATION - MANUAL METHOD
// =====================================================
// Simpler method: Copy/paste the authorization code
// =====================================================

import { config } from "dotenv";
import { resolve } from "path";
import { google } from "googleapis";
import * as readline from "readline";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob", // Use OOB flow for manual code entry
);

console.log("\n🔐 Google Drive Authentication (Manual Method)\n");

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("❌ Missing Google credentials!");
  console.error("\nPlease add to your .env.local file:");
  console.error("GOOGLE_CLIENT_ID=your-client-id");
  console.error("GOOGLE_CLIENT_SECRET=your-client-secret\n");
  process.exit(1);
}

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("📋 STEP 1: Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n");
console.log("📋 STEP 2: After you authorize, Google will show you a code.");
console.log("           Copy that code and paste it here.\n");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the authorization code here: ", async (code) => {
  try {
    console.log("\n⏳ Exchanging code for tokens...\n");

    const { tokens } = await oauth2Client.getToken(code.trim());

    console.log("✅ Success! Authentication complete!\n");
    console.log("📋 Add this line to your .env.local file:\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log("⚠️  IMPORTANT: Keep this token secret and secure!\n");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("\nMake sure you:");
    console.error("1. Copied the ENTIRE code from Google");
    console.error("2. The code is still valid (they expire quickly)");
    console.error("3. Try running the command again\n");
  }

  rl.close();
  process.exit(0);
});

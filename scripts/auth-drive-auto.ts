// =====================================================
// GOOGLE DRIVE AUTHENTICATION HELPER (AUTOMATIC METHOD)
// =====================================================
// Run this once to get your refresh token
// Usage: npm run auth:drive:auto
// =====================================================

import { config } from "dotenv";
import { resolve } from "path";
import { google } from "googleapis";
import * as http from "http";
import { exec } from "child_process";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:3000"; // Automatic redirect

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI,
);

console.log("\n🔐 Google Drive Authentication (Automatic Method)\n");

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

console.log("🌐 Opening authorization URL in your browser...\n");
console.log(authUrl);
console.log("\n⏳ Waiting for authorization on http://localhost:3000...\n");

// Create HTTP server to receive the callback
const server = http.createServer(async (req, res) => {
  if (req.url?.includes("?code=")) {
    const url = new URL(req.url, "http://localhost:3000");
    const code = url.searchParams.get("code");

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <head><title>Authorization Successful</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: green;">✅ Authorization Successful!</h1>
          <p>You can close this window and return to the terminal.</p>
        </body>
      </html>
    `);

    server.close();

    try {
      console.log("\n⏳ Exchanging code for tokens...");

      const { tokens } = await oauth2Client.getToken(code!);

      if (!tokens.refresh_token) {
        console.error("\n❌ No refresh token received!");
        console.error("This might happen if you already authorized this app.");
        console.error(
          "Try revoking access at: https://myaccount.google.com/permissions"
        );
        console.error("Then run this script again.\n");
        process.exit(1);
      }

      console.log("\n🎉 Authentication successful!\n");
      console.log("📋 Add this line to your .env.local file:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      console.log("⚠️  IMPORTANT: Keep this token secret!\n");

      process.exit(0);
    } catch (error) {
      console.error("\n❌ Error:", error);
      process.exit(1);
    }
  }
});

server.listen(3000, () => {
  console.log("📡 Local server started on http://localhost:3000\n");
  
  // Try to open the URL in the default browser
  const command =
    process.platform === "win32"
      ? `start ${authUrl}`
      : process.platform === "darwin"
      ? `open ${authUrl}`
      : `xdg-open ${authUrl}`;

  exec(command, (error) => {
    if (error) {
      console.log("⚠️  Could not automatically open browser. Please open the URL manually.\n");
    }
  });
});

// Timeout after 2 minutes
setTimeout(() => {
  console.error("\n❌ Timeout: No authorization received within 2 minutes.");
  console.error("Please try again.\n");
  server.close();
  process.exit(1);
}, 120000);

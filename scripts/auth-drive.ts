// =====================================================
// GOOGLE DRIVE AUTHENTICATION HELPER
// =====================================================
// Run this once to get your refresh token
// Usage: npm run auth:drive
// =====================================================

import { config } from "dotenv";
import { resolve } from "path";
import { google } from "googleapis";
import * as readline from "readline";
import { createServer } from "http";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:3000";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI,
);

console.log("\n🔐 Google Drive Authentication\n");

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

console.log("📋 Step 1: Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n");

// Create a simple HTTP server to catch the redirect
const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/?code=")) {
      const code = new URL(req.url, "http://localhost:3000").searchParams.get(
        "code",
      );

      if (code) {
        console.log("\n✅ Authorization code received!");

        const { tokens } = await oauth2Client.getToken(code);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
              <h1 style="color: green;">✅ Success!</h1>
              <p>Authentication complete. You can close this window.</p>
              <p>Check your terminal for the refresh token.</p>
            </body>
          </html>
        `);

        console.log("\n🎉 Authentication successful!\n");
        console.log("📋 Add this to your .env.local file:\n");
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        console.log("⚠️  IMPORTANT: Keep this token secret!\n");

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
    res.writeHead(500);
    res.end("Error occurred");
    server.close();
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log("📡 Waiting for authorization...");
  console.log("   (Server listening on http://localhost:3000)\n");
});

// Timeout after 5 minutes
setTimeout(
  () => {
    console.error("\n❌ Timeout: No response received after 5 minutes");
    server.close();
    process.exit(1);
  },
  5 * 60 * 1000,
);

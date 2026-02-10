# Google Drive Daily Backup Setup Guide

## Overview

This system automatically backs up yesterday's sales and expenses to Google Drive every day at 6:00 AM (server time).

## Features

- ✅ Automatic daily backups at 6:00 AM
- ✅ Excel format with professional formatting
- ✅ Includes sales, expenses, and summary
- ✅ Organized by date (filename: `CrunchyTime_Backup_YYYY-MM-DD.xlsx`)
- ✅ Optional: Save to specific Google Drive folder

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it "Crunchy Time Backups" (or your choice)

### Step 2: Enable Google Drive API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Drive API"
3. Click **Enable**

### Step 3: Create Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Fill in details:
   - Service account name: `crunchy-time-backup`
   - Description: "Daily backup service for Crunchy Time"
4. Click **Create and Continue**
5. Grant role: **Editor** (or just Drive API access)
6. Click **Done**

### Step 4: Create Service Account Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Choose **JSON** format
5. Click **Create**
6. A JSON file will download - **KEEP THIS SAFE!**

### Step 5: Share Google Drive Folder (Optional but Recommended)

1. Create a folder in your Google Drive called "Crunchy Time Backups"
2. Right-click the folder > **Share**
3. Copy the **service account email** from the JSON file (looks like: `crunchy-time-backup@project-id.iam.gserviceaccount.com`)
4. Paste it in the share dialog and give **Editor** access
5. Copy the **Folder ID** from the URL (the long string after `/folders/`)
   - Example: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
   - Folder ID: `1a2b3c4d5e6f7g8h9i0j`

### Step 6: Configure Environment Variables

1. Open your `.env.local` file (or create it from `.env.local.example`)
2. Add these variables:

```env
# Supabase Service Role Key (needed for cron access to database)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google Service Account Key (paste entire JSON content)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"crunchy-time-backup@project-id.iam.gserviceaccount.com",...}

# Google Drive Folder ID (optional, from Step 5)
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j

# Cron Secret (generate a random string)
CRON_SECRET=your-random-secret-here
```

**To generate CRON_SECRET:**

- Open PowerShell and run: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
- Or use any random string generator

### Step 7: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings > Environment Variables**
3. Add each variable:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `GOOGLE_DRIVE_FOLDER_ID` (optional)
   - `CRON_SECRET`
4. Make sure to select "All" environments or at least "Production"

### Step 8: Deploy to Vercel

1. Commit and push your changes:

   ```bash
   git add .
   git commit -m "Add Google Drive daily backup feature"
   git push
   ```

2. Vercel will automatically deploy and set up the cron job

### Step 9: Verify Setup

#### Test the Backup Manually:

You can test the backup endpoint locally or in production:

**Local Test:**

```bash
# In PowerShell
$headers = @{
    "Authorization" = "Bearer your-cron-secret-here"
}
Invoke-RestMethod -Uri "http://localhost:3001/api/cron/daily-backup" -Headers $headers
```

**Production Test:**

```bash
# In PowerShell
$headers = @{
    "Authorization" = "Bearer your-cron-secret-here"
}
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/cron/daily-backup" -Headers $headers
```

If successful, you should see a response like:

```json
{
  "success": true,
  "message": "Daily backup completed successfully",
  "date": "2026-02-09",
  "fileName": "CrunchyTime_Backup_2026-02-09.xlsx",
  "fileId": "1xyz...",
  "stats": {
    "totalSales": 4137,
    "totalExpenses": 6482,
    "profit": -2345,
    "salesCount": 2,
    "expensesCount": 2
  }
}
```

Check your Google Drive folder - the Excel file should be there!

## How It Works

1. **Every day at 6:00 AM** (UTC), Vercel Cron triggers the backup
2. The system fetches yesterday's sales and expenses from Supabase
3. Generates a formatted Excel file with:
   - Professional header with blue background
   - Summary section with totals
   - Sales section with green header
   - Expenses section with red header
   - All numbers properly formatted as currency
4. Uploads the file to your Google Drive
5. File is named: `CrunchyTime_Backup_YYYY-MM-DD.xlsx`

## Schedule Configuration

The cron schedule is defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-backup",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Current schedule:** `0 6 * * *` = Every day at 6:00 AM UTC

**To change the time:**

- `0 0 * * *` = Midnight UTC (5:30 AM IST)
- `0 1 * * *` = 1:00 AM UTC (6:30 AM IST)
- `30 0 * * *` = 12:30 AM UTC (6:00 AM IST)
- Format: `minute hour day month weekday`

## Troubleshooting

### Backup not running?

1. Check Vercel deployment logs
2. Verify environment variables are set in Vercel
3. Ensure the cron secret matches in both .env and the request

### Google Drive authentication error?

1. Verify service account JSON is valid
2. Check if the service account has access to the folder
3. Ensure Google Drive API is enabled

### File not appearing in specific folder?

1. Make sure `GOOGLE_DRIVE_FOLDER_ID` is set
2. Verify the service account email has Editor access to the folder
3. Check the folder ID is correct (from URL)

### How to check if cron is scheduled in Vercel?

1. Go to Vercel Dashboard > Your Project
2. Click on **Settings > Cron Jobs**
3. You should see the daily-backup cron listed

## Manual Backup

You can also trigger a manual backup anytime by calling the API endpoint with proper authentication. This is useful for testing or creating additional backups.

## File Organization

Files are saved with naming pattern:

- `CrunchyTime_Backup_2026-02-09.xlsx`
- `CrunchyTime_Backup_2026-02-10.xlsx`
- etc.

This makes it easy to:

- Find backups by date
- Sort chronologically
- Archive old backups

## Security Notes

- ⚠️ Keep your service account JSON key secure
- ⚠️ Never commit `.env.local` to git
- ⚠️ The `CRON_SECRET` prevents unauthorized access to the backup endpoint
- ✅ Service account has minimal permissions (only Drive API)
- ✅ Backups are stored securely in your Google Drive

## Support

If you need help:

1. Check Vercel deployment logs
2. Review the API route logs at `/api/cron/daily-backup`
3. Test manually using the commands above
4. Verify all environment variables are correctly set

---

**Setup Complete!** Your daily backups will now run automatically at 6:00 AM every day. 🎉

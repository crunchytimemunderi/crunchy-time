# Crunchy Times Daily Slip Backup Setup

This guide explains how the automated Daily Slip backup system works.

## Overview

The backup system automatically downloads formatted Excel files when you **log in to the web app**. Files contain:

- **Title** with date (CRUNCHY TIME - DAILY SLIP)
- **Opening Balance** (Cash + UPI)
- **Cash in Hand** and **AIC Opening Balance**
- **SALES** section (green headers) with AIC and CASH columns
- **EXPENSE** section (orange headers) with AIC and CASH columns
- **TOTAL** row with sums for each column
- All amounts formatted with proper borders

This is the same Daily Slip format used throughout the app.

## How It Works

### Automatic Daily Slip Backup on Login

**Every time you log in** to the Crunchy Times web app:

1. The system checks if a backup was already downloaded today
2. If not, it automatically downloads yesterday's Daily Slip as an Excel file
3. **Automatically creates** a "Crunchy Time Backup" subfolder in Downloads
4. The file saves to Downloads\Crunchy Time Backup\[filename].xlsx
5. The download happens in the background (won't interrupt your login)
6. Only downloads **once per day** (stored in browser localStorage)

**File location:** `Downloads\Crunchy Time Backup\CrunchyTime_DailySlip_YYYY-MM-DD.xlsx`

### What You Need to Do

**Nothing!** Just log in as usual:

1. Open <http://localhost:3000/login> (or your production URL)
2. Enter your username and password
3. Click "Sign In"
4. Daily Slip backup downloads automatically
5. Check your Downloads folder for the Excel file

### Preventing Duplicate Downloads

The system uses your browser's localStorage to track the last backup date. If you've already logged in today, subsequent logins won't trigger another download.

**To force a new download:**

- Clear your browser's localStorage, OR
- Use the manual download button on the Backup page

## Checking Your Backups

**Download Location:** Your browser's Downloads folder in the **"Crunchy Time Backup"** subfolder

**Full Path:** `C:\Users\[YourName]\Downloads\Crunchy Time Backup\`

**File Format:** Excel files named `CrunchyTime_DailySlip_YYYY-MM-DD.xlsx`

**To view all backups:**

1. Open File Explorer
2. Go to your Downloads folder
3. Open the **"Crunchy Time Backup"** folder (created automatically)
4. Sort by date to see all backups

## Manual Download (Optional)

If you need a Daily Slip backup without logging in again:

1. Open the backup page: <http://localhost:3000/backup> (or your production URL)
2. Click "📥 Download Yesterday's Backup" button
3. File downloads immediately

This is useful if:

- You need multiple copies
- You want a backup for a different date
- The automatic download failed

## Troubleshooting

### Backup didn't download on login

**Check browser console:**

1. Open developer tools (F12)
2. Go to Console tab
3. Log in again
4. Look for messages starting with 📥 or ✅

**Common issues:**

- Already downloaded today → Check Downloads folder
- Session expired → Log out and log in again
- API error → Check that dev server is running

### How to verify it's working

1. Log out of the app
2. Open browser developer tools (F12) → Console tab
3. Log back in
4. Look for `📥 Triggering daily backup download...`
5. Then `✅ Daily backup downloaded successfully`
6. Check Downloads folder for new file

### Clear the backup timer

To force a new download (useful for testing):

1. Open developer tools (F12)
2. Go to Console tab
3. Type: `localStorage.removeItem("lastBackupDate")`
4. Press Enter
5. Refresh the page and log in again

## Advanced: PowerShell Script (Alternative Method)

**Note:** The PowerShell script (`backup-script.ps1`) is included but **not required** since backups now download automatically on login.

However, you can still use it if you want backups without logging in to the web app.

### Using the PowerShell Script

The PowerShell script can download backups directly via API without browser:

**Prerequisites:**

- Dev server running (or production URL)
- CRON_SECRET configured in `.env.local`

**To run the script:**

1. Open PowerShell
2. Navigate to project folder:

   ```powershell
   cd "C:\Users\ADMIN\App\Crunchy Times"
   ```

3. Run the script:
   ```powershell
   .\backup-script.ps1
   ```

**The script will:**

- Download yesterday's backup
- Save to `Documents\CrunchyTimes_Backups`
- Create detailed logs in `backup_log.txt`
- Auto-delete backups older than 90 days

### Optional: Windows Task Scheduler

If you want backups at a specific time (e.g., 6 AM) without logging in:

1. Open Task Scheduler (`taskschd.msc`)
2. Create new task:
   - Name: "Crunchy Times Backup"
   - Trigger: Daily at 6:00 AM
   - Action: Start program
     - Program: `powershell.exe`
     - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\ADMIN\App\Crunchy Times\backup-script.ps1"`
   - Settings: Wake computer, run whether logged in or not

**Note:** For localhost, dev server must be running at scheduled time. For production, update script with your Vercel URL.

## Support

If you encounter issues:

1. Check browser console for error messages (F12 → Console)
2. Verify you're logged in
3. Check Downloads folder
4. Try manual download from Backup page
5. Review `backup_log.txt` if using PowerShell script

If issues persist:

1. Check `backup_log.txt` for detailed error messages
2. Verify `.env.local` has CRON_SECRET
3. Ensure dev server is running (for localhost)
4. Test API endpoint directly in browser
5. Review Task Scheduler History for task execution details

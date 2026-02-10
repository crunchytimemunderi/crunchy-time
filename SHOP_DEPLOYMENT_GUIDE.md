# Shop System Deployment Guide

This guide will help you set up Crunchy Times on your shop computer with automatic Daily Slip backups on login.

## Preparation on Your Laptop

Before going to the shop, make sure everything is ready:

### Step 1: Commit Your Code (if using Git)

```powershell
cd "C:\Users\ADMIN\App\Crunchy Times"
git add .
git commit -m "Added automatic Daily Slip backup on login"
git push
```

**OR** if not using Git, copy the entire project folder to a USB drive.

### Step 2: Note Your Environment Variables

Open your `.env.local` file and copy these values (you'll need them on the shop system):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=CrunchyTime2026SecureBackupKey!9xyz
```

**Save these securely!** You'll need to create the same `.env.local` file on the shop computer.

## Installation on Shop Computer

### Option A: Deploy to Production (Vercel - Recommended)

**Advantages:**

- No need to keep dev server running
- Accessible from any device in the shop
- Automatic HTTPS
- Fast and reliable

**Steps:**

1. **Create Vercel Account** (if you haven't already)
   - Go to https://vercel.com
   - Sign up with GitHub/GitLab/Bitbucket

2. **Push Code to GitHub** (if not done already)
   - Create GitHub repository
   - Push your code

3. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables in Vercel dashboard:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `CRON_SECRET`
   - Click "Deploy"

4. **Access Your App**
   - Vercel will give you a URL like: `https://crunchy-times.vercel.app`
   - Bookmark this URL on all shop computers
   - Log in normally - backups will download automatically!

**Benefits for shop:**

- Works on any computer (desktop, laptop, tablet)
- No maintenance needed
- Always up and running

---

### Option B: Run Locally on Shop Computer

**Use this if:**

- You don't want cloud hosting
- Shop has limited internet
- You prefer local installation

#### Step 1: Install Prerequisites

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Choose LTS version (20.x or later)
   - Run installer, accept all defaults
   - Verify: Open PowerShell, type `node --version`

2. **Install Git** (if transferring via Git)
   - Download from: https://git-scm.com/
   - Run installer, accept defaults

#### Step 2: Transfer Project Code

**Method 1: Using Git (if pushed to GitHub)**

```powershell
cd "C:\Users\[ShopComputerUsername]\Documents"
git clone https://github.com/your-username/crunchy-times.git
cd crunchy-times
```

**Method 2: Using USB Drive**

1. Copy entire project folder from USB to shop computer
2. Place in `C:\Users\[ShopComputerUsername]\Documents\Crunchy Times`

#### Step 3: Install Dependencies

Open PowerShell as Administrator:

```powershell
cd "C:\Users\[ShopComputerUsername]\Documents\Crunchy Times"
npm install
```

This will take 5-10 minutes to install all packages.

#### Step 4: Configure Environment Variables

Create `.env.local` file in the project root:

```powershell
notepad .env.local
```

Paste this content (use YOUR actual values from laptop):

```
NEXT_PUBLIC_SUPABASE_URL=https://pgpguzihsrfqkfbjwuee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CRON_SECRET=CrunchyTime2026SecureBackupKey!9xyz
```

Save and close.

#### Step 5: Start the Application

**Option 5A: Manual Start (for testing)**

```powershell
npm run dev
```

Then open browser: http://localhost:3000

**Option 5B: Auto-Start on Windows Boot (Recommended for shop)**

Create a startup script:

1. **Create start script:**

```powershell
notepad "C:\Users\[Username]\Documents\Crunchy Times\start-crunchy-times.bat"
```

Paste this content:

```batch
@echo off
cd "C:\Users\[Username]\Documents\Crunchy Times"
start /min cmd /c "npm run dev"
```

Save and close.

2. **Add to Windows Startup:**

- Press `Win + R`
- Type: `shell:startup`
- Press Enter
- Create shortcut to `start-crunchy-times.bat` in this folder

Now the app will start automatically when Windows boots!

3. **Verify it's running:**

Open browser and go to: http://localhost:3000

---

## Testing the Backup System on Shop Computer

### Step 1: Initial Test

1. Open browser: http://localhost:3000 (or your Vercel URL)
2. Log in with your credentials
3. Open browser Downloads folder (Ctrl + J)
4. Look for: `CrunchyTime_DailySlip_2026-02-09.xlsx`
5. Open the file and verify:
   - Title: "CRUNCHY TIME - DAILY SLIP"
   - Opening Balance shown
   - Sales in AIC/CASH columns (green headers)
   - Expenses in AIC/CASH columns (orange headers)
   - TOTAL row at bottom

### Step 2: Test Auto-Download Prevention

1. Log out
2. Log back in immediately
3. Backup should NOT download again (already done today)
4. Check console (F12) - should see: "📦 Backup already downloaded today, skipping..."

### Step 3: Test Next Day

Tomorrow when you first log in:

1. New backup will download automatically
2. File will be named with yesterday's date
3. Check Downloads folder for new file

---

## Setting Up Multiple Shop Computers

If you have multiple computers in the shop (counter, kitchen, etc.):

### For Vercel Deployment:

- Just bookmark the Vercel URL on each computer
- Everyone logs in normally
- Each user gets ONE backup per day per computer (stored in browser localStorage)

### For Local Installation:

- Install on ONE computer that stays on 24/7 (recommended: main counter PC)
- Access from other computers on local network:
  1. Find the server computer's IP address:
     ```powershell
     ipconfig
     # Look for "IPv4 Address" (e.g., 192.168.1.100)
     ```
  2. On other computers, open browser to: `http://192.168.1.100:3000`
  3. Bookmark this URL

---

## Backup File Locations

**Where backups are saved:**

- `C:\Users\[Username]\Downloads\CrunchyTime_DailySlip_*.xlsx`

**Organizing backups:**

Create a folder structure:

```powershell
mkdir "C:\CrunchyTimes_Archives"
mkdir "C:\CrunchyTimes_Archives\2026"
mkdir "C:\CrunchyTimes_Archives\2026\February"
```

At the end of each day/week, move backups from Downloads to archive folder.

**Optional: Create a scheduled task to auto-organize:**

This PowerShell script moves Daily Slip backups to monthly folders:

```powershell
# Save as: organize-backups.ps1
$downloadsPath = "$env:USERPROFILE\Downloads"
$archivePath = "C:\CrunchyTimes_Archives"

# Create year/month folders
$year = (Get-Date).Year
$month = (Get-Date).ToString("MMMM")
$targetPath = "$archivePath\$year\$month"

if (-Not (Test-Path $targetPath)) {
    New-Item -ItemType Directory -Path $targetPath -Force
}

# Move Daily Slip files older than 7 days
Get-ChildItem -Path $downloadsPath -Filter "CrunchyTime_DailySlip_*.xlsx" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
    Move-Item -Destination $targetPath -Force

Write-Host "Backups organized!" -ForegroundColor Green
```

Run weekly to keep Downloads folder clean.

---

## Troubleshooting

### Issue: "Cannot access database"

**Solution:** Check internet connection and Supabase URL in `.env.local`

### Issue: "npm not recognized"

**Solution:** Node.js not installed. Go to Step 1 and install Node.js.

### Issue: Backup not downloading on login

**Solution:**

1. Open browser console (F12)
2. Log in again
3. Check for error messages
4. Common causes:
   - Session expired (log out and back in)
   - Browser blocked download (check browser settings)
   - Already downloaded today (clear localStorage)

### Issue: Port 3000 already in use

**Solution:**

```powershell
# Kill existing process
Get-Process -Name node | Stop-Process -Force

# Or use different port
$env:PORT=3001
npm run dev
```

### Issue: Daily Slip has no data

**Cause:** No sales/expenses recorded for yesterday

**Solution:** This is expected - backup is empty if no transactions. Try exporting for a date with data.

---

## Maintenance

### Daily:

- Check Downloads folder has today's backup
- Verify opening balances match yesterday's closing

### Weekly:

- Move old backups from Downloads to archive folder
- Verify app is running (if local installation)

### Monthly:

- Review backup files - ensure no gaps in dates
- Update Node.js if new version available (for local installation)

### When Adding New Computers:

- Just bookmark the URL (Vercel) or IP address (local)
- No additional setup needed!

---

## Production Best Practices

### Security:

1. **Strong passwords:** Ensure all user accounts have strong passwords
2. **Regular backups:** Keep Daily Slip archives in TWO locations:
   - Local computer (C:\CrunchyTimes_Archives)
   - USB drive or external hard drive (backup weekly)
   - Cloud storage like Google Drive (optional, manual upload)

3. **Access control:** Only give admin access to trusted staff

### Performance:

- **Vercel:** Fast worldwide, no maintenance
- **Local:** Ensure computer has:
  - 4GB+ RAM
  - SSD (faster)
  - Windows 10/11
  - Always-on (disable sleep when plugged in)

### Internet:

- **Vercel:** Requires stable internet
- **Local:** Can work offline, but Supabase needs internet for data sync

---

## Quick Reference Card (Print This!)

```
═══════════════════════════════════════════════
    CRUNCHY TIMES - SHOP QUICK REFERENCE
═══════════════════════════════════════════════

🌐 App URL:
   [ ] Local: http://localhost:3000
   [ ] Vercel: https://__________.vercel.app

📥 Backup Downloads:
   • Automatic on first login each day
   • File: CrunchyTime_DailySlip_YYYY-MM-DD.xlsx
   • Location: Downloads folder

🔄 To Force New Backup:
   1. Press F12 (open console)
   2. Type: localStorage.removeItem("lastBackupDate")
   3. Press Enter
   4. Refresh page and log in

📂 Archive Backups:
   Move from Downloads → C:\CrunchyTimes_Archives\[Year]\[Month]

🆘 Support:
   • Check this guide: SHOP_DEPLOYMENT_GUIDE.md
   • Restart app: Close browser, restart computer
   • Check internet connection

═══════════════════════════════════════════════
```

---

## Next Steps

1. ✅ Choose deployment method (Vercel or Local)
2. ✅ Follow installation steps above
3. ✅ Test backup on shop computer
4. ✅ Train staff on normal usage (just log in!)
5. ✅ Set up backup archiving system
6. ✅ Print Quick Reference Card for counter

**Questions?** Review the Troubleshooting section or test on your laptop first before deploying to shop!

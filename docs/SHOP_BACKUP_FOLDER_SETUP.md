# Automatic Backup Folder Setup - SIMPLIFIED

## ✅ GOOD NEWS - Folder Created Automatically

The system now **automatically creates** a "Crunchy Time Backup" subfolder in your Downloads folder.

**You don't need to configure anything!**

📂 All Daily Slip backups save to:
`Downloads\Crunchy Time Backup\CrunchyTime_DailySlip_YYYY-MM-DD.xlsx`

---

## How It Works

1. **First login:** System creates "Crunchy Time Backup" folder in Downloads
2. **Daily Slip downloads** to this folder automatically
3. **All backups organized** in one place
4. **No manual setup** required!

---

## Verification Steps

### Test on Shop Computer

1. Open your Vercel app URL
2. Log in with your credentials
3. Open File Explorer → Downloads folder
4. You should see: **"Crunchy Time Backup"** folder (created automatically)
5. Inside: `CrunchyTime_DailySlip_2026-02-09.xlsx` ✅

---

## File Location

**Typical path:**

```
C:\Users\[Username]\Downloads\Crunchy Time Backup\

```

C:\Users\[Username]\Downloads\Crunchy Time Backup\
 ├── CrunchyTime_DailySlip_2026-02-08.xlsx
├── CrunchyTime_DailySlip_2026-02-09.xlsx
└── CrunchyTime_DailySlip_2026-02-10.xlsx

````

---

## (Optional) Additional Organization

If you want to organize backups by month, you can still use the scripts below.

### Option A: Manual Organization

1. Open Chrome/Edge on shop computer
2. Click **⋮** (three dots) → **Settings**
3. Search for "downloads"
4. Under **Downloads**, click **Change** button
5. Create and select folder: `C:\CrunchyTimes_Backups`
6. ✅ Turn ON: "Ask where to save each file before downloading" (optional)
7. Close settings

**Now all Daily Slip backups will save to:** `C:\CrunchyTimes_Backups`

### For Firefox:

1. Click **☰** (menu) → **Settings**
2. Scroll to **Downloads**
3. Select "Save files to" → **Browse**
4. Create and select: `C:\CrunchyTimes_Backups`
5. Close settings

---

## Option B: Auto-Move Script (Automatic Organization)

If you want backups to automatically move from Downloads to organized folders:

### Step 1: Create Backup Folder Structure

```powershell
mkdir "C:\CrunchyTimes_Backups\DailySlips"
````

### Step 2: Create Auto-Organize Script

Save this as `C:\CrunchyTimes_Backups\auto-organize.ps1`:

```powershell
# Auto-organize Daily Slip backups
$downloadsPath = "$env:USERPROFILE\Downloads"
$backupPath = "C:\CrunchyTimes_Backups\DailySlips"

# Create backup folder if not exists
if (-Not (Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath -Force
}

# Move Daily Slip files from Downloads to Backups
Get-ChildItem -Path $downloadsPath -Filter "CrunchyTime_DailySlip_*.xlsx" |
    ForEach-Object {
        $destination = Join-Path $backupPath $_.Name

        # Only move if not already in destination
        if (-Not (Test-Path $destination)) {
            Move-Item $_.FullName -Destination $destination -Force
            Write-Host "✅ Moved: $($_.Name)" -ForegroundColor Green
        }
    }

Write-Host "✅ Backup organization complete!" -ForegroundColor Green
```

### Step 3: Create Desktop Shortcut

1. Right-click on Desktop → **New** → **Shortcut**
2. Location: `powershell.exe -ExecutionPolicy Bypass -File "C:\CrunchyTimes_Backups\auto-organize.ps1"`
3. Name: `Organize Daily Slips`
4. Click **Finish**
5. **Optional:** Change icon (right-click shortcut → Properties → Change Icon)

**Usage:** Double-click "Organize Daily Slips" icon once a day to move all backups from Downloads to organized folder.

### Step 4 (Optional): Auto-Run on Login

To automatically organize backups when logging into Windows:

1. Press `Win + R`
2. Type: `shell:startup`
3. Press Enter
4. Copy the Desktop shortcut into this Startup folder
5. Now it runs automatically when Windows starts!

---

## Option C: Advanced - Monthly Organization

For automatic organization by month:

Save as `C:\CrunchyTimes_Backups\organize-by-month.ps1`:

```powershell
# Organize Daily Slips by Year/Month
$downloadsPath = "$env:USERPROFILE\Downloads"
$basePath = "C:\CrunchyTimes_Backups"

# Process each Daily Slip backup
Get-ChildItem -Path $downloadsPath -Filter "CrunchyTime_DailySlip_*.xlsx" |
    ForEach-Object {
        # Extract date from filename: CrunchyTime_DailySlip_2026-02-10.xlsx
        if ($_.Name -match "CrunchyTime_DailySlip_(\d{4})-(\d{2})-(\d{2})\.xlsx") {
            $year = $matches[1]
            $month = $matches[2]
            $monthName = (Get-Culture).DateTimeFormat.GetMonthName([int]$month)

            # Create folder structure: C:\CrunchyTimes_Backups\2026\February
            $targetPath = Join-Path $basePath "$year\$monthName"

            if (-Not (Test-Path $targetPath)) {
                New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
            }

            # Move file
            $destination = Join-Path $targetPath $_.Name
            if (-Not (Test-Path $destination)) {
                Move-Item $_.FullName -Destination $destination -Force
                Write-Host "✅ Moved to: $year\$monthName\$($_.Name)" -ForegroundColor Green
            }
        }
    }

Write-Host ""
Write-Host "✅ All backups organized by month!" -ForegroundColor Green
Write-Host "📂 Location: C:\CrunchyTimes_Backups\" -ForegroundColor Cyan

# Show summary
$totalFiles = (Get-ChildItem -Path $basePath -Filter "*.xlsx" -Recurse).Count
Write-Host "📊 Total backups archived: $totalFiles files" -ForegroundColor Yellow
```

Create desktop shortcut the same way as Option B.

---

## Recommended Setup for Shop

I recommend **combining Option A + Option C**:

### Quick Setup Steps

1. **Set browser download location:**
   - Chrome Settings → Downloads → Change to `C:\CrunchyTimes_Backups\Downloads`

2. **Create monthly organization script:**
   - Copy Option C script to `C:\CrunchyTimes_Backups\organize-by-month.ps1`
   - Create desktop shortcut named "Organize Backups"
3. **Daily routine:**
   - Log in to Vercel app → Daily Slip downloads automatically to `C:\CrunchyTimes_Backups\Downloads`
   - Once a week: Click "Organize Backups" icon → Files move to `2026\February` folders

4. **Monthly routine:**
   - Copy monthly folder (e.g., `C:\CrunchyTimes_Backups\2026\February`) to USB drive
   - Keep USB in safe place (offsite backup)

---

## Testing Your Setup

### Test 1: Browser Download Location

1. Open your Vercel app URL
2. Log in (if not already logged in today)
3. Daily Slip should download
4. Check: File is in your configured folder? ✅

### Test 2: Organization Script (if using Option B or C)

1. Make sure a Daily Slip file is in Downloads
2. Double-click your "Organize Backups" shortcut
3. Check: File moved to organized folder? ✅
4. Check: No duplicate files? ✅

### Test 3: Daily Workflow

1. Tomorrow morning: Log in to Vercel app
2. New Daily Slip downloads automatically
3. Continue working normally
4. End of day or week: Run organization script

---

## Folder Structure Summary

After setup, your structure will look like:

```
C:\CrunchyTimes_Backups\
├── Downloads\                          (browser default - temporary)
│   └── CrunchyTime_DailySlip_2026-02-10.xlsx
│
├── DailySlips\                         (Option B - simple)
│   ├── CrunchyTime_DailySlip_2026-02-08.xlsx
│   ├── CrunchyTime_DailySlip_2026-02-09.xlsx
│   └── CrunchyTime_DailySlip_2026-02-10.xlsx
│
├── 2026\                               (Option C - by month)
│   ├── January\
│   │   ├── CrunchyTime_DailySlip_2026-01-15.xlsx
│   │   └── ... (all January backups)
│   └── February\
│       ├── CrunchyTime_DailySlip_2026-02-01.xlsx
│       └── ... (all February backups)
│
├── auto-organize.ps1                   (if using Option B)
└── organize-by-month.ps1               (if using Option C)
```

---

## Quick Reference for Shop Staff

**Print this card and place near computer:**

```
═════════════════════════════════════════════════
         CRUNCHY TIMES - BACKUP SYSTEM
═════════════════════════════════════════════════

🌐 Open App:
   https://[your-vercel-url].vercel.app

🔐 Login → Daily Slip auto-downloads!

📂 Backups Saved To:
   C:\CrunchyTimes_Backups\Downloads

🗂️ Organize Backups (Weekly):
   Double-click "Organize Backups" icon on desktop

📅 Monthly Archive:
   Copy monthly folder to USB drive

═════════════════════════════════════════════════
```

---

## Next Steps

- [ ] Choose your preferred option (A, B, or C)
- [ ] Set browser download location on shop computer
- [ ] Create backup folder: `C:\CrunchyTimes_Backups`
- [ ] Test: Log in to Vercel app → Check backup downloads
- [ ] If using scripts: Create and test organization script
- [ ] Print Quick Reference card for staff
- [ ] Set reminder to archive monthly backups to USB

**Your Vercel app is ready! Just configure the backup folder and you're done!** 🎉

# Shop Deployment Checklist

Use this checklist when setting up Crunchy Times on your shop computer.

## Before You Go to Shop

- [ ] Test backup on laptop - confirm Daily Slip downloads on login
- [ ] Copy `.env.local` values to a secure note:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] CRON_SECRET
- [ ] Choose deployment method:
  - [ ] **Vercel** (Recommended - works everywhere, no maintenance)
  - [ ] **Local** (Offline capable, requires computer always on)

---

## Option A: Vercel Deployment (Easiest)

- [ ] Create Vercel account at https://vercel.com
- [ ] Push code to GitHub/GitLab
- [ ] Connect repository to Vercel
- [ ] Add all 4 environment variables in Vercel dashboard
- [ ] Click "Deploy" and wait 2-3 minutes
- [ ] Copy your Vercel URL (e.g., `https://crunchy-times.vercel.app`)
- [ ] **At Shop:** Bookmark Vercel URL on all computers
- [ ] Test: Log in → Check Downloads folder for Daily Slip
- [ ] **Done!** No server to maintain

---

## Option B: Local Installation on Shop PC

### On Shop Computer:

- [ ] Install Node.js from https://nodejs.org/ (LTS version)
- [ ] Copy project folder from USB to `C:\Users\[Username]\Documents\Crunchy Times`
  - **OR** Clone from GitHub: `git clone [your-repo-url]`
- [ ] Open PowerShell as Administrator
- [ ] Navigate to project folder:
  ```powershell
  cd "C:\Users\[Username]\Documents\Crunchy Times"
  ```
- [ ] Install dependencies:
  ```powershell
  npm install
  ```
  (Wait 5-10 minutes)

### Configure Environment:

- [ ] Create `.env.local` file in project root
- [ ] Paste your environment variables (4 lines)
- [ ] Save file

### Start Application:

- [ ] Test run:
  ```powershell
  npm run dev
  ```
- [ ] Open browser: http://localhost:3000
- [ ] Verify app loads

### Auto-Start on Boot:

- [ ] Create `start-crunchy-times.bat` in project folder:
  ```batch
  @echo off
  cd "C:\Users\[Username]\Documents\Crunchy Times"
  start /min cmd /c "npm run dev"
  ```
- [ ] Press `Win + R`, type `shell:startup`, press Enter
- [ ] Create shortcut to `.bat` file in startup folder
- [ ] Restart computer to test auto-start
- [ ] Verify: Open http://localhost:3000 - should work!

---

## Final Testing (Both Methods)

- [ ] **Test 1:** Log in → Daily Slip downloads automatically
- [ ] **Test 2:** Check Downloads folder → Find `CrunchyTime_DailySlip_*.xlsx`
- [ ] **Test 3:** Open Excel file → Verify Daily Slip format:
  - [ ] Title: "CRUNCHY TIME - DAILY SLIP"
  - [ ] Opening Balance, Cash in Hand, AIC Opening Balance
  - [ ] SALES section (green headers, AIC/CASH columns)
  - [ ] EXPENSE section (orange headers, AIC/CASH columns)
  - [ ] TOTAL row at bottom
- [ ] **Test 4:** Log out and back in → Should NOT download again (already done today)
- [ ] **Test 5:** Check browser console (F12) → See "📦 Backup already downloaded today"

---

## Multiple Computers Setup

### If using Vercel:

- [ ] Bookmark Vercel URL on each computer
- [ ] That's it! Each computer downloads independently

### If using Local:

- [ ] Note server computer's IP address:
  ```powershell
  ipconfig
  # Look for IPv4 Address (e.g., 192.168.1.100)
  ```
- [ ] On other computers, bookmark: `http://192.168.1.100:3000`
- [ ] Test from another computer

---

## Backup Organization (Optional but Recommended)

- [ ] Create archive folder: `C:\CrunchyTimes_Archives`
- [ ] Create subfolders: `2026\February`
- [ ] At end of week: Move old backups from Downloads to archive
- [ ] Keep USB backup: Copy archive folder to USB drive monthly

---

## Training Staff

- [ ] Show staff how to log in (username + password)
- [ ] Explain backup downloads automatically (no action needed)
- [ ] Show where to find backups (Downloads folder)
- [ ] Print Quick Reference Card (in SHOP_DEPLOYMENT_GUIDE.md)
- [ ] Tape Quick Reference Card next to computer

---

## Troubleshooting Quick Checks

If something doesn't work:

- [ ] Internet connection working?
- [ ] Browser up to date?
- [ ] Clear browser cache (Ctrl + Shift + Delete)
- [ ] Log out and back in
- [ ] Restart browser
- [ ] **Local only:** Is dev server running? Check PowerShell window
- [ ] Check SHOP_DEPLOYMENT_GUIDE.md for detailed troubleshooting

---

## Post-Deployment

- [ ] Use app normally for 3 days
- [ ] Verify backups download each morning
- [ ] Check backup files have correct data
- [ ] Archive first week's backups
- [ ] Mark deployment as successful! 🎉

---

## Emergency Contacts

**If you need help:**

1. Check SHOP_DEPLOYMENT_GUIDE.md (full troubleshooting)
2. Check browser console (F12) for error messages
3. Restart computer
4. Fall back to laptop if shop system fails

**Critical Files Location:**

- Project code: `C:\Users\[Username]\Documents\Crunchy Times`
- Environment config: `.env.local` (in project folder)
- Backups: Downloads folder
- Archive: `C:\CrunchyTimes_Archives`

---

**Deployment Date:** ******\_\_\_******

**Deployed By:** ******\_\_\_******

**Method Used:** [ ] Vercel [ ] Local

**Tested:** [ ] Yes [ ] No

**Notes:**

---

---

---

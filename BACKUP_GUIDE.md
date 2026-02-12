# Automatic Data Backup System

This system automatically exports your Supabase data to CSV files (Excel-compatible).

## Quick Start

### 1. Run Manual Backup (Anytime)

```bash
npm run backup
```

This will create CSV files in the `backups/` folder:

- `sales_2026-02-08.csv`
- `expenses_2026-02-08.csv`
- `cash_reconciliation_2026-02-08.csv`
- `users_2026-02-08.csv`

### 2. Schedule Automatic Backups

#### Option A: Windows Task Scheduler (Recommended for Windows)

1. Open **Task Scheduler**
2. Click **Create Basic Task**
3. Name: "Crunchy Times Backup"
4. Trigger: **Daily** at 11:59 PM (or your preferred time)
5. Action: **Start a program**
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `--loader tsx scripts/backup.ts`
   - Start in: `C:\Users\ADMIN\App\Crunchy Times`
6. Click **Finish**

#### Option B: Manual Schedule (Run daily)

Set a reminder to run `npm run backup` every day at closing time.

### 3. Open Backups in Excel

1. Go to the `backups/` folder
2. Double-click any `.csv` file
3. It will open in Excel automatically
4. You can also import multiple CSV files into one Excel workbook

## Files Included

- **sales CSV** - All sales records with dates, items, quantities, amounts
- **expenses CSV** - All expense records
- **cash_reconciliation CSV** - Daily cash counts and reconciliation
- **users CSV** - User accounts (admin/staff)

## Best Practices

1. **Run backups daily** - Ideally at end of business day
2. **Store backups safely** - Copy to external drive or cloud storage weekly
3. **Keep multiple versions** - Don't delete old backups immediately
4. **Verify backups** - Open a CSV file occasionally to ensure it's working

## Cloud Backup (Optional)

To automatically upload backups to Google Drive/Dropbox:

1. Copy files from `backups/` folder
2. Paste into your cloud storage folder
3. Or use cloud sync software to auto-sync the `backups/` folder

## Troubleshooting

### Error: "Cannot find module"

- Run `npm install` first

### Empty CSV files

- Check your `.env.local` file has correct Supabase credentials

### Permission denied

- Run terminal/command prompt as Administrator

## Need Help?

Ask me to:

- Set up cloud upload automation
- Create Excel format (XLSX) instead of CSV
- Add email notifications when backup completes
- Schedule backups for specific times

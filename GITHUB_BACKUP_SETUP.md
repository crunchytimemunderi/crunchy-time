# GitHub Actions Automatic Backup Setup

This guide sets up automatic daily backups to Google Drive using GitHub Actions (runs 24/7, even when your laptop is off).

## Setup Steps

### 1. Push Your Code to GitHub

If you haven't already:

```bash
git add .
git commit -m "Add automatic Google Drive backup"
git push
```

### 2. Add Secrets to GitHub Repository

Go to your GitHub repository and add these secrets:

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"** for each of these:

| Secret Name                 | Value                                                                                                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | `https://pgpguzihsrfqkfbjwuee.supabase.co`                                                                                                                                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncGd1emloc3JmcWtmYmp3dWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE2OTkwNiwiZXhwIjoyMDg1NzQ1OTA2fQ.8jWTullqB5I2j4dfxvGosKipvgU7btuH3lAJudrKDOI` |
| `GOOGLE_CLIENT_ID`          | `5981537690-mhh16fj2vtspquavah20ft1k27eq953j.apps.googleusercontent.com`                                                                                                                                                      |
| `GOOGLE_CLIENT_SECRET`      | `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`                                                                                                                                                                                         |
| `GOOGLE_REFRESH_TOKEN`      | `1//0cRDBf00ugV7iCgYIARAAGAwSNwF-L9IrsndlAe-ReHu6q1PGZMvZXEntyrZ58suHXtKIdCm0xYxZzag3Pwq8uNKRyhJN_KVqF1Y`                                                                                                                     |
| `GOOGLE_DRIVE_FOLDER_ID`    | `1_C7TSs4C4s8jJ388SH-VsH-cReFFK9D_`                                                                                                                                                                                           |

### 3. Enable GitHub Actions

1. Go to your repository's **Actions** tab
2. If prompted, click **"I understand my workflows, go ahead and enable them"**
3. You should see the workflow: **"Daily Database Backup to Google Drive"**

### 4. Test the Backup

You can test it manually before waiting for the scheduled time:

1. Go to **Actions** tab in your GitHub repository
2. Click on **"Daily Database Backup to Google Drive"** workflow
3. Click **"Run workflow"** button
4. Click the green **"Run workflow"** button
5. Wait for it to complete (usually takes 10-30 seconds)
6. Check your Google Drive folder to see the backup files!

## Schedule

- **Automatic backup runs**: Every day at 11:59 PM UTC
- **Manual backup**: Anytime from GitHub Actions tab
- **No laptop needed**: Runs on GitHub's servers

## Adjust Timezone (Optional)

The backup is currently set to **11:59 PM UTC**. To change it:

1. Edit `.github/workflows/backup.yml`
2. Find the line: `- cron: '59 23 * * *'`
3. Change to your preferred time:
   - `'59 15 * * *'` = 3:59 PM UTC (11:59 PM IST)
   - `'0 0 * * *'` = 12:00 AM UTC
   - Use https://crontab.guru/ to help create the schedule

## Monitoring

To check if backups are running:

1. Go to **Actions** tab in GitHub
2. See the latest workflow runs
3. Green checkmark ✅ = Success
4. Red X ❌ = Failed (click to see error logs)

## Important Notes

- ✅ Runs 24/7 even when laptop is off
- ✅ Free (GitHub Actions gives 2,000 minutes/month for free)
- ✅ Automatic - no manual intervention needed
- ✅ Can trigger manual backups anytime
- ⚠️ Keep your secrets safe - never commit .env.local to GitHub

## Troubleshooting

If backup fails:

1. Check GitHub Actions logs for errors
2. Verify all secrets are added correctly
3. Check Google Drive folder permissions
4. Run `npm run backup:drive` locally to test

---

**Your data is now automatically backed up to Google Drive every day, even when your laptop is off!** 🎉

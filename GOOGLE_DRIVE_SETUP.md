# Google Drive Automatic Backup Setup

This guide will help you set up automatic backups to Google Drive.

## Step 1: Create Google Cloud Project

1. Go to <https://console.cloud.google.com>
2. Click **"Select a project"** → **"New Project"**
3. Name: **"Crunchy Times Backup"**
4. Click **Create**

## Step 2: Enable Google Drive API

1. In your project, go to **APIs & Services** → **Library**
2. Search for **"Google Drive API"**
3. Click on it and click **Enable**

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure consent screen:
   - User Type: **External**
   - App name: **Crunchy Times Backup**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** (skip optional fields)
4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: **Crunchy Times Backup Client**
   - Authorized redirect URIs: `http://localhost:3000`
   - Click **Create**
5. **IMPORTANT:** Copy the **Client ID** and **Client Secret** - you'll need these!

## Step 4: Generate Refresh Token

Run this command to get your refresh token:

```bash
npm run auth:drive
```

This will:

1. Open a browser with Google login
2. Ask you to allow access to Google Drive
3. Generate a refresh token
4. Display it in the terminal

**Copy the refresh token** - you'll need it in the next step!

## Step 5: Create Google Drive Folder

1. Go to <https://drive.google.com>
2. Create a new folder: **"Crunchy Times Backups"**
3. Open the folder
4. Look at the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
5. Copy the **FOLDER_ID** from the URL

## Step 6: Add Credentials to .env.local

Open `.env.local` and add these lines:

```bash
# Google Drive Backup
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REFRESH_TOKEN=your-refresh-token-here
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
```

Replace the values with what you copied in previous steps.

## Step 7: Test the Backup

Run the backup:

```bash
npm run backup:drive
```

You should see:

- ✅ Files being uploaded to Google Drive
- Links to view them in your browser

Check your Google Drive folder - you should see the CSV files!

## Step 8: Schedule Automatic Backups

### Windows Task Scheduler

1. Open **Task Scheduler**
2. **Create Basic Task**
3. Name: **"Crunchy Times Google Drive Backup"**
4. Trigger: **Daily** at **11:59 PM**
5. Action: **Start a program**
   - Program: `C:\Program Files\nodejs\npm.cmd`
   - Arguments: `run backup:drive`
   - Start in: `C:\Users\ADMIN\App\Crunchy Times`
6. Click **Finish**

Now your data will automatically backup to Google Drive every night!

## Commands

- **Manual backup to Drive:** `npm run backup:drive`
- **Local CSV backup only:** `npm run backup`
- **Get new refresh token:** `npm run auth:drive`

## Troubleshooting

### Error: "Invalid credentials"

- Double-check your Client ID, Client Secret, and Refresh Token in `.env.local`
- Make sure there are no extra spaces

### Error: "Folder not found"

- Verify the Google Drive Folder ID is correct
- Make sure the folder exists in your Google Drive

### Error: "Access denied"

- Run `npm run auth:drive` again to get a new refresh token
- Make sure you authorized the app when the browser opened

## Security Notes

- ✅ Your `.env.local` file is in `.gitignore` (credentials won't be committed)
- ✅ Use a Google account you control
- ✅ The app only has access to files it creates
- You can revoke access anytime at <https://myaccount.google.com/permissions>

## Next Steps

Once working, you can:

- Share the Google Drive folder with your wife or team
- Enable Google Drive desktop sync for automatic local copies
- Set up Google Drive notifications when new backups are added

# Firebase Setup Guide for Crunchy Times

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or "Create a Project"
3. Enter project name: `crunchy-times` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get Started"
3. Go to "Sign-in method" tab
4. Click on "Email/Password"
5. Toggle "Enable" to ON
6. Click "Save"

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose "Start in production mode"
4. Select your nearest region
5. Click "Enable"

## Step 4: Enable Cloud Storage

1. In Firebase Console, go to **Build** → **Storage**
2. Click "Get Started"
3. Click "Next" (use default security rules for now)
4. Select your nearest region
5. Click "Done"

## Step 5: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ → Project Settings
2. Scroll down to "Your apps" section
3. Click the web icon `</>` to add a web app
4. Enter app nickname: `Crunchy Times Web`
5. Click "Register app"
6. Copy the firebaseConfig object values

Example:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Step 6: Update .env.local

Open your `.env.local` file and replace the placeholder values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_ADMIN_EMAIL=your-wife-email@gmail.com
```

## Step 7: Create User Accounts

### Create Admin Account (Your Wife)

1. In Firebase Console, go to **Authentication** → **Users**
2. Click "Add user"
3. Enter email: `your-wife-email@gmail.com`
4. Enter a secure password
5. Click "Add user"
6. **Important**: This email MUST match `NEXT_PUBLIC_ADMIN_EMAIL` in `.env.local`

### Create Staff Account(s)

1. Click "Add user" again
2. Enter email: `staff@yourstore.com` (or any email)
3. Enter a password
4. Click "Add user"
5. Repeat for additional staff members

## Step 8: Set Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper to check if user is admin
    function isAdmin() {
      return request.auth != null;
      // Note: Role checking happens in the app based on email
    }
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Sales collection
    match /daily_sales/{saleId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }
    
    // Expenses collection
    match /expenses/{expenseId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }
    
    // Cash reconciliation
    match /cash_reconciliation/{cashId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

3. Click "Publish"

## Step 9: Set Storage Security Rules

1. Go to **Storage** → **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /bills/{fileName} {
      // Allow authenticated users to read
      allow read: if request.auth != null;
      
      // Allow authenticated users to upload images up to 5MB
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
    }
  }
}
```

3. Click "Publish"

## Step 10: Test the Application

1. Make sure your `.env.local` is properly configured
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000
4. Try logging in with admin credentials
5. Try logging in with staff credentials
6. Verify permissions work correctly

## Firestore Collections Structure

The app will automatically create these collections:

### 1. daily_sales
```
{
  date: "2026-02-03",
  cashSales: 1500,
  upiSales: 2300,
  totalSales: 3800,
  createdAt: Timestamp,
  createdBy: "user@email.com"
}
```

### 2. expenses
```
{
  date: "2026-02-03",
  category: "Chicken",
  amount: 500,
  paymentMode: "Cash",
  billPhotoUrl: "https://firebasestorage...",
  createdAt: Timestamp,
  createdBy: "user@email.com"
}
```

### 3. cash_reconciliation
```
{
  date: "2026-02-03",
  openingCash: 5000,
  expectedClosingCash: 6000,
  actualClosingCash: 5980,
  difference: -20,
  createdAt: Timestamp,
  createdBy: "admin@email.com"
}
```

## Troubleshooting

### "Firebase: Error (auth/invalid-credential)"
- Check that the user exists in Firebase Authentication
- Verify password is correct
- Ensure email is exact match

### "Permission denied" errors
- Verify security rules are published
- Check user is authenticated
- Clear browser cache and try again

### Bill photo upload fails
- Check Storage security rules
- Verify image is under 5MB
- Ensure file is an image format (jpg, png, etc.)

### Admin role not working
- Verify `NEXT_PUBLIC_ADMIN_EMAIL` in `.env.local` exactly matches the user's email in Firebase
- Restart the dev server after changing .env.local
- Check for typos or extra spaces

## Production Deployment

Before deploying to production:

1. ✅ Create a production Firebase project (don't use the same for dev/prod)
2. ✅ Update `.env.local` with production Firebase config
3. ✅ Tighten Firestore security rules
4. ✅ Add your domain to Firebase authorized domains
5. ✅ Enable backups for Firestore
6. ✅ Set up Firebase Performance Monitoring

---

**Setup Complete!** 🎉

Your fried chicken store management system is now ready to use!

# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name it "Crunchy Times" (or your preferred name)
4. Follow the setup wizard

## 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. Click "Save"

## 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select your region
5. Click "Enable"

## 4. Create Admin User

### Using Firebase Console:

1. Go to **Authentication** > **Users**
2. Click "Add user"
3. Enter email: `wife@crunchytimes.com` (or your preferred email)
4. Enter password
5. Click "Add user"
6. Copy the **User UID**

### Set Admin Role in Firestore:

1. Go to **Firestore Database**
2. Click "Start collection"
3. Collection ID: `users`
4. Document ID: Paste the **User UID** from above
5. Add fields:
   - `email`: (string) `wife@crunchytimes.com`
   - `role`: (string) `admin`
   - `displayName`: (string) `Admin`
6. Click "Save"

## 5. Create Staff User

Repeat the same process:

1. **Authentication** > Add user with staff email
2. **Firestore** > `users` collection > Add document
   - Document ID: Staff User UID
   - Fields:
     - `email`: (string) staff email
     - `role`: (string) `staff`
     - `displayName`: (string) `Store Staff`

## 6. Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon `</>`
4. Register your app
5. Copy the config values

## 7. Update .env.local

Update your `.env.local` file with the values from Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

## 8. Update Firestore Rules (Production)

For production, update Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Sales - authenticated users can read/write
    match /sales/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Expenses - only admin can write
    match /expenses/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## 9. Test Login

1. Run `npm run dev`
2. Go to `http://localhost:3000/login`
3. Login with your admin credentials
4. You should be redirected to the dashboard

## User Roles

- **Admin (wife)**: Full access to all features
- **Staff (store)**: Limited access - cannot access admin-only pages

## Example User Structure in Firestore

```
users (collection)
  └── {userUID} (document)
      ├── email: "wife@crunchytimes.com"
      ├── role: "admin"
      └── displayName: "Admin"
      
  └── {userUID} (document)
      ├── email: "staff@crunchytimes.com"
      ├── role: "staff"
      └── displayName: "Store Staff"
```

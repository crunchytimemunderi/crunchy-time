# 🍗 Crunchy Times - Fried Chicken Store Management

A complete Next.js web application for managing your fried chicken store that your wife can manage remotely. Built with Firebase for real-time data sync, authentication, and file storage.

## Features

### Authentication
- ✅ Email/password login with Firebase Auth
- ✅ Two roles: **Admin** (your wife) and **Staff** (store employees)
- ✅ Role-based permissions:
  - Admin can edit/delete any entry
  - Staff can only add sales and expenses
  - Automatic redirect for unauthorized users

### Dashboard (Admin View)
- 📊 Today's total sales (Cash + UPI)
- 💸 Total expenses for the day
- 💰 Profit calculation (Sales - Expenses)
- 🔴 Cash difference alerts (Expected vs Actual)
- 📋 Recent sales and expenses list

### Daily Sales Entry
- Auto-populated date (today)
- Cash sales and UPI sales fields
- Auto-calculated total
- Staff: Can only enter today's date
- Admin: Can edit any date

### Expense Entry
- Auto-populated date (today)
- Categories: Chicken, Oil, Masala, Gas, Wages, Other
- Payment mode: Cash or UPI
- Bill photo upload to Firebase Storage
- Staff: Can only enter today's date
- Admin: Can edit any date

### Cash Reconciliation (Admin Only)
- Enter opening cash
- System calculates expected closing cash: `Opening + Cash Sales - Cash Expenses`
- Enter actual cash count
- Shows difference in red if there's a mismatch

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Firebase Firestore (Database)
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage (for bill photos)
- **Styling**: Tailwind CSS
- **Deployment Ready**: Vercel-optimized

## Getting Started

### Prerequisites

- Node.js 18 or higher installed
- A Firebase account (free tier works perfectly)
- Basic knowledge of running npm commands

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable these services:
   - **Authentication** → Email/Password
   - **Firestore Database** → Start in production mode
   - **Storage** → Start in production mode

4. Get your Firebase config:
   - Go to Project Settings → Your Apps → Web App
   - Copy the config values

5. Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_ADMIN_EMAIL=your-wife-email@example.com
```

### Step 3: Create Users in Firebase

1. Go to Firebase Console → Authentication → Users
2. Add users manually:
   - **Admin**: your-wife-email@example.com (set this in `.env.local`)
   - **Staff**: staff@yourstore.com
3. Set passwords for both

### Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser

### Step 5: Firestore Security Rules

Go to Firestore → Rules and update with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email == 'YOUR_ADMIN_EMAIL@example.com';
    }
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Sales collection
    match /daily_sales/{saleId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    
    // Expenses collection
    match /expenses/{expenseId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    
    // Cash reconciliation
    match /cash_reconciliation/{cashId} {
      allow read, write: if isAdmin();
    }
  }
}
```

### Step 6: Storage Security Rules

Go to Storage → Rules and update with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /bills/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 && // 5MB max
                      request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Project Structure

```
crunchy-times/
├── app/
│   ├── login/              # Login page
│   ├── dashboard/          # Main dashboard with stats
│   ├── sales/              # Daily sales entry
│   ├── expenses/           # Expense tracking
│   ├── cash/               # Cash reconciliation (admin only)
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Home page (redirects to login)
│   └── globals.css         # Global styles
├── components/
│   ├── Navigation.tsx      # Top navigation bar
│   └── ProtectedRoute.tsx  # HOC for route protection
├── lib/
│   ├── firebase.ts         # Firebase initialization
│   └── auth-context.tsx    # Auth context provider
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   └── helpers.ts          # Helper functions
├── middleware.ts           # Next.js middleware
├── .env.local.example      # Environment variables template
└── package.json
```

## Usage Guide

### For Staff

1. Login with your staff credentials
2. **Record Sales**: Go to Sales → Enter cash and UPI amounts → Submit
3. **Record Expenses**: Go to Expenses → Select category → Enter amount → Choose payment mode → Upload bill photo → Submit
4. Staff can only add entries for today's date
5. Staff cannot edit or delete any entries

### For Admin (Your Wife)

1. Login with admin credentials
2. **View Dashboard**: See today's sales, expenses, profit, and cash differences
3. **Manage Sales**: View, edit, or delete any sales entry from any date
4. **Manage Expenses**: View, edit, or delete any expense from any date
5. **Cash Reconciliation**: 
   - Enter opening cash for the day
   - System shows expected closing cash (Opening + Cash Sales - Cash Expenses)
   - Enter actual cash count
   - See difference highlighted in red if mismatch
6. Admin can access all pages and edit any date

## Data Models

### Daily Sales
```typescript
{
  date: string,           // YYYY-MM-DD
  cashSales: number,      // Amount in cash
  upiSales: number,       // Amount via UPI
  totalSales: number,     // Auto-calculated
  createdAt: Date,
  createdBy: string       // User email
}
```

### Expenses
```typescript
{
  date: string,           // YYYY-MM-DD
  category: string,       // Chicken | Oil | Masala | Gas | Wages | Other
  amount: number,
  paymentMode: string,    // Cash | UPI
  billPhotoUrl: string,   // Firebase Storage URL
  createdAt: Date,
  createdBy: string
}
```

### Cash Reconciliation
```typescript
{
  date: string,
  openingCash: number,
  expectedClosingCash: number,  // Auto-calculated
  actualClosingCash: number,
  difference: number,           // Actual - Expected
  createdAt: Date,
  createdBy: string
}
```

## Building for Production

```bash
npm run build
npm start
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

Vercel automatically optimizes Next.js apps and provides:
- Automatic HTTPS
- Global CDN
- Instant deployment
- Free SSL certificates

## Troubleshooting

### Firebase Connection Issues
- Verify all environment variables are correct
- Check Firebase project settings
- Ensure Authentication, Firestore, and Storage are enabled

### Build Errors
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### Authentication Not Working
- Verify admin email in `.env.local` matches Firebase user
- Check Firestore security rules
- Ensure users exist in Firebase Authentication

## Future Enhancements

- [ ] Monthly/yearly reports
- [ ] Export data to Excel
- [ ] SMS notifications for daily summary
- [ ] Inventory management
- [ ] Multiple store support
- [ ] Mobile app (React Native)
- [ ] WhatsApp integration for alerts

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase console for errors
3. Check browser console for error messages

## License

MIT License - Feel free to use for your business!

---

**Made with ❤️ for your Fried Chicken Store**

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── login/             # Login page
│   ├── dashboard/         # Dashboard page
│   ├── sales/             # Sales tracking page
│   ├── expenses/          # Expense management page
│   └── cash/              # Cash reconciliation page
├── components/            # Reusable React components
├── lib/                   # Library code
│   └── firebase.js        # Firebase configuration
├── utils/                 # Utility functions
│   ├── formatting.ts      # Date/currency formatting
│   └── validation.ts      # Input validation
└── middleware.js          # Role-based access control
```

## Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Enable Storage
5. Copy your Firebase config to `.env.local`

## Environment Variables

Create a `.env.local` file with your Firebase credentials:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Storage)

## License

MIT

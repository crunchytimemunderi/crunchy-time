# Firestore Database Structure

This document outlines the expected Firestore collections and document structure for the Crunchy Times app.

## Collections

### 1. `users`
Stores user profile and role information.

**Document ID:** User UID from Firebase Auth

**Fields:**
```javascript
{
  email: string,              // User's email address
  role: string,               // "admin" or "staff"
  displayName: string,        // Display name for the user
  createdAt: timestamp        // Account creation date
}
```

**Example:**
```javascript
{
  email: "wife@crunchytimes.com",
  role: "admin",
  displayName: "Admin",
  createdAt: Timestamp
}
```

---

### 2. `sales`
Stores all sales transactions.

**Document ID:** Auto-generated

**Fields:**
```javascript
{
  amount: number,             // Sale amount
  paymentMethod: string,      // "cash" or "upi"
  description: string,        // Optional description
  date: string,               // Date in YYYY-MM-DD format
  createdAt: timestamp,       // Exact timestamp of creation
  createdBy: string,          // UID of user who created the sale
  createdByName: string       // Display name of creator
}
```

**Example:**
```javascript
{
  amount: 450.50,
  paymentMethod: "cash",
  description: "2 Chicken Combos",
  date: "2026-02-04",
  createdAt: Timestamp,
  createdBy: "user123abc",
  createdByName: "Store Staff"
}
```

**Indexes Required:**
- `date` (Ascending) + `createdAt` (Descending)
- `date` (Ascending) + `createdBy` (Ascending) + `createdAt` (Descending)

---

### 3. `expenses`
Stores all expense entries.

**Document ID:** Auto-generated

**Fields:**
```javascript
{
  amount: number,             // Expense amount
  category: string,           // "supplies", "utilities", "maintenance", "labor", "rent", "other"
  description: string,        // Expense description
  date: string,               // Date in YYYY-MM-DD format
  createdAt: timestamp,       // Exact timestamp of creation
  createdBy: string,          // UID of user who created the expense
  createdByName: string       // Display name of creator
}
```

**Example:**
```javascript
{
  amount: 1250.00,
  category: "supplies",
  description: "Chicken stock purchase",
  date: "2026-02-04",
  createdAt: Timestamp,
  createdBy: "adminxyz789",
  createdByName: "Admin"
}
```

**Indexes Required:**
- `date` (Ascending) + `createdAt` (Descending)
- `date` (Ascending) + `createdBy` (Ascending) + `createdAt` (Descending)

---

### 4. `cashReconciliation`
Stores daily cash reconciliation records.

**Document ID:** Auto-generated

**Fields:**
```javascript
{
  date: string,               // Date in YYYY-MM-DD format
  expectedCash: number,       // Expected cash based on sales
  actualCash: number,         // Actual cash counted
  difference: number,         // actualCash - expectedCash
  notes: string,              // Optional notes
  reconciledAt: timestamp,    // Timestamp of reconciliation
  reconciledBy: string,       // UID of user who reconciled
  reconciledByName: string    // Display name of reconciler
}
```

**Example:**
```javascript
{
  date: "2026-02-04",
  expectedCash: 3240.00,
  actualCash: 3250.00,
  difference: 10.00,
  notes: "Extra 10 from tip jar",
  reconciledAt: Timestamp,
  reconciledBy: "adminxyz789",
  reconciledByName: "Admin"
}
```

**Indexes Required:**
- `date` (Ascending)

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own document
      allow read: if isAuthenticated() && request.auth.uid == userId;
      // Only admins can write user documents
      allow write: if isAdmin();
    }
    
    // Sales collection
    match /sales/{saleId} {
      // All authenticated users can read sales
      allow read: if isAuthenticated();
      // All authenticated users can create sales
      allow create: if isAuthenticated() && 
                       request.resource.data.createdBy == request.auth.uid;
      // Users can only update their own sales, admins can update all
      allow update, delete: if isAuthenticated() && 
                                (resource.data.createdBy == request.auth.uid || isAdmin());
    }
    
    // Expenses collection
    match /expenses/{expenseId} {
      // All authenticated users can read expenses
      allow read: if isAuthenticated();
      // All authenticated users can create expenses
      allow create: if isAuthenticated() && 
                       request.resource.data.createdBy == request.auth.uid;
      // Only admins can update/delete expenses
      allow update, delete: if isAdmin();
    }
    
    // Cash reconciliation collection
    match /cashReconciliation/{reconId} {
      // Only admins can read/write cash reconciliation
      allow read, write: if isAdmin();
    }
  }
}
```

---

## Creating Composite Indexes

You need to create these composite indexes in Firebase Console:

### For Sales Collection:
1. Go to Firestore → Indexes
2. Create index:
   - Collection: `sales`
   - Fields: `date` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

3. Create index:
   - Collection: `sales`
   - Fields: `date` (Ascending), `createdBy` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

### For Expenses Collection:
1. Create index:
   - Collection: `expenses`
   - Fields: `date` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

2. Create index:
   - Collection: `expenses`
   - Fields: `date` (Ascending), `createdBy` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

### For Cash Reconciliation Collection:
1. Create index:
   - Collection: `cashReconciliation`
   - Fields: `date` (Ascending)
   - Query scope: Collection

---

## Sample Data for Testing

You can use this data to test the dashboard:

### Sample Sale:
```javascript
{
  amount: 325.50,
  paymentMethod: "cash",
  description: "Fried Chicken Meal",
  date: "2026-02-04",  // Use today's date
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  createdBy: "YOUR_USER_UID",
  createdByName: "Store Staff"
}
```

### Sample Expense:
```javascript
{
  amount: 450.00,
  category: "supplies",
  description: "Cooking oil",
  date: "2026-02-04",  // Use today's date
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  createdBy: "YOUR_USER_UID",
  createdByName: "Admin"
}
```

### Sample Cash Reconciliation:
```javascript
{
  date: "2026-02-04",  // Use today's date
  expectedCash: 1500.00,
  actualCash: 1505.00,
  difference: 5.00,
  notes: "Small surplus",
  reconciledAt: firebase.firestore.FieldValue.serverTimestamp(),
  reconciledBy: "YOUR_USER_UID",
  reconciledByName: "Admin"
}
```

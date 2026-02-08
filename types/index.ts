export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface Sale {
  id?: string;
  date: string;
  cashSales: number;
  upiSales: number;
  totalSales: number;
  createdAt: Date;
  createdBy: string;
}

export interface Expense {
  id?: string;
  date: string;
  category: 'Chicken' | 'Oil' | 'Masala' | 'Gas' | 'Wages' | 'Other';
  amount: number;
  paymentMode: 'Cash' | 'UPI';
  billPhotoUrl?: string;
  createdAt: Date;
  createdBy: string;
}

export interface CashReconciliation {
  id?: string;
  date: string;
  openingCash: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  difference: number;
  createdAt: Date;
  createdBy: string;
}

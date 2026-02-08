'use client';

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800">
      <main className="text-center max-w-4xl">
        <div className="mb-8">
          <div className="text-8xl mb-4">🍗</div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-orange-600 dark:text-orange-400">
            Crunchy Times
          </h1>
          <p className="text-xl md:text-2xl mb-2 text-gray-700 dark:text-gray-300">
            Fried Chicken Shop Management System
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Track sales, manage expenses, and reconcile cash - all in one place
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link 
            href="/login" 
            className="px-8 py-4 bg-orange-600 text-white text-lg font-semibold rounded-lg hover:bg-orange-700 transition shadow-lg hover:shadow-xl"
          >
            🔐 Login to Your Account
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold mb-2">Dashboard</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time overview of sales, expenses, and profit
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-xl font-bold mb-2">Sales Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Record cash and UPI sales with detailed logs
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-3">💵</div>
            <h3 className="text-xl font-bold mb-2">Cash Control</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Daily cash reconciliation with automatic calculations
            </p>
          </div>
        </div>

        <div className="mt-12 text-sm text-gray-500 dark:text-gray-500">
          <p>Built with Next.js & Supabase • Secured with role-based access</p>
        </div>
      </main>
    </div>
  );
}

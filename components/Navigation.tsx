'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-orange-600 text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold">
            🍗 Crunchy Times
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/sales" className="hover:underline">
              Sales
            </Link>
            <Link href="/expenses" className="hover:underline">
              Expenses
            </Link>
            {user.role === 'admin' && (
              <Link href="/cash" className="hover:underline">
                Cash
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            {user.email} ({user.role})
          </span>
          <button
            onClick={handleSignOut}
            className="bg-white text-orange-600 px-4 py-2 rounded hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

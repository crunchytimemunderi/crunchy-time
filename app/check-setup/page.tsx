'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CheckSetupPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  // Get auth state without using context
  useEffect(() => {
    const getAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(data.session.user);
        
        // Get user data from users table
        const { data: userInfo } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
        
        setUserData(userInfo);
      }
    };
    getAuth();
  }, []);

  const runChecks = async () => {
    setLoading(true);
    const checks: any[] = [];

    // Check 1: User authentication
    checks.push({
      name: 'User Authentication',
      status: user ? '✅ Logged in' : '❌ Not logged in',
      details: user ? `User ID: ${user.id}` : 'Please log in first'
    });

    // Check 2: User data and role
    checks.push({
      name: 'User Role',
      status: userData?.role ? `✅ Role: ${userData.role}` : '❌ No role set',
      details: userData?.role === 'admin' ? 'Admin access granted' : 'Need admin role for inventory'
    });

    // Check 3: Inventory table exists
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('count')
        .limit(1);
      
      if (error) {
        checks.push({
          name: 'Inventory Table',
          status: '❌ Table not found',
          details: `Error: ${error.message}`
        });
      } else {
        checks.push({
          name: 'Inventory Table',
          status: '✅ Table exists',
          details: 'Inventory table is created'
        });
      }
    } catch (err: any) {
      checks.push({
        name: 'Inventory Table',
        status: '❌ Error checking table',
        details: err.message
      });
    }

    // Check 4: Can read inventory
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .limit(1);
      
      if (error) {
        checks.push({
          name: 'Read Permission',
          status: '❌ Cannot read inventory',
          details: `Error: ${error.message}`
        });
      } else {
        checks.push({
          name: 'Read Permission',
          status: '✅ Can read inventory',
          details: `Found ${data?.length || 0} items`
        });
      }
    } catch (err: any) {
      checks.push({
        name: 'Read Permission',
        status: '❌ Error',
        details: err.message
      });
    }

    // Check 5: Can insert inventory (test)
    try {
      const testItem = {
        item_name: `TEST_${Date.now()}`,
        category: 'other',
        unit_price: 1.00,
        stock_quantity: 1.00,
        unit: 'piece'
      };

      const { data, error } = await supabase
        .from('inventory')
        .insert([testItem])
        .select();
      
      if (error) {
        checks.push({
          name: 'Insert Permission',
          status: '❌ Cannot insert',
          details: `Error: ${error.message}`
        });
      } else {
        checks.push({
          name: 'Insert Permission',
          status: '✅ Can insert',
          details: 'Successfully added test item (will delete)'
        });

        // Clean up test item
        if (data && data[0]) {
          await supabase.from('inventory').delete().eq('id', data[0].id);
        }
      }
    } catch (err: any) {
      checks.push({
        name: 'Insert Permission',
        status: '❌ Error',
        details: err.message
      });
    }

    setResults(checks);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-4">🔍 Setup Check</h1>
          <p className="text-gray-600 mb-6">
            This page checks if your inventory system is set up correctly.
          </p>

          <button
            onClick={runChecks}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 disabled:opacity-50 mb-6"
          >
            {loading ? 'Running Checks...' : 'Run Setup Checks'}
          </button>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((check, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{check.name}</h3>
                    <span className="text-lg">{check.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{check.details}</p>
                </div>
              ))}

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold mb-2">📋 Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>If &quot;Inventory Table&quot; is ❌: Run the SQL from INVENTORY_SETUP.md in Supabase SQL Editor</li>
                  <li>If &quot;User Role&quot; is not admin: Run this SQL:
                    <pre className="bg-gray-800 text-white p-2 rounded mt-1 text-xs overflow-x-auto">
                      {`UPDATE users SET role = 'admin' WHERE id = '${user?.id}';`}
                    </pre>
                    Then log out and log back in.
                  </li>
                  <li>If &quot;Insert Permission&quot; is ❌: Make sure you&apos;ve set your role to &apos;admin&apos; and logged out/in</li>
                </ol>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

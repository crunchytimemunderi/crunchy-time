'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Debug() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...\n\n');
    
    try {
      // Test 1: Check Supabase connection
      setResult(prev => prev + '✓ Supabase client initialized\n');
      
      // Test 2: Try to fetch from users table
      setResult(prev => prev + 'Fetching users table...\n');
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (usersError) {
        setResult(prev => prev + `✗ Error fetching users: ${usersError.message}\n`);
      } else {
        setResult(prev => prev + `✓ Users table exists. Found ${users?.length || 0} users\n`);
        setResult(prev => prev + `Users: ${JSON.stringify(users, null, 2)}\n\n`);
      }
      
      // Test 3: Check current session
      setResult(prev => prev + 'Checking auth session...\n');
      const { data: session } = await supabase.auth.getSession();
      
      if (session.session) {
        setResult(prev => prev + `✓ Logged in as: ${session.session.user.email}\n`);
        setResult(prev => prev + `User ID: ${session.session.user.id}\n\n`);
      } else {
        setResult(prev => prev + '✗ No active session\n\n');
      }
      
      setResult(prev => prev + '✓ All tests complete!');
      
    } catch (error: any) {
      setResult(prev => prev + `\n✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing login...\n\n');
    
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    
    try {
      setResult(prev => prev + 'Step 1: Authenticating...\n');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        setResult(prev => prev + `✗ Auth error: ${authError.message}\n`);
        setLoading(false);
        return;
      }
      
      setResult(prev => prev + `✓ Auth successful! User ID: ${authData.user.id}\n\n`);
      
      setResult(prev => prev + 'Step 2: Fetching user data from users table...\n');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (userError) {
        setResult(prev => prev + `✗ User data error: ${userError.message}\n`);
        setResult(prev => prev + `Error details: ${JSON.stringify(userError, null, 2)}\n`);
      } else if (userData) {
        setResult(prev => prev + `✓ User data found!\n`);
        setResult(prev => prev + `User: ${JSON.stringify(userData, null, 2)}\n`);
      } else {
        setResult(prev => prev + `✗ No user data found for ID: ${authData.user.id}\n`);
      }
      
    } catch (error: any) {
      setResult(prev => prev + `\n✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Debug Page</h1>
        
        <div className="space-y-6">
          {/* Test Connection */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Test Database Connection</h2>
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Connection Test'}
            </button>
          </div>

          {/* Test Login */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Test Login</h2>
            <div className="space-y-4 mb-4">
              <input
                id="email"
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-md dark:bg-gray-700"
              />
              <input
                id="password"
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-md dark:bg-gray-700"
              />
            </div>
            <button
              onClick={testLogin}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Login'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow-lg font-mono text-sm">
              <pre className="whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

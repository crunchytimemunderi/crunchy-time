'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function TestLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    
    // Step 1: Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      alert('Auth Error: ' + authError.message);
      setLoading(false);
      return;
    }

    // Step 2: Fetch user info from your `users` table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    setLoading(false);

    if (userError) {
      alert('User data not found in users table: ' + userError.message);
      return;
    }
    
    alert(`✅ Login successful!\nName: ${userData.display_name}\nRole: ${userData.role}\nEmail: ${userData.email}`);
  };

  const handleSignup = async () => {
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    
    setLoading(false);
    
    if (error) {
      alert('Signup Error: ' + error.message);
    } else {
      alert('✅ Signup successful! User ID: ' + data.user?.id + '\n\nNow add this user to the users table with:\n\nINSERT INTO users (id, email, display_name, role)\nVALUES (\'' + data.user?.id + '\', \'' + email + '\', \'Your Name\', \'staff\');');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">🔐 Test Login</h1>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Test Login'}
          </button>
          
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Test Signup'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> After signup, you must manually add the user to the <code>users</code> table in Supabase with their role (admin/staff).
          </p>
        </div>
      </div>
    </div>
  );
}

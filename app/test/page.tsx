'use client';

import { supabase } from '@/lib/supabase';

export default function Test() {
  const handleTest = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) alert(error.message);
    else alert(JSON.stringify(data, null, 2));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>
        <button 
          onClick={handleTest}
          className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
        >
          Test Supabase Connection
        </button>
        <p className="mt-4 text-sm text-gray-600">
          Click to fetch users from the database
        </p>
      </div>
    </div>
  );
}

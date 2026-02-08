'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatTime, getCurrentDate } from '@/utils/formatting';
import { validateAmount } from '@/utils/validation';
import { formatINR } from '@/lib/currency';

interface Sale {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'upi';
  description: string;
  date: string;
  createdAt: any;
  createdBy: string;
  createdByName: string;
}

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit_price: number;
  stock_quantity: number;
  unit: string;
}

function SalesContent() {
  const { user, userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [useInventory, setUseInventory] = useState(false);

  const isAdmin = userData?.role === 'admin';
  const today = getCurrentDate();

  // Fetch inventory items
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('item_name');
      
      if (!error && data) {
        setInventoryItems(data);
      }
    };
    fetchInventory();
  }, []);

  // Fetch sales for selected date
  useEffect(() => {
    if (!user) return;

    const fetchAndSubscribe = async () => {
      // Fetch initial data
      let salesQuery = supabase
        .from('sales')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });
      
      if (!isAdmin) {
        salesQuery = salesQuery.eq('created_by', user.id);
      }

      const { data, error } = await salesQuery;
      if (error) {
        console.error('Error fetching sales:', error);
        showMessage('error', 'Failed to load sales data');
      } else {
        setSales((data || []).map(s => ({
          id: s.id,
          amount: s.amount,
          paymentMethod: s.payment_method,
          description: s.description,
          date: s.date,
          createdAt: s.created_at,
          createdBy: s.created_by,
          createdByName: s.created_by_name
        })));
      }

      // Subscribe to realtime changes
      const channel = supabase
        .channel('sales-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sales',
            filter: `date=eq.${selectedDate}`
          },
          async () => {
            // Refetch on any change
            let query = supabase
              .from('sales')
              .select('*')
              .eq('date', selectedDate)
              .order('created_at', { ascending: false });
            
            if (!isAdmin) {
              query = query.eq('created_by', user.id);
            }

            const { data } = await query;
            setSales((data || []).map(s => ({
              id: s.id,
              amount: s.amount,
              paymentMethod: s.payment_method,
              description: s.description,
              date: s.date,
              createdAt: s.created_at,
              createdBy: s.created_by,
              createdByName: s.created_by_name
            })));
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    fetchAndSubscribe();
  }, [user, selectedDate, isAdmin]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!validateAmount(amount)) {
      showMessage('error', 'Please enter a valid amount greater than 0');
      return;
    }

    // Staff can only enter today's sales
    if (!isAdmin && selectedDate !== today) {
      showMessage('error', 'Staff can only enter sales for today');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        description: description.trim(),
        date: selectedDate,
        created_at: new Date().toISOString(),
        created_by: user!.id,
        created_by_name: userData!.displayName
      };

      const { error } = await supabase.from('sales').insert([saleData]);
      
      if (error) throw error;

      showMessage('success', `Sale of ${formatINR(parseFloat(amount))} recorded successfully!`);
      
      // Reset form
      setAmount('');
      setDescription('');
      setSelectedItem('');
      setQuantity('');
      setUseInventory(false);
    } catch (error: any) {
      console.error('Error saving sale:', error);
      showMessage('error', error.message || 'Failed to save sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (saleId: string) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;

    try {
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      
      if (error) throw error;
      
      showMessage('success', 'Sale deleted successfully');
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      showMessage('error', 'Failed to delete sale');
    }
  };

  // Calculate totals
  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.amount, 0);
  const upiSales = sales.filter(s => s.paymentMethod === 'upi').reduce((sum, s) => sum + s.amount, 0);
  const totalSales = cashSales + upiSales;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold">💰 Daily Sales Entry</h1>
          <Link 
            href="/dashboard" 
            className="text-red-600 hover:underline self-start md:self-auto font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Sale Entry Form */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Record New Sale</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Date Selection */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium mb-2">
                  Date {!isAdmin && <span className="text-gray-500">(Today only)</span>}
                </label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={today}
                  disabled={!isAdmin}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Inventory Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useInventory}
                    onChange={(e) => {
                      setUseInventory(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedItem('');
                        setQuantity('');
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Select from Inventory</span>
                </label>
              </div>

              {useInventory ? (
                <>
                  {/* Item Selection */}
                  <div>
                    <label htmlFor="item" className="block text-sm font-medium mb-2">
                      Select Item *
                    </label>
                    <select
                      id="item"
                      value={selectedItem}
                      onChange={(e) => {
                        setSelectedItem(e.target.value);
                        const item = inventoryItems.find(i => i.id === e.target.value);
                        if (item && quantity) {
                          setAmount((parseFloat(quantity) * item.unit_price).toFixed(2));
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                      required
                      disabled={loading}
                    >
                      <option value="">-- Choose an item --</option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.item_name} ({formatINR(item.unit_price)}/{item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      step="0.01"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        const item = inventoryItems.find(i => i.id === selectedItem);
                        if (item && e.target.value) {
                          setAmount((parseFloat(e.target.value) * item.unit_price).toFixed(2));
                          setDescription(`${e.target.value} ${item.unit} of ${item.item_name}`);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                      required
                      disabled={loading || !selectedItem}
                    />
                    {selectedItem && (
                      <p className="text-xs text-gray-500 mt-1">
                        Unit: {inventoryItems.find(i => i.id === selectedItem)?.unit}
                      </p>
                    )}
                  </div>

                  {/* Auto-calculated Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Sale Amount (₹)
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 font-bold text-lg">
                      {formatINR(amount || 0)}
                    </div>
                  </div>
                </>
              ) : (
                /* Manual Amount Entry */
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-2">
                    Sale Amount (₹) *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-4 border-2 rounded-lg font-medium transition ${
                      paymentMethod === 'cash'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700'
                    }`}
                    disabled={loading}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-4 border-2 rounded-lg font-medium transition ${
                      paymentMethod === 'upi'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                    disabled={loading}
                  >
                    📱 UPI
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., 2 Chicken Combos, 1 Burger"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  rows={3}
                  disabled={loading}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">{description.length}/200 characters</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                {loading ? 'Saving...' : '✓ Record Sale'}
              </button>
            </form>
          </div>

          {/* Sales Summary & List */}
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Cash</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatINR(cashSales)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {sales.filter(s => s.paymentMethod === 'cash').length} sales
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">UPI</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatINR(upiSales)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {sales.filter(s => s.paymentMethod === 'upi').length} sales
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Total</p>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatINR(totalSales)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{sales.length} sales</p>
              </div>
            </div>

            {/* Sales List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">
                Sales for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              
              {sales.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-2">📊</p>
                  <p>No sales recorded for this date</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sales.map((sale) => (
                    <div 
                      key={sale.id} 
                      className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-lg text-green-600 dark:text-green-400">
                            {formatINR(sale.amount)}
                          </p>
                          {sale.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {sale.description}
                            </p>
                          )}
                          {isAdmin && (
                            <p className="text-xs text-gray-500 mt-1">
                              By: {sale.createdByName}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
                            sale.paymentMethod === 'cash' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {sale.paymentMethod === 'cash' ? '💵 Cash' : '📱 UPI'}
                          </span>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTime(sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date())}
                          </p>
                          {(isAdmin || sale.createdBy === user?.id) && (
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-2"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  return (
    <ProtectedRoute>
      <SalesContent />
    </ProtectedRoute>
  );
}

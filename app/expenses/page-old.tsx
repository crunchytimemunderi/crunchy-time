'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatTime, getCurrentDate } from '@/utils/formatting';
import { validateAmount } from '@/utils/validation';
import { formatINR } from '@/lib/currency';

interface Expense {
  id: string;
  amount: number;
  category: string;
  paymentMode: 'cash' | 'upi';
  description: string;
  billPhotoURL?: string;
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

const CATEGORIES = [
  { value: 'chicken', label: '🍗 Chicken', emoji: '🍗' },
  { value: 'oil', label: '🛢️ Oil', emoji: '🛢️' },
  { value: 'masala', label: '🌶️ Masala', emoji: '🌶️' },
  { value: 'gas', label: '🔥 Gas', emoji: '🔥' },
  { value: 'wages', label: '👤 Wages', emoji: '👤' },
  { value: 'other', label: '📦 Other', emoji: '📦' },
];

function ExpensesContent() {
  const { user, userData, hasRole } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('chicken');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [billPhoto, setBillPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [useInventory, setUseInventory] = useState(false);

  const isAdmin = hasRole('admin');
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

  // Fetch expenses for selected date
  useEffect(() => {
    if (!user) return;

    const fetchAndSubscribe = async () => {
      // Fetch initial data
      let expensesQuery = supabase
        .from('expenses')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });
      
      if (!isAdmin) {
        expensesQuery = expensesQuery.eq('created_by', user.id);
      }

      const { data, error } = await expensesQuery;
      if (error) {
        console.error('Error fetching expenses:', error);
        showMessage('error', 'Failed to load expenses data');
      } else {
        setExpenses((data || []).map(e => ({
          id: e.id,
          amount: e.amount,
          category: e.category,
          paymentMode: e.payment_mode,
          description: e.description,
          billPhotoURL: e.bill_photo_url,
          date: e.date,
          createdAt: e.created_at,
          createdBy: e.created_by,
          createdByName: e.created_by_name
        })));
      }

      // Subscribe to realtime changes
      const channel = supabase
        .channel('expenses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
            filter: `date=eq.${selectedDate}`
          },
          async () => {
            // Refetch on any change
            let query = supabase
              .from('expenses')
              .select('*')
              .eq('date', selectedDate)
              .order('created_at', { ascending: false });
            
            if (!isAdmin) {
              query = query.eq('created_by', user.id);
            }

            const { data } = await query;
            setExpenses((data || []).map(e => ({
              id: e.id,
              amount: e.amount,
              category: e.category,
              paymentMode: e.payment_mode,
              description: e.description,
              billPhotoURL: e.bill_photo_url,
              date: e.date,
              createdAt: e.created_at,
              createdBy: e.created_by,
              createdByName: e.created_by_name
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image size must be less than 5MB');
      return;
    }

    setBillPhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!billPhoto) return null;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const filename = `bills/${user!.id}/${timestamp}_${billPhoto.name}`;
      
      const { data, error } = await supabase.storage
        .from('expense-bills')
        .upload(filename, billPhoto, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('expense-bills')
        .getPublicUrl(filename);
      
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      throw new Error('Failed to upload photo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!validateAmount(amount)) {
      showMessage('error', 'Please enter a valid amount greater than 0');
      return;
    }

    if (!description.trim()) {
      showMessage('error', 'Please enter a description');
      return;
    }

    // Staff can only enter today's expenses
    if (!isAdmin && selectedDate !== today) {
      showMessage('error', 'Staff can only enter expenses for today');
      return;
    }

    setLoading(true);

    try {
      // Upload photo if exists
      let billPhotoURL: string | undefined = undefined;
      if (billPhoto) {
        billPhotoURL = await uploadPhoto() || undefined;
      }

      const expenseData = {
        amount: parseFloat(amount),
        category,
        payment_mode: paymentMode,
        description: description.trim(),
        bill_photo_url: billPhotoURL,
        date: selectedDate,
        created_at: new Date().toISOString(),
        created_by: user!.id,
        created_by_name: userData!.displayName
      };

      const { error } = await supabase.from('expenses').insert([expenseData]);
      
      if (error) throw error;

      // Reset form
      setAmount('');
      setDescription('');
      setBillPhoto(null);
      setPhotoPreview(null);
      setSelectedItem('');
      setQuantity('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      showMessage('success', `Expense of ${formatINR(parseFloat(amount))} recorded successfully!`);
      
      // Auto-fill description if using inventory
      if (useInventory && selectedItem) {
        const item = inventoryItems.find(i => i.id === selectedItem);
        if (item) {
          setDescription(`${quantity} ${item.unit} of ${item.item_name}`);
        }
      }
    } catch (error: any) {
      console.error('Error saving expense:', error);
      showMessage('error', error.message || 'Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      
      if (error) throw error;
      
      showMessage('success', 'Expense deleted successfully');
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      showMessage('error', 'Failed to delete expense');
    }
  };

  const removePhoto = () => {
    setBillPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculate totals
  const cashExpenses = expenses.filter(e => e.paymentMode === 'cash').reduce((sum, e) => sum + e.amount, 0);
  const upiExpenses = expenses.filter(e => e.paymentMode === 'upi').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = cashExpenses + upiExpenses;

  // Group by category
  const categoryTotals = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0),
    count: expenses.filter(e => e.category === cat.value).length
  })).filter(cat => cat.total > 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold">📝 Expense Entry</h1>
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
          {/* Expense Entry Form */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Record New Expense</h2>
            
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

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  required
                  disabled={loading}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
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
                        setAmount('');
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
                        if (item) {
                          setCategory(item.category);
                          if (quantity) {
                            setAmount((parseFloat(quantity) * item.unit_price).toFixed(2));
                          }
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
                      Amount (₹)
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
                    Amount (₹) *
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

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`p-4 border-2 rounded-lg font-medium transition ${
                      paymentMode === 'cash'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700'
                    }`}
                    disabled={loading}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`p-4 border-2 rounded-lg font-medium transition ${
                      paymentMode === 'upi'
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
                  Description *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., 50kg chicken from supplier"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  rows={3}
                  disabled={loading}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{description.length}/200 characters</p>
              </div>

              {/* Bill Photo Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bill Photo (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={loading || uploading}
                />
                
                {!photoPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition text-gray-600 dark:text-gray-400"
                    disabled={loading || uploading}
                  >
                    <div className="text-center">
                      <p className="text-4xl mb-2">📷</p>
                      <p className="font-medium">Click to upload bill photo</p>
                      <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </button>
                ) : (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Bill preview" 
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition"
                      disabled={loading || uploading}
                    >
                      ✕
                    </button>
                    {billPhoto && (
                      <p className="text-xs text-gray-500 mt-2">
                        {billPhoto.name} ({(billPhoto.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || uploading}
                className="w-full bg-red-600 text-white py-3 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                {loading ? (uploading ? 'Uploading photo...' : 'Saving...') : '✓ Record Expense'}
              </button>
            </form>
          </div>

          {/* Expenses Summary & List */}
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Cash</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatINR(cashExpenses)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {expenses.filter(e => e.paymentMode === 'cash').length} expenses
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">UPI</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatINR(upiExpenses)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {expenses.filter(e => e.paymentMode === 'upi').length} expenses
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-2 border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Total</p>
                <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatINR(totalExpenses)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{expenses.length} expenses</p>
              </div>
            </div>

            {/* Category Breakdown */}
            {categoryTotals.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-bold mb-4">By Category</h3>
                <div className="space-y-2">
                  {categoryTotals.map(cat => (
                    <div key={cat.value} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium">{cat.label}</span>
                      <div className="text-right">
                        <p className="font-bold text-red-600 dark:text-red-400">{formatINR(cat.total)}</p>
                        <p className="text-xs text-gray-500">{cat.count} {cat.count === 1 ? 'expense' : 'expenses'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">
                Expenses for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              
              {expenses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-2">💸</p>
                  <p>No expenses recorded for this date</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expenses.map((expense) => (
                    <div 
                      key={expense.id} 
                      className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">
                              {CATEGORIES.find(c => c.value === expense.category)?.emoji || '📦'}
                            </span>
                            <p className="font-bold text-lg text-red-600 dark:text-red-400">
                              {formatINR(expense.amount)}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {CATEGORIES.find(c => c.value === expense.category)?.label.split(' ')[1] || expense.category}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {expense.description}
                          </p>
                          {isAdmin && (
                            <p className="text-xs text-gray-500 mt-1">
                              By: {expense.createdByName}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
                            expense.paymentMode === 'cash' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {expense.paymentMode === 'cash' ? '💵 Cash' : '📱 UPI'}
                          </span>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTime(expense.createdAt?.toDate ? expense.createdAt.toDate() : new Date())}
                          </p>
                        </div>
                      </div>
                      
                      {/* Bill Photo Thumbnail */}
                      {expense.billPhotoURL && (
                        <div className="mt-3">
                          <a 
                            href={expense.billPhotoURL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img 
                              src={expense.billPhotoURL} 
                              alt="Bill" 
                              className="h-20 w-auto rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer"
                            />
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">View full size →</p>
                          </a>
                        </div>
                      )}

                      {/* Delete Button */}
                      {(isAdmin || expense.createdBy === user?.id) && (
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mt-3"
                        >
                          Delete
                        </button>
                      )}
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

export default function ExpensesPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ExpensesContent />
    </ProtectedRoute>
  );
}

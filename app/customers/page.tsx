"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2,
  ShoppingCart, X, Save, ChevronDown, TrendingUp, Calendar,
  LayoutGrid, ArrowLeft, ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { notifications } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { getCurrentDate, toLocalDateString } from "@/utils/formatting";
import { formatINR } from "@/lib/currency";
import PremiumLoader from "@/components/PremiumLoader";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
}

interface Sale {
  id: string;
  amount: number;
  payment_method: string;
  description: string;
  date: string;
  created_at: string;
}

function CustomersContent() {
  const router = useRouter();
  const { user, userData, hasPermission, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => getCurrentDate());
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const isAdmin = userData?.role === "admin";

  useEffect(() => {
    if (!authLoading && user) {
      if (!userData) return;
      if (!hasPermission("canViewDashboard")) {
        router.push("/dashboard");
      }
    }
  }, [userData, user, router, authLoading, hasPermission]);

  useEffect(() => {
    if (user && userData) {
      fetchCustomers();
    }
  }, [user, userData]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("total_orders", { ascending: false });
      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      logger.error("Error fetching customers:", err);
      notifications.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormNotes("");
    setShowAddForm(false);
    setEditingCustomer(null);
  };

  const handleSaveCustomer = async () => {
    if (!formName.trim()) {
      notifications.error("Name is required");
      return;
    }
    if (!user || !userData) return;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
        created_by: user.id,
        created_by_name: userData.displayName,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", editingCustomer.id);
        if (error) throw error;
        notifications.success("Customer updated");
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
        notifications.success("Customer added");
      }
      resetForm();
      fetchCustomers();
    } catch (err: any) {
      if (err.code === "23505") {
        notifications.error("Phone number already exists");
      } else {
        notifications.error("Failed to save customer");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone || "");
    setFormEmail(customer.email || "");
    setFormAddress(customer.address || "");
    setFormNotes(customer.notes || "");
    setShowAddForm(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Delete this customer? Their order history will be preserved.")) return;
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      notifications.success("Customer deleted");
      fetchCustomers();
    } catch (err: any) {
      notifications.error("Failed to delete customer");
    }
  };

  const handleViewCustomer = async (customer: Customer) => {
    setViewingCustomer(customer);
    setLoadingSales(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("customer_id", customer.id)
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw error;
      setCustomerSales(data || []);
    } catch (err: any) {
      logger.error("Error fetching customer sales:", err);
    } finally {
      setLoadingSales(false);
    }
  };

  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <PremiumLoader icon="bag" message="Loading customers..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 font-inter text-slate-200">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8">

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
            <div className="flex items-center gap-5 mb-4">
              <div className="w-14 h-14 bg-crispy-gradient rounded-2xl flex items-center justify-center shadow-3xl shadow-red-500/20 transform -rotate-6 border border-white/20 text-white">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-outfit font-black text-white tracking-tight uppercase leading-none italic">Customers</h1>
                <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {customers.length} REGISTERED
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 20 }} className="flex items-center gap-3">
            <button
              onClick={() => { resetForm(); setShowAddForm(true); }}
              className="px-6 py-4 bg-crispy-gradient text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          </motion.div>
        </header>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all font-medium"
          />
        </div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-8 border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-outfit font-black text-white uppercase italic">
                    {editingCustomer ? "Edit Customer" : "New Customer"}
                  </h3>
                  <button onClick={resetForm} className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Name *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Customer name" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Phone</label>
                    <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email</label>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Address</label>
                    <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Delivery address" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Preferences, allergies, etc." rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none" />
                </div>
                <button onClick={handleSaveCustomer} disabled={saving || !formName.trim()} className="w-full py-5 bg-crispy-gradient text-white rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-30">
                  <Save className="w-6 h-6" />
                  {saving ? "SAVING..." : editingCustomer ? "UPDATE CUSTOMER" : "ADD CUSTOMER"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customer List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <PremiumLoader message="Loading customers..." className="!gap-4" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="glass-card p-16 text-center space-y-4 border-white/5">
              <Users className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
              <h4 className="text-xl font-outfit font-black text-white uppercase italic">No Customers Yet</h4>
              <p className="text-sm text-muted-foreground">Add your first customer to start tracking orders</p>
            </div>
          ) : (
            filteredCustomers.map((customer, idx) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="glass-card p-6 border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-crispy-gradient flex items-center justify-center text-white font-black text-lg shrink-0">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-outfit font-black text-white uppercase italic truncate">{customer.name}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {customer.phone && (
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />{customer.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-center">
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Orders</p>
                        <p className="text-lg font-outfit font-black text-white">{customer.total_orders}</p>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Spent</p>
                        <p className="text-lg font-outfit font-black text-green-400">{formatINR(customer.total_spent)}</p>
                      </div>
                      {customer.last_order_date && (
                        <>
                          <div className="w-px h-8 bg-white/10" />
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Last Order</p>
                            <p className="text-xs font-bold text-muted-foreground">{new Date(customer.last_order_date).toLocaleDateString()}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewCustomer(customer)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-blue-400 hover:border-blue-500/30 transition-all" title="View Orders">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEditCustomer(customer)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white transition-all" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDeleteCustomer(customer.id)} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Customer Detail Modal */}
        <AnimatePresence>
          {viewingCustomer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setViewingCustomer(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden border-white/10 flex flex-col"
              >
                <div className="p-8 border-b border-white/10 bg-white/5 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-crispy-gradient flex items-center justify-center text-white font-black text-2xl">
                      {viewingCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-outfit font-black text-white uppercase italic">{viewingCustomer.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{viewingCustomer.phone || "N/A"}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />{viewingCustomer.total_orders} orders</span>
                        <span className="text-xs text-green-400 font-bold">{formatINR(viewingCustomer.total_spent)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setViewingCustomer(null)} className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {loadingSales ? (
                    <div className="py-12 text-center text-muted-foreground">Loading order history...</div>
                  ) : customerSales.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
                      <p className="text-sm text-muted-foreground">No orders found for this customer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerSales.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                          <div>
                            <p className="text-sm font-bold text-white">{sale.description}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{sale.date} • {sale.payment_method}</p>
                          </div>
                          <p className="text-base font-outfit font-black text-green-400">{formatINR(sale.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <CustomersContent />
    </ProtectedRoute>
  );
}

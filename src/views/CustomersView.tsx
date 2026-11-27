import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  AlertCircle,
  X,
  Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Customer, ROLE_PERMISSIONS } from '../types/store';
import { formatCurrency, resolveCurrencySymbol } from '../utils/currency';

export const CustomersView: React.FC = () => {
  const { customers, settings, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const { role } = useAuth();
  const rolePerm = ROLE_PERMISSIONS[role];

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = resolveCurrencySymbol(settings.currencySymbol);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim()
        });
      } else {
        await addCustomer({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim()
        });
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      setDeletingId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(c => 
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const totalSpentByAll = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Customer Directory &amp; CRM</h2>
          <p className="text-xs text-slate-400">
            Maintain customer contacts, track shopping frequency and lifetime value
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Total Customers</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">{customers.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Registered store patrons</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Customer Lifetime Value</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {formatCurrency(totalSpentByAll, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Total recorded sales volume</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Average Spend Per Customer</span>
          <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
            {formatCurrency(customers.length > 0 ? totalSpentByAll / customers.length : 0, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all registered accounts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing: <span className="font-semibold text-white">{filteredCustomers.length}</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No customers found. Click &quot;Add New Customer&quot; or register them during checkout.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Contact Details</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Orders</th>
                  <th className="py-2.5 px-3">Total Spend</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{cust.name}</div>
                      <div className="text-[10px] text-slate-500">ID: {cust.id.slice(0, 8)}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="space-y-0.5">
                        {cust.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                        {cust.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {cust.address || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px]">
                        {cust.totalPurchases || 0} orders
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(cust.totalSpent || 0, currency)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {cust.notes || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {rolePerm.canDeleteCore && (
                          <button
                            onClick={() => setDeletingId(cust.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Billing / Delivery Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State, ZIP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Notes / Preferences</label>
                <textarea
                  rows={2}
                  placeholder="Preferred items, account terms, or delivery notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Create Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100">
            <h4 className="font-bold text-base text-white mb-2">Delete Customer Record?</h4>
            <p className="text-xs text-slate-400 mb-4">
              This will remove the customer profile from your CRM. Existing sales receipts will retain customer names as captured at time of purchase.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

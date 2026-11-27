import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  AlertCircle, 
  X,
  Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Expense, ROLE_PERMISSIONS } from '../types/store';
import { formatCurrency, resolveCurrencySymbol } from '../utils/currency';

export const ExpensesView: React.FC = () => {
  const { expenses, settings, addExpense, deleteExpense } = useStore();
  const { user, profile, role } = useAuth();
  const rolePerm = ROLE_PERMISSIONS[role];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('Utilities');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = resolveCurrencySymbol(settings.currencySymbol);

  const categoriesList: Expense['category'][] = [
    'Rent',
    'Utilities',
    'Salaries',
    'Maintenance',
    'Supplies',
    'Marketing',
    'Other'
  ];

  const openCreateModal = () => {
    setTitle('');
    setCategory('Utilities');
    setAmount(0);
    setPaymentMethod('Card');
    setReference('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      setError('Title and valid amount (> 0) are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await addExpense({
        title: title.trim(),
        category,
        amount,
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
        date,
        createdBy: profile?.name || user?.displayName || user?.email || 'Staff'
      });

      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      setDeletingId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  const filteredExpenses = expenses.filter(e => {
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      e.title.toLowerCase().includes(q) || 
      (e.reference && e.reference.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Operating Expenses</h2>
          <p className="text-xs text-slate-400">
            Log overhead, rent, wages, utility invoices and operational spending
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Expense</span>
        </button>
      </div>

      {/* Expense Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Total Recorded Expenses</span>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
            {formatCurrency(totalExpenseAmount, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{expenses.length} invoices logged</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 col-span-2">
          <span className="text-[11px] uppercase font-semibold text-slate-400 block mb-2">Category Spending Breakdown</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categoriesList.slice(0, 4).map(cat => {
              const catTotal = expenses.filter(e => e.category === cat).reduce((acc, e) => acc + e.amount, 0);
              return (
                <div key={cat} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                  <span className="text-slate-400 block truncate">{cat}</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(catTotal, currency, 0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by expense title or invoice ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 hidden sm:inline">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">All Expense Categories</option>
            {categoriesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No expense records found. Click &quot;Log New Expense&quot; to record payments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Title / Expense Item</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Logged By</th>
                  {rolePerm.canDeleteCore && (
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      <div>{exp.title}</div>
                      {exp.notes && <div className="text-[10px] text-slate-500 font-normal">{exp.notes}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {exp.reference || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-400 text-sm">
                      -{formatCurrency(Math.abs(exp.amount), currency)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {exp.createdBy}
                    </td>
                    {rolePerm.canDeleteCore && (
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setDeletingId(exp.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">Log Store Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
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
                <label className="block text-slate-300 font-medium mb-1">Expense Title / Payee *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electric & Air Conditioning Bill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Expense['category'])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {categoriesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Card">Business Card</option>
                    <option value="Bank Transfer">Bank Transfer / ACH</option>
                    <option value="Cash">Cash Drawer</option>
                    <option value="Check">Check</option>
                    <option value="Digital">UPI / Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Invoice / Receipt Reference</label>
                <input
                  type="text"
                  placeholder="e.g. INV-9041, Check #1029"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Recording...' : 'Record Expense'}</span>
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
            <h4 className="font-bold text-base text-white mb-2">Delete Expense Entry?</h4>
            <p className="text-xs text-slate-400 mb-4">
              This will remove the expense from store financial accounts and re-calculate your net profit margin.
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

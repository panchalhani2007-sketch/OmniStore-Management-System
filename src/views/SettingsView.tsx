import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Store, 
  IndianRupee, 
  Percent, 
  FileText,
  Sparkles,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { testConnection } from '../firebase/config';
import { resolveCurrencySymbol } from '../utils/currency';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, seedInitialData } = useStore();
  const { role } = useAuth();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [currencySymbol, setCurrencySymbol] = useState(resolveCurrencySymbol(settings.currencySymbol));
  const [taxRate, setTaxRate] = useState(settings.taxRate);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);

  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  // Sync form fields whenever live settings update from Firestore
  useEffect(() => {
    setStoreName(settings.storeName);
    setAddress(settings.address);
    setPhone(settings.phone);
    setEmail(settings.email);
    setCurrencySymbol(resolveCurrencySymbol(settings.currencySymbol));
    setTaxRate(settings.taxRate);
    setReceiptFooter(settings.receiptFooter);
  }, [settings]);

  const canEdit = role === 'admin' || role === 'manager';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setMessage({ text: 'Only Admins or Managers can update store settings.', type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      await updateSettings({
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        currencySymbol: resolveCurrencySymbol(currencySymbol),
        taxRate: Number(taxRate) || 0,
        receiptFooter: receiptFooter.trim()
      });
      setMessage({ text: 'Settings updated successfully across all devices!', type: 'success' });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to save', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSeed = async () => {
    try {
      setShowSeedConfirm(false);
      setIsSeeding(true);
      setMessage(null);
      await seedInitialData();
      setMessage({ text: 'Initial store catalogue populated with sample merchandise!', type: 'success' });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Seeding failed', type: 'error' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleTestConnection = async () => {
    setDbStatus('Testing connection to Firebase Firestore...');
    const ok = await testConnection();
    if (ok) {
      setDbStatus('Connected successfully! Real-time synchronization is active.');
    } else {
      setDbStatus('Unable to verify server connection. Check network or Firestore rules.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Store Settings &amp; Configuration</h2>
        <p className="text-xs text-slate-400">
          Global parameters for invoices, tax computations, currency, and store metadata
        </p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Store Information</h3>
          </div>
          {canEdit && (
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Store / Business Name</label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Store Contact Phone</label>
            <input
              type="text"
              disabled={!canEdit}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Official Contact Email</label>
            <input
              type="email"
              disabled={!canEdit}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Store Physical Address</label>
            <input
              type="text"
              disabled={!canEdit}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Currency & Tax Section */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Currency &amp; Taxation (INR)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Currency Symbol</label>
              <input
                type="text"
                disabled={!canEdit}
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-base focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: ₹ (INR) — Indian Rupee</span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Default Sales Tax / GST Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={!canEdit}
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-base focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Applied to taxable order line items at checkout</span>
            </div>
          </div>
        </div>

        {/* Receipt Footer */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Receipt Footer Note</h3>
          </div>

          <div>
            <textarea
              rows={2}
              disabled={!canEdit}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Printed at the bottom of customer invoices and receipts</span>
          </div>
        </div>
      </form>

      {/* Database Management & Diagnostics */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Database className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Database &amp; Synchronizer Tools</h3>
        </div>

        <p className="text-slate-400 leading-relaxed">
          Your Store Management System connects directly to Firebase Cloud Firestore. All catalog additions, POS transactions, customer updates, and stock movements sync in real time across all open browser tabs and devices.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test Firestore Connection</span>
          </button>

          <button
            onClick={() => setShowSeedConfirm(true)}
            disabled={isSeeding}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-semibold border border-amber-500/30 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSeeding ? 'Seeding Data...' : 'Populate Sample Catalog Data'}</span>
          </button>
        </div>

        {dbStatus && (
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-indigo-300 font-mono text-[11px]">
            {dbStatus}
          </div>
        )}
      </div>

      {/* Inline Seed Confirmation Modal */}
      {showSeedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base text-white">Populate Sample Catalog?</h4>
              <button onClick={() => setShowSeedConfirm(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will write sample categories, products, suppliers, customers, and starter inventory records into Cloud Firestore. Existing records will not be deleted.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSeedConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSeed}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Confirm &amp; Seed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

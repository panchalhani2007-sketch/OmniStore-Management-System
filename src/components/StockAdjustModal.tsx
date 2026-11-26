import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, AlertCircle, Check } from 'lucide-react';
import { Product } from '../types/store';
import { useStore } from '../context/StoreContext';

interface StockAdjustModalProps {
  product: Product | null;
  onClose: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({ product, onClose }) => {
  const { adjustStock } = useStore();
  
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Physical Inventory Recount Correction');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const standardReasons = [
    'Physical Inventory Recount Correction',
    'Stock Received from Local Supplier',
    'Damaged / Broken in Store',
    'Expired Product Scrap',
    'Customer Return Restock',
    'Internal Store Demonstration / Display',
    'Inventory Shrinkage / Discrepancy',
    'Other (Enter custom reason)'
  ];

  const netChange = adjustmentType === 'add' ? quantity : -quantity;
  const projectedStock = Math.max(0, product.stock + netChange);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please enter a quantity greater than zero.');
      return;
    }

    const finalReason = reason === 'Other (Enter custom reason)' 
      ? (customReason.trim() || 'Manual stock adjustment') 
      : reason;

    try {
      setIsSubmitting(true);
      setError(null);
      await adjustStock(product.id, netChange, finalReason);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/40">
          <div>
            <h3 className="font-bold text-white text-base">Adjust Stock Level</h3>
            <p className="text-xs text-slate-400">Inventory movement will be logged to audit trail</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Product Summary */}
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-sm">{product.name}</p>
              <p className="text-xs text-slate-400 font-mono">SKU: {product.sku}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Current Stock</span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                product.stock === 0 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : product.stock <= product.minStockAlert 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {product.stock} {product.unit}
              </span>
            </div>
          </div>

          {/* Add or Deduct Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustmentType('add')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition ${
                adjustmentType === 'add'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Add Stock (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('remove')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition ${
                adjustmentType === 'remove'
                  ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
              <span>Deduct Stock (-)</span>
            </button>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Quantity to {adjustmentType === 'add' ? 'Add' : 'Deduct'}
            </label>
            <input
              type="number"
              min="1"
              value={quantity || ''}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-base focus:outline-hidden focus:border-indigo-500"
              required
            />
          </div>

          {/* New Resulting Stock preview */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-900/50 text-xs">
            <span className="text-indigo-300">Projected New Stock:</span>
            <span className="font-bold text-white text-sm font-mono">
              {projectedStock} {product.unit}
            </span>
          </div>

          {/* Reason Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
            >
              {standardReasons.map((r, i) => (
                <option key={i} value={r} className="bg-slate-900">{r}</option>
              ))}
            </select>
          </div>

          {reason === 'Other (Enter custom reason)' && (
            <div>
              <input
                type="text"
                placeholder="Specify reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Confirm Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

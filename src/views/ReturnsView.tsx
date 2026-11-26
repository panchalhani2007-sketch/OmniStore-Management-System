import React, { useState } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  AlertCircle, 
  Check, 
  X, 
  Receipt,
  Boxes
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { ReturnItem, Sale } from '../types/store';

interface ReturnsViewProps {
  initialSale?: Sale | null;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({ initialSale }) => {
  const { returns, sales, products, settings, processReturn } = useStore();
  const { user, profile } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Return Form State
  const [selectedSaleId, setSelectedSaleId] = useState(initialSale?.id || '');
  const [reason, setReason] = useState('Customer changed mind');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = settings.currencySymbol || '$';

  const selectedSale = sales.find(s => s.id === selectedSaleId) || initialSale;

  const openNewReturnModal = () => {
    setError(null);
    if (sales.length > 0 && !selectedSaleId) {
      handleSelectSale(sales[0].id);
    }
    setIsModalOpen(true);
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setReturnItems(
        sale.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: 1,
          refundUnitPrice: item.price,
          restockStock: true,
          condition: 'good'
        }))
      );
    } else {
      setReturnItems([]);
    }
  };

  const updateItemQty = (productId: string, qty: number) => {
    setReturnItems(prev =>
      prev.map(item => item.productId === productId ? { ...item, quantity: Math.max(0, qty) } : item)
    );
  };

  const toggleRestock = (productId: string) => {
    setReturnItems(prev =>
      prev.map(item => item.productId === productId ? { ...item, restockStock: !item.restockStock } : item)
    );
  };

  const totalRefund = returnItems.reduce((acc, item) => acc + (item.quantity * item.refundUnitPrice), 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeItems = returnItems.filter(i => i.quantity > 0);
    if (activeItems.length === 0) {
      setError('Please select at least 1 item to return.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

      await processReturn({
        returnNumber,
        saleId: selectedSale?.id || 'manual',
        saleNumber: selectedSale?.saleNumber || 'N/A',
        customerName: selectedSale?.customerName || 'Walk-in',
        totalRefund,
        reason,
        processedBy: profile?.name || user?.displayName || user?.email || 'Staff'
      }, activeItems);

      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReturns = returns.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    return !q || 
      r.returnNumber.toLowerCase().includes(q) || 
      r.saleNumber.toLowerCase().includes(q) || 
      r.customerName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Returns &amp; Refunds</h2>
          <p className="text-xs text-slate-400">
            Process item returns, restore healthy stock to inventory, and log customer refunds
          </p>
        </div>
        <button
          onClick={openNewReturnModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Process New Return</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search return # or sale invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Total Returns: <span className="font-semibold text-white">{returns.length}</span>
        </div>
      </div>

      {/* Returns Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        {filteredReturns.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No customer returns recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Return #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Sale Ref #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Returned Items</th>
                  <th className="py-2.5 px-3">Refund Amount</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {ret.returnNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(ret.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-indigo-300">
                      {ret.saleNumber}
                    </td>
                    <td className="py-3 px-3 font-medium text-white">
                      {ret.customerName}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="space-y-0.5">
                        {ret.items.map((i, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                            <span>{i.productName} (x{i.quantity})</span>
                            {i.restockStock ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                                Restocked
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400">
                                Scrapped
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-400">
                      -{currency}{ret.totalRefund.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {ret.reason}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {ret.processedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Return Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/40">
              <h3 className="font-bold text-white text-base">Process Customer Return &amp; Refund</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-5 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Select Sale */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Select Sale Invoice to Return Items From:
                </label>
                <select
                  value={selectedSaleId}
                  onChange={(e) => handleSelectSale(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="">-- Choose an Invoice --</option>
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.saleNumber} - {s.customerName} ({currency}{s.grandTotal.toFixed(2)}) - {new Date(s.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items from selected sale */}
              {selectedSale && returnItems.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                  <div className="font-semibold text-slate-200">Select Items &amp; Quantities to Return:</div>
                  <div className="space-y-2">
                    {returnItems.map(item => (
                      <div key={item.productId} className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{item.productName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Refund: {currency}{item.refundUnitPrice.toFixed(2)} each
                          </p>
                        </div>

                        {/* Qty to return */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">Qty:</span>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={item.quantity}
                            onChange={(e) => updateItemQty(item.productId, parseInt(e.target.value) || 0)}
                            className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-600 text-center text-white font-mono text-xs"
                          />
                        </div>

                        {/* Restock Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleRestock(item.productId)}
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition ${
                            item.restockStock
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {item.restockStock ? '✓ Restock Stock' : '✗ Scrap / Damaged'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="font-medium text-slate-300">Total Refund Due:</span>
                    <span className="text-base font-bold text-rose-400 font-mono">
                      {currency}{totalRefund.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Return</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="Customer changed mind">Customer changed mind</option>
                  <option value="Defective / Damaged product">Defective / Damaged product</option>
                  <option value="Wrong item purchased">Wrong item purchased</option>
                  <option value="Product expired or past date">Product expired or past date</option>
                  <option value="Customer dissatisfaction">Customer dissatisfaction</option>
                </select>
              </div>

              {/* Footer Actions */}
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
                  disabled={isSubmitting || returnItems.filter(i => i.quantity > 0).length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processing...' : 'Complete Return'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

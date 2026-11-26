import React, { useState } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Boxes, 
  AlertCircle,
  X,
  Check,
  Package
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { PurchaseItem } from '../types/store';

export const PurchasesView: React.FC = () => {
  const { purchases, suppliers, products, settings, addPurchase, receivePurchase } = useStore();
  const { user, profile } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [autoRestock, setAutoRestock] = useState(true);
  const [orderItems, setOrderItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = settings.currencySymbol || '$';

  const openNewPurchaseModal = () => {
    setError(null);
    setSupplierId(suppliers[0]?.id || '');
    // Pre-populate with first product if available
    if (products.length > 0) {
      setOrderItems([{
        productId: products[0].id,
        productName: products[0].name,
        sku: products[0].sku,
        costPrice: products[0].costPrice,
        quantity: 20,
        total: products[0].costPrice * 20
      }]);
    } else {
      setOrderItems([]);
    }
    setAutoRestock(true);
    setNotes('');
    setIsModalOpen(true);
  };

  const addItemToOrder = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setOrderItems(prev => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        sku: firstProd.sku,
        costPrice: firstProd.costPrice,
        quantity: 10,
        total: firstProd.costPrice * 10
      }
    ]);
  };

  const updateItemProduct = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setOrderItems(prev =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            costPrice: prod.costPrice,
            total: prod.costPrice * item.quantity
          };
        }
        return item;
      })
    );
  };

  const updateItemQty = (index: number, qty: number) => {
    setOrderItems(prev =>
      prev.map((item, i) => i === index ? { ...item, quantity: qty, total: qty * item.costPrice } : item)
    );
  };

  const updateItemCost = (index: number, cost: number) => {
    setOrderItems(prev =>
      prev.map((item, i) => i === index ? { ...item, costPrice: cost, total: cost * item.quantity } : item)
    );
  };

  const removeItemFromOrder = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = orderItems.reduce((acc, i) => acc + i.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      setError('Please add at least one product item to purchase.');
      return;
    }

    const supObj = suppliers.find(s => s.id === supplierId);
    const supplierName = supObj ? supObj.name : 'Direct Supplier';

    try {
      setIsSubmitting(true);
      setError(null);

      const purchaseNumber = `PO-${Date.now().toString().slice(-6)}`;

      await addPurchase({
        purchaseNumber,
        supplierId,
        supplierName,
        totalAmount,
        paymentStatus: 'paid',
        receivedStatus: autoRestock ? 'received' : 'ordered',
        notes,
        createdBy: profile?.name || user?.displayName || user?.email || 'Staff'
      }, orderItems, autoRestock);

      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveStock = async (purchaseId: string) => {
    try {
      await receivePurchase(purchaseId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to receive purchase');
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return !q || 
      p.purchaseNumber.toLowerCase().includes(q) || 
      p.supplierName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Purchase Orders &amp; Stock Intake</h2>
          <p className="text-xs text-slate-400">
            Order merchandise from suppliers and automatically restock warehouse inventory
          </p>
        </div>
        <button
          onClick={openNewPurchaseModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search PO # or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Total Orders: <span className="font-semibold text-white">{purchases.length}</span>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        {filteredPurchases.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No purchase records found. Create a new purchase order to intake stock from suppliers.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">PO Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Items Ordered</th>
                  <th className="py-2.5 px-3">Total Cost</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredPurchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                      {po.purchaseNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-white">
                      {po.supplierName}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex flex-col">
                        <span>{po.items.reduce((acc, i) => acc + i.quantity, 0)} units</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[150px]">
                          {po.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {currency}{po.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      {po.receivedStatus === 'received' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Received &amp; Stocked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>Pending Delivery</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {po.receivedStatus !== 'received' && (
                        <button
                          onClick={() => handleReceiveStock(po.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>Receive Stock</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Purchase Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/40">
              <h3 className="font-bold text-white text-base">New Supplier Purchase Order</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Supplier Selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.suppliedCategories || 'General'})</option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium">Order Line Items:</label>
                  <button
                    type="button"
                    onClick={addItemToOrder}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Product</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItemProduct(idx, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs truncate"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-center text-xs"
                          />
                        </div>
                      </div>

                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Cost:</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.costPrice}
                            onChange={(e) => updateItemCost(idx, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeItemFromOrder(idx)}
                          className="text-slate-500 hover:text-rose-400 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="font-semibold text-slate-300">Order Grand Total:</span>
                  <span className="font-mono font-bold text-white text-base">
                    {currency}{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Auto Restock Toggle */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Direct Stock Intake</p>
                  <p className="text-[11px] text-indigo-300">
                    Immediately increment warehouse inventory count upon saving
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRestock}
                  onChange={(e) => setAutoRestock(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Order Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Delivery batch, container #, or invoice reference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
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
                  disabled={isSubmitting || orderItems.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving Order...' : 'Submit Purchase Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  RotateCcw, 
  Eye, 
  Calendar, 
  CreditCard, 
  User, 
  DollarSign 
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Sale, StoreTab } from '../types/store';
import { ReceiptModal } from '../components/ReceiptModal';

interface SalesViewProps {
  setCurrentTab: (tab: StoreTab) => void;
  onInitiateReturn?: (sale: Sale) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ setCurrentTab, onInitiateReturn }) => {
  const { sales, settings } = useStore();
  const { role } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  const currency = settings.currencySymbol || '$';

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesMethod = selectedPaymentMethod === 'all' || s.paymentMethod === selectedPaymentMethod;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        s.saleNumber.toLowerCase().includes(q) || 
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.cashierName.toLowerCase().includes(q);
      return matchesMethod && matchesSearch;
    });
  }, [sales, searchQuery, selectedPaymentMethod]);

  const totalFilteredRevenue = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sales &amp; Order History</h2>
          <p className="text-xs text-slate-400">
            Audit store invoices, review receipts, and issue returns or refunds
          </p>
        </div>
        <button
          onClick={() => setCurrentTab('pos')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition active:scale-95"
        >
          <Receipt className="w-4 h-4" />
          <span>Launch POS Terminal</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search invoice #, customer or cashier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Payment:</span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI / Digital</option>
              <option value="credit">Store Credit</option>
            </select>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <span className="text-slate-400">Total: </span>
            <span className="font-mono font-bold text-emerald-400">{currency}{totalFilteredRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No sales records match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items Sold</th>
                  <th className="py-2.5 px-3">Tax &amp; Discount</th>
                  <th className="py-2.5 px-3">Grand Total</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                      {sale.saleNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString()}{' '}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-white">
                      {sale.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex flex-col">
                        <span>{sale.items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[140px]">
                          {sale.items.map(i => i.productName).join(', ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      <div>Tax: {currency}{sale.taxAmount.toFixed(2)}</div>
                      {sale.discountAmount > 0 && (
                        <div className="text-emerald-400">Disc: -{currency}{sale.discountAmount.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-sm font-bold text-emerald-400">
                      {currency}{sale.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] uppercase font-semibold text-slate-300">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {sale.cashierName}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          title="View & Print Receipt"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (onInitiateReturn) onInitiateReturn(sale);
                            else setCurrentTab('returns');
                          }}
                          title="Process Return / Refund"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-slate-700 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          settings={settings}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Boxes, 
  ShoppingCart, 
  Plus, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Database, 
  CreditCard,
  Sparkles,
  Receipt,
  BarChart3
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Sale, StoreTab } from '../types/store';
import { ReceiptModal } from '../components/ReceiptModal';
import { formatCurrency, resolveCurrencySymbol } from '../utils/currency';

interface DashboardViewProps {
  setCurrentTab: (tab: StoreTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentTab }) => {
  const { products, sales, expenses, settings, seedInitialData } = useStore();
  const { role } = useAuth();

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [seeding, setSeeding] = useState(false);

  const currency = resolveCurrencySymbol(settings.currencySymbol);

  // Metrics calculation
  const totalRevenue = sales.reduce((acc, s) => acc + (s.paymentStatus === 'paid' ? s.grandTotal : 0), 0);
  
  // Today's Sales (local calendar day)
  const todayDateStr = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === todayDateStr);
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);

  // Inventory Health
  const outOfStockItems = products.filter(p => p.stock === 0);
  const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert);
  const healthyStockItems = products.filter(p => p.stock > p.minStockAlert);

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);

  // Expenses & Profit
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const estimatedCogs = sales.reduce((acc, s) => {
    return acc + s.items.reduce((iAcc, item) => iAcc + (item.costPrice * item.quantity), 0);
  }, 0);
  const grossProfit = totalRevenue - estimatedCogs;
  const netProfit = grossProfit - totalExpenses;

  // Recent 5 sales
  const recentSales = sales.slice(0, 5);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedInitialData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner if store is empty */}
      {totalProducts === 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Welcome to OmniStore! Empty Database Detected</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Populate your store with realistic categories, products, suppliers, customers, and starter inventory in 1 click.
              </p>
            </div>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>{seeding ? 'Seeding Catalog...' : 'Seed Sample Store Data'}</span>
          </button>
        </div>
      )}

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Sales Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatCurrency(totalRevenue, currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>{sales.length} transactions processed</span>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400">Today's Revenue</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatCurrency(todayRevenue, currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <span className="font-semibold text-indigo-400">{todaySales.length} orders</span>
            <span>registered today</span>
          </div>
        </div>

        {/* Total Products & Stock */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Products &amp; Stock</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{totalProducts}</span>
            <span className="text-xs text-slate-400 font-medium">Products</span>
            <span className="text-slate-600">/</span>
            <span className="text-2xl font-bold text-blue-400 font-mono">{totalStockUnits}</span>
            <span className="text-xs text-slate-400 font-medium">Units</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span>Stock Value: {formatCurrency(totalInventoryValue, currency)}</span>
          </div>
        </div>

        {/* Stock Alerts (Low & Out of Stock) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400">Stock Alerts</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">{lowStockItems.length}</span>
            <span className="text-xs text-slate-400 font-medium">Low</span>
            <span className="text-slate-600">/</span>
            <span className="text-2xl font-bold text-rose-500 font-mono">{outOfStockItems.length}</span>
            <span className="text-xs text-slate-400 font-medium">Out</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <button
              onClick={() => setCurrentTab('inventory')}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>Manage in Inventory</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-300">Quick Actions:</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentTab('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New Sale (POS)</span>
          </button>
          <button
            onClick={() => setCurrentTab('products')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => setCurrentTab('inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Boxes className="w-3.5 h-3.5 text-amber-400" />
            <span>Adjust Inventory</span>
          </button>
          <button
            onClick={() => setCurrentTab('expenses')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <CreditCard className="w-3.5 h-3.5 text-rose-400" />
            <span>Log Expense</span>
          </button>
          <button
            onClick={() => setCurrentTab('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* Two Column Section: Stock Health & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Health Widget */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Inventory Health Status</h3>
            <button
              onClick={() => setCurrentTab('inventory')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View Table →
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
            <div 
              style={{ width: `${totalProducts > 0 ? (healthyStockItems.length / totalProducts) * 100 : 0}%` }}
              className="bg-emerald-500 h-full transition-all duration-500" 
              title="Healthy Stock"
            />
            <div 
              style={{ width: `${totalProducts > 0 ? (lowStockItems.length / totalProducts) * 100 : 0}%` }}
              className="bg-amber-500 h-full transition-all duration-500" 
              title="Low Stock"
            />
            <div 
              style={{ width: `${totalProducts > 0 ? (outOfStockItems.length / totalProducts) * 100 : 0}%` }}
              className="bg-rose-500 h-full transition-all duration-500" 
              title="Out of Stock"
            />
          </div>

          {/* Health Stats Breakdown */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-medium">Healthy Stock (&gt; Min alert)</span>
              </div>
              <span className="font-bold text-emerald-400 font-mono">{healthyStockItems.length} products</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-medium">Low Stock Warning</span>
              </div>
              <span className="font-bold text-amber-400 font-mono">{lowStockItems.length} products</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="text-slate-300 font-medium">Out of Stock (Zero Units)</span>
              </div>
              <span className="font-bold text-rose-400 font-mono">{outOfStockItems.length} products</span>
            </div>
          </div>
        </div>

        {/* Financial Profit / Loss Estimate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Store Financial Summary</h3>
            <span className="text-[11px] text-slate-500">Real-time ledger</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Total Gross Sales</span>
              <span className="font-mono text-white font-semibold">{formatCurrency(totalRevenue, currency)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Est. Cost of Goods Sold (COGS)</span>
              <span className="font-mono text-slate-300">-{formatCurrency(Math.abs(estimatedCogs), currency)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Gross Profit</span>
              <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(grossProfit, currency)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Total Store Operating Expenses</span>
              <span className="font-mono text-rose-400">-{formatCurrency(Math.abs(totalExpenses), currency)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-sm">
              <span className="font-bold text-white">Estimated Net Margin</span>
              <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(netProfit, currency)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            * Net margin takes into account recorded inventory cost prices and logged store overhead expenses.
          </p>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Payment Methods</h3>
            <span className="text-[11px] text-slate-400">{sales.length} orders</span>
          </div>

          <div className="space-y-3">
            {(['cash', 'card', 'upi', 'credit'] as const).map((method) => {
              const methodSales = sales.filter(s => s.paymentMethod === method);
              const methodTotal = methodSales.reduce((acc, s) => acc + s.grandTotal, 0);
              const pct = totalRevenue > 0 ? (methodTotal / totalRevenue) * 100 : 0;
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-slate-300 font-medium">{method}</span>
                    <span className="font-mono text-white font-semibold">
                      {formatCurrency(methodTotal, currency)} <span className="text-slate-500 font-sans text-[10px]">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${pct}%` }} 
                      className={`h-full ${
                        method === 'cash' ? 'bg-emerald-500' :
                        method === 'card' ? 'bg-indigo-500' :
                        method === 'upi' ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Sales Transactions Feed */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Recent Sales Transactions</h3>
            <p className="text-xs text-slate-400">Real-time receipts from store POS</p>
          </div>
          <button
            onClick={() => setCurrentTab('sales')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            All Sales ({sales.length}) →
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No sales processed yet. Open POS to make the first transaction!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-indigo-300">
                      {sale.saleNumber}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      {sale.customerName || 'Walk-in'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {sale.items.reduce((acc, i) => acc + i.quantity, 0)} units ({sale.items.length} items)
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(sale.grandTotal, currency)}
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px]">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedSaleForReceipt(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-medium text-[11px] transition"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>View</span>
                      </button>
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

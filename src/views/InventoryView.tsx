import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal, 
  History, 
  ArrowUpRight, 
  Package, 
  Edit3
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product, ROLE_PERMISSIONS } from '../types/store';
import { StockAdjustModal } from '../components/StockAdjustModal';

export const InventoryView: React.FC = () => {
  const { products, categories, stockLogs, settings } = useStore();
  const { role } = useAuth();
  const rolePerm = ROLE_PERMISSIONS[role];

  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out' | 'healthy' | 'logs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);

  const currency = settings.currencySymbol || '$';

  // Metrics
  const outOfStockProducts = useMemo(() => products.filter(p => p.stock === 0), [products]);
  const lowStockProducts = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert), [products]);
  const healthyStockProducts = useMemo(() => products.filter(p => p.stock > p.minStockAlert), [products]);
  const totalUnits = useMemo(() => products.reduce((acc, p) => acc + p.stock, 0), [products]);

  // Filtered by search and category
  const displayedProducts = useMemo(() => {
    let list: Product[] = [];
    if (activeTab === 'all') list = products;
    else if (activeTab === 'low') list = lowStockProducts;
    else if (activeTab === 'out') list = outOfStockProducts;
    else if (activeTab === 'healthy') list = healthyStockProducts;

    return list.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [activeTab, products, lowStockProducts, outOfStockProducts, healthyStockProducts, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Inventory Management</h2>
          <p className="text-xs text-slate-400">
            Real-time warehouse stock tracking, threshold alerts, and audit movements
          </p>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div 
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'all' 
              ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10' 
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex justify-between items-center mb-1 text-slate-400">
            <span className="text-[11px] uppercase font-semibold">Total Stock</span>
            <Boxes className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalUnits}</div>
          <span className="text-[11px] text-slate-400 font-medium">{products.length} SKUs Cataloged</span>
        </div>

        <div 
          onClick={() => setActiveTab('healthy')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'healthy' 
              ? 'bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-500/10' 
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex justify-between items-center mb-1 text-emerald-400">
            <span className="text-[11px] uppercase font-semibold">Healthy Stock</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{healthyStockProducts.length}</div>
          <span className="text-[11px] text-slate-400 font-medium">Above Min Threshold</span>
        </div>

        <div 
          onClick={() => setActiveTab('low')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'low' 
              ? 'bg-slate-800/90 border-amber-500 shadow-md shadow-amber-500/10' 
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex justify-between items-center mb-1 text-amber-400">
            <span className="text-[11px] uppercase font-semibold">Low Stock</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{lowStockProducts.length}</div>
          <span className="text-[11px] text-slate-400 font-medium">Needs Reorder Soon</span>
        </div>

        <div 
          onClick={() => setActiveTab('out')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'out' 
              ? 'bg-slate-800/90 border-rose-500 shadow-md shadow-rose-500/10' 
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex justify-between items-center mb-1 text-rose-400">
            <span className="text-[11px] uppercase font-semibold">Out of Stock</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{outOfStockProducts.length}</div>
          <span className="text-[11px] text-slate-400 font-medium">Zero Inventory Units</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Inventory ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('healthy')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'healthy' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Healthy ({healthyStockProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('low')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'low' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Low Stock ({lowStockProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('out')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'out' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Out of Stock ({outOfStockProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Movement Logs ({stockLogs.length})</span>
          </button>
        </div>

        {/* Filter inputs (if not viewing logs) */}
        {activeTab !== 'logs' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'logs' ? (
        /* Stock Movement Audit Log Table */
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Stock Movement Audit Trail</h3>
              <p className="text-xs text-slate-400">Complete immutable record of all inventory changes</p>
            </div>
          </div>

          {stockLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Prev Stock</th>
                    <th className="py-2.5 px-3">Change</th>
                    <th className="py-2.5 px-3">New Stock</th>
                    <th className="py-2.5 px-3">Reason / Ref</th>
                    <th className="py-2.5 px-3">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stockLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {log.productName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          log.type === 'sale' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          log.type === 'purchase' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.type === 'return' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {log.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {log.previousStock}
                      </td>
                      <td className={`py-2.5 px-3 font-mono font-bold ${
                        log.change > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {log.change > 0 ? `+${log.change}` : log.change}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-white">
                        {log.newStock}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                        {log.reason}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {log.createdBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Inventory Table */
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          {displayedProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No products found in this category or stock view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">SKU / Barcode</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Cost</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Stock Count</th>
                    <th className="py-2.5 px-3">Min Alert</th>
                    <th className="py-2.5 px-3">Status</th>
                    {rolePerm.canAdjustStock && (
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {displayedProducts.map((p) => {
                    const isOut = p.stock === 0;
                    const isLow = !isOut && p.stock <= p.minStockAlert;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.unit}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          <div>{p.sku}</div>
                          {p.barcode && <div className="text-[10px] text-slate-500">{p.barcode}</div>}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {p.categoryName || 'Uncategorized'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {currency}{p.costPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-white">
                          {currency}{p.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-mono text-sm font-bold ${
                            isOut ? 'text-rose-500' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {p.stock}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">{p.unit}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {p.minStockAlert} {p.unit}
                        </td>
                        <td className="py-3 px-3">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                              Low Stock Alert
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                              Healthy
                            </span>
                          )}
                        </td>
                        {rolePerm.canAdjustStock && (
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedProductForAdjust(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 text-xs font-semibold transition"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>Adjust Stock</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedProductForAdjust && (
        <StockAdjustModal
          product={selectedProductForAdjust}
          onClose={() => setSelectedProductForAdjust(null)}
        />
      )}
    </div>
  );
};

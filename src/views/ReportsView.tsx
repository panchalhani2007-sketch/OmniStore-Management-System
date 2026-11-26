import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Receipt,
  Package,
  Boxes,
  TrendingUp,
  Download,
  Printer,
  Search,
  Eye,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types/store';
import { ReceiptModal } from '../components/ReceiptModal';

type ReportTab = 'daily' | 'monthly' | 'billing' | 'products' | 'stock';

export const ReportsView: React.FC = () => {
  const { sales, products, expenses, categories, settings } = useStore();
  const currency = settings.currencySymbol || '$';

  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Daily report date (local YYYY-MM-DD)
  const getLocalDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateKey(new Date()));

  // Monthly report year
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Billing history filters
  const [billSearch, setBillSearch] = useState('');
  const [billPaymentFilter, setBillPaymentFilter] = useState('all');
  const [billStartDate, setBillStartDate] = useState('');
  const [billEndDate, setBillEndDate] = useState('');

  // Product sales report filters
  const [productSearch, setProductSearch] = useState('');
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'units' | 'profit'>('revenue');

  // Stock report filter
  const [stockFilter, setStockFilter] = useState<'all' | 'healthy' | 'low' | 'out'>('all');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');

  // Helper to format CSV downloads safely
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escape = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ==================== 1. DAILY SALES REPORT ====================
  const dailySalesForDate = useMemo(() => {
    return sales.filter((s) => getLocalDateKey(new Date(s.createdAt)) === selectedDate);
  }, [sales, selectedDate]);

  const dailySummary = useMemo(() => {
    const gross = dailySalesForDate.reduce((acc, s) => acc + s.grandTotal, 0);
    const tax = dailySalesForDate.reduce((acc, s) => acc + s.taxAmount, 0);
    const discount = dailySalesForDate.reduce((acc, s) => acc + s.discountAmount, 0);
    const cogs = dailySalesForDate.reduce(
      (acc, s) => acc + s.items.reduce((ia, item) => ia + item.costPrice * item.quantity, 0),
      0
    );
    const units = dailySalesForDate.reduce(
      (acc, s) => acc + s.items.reduce((ia, item) => ia + item.quantity, 0),
      0
    );
    return {
      orders: dailySalesForDate.length,
      gross,
      tax,
      discount,
      cogs,
      profit: gross - tax - cogs,
      units
    };
  }, [dailySalesForDate]);

  // Last 14 days trend
  const last14DaysTrend = useMemo(() => {
    const days: { key: string; label: string; total: number; orders: number }[] = [];
    const base = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const key = getLocalDateKey(d);
      const daySales = sales.filter(s => getLocalDateKey(new Date(s.createdAt)) === key);
      days.push({
        key,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        total: daySales.reduce((acc, s) => acc + s.grandTotal, 0),
        orders: daySales.length
      });
    }
    return days;
  }, [sales]);

  const maxDailyTrend = Math.max(1, ...last14DaysTrend.map(d => d.total));

  // ==================== 2. MONTHLY SALES REPORT ====================
  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    sales.forEach(s => years.add(new Date(s.createdAt).getFullYear()));
    expenses.forEach(e => years.add(new Date(e.date || e.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, expenses]);

  const monthlyBreakdown = useMemo(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames.map((name, idx) => {
      const mSales = sales.filter(s => {
        const d = new Date(s.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === idx;
      });
      const mExpenses = expenses.filter(e => {
        const d = new Date(e.date || e.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === idx;
      });

      const revenue = mSales.reduce((acc, s) => acc + s.grandTotal, 0);
      const tax = mSales.reduce((acc, s) => acc + s.taxAmount, 0);
      const cogs = mSales.reduce(
        (acc, s) => acc + s.items.reduce((ia, item) => ia + item.costPrice * item.quantity, 0),
        0
      );
      const expenseTotal = mExpenses.reduce((acc, e) => acc + e.amount, 0);
      const netProfit = revenue - tax - cogs - expenseTotal;

      return {
        monthIndex: idx,
        monthName: name,
        shortName: name.slice(0, 3),
        orders: mSales.length,
        revenue,
        tax,
        cogs,
        expenseTotal,
        netProfit,
        avgOrder: mSales.length > 0 ? revenue / mSales.length : 0
      };
    });
  }, [sales, expenses, selectedYear]);

  const yearlyTotals = useMemo(() => {
    return monthlyBreakdown.reduce(
      (acc, m) => ({
        orders: acc.orders + m.orders,
        revenue: acc.revenue + m.revenue,
        tax: acc.tax + m.tax,
        expenseTotal: acc.expenseTotal + m.expenseTotal,
        netProfit: acc.netProfit + m.netProfit
      }),
      { orders: 0, revenue: 0, tax: 0, expenseTotal: 0, netProfit: 0 }
    );
  }, [monthlyBreakdown]);

  const maxMonthlyRevenue = Math.max(1, ...monthlyBreakdown.map(m => m.revenue));

  // ==================== 3. BILLING HISTORY ====================
  const filteredBillingHistory = useMemo(() => {
    return sales.filter((s) => {
      const matchesMethod = billPaymentFilter === 'all' || s.paymentMethod === billPaymentFilter;
      const q = billSearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        s.saleNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.cashierName.toLowerCase().includes(q);
      const saleDay = getLocalDateKey(new Date(s.createdAt));
      const matchesStart = !billStartDate || saleDay >= billStartDate;
      const matchesEnd = !billEndDate || saleDay <= billEndDate;
      return matchesMethod && matchesQuery && matchesStart && matchesEnd;
    });
  }, [sales, billSearch, billPaymentFilter, billStartDate, billEndDate]);

  // ==================== 4. PRODUCT SALES REPORT ====================
  const productSalesStats = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        unitsSold: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = map.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
        const itemCost = (item.costPrice || 0) * item.quantity;
        existing.unitsSold += item.quantity;
        existing.revenue += item.total;
        existing.cost += itemCost;
        existing.profit += item.total - itemCost;
        map.set(item.productId, existing);
      });
    });

    const q = productSearch.toLowerCase().trim();
    return Array.from(map.values())
      .filter(
        (p) =>
          !q ||
          p.productName.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (productSortBy === 'units') return b.unitsSold - a.unitsSold;
        if (productSortBy === 'profit') return b.profit - a.profit;
        return b.revenue - a.revenue;
      });
  }, [sales, productSearch, productSortBy]);

  // ==================== 5. STOCK REPORT ====================
  const stockReportItems = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = stockCategoryFilter === 'all' || p.categoryId === stockCategoryFilter;
      if (!matchesCat) return false;
      if (stockFilter === 'out') return p.stock === 0;
      if (stockFilter === 'low') return p.stock > 0 && p.stock <= p.minStockAlert;
      if (stockFilter === 'healthy') return p.stock > p.minStockAlert;
      return true;
    });
  }, [products, stockFilter, stockCategoryFilter]);

  const stockValuation = useMemo(() => {
    return stockReportItems.reduce(
      (acc, p) => ({
        units: acc.units + p.stock,
        costValue: acc.costValue + p.stock * p.costPrice,
        retailValue: acc.retailValue + p.stock * p.sellingPrice
      }),
      { units: 0, costValue: 0, retailValue: 0 }
    );
  }, [stockReportItems]);

  const reportTabs: { id: ReportTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'daily', label: 'Daily Sales Report', icon: Calendar },
    { id: 'monthly', label: 'Monthly Sales Report', icon: BarChart3 },
    { id: 'billing', label: 'Billing History', icon: Receipt },
    { id: 'products', label: 'Product Sales Report', icon: Package },
    { id: 'stock', label: 'Stock Report', icon: Boxes }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Store Reports &amp; Analytics</h2>
          <p className="text-xs text-slate-400">
            Real-time daily sales, monthly revenue trends, billing ledger, product performance, and inventory valuation
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
        >
          <Printer className="w-4 h-4 text-indigo-400" />
          <span>Print Current View</span>
        </button>
      </div>

      {/* Report Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-semibold">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: DAILY SALES REPORT ==================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Date Picker Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-300">Report Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(getLocalDateKey(new Date()))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[11px] font-semibold border border-slate-700"
              >
                Today
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  `daily-sales-${selectedDate}.csv`,
                  ['Invoice #', 'Time', 'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment', 'Cashier'],
                  dailySalesForDate.map((s) => [
                    s.saleNumber,
                    new Date(s.createdAt).toLocaleTimeString(),
                    s.customerName || 'Walk-in',
                    s.items.reduce((a, i) => a + i.quantity, 0),
                    s.subtotal.toFixed(2),
                    s.discountAmount.toFixed(2),
                    s.taxAmount.toFixed(2),
                    s.grandTotal.toFixed(2),
                    s.paymentMethod.toUpperCase(),
                    s.cashierName
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Daily CSV</span>
            </button>
          </div>

          {/* Daily KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Daily Gross Revenue</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {currency}{dailySummary.gross.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">{dailySummary.orders} invoices • {dailySummary.units} units</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Tax / GST Collected</span>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                {currency}{dailySummary.tax.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">Discounts: {currency}{dailySummary.discount.toFixed(2)}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Est. Cost of Goods</span>
              <div className="text-2xl font-bold text-slate-200 font-mono mt-1">
                {currency}{dailySummary.cogs.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">Based on purchase cost</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">Est. Gross Profit</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${dailySummary.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currency}{dailySummary.profit.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">Excl. tax &amp; COGS</span>
            </div>
          </div>

          {/* 14-Day Sales Chart */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Last 14 Days Revenue Trend</h3>
                <p className="text-xs text-slate-400">Click any day bar to inspect that day&apos;s transactions</p>
              </div>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-40 pt-4">
              {last14DaysTrend.map((day) => {
                const heightPct = Math.max(4, (day.total / maxDailyTrend) * 100);
                const isSelected = day.key === selectedDate;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDate(day.key)}
                    className="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                    title={`${day.label}: ${currency}${day.total.toFixed(2)} (${day.orders} orders)`}
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[26px] rounded-t-lg transition-all ${
                          isSelected
                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                            : 'bg-indigo-600/60 group-hover:bg-indigo-500'
                        }`}
                      />
                    </div>
                    <span className={`text-[9px] font-mono ${isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                      {day.label.split(' ')[1]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Invoices Table */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-3">
              Transactions on {selectedDate} ({dailySalesForDate.length})
            </h3>
            {dailySalesForDate.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No sales transactions recorded on {selectedDate}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Tax</th>
                      <th className="py-2.5 px-3">Grand Total</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dailySalesForDate.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{s.saleNumber}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 text-white font-medium">{s.customerName || 'Walk-in'}</td>
                        <td className="py-2.5 px-3">{s.items.reduce((a, i) => a + i.quantity, 0)} units</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{currency}{s.taxAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{currency}{s.grandTotal.toFixed(2)}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-semibold">{s.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedSale(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 text-[11px]"
                          >
                            <Eye className="w-3 h-3" />
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
        </div>
      )}

      {/* ==================== TAB 2: MONTHLY SALES REPORT ==================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-300">Fiscal Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  `monthly-sales-${selectedYear}.csv`,
                  ['Month', 'Orders', 'Gross Revenue', 'Tax', 'COGS', 'Expenses', 'Est Net Profit', 'Avg Order Value'],
                  monthlyBreakdown.map((m) => [
                    m.monthName,
                    m.orders,
                    m.revenue.toFixed(2),
                    m.tax.toFixed(2),
                    m.cogs.toFixed(2),
                    m.expenseTotal.toFixed(2),
                    m.netProfit.toFixed(2),
                    m.avgOrder.toFixed(2)
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {selectedYear} CSV</span>
            </button>
          </div>

          {/* Yearly Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">{selectedYear} Revenue</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {currency}{yearlyTotals.revenue.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">{yearlyTotals.orders} total orders</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">{selectedYear} Tax / GST</span>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                {currency}{yearlyTotals.tax.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">Collected across invoices</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">{selectedYear} Expenses</span>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {currency}{yearlyTotals.expenseTotal.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">Store overhead logged</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase font-semibold text-slate-400">{selectedYear} Net Profit</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${yearlyTotals.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currency}{yearlyTotals.netProfit.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500">Revenue - Tax - COGS - Expenses</span>
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-4">Monthly Revenue Comparison ({selectedYear})</h3>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-44 pt-4">
              {monthlyBreakdown.map((m) => {
                const heightPct = m.revenue > 0 ? Math.max(6, (m.revenue / maxMonthlyRevenue) * 100) : 3;
                return (
                  <div
                    key={m.monthIndex}
                    className="flex flex-col items-center gap-1.5 h-full justify-end"
                    title={`${m.monthName}: ${currency}${m.revenue.toFixed(2)} (${m.orders} orders)`}
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[30px] rounded-t-lg transition-all ${
                          m.revenue > 0 ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-slate-800'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{m.shortName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Table */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Orders</th>
                  <th className="py-2.5 px-3">Gross Sales</th>
                  <th className="py-2.5 px-3">Tax / GST</th>
                  <th className="py-2.5 px-3">COGS</th>
                  <th className="py-2.5 px-3">Expenses</th>
                  <th className="py-2.5 px-3">Avg Order</th>
                  <th className="py-2.5 px-3 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {monthlyBreakdown.map((m) => (
                  <tr key={m.monthIndex} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-white">{m.monthName}</td>
                    <td className="py-2.5 px-3 font-mono">{m.orders}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">{currency}{m.revenue.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{currency}{m.tax.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{currency}{m.cogs.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-rose-400">{currency}{m.expenseTotal.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{currency}{m.avgOrder.toFixed(2)}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${m.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currency}{m.netProfit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: BILLING HISTORY ==================== */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer, cashier..."
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <select
                value={billPaymentFilter}
                onChange={(e) => setBillPaymentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">All Payment Modes</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI / QR</option>
                <option value="credit">Credit</option>
              </select>
              <input
                type="date"
                value={billStartDate}
                onChange={(e) => setBillStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                title="From Date"
              />
              <input
                type="date"
                value={billEndDate}
                onChange={(e) => setBillEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                title="To Date"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  `billing-history.csv`,
                  ['Invoice #', 'Date', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Method', 'Cashier'],
                  filteredBillingHistory.map((s) => [
                    s.saleNumber,
                    new Date(s.createdAt).toLocaleString(),
                    s.customerName || 'Walk-in',
                    s.subtotal.toFixed(2),
                    s.discountAmount.toFixed(2),
                    s.taxAmount.toFixed(2),
                    s.grandTotal.toFixed(2),
                    s.paymentMethod.toUpperCase(),
                    s.cashierName
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({filteredBillingHistory.length})</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
            {filteredBillingHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No billing invoices found matching filters.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Subtotal</th>
                    <th className="py-2.5 px-3">Discount</th>
                    <th className="py-2.5 px-3">Tax</th>
                    <th className="py-2.5 px-3">Grand Total</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredBillingHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{s.saleNumber}</td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium">{s.customerName || 'Walk-in'}</td>
                      <td className="py-2.5 px-3 font-mono">{currency}{s.subtotal.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono text-amber-400">-{currency}{s.discountAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{currency}{s.taxAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{currency}{s.grandTotal.toFixed(2)}</td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-semibold">{s.paymentMethod}</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.cashierName}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 text-[11px]"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: PRODUCT SALES REPORT ==================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search sold products or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <select
                value={productSortBy}
                onChange={(e) => setProductSortBy(e.target.value as 'revenue' | 'units' | 'profit')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="revenue">Sort by Highest Revenue</option>
                <option value="units">Sort by Most Units Sold</option>
                <option value="profit">Sort by Highest Profit</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  `product-sales-report.csv`,
                  ['Product Name', 'SKU', 'Units Sold', 'Total Revenue', 'Total Cost', 'Gross Profit', 'Margin %'],
                  productSalesStats.map((p) => {
                    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0.0';
                    return [p.productName, p.sku, p.unitsSold, p.revenue.toFixed(2), p.cost.toFixed(2), p.profit.toFixed(2), `${margin}%`];
                  })
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Product Sales CSV</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
            {productSalesStats.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No product sales recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                    <th className="py-2.5 px-3 text-right">Est. Cost</th>
                    <th className="py-2.5 px-3 text-right">Gross Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {productSalesStats.map((p, idx) => {
                    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={p.productId} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-500">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{p.productName}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-300">{p.sku}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{p.unitsSold}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{currency}{p.revenue.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{currency}{p.cost.toFixed(2)}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-semibold ${p.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {currency}{p.profit.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: STOCK REPORT ==================== */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Summary Valuation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400">Filtered Units in Stock</span>
                <div className="text-2xl font-bold text-white font-mono mt-1">{stockValuation.units}</div>
                <span className="text-[11px] text-slate-500">{stockReportItems.length} SKUs displayed</span>
              </div>
              <Boxes className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400">Stock Valuation (Cost)</span>
                <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                  {currency}{stockValuation.costValue.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500">Purchase asset value</span>
              </div>
              <DollarSign className="w-6 h-6 text-amber-400" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400">Potential Retail Value</span>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {currency}{stockValuation.retailValue.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500">Projected selling value</span>
              </div>
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          {/* Filter & Export Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'healthy', 'low', 'out'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStockFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${
                    stockFilter === status
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {status === 'all' ? 'All Stock' : status === 'low' ? 'Low Stock' : status === 'out' ? 'Out of Stock' : 'Healthy Stock'}
                </button>
              ))}
              <select
                value={stockCategoryFilter}
                onChange={(e) => setStockCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  `stock-report-${stockFilter}.csv`,
                  ['Product Name', 'SKU', 'Category', 'Stock Qty', 'Min Alert', 'Status', 'Unit Cost', 'Selling Price', 'Total Cost Value'],
                  stockReportItems.map((p) => {
                    const st = p.stock === 0 ? 'Out of Stock' : p.stock <= p.minStockAlert ? 'Low Stock' : 'Healthy';
                    return [
                      p.name,
                      p.sku,
                      p.categoryName || 'General',
                      p.stock,
                      p.minStockAlert,
                      st,
                      p.costPrice.toFixed(2),
                      p.sellingPrice.toFixed(2),
                      (p.stock * p.costPrice).toFixed(2)
                    ];
                  })
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Stock CSV</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Min Alert</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Cost Value</th>
                  <th className="py-2.5 px-3 text-right">Retail Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stockReportItems.map((p) => {
                  const isOut = p.stock === 0;
                  const isLow = !isOut && p.stock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-white">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-300">{p.sku}</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.categoryName || 'General'}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {p.stock} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{p.minStockAlert}</td>
                      <td className="py-2.5 px-3">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                            <ShieldAlert className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Healthy
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {currency}{(p.stock * p.costPrice).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                        {currency}{(p.stock * p.sellingPrice).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          settings={settings}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Sale, StoreSettings } from '../types/store';
import { formatCurrency, resolveCurrencySymbol } from '../utils/currency';

interface ReceiptModalProps {
  sale: Sale | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, settings, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = resolveCurrencySymbol(settings.currencySymbol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sale Completed Successfully</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
          {/* Store Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4 font-sans">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{settings.storeName}</h2>
            <p className="text-xs text-slate-600">{settings.address}</p>
            <p className="text-xs text-slate-600">Tel: {settings.phone} | {settings.email}</p>
          </div>

          {/* Transaction Metadata */}
          <div className="flex justify-between text-[11px] text-slate-600 border-b border-dashed border-slate-300 pb-3">
            <div>
              <p><span className="text-slate-400 font-sans">Invoice:</span> {sale.saleNumber}</p>
              <p><span className="text-slate-400 font-sans">Cashier:</span> {sale.cashierName}</p>
            </div>
            <div className="text-right">
              <p>{new Date(sale.createdAt).toLocaleDateString()}</p>
              <p>{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* Customer info if present */}
          {(sale.customerName || sale.customerPhone) && (
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-sans">Customer:</span>{' '}
                <span className="font-semibold">{sale.customerName || 'Walk-in Customer'}</span>
              </div>
              {sale.customerPhone && (
                <span className="font-mono text-slate-500">{sale.customerPhone}</span>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="border-b border-dashed border-slate-300 pb-3">
            <div className="grid grid-cols-12 text-[10px] text-slate-400 font-sans uppercase font-bold mb-2">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            <div className="space-y-1.5">
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px]">
                  <div className="col-span-6 truncate font-sans font-medium text-slate-800">
                    {item.productName}
                    <div className="text-[9px] text-slate-400 font-mono">{item.sku}</div>
                  </div>
                  <div className="col-span-2 text-center text-slate-600">x{item.quantity}</div>
                  <div className="col-span-2 text-right text-slate-600">{formatCurrency(item.price, currency)}</div>
                  <div className="col-span-2 text-right font-semibold text-slate-900">{formatCurrency(item.total, currency)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary / Totals */}
          <div className="space-y-1.5 text-xs border-b border-dashed border-slate-300 pb-4">
            <div className="flex justify-between text-slate-600 font-sans">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(sale.subtotal, currency)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-sans">
                <span>Discount</span>
                <span className="font-mono">-{formatCurrency(Math.abs(sale.discountAmount), currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span className="font-sans">Grand Total</span>
              <span className="font-mono">{formatCurrency(sale.grandTotal, currency)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 font-sans pt-1">
              <span>Payment Mode: <span className="font-semibold text-slate-900">Cash</span></span>
              <span className="font-semibold text-emerald-700 capitalize">{sale.paymentStatus}</span>
            </div>
          </div>

          {/* Barcode representation */}
          <div className="pt-2 text-center space-y-1">
            <div className="inline-block tracking-widest font-mono text-xl py-1 px-3 bg-slate-100 rounded border border-slate-300 select-all font-bold">
              ||| | || |||| | | ||| | ||
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider">{sale.saleNumber}</p>
          </div>

          {/* Receipt Footer */}
          <p className="text-[10px] text-slate-500 text-center font-sans italic pt-2">
            {settings.receiptFooter}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Done
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

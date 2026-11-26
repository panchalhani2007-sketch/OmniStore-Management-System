import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  UserPlus, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Receipt, 
  AlertCircle, 
  Tag, 
  Check, 
  Package, 
  X,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product, CartItem, Sale, SaleItem } from '../types/store';
import { ReceiptModal } from '../components/ReceiptModal';

export const POSBillingView: React.FC = () => {
  const { 
    products, 
    categories, 
    customers, 
    settings, 
    processSale, 
    addCustomer,
    seedInitialData 
  } = useStore();
  const { user, profile } = useAuth();

  // Search and view states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [orderQuickSearch, setOrderQuickSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cart & Customer states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  
  // Discount & Payment
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  
  // Processing & Receipts
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick Customer Creation modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Quick search dropdown state
  const [isQuickSearchFocused, setIsQuickSearchFocused] = useState(false);
  const quickSearchRef = useRef<HTMLDivElement>(null);

  const currency = settings.currencySymbol || '$';
  const taxRate = settings.taxRate ?? 8.5;

  // Close quick search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickSearchRef.current && !quickSearchRef.current.contains(event.target as Node)) {
        setIsQuickSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products for the main catalog
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = selectedCategory === 'all' || prod.categoryId === selectedCategory;
      const q = catalogSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        prod.name.toLowerCase().includes(q) || 
        prod.sku.toLowerCase().includes(q) || 
        (prod.barcode && prod.barcode.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, catalogSearch, selectedCategory]);

  // Filter products for the Quick Search above Current Order
  const quickSearchResults = useMemo(() => {
    const q = orderQuickSearch.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter((prod) => 
        prod.name.toLowerCase().includes(q) || 
        prod.sku.toLowerCase().includes(q) || 
        (prod.barcode && prod.barcode.toLowerCase().includes(q))
      )
      .slice(0, 8); // Top 8 matches for snappy UX
  }, [products, orderQuickSearch]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      setError(`"${product.name}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(`Cannot add more than available stock (${product.stock} ${product.unit})`);
          return prev;
        }
        return prev.map((item) => 
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.product.sellingPrice }
            : item
        );
      } else {
        return [...prev, {
          product,
          quantity: 1,
          discount: 0,
          total: product.sellingPrice
        }];
      }
    });
    setError(null);
  };

  const updateQuantity = (productId: string, qty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (qty > prod.stock) {
      setError(`Cannot exceed available stock of ${prod.stock} ${prod.unit} for "${prod.name}"`);
      // Clamp to available stock
      setCart((prev) =>
        prev.map((item) => {
          if (item.product.id === productId) {
            return {
              ...item,
              quantity: prod.stock,
              total: prod.stock * item.product.sellingPrice
            };
          }
          return item;
        })
      );
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: qty,
            total: qty * item.product.sellingPrice
          };
        }
        return item;
      })
    );
    setError(null);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setError(null);
    setCashTendered('');
    setDiscountValue(0);
    setWalkInName('');
    setWalkInPhone('');
  };

  // Quick Add from the input above Current Order
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchResults.length > 0) {
      addToCart(quickSearchResults[0]);
      setOrderQuickSearch('');
      setIsQuickSearchFocused(false);
    } else if (orderQuickSearch.trim()) {
      setError(`No product found matching "${orderQuickSearch.trim()}"`);
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  
  const discountAmount = discountType === 'percent'
    ? (subtotal * (Math.min(100, Math.max(0, discountValue)) / 100))
    : Math.min(subtotal, Math.max(0, discountValue));

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  // Cash change calculations
  const cashNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashNum - grandTotal);

  // Generate Bill / Complete Sale
  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      setError('Cannot generate bill for an empty cart. Please add products first.');
      return;
    }

    // Verify stock availability one more time
    for (const item of cart) {
      const currentProd = products.find(p => p.id === item.product.id);
      if (!currentProd || currentProd.stock < item.quantity) {
        setError(`Insufficient stock for "${item.product.name}". Available: ${currentProd?.stock || 0}`);
        return;
      }
    }

    if (paymentMethod === 'cash' && cashNum > 0 && cashNum < grandTotal) {
      setError(`Cash tendered (${currency}${cashNum.toFixed(2)}) is less than total amount (${currency}${grandTotal.toFixed(2)})`);
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const customerObj = customers.find(c => c.id === selectedCustomerId);
      const saleNumber = `INV-${Date.now().toString().slice(-6)}`;

      const saleItems: SaleItem[] = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        price: item.product.sellingPrice,
        costPrice: item.product.costPrice,
        quantity: item.quantity,
        total: item.total
      }));

      const saleData = {
        saleNumber,
        customerId: customerObj?.id || '',
        customerName: customerObj?.name || walkInName.trim() || 'Walk-in Customer',
        customerPhone: customerObj?.phone || walkInPhone.trim() || '',
        subtotal,
        discountAmount,
        discountType,
        taxRate,
        taxAmount,
        grandTotal,
        paymentMethod,
        cashTendered: paymentMethod === 'cash' ? cashNum : grandTotal,
        changeDue: paymentMethod === 'cash' ? changeDue : 0,
        paymentStatus: 'paid' as const,
        cashierId: user?.uid || 'cashier',
        cashierName: profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Staff Cashier',
        notes: `Processed at POS register`
      };

      // Process in Firestore atomically
      const saleId = await processSale(saleData, saleItems);

      // Trigger Confetti effect
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Prepare receipt object for modal
      const receiptSale: Sale = {
        id: saleId,
        ...saleData,
        items: saleItems,
        createdAt: new Date().toISOString()
      };

      setCompletedSale(receiptSale);
      clearCart();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate bill and process transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const newId = await addCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim(),
        address: ''
      });
      setSelectedCustomerId(newId);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      await seedInitialData();
    } catch (err) {
      console.error('Failed to seed products:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Helper to get category name
  const getCategoryName = (categoryId?: string, fallbackName?: string) => {
    if (!categoryId) return fallbackName || 'General';
    const found = categories.find(c => c.id === categoryId);
    return found ? found.name : fallbackName || 'General';
  };

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6 items-start pb-12">
      
      {/* =========================================================================
          LEFT / MAIN COLUMN: Product Search Bar & Available Products List
          ========================================================================= */}
      <div className="flex-1 min-w-0 w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col">
        
        {/* Top Header & Search Bar */}
        <div className="space-y-3.5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <span>Product Catalog</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {products.length} Products in Firestore
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse catalogue, search by Name or SKU, and click &ldquo;Add to Cart&rdquo; to build customer order.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                  viewMode === 'grid' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                  viewMode === 'list' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="List / Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>

          {/* Visible Main Product Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search available products by Name, SKU or Barcode..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500 transition font-medium"
            />
            {catalogSearch && (
              <button
                onClick={() => setCatalogSearch('')}
                className="absolute right-3 top-2.5 p-0.5 rounded text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}
            >
              All Products ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty Catalog Notice in Firestore */}
        {products.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 space-y-3 my-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6 stroke-1" />
            </div>
            <h3 className="text-base font-bold text-white">No Products Found in Firestore</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your store catalogue is currently empty in Cloud Firestore. You can seed real sample products, categories and suppliers with one click, or add your custom items.
            </p>
            <button
              type="button"
              onClick={handleSeedData}
              disabled={isSeeding}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSeeding ? 'Seeding Firestore...' : 'Seed Catalog with Sample Products to Firestore'}</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Search yielded no matches */
          <div className="p-8 text-center bg-slate-800/20 rounded-2xl border border-slate-800 space-y-2 my-6">
            <Package className="w-10 h-10 stroke-1 mx-auto text-slate-600" />
            <h4 className="text-sm font-semibold text-slate-300">No matching products found</h4>
            <p className="text-xs text-slate-500">
              No items match &ldquo;{catalogSearch}&rdquo; in this category. Try adjusting your search or category filter.
            </p>
            <button
              onClick={() => { setCatalogSearch(''); setSelectedCategory('all'); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline pt-1"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ================= GRID VIEW ================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 overflow-y-auto max-h-[calc(100vh-18rem)] pr-1">
            {filteredProducts.map((product) => {
              const inCart = cart.find(c => c.product.id === product.id);
              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock <= product.minStockAlert;
              const isMaxInCart = inCart && inCart.quantity >= product.stock;
              const catName = getCategoryName(product.categoryId, product.categoryName);

              return (
                <div
                  key={product.id}
                  className={`group relative p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                    isOutOfStock
                      ? 'bg-slate-900/60 border-slate-800/80 opacity-60'
                      : 'bg-slate-800/50 hover:bg-slate-800/90 border-slate-700/60 hover:border-indigo-500/50 shadow-sm hover:shadow-indigo-500/10'
                  }`}
                >
                  <div>
                    {/* Thumbnail + Stock Status Pill */}
                    <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-800 mb-2.5">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800/80">
                          <Package className="w-9 h-9 stroke-1 text-slate-500" />
                        </div>
                      )}

                      {/* Stock Status Badge */}
                      <div className="absolute top-2 right-2">
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow">
                            Only {product.stock} {product.unit} left
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/90 text-emerald-400 border border-emerald-500/30">
                            {product.stock} {product.unit} available
                          </span>
                        )}
                      </div>

                      {/* In Cart Indicator */}
                      {inCart && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1 text-[11px] font-bold shadow-md">
                          <ShoppingCart className="w-3 h-3" />
                          <span>{inCart.quantity} in cart</span>
                        </div>
                      )}
                    </div>

                    {/* Category & SKU */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 truncate max-w-[140px]">
                        {catName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {product.sku}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-indigo-300 transition">
                      {product.name}
                    </h4>
                  </div>

                  {/* Price & Add to Cart Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block leading-none">Price</span>
                      <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                        {currency}{product.sellingPrice.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock || isMaxInCart}
                      onClick={() => addToCart(product)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                        isOutOfStock || isMaxInCart
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isMaxInCart ? 'Max In Cart' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= LIST / TABLE VIEW ================= */
          <div className="overflow-x-auto max-h-[calc(100vh-18rem)] overflow-y-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-center">Available Stock</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((product) => {
                  const inCart = cart.find(c => c.product.id === product.id);
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = !isOutOfStock && product.stock <= product.minStockAlert;
                  const isMaxInCart = inCart && inCart.quantity >= product.stock;
                  const catName = getCategoryName(product.categoryId, product.categoryName);

                  return (
                    <tr 
                      key={product.id}
                      className={`hover:bg-slate-800/50 transition ${isOutOfStock ? 'opacity-60' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-slate-600">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white leading-tight">{product.name}</p>
                            {inCart && (
                              <span className="text-[10px] text-indigo-400 font-medium">
                                ({inCart.quantity} in cart)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px]">
                          {catName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {product.sku}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400 font-mono text-xs">
                        {currency}{product.sellingPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            {product.stock} {product.unit} (Low)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            {product.stock} {product.unit}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          disabled={isOutOfStock || isMaxInCart}
                          onClick={() => addToCart(product)}
                          className={`py-1 px-3 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer ${
                            isOutOfStock || isMaxInCart
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isMaxInCart ? 'Max' : 'Add to Cart'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          RIGHT COLUMN: Product Search Bar Above Current Order & Cart / Billing
          ========================================================================= */}
      <div className="w-full xl:w-[420px] 2xl:w-[460px] shrink-0 space-y-4">
        
        {/* REQUIREMENT 1: Visible product search bar above Current Order */}
        <div 
          ref={quickSearchRef} 
          className="relative bg-slate-900 border border-indigo-500/40 rounded-2xl p-3.5 shadow-lg shadow-indigo-500/5"
        >
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick Product Search & Scan</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Press Enter to Add</span>
          </div>

          <form onSubmit={handleQuickAddSubmit} className="relative">
            <input
              type="text"
              placeholder="Search product by Name, SKU or Barcode..."
              value={orderQuickSearch}
              onFocus={() => setIsQuickSearchFocused(true)}
              onChange={(e) => {
                setOrderQuickSearch(e.target.value);
                setIsQuickSearchFocused(true);
              }}
              className="w-full pl-3 pr-20 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:border-indigo-400 font-medium"
            />
            {orderQuickSearch && (
              <button
                type="button"
                onClick={() => setOrderQuickSearch('')}
                className="absolute right-14 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={quickSearchResults.length === 0}
              className="absolute right-1 top-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <span>Add</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>

          {/* Quick search instant dropdown */}
          {isQuickSearchFocused && orderQuickSearch.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
              {quickSearchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  No products found matching &ldquo;{orderQuickSearch}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {quickSearchResults.map((prod) => {
                    const isOut = prod.stock <= 0;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          if (!isOut) {
                            addToCart(prod);
                            setOrderQuickSearch('');
                            setIsQuickSearchFocused(false);
                          }
                        }}
                        className={`p-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
                          isOut ? 'opacity-50 cursor-not-allowed bg-slate-900' : 'hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{prod.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>{prod.sku}</span>
                            <span>•</span>
                            <span className={isOut ? 'text-rose-400' : 'text-emerald-400'}>
                              {isOut ? 'Out of stock' : `${prod.stock} in stock`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 font-mono block">
                            {currency}{prod.sellingPrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-semibold">
                            {isOut ? 'Unavailable' : '+ Add to Order'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Order & Cart Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col space-y-4">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Current Order</h3>
                <p className="text-[11px] text-slate-400">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)} items in cart
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium transition cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Customer Details
              </label>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Add Customer</span>
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">Walk-in Customer (General Counter Sale)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>

            {/* Optional quick customer details for walk-in billing */}
            {!selectedCustomerId && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-500"
                />
                <input
                  type="tel"
                  placeholder="Phone (Optional)"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Cart Line Items List */}
          <div className="overflow-y-auto space-y-2 pr-1 max-h-72 min-h-[140px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <ShoppingCart className="w-8 h-8 stroke-1 text-slate-600 mb-1.5" />
                <p className="text-xs font-semibold text-slate-300">Your Cart is Empty</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click &ldquo;Add to Cart&rdquo; on any product or use the search bar above.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const maxStock = item.product.stock;
                const isAtMax = item.quantity >= maxStock;

                return (
                  <div 
                    key={item.product.id}
                    className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{item.product.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{currency}{item.product.sellingPrice.toFixed(2)} / {item.product.unit}</span>
                        <span>•</span>
                        <span className="text-slate-500">Max: {maxStock}</span>
                      </div>
                    </div>

                    {/* Quantity Controls with Stock Protection */}
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-700 p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Decrease Quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={maxStock}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateQuantity(item.product.id, val);
                        }}
                        className="w-8 text-center font-bold text-white font-mono text-xs bg-transparent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        disabled={isAtMax}
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className={`p-1 rounded transition cursor-pointer ${
                          isAtMax 
                            ? 'text-slate-600 cursor-not-allowed' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={isAtMax ? 'Stock limit reached' : 'Increase Quantity'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Total & Remove */}
                    <div className="text-right min-w-[65px]">
                      <p className="font-bold text-emerald-400 font-mono text-xs">
                        {currency}{item.total.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-0.5"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pricing, Discount & GST Calculation Breakdown */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs">
            
            {/* Discount input */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] font-medium">Discount:</span>
              <div className="flex-1 flex rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-transparent text-white text-xs font-mono focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setDiscountType(discountType === 'percent' ? 'flat' : 'percent')}
                  className="px-2.5 py-1.5 bg-slate-700 text-slate-200 font-mono text-[11px] hover:bg-slate-600 transition font-bold"
                >
                  {discountType === 'percent' ? '%' : currency}
                </button>
              </div>
            </div>

            {/* Calculations Box */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">{currency}{subtotal.toFixed(2)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-{currency}{discountAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Explicit GST line item */}
              <div className="flex justify-between">
                <span>GST ({taxRate}%):</span>
                <span className="font-mono text-slate-200">{currency}{taxAmount.toFixed(2)}</span>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between text-sm sm:text-base font-bold text-white pt-2 border-t border-slate-700">
                <span>Final Total:</span>
                <span className="font-mono text-emerald-400">{currency}{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 rounded-xl border font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 rounded-xl border font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`py-2 rounded-xl border font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-400 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 rounded-xl border font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'credit'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Credit</span>
                </button>
              </div>
            </div>

            {/* Cash Tendered & Change Return Calculator */}
            {paymentMethod === 'cash' && (
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Cash Tendered:</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="any"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-28 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-600 text-right text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>
                {cashNum >= grandTotal && grandTotal > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700">
                    <span className="text-emerald-400 font-semibold">Change to Return:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {currency}{changeDue.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error Notice */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* REQUIREMENT 9: Generate Bill Button */}
            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={isProcessing || cart.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>
                {isProcessing 
                  ? 'Generating Bill & Saving Sale...' 
                  : `Generate Bill (${currency}${grandTotal.toFixed(2)})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODALS: Customer Quick Add & Receipt / Bill Print Modal
          ========================================================================= */}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Register New Customer</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Select</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Tax Bill & Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          settings={settings}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};

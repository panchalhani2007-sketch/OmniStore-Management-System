import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  SlidersHorizontal, 
  AlertCircle,
  X,
  Check,
  Tag
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product, ROLE_PERMISSIONS } from '../types/store';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { formatCurrency, resolveCurrencySymbol } from '../utils/currency';

export const ProductsView: React.FC = () => {
  const { products, categories, settings, addProduct, updateProduct, deleteProduct, addCategory, adjustStock } = useStore();
  const { role } = useAuth();
  const rolePerm = ROLE_PERMISSIONS[role];
  const [pageError, setPageError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);

  // Quick inline category creation within Product modal
  const [showInlineCategoryModal, setShowInlineCategoryModal] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineCatCode, setInlineCatCode] = useState('');
  const [inlineCatCreating, setInlineCatCreating] = useState(false);
  const [inlineCatError, setInlineCatError] = useState<string | null>(null);

  // Form states (5 simplified required fields)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = resolveCurrencySymbol(settings.currencySymbol);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setPrice('');
    setSellingPrice('');
    setStock('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    const matchedById = p.categoryId && categories.some(c => c.id === p.categoryId);
    const matchedByName = !matchedById && p.categoryName
      ? categories.find(c => c.name.toLowerCase() === p.categoryName.toLowerCase())?.id
      : undefined;
    setCategoryId(matchedById ? p.categoryId : (matchedByName || p.categoryId || categories[0]?.id || ''));
    setPrice(String(p.costPrice ?? 0));
    setSellingPrice(String(p.sellingPrice ?? 0));
    setStock(String(p.stock ?? 0));
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreateInlineCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineCatName.trim()) {
      setInlineCatError('Category name is required.');
      return;
    }
    const catCode = (inlineCatCode.trim() || inlineCatName.trim().replace(/[^a-zA-Z]/g, '').slice(0, 4)).toUpperCase();
    try {
      setInlineCatCreating(true);
      setInlineCatError(null);
      const newId = await addCategory({
        name: inlineCatName.trim(),
        code: catCode || 'CAT',
        description: '',
        color: 'indigo'
      });
      setCategoryId(newId);
      setShowInlineCategoryModal(false);
      setInlineCatName('');
      setInlineCatCode('');
    } catch (err: unknown) {
      setInlineCatError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setInlineCatCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const parsedPrice = parseFloat(price);
    const parsedSellingPrice = parseFloat(sellingPrice);
    const parsedStock = parseInt(stock, 10);

    if (!trimmedName) {
      setError('Product Name is required.');
      return;
    }
    if (!categoryId) {
      setError('Category is required.');
      return;
    }
    if (price.trim() === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Valid Price (₹) is required.');
      return;
    }
    if (sellingPrice.trim() === '' || Number.isNaN(parsedSellingPrice) || parsedSellingPrice < 0) {
      setError('Valid Selling Price (₹) is required.');
      return;
    }
    if (stock.trim() === '' || Number.isNaN(parsedStock) || parsedStock < 0) {
      setError('Valid Stock Quantity is required.');
      return;
    }

    const catObj = categories.find(c => c.id === categoryId);
    const categoryName = catObj ? catObj.name : (editingProduct?.categoryName || 'General');

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: trimmedName,
          categoryId,
          categoryName,
          costPrice: parsedPrice,
          sellingPrice: parsedSellingPrice
        });
        if (rolePerm.canAdjustStock && parsedStock !== editingProduct.stock) {
          const delta = parsedStock - editingProduct.stock;
          await adjustStock(editingProduct.id, delta, 'Updated from Edit Product');
        }
      } else {
        await addProduct({
          name: trimmedName,
          sku: `PRD-${Date.now().toString().slice(-5)}`,
          barcode: '',
          categoryId,
          categoryName,
          costPrice: parsedPrice,
          sellingPrice: parsedSellingPrice,
          stock: parsedStock,
          minStockAlert: 10,
          unit: 'pcs',
          description: '',
          imageUrl: '',
          status: 'active'
        });
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setPageError(null);
      await deleteProduct(id);
      setDeletingProductId(null);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to delete product');
      setDeletingProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      {pageError && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pageError}</span>
          </div>
          <button onClick={() => setPageError(null)} className="text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Product Catalogue</h2>
          <p className="text-xs text-slate-400">
            Create, modify, categorize, and price merchandise items
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, SKU or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 hidden sm:inline">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No products match the specified criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Cost</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Margin</th>
                  <th className="py-2.5 px-3">Stock Level</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((p) => {
                  const margin = p.sellingPrice > 0 
                    ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(0) 
                    : 0;
                  const isOut = p.stock === 0;
                  const isLow = !isOut && p.stock <= p.minStockAlert;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{p.name}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">{p.description || 'No description'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px]">
                          {p.categoryName || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {formatCurrency(p.costPrice, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-white">
                        {formatCurrency(p.sellingPrice, currency)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {margin}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-bold ${
                            isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {p.stock} {p.unit}
                          </span>
                          {isOut && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                              Out
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rolePerm.canAdjustStock && (
                            <button
                              onClick={() => setSelectedProductForAdjust(p)}
                              title="Quick Stock Adjustment"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-slate-700 transition"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 border border-slate-700 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {rolePerm.canDeleteCore && (
                            <button
                              onClick={() => setDeletingProductId(p.id)}
                              title="Delete Product"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/40">
              <h3 className="font-bold text-white text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
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

              {/* 1. Product Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signature Dark Roast Coffee"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* 2. Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineCatError(null);
                      setInlineCatName('');
                      setInlineCatCode('');
                      setShowInlineCategoryModal(true);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Category</span>
                  </button>
                </div>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {editingProduct?.categoryId && !categories.some(c => c.id === editingProduct.categoryId) && (
                    <option value={editingProduct.categoryId}>
                      {editingProduct.categoryName || editingProduct.categoryId}
                    </option>
                  )}
                </select>
              </div>

              {/* 3. Price (₹) & 4. Selling Price (₹) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Selling Price (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 5. Stock Quantity */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Stock Quantity <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="0"
                  disabled={!!editingProduct && !rolePerm.canAdjustStock}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100">
            <h4 className="font-bold text-base text-white mb-2">Delete Product?</h4>
            <p className="text-xs text-slate-400 mb-4">
              This will permanently remove the product from your store catalogue. Existing historical sales and invoices will retain their recorded records.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingProductId(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingProductId)}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedProductForAdjust && (
        <StockAdjustModal
          product={selectedProductForAdjust}
          onClose={() => setSelectedProductForAdjust(null)}
        />
      )}

      {/* Quick Inline Category Modal */}
      {showInlineCategoryModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-400" />
                <span>Create New Category</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowInlineCategoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inlineCatError && (
              <div className="p-2.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inlineCatError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInlineCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beverages, Bakery, Organic"
                  value={inlineCatName}
                  onChange={(e) => setInlineCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Short Code (Optional)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. BEV, BAK, ORG"
                  value={inlineCatCode}
                  onChange={(e) => setInlineCatCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono uppercase focus:outline-hidden focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Leave blank to auto-generate from category name.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInlineCategoryModal(false)}
                  disabled={inlineCatCreating}
                  className="flex-1 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inlineCatCreating}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {inlineCatCreating ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Tags, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  AlertCircle, 
  AlertTriangle,
  X, 
  Check, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  ArrowRightLeft,
  Sparkles,
  Info
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Category, Product, ROLE_PERMISSIONS } from '../types/store';

export const CategoriesView: React.FC = () => {
  const { categories, products, addCategory, updateCategory, deleteCategory, reassignAndDeleteCategory } = useStore();
  const { role } = useAuth();
  const rolePerm = ROLE_PERMISSIONS[role];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in_use' | 'empty'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'count_desc' | 'code'>('name_asc');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [targetReassignCategoryId, setTargetReassignCategoryId] = useState<string>('');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('indigo');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const colors = [
    { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-400', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { id: 'amber', label: 'Amber', bg: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { id: 'rose', label: 'Rose', bg: 'bg-rose-500', text: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    { id: 'blue', label: 'Blue', bg: 'bg-blue-500', text: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { id: 'purple', label: 'Purple', bg: 'bg-purple-500', text: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', text: 'text-cyan-400', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    { id: 'orange', label: 'Orange', bg: 'bg-orange-500', text: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  ];

  const getColorConfig = (colorId?: string) => {
    return colors.find(c => c.id === colorId) || colors[0];
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setCode('');
    setDescription('');
    setColor('indigo');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Category) => {
    setEditingCategory(c);
    setName(c.name);
    setCode(c.code);
    setDescription(c.description || '');
    setColor(c.color || 'indigo');
    setError(null);
    setIsModalOpen(true);
  };

  // Auto-generate code from name if code is empty
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory && !code) {
      const generated = val
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 4)
        .toUpperCase();
      setCode(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Category Name and Short Code are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          color
        });
        setActionSuccess(`Category "${name.trim()}" updated successfully!`);
      } else {
        await addCategory({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          color
        });
        setActionSuccess(`Category "${name.trim()}" created successfully!`);
      }

      setIsModalOpen(false);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete guard modal
  const promptDeleteCategory = (cat: Category) => {
    setDeletingCategory(cat);
    setError(null);
    // Pick the first alternative category as default target for reassignment
    const otherCats = categories.filter(c => c.id !== cat.id);
    setTargetReassignCategoryId(otherCats[0]?.id || '');
  };

  // Execute safe delete (only if 0 products assigned)
  const handleDirectDelete = async () => {
    if (!deletingCategory) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await deleteCategory(deletingCategory.id);
      setActionSuccess(`Category "${deletingCategory.name}" removed successfully.`);
      setDeletingCategory(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reassign all assigned products first, then delete category
  const handleReassignAndDelete = async () => {
    if (!deletingCategory || !targetReassignCategoryId) {
      setError('Please select a target category to reassign the products to.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const targetCat = categories.find(c => c.id === targetReassignCategoryId);
      await reassignAndDeleteCategory(deletingCategory.id, targetReassignCategoryId);
      setActionSuccess(
        `Products reassigned to "${targetCat?.name || 'Selected Category'}" and category "${deletingCategory.name}" was deleted.`
      );
      setDeletingCategory(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reassign and delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered & Sorted Categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const assignedCount = products.filter(p => p.categoryId === cat.id).length;
        if (filterType === 'in_use' && assignedCount === 0) return false;
        if (filterType === 'empty' && assignedCount > 0) return false;

        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          cat.name.toLowerCase().includes(q) ||
          cat.code.toLowerCase().includes(q) ||
          (cat.description && cat.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        if (sortBy === 'code') return a.code.localeCompare(b.code);
        if (sortBy === 'count_desc') {
          const countA = products.filter(p => p.categoryId === a.id).length;
          const countB = products.filter(p => p.categoryId === b.id).length;
          return countB - countA;
        }
        return 0;
      });
  }, [categories, products, searchQuery, filterType, sortBy]);

  // Overall metrics
  const totalCategories = categories.length;
  const categorizedProductsCount = products.filter(p => p.categoryId && categories.some(c => c.id === p.categoryId)).length;
  const unassignedProductsCount = products.length - categorizedProductsCount;

  // Products assigned to currently deleting category
  const assignedToDeleting = deletingCategory
    ? products.filter(p => p.categoryId === deletingCategory.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Custom Category Management</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Firestore Synced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, categorize, organize, and safeguard department classifications for all store items
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Category</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[11px] uppercase font-semibold">Total Categories</span>
            <Tags className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalCategories}</div>
          <span className="text-[11px] text-slate-400 font-medium">Shared across all staff devices</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[11px] uppercase font-semibold">Categorized Items</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{categorizedProductsCount}</div>
          <span className="text-[11px] text-slate-400 font-medium">Of {products.length} total SKUs</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[11px] uppercase font-semibold">Unassigned / General</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{unassignedProductsCount}</div>
          <span className="text-[11px] text-slate-400 font-medium">Items without category</span>
        </div>
      </div>

      {/* Search, Filter, and Sort Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by category name, code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterType === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({categories.length})
            </button>
            <button
              onClick={() => setFilterType('in_use')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterType === 'in_use' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              In Use
            </button>
            <button
              onClick={() => setFilterType('empty')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterType === 'empty' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Empty (0)
            </button>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="name_asc">Sort: Name (A-Z)</option>
            <option value="name_desc">Sort: Name (Z-A)</option>
            <option value="count_desc">Sort: Most Products</option>
            <option value="code">Sort: Short Code</option>
          </select>
        </div>
      </div>

      {/* Categories Cards Grid */}
      {filteredCategories.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 space-y-3">
          <Tags className="w-12 h-12 stroke-1 text-slate-600 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-300">No categories match your filter</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? 'Try clearing search query or changing filters' : 'Create your first custom category using the button above'}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Category</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const assignedProducts = products.filter(p => p.categoryId === cat.id);
            const count = assignedProducts.length;
            const colorCfg = getColorConfig(cat.color);
            const isExpanded = expandedCategoryId === cat.id;

            return (
              <div
                key={cat.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition flex flex-col justify-between shadow-xs"
              >
                <div>
                  {/* Top Bar with Code & Actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${colorCfg.badge}`}>
                        {cat.code}
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorCfg.id === 'indigo' ? '#6366f1' : colorCfg.id === 'emerald' ? '#10b981' : colorCfg.id === 'amber' ? '#f59e0b' : colorCfg.id === 'rose' ? '#f43f5e' : colorCfg.id === 'blue' ? '#3b82f6' : colorCfg.id === 'purple' ? '#a855f7' : colorCfg.id === 'cyan' ? '#06b6d4' : '#f97316' }} />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(cat)}
                        title="Edit Category Details"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 border border-slate-700 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {rolePerm.canDeleteCore && (
                        <button
                          onClick={() => promptDeleteCategory(cat)}
                          title="Delete Category"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-white text-base mb-1">{cat.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {cat.description || 'No description provided'}
                  </p>
                </div>

                {/* Bottom Section: Product Count & Expand Preview */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Assigned Merchandise:</span>
                    <button
                      onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      className={`font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition ${
                        count > 0 
                          ? 'bg-slate-800 border-slate-700 text-white hover:border-indigo-500' 
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{count} {count === 1 ? 'item' : 'items'}</span>
                      {count > 0 && (
                        isExpanded ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Expandable Preview of Assigned Products */}
                  {isExpanded && count > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 text-xs animate-in fade-in">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Assigned Products:
                      </span>
                      {assignedProducts.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-0.5 border-b border-slate-700/40 last:border-none">
                          <span className="font-medium text-slate-200 truncate pr-2">{p.name}</span>
                          <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                            {p.stock} {p.unit}
                          </span>
                        </div>
                      ))}
                      {count > 4 && (
                        <p className="text-[10px] text-slate-500 italic pt-0.5">
                          + {count - 4} more products in this category
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {editingCategory ? 'Edit Category' : 'Create Custom Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Category Name * <span className="text-slate-500 font-normal">(e.g. Dairy &amp; Organic Eggs)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Dairy & Cheese"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Short Code */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">
                    Short Department Code * <span className="text-slate-500 font-normal">(max 6 characters)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{code.length}/6</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. DAIRY"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-hidden focus:border-indigo-500 uppercase"
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Color Tag</label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`p-1.5 rounded-xl border flex items-center gap-2 transition ${
                        color === c.id 
                          ? 'bg-slate-800 border-indigo-500 shadow-xs' 
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bg} shrink-0`} />
                      <span className="text-[11px] text-slate-200 truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe items belonging to this category..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Live Preview Badge */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-400 font-medium text-[11px]">Preview Badge:</span>
                <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${getColorConfig(color).badge}`}>
                  {code || 'CODE'} • {name || 'Category Name'}
                </span>
              </div>

              {/* Form Actions */}
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
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Guard Modal (Requirement 8) */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-2xl">
            {assignedToDeleting.length > 0 ? (
              /* Case A: Products are currently assigned -> Block direct deletion & provide reassignment */
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Cannot Directly Delete Category</h4>
                    <p className="text-[11px] text-amber-200/90 mt-0.5">
                      There are currently <span className="font-bold text-white">{assignedToDeleting.length} product(s)</span> assigned to <span className="font-bold text-white">&quot;{deletingCategory.name}&quot;</span>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Assigned Products ({assignedToDeleting.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                    {assignedToDeleting.map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-slate-300 py-0.5 border-b border-slate-700/40 last:border-none">
                        <span className="truncate pr-2 font-sans font-medium">{p.name}</span>
                        <span className="text-slate-400 shrink-0">SKU: {p.sku}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reassignment Option */}
                {categories.filter(c => c.id !== deletingCategory.id).length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-900/50 space-y-2">
                    <label className="block text-indigo-300 font-semibold">
                      Reassign these {assignedToDeleting.length} product(s) to another category first:
                    </label>
                    <select
                      value={targetReassignCategoryId}
                      onChange={(e) => setTargetReassignCategoryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                    >
                      {categories.filter(c => c.id !== deletingCategory.id).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      All products above will be reassigned immediately in Firestore, and the category &quot;{deletingCategory.name}&quot; will then be deleted.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-800 text-slate-400 text-xs">
                    No other categories exist to reassign products to. Please create another category first, or edit the products before deleting this category.
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  {categories.filter(c => c.id !== deletingCategory.id).length > 0 && (
                    <button
                      type="button"
                      onClick={handleReassignAndDelete}
                      disabled={isSubmitting || !targetReassignCategoryId}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Reassigning...' : 'Reassign & Delete'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Case B: 0 products assigned -> safe to delete */
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">Delete Category &quot;{deletingCategory.name}&quot;?</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Are you sure you want to delete this category? There are currently zero products assigned to it.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectDelete}
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

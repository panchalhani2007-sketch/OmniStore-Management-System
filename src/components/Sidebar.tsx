import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Boxes, 
  Receipt, 
  Users, 
  RotateCcw, 
  Tags, 
  UserCog, 
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { ROLE_PERMISSIONS, StoreTab } from '../types/store';

interface SidebarProps {
  currentTab: StoreTab;
  setCurrentTab: (tab: StoreTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface NavItem {
  id: StoreTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileMenuOpen,
  setMobileMenuOpen
}) => {
  const { role } = useAuth();
  const { products } = useStore();

  const roleInfo = ROLE_PERMISSIONS[role];
  const allowedTabs = roleInfo.allowedTabs;

  // Compute live low stock badge count
  const lowStockCount = products.filter(p => p.stock <= p.minStockAlert).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'products', label: role === 'manager' ? 'Add Product' : 'Products', icon: Package },
    { id: 'returns', label: role === 'billing' ? 'Return & Refund' : 'Returns & Refunds', icon: RotateCcw },
    { id: 'sales', label: 'Sales & Receipts', icon: Receipt },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'employees', label: 'Staff & Roles', icon: UserCog },
  ];

  const visibleNavItems = navItems.filter(item => allowedTabs.includes(item.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              OS
            </div>
            <span className="font-bold text-white text-base">Navigation</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Role Banner in Sidebar */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Role</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${roleInfo.color}`}>
                {roleInfo.name}
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {roleInfo.description}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Low Stock Alert Footer Badge (only for roles with Inventory access) */}
        {allowedTabs.includes('inventory') && lowStockCount > 0 && (
          <div className="p-3 m-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <div className="flex items-center gap-2 font-semibold mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Attention Needed</span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              {lowStockCount} {lowStockCount === 1 ? 'product is' : 'products are'} low or out of stock.
            </p>
          </div>
        )}
      </aside>
    </>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Store, 
  LogIn,
  UserCheck, 
  ShieldCheck, 
  ShoppingCart, 
  Menu,
  ChevronDown,
  Bell,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { ROLE_PERMISSIONS, UserRole, StoreTab } from '../types/store';

interface NavbarProps {
  currentTab: StoreTab;
  setCurrentTab: (tab: StoreTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { user, profile, role, isAuthorizedAdmin, simulatedRole, setSimulatedRole, openLoginPage } = useAuth();
  const { products, categories, settings, syncTimestamp } = useStore();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [alertDropdownOpen, setAlertDropdownOpen] = useState(false);
  const alertContainerRef = useRef<HTMLDivElement>(null);
  const roleContainerRef = useRef<HTMLDivElement>(null);

  const roleInfo = ROLE_PERMISSIONS[role];
  const canViewStockAlerts = role === 'admin' || role === 'manager';

  // Real-time low-stock products derived directly from Firestore live product & category snapshots
  const lowStockAlerts = useMemo(() => {
    if (!canViewStockAlerts) return [];

    return products
      .filter((p) => {
        if (p.status === 'archived') return false;
        const minLevel = typeof p.minStockAlert === 'number' ? p.minStockAlert : 10;
        return p.stock <= minLevel;
      })
      .map((p) => {
        const minLevel = typeof p.minStockAlert === 'number' ? p.minStockAlert : 10;
        const matchedCategory = p.categoryId
          ? categories.find((c) => c.id === p.categoryId)?.name
          : undefined;
        return {
          id: p.id,
          name: p.name,
          currentStock: p.stock,
          minStockLevel: minLevel,
          category: matchedCategory || p.categoryName || 'Uncategorized',
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock || a.name.localeCompare(b.name));
  }, [canViewStockAlerts, products, categories]);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (alertContainerRef.current && !alertContainerRef.current.contains(target)) {
        setAlertDropdownOpen(false);
      }
      if (roleContainerRef.current && !roleContainerRef.current.contains(target)) {
        setRoleDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAlertDropdownOpen(false);
        setRoleDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Store Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 lg:hidden rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentTab(roleInfo.allowedTabs[0] || 'inventory')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base md:text-lg tracking-tight text-white leading-tight">
                  {settings.storeName}
                </span>
                <span className="hidden sm:inline-flex items-center text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  POS Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xs">
                {settings.address || 'Real-time Retail & Inventory'}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: Live Sync Pulse, Low Stock Notification Bell & Quick POS */}
        <div className="flex items-center gap-3">
          {/* Real-time Status Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-medium">Firestore Live</span>
            {syncTimestamp && (
              <span className="text-slate-400 text-[11px]">
                {syncTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* Low Stock Alert Notification Bell (Admin & Manager) */}
          {canViewStockAlerts && (
            <div className="relative" ref={alertContainerRef}>
              <button
                type="button"
                onClick={() => {
                  setAlertDropdownOpen((prev) => !prev);
                  setRoleDropdownOpen(false);
                }}
                aria-label="Low Stock Alert Notifications"
                aria-expanded={alertDropdownOpen}
                title="Low Stock Alerts"
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700 transition"
              >
                <Bell className="w-4 h-4" />
                {lowStockAlerts.length > 0 && (
                  <span
                    data-testid="low-stock-badge"
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-slate-900"
                  >
                    {lowStockAlerts.length > 99 ? '99+' : lowStockAlerts.length}
                  </span>
                )}
              </button>

              {alertDropdownOpen && (
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[4.25rem] sm:top-auto sm:mt-2 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${lowStockAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                      <span className="font-bold text-white text-sm">Low Stock Alerts</span>
                      {lowStockAlerts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 font-bold text-[10px]">
                          {lowStockAlerts.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlertDropdownOpen(false)}
                      aria-label="Close notifications"
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {lowStockAlerts.length === 0 ? (
                    <div className="p-6 text-center space-y-2 text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="font-semibold text-slate-200">No Low Stock Alerts</p>
                      <p className="text-[11px] text-slate-400">
                        All products are currently above their minimum stock level.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                      {lowStockAlerts.map((item) => {
                        const isOutOfStock = item.currentStock === 0;
                        return (
                          <div
                            key={item.id}
                            className="px-4 py-3 hover:bg-slate-800/40 transition space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-white text-xs leading-snug">
                                {item.name}
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                                  isOutOfStock
                                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Category</span>
                                <span className="text-slate-200 font-medium truncate block">
                                  {item.category}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Current Stock</span>
                                <span className={`font-mono font-bold ${isOutOfStock ? 'text-red-400' : 'text-amber-400'}`}>
                                  {item.currentStock}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Min Stock Level</span>
                                <span className="font-mono font-semibold text-slate-200">
                                  {item.minStockLevel}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick POS Trigger if allowed */}
          {roleInfo.canProcessSale && currentTab !== 'pos' && (
            <button
              onClick={() => setCurrentTab('pos')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/25 transition active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Open POS</span>
            </button>
          )}

          {/* Role Badge / Admin Perspective Switcher */}
          {isAuthorizedAdmin ? (
            <div className="relative" ref={roleContainerRef}>
              <button
                onClick={() => {
                  setRoleDropdownOpen(!roleDropdownOpen);
                  setAlertDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 transition"
                title="Change active perspective for testing"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <div className="text-left hidden sm:block">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Role</span>
                  <span className="font-semibold text-slate-200">{roleInfo.name}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-700">
                    <p className="font-semibold text-slate-200">Admin Perspective Switcher</p>
                    <p className="text-[11px] text-slate-400">Preview store as any of the 3 roles:</p>
                  </div>

                  {(['admin', 'manager', 'billing'] as UserRole[]).map((r) => {
                    const perm = ROLE_PERMISSIONS[r];
                    const isCurrent = role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          setSimulatedRole(r === profile?.role ? null : r);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 transition ${
                          isCurrent ? 'bg-indigo-600/15 text-indigo-300 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-200">{perm.name}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{perm.description}</div>
                        </div>
                        {isCurrent && <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}

                  {simulatedRole && (
                    <div className="px-3 pt-2 mt-1 border-t border-slate-700">
                      <button
                        onClick={() => {
                          setSimulatedRole(null);
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-center py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300"
                      >
                        Reset to actual profile ({profile?.role || 'admin'})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/70 text-xs text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Assigned Role</span>
                <span className="font-semibold text-slate-200">{roleInfo.name}</span>
              </div>
            </div>
          )}

          {/* Go to Login Page (Admin only - keeps Firebase session & Admin role active) */}
          {isAuthorizedAdmin && (
            <button
              type="button"
              onClick={() => openLoginPage()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 border border-slate-700/80 hover:border-indigo-500/40 text-xs font-semibold transition whitespace-nowrap"
              title="Open Login Page without logging out"
              aria-label="Go to Login Page"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Go to Login Page</span>
            </button>
          )}

          {/* User Profile */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right">
              <p className="text-xs font-semibold text-white leading-tight">
                {profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Staff'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {user?.email || 'Authenticated'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

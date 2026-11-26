import React from 'react';
import { 
  Store, 
  RefreshCw, 
  LogOut, 
  UserCheck, 
  ShieldCheck, 
  ShoppingCart, 
  Menu,
  ChevronDown
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
  const { user, profile, role, simulatedRole, setSimulatedRole, signOut } = useAuth();
  const { settings, syncTimestamp } = useStore();

  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);

  const roleInfo = ROLE_PERMISSIONS[role];

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

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
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

        {/* Center / Right: Live Sync Pulse & Quick POS */}
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
          {profile?.role === 'admin' || user?.email === 'panchalhani2007@gmail.com' ? (
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
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
                    <p className="text-[11px] text-slate-400">Preview store as any of the 4 roles:</p>
                  </div>

                  {(['admin', 'manager', 'billing', 'inventory'] as UserRole[]).map((r) => {
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

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-white leading-tight">
                {profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Staff'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {user?.email || 'Authenticated'}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/80 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

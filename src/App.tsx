import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './views/DashboardView';
import { POSBillingView } from './views/POSBillingView';
import { ProductsView } from './views/ProductsView';
import { InventoryView } from './views/InventoryView';
import { SalesView } from './views/SalesView';
import { ReturnsView } from './views/ReturnsView';
import { CustomersView } from './views/CustomersView';
import { CategoriesView } from './views/CategoriesView';
import { EmployeesView } from './views/EmployeesView';
import { StoreTab, ROLE_PERMISSIONS, Sale } from './types/store';
import { Loader2, Store, ShieldAlert, LogOut, X } from 'lucide-react';

const VALID_TABS: StoreTab[] = [
  'dashboard',
  'pos',
  'products',
  'inventory',
  'sales',
  'customers',
  'returns',
  'categories',
  'employees',
];

function extractTabFromLocation(): { requestedRoute: string | null; tab: StoreTab | null } {
  const params = new URLSearchParams(window.location.search);
  const queryTab = params.get('tab');
  const hashPath = window.location.hash.replace(/^#\/?/, '').trim();
  const pathSegment = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';

  const raw = (queryTab || hashPath || pathSegment).toLowerCase();
  if (!raw) return { requestedRoute: null, tab: null };
  if (raw === 'add-product') return { requestedRoute: raw, tab: 'products' };
  if (VALID_TABS.includes(raw as StoreTab)) {
    return { requestedRoute: raw, tab: raw as StoreTab };
  }
  return { requestedRoute: raw, tab: null };
}

function MainApp() {
  const { user, role, isAuthorizedAdmin, loading, isAccountDisabled, isUnauthorizedAccount, signOut } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<StoreTab>('inventory');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [returnInitialSale, setReturnInitialSale] = useState<Sale | null>(null);
  const [blockedUrlNotice, setBlockedUrlNotice] = useState<string | null>(null);

  const roleInfo = ROLE_PERMISSIONS[role];

  const isTabAllowed = React.useCallback(
    (tab: StoreTab): boolean => {
      if (!roleInfo.allowedTabs.includes(tab)) return false;
      if (tab === 'employees' && !isAuthorizedAdmin) return false;
      return true;
    },
    [roleInfo, isAuthorizedAdmin]
  );

  const navigateToTab = React.useCallback(
    (nextTab: StoreTab) => {
      if (!isTabAllowed(nextTab)) {
        const fallback = roleInfo.allowedTabs[0] || 'inventory';
        setBlockedUrlNotice(`Access blocked: Your ${roleInfo.name} role does not have permission to view "${nextTab}".`);
        setCurrentTab(fallback);
        if (window.location.pathname !== `/${fallback}`) {
          window.history.replaceState(null, '', `/${fallback}`);
        }
        return;
      }
      setBlockedUrlNotice(null);
      setCurrentTab(nextTab);
      if (window.location.pathname !== `/${nextTab}` || window.location.search || window.location.hash) {
        window.history.pushState(null, '', `/${nextTab}`);
      }
    },
    [isTabAllowed, roleInfo]
  );

  // Enforce URL & role permissions on initial load, role change, and browser navigation (popstate/hashchange)
  useEffect(() => {
    if (loading || !user || isUnauthorizedAccount || isAccountDisabled) return;

    const syncFromLocation = () => {
      const { requestedRoute, tab } = extractTabFromLocation();
      const fallback = roleInfo.allowedTabs[0] || 'inventory';

      if (requestedRoute) {
        if (tab && isTabAllowed(tab)) {
          setCurrentTab(tab);
          return;
        }
        setBlockedUrlNotice(
          `Access blocked: Your ${roleInfo.name} role is not authorized to open "/${requestedRoute}".`
        );
        setCurrentTab(fallback);
        window.history.replaceState(null, '', `/${fallback}`);
        return;
      }

      if (!isTabAllowed(currentTab)) {
        setCurrentTab(fallback);
        window.history.replaceState(null, '', `/${fallback}`);
      } else {
        window.history.replaceState(null, '', `/${currentTab}`);
      }
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, [loading, user, roleInfo, isTabAllowed, currentTab]);

  // Reset active route on sign-out so a newly registered Admin lands cleanly on the Admin Dashboard
  useEffect(() => {
    if (!loading && !user) {
      setCurrentTab('inventory');
      setBlockedUrlNotice(null);
      if (window.location.pathname !== '/' && window.location.pathname !== '/inventory') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 animate-pulse text-white">
            <Store className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Connecting to Store Database...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  if (isUnauthorizedAccount) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-7 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Account Not Authorized</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The account ({user.email}) is not an authorized staff profile. Only Billing Staff accounts created by the Store Administrator in Staff &amp; Roles can sign in.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 inline-flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  if (isAccountDisabled) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-7 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Staff Account Deactivated</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your store account ({user.email}) has been marked inactive by the Store Administrator. Please contact your Admin to restore access.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 inline-flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Fixed Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={navigateToTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex max-w-(--breakpoint-2xl) w-full mx-auto overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={navigateToTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Dynamic View Container (Role-Protected) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4">
          {blockedUrlNotice && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{blockedUrlNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setBlockedUrlNotice(null)}
                className="text-rose-300 hover:text-white"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isTabAllowed(currentTab) && (
            <>
              {currentTab === 'dashboard' && <DashboardView setCurrentTab={navigateToTab} />}
              {currentTab === 'pos' && <POSBillingView />}
              {currentTab === 'products' && <ProductsView />}
              {currentTab === 'inventory' && <InventoryView />}
              {currentTab === 'sales' && (
                <SalesView
                  setCurrentTab={navigateToTab}
                  onInitiateReturn={(sale) => {
                    setReturnInitialSale(sale);
                    navigateToTab('returns');
                  }}
                />
              )}
              {currentTab === 'returns' && <ReturnsView initialSale={returnInitialSale} />}
              {currentTab === 'customers' && <CustomersView />}
              {currentTab === 'categories' && <CategoriesView />}
              {currentTab === 'employees' && isAuthorizedAdmin && <EmployeesView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <MainApp />
      </StoreProvider>
    </AuthProvider>
  );
}

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
import { ReportsView } from './views/ReportsView';
import { PurchasesView } from './views/PurchasesView';
import { ReturnsView } from './views/ReturnsView';
import { CustomersView } from './views/CustomersView';
import { SuppliersView } from './views/SuppliersView';
import { ExpensesView } from './views/ExpensesView';
import { CategoriesView } from './views/CategoriesView';
import { EmployeesView } from './views/EmployeesView';
import { SettingsView } from './views/SettingsView';
import { StoreTab, ROLE_PERMISSIONS, Sale } from './types/store';
import { Loader2, Store, ShieldAlert, LogOut } from 'lucide-react';

function MainApp() {
  const { user, role, loading, isAccountDisabled, signOut } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<StoreTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [returnInitialSale, setReturnInitialSale] = useState<Sale | null>(null);

  const roleInfo = ROLE_PERMISSIONS[role];

  // Auto redirect if current tab is not allowed for this role
  useEffect(() => {
    if (!roleInfo.allowedTabs.includes(currentTab)) {
      setCurrentTab(roleInfo.allowedTabs[0] || 'pos');
    }
  }, [role, roleInfo, currentTab]);

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
        setCurrentTab={setCurrentTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex max-w-(--breakpoint-2xl) w-full mx-auto overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Dynamic View Container (Role-Protected) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {roleInfo.allowedTabs.includes(currentTab) && (
            <>
              {currentTab === 'dashboard' && <DashboardView setCurrentTab={setCurrentTab} />}
              {currentTab === 'pos' && <POSBillingView />}
              {currentTab === 'products' && <ProductsView />}
              {currentTab === 'inventory' && <InventoryView />}
              {currentTab === 'sales' && (
                <SalesView
                  setCurrentTab={setCurrentTab}
                  onInitiateReturn={(sale) => {
                    setReturnInitialSale(sale);
                    setCurrentTab('returns');
                  }}
                />
              )}
              {currentTab === 'reports' && <ReportsView />}
              {currentTab === 'purchases' && <PurchasesView />}
              {currentTab === 'returns' && <ReturnsView initialSale={returnInitialSale} />}
              {currentTab === 'customers' && <CustomersView />}
              {currentTab === 'suppliers' && <SuppliersView />}
              {currentTab === 'expenses' && <ExpensesView />}
              {currentTab === 'categories' && <CategoriesView />}
              {currentTab === 'employees' && <EmployeesView />}
              {currentTab === 'settings' && <SettingsView />}
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

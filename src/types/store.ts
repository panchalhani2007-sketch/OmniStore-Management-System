export type UserRole = 'admin' | 'manager' | 'billing' | 'inventory';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  unit: string;
  description?: string;
  imageUrl?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  totalSpent: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  suppliedCategories?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // item level discount
  total: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  costPrice: number;
  quantity: number;
  total: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'credit';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  cashierId: string;
  cashierName: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  costPrice: number;
  quantity: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  paymentStatus: 'paid' | 'pending';
  receivedStatus: 'received' | 'ordered' | 'partial';
  receivedDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  refundUnitPrice: number;
  restockStock: boolean;
  condition: 'good' | 'damaged';
}

export interface Return {
  id: string;
  returnNumber: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  items: ReturnItem[];
  totalRefund: number;
  reason: string;
  processedBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'Rent' | 'Utilities' | 'Salaries' | 'Maintenance' | 'Supplies' | 'Marketing' | 'Other';
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  change: number;
  newStock: number;
  reason: string;
  type: 'sale' | 'purchase' | 'return' | 'manual_adjustment';
  referenceId?: string;
  createdBy: string;
  createdAt: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  taxRate: number;
  receiptFooter: string;
  updatedAt?: string;
}

export type StoreTab = 
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'reports'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'returns'
  | 'expenses'
  | 'categories'
  | 'employees'
  | 'settings';

export const ROLE_PERMISSIONS: Record<UserRole, {
  name: string;
  color: string;
  description: string;
  allowedTabs: StoreTab[];
  canEditEmployees: boolean;
  canEditSettings: boolean;
  canDeleteCore: boolean;
  canAdjustStock: boolean;
  canProcessSale: boolean;
  canProcessReturn: boolean;
  canAddExpenses: boolean;
}> = {
  admin: {
    name: 'Admin',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    description: 'Full system control, staff management, financial reports, all operations',
    allowedTabs: [
      'dashboard', 'pos', 'products', 'inventory', 'sales', 'reports',
      'customers', 'suppliers', 'purchases', 'returns',
      'expenses', 'categories', 'employees', 'settings'
    ],
    canEditEmployees: true,
    canEditSettings: true,
    canDeleteCore: true,
    canAdjustStock: true,
    canProcessSale: true,
    canProcessReturn: true,
    canAddExpenses: true,
  },
  manager: {
    name: 'Manager',
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    description: 'Operational manager with full store, inventory, sales, and purchases control',
    allowedTabs: [
      'dashboard', 'pos', 'products', 'inventory', 'sales', 'reports',
      'customers', 'suppliers', 'purchases', 'returns',
      'expenses', 'categories', 'employees', 'settings'
    ],
    canEditEmployees: false,
    canEditSettings: false,
    canDeleteCore: false,
    canAdjustStock: true,
    canProcessSale: true,
    canProcessReturn: true,
    canAddExpenses: true,
  },
  billing: {
    name: 'Billing Staff',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    description: 'Cashier & POS terminal access, stock lookup, customer creation, sales and returns',
    allowedTabs: ['pos', 'sales', 'inventory', 'customers', 'returns'],
    canEditEmployees: false,
    canEditSettings: false,
    canDeleteCore: false,
    canAdjustStock: false,
    canProcessSale: true,
    canProcessReturn: true,
    canAddExpenses: false,
  },
  inventory: {
    name: 'Inventory Staff',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: 'Warehouse & stock keeper: inventory tables, alerts, purchases stock-in, products view',
    allowedTabs: ['inventory', 'products', 'purchases', 'categories', 'suppliers'],
    canEditEmployees: false,
    canEditSettings: false,
    canDeleteCore: false,
    canAdjustStock: true,
    canProcessSale: false,
    canProcessReturn: false,
    canAddExpenses: false,
  },
};

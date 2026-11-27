export type UserRole = 'admin' | 'manager' | 'billing';

export const MAX_ADMIN_ACCOUNTS = 1;
export const MAX_MANAGER_ACCOUNTS = 2;

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
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'cash';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  cashierId: string;
  cashierName: string;
  notes?: string;
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
  receiptFooter: string;
  updatedAt?: string;
}

export type StoreTab = 
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'returns'
  | 'categories'
  | 'employees';

export const ROLE_PERMISSIONS: Record<UserRole, {
  name: string;
  color: string;
  description: string;
  allowedTabs: StoreTab[];
  canEditEmployees: boolean;
  canDeleteCore: boolean;
  canManageCategories: boolean;
  canAdjustStock: boolean;
  canProcessSale: boolean;
  canProcessReturn: boolean;
}> = {
  admin: {
    name: 'Admin',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    description: 'Authorized store administrator: inventory, products, sales, customers, categories, and staff management',
    allowedTabs: [
      'inventory', 'products', 'sales', 'customers', 'categories', 'employees'
    ],
    canEditEmployees: true,
    canDeleteCore: true,
    canManageCategories: true,
    canAdjustStock: true,
    canProcessSale: false,
    canProcessReturn: false,
  },
  manager: {
    name: 'Manager',
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    description: 'Store manager: inventory tracking, add product, and categories management',
    allowedTabs: [
      'inventory', 'products', 'categories'
    ],
    canEditEmployees: false,
    canDeleteCore: false,
    canManageCategories: true,
    canAdjustStock: true,
    canProcessSale: false,
    canProcessReturn: false,
  },
  billing: {
    name: 'Billing Staff',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    description: 'Cashier & POS terminal access, return & refund processing, sales receipts, and customer records',
    allowedTabs: ['pos', 'returns', 'sales', 'customers'],
    canEditEmployees: false,
    canDeleteCore: false,
    canManageCategories: false,
    canAdjustStock: false,
    canProcessSale: true,
    canProcessReturn: true,
  },
};

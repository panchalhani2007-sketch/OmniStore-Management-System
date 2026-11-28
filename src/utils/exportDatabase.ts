import blueprint from '../../firebase-blueprint.json';
import {
  Category,
  Customer,
  Product,
  Return,
  Sale,
  StockLog,
  StoreSettings,
  UserProfile
} from '../types/store';

export interface LiveDatabaseExportInput {
  products: Product[];
  categories: Category[];
  stockLogs: StockLog[];
  employees: UserProfile[];
  sales: Sale[];
  returns: Return[];
  customers: Customer[];
  settings: StoreSettings;
}

export function buildLiveDatabaseExportPayload(data: LiveDatabaseExportInput) {
  const sanitizedEmployees = data.employees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    phone: emp.phone || '',
    status: emp.status,
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt
  }));

  const inventorySummary = data.products.map((p) => {
    const minAlert = typeof p.minStockAlert === 'number' ? p.minStockAlert : 10;
    const stockStatus =
      p.stock <= 0 ? 'out_of_stock' : p.stock <= minAlert ? 'low_stock' : 'healthy';
    return {
      productId: p.id,
      productName: p.name,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      currentStock: p.stock,
      minStockAlert: minAlert,
      stockStatus,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      updatedAt: p.updatedAt
    };
  });

  const totalRecords =
    data.products.length +
    data.categories.length +
    data.stockLogs.length +
    sanitizedEmployees.length +
    data.sales.length +
    data.returns.length +
    data.customers.length;

  return {
    databaseInfo: {
      application: 'OmniStore POS & Inventory Management System',
      storageEngine: 'Firebase Cloud Firestore',
      exportedAt: new Date().toISOString(),
      source: 'live_firestore',
      isDatabaseEmpty: totalRecords === 0,
      secretsExcluded: true
    },
    counts: {
      products: data.products.length,
      categories: data.categories.length,
      inventoryItems: inventorySummary.length,
      stockLogs: data.stockLogs.length,
      employees: sanitizedEmployees.length,
      sales: data.sales.length,
      returns: data.returns.length,
      customers: data.customers.length
    },
    schema: blueprint,
    collections: {
      store_settings: [
        {
          id: data.settings.id || 'general',
          storeName: data.settings.storeName,
          address: data.settings.address,
          phone: data.settings.phone,
          email: data.settings.email,
          currencySymbol: data.settings.currencySymbol,
          receiptFooter: data.settings.receiptFooter,
          updatedAt: data.settings.updatedAt || null
        }
      ],
      categories: data.categories,
      products: data.products,
      inventory: {
        stockSummary: inventorySummary,
        stock_logs: data.stockLogs
      },
      employees: sanitizedEmployees,
      customers: data.customers,
      sales: data.sales,
      returns: data.returns
    }
  };
}

export function downloadLiveDatabaseJson(data: LiveDatabaseExportInput) {
  const payload = buildLiveDatabaseExportPayload(data);
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'OmniStore_Database.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

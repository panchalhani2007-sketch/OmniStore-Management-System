import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch, 
  increment,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { 
  Product, 
  Category, 
  Customer, 
  Sale, 
  SaleItem, 
  Return, 
  ReturnItem, 
  StockLog, 
  StoreSettings, 
  UserProfile
} from '../types/store';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { resolveCurrencySymbol } from '../utils/currency';

interface StoreContextType {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  sales: Sale[];
  returns: Return[];
  stockLogs: StockLog[];
  employees: UserProfile[];
  settings: StoreSettings;
  loading: boolean;
  syncTimestamp: Date | null;
  
  // Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, change: number, reason: string) => Promise<void>;
  
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reassignAndDeleteCategory: (categoryId: string, targetCategoryId: string) => Promise<void>;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'totalSpent'>) => Promise<string>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  processSale: (saleData: Omit<Sale, 'id' | 'createdAt' | 'items'>, items: SaleItem[]) => Promise<string>;

  processReturn: (returnData: Omit<Return, 'id' | 'createdAt' | 'items'>, items: ReturnItem[]) => Promise<string>;

  seedInitialData: () => Promise<void>;
}

const defaultSettings: StoreSettings = {
  id: 'general',
  storeName: 'OmniStore Retail & Groceries',
  address: '742 Evergreen Terrace, Springfield, OR',
  phone: '+1 (555) 438-9201',
  email: 'contact@omnistore.internal',
  currencySymbol: '₹',
  receiptFooter: 'Thank you for shopping with us! Please retain this receipt for returns within 14 days.',
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, role, isAuthorizedAdmin, loading: authLoading, authTransitioning, isUnauthorizedAccount, isAccountDisabled } = useAuth();
  const canManageSettingsRef = React.useRef(false);
  canManageSettingsRef.current = isAuthorizedAdmin;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  
  const [loading, setLoading] = useState(true);
  const [syncTimestamp, setSyncTimestamp] = useState<Date | null>(null);

  // Set up real-time listeners only when user is authenticated and role is resolved
  useEffect(() => {
    if (authLoading || !user || !profile || isUnauthorizedAccount || isAccountDisabled || authTransitioning) {
      setProducts([]);
      setCategories([]);
      setCustomers([]);
      setSales([]);
      setReturns([]);
      setStockLogs([]);
      setEmployees([]);
      setSettings(defaultSettings);
      setSyncTimestamp(null);
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    const handleListenerError = (error: unknown, path: string) => {
      if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    };

    // Products listener
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(list);
        setSyncTimestamp(new Date());
      },
      (error) => handleListenerError(error, 'products')
    );

    // Categories listener
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(list);
      },
      (error) => handleListenerError(error, 'categories')
    );

    const canReadCustomersAndSales =
      role === 'admin' || role === 'billing' || isAuthorizedAdmin;
    const canReadReturns = role === 'billing' || isAuthorizedAdmin;

    // Customers listener (Admin & Billing Staff only)
    const unsubCustomers = canReadCustomersAndSales
      ? onSnapshot(
          collection(db, 'customers'),
          (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(list);
          },
          (error) => handleListenerError(error, 'customers')
        )
      : (() => {
          setCustomers([]);
          return () => {};
        })();

    // Sales listener (Admin & Billing Staff only)
    const unsubSales = canReadCustomersAndSales
      ? onSnapshot(
          query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
          (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
            setSales(list);
          },
          (error) => handleListenerError(error, 'sales')
        )
      : (() => {
          setSales([]);
          return () => {};
        })();

    // Returns listener (Billing Staff only)
    const unsubReturns = canReadReturns
      ? onSnapshot(
          query(collection(db, 'returns'), orderBy('createdAt', 'desc')),
          (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Return));
            setReturns(list);
          },
          (error) => handleListenerError(error, 'returns')
        )
      : (() => {
          setReturns([]);
          return () => {};
        })();

    const canReadStockLogs =
      role === 'admin' || role === 'manager' || isAuthorizedAdmin;

    // Stock Logs listener (Admin & Manager only)
    const unsubStockLogs = canReadStockLogs
      ? onSnapshot(
          query(collection(db, 'stock_logs'), orderBy('createdAt', 'desc')),
          (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLog));
            setStockLogs(list);
          },
          (error) => handleListenerError(error, 'stock_logs')
        )
      : (() => {
          setStockLogs([]);
          return () => {};
        })();

    // Employees listener (authorized Admin only)
    const unsubEmployees = isAuthorizedAdmin && role === 'admin'
      ? onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            setEmployees(list);
          },
          (error) => handleListenerError(error, 'users')
        )
      : (() => {
          setEmployees([]);
          return () => {};
        })();

    // Settings listener
    const unsubSettings = onSnapshot(
      doc(db, 'store_settings', 'general'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<StoreSettings>;
          const resolvedCurrency = resolveCurrencySymbol(data.currencySymbol);
          setSettings({ ...defaultSettings, ...data, id: 'general', currencySymbol: resolvedCurrency });

          // Persist INR symbol back to Firestore if legacy '$' was stored and user can manage settings
          if ((!data.currencySymbol || data.currencySymbol.trim() === '$') && canManageSettingsRef.current) {
            updateDoc(doc(db, 'store_settings', 'general'), {
              currencySymbol: '₹',
              updatedAt: new Date().toISOString()
            }).catch(() => {});
          }
        }
      },
      (error) => handleListenerError(error, 'store_settings/general')
    );

    setLoading(false);

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubSales();
      unsubReturns();
      unsubStockLogs();
      unsubEmployees();
      unsubSettings();
    };
  }, [user, profile, role, isAuthorizedAdmin, authLoading, authTransitioning, isUnauthorizedAccount, isAccountDisabled]);

  // Product CRUD
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: now,
        updatedAt: now
      });

      // Log initial stock
      if (productData.stock > 0) {
        await addDoc(collection(db, 'stock_logs'), {
          productId: docRef.id,
          productName: productData.name,
          previousStock: 0,
          change: productData.stock,
          newStock: productData.stock,
          reason: 'Initial inventory creation',
          type: 'manual_adjustment',
          referenceId: docRef.id,
          createdBy: user?.displayName || user?.email || 'Staff',
          createdAt: now
        });
      }

      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const docRef = doc(db, 'products', id);
      await updateDoc(docRef, {
        ...productData,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const adjustStock = async (productId: string, change: number, reason: string) => {
    try {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;

      const previousStock = prod.stock;
      const newStock = Math.max(0, previousStock + change);
      const now = new Date().toISOString();

      const batch = writeBatch(db);
      
      // Update product stock
      const prodRef = doc(db, 'products', productId);
      batch.update(prodRef, {
        stock: newStock,
        updatedAt: now
      });

      // Create stock log
      const logRef = doc(collection(db, 'stock_logs'));
      batch.set(logRef, {
        productId,
        productName: prod.name,
        previousStock,
        change,
        newStock,
        reason,
        type: 'manual_adjustment',
        createdBy: user?.displayName || user?.email || 'Staff',
        createdAt: now
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${productId}/stock`);
    }
  };

  // Category CRUD
  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'categories'), {
        ...categoryData,
        createdAt: now,
        updatedAt: now
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'categories');
    }
  };

  const updateCategory = async (id: string, categoryData: Partial<Category>) => {
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      const catRef = doc(db, 'categories', id);
      batch.update(catRef, {
        ...categoryData,
        updatedAt: now
      });

      // If the category name was changed, sync categoryName across all assigned products in Firestore
      if (categoryData.name) {
        const assignedProducts = products.filter(p => p.categoryId === id);
        for (const prod of assignedProducts) {
          const prodRef = doc(db, 'products', prod.id);
          batch.update(prodRef, {
            categoryName: categoryData.name,
            updatedAt: now
          });
        }
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  const reassignAndDeleteCategory = async (categoryId: string, targetCategoryId: string) => {
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      const targetCat = categories.find(c => c.id === targetCategoryId);
      const targetName = targetCat ? targetCat.name : 'General';

      // Reassign all products to the target category
      const assignedProducts = products.filter(p => p.categoryId === categoryId);
      for (const prod of assignedProducts) {
        const prodRef = doc(db, 'products', prod.id);
        batch.update(prodRef, {
          categoryId: targetCategoryId,
          categoryName: targetName,
          updatedAt: now
        });
      }

      // Delete the old category from Firestore
      const catRef = doc(db, 'categories', categoryId);
      batch.delete(catRef);

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${categoryId}`);
    }
  };

  // Customer CRUD
  const addCustomer = async (custData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'totalSpent'>) => {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'customers'), {
        ...custData,
        totalPurchases: 0,
        totalSpent: 0,
        createdAt: now,
        updatedAt: now
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    }
  };

  const updateCustomer = async (id: string, custData: Partial<Customer>) => {
    try {
      await updateDoc(doc(db, 'customers', id), {
        ...custData,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${id}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
    }
  };

  // Sales Transaction (Atomic stock verification, deduction + logs + customer update)
  const processSale = async (saleData: Omit<Sale, 'id' | 'createdAt' | 'items'>, items: SaleItem[]) => {
    try {
      const now = new Date().toISOString();
      const saleRef = doc(collection(db, 'sales'));

      await runTransaction(db, async (transaction) => {
        // 1. Read all involved product docs first (Firestore requires all reads before writes)
        const productSnapshots = await Promise.all(
          items.map(item => transaction.get(doc(db, 'products', item.productId)))
        );

        let customerSnap = null;
        if (saleData.customerId) {
          customerSnap = await transaction.get(doc(db, 'customers', saleData.customerId));
        }

        // 2. Verify live stock availability and prepare updates
        const stockUpdates: Array<{
          prodRef: ReturnType<typeof doc>;
          newStock: number;
          prevStock: number;
          item: SaleItem;
        }> = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const snap = productSnapshots[i];
          if (!snap.exists()) {
            throw new Error(`Product "${item.productName}" no longer exists in inventory.`);
          }
          const currentStock = Number(snap.data().stock ?? 0);
          if (currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for "${item.productName}". Available: ${currentStock}, Requested: ${item.quantity}.`
            );
          }
          stockUpdates.push({
            prodRef: doc(db, 'products', item.productId),
            prevStock: currentStock,
            newStock: currentStock - item.quantity,
            item
          });
        }

        // 3. Create Sale Document (enforce Cash payment mode)
        transaction.set(saleRef, {
          ...saleData,
          paymentMethod: 'cash',
          items,
          createdAt: now
        });

        // 4. Deduct stock & write audit logs
        for (const update of stockUpdates) {
          transaction.update(update.prodRef, {
            stock: update.newStock,
            updatedAt: now
          });

          const logRef = doc(collection(db, 'stock_logs'));
          transaction.set(logRef, {
            productId: update.item.productId,
            productName: update.item.productName,
            previousStock: update.prevStock,
            change: -update.item.quantity,
            newStock: update.newStock,
            reason: `Sale ${saleData.saleNumber}`,
            type: 'sale',
            referenceId: saleRef.id,
            createdBy: saleData.cashierName || 'Staff',
            createdAt: now
          });
        }

        // 5. Update customer totals if assigned and existing
        if (saleData.customerId && customerSnap && customerSnap.exists()) {
          const custRef = doc(db, 'customers', saleData.customerId);
          transaction.update(custRef, {
            totalPurchases: increment(1),
            totalSpent: increment(saleData.grandTotal),
            updatedAt: now
          });
        }
      });

      return saleRef.id;
    } catch (err) {
      if (err instanceof Error && (err.message.startsWith('Insufficient stock') || err.message.startsWith('Product "'))) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, 'sales');
    }
  };

  // Return Processing
  const processReturn = async (returnData: Omit<Return, 'id' | 'createdAt' | 'items'>, items: ReturnItem[]) => {
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      const returnRef = doc(collection(db, 'returns'));
      batch.set(returnRef, {
        ...returnData,
        items,
        createdAt: now
      });

      for (const item of items) {
        if (item.restockStock) {
          const prod = products.find(p => p.id === item.productId);
          const prevStock = prod ? prod.stock : 0;
          const newStock = prevStock + item.quantity;

          const prodRef = doc(db, 'products', item.productId);
          batch.update(prodRef, {
            stock: newStock,
            updatedAt: now
          });

          const logRef = doc(collection(db, 'stock_logs'));
          batch.set(logRef, {
            productId: item.productId,
            productName: item.productName,
            previousStock: prevStock,
            change: item.quantity,
            newStock,
            reason: `Return Restock ${returnData.returnNumber}`,
            type: 'return',
            referenceId: returnRef.id,
            createdBy: returnData.processedBy,
            createdAt: now
          });
        }
      }

      await batch.commit();
      return returnRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'returns');
    }
  };

  // Seed sample initial data if store is empty
  const seedInitialData = async () => {
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      // Seed Settings
      const settingsRef = doc(db, 'store_settings', 'general');
      batch.set(settingsRef, {
        ...defaultSettings,
        updatedAt: now
      });

      // Categories
      const categoriesData = [
        { name: 'Beverages & Coffee', code: 'BEV', color: 'emerald', description: 'Fresh beans, roasted brews, juices, and cold sodas' },
        { name: 'Fresh Bakery & Snacks', code: 'BAK', color: 'amber', description: 'Artisan sourdough, pastries, chips, and organic nuts' },
        { name: 'Electronics & Tech', code: 'TECH', color: 'blue', description: 'Cables, chargers, peripherals, and smart accessories' },
        { name: 'Household & Pantry', code: 'PNT', color: 'purple', description: 'Oils, condiments, cleaning essentials, and storage' },
        { name: 'Personal Care', code: 'CARE', color: 'rose', description: 'Soaps, lotions, sanitary, and wellness items' },
      ];

      const catMap: Record<string, string> = {};
      for (const cat of categoriesData) {
        const catRef = doc(collection(db, 'categories'));
        batch.set(catRef, { ...cat, createdAt: now, updatedAt: now });
        catMap[cat.name] = catRef.id;
      }

      // Customers
      const customersData = [
        { name: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '+91 98201 23456', address: '45 MG Road, Bengaluru', totalPurchases: 3, totalSpent: 4850 },
        { name: 'Michael Chang', email: 'mchang@example.com', phone: '+91 98111 87654', address: '890 Linking Road, Mumbai', totalPurchases: 5, totalSpent: 12400 },
        { name: 'Emma Watson', email: 'emma.w@example.com', phone: '+91 98450 34567', address: '12 Park Street, Kolkata', totalPurchases: 1, totalSpent: 1650 },
        { name: 'Alex Rivera', email: 'alex.rivera@example.com', phone: '+91 98765 90123', address: '77 Connaught Place, New Delhi', totalPurchases: 0, totalSpent: 0 },
      ];

      for (const cust of customersData) {
        const custRef = doc(collection(db, 'customers'));
        batch.set(custRef, { ...cust, createdAt: now, updatedAt: now });
      }

      // Products (Healthy, Low Stock, and Out of Stock - priced in INR)
      const productsData = [
        {
          name: 'Signature Dark Roast Coffee (500g)',
          sku: 'COF-DRK-01',
          barcode: '890123450001',
          categoryName: 'Beverages & Coffee',
          costPrice: 450,
          sellingPrice: 799,
          stock: 45,
          minStockAlert: 15,
          unit: 'bag',
          imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80',
          description: 'Single-origin dark roast with chocolate and caramel notes',
          status: 'active' as const
        },
        {
          name: 'Organic Oat Milk Barista Edition (1L)',
          sku: 'BEV-OAT-02',
          barcode: '890123450002',
          categoryName: 'Beverages & Coffee',
          costPrice: 160,
          sellingPrice: 249,
          stock: 8, // Low Stock
          minStockAlert: 12,
          unit: 'carton',
          imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&q=80',
          description: 'Creamy barista oat milk specially formulated for silky microfoam',
          status: 'active' as const
        },
        {
          name: 'Artisan Country Sourdough Loaf',
          sku: 'BAK-SRD-03',
          barcode: '890123450003',
          categoryName: 'Fresh Bakery & Snacks',
          costPrice: 120,
          sellingPrice: 220,
          stock: 22,
          minStockAlert: 10,
          unit: 'loaf',
          imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&q=80',
          description: 'Naturally fermented 36-hour slow-rise sourdough bread with crispy crust',
          status: 'active' as const
        },
        {
          name: 'USB-C Fast Charging Braided Cable (2m)',
          sku: 'TECH-CBL-04',
          barcode: '890123450004',
          categoryName: 'Electronics & Tech',
          costPrice: 250,
          sellingPrice: 499,
          stock: 0, // Out of Stock
          minStockAlert: 10,
          unit: 'pcs',
          imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80',
          description: 'Heavy duty nylon braided fast charging power delivery cable up to 60W',
          status: 'active' as const
        },
        {
          name: 'Wireless Bluetooth Compact Mouse',
          sku: 'TECH-MSE-05',
          barcode: '890123450005',
          categoryName: 'Electronics & Tech',
          costPrice: 650,
          sellingPrice: 1299,
          stock: 14,
          minStockAlert: 5,
          unit: 'pcs',
          imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&q=80',
          description: 'Ergonomic silent-click wireless mouse with dual-mode receiver',
          status: 'active' as const
        },
        {
          name: 'Extra Virgin Cold Pressed Olive Oil (750ml)',
          sku: 'PNT-OIL-06',
          barcode: '890123450006',
          categoryName: 'Household & Pantry',
          costPrice: 550,
          sellingPrice: 999,
          stock: 5, // Low Stock
          minStockAlert: 10,
          unit: 'bottle',
          imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80',
          description: 'First cold pressed premium Mediterranean olive oil in dark glass bottle',
          status: 'active' as const
        },
        {
          name: 'Organic Lavender & Shea Butter Soap',
          sku: 'CARE-SOP-07',
          barcode: '890123450007',
          categoryName: 'Personal Care',
          costPrice: 110,
          sellingPrice: 249,
          stock: 30,
          minStockAlert: 10,
          unit: 'bar',
          imageUrl: 'https://images.unsplash.com/photo-1607006314639-c5ec598d1a10?w=400&q=80',
          description: 'Handcrafted moisturizing soap enriched with pure essential oils',
          status: 'active' as const
        },
        {
          name: 'Sparkling Mineral Water (500ml 6-pack)',
          sku: 'BEV-SPK-08',
          barcode: '890123450008',
          categoryName: 'Beverages & Coffee',
          costPrice: 220,
          sellingPrice: 399,
          stock: 0, // Out of stock
          minStockAlert: 8,
          unit: 'pack',
          imageUrl: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&q=80',
          description: 'Naturally carbonated pristine mountain spring water',
          status: 'active' as const
        }
      ];

      for (const item of productsData) {
        const prodRef = doc(collection(db, 'products'));
        const catId = catMap[item.categoryName] || '';
        batch.set(prodRef, {
          ...item,
          categoryId: catId,
          createdAt: now,
          updatedAt: now
        });

        // Stock log
        const logRef = doc(collection(db, 'stock_logs'));
        batch.set(logRef, {
          productId: prodRef.id,
          productName: item.name,
          previousStock: 0,
          change: item.stock,
          newStock: item.stock,
          reason: 'Initial store catalog stock',
          type: 'manual_adjustment',
          createdBy: 'System Seed',
          createdAt: now
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seed_data');
    }
  };

  return (
    <StoreContext.Provider value={{
      products,
      categories,
      customers,
      sales,
      returns,
      stockLogs,
      employees,
      settings,
      loading,
      syncTimestamp,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      addCategory,
      updateCategory,
      deleteCategory,
      reassignAndDeleteCategory,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      processSale,
      processReturn,
      seedInitialData
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

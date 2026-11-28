import {
  Account,
  AppSettings,
  AuditLog,
  Brand,
  CashOperation,
  CashShift,
  Category,
  Customer,
  DatabaseSnapshot,
  Debt,
  Employee,
  Expense,
  LoyaltyAccount,
  LoyaltyTransaction,
  OnlineOrder,
  Permission,
  Product,
  PromoCode,
  PurchaseOrder,
  PurchaseReceipt,
  Role,
  Sale,
  StockItem,
  StockMovement,
  Store,
  Supplier,
  Target,
  Transaction,
  User,
  Warehouse,
} from '../types/models';
import { generateEAN13 } from '../utils/barcode';
import { MEDIA } from '../assets/media';

const now = new Date();
const daysAgo = (days: number, hour = 14, min = 30) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

const ALL_PERMISSIONS: Permission[] = [
  'view_dashboard',
  'view_profit_cost',
  'use_pos',
  'apply_big_discount',
  'process_returns',
  'manage_shifts',
  'view_catalog',
  'edit_catalog',
  'bulk_edit_prices',
  'view_inventory',
  'manage_inventory',
  'view_customers',
  'manage_customers',
  'manage_debts',
  'view_finance',
  'manage_finance',
  'view_employees',
  'manage_employees',
  'view_reports',
  'manage_online_orders',
  'manage_settings',
  'view_audit_log',
];

export function getMensClothingCategories(storeId: string, ts = new Date().toISOString()): Category[] {
  return [
    { id: 'cat-shirts', nameUz: "Ko'ylaklar (Rubashka)", nameRu: 'Рубашки', sortOrder: 1, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'cat-pants', nameUz: 'Shimlar va Jinsilar', nameRu: 'Брюки и джинсы', sortOrder: 2, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'cat-suits', nameUz: 'Kostyum-shimlar', nameRu: 'Костюмы', sortOrder: 3, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'cat-tshirts', nameUz: 'Futbolka va Polo', nameRu: 'Футболки и поло', sortOrder: 4, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'cat-knitwear', nameUz: 'Sviter va Tolstovka', nameRu: 'Свитера и толстовки', sortOrder: 5, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'cat-outerwear', nameUz: 'Kurtka va Palto', nameRu: 'Куртки и пальто', sortOrder: 6, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'cat-shoes', nameUz: 'Erkaklar poyabzali', nameRu: 'Мужская обувь', sortOrder: 7, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'cat-accessories', nameUz: 'Aksessuarlar', nameRu: 'Аксессуары', sortOrder: 8, storeId, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
  ];
}

export function createSeedDatabase(): DatabaseSnapshot {
  const ts = daysAgo(30, 9, 0);
  const store1Id = 'store-chilonzor';
  const store2Id = 'store-samdarvoza';
  const wh1Id = 'wh-chilonzor';
  const wh2Id = 'wh-samdarvoza';

  const roles: Role[] = [
    { id: 'owner', nameUz: 'Egasi (Owner)', nameRu: 'Владелец', permissions: ALL_PERMISSIONS },
    {
      id: 'admin',
      nameUz: 'Administrator',
      nameRu: 'Администратор',
      permissions: ALL_PERMISSIONS.filter((p) => p !== 'manage_settings'),
    },
    {
      id: 'manager',
      nameUz: 'Menejer',
      nameRu: 'Менеджер',
      permissions: [
        'view_dashboard',
        'view_profit_cost',
        'use_pos',
        'apply_big_discount',
        'process_returns',
        'manage_shifts',
        'view_catalog',
        'edit_catalog',
        'view_inventory',
        'manage_inventory',
        'view_customers',
        'manage_customers',
        'manage_debts',
        'view_employees',
        'manage_employees',
        'view_reports',
        'manage_online_orders',
      ],
    },
    {
      id: 'cashier',
      nameUz: 'Kassir',
      nameRu: 'Кассир',
      permissions: [
        'view_dashboard',
        'use_pos',
        'process_returns',
        'manage_shifts',
        'view_catalog',
        'view_customers',
        'manage_customers',
        'view_employees',
        'manage_employees',
      ],
    },
    {
      id: 'warehouse',
      nameUz: 'Omborchi',
      nameRu: 'Кладовщик',
      permissions: [
        'view_dashboard',
        'use_pos',
        'view_catalog',
        'edit_catalog',
        'view_inventory',
        'manage_inventory',
        'manage_online_orders',
        'view_employees',
        'manage_employees',
      ],
    },
    {
      id: 'guard',
      nameUz: 'Qorovul',
      nameRu: 'Охранник',
      permissions: [
        'use_pos',
        'manage_shifts',
        'view_catalog',
        'view_customers',
        'manage_customers',
        'view_employees',
        'manage_employees',
      ],
    },
  ];

  const warehouses: Warehouse[] = [
    {
      id: wh1Id,
      name: 'Ombor — SHU BREND TORAQORGON',
      address: "To'raqo'rg'on",
      isMain: true,
      storeId: store1Id,
      createdAt: ts,
      updatedAt: ts,
      createdBy: 'usr-owner',
    },
    {
      id: wh2Id,
      name: 'Ombor — SHU BREND MINGBULOQ',
      address: 'Mingbuloq',
      isMain: false,
      storeId: store2Id,
      createdAt: ts,
      updatedAt: ts,
      createdBy: 'usr-owner',
    },
  ];

  const stores: Store[] = [
    {
      id: store1Id,
      name: 'SHU BREND TORAQORGON',
      address: "To'raqo'rg'on",
      phone: '+998 71 200 11 22',
      isActive: true,
      defaultWarehouseId: wh1Id,
      storeCode: '01',
      color: '#2563EB',
      storeId: store1Id,
      createdAt: ts,
      updatedAt: ts,
      createdBy: 'usr-owner',
    },
    {
      id: store2Id,
      name: 'SHU BREND MINGBULOQ',
      address: 'Mingbuloq',
      phone: '+998 71 200 33 44',
      isActive: true,
      defaultWarehouseId: wh2Id,
      storeCode: '02',
      color: '#16A34A',
      storeId: store2Id,
      createdAt: ts,
      updatedAt: ts,
      createdBy: 'usr-owner',
    },
  ];

  // Accounts & users are created securely via First-Run Setup / Admin panel (never hardcoded)
  const users: User[] = [];
  const employees: Employee[] = [];

  const categories: Category[] = getMensClothingCategories(store1Id, ts);

  const brands: Brand[] = [
    { id: 'br-samarkand', name: 'Samarkand Loom', country: "O'zbekiston", storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'br-terra', name: 'Terra Step', country: 'Turkiya', storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'br-aura', name: 'Ramsey Classic', country: 'Turkiya', storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'br-nordic', name: 'Milan Line', country: 'Italiya', storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'br-casa', name: 'Bukhara Tailor', country: "O'zbekiston", storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'br-chorsu', name: 'Chorsu Craft', country: "O'zbekiston", storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
  ];

  // Suppliers preserved, starting debt balances zeroed
  const suppliers: Supplier[] = [
    { id: 'sup-1', name: 'Tashkent Textile Optom', contactName: 'Azizbek Umarov', phone: '+998935011122', address: "Ipak Yo'li bozori, 14-blok", debtBalance: 0, storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'sup-2', name: 'Istanbul Shoes & Suit Import', contactName: 'Murat Yilmaz', phone: '+998909887766', address: 'Abu Saxiy savdo majmuasi, C-12', debtBalance: 0, storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'sup-3', name: 'Bursa Menswear Optom', contactName: 'Kemal Aydin', phone: '+998977772211', address: 'Chorsu savdo markazi, 8-do\'kon', debtBalance: 0, storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
    { id: 'sup-4', name: 'Chorsu Leather & Accessories', contactName: 'Otabek Qodirov', phone: '+998946554433', address: 'Bek Baraka, 45-pavilyon', debtBalance: 0, storeId: store1Id, createdAt: ts, updatedAt: ts, createdBy: 'usr-owner' },
  ];

  interface RawProd {
    name: string;
    cat: string;
    brand: string;
    sup: string;
    unit: Product['unit'];
    collection: string;
    photo?: string;
    buy: number;
    sell: number;
    wholesale: number;
    variants: { size?: string; color?: string }[];
  }

  const rawProducts: RawProd[] = [
    { name: 'Jun Overshirt Kurtka', cat: 'cat-outerwear', brand: 'br-samarkand', sup: 'sup-1', unit: 'dona', collection: 'Kuz-Qish 2026', photo: MEDIA.apparel, buy: 280000, sell: 460000, wholesale: 390000, variants: [{ size: 'M', color: 'Qumrang' }, { size: 'L', color: 'Qumrang' }, { size: 'XL', color: "Ko'k" }] },
    { name: 'Paxta Trikotaj Sviter', cat: 'cat-knitwear', brand: 'br-samarkand', sup: 'sup-1', unit: 'dona', collection: 'Kuz-Qish 2026', photo: MEDIA.apparel, buy: 145000, sell: 245000, wholesale: 210000, variants: [{ size: 'M', color: 'Kulrang' }, { size: 'L', color: 'Qora' }] },
    { name: 'Klassik Chinos Shim', cat: 'cat-pants', brand: 'br-samarkand', sup: 'sup-1', unit: 'dona', collection: 'Bazaviy', buy: 130000, sell: 220000, wholesale: 185000, variants: [{ size: '32', color: 'Bej' }, { size: '34', color: 'Qora' }] },
    { name: 'Oversize Futbolka 100% Paxta', cat: 'cat-tshirts', brand: 'br-chorsu', sup: 'sup-1', unit: 'dona', collection: 'Yozgi', buy: 48000, sell: 95000, wholesale: 75000, variants: [{ size: 'M', color: 'Oq' }, { size: 'L', color: 'Qora' }, { size: 'XL', color: 'Yashil' }] },
    { name: "Linen Yozgi Ko'ylak", cat: 'cat-shirts', brand: 'br-samarkand', sup: 'sup-1', unit: 'dona', collection: 'Bahor-Yoz', buy: 115000, sell: 195000, wholesale: 165000, variants: [{ size: 'S', color: 'Oq' }, { size: 'M', color: "Ko'k" }] },
    { name: 'Denim Jinsi Kurtka', cat: 'cat-outerwear', brand: 'br-terra', sup: 'sup-1', unit: 'dona', collection: 'Kuz 2026', buy: 210000, sell: 365000, wholesale: 310000, variants: [{ size: 'M', color: "Ko'k" }, { size: 'L', color: 'Qora' }] },
    { name: 'Charm Krossovka Urban', cat: 'cat-shoes', brand: 'br-terra', sup: 'sup-2', unit: 'juft', collection: 'Premium', photo: MEDIA.shoes, buy: 340000, sell: 550000, wholesale: 480000, variants: [{ size: '41', color: 'Oq' }, { size: '42', color: 'Oq' }, { size: '43', color: 'Oq' }] },
    { name: 'Zamsha Loferlar Klassik', cat: 'cat-shoes', brand: 'br-terra', sup: 'sup-2', unit: 'juft', collection: 'Ofis', photo: MEDIA.shoes, buy: 290000, sell: 480000, wholesale: 410000, variants: [{ size: '40', color: 'Jigarrang' }, { size: '42', color: 'Qora' }] },
    { name: 'Yugurish Krossovkasi AirFlex', cat: 'cat-shoes', brand: 'br-terra', sup: 'sup-2', unit: 'juft', collection: 'Sport', buy: 230000, sell: 390000, wholesale: 330000, variants: [{ size: '39', color: 'Kulrang' }, { size: '41', color: 'Qora' }] },
    { name: 'Qishki Chelsi Etik', cat: 'cat-shoes', brand: 'br-terra', sup: 'sup-2', unit: 'juft', collection: 'Qish 2026', buy: 410000, sell: 680000, wholesale: 580000, variants: [{ size: '42', color: 'Qora' }, { size: '43', color: 'Jigarrang' }] },
    { name: "Oxford Oq Klassik Ko'ylak", cat: 'cat-shirts', brand: 'br-aura', sup: 'sup-3', unit: 'dona', collection: 'Ofis', photo: MEDIA.apparel, buy: 120000, sell: 215000, wholesale: 175000, variants: [{ size: 'M', color: 'Oq' }, { size: 'L', color: 'Oq' }] },
    { name: 'Slim Fit Rubashka Moviy', cat: 'cat-shirts', brand: 'br-aura', sup: 'sup-3', unit: 'dona', collection: 'Ofis', buy: 110000, sell: 195000, wholesale: 160000, variants: [{ size: 'M', color: "Ko'k" }, { size: 'XL', color: "Ko'k" }] },
    { name: "Kletkali Flanel Ko'ylak", cat: 'cat-shirts', brand: 'br-chorsu', sup: 'sup-1', unit: 'dona', collection: 'Kuz 2026', buy: 125000, sell: 225000, wholesale: 185000, variants: [{ size: 'L', color: 'Qizil' }, { size: 'XL', color: 'Qora' }] },
    { name: 'Ikki Tugmali Klassik Kostyum', cat: 'cat-suits', brand: 'br-aura', sup: 'sup-2', unit: 'dona', collection: 'Premium', photo: MEDIA.apparel, buy: 650000, sell: 1150000, wholesale: 950000, variants: [{ size: '48', color: 'Qora' }, { size: '50', color: "Ko'k" }, { size: '52', color: 'Kulrang' }] },
    { name: "Troika To'y Kostyum-Shim", cat: 'cat-suits', brand: 'br-nordic', sup: 'sup-2', unit: 'dona', collection: 'Premium', buy: 820000, sell: 1450000, wholesale: 1200000, variants: [{ size: '50', color: 'Qora' }, { size: '52', color: 'Bej' }] },
    { name: 'Smart Casual Pijak', cat: 'cat-suits', brand: 'br-nordic', sup: 'sup-3', unit: 'dona', collection: 'Ofis', buy: 390000, sell: 680000, wholesale: 560000, variants: [{ size: '48', color: "Ko'k" }, { size: '50', color: 'Kulrang' }] },
    { name: 'Polo Yoqali Futbolka Lacoste Usul', cat: 'cat-tshirts', brand: 'br-aura', sup: 'sup-3', unit: 'dona', collection: 'Bahor-Yoz', buy: 85000, sell: 165000, wholesale: 135000, variants: [{ size: 'M', color: 'Yashil' }, { size: 'L', color: 'Qora' }, { size: 'XL', color: 'Oq' }] },
    { name: 'Bazaviy V-Yoqa Futbolka', cat: 'cat-tshirts', brand: 'br-chorsu', sup: 'sup-1', unit: 'dona', collection: 'Bazaviy', buy: 42000, sell: 85000, wholesale: 68000, variants: [{ size: 'M', color: 'Qora' }, { size: 'L', color: 'Oq' }] },
    { name: 'Streych Jinsi Shim Slim', cat: 'cat-pants', brand: 'br-terra', sup: 'sup-2', unit: 'dona', collection: 'Kundalik', buy: 145000, sell: 265000, wholesale: 215000, variants: [{ size: '31', color: "Ko'k" }, { size: '32', color: 'Qora' }, { size: '34', color: "Ko'k" }] },
    { name: 'Klassik Ofis Shim (Shirstoy)', cat: 'cat-pants', brand: 'br-aura', sup: 'sup-3', unit: 'dona', collection: 'Ofis', buy: 160000, sell: 290000, wholesale: 240000, variants: [{ size: '32', color: 'Qora' }, { size: '34', color: 'Kulrang' }] },
    { name: 'Tabiiy Charm Kamar', cat: 'cat-accessories', brand: 'br-chorsu', sup: 'sup-4', unit: 'dona', collection: 'Klassik', buy: 68000, sell: 135000, wholesale: 110000, variants: [{ size: '115cm', color: 'Qora' }, { size: '120cm', color: 'Jigarrang' }] },
    { name: 'Minimalist Charm Hamyon', cat: 'cat-accessories', brand: 'br-chorsu', sup: 'sup-4', unit: 'dona', collection: 'Klassik', buy: 82000, sell: 160000, wholesale: 130000, variants: [{ size: 'Standart', color: 'Qora' }] },
    { name: 'Ipak Galstuk va Babochka', cat: 'cat-accessories', brand: 'br-nordic', sup: 'sup-4', unit: 'dona', collection: 'Ofis', buy: 45000, sell: 95000, wholesale: 75000, variants: [{ size: 'Standart', color: 'Qora' }, { size: 'Standart', color: 'Qizil' }] },
    { name: "Kargo Cho'ntakli Shim", cat: 'cat-pants', brand: 'br-samarkand', sup: 'sup-1', unit: 'dona', collection: 'Sport', buy: 135000, sell: 245000, wholesale: 195000, variants: [{ size: '32', color: 'Yashil' }, { size: '34', color: 'Qora' }] },
    { name: 'Kapishonli Flis Tolstovka (Hoodie)', cat: 'cat-knitwear', brand: 'br-chorsu', sup: 'sup-1', unit: 'dona', collection: 'Kuz-Qish 2026', buy: 135000, sell: 240000, wholesale: 195000, variants: [{ size: 'M', color: 'Qora' }, { size: 'L', color: 'Kulrang' }] },
    { name: 'Vodolazka (Baland Yoqali Sviter)', cat: 'cat-knitwear', brand: 'br-aura', sup: 'sup-3', unit: 'dona', collection: 'Kuz-Qish 2026', buy: 98000, sell: 185000, wholesale: 150000, variants: [{ size: 'M', color: 'Qora' }, { size: 'L', color: 'Bej' }] },
    { name: 'Kardigan Tugmali Jemfer', cat: 'cat-knitwear', brand: 'br-samarkand', sup: 'sup-1', unit: 'dona', collection: 'Kuz 2026', buy: 165000, sell: 295000, wholesale: 245000, variants: [{ size: 'L', color: "Ko'k" }, { size: 'XL', color: 'Jigarrang' }] },
    { name: 'Drapp Qishki Palto Klassik', cat: 'cat-outerwear', brand: 'br-nordic', sup: 'sup-2', unit: 'dona', collection: 'Qish 2026', buy: 520000, sell: 890000, wholesale: 740000, variants: [{ size: '48', color: 'Qora' }, { size: '50', color: 'Bej' }] },
    { name: "Shamolto'sar Bomber Kurtka", cat: 'cat-outerwear', brand: 'br-terra', sup: 'sup-2', unit: 'dona', collection: 'Bahor-Kuz', buy: 240000, sell: 420000, wholesale: 350000, variants: [{ size: 'M', color: 'Qora' }, { size: 'L', color: 'Yashil' }] },
    { name: "Erkaklar Paypoq To'plami (5 juft)", cat: 'cat-accessories', brand: 'br-chorsu', sup: 'sup-1', unit: 'quti', collection: 'Bazaviy', buy: 32000, sell: 65000, wholesale: 50000, variants: [{ size: '41-45', color: 'Qora' }] },
  ];

  const products: Product[] = [];
  const stockItems: StockItem[] = [];
  const stockMovements: StockMovement[] = [];

  rawProducts.forEach((rp, pIdx) => {
    const productId = `prod-${String(pIdx + 1).padStart(2, '0')}`;
    const variants = rp.variants.map((rv, vIdx) => {
      const variantId = `${productId}-v${vIdx + 1}`;
      const barcode = generateEAN13(100000000 + pIdx * 100 + vIdx * 7);
      const sku = `SBO-${String(pIdx + 1).padStart(3, '0')}-${vIdx + 1}`;

      // All initial stock quantities start at 0
      stockItems.push({
        id: `stk-${variantId}-${wh1Id}`,
        productId,
        variantId,
        warehouseId: wh1Id,
        qty: 0,
        storeId: store1Id,
        createdAt: ts,
        updatedAt: ts,
        createdBy: 'usr-owner',
      });

      stockItems.push({
        id: `stk-${variantId}-${wh2Id}`,
        productId,
        variantId,
        warehouseId: wh2Id,
        qty: 0,
        storeId: store2Id,
        createdAt: ts,
        updatedAt: ts,
        createdBy: 'usr-owner',
      });

      return {
        id: variantId,
        productId,
        sku,
        size: rv.size,
        color: rv.color,
        purchasePrice: rp.buy,
        retailPrice: rp.sell,
        wholesalePrice: rp.wholesale,
        minStock: 5,
        barcodes: [barcode],
        storeId: store1Id,
        createdAt: ts,
        updatedAt: ts,
        createdBy: 'usr-owner',
      };
    });

    products.push({
      id: productId,
      name: rp.name,
      categoryId: rp.cat,
      brandId: rp.brand,
      collection: rp.collection,
      unit: rp.unit,
      description: `${rp.name} — yuqori sifatli kundalik va mavsumiy tanlov.`,
      photoUrl: rp.photo,
      supplierId: rp.sup,
      tags: [rp.collection],
      isPublishedOnline: true,
      variants,
      storeId: store1Id,
      createdAt: ts,
      updatedAt: ts,
      createdBy: 'usr-owner',
    });
  });

  // Clean zeroed initial operational & report state
  const customers: Customer[] = [];
  const loyaltyAccounts: LoyaltyAccount[] = [];
  const loyaltyTransactions: LoyaltyTransaction[] = [];
  const debts: Debt[] = [];
  const sales: Sale[] = [];
  const cashShifts: CashShift[] = [];
  const cashOperations: CashOperation[] = [];
  const expenses: Expense[] = [];
  const transactions: Transaction[] = [];
  const purchaseReceipts: PurchaseReceipt[] = [];
  const purchaseOrders: PurchaseOrder[] = [];
  const promoCodes: PromoCode[] = [];
  const targets: Target[] = [];
  const onlineOrders: OnlineOrder[] = [];
  const auditLogs: AuditLog[] = [];

  const accounts: Account[] = [
    { id: 'acc-cash-1', name: 'Asosiy Kassa (Naqd)', type: 'cash', balance: 0, isDefault: true, storeId: store1Id, createdAt: ts, updatedAt: now.toISOString(), createdBy: 'usr-owner' },
    { id: 'acc-card-1', name: 'Uzcard / Humo Terminal', type: 'card_terminal', balance: 0, storeId: store1Id, createdAt: ts, updatedAt: now.toISOString(), createdBy: 'usr-owner' },
    { id: 'acc-bank-1', name: "Ipak Yo'li Bank H/R", type: 'bank', balance: 0, storeId: store1Id, createdAt: ts, updatedAt: now.toISOString(), createdBy: 'usr-owner' },
  ];

  const settings: AppSettings = {
    brandName: 'SHU BREND OMBOR',
    currency: 'UZS',
    showUsdOption: false,
    usdRate: 12800,
    roundingStep: 100,
    vatEnabled: false,
    vatRate: 12,
    allowNegativeStock: false,
    discountApprovalThresholdPercent: 15,
    receiptWidth: '80mm',
    receiptHeader: 'SHU BREND OMBOR\nSHU BREND TORAQORGON\nTel: +998 71 200 11 22',
    receiptFooter: "Xaridingiz uchun rahmat!\n14 kun ichida chek bilan almashtirish mumkin.",
    showReceiptQr: true,
    labelTemplate: '40x30',
    enabledPaymentMethods: ['cash', 'card', 'uzcard', 'humo', 'visa', 'mastercard', 'unionpay', 'transfer', 'click', 'payme', 'uzum', 'debt'],
    loyaltyTiers: [
      { tier: 'bronze', minSpend: 0, cashbackPercent: 2 },
      { tier: 'silver', minSpend: 1200000, cashbackPercent: 3 },
      { tier: 'gold', minSpend: 3000000, cashbackPercent: 5 },
      { tier: 'platinum', minSpend: 5000000, cashbackPercent: 7 },
    ],
    cashbackExpiryDays: 180,
    birthdayBonusAmount: 50000,
    telegramChannelHandle: '@shubrend_ombor',
    integrations: {
      fiscalProvider: 'none',
      paymentGateway: 'none',
      smsProvider: 'none',
      telegramBotConfigured: false,
      marketplaceSync: 'none',
    },
  };

  return {
    version: 7,
    stores,
    warehouses,
    users,
    roles,
    categories,
    brands,
    products,
    suppliers,
    stockItems,
    stockMovements,
    purchaseReceipts,
    purchaseOrders,
    transfers: [],
    writeOffs: [],
    stocktakes: [],
    sales,
    returns: [],
    cashShifts,
    cashOperations,
    accounts,
    transactions,
    expenses,
    customers,
    loyaltyAccounts,
    loyaltyTransactions,
    debts,
    promoCodes,
    employees,
    targets,
    onlineOrders,
    auditLogs,
    offlineQueue: [],
    settings,
  };
}

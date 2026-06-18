/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompanyConfig,
  UserRole,
  SystemUser,
  Product,
  InventoryHistory,
  Vendedor,
  Client,
  Sale,
  CashTransaction,
  CashBoxSession,
  Promotion,
  AuditLog,
  PaymentMethod,
  SaleType,
  ProductTypeCategory,
  CashDenominations,
  CashDrawerOpening,
  DrawerConfig
} from "./types";

// Keys for LocalStorage
const KEYS = {
  COMPANY: "jhalex_company",
  PRODUCTS: "jhalex_products",
  HISTORY: "jhalex_history",
  VENDEDORES: "jhalex_vendedores",
  CLIENTES: "jhalex_clientes",
  SALES: "jhalex_sales",
  TRANSACTIONS: "jhalex_transactions",
  SESSIONS: "jhalex_sessions",
  PROMOTION: "jhalex_promotion",
  AUDITS: "jhalex_audits",
  VISUAL_THEME: "jhalex_theme",
  ACTIVE_USER: "jhalex_active_user",
  CATEGORIES: "jhalex_categories",
  DRAWER_OPENINGS: "jhalex_drawer_openings",
  DRAWER_CONFIG: "jhalex_drawer_config"
};

// INITIAL PRE-SET CATEGORIES
const INITIAL_CATEGORIES: ProductTypeCategory[] = [
  // MODA
  { name: "Ropa", group: "MODA" },
  { name: "Camisas", group: "MODA" },
  { name: "Pantalones", group: "MODA" },
  { name: "Chaquetas", group: "MODA" },
  { name: "Vestidos", group: "MODA" },
  { name: "Conjuntos", group: "MODA" },
  { name: "Ropa urbana", group: "MODA" },

  // CALZADO
  { name: "Zapatos", group: "CALZADO" },
  { name: "Tenis", group: "CALZADO" },
  { name: "Sandalias", group: "CALZADO" },
  { name: "Botas", group: "CALZADO" },

  // ACCESORIOS
  { name: "Gorras", group: "ACCESORIOS" },
  { name: "Bolsos", group: "ACCESORIOS" },
  { name: "Carteras", group: "ACCESORIOS" },
  { name: "Cinturones", group: "ACCESORIOS" },
  { name: "Joyería", group: "ACCESORIOS" },
  { name: "Accesorios de moda", group: "ACCESORIOS" },

  // BELLEZA
  { name: "Maquillajes", group: "BELLEZA" },
  { name: "Labiales", group: "BELLEZA" },
  { name: "Bases", group: "BELLEZA" },
  { name: "Sombras", group: "BELLEZA" },
  { name: "Polvos", group: "BELLEZA" },
  { name: "Correctores", group: "BELLEZA" },
  { name: "Productos cosméticos", group: "BELLEZA" },

  // FRAGANCIAS
  { name: "Lociones", group: "FRAGANCIAS" },
  { name: "Perfumes", group: "FRAGANCIAS" },
  { name: "Splash", group: "FRAGANCIAS" }
];

// Initial Pre-seed Data
const INITIAL_COMPANY: CompanyConfig = {
  name: "JHALEX URBAN HOUSE",
  logo: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop&q=80",
  nit: "109876543-2",
  address: "Avenida 10 # 24-85 Barrio Centro",
  city: "Cúcuta, N.S.",
  phone: "312 345 6789",
  email: "contacto@jhalexurbanhouse.com",
  responsible: "Jhalex Alexander",
  commercialInfo: "Almacén Exclusivo de Moda Urbana & Calzado Premium",
  invoiceMessage: "Gracias por tu compra. JHALEX viste tu estilo urbano. ¡Vuelve pronto!"
};

const INITIAL_VENDEDORES: Vendedor[] = [];

const INITIAL_CLIENTS: Client[] = [];

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_PROMOTIONS: Promotion[] = [];

// Security configurations
const PASSWORDS = {
  ADMIN: "1234",
  SELLER: "0000"
};

// Database Initialization helper
export function initDB(): void {
  const DB_RESET_KEY = "jhalex_db_reset_v5";
  if (localStorage.getItem(DB_RESET_KEY) !== "true") {
    localStorage.removeItem(KEYS.COMPANY);
    localStorage.removeItem(KEYS.PRODUCTS);
    localStorage.removeItem(KEYS.VENDEDORES);
    localStorage.removeItem(KEYS.CLIENTES);
    localStorage.removeItem(KEYS.PROMOTION);
    localStorage.removeItem(KEYS.HISTORY);
    localStorage.removeItem(KEYS.SALES);
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.AUDITS);
    localStorage.removeItem(KEYS.SESSIONS);
    localStorage.removeItem(KEYS.ACTIVE_USER);
    localStorage.removeItem(KEYS.CATEGORIES);
    localStorage.removeItem(KEYS.DRAWER_OPENINGS);
    localStorage.removeItem(KEYS.DRAWER_CONFIG);
    localStorage.removeItem("admin_pin");
    localStorage.removeItem("seller_pin");
    localStorage.setItem(DB_RESET_KEY, "true");
  }

  if (!localStorage.getItem(KEYS.COMPANY)) {
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(INITIAL_COMPANY));
  }
  if (!localStorage.getItem(KEYS.CATEGORIES)) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem(KEYS.DRAWER_CONFIG)) {
    localStorage.setItem(KEYS.DRAWER_CONFIG, JSON.stringify({
      connectionMethod: "RJ11",
      autoOpenOnCashSale: true
    }));
  }
  if (!localStorage.getItem(KEYS.DRAWER_OPENINGS)) {
    localStorage.setItem(KEYS.DRAWER_OPENINGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.PRODUCTS)) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(KEYS.VENDEDORES)) {
    localStorage.setItem(KEYS.VENDEDORES, JSON.stringify(INITIAL_VENDEDORES));
  }
  if (!localStorage.getItem(KEYS.CLIENTES)) {
    localStorage.setItem(KEYS.CLIENTES, JSON.stringify(INITIAL_CLIENTS));
  }
  if (!localStorage.getItem(KEYS.PROMOTION)) {
    localStorage.setItem(KEYS.PROMOTION, JSON.stringify(INITIAL_PROMOTIONS));
  }
  if (!localStorage.getItem(KEYS.HISTORY)) {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SALES)) {
    localStorage.setItem(KEYS.SALES, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.TRANSACTIONS)) {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.AUDITS)) {
    localStorage.setItem(KEYS.AUDITS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SESSIONS)) {
    // Start with absolutely 0 open or closed sessions initially - they can open dialogs on launch
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.VISUAL_THEME)) {
    localStorage.setItem(KEYS.VISUAL_THEME, "clear");
  }
  if (!localStorage.getItem(KEYS.ACTIVE_USER)) {
    localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify({ name: "Administrador Principal", role: UserRole.ADMIN }));
  }
  
  // Also store passwords if not configured
  if (!localStorage.getItem("admin_pin")) {
    localStorage.setItem("admin_pin", PASSWORDS.ADMIN);
  }
  if (!localStorage.getItem("seller_pin")) {
    localStorage.setItem("seller_pin", PASSWORDS.SELLER);
  }
}

// Low level generic storage helper
function getStore<T>(key: string): T {
  const value = localStorage.getItem(key);
  return (value ? JSON.parse(value) : []) as T;
}

function setStore<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// API Methods
export const db = {
  // Company Settings
  getCompany: (): CompanyConfig => {
    const data = localStorage.getItem(KEYS.COMPANY);
    return data ? JSON.parse(data) : { ...INITIAL_COMPANY };
  },
  saveCompany: (config: CompanyConfig, requestorName: string, requestorRole: UserRole): void => {
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(config));
    db.logAudit(
      requestorName,
      requestorRole,
      "CONFIG_EMPRESA",
      "Actualización de datos",
      `Se modificó la configuración global de la empresa ${config.name}`
    );
  },

  // Security Credentials Verification
  verifyPIN: (role: UserRole, pinEntered: string): boolean => {
    const pin = (pinEntered || "").trim();
    if (role === UserRole.ADMIN) {
      const stored = (localStorage.getItem("admin_pin") || "").trim() || PASSWORDS.ADMIN;
      return stored === pin || PASSWORDS.ADMIN === pin;
    } else {
      const stored = (localStorage.getItem("seller_pin") || "").trim() || PASSWORDS.SELLER;
      return stored === pin || PASSWORDS.SELLER === pin;
    }
  },
  
  changePIN: (role: UserRole, oldPIN: string, newPIN: string, requestorName: string): boolean => {
    if (db.verifyPIN(role, oldPIN)) {
      if (role === UserRole.ADMIN) {
        localStorage.setItem("admin_pin", newPIN);
        db.logAudit(requestorName, UserRole.ADMIN, "AJUSTE_PIN", "Cambió PIN Administrador", "Cambio exitoso de PIN de seguridad");
      } else {
        localStorage.setItem("seller_pin", newPIN);
        db.logAudit(requestorName, UserRole.ADMIN, "AJUSTE_PIN", "Cambió PIN Vendedores", "Cambio exitoso de PIN para vendedores");
      }
      return true;
    }
    return false;
  },

  // Active Login Session
  getActiveUser: (): { name: string; role: UserRole } => {
    const value = localStorage.getItem(KEYS.ACTIVE_USER);
    return value ? JSON.parse(value) : { name: "Administrador General", role: UserRole.ADMIN };
  },

  setActiveUser: (name: string, role: UserRole) => {
    localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify({ name, role }));
  },

  // Products CRUD
  getProducts: (): Product[] => {
    return getStore<Product[]>(KEYS.PRODUCTS);
  },

  saveProduct: (product: Product, requestorName: string, requestorRole: UserRole, isNew: boolean): void => {
    const products = db.getProducts();
    if (isNew) {
      product.priceHistory = [
        {
          id: "PRC_INIT_" + Date.now(),
          previousPrice: 0,
          newPrice: product.sellPrice,
          date: new Date().toISOString().split("T")[0],
          user: requestorName
        }
      ];
      products.push(product);
      db.logAudit(requestorName, requestorRole, "CREAR_PRODUCTO", "Creación", `Añadió producto: [${product.code}] ${product.name}, stock inicial: ${product.stock}`);
      // Record initial inventory entry
      db.logInventoryHistory({
        id: "HIS_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        productId: product.id,
        productName: product.name,
        type: "ENTRY",
        quantity: product.stock,
        previousStock: 0,
        newStock: product.stock,
        user: requestorName,
        date: new Date().toISOString().split("T")[0],
        reason: "Ingreso inicial de mercancía"
      });
    } else {
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        const prev = products[index];
        const diffStock = product.stock - prev.stock;
        
        // Handle price changes and save history
        const updatedHistory = prev.priceHistory ? [...prev.priceHistory] : [];
        if (prev.sellPrice !== product.sellPrice) {
          updatedHistory.push({
            id: "PRC_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            previousPrice: prev.sellPrice,
            newPrice: product.sellPrice,
            date: new Date().toISOString().split("T")[0],
            user: requestorName
          });
          db.logAudit(
            requestorName,
            requestorRole,
            "CAMBIO_PRECIO",
            "Mantenimiento",
            `Actualizó precio de [${product.code}] ${product.name}: de $${prev.sellPrice.toLocaleString()} a $${product.sellPrice.toLocaleString()}`
          );
        }
        
        product.priceHistory = updatedHistory;
        products[index] = product;
        db.logAudit(requestorName, requestorRole, "EDITAR_PRODUCTO", "Modificación", `Editó producto: [${product.code}] ${product.name}`);
        
        if (diffStock !== 0) {
          db.logInventoryHistory({
            id: "HIS_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            productId: product.id,
            productName: product.name,
            type: "ADJUSTMENT",
            quantity: diffStock,
            previousStock: prev.stock,
            newStock: product.stock,
            user: requestorName,
            date: new Date().toISOString().split("T")[0],
            reason: `Ajuste manual de stock por el administrador. Motivo: Cambio manual`
          });
        }
      }
    }
    setStore(KEYS.PRODUCTS, products);
  },

  deleteProduct: (id: string, reason: string, requestorName: string, requestorRole: UserRole): boolean => {
    const products = db.getProducts();
    const target = products.find(p => p.id === id);
    if (!target) return false;
    
    const filtered = products.filter(p => p.id !== id);
    setStore(KEYS.PRODUCTS, filtered);
    
    db.logAudit(requestorName, requestorRole, "ELIMINAR_PRODUCTO", reason, `Eliminó producto: [${target.code}] ${target.name}`);
    return true;
  },

  // Inventory adjustment
  adjustStock: (id: string, newStock: number, reason: string, requestorName: string, requestorRole: UserRole): boolean => {
    const products = db.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return false;
    const prev = products[index];
    const prevStock = prev.stock;
    const diff = newStock - prevStock;
    prev.stock = newStock;
    setStore(KEYS.PRODUCTS, products);

    db.logInventoryHistory({
      id: "HIS_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      productId: id,
      productName: prev.name,
      type: "ADJUSTMENT",
      quantity: diff,
      previousStock: prevStock,
      newStock: newStock,
      user: requestorName,
      date: new Date().toISOString().split("T")[0],
      reason: reason
    });

    db.logAudit(requestorName, requestorRole, "AJUSTE_INVENTARIO", reason, `Ajustó stock de [${prev.code}] a ${newStock} unidades (dif: ${diff > 0 ? "+" : ""}${diff})`);
    return true;
  },

  // Inventory history log entry
  getInventoryHistory: (): InventoryHistory[] => {
    return getStore<InventoryHistory[]>(KEYS.HISTORY);
  },

  logInventoryHistory: (historyEntry: InventoryHistory): void => {
    const history = db.getInventoryHistory();
    history.unshift(historyEntry); // newer first
    setStore(KEYS.HISTORY, history);
  },

  // Vendedores CRUD
  getVendedores: (): Vendedor[] => {
    return getStore<Vendedor[]>(KEYS.VENDEDORES);
  },

  saveVendedor: (vendedor: Vendedor, requestorName: string): void => {
    const list = db.getVendedores();
    const index = list.findIndex(v => v.id === vendedor.id);
    if (index === -1) {
      list.push(vendedor);
      db.logAudit(requestorName, UserRole.ADMIN, "VENDEDOR_CREAR", "Registro", `Registró nuevo vendedor: ${vendedor.name} Doc: ${vendedor.document}`);
    } else {
      list[index] = vendedor;
      db.logAudit(requestorName, UserRole.ADMIN, "VENDEDOR_EDITAR", "Modificación", `Actualizó datos vendedor: ${vendedor.name}`);
    }
    setStore(KEYS.VENDEDORES, list);
  },

  deleteVendedor: (id: string, requestorName: string): boolean => {
    const list = db.getVendedores();
    const target = list.find(v => v.id === id);
    if (!target) return false;
    const filtered = list.filter(v => v.id !== id);
    setStore(KEYS.VENDEDORES, filtered);
    db.logAudit(requestorName, UserRole.ADMIN, "VENDEDOR_ELIMINAR", "Eliminado", `Eliminó vendedor: ${target.name}`);
    return true;
  },

  // Clientes CRUD and Loyalty Points
  getClientes: (): Client[] => {
    return getStore<Client[]>(KEYS.CLIENTES);
  },

  saveCliente: (cliente: Client, requestorName: string, requestorRole: UserRole): void => {
    const list = db.getClientes();
    const index = list.findIndex(c => c.id === cliente.id);
    if (index === -1) {
      list.push(cliente);
      db.logAudit(requestorName, requestorRole, "CLIENTE_REGISTRAR", "Creación de ficha", `Registró cliente: ${cliente.name} Documento: ${cliente.document}`);
    } else {
      list[index] = cliente;
      db.logAudit(requestorName, requestorRole, "CLIENTE_EDITAR", "Actualización", `Actualizó cliente: ${cliente.name}`);
    }
    setStore(KEYS.CLIENTES, list);
  },

  addClientPoints: (customerId: string, amount: number) => {
    const clients = db.getClientes();
    const client = clients.find(c => c.id === customerId);
    if (client) {
      client.points = (client.points || 0) + amount;
      
      // Auto-loyalty coupon: if points exceed certain thresholds, award discount coupons automatically!
      if (client.points >= 200 && !client.coupons.some(coup => coup.code === "MIL_PUNTOS")) {
        client.coupons.push({
          code: "FIDELIDAD20",
          description: "20% descuento por superar 200 puntos",
          discountPercent: 20,
          minPurchase: 80000,
          used: false,
          expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 90 days expiry
        });
      } else if (client.points >= 100 && !client.coupons.some(coup => coup.code === "LOYAL15")) {
        client.coupons.push({
          code: "LOYAL15",
          description: "15% descuento frecuente por superar 100 puntos",
          discountPercent: 15,
          minPurchase: 60000,
          used: false,
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 60 days
        });
      }

      setStore(KEYS.CLIENTES, clients);
    }
  },

  // Sales (POS) Transactions
  getSales: (): Sale[] => {
    return getStore<Sale[]>(KEYS.SALES);
  },

  createSale: (sale: Sale, requestorName: string, requestorRole: UserRole): void => {
    const sales = db.getSales();
    sales.unshift(sale); // newer invoices first
    setStore(KEYS.SALES, sales);

    // 1. Decrement stock for products and log history
    const products = db.getProducts();
    sale.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const prevStock = prod.stock;
        prod.stock = Math.max(0, prod.stock - item.quantity);
        db.logInventoryHistory({
          id: "HIS_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          productId: prod.id,
          productName: prod.name,
          type: "SALE",
          quantity: -item.quantity,
          previousStock: prevStock,
          newStock: prod.stock,
          user: requestorName,
          date: sale.date,
          reason: `Venta POS Factura: ${sale.invoiceNumber}`
        });
      }
    });
    setStore(KEYS.PRODUCTS, products);

    // 2. Accumulate loyalty points for customers (e.g. 1 point for every $10.000 COP)
    if (sale.clientId && sale.clientId !== "GENERICO") {
      const pointEarned = Math.floor(sale.total / 10000);
      if (pointEarned > 0) {
        db.addClientPoints(sale.clientId, pointEarned);
      }
    }

    // 3. Mark custom loyalty coupons as used if applied
    // (If discountPercent matched a clients coupon)
    if (sale.clientId && sale.clientId !== "GENERICO" && sale.discountPercent > 0) {
      const clients = db.getClientes();
      const client = clients.find(c => c.id === sale.clientId);
      if (client) {
        const matchingCoupon = client.coupons.find(cp => cp.discountPercent === sale.discountPercent && !cp.used);
        if (matchingCoupon) {
          matchingCoupon.used = true;
          setStore(KEYS.CLIENTES, clients);
        }
      }
    }

    // 4. Record Cashbox sessions statistics automatically
    const sessions = db.getCashBoxSessions();
    const activeSession = sessions.find(s => s.status === "ABIERTA");
    if (activeSession) {
      if (sale.saleType === SaleType.CASH) {
        activeSession.salesSum += sale.total;
        activeSession.expectedCash += sale.total;
      } else if (sale.saleType === SaleType.CREDIT && sale.creditDetails) {
        activeSession.salesSum += sale.creditDetails.initialDeposit;
        activeSession.expectedCash += sale.creditDetails.initialDeposit;
        activeSession.creditsSum += (sale.total - sale.creditDetails.initialDeposit);
      }
      setStore(KEYS.SESSIONS, sessions);
    }

    db.logAudit(requestorName, requestorRole, "REALIZAR_VENTA", "Venta", `Generación de Factura: ${sale.invoiceNumber} Total: $${sale.total.toLocaleString("es-CO")} (${sale.paymentMethod}/${sale.saleType})`);
  },

  cancelSale: (saleId: string, reason: string, requestorName: string, requestorRole: UserRole): boolean => {
    const sales = db.getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return false;

    const sale = sales[saleIndex];
    if (sale.status === "CANCELADA") return false;

    sale.status = "CANCELADA";

    // Restore stock of sold products
    const products = db.getProducts();
    sale.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const prevStock = prod.stock;
        prod.stock += item.quantity;
        db.logInventoryHistory({
          id: "HIS_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          productId: prod.id,
          productName: prod.name,
          type: "RETURN",
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: prod.stock,
          user: requestorName,
          date: new Date().toISOString().split("T")[0],
          reason: `Devolución por Anulación de factura ${sale.invoiceNumber}`
        });
      }
    });
    setStore(KEYS.PRODUCTS, products);

    // Refund customer loyalty points
    if (sale.clientId && sale.clientId !== "GENERICO") {
      const pointEarned = Math.floor(sale.total / 10000);
      if (pointEarned > 0) {
        db.addClientPoints(sale.clientId, -pointEarned);
      }
    }

    // Adjust active session
    const sessions = db.getCashBoxSessions();
    const activeSession = sessions.find(s => s.status === "ABIERTA");
    if (activeSession) {
      if (sale.saleType === SaleType.CASH) {
        activeSession.salesSum -= sale.total;
        activeSession.expectedCash -= sale.total;
      } else if (sale.saleType === SaleType.CREDIT && sale.creditDetails) {
        activeSession.salesSum -= sale.creditDetails.initialDeposit;
        activeSession.expectedCash -= sale.creditDetails.initialDeposit;
        activeSession.creditsSum -= (sale.total - sale.creditDetails.initialDeposit);
        // Deduct also secondary installments made
        sale.creditDetails.installments.forEach(ins => {
          activeSession!.expectedCash -= ins.amount;
        });
      }
      setStore(KEYS.SESSIONS, sessions);
    }

    setStore(KEYS.SALES, sales);
    db.logAudit(requestorName, requestorRole, "ANULAR_VENTA", reason, `Anulación de Factura: ${sale.invoiceNumber} por valor de $${sale.total.toLocaleString("es-CO")}`);
    return true;
  },

  // Credits & Installments
  registerCreditPayment: (saleId: string, amount: number, installmentReceipt: string, requestorName: string, requestorRole: UserRole): boolean => {
    const sales = db.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.saleType !== SaleType.CREDIT || !sale.creditDetails) return false;

    const details = sale.creditDetails;
    if (details.pendingBalance <= 0) return false;

    const actualPayAmount = Math.min(amount, details.pendingBalance);

    details.pendingBalance -= actualPayAmount;
    if (details.pendingBalance <= 0) {
      details.status = "PAGADO";
    }

    details.installments.push({
      id: "INS_" + Date.now(),
      amount: actualPayAmount,
      date: new Date().toISOString(),
      receiptNumber: installmentReceipt,
      user: requestorName
    });

    // Mirror in Session expectedCash
    const sessions = db.getCashBoxSessions();
    const activeSession = sessions.find(s => s.status === "ABIERTA");
    if (activeSession) {
      activeSession.expectedCash += actualPayAmount;
      setStore(KEYS.SESSIONS, sessions);
    }

    setStore(KEYS.SALES, sales);
    db.logAudit(
      requestorName,
      requestorRole,
      "ABONO_CREDITO",
      "Abono",
      `Abono de $${actualPayAmount.toLocaleString("es-CO")} a la factura ${sale.invoiceNumber}. Saldo rest: $${details.pendingBalance.toLocaleString("es-CO")}`
    );
    return true;
  },

  // CashBox operations
  getCashBoxSessions: (): CashBoxSession[] => {
    return getStore<CashBoxSession[]>(KEYS.SESSIONS);
  },

  getTransactions: (): CashTransaction[] => {
    return getStore<CashTransaction[]>(KEYS.TRANSACTIONS);
  },

  registerCashWithdrawal: (amount: number, concept: string, authorizedAdmin: string, requestorName: string, requestorRole: UserRole): void => {
    const txs = db.getTransactions();
    const newTx: CashTransaction = {
      id: "TX_" + Date.now(),
      type: "OUTFLOW",
      amount,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      concept,
      responsibleAdmin: requestorName,
      authorizedBy: authorizedAdmin
    };
    txs.push(newTx);
    setStore(KEYS.TRANSACTIONS, txs);

    // Adjust active session
    const sessions = db.getCashBoxSessions();
    const activeSession = sessions.find(s => s.status === "ABIERTA");
    if (activeSession) {
      activeSession.outflowsSum += amount;
      activeSession.expectedCash -= amount;
      setStore(KEYS.SESSIONS, sessions);
    }

    db.logAudit(
      requestorName,
      requestorRole,
      "RETIRO_CAJA",
      concept,
      `Retiro de caja por valor de $${amount.toLocaleString("es-CO")} autorizado por ${authorizedAdmin}`
    );
  },

  registerCashInflow: (amount: number, concept: string, authorizedAdmin: string, requestorName: string, requestorRole: UserRole): void => {
    const txs = db.getTransactions();
    const newTx: CashTransaction = {
      id: "TX_" + Date.now(),
      type: "INFLOW",
      amount,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      concept,
      responsibleAdmin: requestorName,
      authorizedBy: authorizedAdmin
    };
    txs.push(newTx);
    setStore(KEYS.TRANSACTIONS, txs);

    // Adjust active session
    const sessions = db.getCashBoxSessions();
    const activeSession = sessions.find(s => s.status === "ABIERTA");
    if (activeSession) {
      activeSession.inflowsSum += amount;
      activeSession.expectedCash += amount;
      setStore(KEYS.SESSIONS, sessions);
    }

    db.logAudit(
      requestorName,
      requestorRole,
      "INGRESO_CAJA",
      concept,
      `Entrada extraordinaria de caja de $${amount.toLocaleString("es-CO")} autorizada por ${authorizedAdmin}`
    );
  },

  openCashBox: (baseAmount: number, requestorName: string, requestorRole: UserRole, denominations?: CashDenominations): boolean => {
    const sessions = db.getCashBoxSessions();
    const active = sessions.find(s => s.status === "ABIERTA");
    if (active) return false; // Already open

    const nextSessionId = "SES_" + (sessions.length + 1);
    const newSession: CashBoxSession = {
      id: nextSessionId,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openedBy: requestorName,
      closedBy: null,
      initialBase: baseAmount,
      initialBaseDenominations: denominations,
      salesSum: 0,
      inflowsSum: 0,
      outflowsSum: 0,
      creditsSum: 0,
      expectedCash: baseAmount,
      realCash: null,
      difference: null,
      status: "ABIERTA"
    };

    sessions.unshift(newSession);
    setStore(KEYS.SESSIONS, sessions);

    db.logAudit(
      requestorName,
      requestorRole,
      "APERTURA_CAJA",
      "Apertura",
      `Apertura de caja con base inicial de $${baseAmount.toLocaleString("es-CO")}`
    );

    // Automatically log drawer opening on shift initialization
    db.logDrawerOpening(requestorName, "INICIO_JORNADA", `Apertura inicial para sesión ${nextSessionId}`);

    return true;
  },

  closeCashBox: (realCashAmount: number, requestorName: string, requestorRole: UserRole, denominations?: CashDenominations): CashBoxSession | null => {
    const sessions = db.getCashBoxSessions();
    const activeIndex = sessions.findIndex(s => s.status === "ABIERTA");
    if (activeIndex === -1) return null;

    const s = sessions[activeIndex];
    s.closedAt = new Date().toISOString();
    s.closedBy = requestorName;
    s.realCash = realCashAmount;
    s.realCashDenominations = denominations;
    s.difference = realCashAmount - s.expectedCash;
    s.status = "CERRADA";

    setStore(KEYS.SESSIONS, sessions);

    db.logAudit(
      requestorName,
      requestorRole,
      "CIERRE_CAJA",
      "Caja Cerrada",
      `Arqueo de Caja final. Dinero real registrado: $${realCashAmount.toLocaleString("es-CO")}. Esperado: $${s.expectedCash.toLocaleString("es-CO")}. Diferencia: $${s.difference.toLocaleString("es-CO")}`
    );
    return s;
  },

  // Promo and Seasons API
  getPromotions: (): Promotion[] => {
    return getStore<Promotion[]>(KEYS.PROMOTION);
  },

  savePromotion: (promo: Promotion, requestorName: string): void => {
    const list = db.getPromotions();
    const index = list.findIndex(p => p.id === promo.id);
    if (index === -1) {
      list.push(promo);
      db.logAudit(requestorName, UserRole.ADMIN, "PROMO_CREAR", "Campañas", `Campañas de Promoción creada: ${promo.name} (${promo.discountPercent}%)`);
    } else {
      list[index] = promo;
      db.logAudit(requestorName, UserRole.ADMIN, "PROMO_EDITAR", "Campañas", `Promoción editada: ${promo.name}`);
    }
    setStore(KEYS.PROMOTION, list);
  },

  deletePromotion: (id: string, requestorName: string): boolean => {
    const list = db.getPromotions();
    const target = list.find(p => p.id === id);
    if (!target) return false;
    const filtered = list.filter(p => p.id !== id);
    setStore(KEYS.PROMOTION, filtered);
    db.logAudit(requestorName, UserRole.ADMIN, "PROMO_ELIMINAR", "Campañas", `Eliminó campaña: ${target.name}`);
    return true;
  },

  // Audits Logs
  getAuditLogs: (): AuditLog[] => {
    return getStore<AuditLog[]>(KEYS.AUDITS);
  },

  logAudit: (user: string, userRole: UserRole, operation: string, reason: string, details: string): void => {
    const audits = db.getAuditLogs();
    const log: AuditLog = {
      id: "AUD_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      user,
      userRole,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      operation,
      reason,
      details
    };
    audits.unshift(log); // latest first
    setStore(KEYS.AUDITS, audits);
  },

  clearAuditLogs: (requestorName: string): void => {
    localStorage.setItem(KEYS.AUDITS, JSON.stringify([]));
    db.logAudit(
      requestorName,
      UserRole.ADMIN,
      "DEPURAR_AUDITORIA",
      "Mantenimiento",
      "Historial de auditoría depurado por el administrador."
    );
  },

  // Theme Settings
  getVisualTheme: (): "clear" | "liquid" => {
    return (localStorage.getItem(KEYS.VISUAL_THEME) as "clear" | "liquid") || "clear";
  },

  setVisualTheme: (theme: "clear" | "liquid"): void => {
    localStorage.setItem(KEYS.VISUAL_THEME, theme);
  },

  // Backup & Import
  exportBackupData: (): string => {
    const backup: Record<string, string | null> = {};
    Object.keys(KEYS).forEach(k => {
      const storageKey = KEYS[k as keyof typeof KEYS];
      backup[storageKey] = localStorage.getItem(storageKey);
    });
    // Add custom pincodes
    backup["admin_pin"] = localStorage.getItem("admin_pin");
    backup["seller_pin"] = localStorage.getItem("seller_pin");
    return JSON.stringify(backup, null, 2);
  },

  importBackupData: (jsonString: string, requestorName: string): boolean => {
    try {
      const data = JSON.parse(jsonString) as Record<string, string | null>;
      Object.keys(data).forEach(key => {
        if (data[key] !== null) {
          localStorage.setItem(key, data[key]!);
        }
      });
      db.logAudit(
        requestorName,
        UserRole.ADMIN,
        "RESTAURAR_RESPALDO",
        "Mantenimiento",
        "Base de datos restaurada exitosamente por carga de archivo de respaldo local"
      );
      return true;
    } catch {
      return false;
    }
  },

  // Category management
  getCategories: (): ProductTypeCategory[] => {
    return getStore<ProductTypeCategory[]>(KEYS.CATEGORIES);
  },

  saveCategory: (category: ProductTypeCategory, requestorName: string, requestorRole: UserRole): void => {
    const categories = db.getCategories();
    const index = categories.findIndex(c => c.name.trim().toLowerCase() === category.name.trim().toLowerCase());
    if (index === -1) {
      categories.push(category);
      db.logAudit(
        requestorName,
        requestorRole,
        "CREAR_CATEGORIA",
        "Registro",
        `Creó categoría de producto: ${category.name} en grupo ${category.group}`
      );
    } else {
      categories[index] = category;
      db.logAudit(
        requestorName,
        requestorRole,
        "EDITAR_CATEGORIA",
        "Modificación",
        `Actualizó grupo de categoría ${category.name} a ${category.group}`
      );
    }
    setStore(KEYS.CATEGORIES, categories);
  },

  deleteCategory: (name: string, requestorName: string, requestorRole: UserRole): boolean => {
    const categories = db.getCategories();
    const target = categories.find(c => c.name === name);
    if (!target) return false;
    const filtered = categories.filter(c => c.name !== name);
    setStore(KEYS.CATEGORIES, filtered);
    db.logAudit(
      requestorName,
      requestorRole,
      "ELIMINAR_CATEGORIA",
      "Eliminación",
      `Eliminó categoría de producto: ${name}`
    );
    return true;
  },

  getDrawerConfig: (): DrawerConfig => {
    return getStore<DrawerConfig>(KEYS.DRAWER_CONFIG) || { connectionMethod: "RJ11", autoOpenOnCashSale: true };
  },

  saveDrawerConfig: (config: DrawerConfig): void => {
    setStore(KEYS.DRAWER_CONFIG, config);
  },

  getDrawerOpenings: (): CashDrawerOpening[] => {
    return getStore<CashDrawerOpening[]>(KEYS.DRAWER_OPENINGS) || [];
  },

  logDrawerOpening: (
    user: string,
    reason: "VENTA" | "RETIRO" | "CAMBIO" | "INICIO_JORNADA" | "MANUAL",
    details: string,
    authorizedBy?: string
  ): void => {
    const list = db.getDrawerOpenings();
    const d = new Date();
    const newOpening: CashDrawerOpening = {
      id: "OPEN_" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      date: d.toISOString().split("T")[0],
      time: d.toTimeString().split(" ")[0].substring(0, 5),
      user,
      reason,
      details,
      authorizedBy
    };
    list.unshift(newOpening);
    setStore(KEYS.DRAWER_OPENINGS, list);
    console.log(`[CAJÓN FISICO] Señal de apertura física emitida. Conexión: ${db.getDrawerConfig().connectionMethod}. Razón: ${reason} - ${details}`);
  },

  getRoundingConfig: (): { enabled: boolean; step: number } => {
    const val = localStorage.getItem("jhalex_rounding_config");
    if (!val) {
      return { enabled: true, step: 100 };
    }
    return JSON.parse(val);
  },

  saveRoundingConfig: (config: { enabled: boolean; step: number }): void => {
    localStorage.setItem("jhalex_rounding_config", JSON.stringify(config));
  }
};

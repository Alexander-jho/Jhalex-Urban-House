/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../db";
import {
  Product,
  SaleItem,
  Vendedor,
  Client,
  PaymentMethod,
  SaleType,
  Sale,
  UserRole,
  CreditDetails,
  Coupon
} from "../types";
import { VisualBarcode } from "./InventoryManager";
import { useAppearance } from "./AppearanceContext";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Percent,
  User,
  CreditCard,
  DollarSign,
  Receipt,
  RotateCcw,
  UserPlus,
  Check,
  AlertCircle,
  Printer,
  ShieldCheck,
  X,
  FileText
} from "lucide-react";

interface SalesPOSProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function SalesPOS({ currentRole, currentUserName }: SalesPOSProps) {
  const { mode } = useAppearance();
  // DB states loaded
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [vendedores, setVendedores] = useState<Vendedor[]>(db.getVendedores().filter(v => v.status === "ACTIVO"));
  const [clientes, setClientes] = useState<Client[]>(db.getClientes());
  const [sales, setSales] = useState<Sale[]>(db.getSales());

  // POS State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("C001"); // Default to generic or first
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [saleType, setSaleType] = useState<SaleType>(SaleType.CASH);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Cash Calculation utilities
  const [cashReceived, setCashReceived] = useState<number>(0);
  
  // Credit details
  const [creditInitialDeposit, setCreditInitialDeposit] = useState<number>(0);
  const [creditDueDate, setCreditDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 30 days
  );

  // Search variables
  const [productQuery, setProductQuery] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  
  // Quick customer register helper
  const [showClientRegister, setShowClientRegister] = useState<boolean>(false);
  const [newClient, setNewClient] = useState({
    name: "",
    document: "",
    phone: "",
    address: "",
    email: ""
  });

  // Colombia Compliance & Occasional Cliente States
  const [clientCategory, setClientCategory] = useState<"CONSUMIDOR" | "OCASIONAL" | "REGISTRADO">("CONSUMIDOR");
  const [occasionalClientInfo, setOccasionalClientInfo] = useState({
    docType: "CC",
    document: "",
    name: "",
    email: "",
    phone: ""
  });
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const handleOccasionalDocChange = (docVal: string) => {
    const cleanDoc = docVal.trim();
    setOccasionalClientInfo(prev => ({ ...prev, document: cleanDoc }));
    if (!cleanDoc) return;
    const found = clientes.find(c => c.document.trim() === cleanDoc);
    if (found) {
      setClientCategory("REGISTRADO");
      setSelectedClientId(found.id);
      setSuccessAlert(`¡Cliente existente autodetectado con ID ${found.name}!`);
      setTimeout(() => setSuccessAlert(""), 2000);
    }
  };

  // Current newly generated invoice state to show in modal
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);

  // Admin PIN validations
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [adminPinCode, setAdminPinCode] = useState<string>("");
  const [adminPinError, setAdminPinError] = useState<string>("");
  const [actionToAuth, setActionToAuth] = useState<{ type: "CANCEL_SALE"; targetId: string } | null>(null);

  // Alert system
  const [errorAlert, setErrorAlert] = useState<string>("");
  const [successAlert, setSuccessAlert] = useState<string>("");

  const barcodesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setProducts(db.getProducts());
    setVendedores(db.getVendedores().filter(v => v.status === "ACTIVO"));
    setClientes(db.getClientes());
    setSales(db.getSales());
  };

  // Barcode quick USB scanner emulator: when they press enter on barcode field
  const handleBarcodeAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      p => p.barCode === barcodeInput.trim() || p.code.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      if (matched.stock <= 0) {
        triggerError(`El producto ${matched.name} no cuenta con stock disponible.`);
      } else {
        addItemToCart(matched);
        setBarcodeInput("");
      }
    } else {
      triggerError(`No se encontró ningún producto con código/barra: "${barcodeInput}"`);
    }
  };

  const addItemToCart = (p: Product) => {
    setErrorAlert("");
    const existingIndex = cart.findIndex(item => item.productId === p.id);
    
    // Check if enough stock
    const curQty = existingIndex !== -1 ? cart[existingIndex].quantity : 0;
    if (curQty + 1 > p.stock) {
      triggerError(`Stock máximo alcanzado. Solo hay ${p.stock} unidades de ${p.name}`);
      return;
    }

    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].sellPrice * (1 - updated[existingIndex].discountPercent / 100);
      setCart(updated);
    } else {
      const newItem: SaleItem = {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        quantity: 1,
        discountPercent: 0,
        total: p.sellPrice
      };
      setCart([...cart, newItem]);
    }
  };

  const adjustQty = (productId: string, diff: number) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    const index = cart.findIndex(item => item.productId === productId);
    if (index === -1) return;

    const updated = [...cart];
    const newQty = updated[index].quantity + diff;

    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      if (newQty > p.stock) {
        triggerError(`No puedes vender más de las ${p.stock} unidades disponibles.`);
        return;
      }
      updated[index].quantity = newQty;
      updated[index].total = newQty * updated[index].sellPrice * (1 - updated[index].discountPercent / 100);
    }
    setCart(updated);
  };

  const removeItem = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const triggerError = (msg: string) => {
    setErrorAlert(msg);
    setTimeout(() => setErrorAlert(""), 4000);
  };

  // Cart totals math
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, curr) => acc + (curr.sellPrice * curr.quantity), 0);
    const discAmount = subtotal * (discountPercent / 100);
    const total = subtotal - discAmount;
    return { subtotal, discAmount, total };
  }, [cart, discountPercent]);

  // Rounding variables - configurable
  const roundingData = useMemo(() => {
    const rConfig = db.getRoundingConfig();
    const isEfectivo = paymentMethod === PaymentMethod.CASH;
    if (!rConfig.enabled || !isEfectivo || cartTotals.total <= 0) {
      return {
        originalTotal: cartTotals.total,
        roundedTotal: cartTotals.total,
        roundingDifference: 0
      };
    }
    const step = rConfig.step || 100;
    const remainder = cartTotals.total % step;
    let roundedTotal = cartTotals.total;
    let roundingDifference = 0;
    if (remainder < step / 2) {
      roundedTotal = cartTotals.total - remainder;
      roundingDifference = -remainder;
    } else {
      roundedTotal = cartTotals.total + (step - remainder);
      roundingDifference = (step - remainder);
    }
    return {
      originalTotal: cartTotals.total,
      roundedTotal,
      roundingDifference
    };
  }, [cartTotals.total, paymentMethod]);

  const [drawerOpenAlert, setDrawerOpenAlert] = useState<string>("");

  // Handle coupon redemption
  const selectedClientData = useMemo(() => {
    return clientes.find(c => c.id === selectedClientId) || null;
  }, [clientes, selectedClientId]);

  // Apply Client Loyalty coupon
  const applyCouponCode = (coupon: Coupon) => {
    if (cartTotals.subtotal < coupon.minPurchase) {
      triggerError(`El cupón requiere una compra mínima de $${coupon.minPurchase.toLocaleString("es-CO")}`);
      return;
    }
    setDiscountPercent(coupon.discountPercent);
    setSuccessAlert(`¡Cupón "${coupon.code}" aplicado [${coupon.discountPercent}% desc]`);
    setTimeout(() => setSuccessAlert(""), 2000);
  };

  // Client registration
  const handleClientQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.document) return;

    const cleanId = "C_" + Date.now();
    const freshClient: Client = {
      id: cleanId,
      name: newClient.name,
      document: newClient.document,
      phone: newClient.phone,
      address: newClient.address,
      email: newClient.email,
      points: 0,
      coupons: []
    };

    db.saveCliente(freshClient, currentUserName, currentRole);
    refreshData();
    setSelectedClientId(cleanId);
    setShowClientRegister(false);
    setNewClient({ name: "", document: "", phone: "", address: "", email: "" });
    setSuccessAlert("Cliente registrado e ingresado con éxito.");
    setTimeout(() => setSuccessAlert(""), 2000);
  };

  // JHALEX OCCASIONAL CONVERSION TO LOYALTY SYSTEM
  const convertOccasionalToRegistered = (sale: Sale) => {
    if (!sale) return;
    const documentNum = sale.occasionalClientDocNum || sale.clientId.replace("TEMP_", "");
    
    // Check if client with this document already exists
    const duplicate = clientes.find(c => c.document.trim() === documentNum.trim());
    if (duplicate) {
      // Just migrate client selection and map previous sales
      const allSales = db.getSales();
      const updatedSales = allSales.map(item => {
        if (item.clientId === sale.clientId || item.occasionalClientDocNum === documentNum) {
          return {
            ...item,
            clientId: duplicate.id,
            clientName: duplicate.name,
            clientType: "REGISTRADO"
          };
        }
        return item;
      });
      localStorage.setItem("pos_sales", JSON.stringify(updatedSales));
      refreshData();
      setSuccessAlert(`¡Facturas asociadas al cliente registrado ${duplicate.name}!`);
      setTimeout(() => setSuccessAlert(""), 2000);
      return;
    }

    const cleanId = "C_" + Date.now();
    const freshClient: Client = {
      id: cleanId,
      name: sale.clientName,
      document: documentNum,
      phone: sale.occasionalClientPhone || "",
      address: "Cúcuta, Colombia",
      email: sale.occasionalClientEmail || "",
      points: Math.floor(sale.total / 10000), // Give points for previous purchase!
      coupons: [],
      clientType: "REGISTRADO"
    };

    db.saveCliente(freshClient, currentUserName, currentRole);
    
    // Update previous transactions
    const allSales = db.getSales();
    const updatedSales = allSales.map(item => {
      const matchDoc = item.occasionalClientDocNum === documentNum || item.clientId === sale.clientId;
      if (matchDoc) {
        return {
          ...item,
          clientId: freshClient.id,
          clientName: freshClient.name,
          clientType: "REGISTRADO"
        };
      }
      return item;
    });
    localStorage.setItem("pos_sales", JSON.stringify(updatedSales));

    refreshData();
    setSuccessAlert(`¡Cliente ocasional ${freshClient.name} convertido en Cliente Registrado!`);
    setTimeout(() => setSuccessAlert(""), 3500);
  };

  // Complete POS sale submit
  const handleCheckout = () => {
    if (cart.length === 0) {
      triggerError("Por favor agregue al menos un producto al carrito de compras.");
      return;
    }

    // Verify cash register session is active
    const activeSession = db.getCashBoxSessions().find(s => s.status === "ABIERTA");
    if (!activeSession) {
      triggerError("EL SISTEMA SE ENCUENTRA INOPERABLE para ventas POS. Debe iniciar jornada y registrar la Apertura de Caja.");
      return;
    }

    const seller = vendedores.find(v => v.id === selectedSellerId);
    
    let clientId = "GENERICO";
    let clientName = "Consumidor Final";
    let calculatedClientType = "CONSUMIDOR_FINAL";
    
    let occasionalEmail = "";
    let occasionalPhone = "";
    let occasionalDocType = "";
    let occasionalDocNum = "";

    if (clientCategory === "OCASIONAL") {
      if (!occasionalClientInfo.document || !occasionalClientInfo.name) {
        triggerError("Para factura electrónica ocasional, se requiere ingresar Documento y Nombre.");
        return;
      }
      clientId = "TEMP_" + occasionalClientInfo.document;
      clientName = occasionalClientInfo.name;
      calculatedClientType = "OCASIONAL_ELECTRONICA";
      occasionalEmail = occasionalClientInfo.email;
      occasionalPhone = occasionalClientInfo.phone;
      occasionalDocType = occasionalClientInfo.docType;
      occasionalDocNum = occasionalClientInfo.document;
    } else if (clientCategory === "REGISTRADO") {
      const matchedClient = clientes.find(c => c.id === selectedClientId);
      if (!matchedClient || matchedClient.id === "GENERICO") {
        triggerError("Seleccione un cliente registrado válido o elija otra categoría.");
        return;
      }
      clientId = matchedClient.id;
      clientName = matchedClient.name;
      calculatedClientType = matchedClient.clientType || "REGISTRADO";
    }

    const checkoutsDate = new Date();
    
    // Generate consecutive-like clean invoice number using Colombian DIAN settings
    const company = db.getCompany();
    const prefix = company.prefijoFactura || "FAC";
    const nextNum = company.numeracionSiguiente ?? (1000 + sales.length + 1);
    const cleanInvoiceNumber = `${prefix}-${nextNum}`;

    let creditDetails: CreditDetails | undefined = undefined;
    if (saleType === SaleType.CREDIT) {
      if (clientId === "GENERICO") {
        triggerError("Para ventas a crédito DEBES registrar o seleccionar un cliente real o bien ocasional con datos.");
        return;
      }
      creditDetails = {
        clientId: clientId,
        clientName: clientName,
        totalAmount: roundingData.roundedTotal,
        initialDeposit: Number(creditInitialDeposit),
        pendingBalance: roundingData.roundedTotal - Number(creditInitialDeposit),
        dueDate: creditDueDate,
        installments: [],
        status: "PENDIENTE"
      };
    }

    const newSale: Sale = {
      id: "SALE_" + Date.now(),
      invoiceNumber: cleanInvoiceNumber,
      date: checkoutsDate.toISOString().split("T")[0],
      time: checkoutsDate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      sellerId: seller ? seller.id : "SELLER_GEN",
      sellerName: seller ? seller.name : "Vendedor de Turno",
      clientId,
      clientName,
      clientType: calculatedClientType,
      occasionalClientDocType: occasionalDocType,
      occasionalClientDocNum: occasionalDocNum,
      occasionalClientEmail: occasionalEmail,
      occasionalClientPhone: occasionalPhone,
      items: cart,
      subtotal: cartTotals.subtotal,
      discountPercent: discountPercent,
      discountAmount: cartTotals.discAmount,
      total: roundingData.roundedTotal,
      paymentMethod: paymentMethod,
      saleType: saleType,
      creditDetails,
      status: "ACTIVA",
      originalTotal: roundingData.originalTotal,
      roundedTotal: roundingData.roundedTotal,
      roundingDifference: roundingData.roundingDifference
    };

    // Save transaction
    db.createSale(newSale, currentUserName, currentRole);

    // Update DIAN Invoice consecutive numbering sequentially
    if (company.numeracionSiguiente !== undefined) {
      db.saveCompany({
        ...company,
        numeracionSiguiente: nextNum + 1
      }, currentUserName, currentRole);
    }

    // If Efectivo (Cash) payment, automatically trigger cash drawer opening signal
    if (paymentMethod === PaymentMethod.CASH && saleType === SaleType.CASH) {
      db.logDrawerOpening(
        currentUserName,
        "VENTA",
        `Venta POS Factura ${cleanInvoiceNumber} por total de $${roundingData.roundedTotal.toLocaleString("es-CO")}`
      );
      setDrawerOpenAlert(`¡Señal de Apertura Enviada! Cajón de dinero abierto automáticamente método [${db.getDrawerConfig().connectionMethod}].`);
      setTimeout(() => setDrawerOpenAlert(""), 4500);
    }

    // Refresh memory states
    refreshData();
    setActiveInvoice(newSale); // Active invoice output printer modal
    setCart([]);
    setDiscountPercent(0);
    setCashReceived(0);
    setCreditInitialDeposit(0);
    
    setSuccessAlert(`¡Venta procesada exitosamente! Ticket: ${cleanInvoiceNumber}`);
    setTimeout(() => setSuccessAlert(""), 3000);
  };

  const triggerAnulateSale = (saleId: string) => {
    setActionToAuth({
      type: "CANCEL_SALE",
      targetId: saleId
    });
    setAdminPinCode("");
    setAdminPinError("");
    setShowAdminPinModal(true);
  };

  const handleAdminAuthAction = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError("");

    const matchOK = db.verifyPIN(UserRole.ADMIN, adminPinCode);
    if (matchOK) {
      setShowAdminPinModal(false);
      if (actionToAuth && actionToAuth.type === "CANCEL_SALE") {
        const ok = db.cancelSale(actionToAuth.targetId, "Cancelación de venta POS", currentUserName, currentRole);
        if (ok) {
          refreshData();
          setSuccessAlert("Factura anulada correctly. Inventario reestablecido.");
          setTimeout(() => setSuccessAlert(""), 2000);
        } else {
          triggerError("La factura no pudo ser cancelada o ya se encontraba cancelada.");
        }
      }
      setActionToAuth(null);
    } else {
      setAdminPinError("Código PIN incorrecto de Administrador.");
    }
  };

  // Search filter for products catalog dropdown
  const filteredCatalogOptions = useMemo(() => {
    if (!productQuery.trim()) return [];
    return products.filter(
      p =>
        p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(productQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(productQuery.toLowerCase())
    );
  }, [products, productQuery]);

  const changeToGive = Math.max(0, cashReceived - roundingData.roundedTotal);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT AREA: Catalog, scanners and invoice details (Columns 7) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Barcode & Manual Catalog Search Panel */}
        <div className={`${
          mode === "LIQUID"
            ? "liquid-glass-card shadow-xs"
            : "bg-white border border-gray-200 shadow-2xs"
        } rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Barcode className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-bold text-gray-900">Lectura y Agregado de Productos</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* USB scanner input emulation */}
            <form onSubmit={handleBarcodeAndAdd} className="space-y-1">
              <label className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Escanear Código / Barra</label>
              <div className="relative">
                <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  ref={barcodesInputRef}
                  type="text"
                  placeholder="Escanee con USB o escriba aquí..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none focus:bg-white font-mono"
                />
              </div>
            </form>

            {/* Keyword autocomplete box */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Buscar por Texto</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Escriba nombre, marca, talla..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none focus:bg-white"
                />
              </div>

              {/* Autocomplete absolute menu */}
              {filteredCatalogOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-14 bg-white border border-gray-100 rounded-xl max-h-60 overflow-y-auto shadow-xl z-20 divide-y divide-gray-50 text-xs">
                  {filteredCatalogOptions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (p.stock <= 0) {
                          triggerError(`No hay stock disponible de ${p.name}`);
                        } else {
                          addItemToCart(p);
                          setProductQuery("");
                        }
                      }}
                      className="w-full text-left p-2.5 hover:bg-gray-50 flex items-center justify-between transition gap-2"
                    >
                      <div>
                        <strong className="block text-gray-900">{p.name}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">Ref: {p.code} • Color: {p.color} • Talla: {p.size}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-gray-800">${p.sellPrice.toLocaleString("es-CO")}</span>
                        <span className="block text-[10px] text-gray-400">({p.stock} uds disp)</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CART LIST PREVIEW */}
        <div className={`${
          mode === "LIQUID"
            ? "liquid-glass-card shadow-xs"
            : "bg-white border border-gray-200 shadow-2xs"
        } rounded-2xl overflow-hidden flex flex-col`}>
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">Artículos en Caja ({cart.reduce((a,c) => a + c.quantity, 0)})</span>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[10px] text-red-500 font-semibold hover:underline flex items-center gap-0.5"
              >
                <Trash2 className="w-3 h-3" /> Limpiar Todo
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-gray-400 space-y-2">
                <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs">No hay productos en esta transacción.</p>
                <button
                  onClick={() => {
                    const firstProd = products[0];
                    if (firstProd) addItemToCart(firstProd);
                  }}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Agregar producto Demo
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition">
                  <div className="flex-1">
                    <span className="font-bold text-gray-900 text-xs block">{item.productName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ref: {item.productCode} • Unitario: ${item.sellPrice.toLocaleString("es-CO")}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustQty(item.productId, -1)}
                      className="text-gray-500 bg-gray-100 p-1 rounded hover:bg-gray-200 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => adjustQty(item.productId, 1)}
                      className="text-gray-500 bg-gray-100 p-1 rounded hover:bg-gray-200 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right w-24">
                    <span className="font-mono font-bold text-xs block">${item.total.toLocaleString("es-CO")}</span>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-gray-300 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* INVOICE BILLING HISTORY LIST */}
        <div className={`${
          mode === "LIQUID"
            ? "liquid-glass-card shadow-xs"
            : "bg-white border border-gray-200 shadow-2xs"
        } rounded-2xl p-5 space-y-4`}>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b pb-2">Historial de Ventas del Turno</h4>
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 text-xs">
            {sales.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-gray-800 font-mono font-bold text-xs">{s.invoiceNumber}</strong>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold ${
                      s.status === "CANCELADA" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-gray-400 text-[10px] mt-0.5 flex flex-wrap items-center gap-1">
                    <span>Cliente: {s.clientName} • Vendedor: {s.sellerName} • {s.date} {s.time}</span>
                    {s.clientType === "OCASIONAL_ELECTRONICA" && (
                      <button
                        onClick={() => convertOccasionalToRegistered(s)}
                        className="inline-flex items-center gap-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-150 text-indigo-700 hover:text-indigo-950 border border-indigo-200 px-1 py-0.2 rounded font-extrabold transition-colors duration-150"
                        title="Convertir los datos de este ticket en un perfil de cliente registrado para acumular puntos"
                      >
                        <UserPlus className="w-2.5 h-2.5 text-indigo-600" /> Registrar Cliente
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-gray-900">${s.total.toLocaleString("es-CO")}</span>
                  <div className="space-x-1 shrink-0">
                    <button
                      onClick={() => setActiveInvoice(s)}
                      title="Imprimir Factura"
                      className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-1 rounded"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {s.status === "ACTIVA" && (
                      <button
                        onClick={() => triggerAnulateSale(s.id)}
                        title="Anular Factura"
                        className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT AREA: Checkout processing, discounts, loyalty and metrics (Columns 5) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* OPERATOR AND CUSTOMER SELECT PANEL */}
        <div className={`${
          mode === "LIQUID"
            ? "liquid-glass-card shadow-xs"
            : "bg-white border border-gray-200 shadow-2xs"
        } rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Asignación de Atributos</span>
            <button
              onClick={() => setShowClientRegister(true)}
              className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" /> Registrar Cliente
            </button>
          </div>

          <div className="space-y-3">
            {/* Vendedor */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-xs font-semibold text-gray-500">Vendedor:</span>
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="col-span-2 bg-gray-50 border rounded px-2.5 py-1.5 text-xs text-gray-800"
              >
                <option value="">Ventas de Turno (Por defecto)</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* JHALEX PREMIUM CLIENT CATEGORY SELECTOR */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Categoría de Facturación</span>
              <div className="grid grid-cols-3 gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setClientCategory("CONSUMIDOR");
                    setSelectedClientId("C001");
                  }}
                  className={`py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 ${
                    clientCategory === "CONSUMIDOR"
                      ? "bg-white text-gray-950 shadow-xs border border-gray-200"
                      : "text-gray-500 hover:text-gray-950"
                  }`}
                >
                  Genérico
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientCategory("OCASIONAL");
                  }}
                  className={`py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 ${
                    clientCategory === "OCASIONAL"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-500 hover:text-indigo-600"
                  }`}
                >
                  Ocasional
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientCategory("REGISTRADO");
                  }}
                  className={`py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 ${
                    clientCategory === "REGISTRADO"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-500 hover:text-emerald-600"
                  }`}
                >
                  Registrado
                </button>
              </div>

              {/* CASE 1: Consumidor Final (Generic) */}
              {clientCategory === "CONSUMIDOR" && (
                <div className="bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200 text-center space-y-1">
                  <span className="text-[11px] font-bold text-gray-700 block">Consumidor Final (Venta POS de Mostrador)</span>
                  <p className="text-[9px] text-gray-400">Venta rápida tradicional sin registrar información de contacto.</p>
                </div>
              )}

              {/* CASE 2: Factura Electrónica Ocasional (Quick creation fields) */}
              {clientCategory === "OCASIONAL" && (
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold text-indigo-800 block uppercase tracking-wide">Datos para Factura Electrónica</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-400 block font-semibold mb-0.5">Tipo Doc.</label>
                      <select
                        value={occasionalClientInfo.docType}
                        onChange={(e) => setOccasionalClientInfo(prev => ({ ...prev, docType: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800 outline-none"
                      >
                        <option value="CC">C.C.</option>
                        <option value="NIT">NIT</option>
                        <option value="CE">C.E.</option>
                        <option value="RUT">RUT</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-gray-400 block font-semibold mb-0.5">Identificación / Nit *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. 1090445..."
                        value={occasionalClientInfo.document}
                        onChange={(e) => handleOccasionalDocChange(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-800 outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 block font-semibold mb-0.5">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Consumidor Consumidor"
                      value={occasionalClientInfo.name}
                      onChange={(e) => setOccasionalClientInfo(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-800 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-400 block font-semibold mb-0.5">E-mail (DIAN)</label>
                      <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={occasionalClientInfo.email}
                        onChange={(e) => setOccasionalClientInfo(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-800 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400 block font-semibold mb-0.5">Teléfono (WhatsApp)</label>
                      <input
                        type="text"
                        placeholder="Ej. 3154567..."
                        value={occasionalClientInfo.phone}
                        onChange={(e) => setOccasionalClientInfo(p => ({ ...p, phone: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-800 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 3: Registered Loyalty Client (Search input and dropdown list) */}
              {clientCategory === "REGISTRADO" && (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wide">Buscar Cliente Registrado</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar por nombre, cédula o cel..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full bg-white border rounded px-2 py-1.5 pl-6 text-[11px] outline-none text-gray-800"
                    />
                  </div>
                  <div>
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        setDiscountPercent(0);
                      }}
                      className="w-full bg-white border rounded px-2 py-1 text-xs text-gray-800 outline-none"
                    >
                      <option value="GENERICO">-- Seleccione Cliente --</option>
                      {clientes
                        .filter(c => {
                          if (c.id === "GENERICO") return false;
                          if (!clientSearchQuery.trim()) return true;
                          const q = clientSearchQuery.trim().toLowerCase();
                          return (
                            c.name.toLowerCase().includes(q) ||
                            c.document.includes(q) ||
                            (c.phone && c.phone.includes(q))
                          );
                        })
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - #{c.document}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* If customer selected has redeemable loyalty coupons */}
          {selectedClientData && selectedClientData.coupons && selectedClientData.coupons.filter(cop => !cop.used).length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-indigo-700 block uppercase tracking-wider">Cupones de Fidelidad Disponibles</span>
              {selectedClientData.coupons.filter(cop => !cop.used).map((cop, index) => (
                <button
                  key={index}
                  onClick={() => applyCouponCode(cop)}
                  className="w-full flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border hover:bg-indigo-100 transition"
                >
                  <span className="font-bold text-indigo-800 text-left block">{cop.description}</span>
                  <span className="font-mono bg-indigo-200 text-indigo-950 px-1.5 py-0.5 rounded text-[9px] font-extrabold">{cop.code} [-{cop.discountPercent}%]</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SALES TYPE AND PAYMENT CHANNELS */}
        <div className={`${
          mode === "LIQUID"
            ? "liquid-glass-card shadow-xs"
            : "bg-white border border-gray-200 shadow-2xs"
        } rounded-2xl p-5 space-y-4`}>
          <span className="text-xs font-bold text-gray-900 uppercase tracking-widest block border-b pb-2">Canalización de Caja</span>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setSaleType(SaleType.CASH); }}
              className={`py-2 rounded-xl text-xs font-bold border transition ${
                saleType === SaleType.CASH
                  ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              Venta de Contado
            </button>
            <button
              onClick={() => { setSaleType(SaleType.CREDIT); }}
              className={`py-2 rounded-xl text-xs font-bold border transition ${
                saleType === SaleType.CREDIT
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              A Crédito (Abonos)
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {saleType === SaleType.CASH ? (
              // Contado: Methods and paid change math
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {Object.values(PaymentMethod).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition ${
                        paymentMethod === m
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {paymentMethod === PaymentMethod.CASH && (
                  <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 block">Efectivo Recibido</label>
                      <input
                        type="number"
                        min={0}
                        value={cashReceived || ""}
                        placeholder="0"
                        onChange={(e) => setCashReceived(Number(e.target.value))}
                        className="w-full text-sm font-mono font-bold bg-white text-gray-900 border rounded px-2 py-1 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Cambio a entregar</span>
                      <strong className="font-mono text-emerald-600 text-sm block pt-1 leading-normal">
                        ${changeToGive.toLocaleString("es-CO")}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Crédito: initial and details
              <div className="space-y-3 bg-indigo-50/50 outline border border-dashed border-indigo-100 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-800">Abono Inicial Inicial *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={creditInitialDeposit}
                      onChange={(e) => setCreditInitialDeposit(Number(e.target.value))}
                      className="w-full bg-white text-xs p-1.5 border rounded outline-none font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-800">Fecha Límite Pago *</label>
                    <input
                      type="date"
                      required
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                      className="w-full bg-white text-xs p-1 border rounded outline-none font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1 border-t text-indigo-900">
                  <span>Deuda Pendiente:</span>
                  <span className="font-mono font-bold">${(cartTotals.total - creditInitialDeposit).toLocaleString("es-CO")}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FINAL TICKET CHECKOUT BUTTONS */}
        <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <div className="space-y-2 border-b border-white/10 pb-4">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Subtotal Facturado:</span>
              <span className="font-mono">${cartTotals.subtotal.toLocaleString("es-CO")}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span>Descuento Manual:</span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(90, Number(e.target.value)))}
                  className="w-10 bg-white/10 rounded px-1.5 text-center font-bold text-white font-mono text-[11px]"
                />
                <span>%</span>
              </div>
              <span className="font-mono">-${cartTotals.discAmount.toLocaleString("es-CO")}</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="font-bold text-sm tracking-widest text-indigo-300">TOTAL ORIGINAL:</span>
            <span className="font-mono font-bold text-lg text-white">
              ${roundingData.originalTotal.toLocaleString("es-CO")}
            </span>
          </div>

          {roundingData.roundingDifference !== 0 && (
            <div className="bg-indigo-950/70 border border-indigo-900 rounded-xl p-2.5 my-2 text-[11px] text-indigo-200 flex flex-col gap-1.5 animate-in slide-in-from-bottom duration-150">
              <div className="flex justify-between">
                <span>Método de Pago:</span>
                <span className="font-semibold text-emerald-400">EFECTIVO (Redondeado)</span>
              </div>
              <div className="flex justify-between text-yellow-400 font-mono">
                <span>Diferencia Redondeo ($100 COP):</span>
                <span>
                  {roundingData.roundingDifference > 0 ? "+" : ""}${roundingData.roundingDifference.toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center py-2.5 bg-indigo-950/40 px-3 rounded-xl border border-white/5 my-1">
            <span className="font-black text-xs tracking-widest text-emerald-300">TOTAL A COBRAR:</span>
            <span className="font-mono font-bold text-2xl text-emerald-400">
              ${roundingData.roundedTotal.toLocaleString("es-CO")}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            placeholder="Cobrar Factura POS"
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl py-3.5 text-sm font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Receipt className="w-5 h-5" />
            Cobrar e Imprimir Ticket
          </button>
        </div>
      </div>

      {/* ALERT BARS */}
      {errorAlert && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-800 p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm animate-bounce z-50">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-xs">{errorAlert}</span>
        </div>
      )}

      {successAlert && (
        <div className="fixed bottom-4 right-4 bg-emerald-100 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm animate-pulse z-50">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs">{successAlert}</span>
        </div>
      )}

      {drawerOpenAlert && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-900 p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm z-50 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-yellow-600 shrink-0 animate-pulse" />
          </div>
          <div className="text-left text-[11px]">
            <strong className="block text-[10px] uppercase font-black text-yellow-700 tracking-wider">Apertura de Cajón</strong>
            <span>{drawerOpenAlert}</span>
          </div>
        </div>
      )}

      {/* MODAL: CLIENT QUICK REGISTER */}
      {showClientRegister && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
              <span className="font-bold text-sm">Registrar Nuevo Cliente Frecuente</span>
              <button onClick={() => setShowClientRegister(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleClientQuickRegister} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={newClient.name}
                    onChange={(e) => setNewClient(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-gray-50 border rounded p-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Documento / Cédula *</label>
                  <input
                    type="text"
                    required
                    value={newClient.document}
                    onChange={(e) => setNewClient(p => ({ ...p, document: e.target.value }))}
                    className="w-full bg-gray-50 border rounded p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Teléfono Movil</label>
                  <input
                    type="text"
                    value={newClient.phone}
                    onChange={(e) => setNewClient(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-gray-50 border rounded p-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Correo de Contacto</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-gray-50 border rounded p-2"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Dirección Residencial</label>
                <input
                  type="text"
                  value={newClient.address}
                  onChange={(e) => setNewClient(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-gray-50 border rounded p-2"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white p-2.5 rounded-lg font-bold hover:bg-indigo-700 transition"
              >
                Inscribir Cliente en Loyalty System
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN ACCESS FOR REVERT/CANCEL */}
      {showAdminPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="text-center space-y-1">
              <ShieldCheck className="w-10 h-10 text-red-600 mx-auto" />
              <h4 className="font-bold text-gray-900">Validación de Administrador Requerida</h4>
              <p className="text-xs text-gray-500">
                Esta acción modificará inventarios históricos o reversará montos de facturación en cajas activas. Ingrese PIN Admin.
              </p>
            </div>

            <form onSubmit={handleAdminAuthAction} className="space-y-4">
              <input
                type="password"
                required
                maxLength={8}
                value={adminPinCode}
                onChange={(e) => setAdminPinCode(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-widest bg-gray-50 border rounded-lg p-2.5 text-base font-mono focus:bg-white focus:outline-none"
              />

              {adminPinError && <p className="text-red-600 text-xs text-center font-bold">{adminPinError}</p>}

              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setActionToAuth(null);
                  }}
                  className="flex-1 bg-gray-100 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700"
                >
                  Confirmar PIN y Reversar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTER STICKER SHEET OF RECENT INVOICE */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
              <span className="font-bold text-xs text-gray-700 font-mono">Vista Previa de Facturación</span>
              <button onClick={() => { setActiveInvoice(null); }}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {/* Thermal receipt styling block with Colombian DIAN compliance elements */}
              <div id="invoice-physical-print" className="bg-white p-5 border border-gray-300 rounded-xl space-y-3.5 md:max-w-xs mx-auto shadow-sm text-center font-mono text-[11px] text-gray-800 leading-normal">
                {/* Brand and company stats */}
                <div className="space-y-1 pb-3 border-b border-dashed">
                  <div className="text-[13px] font-black tracking-tight uppercase text-gray-900">{db.getCompany().name}</div>
                  {db.getCompany().razonSocial && <div className="text-[9px] text-gray-700 font-bold uppercase">{db.getCompany().razonSocial}</div>}
                  <div className="text-[8.5px] text-gray-500 leading-relaxed text-left">
                    <span>NIT: {db.getCompany().nit}{db.getCompany().dv ? `-${db.getCompany().dv}` : ""}</span> <br />
                    <span>Régimen: {db.getCompany().regimenTributario || "Simplificado"}</span> <br />
                    <span>Resp. Fiscal: {db.getCompany().responsabilidadesFiscales || "No Responsable de IVA"}</span> <br />
                    <span>Actividad CIIU: {db.getCompany().actividadCIIU || "4771"}</span> <br />
                    <span>Tel: {db.getCompany().telefonoEmpresarial || db.getCompany().phone}</span> <br />
                    <span>Direcc: {db.getCompany().direccionComercial || db.getCompany().address}, {db.getCompany().ciudadRegistroCC || db.getCompany().city}</span>
                  </div>
                </div>

                {/* Colombian DIAN resolution and electronic invoice authorization info */}
                <div className="text-[8px] text-left text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100 space-y-0.5 leading-tight">
                  <strong className="block text-gray-600 text-center text-[7.5px] uppercase tracking-wide border-b pb-0.5 mb-1">Autorización Facturación Oficial DIAN</strong>
                  <div>Resolución: {db.getCompany().resolucionDian || "18764039328271"}</div>
                  <div>Fecha: {db.getCompany().resolucionFecha || "2025-10-15"}</div>
                  <div>Prefijo: {db.getCompany().prefijoFactura || "FAC"} • Rango: {db.getCompany().numeracionDesde || "1001"} - {db.getCompany().numeracionHasta || "10000"}</div>
                </div>

                {/* Bill metadata */}
                <div className="text-left py-1 text-[10px] space-y-0.5 border-b border-dashed pb-3">
                  <div><strong>FACTURA DE VENTA:</strong> {activeInvoice.invoiceNumber}</div>
                  <div><strong>FECHA:</strong> {activeInvoice.date} <strong>HORA:</strong> {activeInvoice.time}</div>
                  <div><strong>VENDEDOR:</strong> {activeInvoice.sellerName}</div>
                  <div className="border-t border-gray-100 pt-1.5 mt-1.5 space-y-0.5">
                    <strong>ADQUIRENTE:</strong> <span className="uppercase">{activeInvoice.clientName}</span>
                    {activeInvoice.occasionalClientDocNum && (
                      <span className="text-[9px] text-gray-500 block leading-tight font-mono mt-0.5">
                        {activeInvoice.occasionalClientDocType || "CC"}: {activeInvoice.occasionalClientDocNum} <br />
                        {activeInvoice.occasionalClientEmail && <span className="lowercase block">Email: {activeInvoice.occasionalClientEmail}</span>}
                        {activeInvoice.occasionalClientPhone && <span>Tel: {activeInvoice.occasionalClientPhone}</span>}
                      </span>
                    )}
                    {!activeInvoice.occasionalClientDocNum && activeInvoice.clientId !== "GENERICO" && (
                      <span className="text-[9px] text-gray-500 block leading-tight mt-0.5">
                        Cliente ID: {activeInvoice.clientId}
                      </span>
                    )}
                    {activeInvoice.clientId === "GENERICO" && (
                      <span className="text-[9px] text-gray-400 block italic leading-tight mt-0.5">
                        (Consumidor final de mostrador)
                      </span>
                    )}
                  </div>
                </div>

                {/* Items breakdown list */}
                <table className="w-full text-left text-[10px] border-b border-dashed pb-3">
                  <thead>
                    <tr className="border-b font-bold">
                      <th className="py-1">ARTÍCULO</th>
                      <th className="py-1 text-center">CANT</th>
                      <th className="py-1 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-1.5">
                          <span className="font-bold block truncate max-w-[130px]">{item.productName}</span>
                          <span className="text-[8px] text-gray-400">${item.sellPrice.toLocaleString("es-CO")} x un</span>
                        </td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right">${item.total.toLocaleString("es-CO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals box */}
                <div className="text-right text-[10px] space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${activeInvoice.subtotal.toLocaleString("es-CO")}</span>
                  </div>
                  {activeInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-indigo-700">
                      <span>Descuento ({activeInvoice.discountPercent}%):</span>
                      <span>-${activeInvoice.discountAmount.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs border-t border-dashed pt-2">
                    <span>TOTAL COMPRA:</span>
                    <span>${activeInvoice.total.toLocaleString("es-CO")}</span>
                  </div>
                </div>

                {/* Payment specific details */}
                <div className="border-t border-dashed pt-2.5 text-left text-[10px] space-y-1">
                  <div><strong>Método de pago:</strong> {activeInvoice.paymentMethod}</div>
                  <div><strong>Tipo de Venta:</strong> {activeInvoice.saleType}</div>
                  
                  {activeInvoice.creditDetails && (
                    <div className="bg-gray-100 p-2 rounded text-[9px] space-y-0.5">
                      <div className="text-indigo-800 font-bold">CRÉDITO ASIGNADO:</div>
                      <div>Abono inicial: ${activeInvoice.creditDetails.initialDeposit.toLocaleString("es-CO")}</div>
                      <div>Deuda pendiente: ${activeInvoice.creditDetails.pendingBalance.toLocaleString("es-CO")}</div>
                      <div>Vence el: {activeInvoice.creditDetails.dueDate}</div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-dashed text-[9px] text-gray-400 text-center">
                  <p>{db.getCompany().invoiceMessage}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const printHtml = document.getElementById("invoice-physical-print")?.innerHTML;
                    const popWindow = window.open("", "_blank");
                    if (popWindow) {
                      popWindow.document.write(`
                        <html>
                          <head>
                            <title>Ticket ${activeInvoice.invoiceNumber}</title>
                            <style>
                              body { font-family: monospace; padding: 20px; font-size: 11px; }
                              .dashed-border { border-bottom: 1px dashed #000; }
                              th, td { padding: 4px 0; }
                            </style>
                          </head>
                          <body>
                            <div style="max-width: 300px; margin: 0 auto;">${printHtml}</div>
                            <script>window.print();</script>
                          </body>
                        </html>
                      `);
                      popWindow.document.close();
                    } else {
                      window.print();
                    }
                  }}
                  className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-black transition flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Ticket
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-xs font-semibold hover:bg-gray-200 transition"
                >
                  Cerrar Vista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

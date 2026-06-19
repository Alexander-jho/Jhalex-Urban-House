/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { db } from "../db";
import { Product, UserRole, InventoryHistory, ProductTypeCategory } from "../types";
import { useAppearance } from "./AppearanceContext";
import {
  ListFilter,
  Plus,
  Search,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Barcode,
  History,
  TrendingUp,
  Package,
  ArrowUpDown,
  Printer,
  ShieldAlert,
  SlidersHorizontal,
  X
} from "lucide-react";

// Native CSS barcode renderer for ultra-realistic custom tickets
export function VisualBarcode({ value }: { value: string }) {
  // Build a reproducible barcode stripe matrix from the numeric string
  const stripes = useMemo(() => {
    const chars = value.split("");
    const matrix: boolean[] = [];
    // Start quiet zone
    matrix.push(true, false, true); // guard bars
    chars.forEach((c) => {
      const code = parseInt(c) || 3;
      // Generate some predictable patterns
      const pattern = [
        [true, true, false, false, true, false],
        [true, false, true, true, false, false],
        [true, false, false, true, true, false],
        [true, true, true, false, true, false],
        [false, true, true, false, false, true],
        [false, false, true, true, false, true],
        [false, true, false, true, true, true],
        [true, true, false, true, false, true],
        [true, false, true, true, true, false],
        [true, false, true, false, false, true]
      ];
      matrix.push(...pattern[code % 10]);
    });
    // Guard bars
    matrix.push(false, true, false, true);
    return matrix;
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex h-10 w-full max-w-[180px] bg-white items-stretch">
        {stripes.map((isBlack, i) => (
          <div
            key={i}
            className={`flex-1 ${isBlack ? "bg-black" : "bg-white"}`}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono tracking-widest text-gray-800 mt-1">
        {value}
      </span>
    </div>
  );
}

interface InventoryManagerProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function InventoryManager({ currentRole, currentUserName }: InventoryManagerProps) {
  const { mode } = useAppearance();
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [history, setHistory] = useState<InventoryHistory[]>(db.getInventoryHistory());
  const [activeTab, setActiveTab] = useState<"LIST" | "HISTORY" | "CATEGORIES">("LIST");

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [showLowStock, setShowLowStock] = useState<boolean>(false);

  // Form states
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formProduct, setFormProduct] = useState<Partial<Product>>({
    id: "",
    code: "",
    barCode: "",
    name: "",
    category: "Ropa",
    brand: "",
    model: "",
    color: "",
    size: "",
    description: "",
    supplier: "",
    costPrice: 0,
    sellPrice: 0,
    stock: 0,
    minStock: 5
  });

  // Security Auth states
  const [showAuthGate, setShowAuthGate] = useState<boolean>(false);
  const [authAction, setAuthAction] = useState<{ type: "DELETE" | "SAVE" | "ADJUST"; targetId: string; newStock?: number; reason?: string } | null>(null);
  const [adminPin, setAdminPin] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // Print Label states
  const [printableLabel, setPrintableLabel] = useState<Product | null>(null);
  const [labelSize, setLabelSize] = useState<"SMALL" | "SHOE" | "LARGE">("SMALL");
  const [labelDesign, setLabelDesign] = useState<"MODERN" | "CLASSIC" | "MINIMAL" | "BOLD">("MODERN");
  const [alignment, setAlignment] = useState<"LEFT" | "CENTER" | "RIGHT">("CENTER");
  const [quantity, setQuantity] = useState<number>(1);
  const [showOldPrice, setShowOldPrice] = useState<boolean>(true);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
  const [askForLabelsProduct, setAskForLabelsProduct] = useState<{ prodToSave: Product; isNew: boolean } | null>(null);
  const [isNoBarcode, setIsNoBarcode] = useState<boolean>(false);

  // Generate unique sequential code starting with JH-000001
  const generateJHCode = (): string => {
    let maxNum = 0;
    products.forEach(p => {
      if (p.code && p.code.startsWith("JH-")) {
        const numPart = p.code.substring(3);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `JH-${String(nextNum).padStart(6, '0')}`;
  };

  // Quick Adjustment states
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustValue, setAdjustValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("");

  const [allCategories, setAllCategories] = useState<ProductTypeCategory[]>(() => db.getCategories());
  const categories = useMemo(() => allCategories.map(c => c.name), [allCategories]);

  // States for dynamic category modal/creator
  const [showCategoryQuickAdd, setShowCategoryQuickAdd] = useState<boolean>(false);
  const [quickCatName, setQuickCatName] = useState<string>("");
  const [quickCatGroup, setQuickCatGroup] = useState<string>("MODA");

  const suppliers = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => { if (p.supplier) s.add(p.supplier); });
    return Array.from(s);
  }, [products]);

  // Autogenerate Code and Barcode based on current input parameters
  const handleAutogenerateBarcodes = () => {
    const catCode = formProduct.category ? formProduct.category.substring(0, 3).toUpperCase() : "GEN";
    const uniqueInt = Math.floor(100 + Math.random() * 900);
    const generatedCode = `U-${catCode}-${uniqueInt}`;
    
    // UPC / EAN13 lookup structured barcode
    const random12Dist = "770" + Math.floor(100000000 + Math.random() * 900000000).toString();
    
    setFormProduct(prev => ({
      ...prev,
      code: generatedCode,
      barCode: random12Dist
    }));
  };

  // Filtered Products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barCode.includes(searchQuery) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory ? p.category === selectedCategory : true;
      const matchSupplier = selectedSupplier ? p.supplier === selectedSupplier : true;
      const matchLowStock = showLowStock ? p.stock <= p.minStock : true;

      return matchQuery && matchCategory && matchSupplier && matchLowStock;
    });
  }, [products, searchQuery, selectedCategory, selectedSupplier, showLowStock]);

  const refreshData = () => {
    setProducts(db.getProducts());
    setHistory(db.getInventoryHistory());
    setAllCategories(db.getCategories());
  };

  // Guard sensitive actions
  const triggerAuthGate = (action: typeof authAction) => {
    if (currentRole === UserRole.ADMIN) {
      // Admin is already logged in, execute directly without secondary PIN box
      executeProtectedAction(action!);
    } else {
      // Prompt Vendedor for Administrator credentials
      setAuthAction(action);
      setAdminPin("");
      setAuthError("");
      setShowAuthGate(true);
    }
  };

  const handleAdminVerifyAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const isOK = db.verifyPIN(UserRole.ADMIN, adminPin);
    if (isOK) {
      setShowAuthGate(false);
      if (authAction) {
        executeProtectedAction(authAction);
      }
      setAuthAction(null);
    } else {
      setAuthError("Contraseña administrativa incorrecta.");
    }
  };

  const executeProtectedAction = (action: NonNullable<typeof authAction>) => {
    const reqName = currentRole === UserRole.ADMIN ? currentUserName : "Administrador (Autenticado por Vendedor)";
    const reqRole = UserRole.ADMIN;

    if (action.type === "DELETE") {
      db.deleteProduct(action.targetId, "Eliminación manual desde el inventario", reqName, reqRole);
    } else if (action.type === "ADJUST") {
      db.adjustStock(action.targetId, action.newStock!, action.reason || "Ajuste manual", reqName, reqRole);
    } else if (action.type === "SAVE") {
      try {
        // Save product logic
        const prodToSave = {
          ...formProduct,
          enterDate: formProduct.enterDate || new Date().toISOString().split("T")[0],
          costPrice: Number(formProduct.costPrice || 0),
          sellPrice: Number(formProduct.sellPrice || 0),
          stock: Number(formProduct.stock || 0),
          minStock: Number(formProduct.minStock || 0),
          taxType: formProduct.taxType || "GRAVADO",
          taxRate: formProduct.taxRate !== undefined ? Number(formProduct.taxRate) : 19
        } as Product;
        
        const originalProduct = products.find(p => p.id === prodToSave.id);
        const isPriceChanged = originalProduct && originalProduct.sellPrice !== prodToSave.sellPrice;

        db.saveProduct(prodToSave, reqName, reqRole, !isEditing);
        setShowForm(false);

        if (isPriceChanged) {
          setAskForLabelsProduct({ prodToSave, isNew: !isEditing });
        }
      } catch (err: any) {
        alert(err.message || "Error al guardar el producto.");
        return; // Retreave form focus instead of closing
      }
    }

    refreshData();
    setAdjustTarget(null);
  };

  const initEditProduct = (prod: Product) => {
    setIsEditing(true);
    setIsNoBarcode(prod.code ? prod.code.startsWith("JH-") : false);
    setFormProduct(prod);
    setShowForm(true);
  };

  const initNewProduct = () => {
    setIsEditing(false);
    setIsNoBarcode(false);
    
    // Auto-generate starting internal code and barcode!
    const uniqueInt = Math.floor(100 + Math.random() * 900);
    const generatedCode = `U-ROP-${uniqueInt}`;
    const random12Dist = "770" + Math.floor(100000000 + Math.random() * 900000000).toString();

    setFormProduct({
      id: "P" + Date.now(),
      code: generatedCode,
      barCode: random12Dist,
      name: "",
      category: "Ropa",
      brand: "",
      model: "",
      color: "",
      size: "",
      description: "",
      supplier: "",
      costPrice: 0,
      sellPrice: 0,
      stock: 0,
      minStock: 5,
      enterDate: new Date().toISOString().split("T")[0],
      taxType: "GRAVADO",
      taxRate: 19
    });
    setShowForm(true);
  };

  const handleFormSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerAuthGate({
      type: "SAVE",
      targetId: formProduct.id!
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    triggerAuthGate({
      type: "ADJUST",
      targetId: adjustTarget.id,
      newStock: adjustValue,
      reason: adjustReason || "Ajuste manual de control"
    });
  };

  const earnAmount = (formProduct.sellPrice || 0) - (formProduct.costPrice || 0);

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white/85 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Inventario de Productos</h2>
          <p className="text-xs text-gray-500 mt-1">
            Administración completa de prendas, zapatos, tallas, códigos de barra y registros históricos.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("LIST")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition ${
              activeTab === "LIST"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Inventario General
          </button>
          <button
            onClick={() => {
              setActiveTab("HISTORY");
              refreshData();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition ${
              activeTab === "HISTORY"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Ajustes
          </button>
          <button
            onClick={() => {
              setActiveTab("CATEGORIES");
              refreshData();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition ${
              activeTab === "CATEGORIES"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Categorías
          </button>
          <button
            onClick={initNewProduct}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {activeTab === "LIST" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className={`${
            mode === "LIQUID"
              ? "liquid-glass-card shadow-xs"
              : "bg-white border border-gray-200 shadow-2xs"
          } rounded-2xl p-5 space-y-4 h-fit`}>
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <SlidersHorizontal className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-bold text-gray-900">Buscador y Filtros</h3>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Buscar por Texto</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Nombre, código o marca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              >
                <option value="">Todas las Categorías</option>
                {categories.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Proveedor</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              >
                <option value="">Todos los Proveedores</option>
                {suppliers.map((s, i) => (
                  <option key={i} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowStock}
                  onChange={(e) => setShowLowStock(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-600 font-medium">Bajo Stock (≤ Mínimo)</span>
              </label>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-500 space-y-1.5 pt-4">
              <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">Resumen Actual</span>
              <div className="flex justify-between">
                <span>Productos tipo:</span>
                <span className="font-mono font-bold text-gray-800">{filteredProducts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Stock total:</span>
                <span className="font-mono font-bold text-gray-800">
                  {filteredProducts.reduce((acc, curr) => acc + curr.stock, 0)} uds
                </span>
              </div>
              <div className="flex justify-between">
                <span>Valoración Costo:</span>
                <span className="font-mono font-bold text-gray-800">
                  ${filteredProducts.reduce((acc, curr) => acc + (curr.costPrice * curr.stock), 0).toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          </div>

          {/* Main Products Grid */}
          <div className={`lg:col-span-3 ${
            mode === "LIQUID"
              ? "liquid-glass-card shadow-xs"
              : "bg-white border border-gray-200 shadow-2xs"
          } rounded-2xl overflow-hidden flex flex-col`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Código / Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-right">Precio Compra</th>
                    <th className="px-4 py-3 text-right">Precio Venta</th>
                    <th className="px-4 py-3 text-center">Talla/Color</th>
                    <th className="px-4 py-3 text-center">Disponible</th>
                    <th className="px-4 py-3 text-center">Mínimo</th>
                    <th className="px-4 py-3 text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        No se encontraron productos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stock <= p.minStock;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-gray-900">{p.name}</div>
                            <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400 mt-0.5">
                              <span>Ref: {p.code}</span>
                              <span>•</span>
                              <span>EAN: {p.barCode}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md font-medium text-[10px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-medium text-gray-500">
                            ${p.costPrice.toLocaleString("es-CO")}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                            ${p.sellPrice.toLocaleString("es-CO")}
                          </td>
                          <td className="px-4 py-3.5 text-center text-gray-600">
                            <span className="font-bold text-gray-800">{p.size}</span> / <span className="text-xs">{p.color}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                              isLow
                                ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                : "bg-green-50 text-green-700 ring-1 ring-green-200"
                            }`}>
                              {p.stock} uds
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-gray-400">
                            {p.minStock}
                          </td>
                          <td className="px-4 py-3.5 text-right pr-6 space-x-1.5">
                            <button
                              title="Reajustar Stock"
                              onClick={() => {
                                setAdjustTarget(p);
                                setAdjustValue(p.stock);
                                setAdjustReason("");
                              }}
                              className="text-gray-500 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Ver / Imprimir Códigos"
                              onClick={() => setPrintableLabel(p)}
                              className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Editar Producto"
                              onClick={() => initEditProduct(p)}
                              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Eliminar Producto"
                              onClick={() => {
                                if (confirm(`¿Está seguro de eliminar ${p.name}? En caso de ser vendedor, se solicitará autorización del administrador.`)) {
                                  triggerAuthGate({ type: "DELETE", targetId: p.id });
                                }
                              }}
                              className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "HISTORY" && (
        /* History of Adjustments View */
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-sm p-6 overflow-hidden">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-700" />
            Bitácora de Historial de Inventarios
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Tipo Movimiento</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3 text-center">Stock Anterior</th>
                  <th className="px-4 py-3 text-center">Stock Nuevo</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Motivo / Concepto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No hay registros archivados de movimientos.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => {
                    let typeBadgeClass = "";
                    switch (h.type) {
                      case "ENTRY":
                        typeBadgeClass = "bg-green-100 text-green-800";
                        break;
                      case "SALE":
                        typeBadgeClass = "bg-blue-100 text-blue-800";
                        break;
                      case "RETURN":
                        typeBadgeClass = "bg-purple-100 text-purple-800";
                        break;
                      case "ADJUSTMENT":
                        typeBadgeClass = "bg-amber-100 text-amber-800";
                        break;
                    }
                    return (
                      <tr key={h.id}>
                        <td className="px-4 py-3 date-cell">{h.date}</td>
                        <td className="px-4 py-3 font-semibold">{h.productName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${typeBadgeClass}`}>
                            {h.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold font-mono">
                          {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-gray-500">{h.previousStock}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-gray-900">{h.newStock}</td>
                        <td className="px-4 py-3 font-medium">{h.user}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{h.reason}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "CATEGORIES" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Form to create a new category */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Nueva Categoría de Producto
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!quickCatName.trim()) return;
              const catToSave: ProductTypeCategory = {
                name: quickCatName.trim(),
                group: quickCatGroup
              };
              db.saveCategory(catToSave, currentUserName, currentRole);
              setQuickCatName("");
              refreshData();
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Nombre de la Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Conjuntos, Splash, Joyería..."
                  value={quickCatName}
                  onChange={(e) => setQuickCatName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Grupo de Negocio *</label>
                <select
                  value={quickCatGroup}
                  onChange={(e) => setQuickCatGroup(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                >
                  <option value="MODA">MODA</option>
                  <option value="CALZADO">CALZADO</option>
                  <option value="ACCESORIOS">ACCESORIOS</option>
                  <option value="BELLEZA">BELLEZA</option>
                  <option value="FRAGANCIAS">FRAGANCIAS</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition shadow-sm"
              >
                Crear Categoría
              </button>
            </form>
            
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800 space-y-2">
              <span className="font-bold flex items-center gap-1">Tipos de Productos</span>
              <p className="text-indigo-600 leading-relaxed text-[11px]">
                Añadir categorías permite clasificar de forma óptima los productos de SMAJ, permitiendo filtros rápidos en el POS y optimización de facturación.
              </p>
            </div>
          </div>

          {/* List of categories grouped by group */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Categorías Configuradas</h3>
              <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                {allCategories.length} categorías en total
              </span>
            </div>

            {/* Render categories grouped */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["MODA", "CALZADO", "ACCESORIOS", "BELLEZA", "FRAGANCIAS", "OTRO"].map((currGroup) => {
                const groupCategories = allCategories.filter(c => c.group === currGroup);
                if (groupCategories.length === 0 && currGroup === "OTRO") return null;
                return (
                  <div key={currGroup} className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1 flex justify-between items-center">
                      <span>{currGroup}</span>
                      <span className="text-[10px] font-mono text-gray-400 font-normal">
                        ({groupCategories.length})
                      </span>
                    </h4>
                    
                    {groupCategories.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">No hay categorías registradas en este grupo.</p>
                    ) : (
                      <div className="space-y-1">
                        {groupCategories.map((cat) => {
                          const prodCount = products.filter(p => p.category === cat.name).length;
                          return (
                            <div key={cat.name} className="flex justify-between items-center text-xs py-1.5 px-2 bg-white border border-gray-100 rounded-lg hover:shadow-xs transition">
                              <span className="font-semibold text-gray-800">{cat.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                                  {prodCount} prods
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (prodCount > 0) {
                                      alert("No puedes eliminar esta categoría porque hay productos vinculados a ella.");
                                      return;
                                    }
                                    if (confirm(`¿Estás seguro de que deseas eliminar la categoría "${cat.name}"?`)) {
                                      db.deleteCategory(cat.name, currentUserName, currentRole);
                                      refreshData();
                                    }
                                  }}
                                  className="text-gray-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
                                  title="Eliminar Categoría"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{isEditing ? "Modificar Ficha de Producto" : "Registrar Nuevo Producto Urbano"}</h3>
                <p className="text-xs text-gray-400">SMAJ Urban Clothing - Sistema de Codificación</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={formProduct.name}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-xs font-semibold text-gray-500">Categoría *</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryQuickAdd(!showCategoryQuickAdd)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Añadir
                    </button>
                  </div>
                  {showCategoryQuickAdd ? (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2 animate-in slide-in-from-top duration-150">
                      <div className="text-[10px] font-bold text-gray-600">Crear Categoría al Vuelo</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nombre (ej: Crop Tops)"
                          value={quickCatName}
                          onChange={(e) => setQuickCatName(e.target.value)}
                          className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                        />
                        <select
                          value={quickCatGroup}
                          onChange={(e) => setQuickCatGroup(e.target.value)}
                          className="bg-white border border-gray-200 rounded px-2 py-1 text-[10px] focus:outline-none"
                        >
                          <option value="MODA">MODA</option>
                          <option value="CALZADO">CALZADO</option>
                          <option value="ACCESORIOS">ACCESORIOS</option>
                          <option value="BELLEZA">BELLEZA</option>
                          <option value="FRAGANCIAS">FRAGANCIAS</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCategoryQuickAdd(false);
                            setQuickCatName("");
                          }}
                          className="px-2 py-1 text-[10px] bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = quickCatName.trim();
                            if (!trimmed) return;
                            const newCatRec: ProductTypeCategory = {
                              name: trimmed,
                              group: quickCatGroup
                            };
                            db.saveCategory(newCatRec, currentUserName, currentRole);
                            // Refresh lists
                            const updatedCats = db.getCategories();
                            setAllCategories(updatedCats);
                            setFormProduct(prev => ({ ...prev, category: trimmed }));
                            setQuickCatName("");
                            setShowCategoryQuickAdd(false);
                          }}
                          className="px-2.5 py-1 text-[10px] bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 transition"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={formProduct.category}
                      onChange={(e) => setFormProduct(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                    >
                      {categories.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Proveedor</label>
                  <input
                    type="text"
                    value={formProduct.supplier || ""}
                    placeholder="Ej. Textiles Medellín"
                    onChange={(e) => setFormProduct(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Advanced Code Controls */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-150 space-y-3">
                {/* Toggle option for products without barcode */}
                <div className="bg-white border rounded-lg p-3 flex items-center justify-between shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-gray-800 block">Producto sin código de barras</span>
                    <span className="text-[10px] text-gray-400 block max-w-md">
                      Marque esta opción para generar un código y código de barras interno único secuencial de la casa (Ej. <strong>JH-000001</strong>).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isNoBarcode}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsNoBarcode(checked);
                      if (checked) {
                        const nextJH = generateJHCode();
                        setFormProduct(prev => ({
                          ...prev,
                          code: nextJH,
                          barCode: nextJH
                        }));
                      } else {
                        // Reset to generic code
                        const uniqueInt = Math.floor(100 + Math.random() * 900);
                        const generatedCode = `U-ROP-${uniqueInt}`;
                        const random12Dist = "770" + Math.floor(100000000 + Math.random() * 900000000).toString();
                        setFormProduct(prev => ({
                          ...prev,
                          code: generatedCode,
                          barCode: random12Dist
                        }));
                      }
                    }}
                    className="w-4.5 h-4.5 rounded text-indigo-650 accent-indigo-600 focus:ring-black"
                  />
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 space-y-3 w-full">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">
                          Código Interno * {isNoBarcode && "(Autogenerado)"}
                        </label>
                        <input
                          type="text"
                          required
                          disabled={isNoBarcode}
                          value={formProduct.code || ""}
                          onChange={(e) => setFormProduct(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Ej. U-ROP-105"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none disabled:bg-gray-105 disabled:text-gray-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">
                          Código de Barras (UPC/EAN) * {isNoBarcode && "(Interno JH)"}
                        </label>
                        <input
                          type="text"
                          required
                          disabled={isNoBarcode}
                          value={formProduct.barCode || ""}
                          onChange={(e) => setFormProduct(prev => ({ ...prev, barCode: e.target.value }))}
                          placeholder="770000000000"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none disabled:bg-gray-105 disabled:text-gray-500"
                        />
                      </div>
                    </div>
                    {!isNoBarcode && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={handleAutogenerateBarcodes}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                          Autogenerar Código Único y de Barras
                        </button>
                      </div>
                    )}
                  </div>

                  {formProduct.barCode && (
                    <div className="bg-white border p-3 rounded-lg flex items-center justify-center shrink-0 w-44">
                      <VisualBarcode value={formProduct.barCode} />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Marca</label>
                  <input
                    type="text"
                    value={formProduct.brand || ""}
                    placeholder="Ej. SMAJ"
                    onChange={(e) => setFormProduct(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Modelo</label>
                  <input
                    type="text"
                    value={formProduct.model || ""}
                    placeholder="Ej. Slim Street"
                    onChange={(e) => setFormProduct(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Color</label>
                  <input
                    type="text"
                    value={formProduct.color || ""}
                    placeholder="Ej. Camuflado"
                    onChange={(e) => setFormProduct(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Talla</label>
                  <input
                    type="text"
                    value={formProduct.size || ""}
                    placeholder="Ej. S, M, L, XL, 38, 40"
                    onChange={(e) => setFormProduct(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-amber-600">Precio Compra *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formProduct.costPrice || 0}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-emerald-600 font-bold">Precio Venta *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formProduct.sellPrice || 0}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, sellPrice: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-gray-500">Impuesto / IVA</label>
                  <select
                    value={formProduct.taxType || "GRAVADO"}
                    onChange={(e) => {
                      const val = e.target.value as "GRAVADO" | "EXCLUIDO";
                      setFormProduct(prev => ({
                        ...prev,
                        taxType: val,
                        taxRate: val === "EXCLUIDO" ? 0 : 19
                      }));
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none"
                  >
                    <option value="GRAVADO">GRAVADO (IVA)</option>
                    <option value="EXCLUIDO">EXCLUIDO (Exento)</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-gray-500">Tarifa de IVA %</label>
                  <select
                    value={formProduct.taxRate !== undefined ? formProduct.taxRate : 19}
                    disabled={formProduct.taxType === "EXCLUIDO"}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                    className="w-full bg-white disabled:bg-gray-100 disabled:text-gray-400 border border-gray-200 rounded-lg px-2 py-2 text-xs font-mono font-bold focus:outline-none"
                  >
                    <option value={19}>19% (General CO)</option>
                    <option value={5}>5% (Diferencial CO)</option>
                    <option value={0}>0% (Excluido CO)</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-gray-400">Ganancia Bruta</label>
                  <div className="bg-gray-100/70 border border-gray-200 rounded-lg px-2 py-2 text-sm font-mono font-bold text-gray-600 text-center">
                    ${earnAmount.toLocaleString("es-CO")}
                  </div>
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-gray-500">Existencia Inicial *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formProduct.stock || 0}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Stock Mínimo (Alerta de Agotados)</label>
                  <input
                    type="number"
                    min={1}
                    value={formProduct.minStock || 0}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Breve Descripción</label>
                  <input
                    type="text"
                    value={formProduct.description || ""}
                    placeholder="Detalles sobre textil, procedencia, etc."
                    onChange={(e) => setFormProduct(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold"
                >
                  {isEditing ? "Guardar Cambios" : "Guardar Producto en el Inventario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK REAJUST STOCK */}
      {adjustTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAdjustSubmit} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
              <span className="font-bold">Ajustes de Stock de Emergencia</span>
              <button type="button" onClick={() => setAdjustTarget(null)}>
                <X className="w-5 h-5 text-amber-200 hover:text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-600">
                Estás ajustando la cantidad física disponible de:
                <strong className="block text-gray-900 mt-1">{adjustTarget.name} ({adjustTarget.code})</strong>
              </p>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg text-xs text-center">
                <div>
                  <span className="text-gray-400 block">Stock Actual</span>
                  <span className="font-mono font-bold text-gray-700">{adjustTarget.stock} unidades</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Nuevo Stock</span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={adjustValue}
                    onChange={(e) => setAdjustValue(Number(e.target.value))}
                    className="w-16 text-center font-mono font-bold text-gray-900 bg-white border border-gray-300 rounded p-1"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Motivo del Ajuste *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Conteo físico de fin de mes, Mercancía dañada..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-gray-50 border rounded p-2 text-xs focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 text-white p-2.5 rounded-lg text-xs font-bold hover:bg-amber-700 transition"
              >
                Aplicar Ajuste de Cantidad
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PRINT BARCODE LABEL */}
      {printableLabel && (() => {
        // Find previous price from history to suggest old price
        let previousPrice = 0;
        if (printableLabel.priceHistory && printableLabel.priceHistory.length > 1) {
          const prior = printableLabel.priceHistory[printableLabel.priceHistory.length - 2];
          if (prior) previousPrice = prior.newPrice;
        }
        
        let discount = customDiscountPercent;
        if (discount <= 0 && previousPrice > printableLabel.sellPrice) {
          discount = Math.round(((previousPrice - printableLabel.sellPrice) / previousPrice) * 100);
        }
        
        const price = printableLabel.sellPrice;
        const oldPriceVal = previousPrice || (discount > 0 ? Math.round(printableLabel.sellPrice / (1 - discount / 100)) : 0);

        // Alignment classes
        const alignmentClass = alignment === "LEFT" ? "text-left items-start" : alignment === "RIGHT" ? "text-right items-end" : "text-center items-center";

        // Design style classes
        let cardStyle = "border border-gray-200 bg-linear-to-b from-white to-gray-50/50 p-5 font-sans text-gray-900 rounded-2xl shadow-sm";
        let headerStyle = "pb-2 mb-1.5 w-full flex flex-col items-center";
        let brandStyle = "font-extrabold text-[11px] tracking-widest text-gray-900 uppercase font-sans";
        let titleStyle = "text-xs font-bold text-gray-950 leading-tight tracking-tight";
        let badgeStyle = "bg-gray-950 text-white text-[8px] px-2 py-0.5 rounded-full font-bold uppercase";
        let priceStyle = "text-lg font-extrabold text-gray-900 tracking-tight";

        if (labelDesign === "MINIMAL") {
          cardStyle = "border border-gray-400 bg-white p-4 font-sans text-gray-900 rounded-none";
          headerStyle = "text-xs font-mono uppercase tracking-widest text-gray-500 border-b border-gray-250 pb-1.5 mb-2 w-full";
          brandStyle = "font-bold text-[9px] tracking-wide text-gray-800";
          titleStyle = "text-[11px] font-light tracking-tight text-gray-950 leading-tight";
          badgeStyle = "bg-gray-100 text-gray-800 text-[8px] px-1.5 py-0.5 font-mono uppercase";
          priceStyle = "text-base font-mono text-gray-950 font-bold";
        } else if (labelDesign === "CLASSIC") {
          cardStyle = "border-4 border-gray-900 bg-white p-5 font-serif text-gray-950 rounded-xl shadow-xs";
          headerStyle = "border-b-2 border-gray-900 pb-2 mb-2 w-full text-center";
          brandStyle = "font-extrabold text-[11px] tracking-wider text-gray-950 uppercase";
          titleStyle = "text-xs font-bold text-gray-950 leading-snug";
          badgeStyle = "border border-gray-950 text-gray-950 text-[9px] px-2 py-0.5 uppercase tracking-wider font-semibold";
          priceStyle = "text-base font-black text-gray-950";
        } else if (labelDesign === "BOLD") {
          cardStyle = "border border-black bg-gray-955 p-6 font-mono text-white rounded-2xl shadow-md";
          headerStyle = "border-b border-gray-800 pb-2.5 mb-3 w-full";
          brandStyle = "font-black text-[10px] tracking-widest text-indigo-400 uppercase";
          titleStyle = "text-[11px] font-semibold tracking-wide text-white leading-tight uppercase";
          badgeStyle = "bg-indigo-900/50 text-indigo-200 border border-indigo-700 text-[8px] px-2 py-0.5 rounded-md uppercase";
          priceStyle = "text-lg font-black text-indigo-400";
        }

        const handlePrinterAction = () => {
          const printContents = document.getElementById("barcode-sticker-print")?.innerHTML;
          if (!printContents) return;
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>Imprimir Etiquetas SMAJ</title>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                    body { font-family: 'Inter', sans-serif; background: white; color: black; padding: 10px; margin: 0; }
                    @media print {
                      body { padding: 0; margin: 0; }
                      .print-page { page-break-after: always; display: flex !important; align-items: center; justify-content: center; width: 100%; height: 100%; }
                    }
                  </style>
                </head>
                <body onload="window.print(); window.close();">
                  <div class="flex flex-col gap-6 items-center">
                    \${Array.from({ length: quantity }).map(() => \`
                      <div class="print-page border border-dashed border-gray-300 p-6 rounded-lg bg-white" style="width: \${
                        labelSize === "SMALL" ? "240px" : labelSize === "SHOE" ? "320px" : "400px"
                      }; min-height: \${
                        labelSize === "SMALL" ? "180px" : labelSize === "SHOE" ? "220px" : "300px"
                      }">
                        \${printContents}
                      </div>
                    \`).join("")}
                  </div>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
          setPrintableLabel(null);
        };

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col md:flex-row max-h-[90vh]">
              
              {/* Left Settings Panel */}
              <div className="p-5 md:w-1/2 border-r border-gray-100 space-y-4 overflow-y-auto w-full">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-gray-900 uppercase tracking-wider font-sans">Ajustar Ticket de Etiqueta</span>
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono">REF: {printableLabel.code}</span>
                </div>

                {/* labelSize */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 block uppercase">Formato</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(["SMALL", "SHOE", "LARGE"] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setLabelSize(sz)}
                        className={`py-1 rounded-md text-[10px] font-bold ${
                          labelSize === sz ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-205"
                        }`}
                      >
                        {sz === "SMALL" ? "Prenda" : sz === "SHOE" ? "Zapato" : "Grande"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* labelDesign */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 block uppercase">Diseño estético</span>
                  <div className="grid grid-cols-4 gap-1">
                    {(["MODERN", "CLASSIC", "MINIMAL", "BOLD"] as const).map((ds) => (
                      <button
                        key={ds}
                        type="button"
                        onClick={() => setLabelDesign(ds)}
                        className={`py-1 rounded-md text-[9px] font-bold ${
                          labelDesign === ds ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-250 text-gray-600"
                        }`}
                      >
                        {ds}
                      </button>
                    ))}
                  </div>
                </div>

                {/* alignment */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 block uppercase">Alineación</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(["LEFT", "CENTER", "RIGHT"] as const).map((al) => (
                      <button
                        key={al}
                        type="button"
                        onClick={() => setAlignment(al)}
                        className={`py-1 rounded-md text-[10px] font-bold ${
                          alignment === al ? "bg-gray-900 text-white" : "bg-gray-105 hover:bg-gray-200 text-gray-600"
                        }`}
                      >
                        {al === "LEFT" ? "Izq" : al === "CENTER" ? "Centro" : "Der"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 block uppercase">Cantidad de Copias</span>
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border text-gray-700 rounded-lg flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm w-12 text-center text-gray-805">{quantity} copias</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-7 h-7 bg-white hover:bg-gray-100 border text-gray-700 rounded-lg flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                  {printableLabel.stock > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuantity(printableLabel.stock)}
                      className="w-full mt-2 text-[10px] text-indigo-650 hover:text-indigo-805 font-bold text-left block focus:outline-none"
                    >
                      💡 Copias iguales al inventario actual ({printableLabel.stock} unidades)
                    </button>
                  )}
                </div>

                {/* Old Price Toggles */}
                <div className="space-y-2 border-t pt-3 mt-2">
                  <div className="flex justify-between items-center text-xs text-gray-700">
                    <span className="font-bold">Mostrar Precio Anterior</span>
                    <input
                      type="checkbox"
                      checked={showOldPrice}
                      onChange={(e) => setShowOldPrice(e.target.checked)}
                      className="accent-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                      <span>Descuento Manual:</span>
                      <strong className="text-gray-900">{customDiscountPercent}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={customDiscountPercent}
                      onChange={(e) => setCustomDiscountPercent(Number(e.target.value))}
                      className="w-full accent-black h-1 bg-gray-100 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Right Preview Panel */}
              <div className="p-5 md:w-1/2 bg-gray-50 flex flex-col justify-between overflow-y-auto">
                <div className="flex justify-between items-center pb-2 mb-3 border-b">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">Vista Previa Real</span>
                  <button onClick={() => setPrintableLabel(null)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-650" />
                  </button>
                </div>

                {/* Interactive ticket */}
                <div className="flex-1 flex items-center justify-center py-4">
                  <div 
                    id="barcode-sticker-print" 
                    className={`${cardStyle} ${alignmentClass} w-full max-w-[245px] shadow-sm`}
                  >
                    <div className={headerStyle}>
                      <span className={brandStyle}>SMAJ URBAN CLOTHING</span>
                      <span className="text-[7px] font-mono tracking-widest block text-gray-400 mt-0.5 uppercase tracking-widest">ESTILO STREETWEAR PREMIUM</span>
                    </div>

                    <div className="space-y-1 w-full">
                      <div className={titleStyle}>{printableLabel.name}</div>
                      <div className="flex gap-1 justify-center flex-wrap pt-0.5">
                        <span className={badgeStyle}>TALLA: {printableLabel.size || "ÚNICA"}</span>
                        {printableLabel.color && (
                          <span className={`${badgeStyle} bg-gray-150 text-gray-700`}>{printableLabel.color}</span>
                        )}
                      </div>
                    </div>

                    <div className="py-2.5 w-full flex flex-col items-center">
                      <div className="bg-white p-1 rounded border border-gray-150">
                        <VisualBarcode value={printableLabel.barCode} />
                      </div>
                      <span className="text-[8px] font-mono tracking-wider text-gray-400 block mt-1">Ref: {printableLabel.code}</span>
                    </div>

                    <div className="w-full border-t border-dashed pt-2 mt-1">
                      {showOldPrice && oldPriceVal > price && (
                        <div className="flex justify-center items-center gap-1.5 text-[9px] mb-0.5">
                          <span className="text-gray-400 line-through">${oldPriceVal.toLocaleString()}</span>
                          {discount > 0 && <span className="bg-red-100 text-red-800 font-bold px-1 rounded">-{discount}%</span>}
                        </div>
                      )}
                      <div>
                        <span className="text-[8px] tracking-wider font-mono text-gray-400 uppercase block leading-none mb-1">Precio Final</span>
                        <span className={priceStyle}>${price.toLocaleString()} COP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 space-y-2">
                  <button
                    type="button"
                    onClick={handlePrinterAction}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    <Printer className="w-4 h-4" />
                    Mandar a Impresora ({quantity} Copias)
                  </button>
                  <button
                    onClick={() => setPrintableLabel(null)}
                    type="button"
                    className="w-full bg-white border text-gray-650 font-semibold py-1.5 rounded-lg text-xs hover:bg-gray-100 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: PRICE CHANGE PROMPT */}
      {askForLabelsProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 border border-gray-150">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="bg-indigo-50 p-2.5 rounded-xl">
                <Barcode className="w-6 h-6 text-indigo-650" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cambio de Precio Detectado</h3>
                <h4 className="text-sm font-black text-gray-950 tracking-tight">¿Desea generar nuevas etiquetas?</h4>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              Hemos registrado el cambio de precio de <strong className="text-gray-900">"{askForLabelsProduct.prodToSave.name}"</strong> en el sistema con éxito.
            </p>

            <div className="bg-gray-50 rounded-xl p-3 text-xs flex justify-between font-mono border">
              <div>
                <span className="text-gray-400 block text-[9px] uppercase">Código</span>
                <span className="font-semibold text-gray-800">{askForLabelsProduct.prodToSave.code}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[9px] uppercase">Nuevo Precio</span>
                <span className="font-bold text-indigo-600">${askForLabelsProduct.prodToSave.sellPrice.toLocaleString()} COP</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const productToPrint = askForLabelsProduct.prodToSave;
                  setAskForLabelsProduct(null);
                  setPrintableLabel(productToPrint); // Triggers advanced label print dialog immediately!
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition"
              >
                Sí, imprimir nuevas etiquetas
              </button>
              <button
                type="button"
                onClick={() => {
                  setAskForLabelsProduct(null);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 px-4 rounded-xl transition"
              >
                No, solamente actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SECURITY AUTH REQUIRED GATE */}
      {showAuthGate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h4 className="font-bold text-gray-900">Requiere Autorización Admin</h4>
              <p className="text-xs text-gray-500 mt-1">
                Para realizar esta modificación de inventario / precios debe validar el PIN del Administrador.
              </p>
            </div>

            <form onSubmit={handleAdminVerifyAuth} className="space-y-4">
              <input
                type="password"
                required
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="PIN Administrativo"
                className="w-full text-center font-mono tracking-widest text-lg bg-gray-50 border rounded-lg p-2 focus:bg-white focus:outline-none"
              />

              {authError && <p className="text-red-600 text-xs text-center font-semibold">{authError}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthGate(false);
                    setAuthAction(null);
                  }}
                  className="flex-1 bg-gray-100 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-700"
                >
                  Autorizar Operación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

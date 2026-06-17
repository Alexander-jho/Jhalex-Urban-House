/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { db } from "../db";
import { Product, UserRole, InventoryHistory } from "../types";
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
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [history, setHistory] = useState<InventoryHistory[]>(db.getInventoryHistory());
  const [activeTab, setActiveTab] = useState<"LIST" | "HISTORY">("LIST");

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

  // Quick Adjustment states
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustValue, setAdjustValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("");

  const categories = ["Ropa", "Zapatos", "Accesorios", "Lociones", "Bolsos"];

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
      // Save product logic
      const prodToSave = {
        ...formProduct,
        enterDate: formProduct.enterDate || new Date().toISOString().split("T")[0],
        costPrice: Number(formProduct.costPrice || 0),
        sellPrice: Number(formProduct.sellPrice || 0),
        stock: Number(formProduct.stock || 0),
        minStock: Number(formProduct.minStock || 0)
      } as Product;
      
      db.saveProduct(prodToSave, reqName, reqRole, !isEditing);
      setShowForm(false);
    }

    refreshData();
    setAdjustTarget(null);
  };

  const initEditProduct = (prod: Product) => {
    setIsEditing(true);
    setFormProduct(prod);
    setShowForm(true);
  };

  const initNewProduct = () => {
    setIsEditing(false);
    setFormProduct({
      id: "P" + Date.now(),
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
      minStock: 5,
      enterDate: new Date().toISOString().split("T")[0]
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
            onClick={initNewProduct}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {activeTab === "LIST" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
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
          <div className="lg:col-span-3 bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
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
      ) : (
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

      {/* MODAL: ADD/EDIT FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{isEditing ? "Modificar Ficha de Producto" : "Registrar Nuevo Producto Urbano"}</h3>
                <p className="text-xs text-gray-400">Jhalex Urban House Pro - Sistema de Codificación</p>
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
                  <label className="text-xs font-semibold text-gray-500">Categoría *</label>
                  <select
                    value={formProduct.category}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
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
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 space-y-3 w-full">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Código Interno *</label>
                      <input
                        type="text"
                        required
                        value={formProduct.code}
                        onChange={(e) => setFormProduct(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="Ej. U-ROP-105"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Código de Barras (UPC/EAN) *</label>
                      <input
                        type="text"
                        required
                        value={formProduct.barCode}
                        onChange={(e) => setFormProduct(prev => ({ ...prev, barCode: e.target.value }))}
                        placeholder="770000000000"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>
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
                </div>

                {formProduct.barCode && (
                  <div className="bg-white border p-3 rounded-lg flex items-center justify-center shrink-0 w-44">
                    <VisualBarcode value={formProduct.barCode} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Marca</label>
                  <input
                    type="text"
                    value={formProduct.brand || ""}
                    placeholder="Ej. JHALEX"
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-amber-600">Precio de Compra (Costo) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formProduct.costPrice || 0}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-emerald-600 font-bold">Precio de Venta *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formProduct.sellPrice || 0}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, sellPrice: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-gray-400">Ganancia Estimada</label>
                  <div className="bg-gray-100/70 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono font-bold text-gray-600">
                    ${earnAmount.toLocaleString("es-CO")}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Cantidad Inicial *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formProduct.stock || 0}
                    onChange={(e) => setFormProduct(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
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
      {printableLabel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gray-100 p-4 border-b flex items-center justify-between">
              <span className="font-bold text-xs text-gray-700 font-mono">Etiqueta de Código de Barras</span>
              <button onClick={() => setPrintableLabel(null)}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <div id="barcode-sticker-print" className="border-2 border-dashed border-gray-300 p-6 rounded-xl space-y-3 bg-white">
                <div className="text-sm font-bold uppercase tracking-wider text-gray-900">JHALEX URBAN HOUSE</div>
                <div className="text-xs text-gray-600 truncate px-2">{printableLabel.name}</div>
                
                <div className="py-2 flex justify-center">
                  <VisualBarcode value={printableLabel.barCode} />
                </div>

                <div className="flex justify-around text-xs border-t pt-2 font-mono">
                  <div>
                    <span className="text-gray-400 block text-[9px]">TALLA</span>
                    <span className="font-bold">{printableLabel.size || "S/T"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px]">REF</span>
                    <span className="font-bold">{printableLabel.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px]">PRECIO</span>
                    <span className="font-bold text-indigo-700">${printableLabel.sellPrice.toLocaleString("es-CO")}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById("barcode-sticker-print")?.innerHTML;
                    const originalContents = document.body.innerHTML;
                    
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Etiqueta Jhalex</title>
                            <style>
                              body { font-family: sans-serif; text-align: center; padding: 20px; }
                              .print-sticker { border: 1px solid #ccc; padding: 20px; max-width: 250px; margin: 0 auto; display: inline-block; border-radius: 8px; }
                              .barcode-stripe { width: 1px; height: 40px; background: black; display: inline-block; }
                            </style>
                          </head>
                          <body>
                            <div class="print-sticker">${printContents}</div>
                            <script>window.print();</script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    } else {
                      window.print();
                    }
                  }}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Etiqueta
                </button>
                <button
                  onClick={() => {
                    alert("Etiqueta guardada en cola local de simulación de lote.");
                    setPrintableLabel(null);
                  }}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Guardar
                </button>
              </div>
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

import React, { useState, useMemo } from "react";
import { UserRole, Supplier, Purchase, Product } from "../types";
import { db } from "../db";
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Search,
  ShoppingCart,
  Briefcase,
  FileSpreadsheet,
  FilePlus,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  Building,
  CheckCircle,
  HelpCircle,
  Eye,
  Hash
} from "lucide-react";

interface ProveedoresComprasProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function ProveedoresCompras({ currentRole, currentUserName }: ProveedoresComprasProps) {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"PROVEEDORES" | "COMPRAS">("PROVEEDORES");

  // Suppliers States
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => db.getProveedores());
  const [searchSupplier, setSearchSupplier] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Supplier Form Values
  const [supForm, setSupForm] = useState<Partial<Supplier>>({
    name: "",
    nit: "",
    contactName: "",
    phone: "",
    email: "",
    address: ""
  });

  // Purchases States
  const [purchases, setPurchases] = useState<Purchase[]>(() => db.getPurchases());
  const [searchPurchase, setSearchPurchase] = useState("");
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<Purchase | null>(null);

  // New Purchase Form values
  const [pSupId, setPSupId] = useState("");
  const [pInvoiceNum, setPInvoiceNum] = useState("");
  const [pNotes, setPNotes] = useState("");
  const [pItems, setPItems] = useState<{ productId: string; productName: string; costPrice: number; quantity: number }[]>([]);

  // Item Selector states (for additions inside purchase)
  const [selectedProdId, setSelectedProdId] = useState("");
  const [itemCost, setItemCost] = useState(0);
  const [itemQty, setItemQty] = useState(1);
  const [itemSearch, setItemSearch] = useState("");

  const products = useMemo(() => db.getProducts(), []);

  // Filtered Products for select dropdown
  const filteredProductsSelect = useMemo(() => {
    if (!itemSearch) return products.slice(0, 10);
    return products.filter(p =>
      p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
      p.barCode.includes(itemSearch)
    ).slice(0, 15);
  }, [products, itemSearch]);

  // Sync utilities
  const refreshSuppliers = () => {
    setSuppliers(db.getProveedores());
  };

  const refreshPurchases = () => {
    setPurchases(db.getPurchases());
  };

  // ----------------------------------------------------
  // SUPPLIER ACTIONS
  // ----------------------------------------------------
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupForm({
      name: "",
      nit: "",
      contactName: "",
      phone: "",
      email: "",
      address: ""
    });
    setShowSupplierForm(true);
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupForm(supplier);
    setShowSupplierForm(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supForm.name || !supForm.nit) {
      alert("Por favor ingrese el Nombre de la Empresa y la Identificación Tributaria (NIT).");
      return;
    }

    const supplierToSave: Supplier = {
      id: editingSupplier ? editingSupplier.id : "S_" + Date.now(),
      name: supForm.name.trim(),
      nit: supForm.nit.trim(),
      contactName: (supForm.contactName || "").trim(),
      phone: (supForm.phone || "").trim(),
      email: (supForm.email || "").trim(),
      address: (supForm.address || "").trim(),
      suppliedProductsCount: editingSupplier ? editingSupplier.suppliedProductsCount : 0
    };

    db.saveProveedor(supplierToSave, currentUserName, currentRole);
    refreshSuppliers();
    setShowSupplierForm(false);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (confirm(`¿Está seguro de eliminar el proveedor "${name}"? Esta acción se registrará en la auditoría.`)) {
      const success = db.deleteProveedor(id, currentUserName, currentRole);
      if (success) {
        refreshSuppliers();
      } else {
        alert("Ocurrió un error al eliminar el proveedor.");
      }
    }
  };

  // Filtered Suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(searchSupplier.toLowerCase()) ||
      s.nit.includes(searchSupplier) ||
      s.contactName.toLowerCase().includes(searchSupplier.toLowerCase())
    );
  }, [suppliers, searchSupplier]);

  // ----------------------------------------------------
  // PURCHASE ACTIONS
  // ----------------------------------------------------
  const handleAddItemToPurchase = () => {
    if (!selectedProdId) {
      alert("Por favor seleccione un artículo del listado.");
      return;
    }
    const targetProduct = products.find(p => p.id === selectedProdId);
    if (!targetProduct) return;

    if (itemQty < 1) {
      alert("La cantidad debe ser mínimo 1.");
      return;
    }

    // Check if product already exists in item stack
    const exists = pItems.some(item => item.productId === selectedProdId);
    if (exists) {
      alert("Este artículo ya está añadido en la compra actual. Puede eliminarlo e ingresarlo nuevamente.");
      return;
    }

    setPItems(prev => [
      ...prev,
      {
        productId: targetProduct.id,
        productName: targetProduct.name + " (" + targetProduct.code + ")",
        costPrice: itemCost > 0 ? itemCost : targetProduct.costPrice,
        quantity: itemQty
      }
    ]);

    // Reset item input
    setSelectedProdId("");
    setItemCost(0);
    setItemQty(1);
    setItemSearch("");
  };

  const handleRemoveItemFromPurchase = (index: number) => {
    setPItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pSupId) {
      alert("Por favor seleccione el Proveedor.");
      return;
    }
    if (!pInvoiceNum.trim()) {
      alert("Por favor ingrese el número o ID de Factura / Soporte de compra.");
      return;
    }
    if (pItems.length === 0) {
      alert("Debe agregar al menos un artículo para poder consolidar el ingreso.");
      return;
    }

    const supplierRef = suppliers.find(s => s.id === pSupId);
    if (!supplierRef) {
      alert("Proveedor inválido.");
      return;
    }

    const calculatedTotal = pItems.reduce((acc, current) => acc + (current.costPrice * current.quantity), 0);

    const purchaseToSave: Purchase = {
      id: "PUR_" + Date.now(),
      purchaseNumber: pInvoiceNum.trim(),
      supplierId: supplierRef.id,
      supplierName: supplierRef.name,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("es-CO", { hour12: false }),
      items: pItems.map(item => ({
        ...item,
        total: item.costPrice * item.quantity
      })),
      total: calculatedTotal,
      user: currentUserName,
      notes: pNotes.trim()
    };

    // Save purchase & auto-update inventories & audit log
    db.savePurchase(purchaseToSave, currentUserName, currentRole);
    
    // Increment supplier products count implicitly
    const updatedSupplier = {
      ...supplierRef,
      suppliedProductsCount: supplierRef.suppliedProductsCount + pItems.length
    };
    db.saveProveedor(updatedSupplier, currentUserName, currentRole);

    // Refresh states
    refreshPurchases();
    refreshSuppliers();
    setShowPurchaseForm(false);

    // Reset form
    setPInvoiceNum("");
    setPSupId("");
    setPNotes("");
    setPItems([]);

    alert("¡Ingreso exitoso! Los artículos correspondientes han sido añadidos al stock.");
  };

  const totalCalculatedInvoice = useMemo(() => {
    return pItems.reduce((acc, current) => acc + (current.costPrice * current.quantity), 0);
  }, [pItems]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p =>
      p.purchaseNumber.toLowerCase().includes(searchPurchase.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchPurchase.toLowerCase())
    );
  }, [purchases, searchPurchase]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white border text-gray-805 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Building className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-gray-950 uppercase">Terceros: Proveedores & Compras</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestione su pool de fabricantes, ingrese mercancías con precio de costo y actualice el inventario automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveSubTab("PROVEEDORES")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${
              activeSubTab === "PROVEEDORES" ? "bg-white text-gray-950 shadow-2xs" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Proveedores
          </button>
          <button
            onClick={() => setActiveSubTab("COMPRAS")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${
              activeSubTab === "COMPRAS" ? "bg-white text-gray-950 shadow-2xs" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Historial de Compras ({purchases.length})
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------------- */}
      {/* 1. VIEW: SUPPLIERS */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeSubTab === "PROVEEDORES" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por NIT, Nombre o Razón Social..."
                value={searchSupplier}
                onChange={(e) => setSearchSupplier(e.target.value)}
                className="w-full bg-white border border-gray-250 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <button
              onClick={handleOpenAddSupplier}
              className="inline-flex items-center gap-1.5 bg-gray-950 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </button>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 border-b font-extrabold uppercase tracking-wide">
                    <th className="p-3.5 pl-5">Razón Social</th>
                    <th className="p-3.5">NIT</th>
                    <th className="p-3.5">Contacto / Gestor</th>
                    <th className="p-3.5">Teléfono / Email</th>
                    <th className="p-3.5">Dirección Física</th>
                    <th className="p-3.5 text-center">Prod. Abastecidos</th>
                    <th className="p-3.5 text-right pr-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        Noy hay proveedores que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-gray-50/55 transition text-gray-700">
                        <td className="p-3.5 pl-5 font-bold text-gray-900">{sup.name}</td>
                        <td className="p-3.5 font-mono">{sup.nit}</td>
                        <td className="p-3.5 font-medium">{sup.contactName || "N/A"}</td>
                        <td className="p-3.5 space-y-0.5">
                          <p className="font-semibold text-gray-900">{sup.phone || "N/A"}</p>
                          <p className="text-[10px] text-gray-400">{sup.email || ""}</p>
                        </td>
                        <td className="p-3.5 text-gray-500 truncate max-w-xs">{sup.address || "N/A"}</td>
                        <td className="p-3.5 text-center">
                          <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {sup.suppliedProductsCount} refs
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-5 whitespace-nowrap">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleOpenEditSupplier(sup)}
                              className="p-1 text-gray-400 hover:text-gray-900 transition"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                              className="p-1 text-gray-400 hover:text-red-600 transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* 2. VIEW: PURCHASES HISTORIC */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeSubTab === "COMPRAS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por Factura o Proveedor..."
                value={searchPurchase}
                onChange={(e) => setSearchPurchase(e.target.value)}
                className="w-full bg-white border border-gray-250 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <button
              onClick={() => setShowPurchaseForm(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-750 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ShoppingCart className="w-4 h-4" />
              Registrar Compra de Mercancía
            </button>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 border-b font-extrabold uppercase tracking-wide">
                    <th className="p-3.5 pl-5">N° Soporte/Factura</th>
                    <th className="p-3.5">Proveedor</th>
                    <th className="p-3.5">Fecha / Hora</th>
                    <th className="p-3.5 text-center">Ítems Ingresados</th>
                    <th className="p-3.5 text-right">Monto Total Coste</th>
                    <th className="p-3.5 text-center">Ingresado por</th>
                    <th className="p-3.5 text-center pr-5">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        No hay registros de compras registrados todavía.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((pur) => (
                      <tr key={pur.id} className="hover:bg-gray-50/55 transition">
                        <td className="p-3.5 pl-5 font-bold text-gray-900 font-mono">#{pur.purchaseNumber}</td>
                        <td className="p-3.5 font-semibold text-gray-900">{pur.supplierName}</td>
                        <td className="p-3.5 space-y-0.5">
                          <p className="font-mono text-gray-800">{pur.date}</p>
                          <p className="text-[10px] text-gray-400">{pur.time}</p>
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          {pur.items.reduce((acc, curr) => acc + curr.quantity, 0)} unidades
                        </td>
                        <td className="p-3.5 text-right font-black text-gray-950 font-mono">
                          ${pur.total.toLocaleString("es-CO")}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                            {pur.user}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            onClick={() => setSelectedPurchaseDetails(pur)}
                            className="bg-gray-50 hover:bg-gray-150 p-1.5 rounded text-gray-600 hover:text-black transition inline-flex items-center"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* MODAL: SUPPLIER ADD / EDIT */}
      {/* -------------------------------------------------------------------------------------- */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveSupplier} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-gray-950 text-white p-4 flex items-center justify-between">
              <span className="font-bold text-sm">
                {editingSupplier ? `Editar Proveedor: ${editingSupplier.name}` : "Registrar Nuevo Proveedor"}
              </span>
              <button type="button" onClick={() => setShowSupplierForm(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={supForm.name || ""}
                    onChange={(e) => setSupForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej. Distribuidora SMAJ Mayorista"
                    className="w-full bg-white border border-gray-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Identificación Tributaria / NIT / CC *</label>
                  <input
                    type="text"
                    required
                    value={supForm.nit || ""}
                    onChange={(e) => setSupForm(prev => ({ ...prev, nit: e.target.value }))}
                    placeholder="Ej. 900.123.456-1"
                    className="w-full bg-white border border-gray-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Contacto Administrativo</label>
                  <input
                    type="text"
                    value={supForm.contactName || ""}
                    onChange={(e) => setSupForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Ej. Alberto Pérez"
                    className="w-full bg-white border border-gray-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Teléfono de Soporte</label>
                  <input
                    type="text"
                    value={supForm.phone || ""}
                    onChange={(e) => setSupForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Ej. 3154567890"
                    className="w-full bg-white border border-gray-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    value={supForm.email || ""}
                    onChange={(e) => setSupForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Ej. ventas@smajmayorista.com"
                    className="w-full bg-white border border-gray-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Dirección de Despacho</label>
                  <input
                    type="text"
                    value={supForm.address || ""}
                    onChange={(e) => setSupForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Ej. Calle de la Moda #45-12, Medellín"
                    className="w-full bg-white border border-gray-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setShowSupplierForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-gray-950 hover:bg-black text-white px-5 py-2 rounded-lg text-xs font-bold"
              >
                Gurdar Tercero
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* MODAL: REGISTER NEW PURCHASE (BILLING ENTRY) */}
      {/* -------------------------------------------------------------------------------------- */}
      {showPurchaseForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSavePurchase} className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-indigo-650 bg-indigo-700 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-300" />
                <span className="font-extrabold text-sm tracking-tight">REGISTRAR ENTRADA DE MERCANCÍA / COMPRA DE LOTE</span>
              </div>
              <button type="button" onClick={() => setShowPurchaseForm(false)} className="text-indigo-200 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Core billing headers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Proveedor Adjudicado *</label>
                  <select
                    required
                    value={pSupId}
                    onChange={(e) => setPSupId(e.target.value)}
                    className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="">-- Seleccione Proveedor --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (NIT: {s.nit})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Factura de Soporte / N° de Compra *</label>
                  <input
                    type="text"
                    required
                    value={pInvoiceNum}
                    onChange={(e) => setPInvoiceNum(e.target.value)}
                    placeholder="Ej. FAC-2026-99"
                    className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase font-mono">Notas o Comentarios Generales</label>
                  <input
                    type="text"
                    value={pNotes}
                    onChange={(e) => setPNotes(e.target.value)}
                    placeholder="Ej. Cobertura Colección Invierno, descuento especial 12%"
                    className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Add articles component */}
              <div className="border border-gray-150 rounded-2xl p-4 bg-white space-y-4 shadow-3xs">
                <h4 className="font-extrabold text-gray-900 border-b pb-1.5 flex items-center gap-1">
                  <Layers className="w-4 h-4 text-indigo-650" />
                  AGREGAR PRODUCTORES AL DETALLE
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* search selector */}
                  <div className="md:col-span-5 space-y-1 relative">
                    <label className="text-[10px] font-bold text-gray-550 block">Seleccione Producto / SKU Reference</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Escriba Filtro (nombre, marca, código...)"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                      />
                      {itemSearch && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto divide-y">
                          {filteredProductsSelect.length === 0 ? (
                            <div className="p-2 text-gray-400 text-center">No hay coincidencias</div>
                          ) : (
                            filteredProductsSelect.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProdId(p.id);
                                  setItemCost(p.costPrice);
                                  setItemSearch(p.name + " (" + p.code + ")");
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-55 text-xs block ${
                                  selectedProdId === p.id ? "bg-indigo-50 font-bold" : ""
                                }`}
                              >
                                <div className="font-bold text-gray-900">{p.name}</div>
                                <div className="text-[10px] text-gray-400">Código: {p.code} | Coste Actual: ${p.costPrice.toLocaleString("es-CO")}</div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* cost */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-gray-55block">Costo Unitario Facturado ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={itemCost}
                      onChange={(e) => setItemCost(Number(e.target.value))}
                      className="w-full bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  {/* quantity */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-gray-55block">Cantidad Comprada</label>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      className="w-full bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none text-center font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItemToPurchase}
                      className="w-full bg-gray-950 hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-3xs max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 border-b uppercase font-bold text-[10px]">
                      <th className="p-2.5 pl-4">Descripción del Ítem</th>
                      <th className="p-2.5 text-right font-mono">Costo Unitario</th>
                      <th className="p-2.5 text-center">Cantidad</th>
                      <th className="p-2.5 text-right">Total Parcial</th>
                      <th className="p-2.5 text-center pr-4">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {pItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400 bg-gray-50/50">
                          Aún no se han agregado artículos al lote de compra.
                        </td>
                      </tr>
                    ) : (
                      pItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/40">
                          <td className="p-2.5 pl-4 font-semibold text-gray-905">{item.productName}</td>
                          <td className="p-2.5 text-right font-mono text-gray-600">${item.costPrice.toLocaleString("es-CO")}</td>
                          <td className="p-2.5 text-center font-bold">{item.quantity} unds</td>
                          <td className="p-2.5 text-right font-black text-gray-950 font-mono">${(item.costPrice * item.quantity).toLocaleString("es-CO")}</td>
                          <td className="p-2.5 text-center pr-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromPurchase(index)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center bg-gray-50/60 p-4 rounded-2xl border">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block">Consolidado Total Facturado</span>
                  <p className="text-[10px] text-indigo-650 font-semibold">Este valor actualizará automáticamente el costo medio contable de cada artículo.</p>
                </div>
                <div className="text-right mt-2 sm:mt-0">
                  <span className="text-xl font-black text-indigo-705 font-mono">
                    ${totalCalculatedInvoice.toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 p-4 border-t flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPurchaseForm(false)}
                className="bg-white border rounded-xl px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl px-6 py-2 text-xs font-black transition-all hover:shadow-md"
              >
                Procesar e Incrementar Inventario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* MODAL: VER DETALLE DE COMPRA */}
      {/* -------------------------------------------------------------------------------------- */}
      {selectedPurchaseDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-xs">
            <div className="bg-gray-950 text-white p-4 flex items-center justify-between">
              <span className="font-bold">Factura de Compra #{selectedPurchaseDetails.purchaseNumber}</span>
              <button type="button" onClick={() => setSelectedPurchaseDetails(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">PROVEEDOR</span>
                  <span className="font-bold text-gray-900 text-xs">{selectedPurchaseDetails.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">FECHA / HORA REGISTRO</span>
                  <span className="font-bold text-gray-800 text-xs">{selectedPurchaseDetails.date} • {selectedPurchaseDetails.time}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-gray-400 block font-bold">REGISTRADO POR</span>
                  <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase font-mono">{selectedPurchaseDetails.user}</span>
                </div>
                {selectedPurchaseDetails.notes && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 block font-bold">NOTAS DE ADJUDICACIÓN</span>
                    <p className="text-gray-650 italic">"{selectedPurchaseDetails.notes}"</p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 block">Detalle de Mercancía Comprada</span>
                <div className="border rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 border-b text-[10px] uppercase font-bold">
                        <th className="p-2.5 pl-4">Producto</th>
                        <th className="p-2.5 text-right">Costo Unitario</th>
                        <th className="p-2.5 text-center">Cantidad</th>
                        <th className="p-2.5 text-right pr-4">Total Parcial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-750">
                      {selectedPurchaseDetails.items.map((item, i) => (
                        <tr key={i}>
                          <td className="p-2.5 pl-4 font-bold">{item.productName}</td>
                          <td className="p-2.5 text-right font-mono">${item.costPrice.toLocaleString("es-CO")}</td>
                          <td className="p-2.5 text-center font-bold">{item.quantity} unidades</td>
                          <td className="p-2.5 text-right font-mono font-bold pr-4">${item.total.toLocaleString("es-CO")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-xs text-gray-500 font-bold">VALOR CONTABLE CARGADO</span>
                <strong className="text-lg font-black text-gray-950 font-mono">${selectedPurchaseDetails.total.toLocaleString("es-CO")} COP</strong>
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t flex justify-end">
              <button
                onClick={() => setSelectedPurchaseDetails(null)}
                className="bg-gray-950 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-bold transition"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

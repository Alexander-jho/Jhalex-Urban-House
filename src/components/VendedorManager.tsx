/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { db } from "../db";
import { Vendedor, Sale, UserRole } from "../types";
import {
  Users,
  UserPlus,
  Trash2,
  Edit3,
  ClipboardList,
  DollarSign,
  Briefcase,
  Calendar,
  MapPin,
  Phone,
  User,
  Clock,
  FileText,
  ShoppingBag,
  TrendingUp,
  Award,
  AlertCircle
} from "lucide-react";

interface VendedorManagerProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function VendedorManager({ currentRole, currentUserName }: VendedorManagerProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>(db.getVendedores());
  const [sales] = useState<Sale[]>(db.getSales());
  const [showForm, setShowForm] = useState<boolean>(false);
  const [vendedorForm, setVendedorForm] = useState<Partial<Vendedor>>({
    id: "",
    name: "",
    document: "",
    phone: "",
    address: "",
    cargo: "",
    fechaIngreso: "",
    status: "ACTIVO",
    salarioFijo: 1300000,
    periodicidadPago: "mensual",
    fechaPago: "Cada fin de mes",
    turno: "Lunes a Sábado 8:00 AM - 6:00 PM",
    observaciones: ""
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedVendedorStats, setSelectedVendedorStats] = useState<Vendedor | null>(null);

  // Informative statistics map for each seller
  const stats = useMemo(() => {
    const map: Record<string, { totalSales: number; count: number; productsSold: Record<string, { name: string; qty: number; code: string; totalVal: number }> }> = {};

    // Initialize all sellers
    vendedores.forEach(v => {
      map[v.id] = { totalSales: 0, count: 0, productsSold: {} };
    });

    // Sum active transactions
    sales.forEach(s => {
      if (s.status === "ACTIVA" && s.sellerId && map[s.sellerId]) {
        map[s.sellerId].totalSales += s.total;
        map[s.sellerId].count += 1;

        // Group sold products
        s.items.forEach(item => {
          const prodId = item.productId;
          if (!map[s.sellerId].productsSold[prodId]) {
            map[s.sellerId].productsSold[prodId] = {
              name: item.productName,
              qty: 0,
              code: item.productCode,
              totalVal: 0
            };
          }
          map[s.sellerId].productsSold[prodId].qty += item.quantity;
          map[s.sellerId].productsSold[prodId].totalVal += item.total;
        });
      }
    });

    return map;
  }, [vendedores, sales]);

  const refreshData = () => {
    setVendedores(db.getVendedores());
  };

  const initNewVendedor = () => {
    setIsEditing(false);
    setVendedorForm({
      id: "V_" + Date.now(),
      name: "",
      document: "",
      phone: "",
      address: "",
      cargo: "Asesor de Ventas",
      fechaIngreso: new Date().toISOString().split("T")[0],
      status: "ACTIVO",
      salarioFijo: 1300000,
      periodicidadPago: "mensual",
      fechaPago: "Cada fin de mes",
      turno: "Lunes a Sábado 8:00 AM - 6:00 PM",
      observaciones: ""
    });
    setShowForm(true);
  };

  const handleEdit = (v: Vendedor) => {
    setIsEditing(true);
    setVendedorForm(v);
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendedorForm.name || !vendedorForm.document) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }
    db.saveVendedor(vendedorForm as Vendedor, currentUserName);
    refreshData();
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro de dar de baja a este empleado? No podrá ser seleccionado para nuevas ventas, pero sus registros históricos se conservarán para auditoría.")) {
      db.deleteVendedor(id, currentUserName);
      refreshData();
      if (selectedVendedorStats?.id === id) {
        setSelectedVendedorStats(null);
      }
    }
  };

  const toggleStatus = (v: Vendedor) => {
    const nextStatus = v.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const updated = { ...v, status: nextStatus as "ACTIVO" | "INACTIVO" };
    db.saveVendedor(updated, currentUserName);
    refreshData();
    if (selectedVendedorStats?.id === v.id) {
      setSelectedVendedorStats(updated);
    }
  };

  const selectedStats = useMemo(() => {
    if (!selectedVendedorStats) return null;
    return stats[selectedVendedorStats.id] || { totalSales: 0, count: 0, productsSold: {} };
  }, [selectedVendedorStats, stats]);

  const productsSoldList = useMemo(() => {
    if (!selectedStats) return [];
    const arr = Object.values(selectedStats.productsSold) as Array<{ name: string; qty: number; code: string; totalVal: number }>;
    return arr.sort((a, b) => b.qty - a.qty);
  }, [selectedStats]);

  const filteredSalesForSelectedVendor = useMemo(() => {
    if (!selectedVendedorStats) return [];
    return sales.filter(s => s.sellerId === selectedVendedorStats.id);
  }, [sales, selectedVendedorStats]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Nómina de Empleados y Vendedores
          </h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Administre la base de trabajadores, registre sus cargos, horas de turno, salarios fijos (sin comisiones por venta) y consulte reportes informativos de rendimiento.
          </p>
        </div>
        <button
          onClick={initNewVendedor}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main cards list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-gray-500" />
              Nómina Activa ({vendedores.length})
            </h3>

            {vendedores.length === 0 ? (
              <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl space-y-2">
                <Users className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs">No hay empleados registrados en el sistema de comercio.</p>
                <button
                  onClick={initNewVendedor}
                  className="text-indigo-600 text-xs font-bold underline hover:text-indigo-805"
                >
                  Registrar el primer empleado ahora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendedores.map((v) => {
                  const vendorStats = stats[v.id] || { totalSales: 0, count: 0, productsSold: {} };
                  const isVendorActive = v.status === "ACTIVO";
                  return (
                    <div
                      key={v.id}
                      className={`border rounded-xl p-4 transition-all duration-150 flex flex-col justify-between ${
                        isVendorActive
                          ? "border-gray-200 bg-white hover:border-indigo-200 hover:shadow-xs"
                          : "border-gray-150 bg-gray-50/70 opacity-70"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <strong className="text-gray-900 font-bold block text-sm">{v.name}</strong>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{v.cargo || "Cargo sin definir"}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => toggleStatus(v)}
                            title="Cambiar Estado de Trabajo"
                            className="focus:outline-none"
                          >
                            {isVendorActive ? (
                              <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full ring-1 ring-emerald-200 hover:bg-emerald-100 transition cursor-pointer uppercase">
                                ACTIVO
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 text-[9px] font-black px-2 py-0.5 rounded-full ring-1 ring-gray-200 hover:bg-gray-200 transition cursor-pointer uppercase">
                                INACTIVO
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Labor details preview info */}
                        <div className="text-[11px] text-gray-500 space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-normal font-medium">
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-gray-400">CC:</span>
                            <span className="text-gray-700">{v.document}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Salario Fijo:</span>
                            <span className="text-indigo-800 font-bold">${v.salarioFijo?.toLocaleString("es-CO")} COP</span>
                            <span className="text-gray-400">({v.periodicidadPago})</span>
                          </div>
                          {v.phone && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">Tel:</span>
                              <span className="text-gray-700">{v.phone}</span>
                            </div>
                          )}
                          {v.turno && (
                            <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[10.5px]">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Shift: {v.turno}</span>
                            </div>
                          )}
                        </div>

                        {/* Sales performance summary metrics - INFORMATIONAL ONLY */}
                        <div className="grid grid-cols-2 gap-2 bg-indigo-50/30 border border-indigo-100/40 rounded-lg p-2 text-center text-[11px] font-mono">
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-tight">Operaciones</span>
                            <strong className="text-indigo-950 font-bold block pt-0.5">
                              {vendorStats.count} operaciones
                            </strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-tight">Ventas Totales</span>
                            <strong className="text-indigo-750 font-bold block pt-0.5 text-indigo-700">
                              ${vendorStats.totalSales.toLocaleString("es-CO")}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-gray-100">
                        {/* Reports Trigger */}
                        <button
                          onClick={() => setSelectedVendedorStats(v)}
                          className={`text-[10px] px-2.5 py-1 rounded font-bold transition flex items-center gap-1 cursor-pointer ${
                            selectedVendedorStats?.id === v.id
                              ? "bg-indigo-600 text-white"
                              : "text-indigo-600 hover:bg-indigo-50"
                          }`}
                        >
                          <ClipboardList className="w-3.5 h-3.5" /> Ver Reporte Detallado
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(v)}
                            title="Editar ficha"
                            className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            title="Dar de baja"
                            className="text-gray-300 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed report panel */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest pb-3 border-b border-gray-100 flex items-center gap-1.5">
            <ClipboardList className="w-4.5 h-4.5 text-indigo-600" />
            Reporte Administrativo / Ventas
          </h3>

          {selectedVendedorStats ? (
            <div className="space-y-4">
              {/* Employee Summary Card */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                  <Award className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-300" />
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Ficha de Empleado</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">{selectedVendedorStats.name}</h4>
                  <p className="text-[10px] text-gray-400">{selectedVendedorStats.cargo} • CC: {selectedVendedorStats.document}</p>
                </div>
                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10.5px]">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Salario</span>
                    <strong className="text-indigo-200 font-bold">${selectedVendedorStats.salarioFijo?.toLocaleString("es-CO")}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Pago</span>
                    <strong className="text-gray-200">{selectedVendedorStats.periodicidadPago}</strong>
                  </div>
                </div>
                {selectedVendedorStats.phone && (
                  <div className="text-[9.5px] text-gray-300 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>Tel: {selectedVendedorStats.phone}</span>
                  </div>
                )}
                {selectedVendedorStats.address && (
                  <div className="text-[9.5px] text-gray-300 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">Dir: {selectedVendedorStats.address}</span>
                  </div>
                )}
                {selectedVendedorStats.fechaIngreso && (
                  <div className="text-[9.5px] text-gray-300 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>Ingreso: {selectedVendedorStats.fechaIngreso}</span>
                  </div>
                )}
                {selectedVendedorStats.turno && (
                  <div className="text-[9.5px] text-amber-300 flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Horario: {selectedVendedorStats.turno}</span>
                  </div>
                )}
                {selectedVendedorStats.observaciones && (
                  <div className="text-[9.5px] text-gray-400 italic bg-black/20 p-2 rounded leading-normal">
                    Obs: {selectedVendedorStats.observaciones}
                  </div>
                )}
              </div>

              {/* Performance indicators */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rendimiento Operativo</h4>
                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Operaciones</span>
                    <strong className="text-gray-950 font-bold block pt-1 font-mono text-base">{selectedStats?.count} Ventas</strong>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Generado</span>
                    <strong className="text-indigo-805 text-indigo-700 font-bold block pt-1 font-mono text-base">
                      ${selectedStats?.totalSales.toLocaleString("es-CO")}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Grouped Products Sold Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Productos Vendidos ({productsSoldList.length})
                </span>

                <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-105 bg-gray-50 divide-gray-100">
                  {productsSoldList.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">No hay productos vendidos registrados para este colaborador.</div>
                  ) : (
                    productsSoldList.map((p) => (
                      <div key={p.code} className="p-3 flex items-center justify-between text-xs hover:bg-white transition gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-gray-900 block truncate">{p.name}</span>
                          <span className="text-[9px] text-gray-400 font-mono">Ref: {p.code}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono text-[10px]">
                            {p.qty} unidades
                          </span>
                          <span className="text-[9.5px] text-gray-500 block font-mono mt-0.5">${p.totalVal.toLocaleString("es-CO")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Transactions History Log */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Lista de Boletas / Facturas</span>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 font-mono text-[11px] pr-1">
                  {filteredSalesForSelectedVendor.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 italic">No hay boletas generadas.</div>
                  ) : (
                    filteredSalesForSelectedVendor.map(s => (
                      <div key={s.id} className="py-2 flex items-center justify-between">
                        <div>
                          <strong className="text-gray-800">{s.invoiceNumber}</strong>
                          <span className="text-[9.5px] text-gray-400 block">{s.date} {s.time}</span>
                        </div>
                        <div className="text-right">
                          <strong className={s.status === "CANCELADA" ? "text-red-500 line-through" : "text-gray-900"}>
                            ${s.total.toLocaleString("es-CO")}
                          </strong>
                          {s.status === "CANCELADA" && <span className="text-[8px] text-red-500 block">ANULADA</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400 space-y-3">
              <ClipboardList className="w-10 h-10 text-gray-250 mx-auto" />
              <p className="text-xs max-w-xs mx-auto text-gray-400">
                Seleccione un colaborador o vendedor de la nómina activa para revisar su ficha laboral, turnos u horarios y sus estadísticas informativas de ventas y productos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* REGISTRATION/EDIT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
          >
            <div className="bg-gray-950 text-white p-4 font-bold flex items-center justify-between text-sm shrink-0">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <UserCardIcon isEditing={isEditing} />
                {isEditing ? "Modificar Datos de Colaborador" : "Registrar Nuevo Colaborador / Ficha Laboral"}
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-300 hover:text-white text-lg focus:outline-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs text-gray-700">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-indigo-950 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                <p className="text-[10.5px] leading-relaxed">
                  <strong>Modelo de Salario Fijo:</strong> Este almacén no utiliza sistemas de comisión o pagos variables automáticos por ventas para evitar distorsiones en inventario.
                </p>
              </div>

              {/* Section: Personal Information */}
              <div className="space-y-3">
                <h4 className="font-extrabold uppercase text-[10px] text-gray-400 tracking-wider border-b pb-1">1. Información Personal</h4>
                
                <div className="space-y-1">
                  <label className="font-bold text-gray-600">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={vendedorForm.name || ""}
                    onChange={(e) => setVendedorForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej / Jhon Alexander Castro"
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg focus:bg-white focus:border-indigo-500 focus:outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Documento de Identidad / CC *</label>
                    <input
                      type="text"
                      required
                      value={vendedorForm.document || ""}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, document: e.target.value }))}
                      placeholder="Ej / 1.094.223.456"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg focus:bg-white focus:outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Número de Teléfono</label>
                    <input
                      type="text"
                      value={vendedorForm.phone || ""}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Ej / 312 345 6789"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg focus:bg-white focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600">Dirección Residencial</label>
                  <input
                    type="text"
                    value={vendedorForm.address || ""}
                    onChange={(e) => setVendedorForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Ej / Av. 5 # 10-25 Barrio San Benito"
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg focus:bg-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Section: Contract and salary details */}
              <div className="space-y-3 pt-2">
                <h4 className="font-extrabold uppercase text-[10px] text-gray-400 tracking-wider border-b pb-1">2. Información Laboral y Contrato</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Cargo del Empleado *</label>
                    <input
                      type="text"
                      required
                      value={vendedorForm.cargo || ""}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, cargo: e.target.value }))}
                      placeholder="Ej / Cajero POS, Asesor"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg focus:bg-white focus:outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Fecha de Ingreso *</label>
                    <input
                      type="date"
                      required
                      value={vendedorForm.fechaIngreso || ""}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, fechaIngreso: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg focus:bg-white focus:outline-none text-xs text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Salario Fijo Mensual ($ COP) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={vendedorForm.salarioFijo || ""}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, salarioFijo: Number(e.target.value) }))}
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg focus:bg-white focus:outline-none text-sm font-mono font-bold text-indigo-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Periodicidad de Pago</label>
                    <select
                      value={vendedorForm.periodicidadPago || "mensual"}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, periodicidadPago: e.target.value as any }))}
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-xs"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Día / Fecha de Pago Estimado</label>
                    <input
                      type="text"
                      value={vendedorForm.fechaPago || ""}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, fechaPago: e.target.value }))}
                      placeholder="Ej / Cada fin de mes"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Horarios o Turnos</label>
                    <input
                      type="text"
                      value={vendedorForm.turno || ""}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, turno: e.target.value }))}
                      placeholder="Ej: Lunes a Sábado 8 AM - 6 PM"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600">Estado Inicial</label>
                    <select
                      value={vendedorForm.status || "ACTIVO"}
                      onChange={(e) => setVendedorForm(prev => ({ ...prev, status: e.target.value as "ACTIVO" | "INACTIVO" }))}
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-xs font-bold"
                    >
                      <option value="ACTIVO">ACTIVO (Disponible para Turno)</option>
                      <option value="INACTIVO">INACTIVO (Licencia / Baja)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-600">Observaciones del Empleado</label>
                  <textarea
                    rows={2}
                    value={vendedorForm.observaciones || ""}
                    onChange={(e) => setVendedorForm(prev => ({ ...prev, observaciones: e.target.value }))}
                    placeholder="Anotaciones de desempeño, historial de incrementos o detalles de contrato"
                    className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-3 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-white border border-gray-200 py-2.5 rounded-xl text-gray-700 font-bold hover:bg-gray-100 transition cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition cursor-pointer text-center"
              >
                {isEditing ? "Modificar Ficha" : "Registrar Empleado"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function UserCardIcon({ isEditing }: { isEditing: boolean }) {
  if (isEditing) return <Edit3 className="w-4 h-4 text-indigo-400" />;
  return <UserPlus className="w-4 h-4 text-emerald-400" />;
}

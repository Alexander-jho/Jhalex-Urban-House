/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { db } from "../db";
import { Vendedor, Sale, UserRole } from "../types";
import { Users, UserPlus, Trash2, Edit3, ClipboardList, Percent, ToggleLeft, ToggleRight, DollarSign } from "lucide-react";

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
    status: "ACTIVO",
    commissionRate: 5
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedVendedorStats, setSelectedVendedorStats] = useState<Vendedor | null>(null);

  const stats = useMemo(() => {
    const map: Record<string, { totalSales: number; count: number; commission: number }> = {};
    
    // Init all sellers
    vendedores.forEach(v => {
      map[v.id] = { totalSales: 0, count: 0, commission: 0 };
    });

    // Sum matching active sales
    sales.forEach(s => {
      if (s.status === "ACTIVA" && s.sellerId && map[s.sellerId]) {
        map[s.sellerId].totalSales += s.total;
        map[s.sellerId].count += 1;
        
        // Find commission rate of that seller
        const v = vendedores.find(v => v.id === s.sellerId);
        const rate = v ? v.commissionRate : 0;
        map[s.sellerId].commission += (s.total * (rate / 100));
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
      status: "ACTIVO",
      commissionRate: 5
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
    db.saveVendedor(vendedorForm as Vendedor, currentUserName);
    refreshData();
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro de de-registrar este vendedor del sistema? Sus ventas históricas no se perderán de las auditorías de caja.")) {
      db.deleteVendedor(id, currentUserName);
      refreshData();
    }
  };

  const toggleStatus = (v: Vendedor) => {
    const nextStatus = v.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const updated = { ...v, status: nextStatus as "ACTIVO" | "INACTIVO" };
    db.saveVendedor(updated, currentUserName);
    refreshData();
  };

  const filteredSalesForSelectedVendor = useMemo(() => {
    if (!selectedVendedorStats) return [];
    return sales.filter(s => s.sellerId === selectedVendedorStats.id);
  }, [sales, selectedVendedorStats]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Control de Vendedores y Comisiones</h2>
          <p className="text-xs text-gray-500 mt-1">
            Asigne, configure porcentajes de ganancia por comisión de venta y revise el flujo de caja personal de cada colaborador.
          </p>
        </div>
        <button
          onClick={initNewVendedor}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Vendedor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vendedores main card list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              Nómina de Vendedores Registrados
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendedores.map((v) => {
                const vendorStats = stats[v.id] || { totalSales: 0, count: 0, commission: 0 };
                return (
                  <div
                    key={v.id}
                    className={`border rounded-xl p-4 transition-all duration-150 flex flex-col justify-between ${
                      v.status === "ACTIVO"
                        ? "border-gray-100 bg-white hover:border-gray-300"
                        : "border-gray-100 bg-gray-50/55 opacity-70"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-gray-900 font-bold block text-sm">{v.name}</strong>
                          <span className="text-[10px] text-gray-400 font-mono block">ID / Cédula: {v.document}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Telf: {v.phone || "No especificado"}</span>
                        </div>
                        <button
                          onClick={() => toggleStatus(v)}
                          title="Cambiar Estado Actividad"
                          className="p-1 rounded hover:bg-gray-100 transition"
                        >
                          {v.status === "ACTIVO" ? (
                            <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
                              ACTIVO
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 text-[9px] font-black px-2 py-0.5 rounded-full ring-1 ring-gray-200">
                              INACTIVO
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Cumulative commission metric badges */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 border rounded-lg p-2 mt-3.5 text-xs text-center font-mono">
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase">Comisión ({v.commissionRate}%)</span>
                          <strong className="text-indigo-700 font-bold block pt-0.5">
                            ${vendorStats.commission.toLocaleString("es-CO")}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase">Ventas ({vendorStats.count})</span>
                          <strong className="text-gray-900 font-bold block pt-0.5">
                            ${vendorStats.totalSales.toLocaleString("es-CO")}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => setSelectedVendedorStats(v)}
                        className="text-[10px] text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded font-semibold transition flex items-center gap-1"
                      >
                        <ClipboardList className="w-3.5 h-3.5" /> Ver Historial
                      </button>
                      <button
                        onClick={() => handleEdit(v)}
                        className="text-gray-500 hover:text-blue-600 p-1 rounded-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="text-gray-300 hover:text-red-600 p-1 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Vendor sales history log summary sidebar */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-4 flex items-center gap-1">
            <ClipboardList className="w-4 h-4 text-gray-600" />
            Auditoría de Ventas por Vendedor
          </h3>

          {selectedVendedorStats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <strong className="text-gray-900 font-extrabold text-sm block">{selectedVendedorStats.name}</strong>
                  <span className="text-[10px] text-gray-400 font-mono">ID: {selectedVendedorStats.id}</span>
                </div>
                <button
                  onClick={() => setSelectedVendedorStats(null)}
                  className="text-xs text-gray-400 hover:text-gray-900"
                >
                  Cerrar
                </button>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto divide-y divide-gray-50 pr-1 text-xs">
                {filteredSalesForSelectedVendor.length === 0 ? (
                  <p className="text-center py-12 text-gray-400">Este vendedor aún no registra transacciones finalizadas.</p>
                ) : (
                  filteredSalesForSelectedVendor.map((s) => (
                    <div key={s.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <strong className="font-mono text-gray-800">{s.invoiceNumber}</strong>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{s.date} • {s.time}</span>
                      </div>
                      <div className="text-right font-mono">
                        <strong className="text-gray-950 font-bold block">${s.total.toLocaleString("es-CO")}</strong>
                        <span className="text-[9px] text-indigo-600 block">Comisión: ${(s.total * (selectedVendedorStats.commissionRate / 100)).toLocaleString("es-CO")}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <ClipboardList className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-xs">Seleccione un vendedor de la nómina para auditar su historial detallado de comisiones.</p>
            </div>
          )}
        </div>
      </div>

      {/* FORM MODAL REGISTER/EDIT */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gray-950 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>{isEditing ? "Modificar Datos de Vendedor" : "Inscribir Nuevo Colaborador"}</span>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={vendedorForm.name}
                  onChange={(e) => setVendedorForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-50 border p-2 rounded focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Documento / ID *</label>
                  <input
                    type="text"
                    required
                    value={vendedorForm.document}
                    onChange={(e) => setVendedorForm(prev => ({ ...prev, document: e.target.value }))}
                    className="w-full bg-gray-50 border p-2 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Nro Telefónico</label>
                  <input
                    type="text"
                    value={vendedorForm.phone}
                    onChange={(e) => setVendedorForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-gray-50 border p-2 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Tasa de Comisión (%) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={vendedorForm.commissionRate}
                    onChange={(e) => setVendedorForm(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border p-2 rounded text-sm font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Estado Inicial</label>
                  <select
                    value={vendedorForm.status}
                    onChange={(e) => setVendedorForm(prev => ({ ...prev, status: e.target.value as "ACTIVO" | "INACTIVO" }))}
                    className="w-full bg-gray-50 border p-2 rounded"
                  >
                    <option value="ACTIVO">ACTIVO (En Turno)</option>
                    <option value="INACTIVO">INACTIVO (Licencia)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 py-2 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700"
                >
                  Inscribir Vendedor
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

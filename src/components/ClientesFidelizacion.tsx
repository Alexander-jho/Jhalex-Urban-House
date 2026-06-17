/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { db } from "../db";
import { Client, Sale, Coupon, UserRole } from "../types";
import { Users, UserPlus, Gift, History, Percent, Trash2, Edit3, Ticket, CircleSlash, Plus } from "lucide-react";

interface ClientesFidelizacionProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function ClientesFidelizacion({ currentRole, currentUserName }: ClientesFidelizacionProps) {
  const [clientes, setClientes] = useState<Client[]>(db.getClientes());
  const [sales] = useState<Sale[]>(db.getSales());
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    id: "",
    name: "",
    document: "",
    phone: "",
    address: "",
    email: "",
    points: 0,
    coupons: []
  });

  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);

  // Issue Coupon helper states
  const [showCouponForm, setShowCouponForm] = useState<boolean>(false);
  const [couponTargetClientId, setCouponTargetClientId] = useState<string>("");
  const [couponForm, setCouponForm] = useState<{
    code: string;
    description: string;
    discountPercent: number;
    minPurchase: number;
    expiryDays: number;
  }>({
    code: "LOYAL15",
    description: "15% descuento en próxima compra",
    discountPercent: 15,
    minPurchase: 50000,
    expiryDays: 90
  });

  const refreshData = () => {
    setClientes(db.getClientes());
  };

  const initNewClient = () => {
    setIsEditing(false);
    setClientForm({
      id: "C_" + Date.now(),
      name: "",
      document: "",
      phone: "",
      address: "",
      email: "",
      points: 0,
      coupons: []
    });
    setShowForm(true);
  };

  const handleEdit = (c: Client) => {
    setIsEditing(true);
    setClientForm(c);
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveCliente(clientForm as Client, currentUserName, currentRole);
    refreshData();
    setShowForm(false);
  };

  // Issue custom loyalty coupon to specific client
  const handleIssueCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clients = db.getClientes();
    const target = clients.find(c => c.id === couponTargetClientId);
    if (target) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + couponForm.expiryDays);
      
      const newCoupon: Coupon = {
        code: couponForm.code.toUpperCase().replace(/\s+/g, ""),
        description: couponForm.description,
        discountPercent: Number(couponForm.discountPercent),
        minPurchase: Number(couponForm.minPurchase),
        used: false,
        expiryDate: expirationDate.toISOString().split("T")[0]
      };

      target.coupons = target.coupons || [];
      target.coupons.push(newCoupon);
      
      db.saveCliente(target, currentUserName, currentRole);
      
      // Log audit
      db.logAudit(
        currentUserName,
        currentRole,
        "EMISION_CUPON",
        "Campañas Fidelización",
        `Se expidió manualmente cupón loyalty ${newCoupon.code} (-${newCoupon.discountPercent}%) al cliente ${target.name}`
      );

      refreshData();
      setShowCouponForm(false);
      
      // If active history is open, refresh it as well
      if (selectedClientHistory && selectedClientHistory.id === target.id) {
        setSelectedClientHistory({ ...target });
      }
    }
  };

  const clientPurchases = useMemo(() => {
    if (!selectedClientHistory) return [];
    return sales.filter(s => s.clientId === selectedClientHistory.id);
  }, [sales, selectedClientHistory]);

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Fidelización de Clientes (Loyalty Hub)</h2>
          <p className="text-xs text-gray-500 mt-1">
            Supervise compras acumuladas, asigne cupones dinámicos de descuento (ej. 15%) y administre los puntos de fidelización del Almacén.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCouponTargetClientId(clientes[0]?.id || "");
              setCouponForm({
                code: "FRECUENTE15",
                description: "15% de descuento próximo estilo",
                discountPercent: 15,
                minPurchase: 60000,
                expiryDays: 60
              });
              setShowCouponForm(true);
            }}
            className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <Gift className="w-4 h-4" />
            Otorgar Cupón Especial
          </button>
          <button
            onClick={initNewClient}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Registrar Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main list of clients registered columns 2 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-gray-500" />
                Clientes Registrados ({clientes.filter(c => c.id !== "GENERICO").length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[10px] font-bold uppercase py-2 bg-gray-50/20">
                    <th className="px-4 py-3">Nombre Completo</th>
                    <th className="px-4 py-3">Cédula / Documento</th>
                    <th className="px-4 py-3">Telf / Correo</th>
                    <th className="px-4 py-3 text-center">Puntos Acumulados</th>
                    <th className="px-4 py-3 text-center">Cupones Activos</th>
                    <th className="px-4 py-3 text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {clientes.filter(c => c.id !== "GENERICO").length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400">No hay clientes inscritos en el sistema local.</td>
                    </tr>
                  ) : (
                    clientes.filter(c => c.id !== "GENERICO").map((c) => {
                      const activeCouponsCount = c.coupons ? c.coupons.filter(cop => !cop.used).length : 0;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/40 transition">
                          <td className="px-4 py-3.5 font-bold text-gray-900">{c.name}</td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">#{c.document}</td>
                          <td className="px-4 py-3.5">
                            <div className="text-[11px] text-gray-800">{c.phone || "Sin Teléfono"}</div>
                            <div className="text-[9px] text-gray-400">{c.email || "Sin email"}</div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-mono font-bold text-[11px] inline-flex items-center gap-0.5">
                              ⭐ {c.points || 0} pts
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {activeCouponsCount > 0 ? (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-md font-bold text-[10px] inline-flex items-center gap-1 animate-pulse">
                                <Ticket className="w-3 h-3" /> {activeCouponsCount} activo(s)
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right pr-6 space-x-1">
                            <button
                              onClick={() => {
                                setSelectedClientHistory(c);
                              }}
                              className="text-[10px] text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded font-bold transition flex-inline items-center"
                            >
                              Ficha
                            </button>
                            <button
                              onClick={() => handleEdit(c)}
                              className="text-gray-400 hover:text-blue-600 p-1 rounded transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
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

        {/* Right side detailed loyal statistics cards */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-5">
          {selectedClientHistory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 block">{selectedClientHistory.name}</h3>
                  <span className="text-[10px] text-gray-400 font-mono">Cód Ficha: {selectedClientHistory.id}</span>
                </div>
                <button
                  onClick={() => setSelectedClientHistory(null)}
                  className="text-xs text-gray-400 hover:text-gray-900 font-medium"
                >
                  Cerrar
                </button>
              </div>

              {/* Points banner detail */}
              <div className="bg-gray-50 border p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-gray-400 font-semibold uppercase text-[9px] block">Cómputo de Premiación</span>
                  <span className="font-extrabold text-gray-800">{selectedClientHistory.points} Puntos Redimibles</span>
                </div>
                <span className="text-2xl">🏆</span>
              </div>

              {/* Coupons assigned list */}
              <div className="space-y-2">
                <span className="font-bold text-[10px] text-gray-500 block uppercase tracking-wider">Cupones y Descuentos Activos</span>
                {!selectedClientHistory.coupons || selectedClientHistory.coupons.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Este cliente no tiene cupones expedidos vigentes.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedClientHistory.coupons.map((cop, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${
                          cop.used
                            ? "bg-gray-150 border-gray-200 line-through text-gray-400"
                            : "bg-indigo-50/50 border-indigo-150 text-indigo-950"
                        }`}
                      >
                        <div>
                          <strong className="block font-mono leading-none tracking-wider text-indigo-900">{cop.code}</strong>
                          <span className="text-[9px] text-gray-400 block mt-1">{cop.description} • Vence: {cop.expiryDate}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          cop.used ? "bg-gray-250 text-gray-500" : "bg-indigo-600 text-white"
                        }`}>
                          {cop.used ? "USADO" : `-${cop.discountPercent}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase history check */}
              <div className="pt-2">
                <span className="font-bold text-[10px] text-gray-500 block uppercase tracking-wider mb-2">Historial de Compras ({clientPurchases.length})</span>
                <div className="space-y-1.5 max-h-44 overflow-y-auto divide-y divide-gray-50 text-[11px] leading-relaxed">
                  {clientPurchases.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">No se han registrado compras anteriores de este cliente.</p>
                  ) : (
                    clientPurchases.map((s) => (
                      <div key={s.id} className="pt-1.5 flex justify-between items-center gap-2">
                        <div>
                          <strong className="font-mono text-gray-800">{s.invoiceNumber}</strong>
                          <span className="text-[9px] text-gray-400 block">{s.date} • {s.time}</span>
                        </div>
                        <strong className="font-mono text-gray-900">${s.total.toLocaleString("es-CO")}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400 space-y-2">
              <Gift className="w-10 h-10 text-gray-200 mx-auto" />
              <strong className="text-xs font-bold text-gray-600 block">Ficha de Cliente Integrado</strong>
              <p className="text-xs text-gray-400">Seleccione un cliente para auditar cupones, verificar puntos acumulados e históricos de compras.</p>
            </div>
          )}
        </div>
      </div>

      {/* FORM MODAL: REGISTER / EDIT INTERNAL CLIENTS */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gray-950 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>{isEditing ? "Editar Ficha de Cliente" : "Inscribir Nuevo Cliente Frecuente"}</span>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-50 border p-2 rounded focus:bg-white focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Nro Documento / NIT *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.document}
                    onChange={(e) => setClientForm(prev => ({ ...prev, document: e.target.value }))}
                    className="w-full bg-gray-50 border p-2 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Nro Telefónico</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-gray-50 border p-2 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-gray-500">Correo Electrónico</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-gray-50 border p-2 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Puntos de Bienvenida</label>
                  <input
                    type="number"
                    min={0}
                    value={clientForm.points}
                    onChange={(e) => setClientForm(prev => ({ ...prev, points: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border p-2 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Dirección Residencial</label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={(e) => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-gray-50 border p-2 rounded"
                />
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
                  Sincronizar Cliente
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EXPLICITLY ISSUE NEW LOYALTY COUPON TO CLIENTS */}
      {showCouponForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleIssueCoupon} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-indigo-900 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>Otorgar Cupón de Descuento Manual</span>
              <button type="button" onClick={() => setShowCouponForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Seleccionar Beneficiario *</label>
                <select
                  required
                  value={couponTargetClientId}
                  onChange={(e) => setCouponTargetClientId(e.target.value)}
                  className="w-full bg-gray-50 border p-2 rounded text-xs"
                >
                  <option value="">-- Eliga Cliente --</option>
                  {clientes.filter(cl => cl.id !== "GENERICO").map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name} (Ref: {cl.document})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Código Promo *</label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="FRECUENTE15"
                    className="w-full bg-gray-50 border p-2 rounded font-mono font-bold uppercase text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Descuento (%) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={90}
                    value={couponForm.discountPercent}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border p-2 rounded text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Compra Mínima ($) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={couponForm.minPurchase}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, minPurchase: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border p-2 rounded font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Días de Validez *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={couponForm.expiryDays}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, expiryDays: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border p-2 rounded text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Descripción Corta *</label>
                <input
                  type="text"
                  required
                  value={couponForm.description}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej. 15% Descuento Cliente Frecuente"
                  className="w-full bg-gray-50 border p-2 rounded focus:bg-white text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCouponForm(false)}
                  className="flex-1 bg-gray-100 py-2 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700"
                >
                  Expedir Cupón Loyalty
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

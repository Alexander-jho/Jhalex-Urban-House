/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { db } from "../db";
import { Promotion, UserRole } from "../types";
import { Tags, Ticket, Plus, Trash2, Calendar, CheckSquare, AlertCircle } from "lucide-react";

interface DescuentosPromocionesProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function DescuentosPromociones({ currentRole, currentUserName }: DescuentosPromocionesProps) {
  const [promos, setPromos] = useState<Promotion[]>(db.getPromotions());
  const [showForm, setShowForm] = useState<boolean>(false);
  const [newPromo, setNewPromo] = useState<Partial<Promotion>>({
    id: "",
    name: "",
    discountPercent: 10,
    category: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    isActive: true
  });

  const [errorGate, setErrorGate] = useState<string>("");

  const refreshData = () => {
    setPromos(db.getPromotions());
  };

  const initNewPromo = () => {
    setErrorGate("");
    if (currentRole !== UserRole.ADMIN) {
      setErrorGate("Solo los administradores pueden crear o alterar promociones generales de temporada.");
      setTimeout(() => setErrorGate(""), 4000);
      return;
    }

    setNewPromo({
      id: "PROM_" + Date.now(),
      name: "",
      discountPercent: 15,
      category: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      isActive: true
    });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.savePromotion(newPromo as Promotion, currentUserName);
    refreshData();
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (currentRole !== UserRole.ADMIN) {
      setErrorGate("Operación denegada. Se requiere perfil administrador.");
      setTimeout(() => setErrorGate(""), 3000);
      return;
    }
    if (confirm("¿Está seguro de eliminar esta regla promocional activa? El precio de venta tradicional volverá por defecto.")) {
      db.deletePromotion(id, currentUserName);
      refreshData();
    }
  };

  const togglePromoActivity = (p: Promotion) => {
    if (currentRole !== UserRole.ADMIN) {
      setErrorGate("Se requiere autenticación de administrador.");
      setTimeout(() => setErrorGate(""), 3000);
      return;
    }
    const updated = { ...p, isActive: !p.isActive };
    db.savePromotion(updated, currentUserName);
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Descuentos & Promociones de Temporada</h2>
          <p className="text-xs text-gray-500 mt-1">
            Gestione las campañas de mercadeo activas de JHALEX URBAN HOUSE. El Almacén aplicará estas pautas de descuento según la categoría participante.
          </p>
        </div>
        <button
          onClick={initNewPromo}
          className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Añadir Promoción
        </button>
      </div>

      {errorGate && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span>{errorGate}</span>
        </div>
      )}

      {/* Main campaigns Grid mapping */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promos.map((p) => {
          return (
            <div
              key={p.id}
              className={`border border-gray-100 rounded-2xl p-5 shadow-sm bg-white/90 backdrop-blur-md flex flex-col justify-between space-y-4 transition hover:border-gray-300 ${
                !p.isActive && "opacity-60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                    <Tags className="w-4 h-4" />
                    <span className="text-sm font-black">{p.name}</span>
                  </div>
                  <button
                    onClick={() => togglePromoActivity(p)}
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ring-1 ${
                      p.isActive
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        : "bg-gray-100 text-gray-600 ring-gray-200"
                    }`}
                  >
                    {p.isActive ? "ACTIVA" : "PAUSADA"}
                  </button>
                </div>

                <div className="flex items-end gap-2 pt-2">
                  <span className="font-mono font-black text-3xl text-gray-900">-{p.discountPercent}%</span>
                  <span className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider block">Descuento Real</span>
                </div>

                <div className="text-xs text-gray-500 space-y-1 pt-1 border-t border-gray-50 font-medium">
                  {p.category && (
                    <div className="flex justify-between">
                      <span>Afecta Categoría:</span>
                      <span className="font-bold text-gray-800">{p.category}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Vigencia:</span>
                    <span className="font-mono text-[10px] text-gray-600">
                      {p.startDate} al {p.endDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                <span className="text-[10px] text-gray-400 font-mono">ID Reg: {p.id}</span>
                <button
                  type="button"
                  title="Eliminar Promoción"
                  onClick={() => handleDelete(p.id)}
                  className="text-gray-350 hover:text-red-650 hover:bg-red-50 text-red-500 hover:text-red-700 p-1 rounded-lg transition text-xs"
                >
                  <Trash2 className="w-4 h-4 inline" /> Borrar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-100">
            <div className="bg-gray-950 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>Configurar Atributos de Campaña</span>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Nombre de Campaña *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Liquidación de Invierno, Navidad"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-50 border p-2 rounded focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Descuento (%) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={newPromo.discountPercent}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border p-2 rounded font-mono font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Categoría Objetivo</label>
                  <select
                    value={newPromo.category || ""}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-50 border p-2 rounded"
                  >
                    <option value="">Afectar Todo el Catálogo</option>
                    <option value="Ropa">Ropa de Moda</option>
                    <option value="Zapatos">Zapatos & Sneakers</option>
                    <option value="Accesorios">Accesorios & Caps</option>
                    <option value="Lociones">Lociones & Fragancias</option>
                    <option value="Bolsos">Bolsos & Backpacks</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Fecha Lanzamiento *</label>
                  <input
                    type="date"
                    required
                    value={newPromo.startDate}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-gray-50 border p-1.5 rounded font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Fecha Vencimiento *</label>
                  <input
                    type="date"
                    required
                    value={newPromo.endDate}
                    onChange={(e) => setNewPromo(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-gray-50 border p-1.5 rounded font-mono"
                  />
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
                  Confirmar Promoción
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

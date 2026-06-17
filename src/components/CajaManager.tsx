/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { db } from "../db";
import { CashBoxSession, CashTransaction, UserRole } from "../types";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Calendar
} from "lucide-react";

interface CajaManagerProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function CajaManager({ currentRole, currentUserName }: CajaManagerProps) {
  const [sessions, setSessions] = useState<CashBoxSession[]>(db.getCashBoxSessions());
  const [txs, setTxs] = useState<CashTransaction[]>(db.getTransactions());

  // Input states
  const [amount, setAmount] = useState<number>(0);
  const [concept, setConcept] = useState<string>("");
  const [authorizedBy, setAuthorizedBy] = useState<string>("");

  // Modal controller states
  const [showInflowForm, setShowInflowForm] = useState<boolean>(false);
  const [showOutflowForm, setShowOutflowForm] = useState<boolean>(false);
  const [showCloseBoxForm, setShowCloseBoxForm] = useState<boolean>(false);
  const [showOpenBoxForm, setShowOpenBoxForm] = useState<boolean>(false);

  // Secure validation states
  const [adminPin, setAdminPin] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // Temporary active receipt states to show/print
  const [activeReceiptTx, setActiveReceiptTx] = useState<CashTransaction | null>(null);
  const [activeSessionClosure, setActiveSessionClosure] = useState<CashBoxSession | null>(null);

  // Input cash on hand
  const [realCashOnBox, setRealCashOnBox] = useState<number>(0);
  const [openingBaseAmount, setOpeningBaseAmount] = useState<number>(200000); // default $200.000 COP

  const activeSession = useMemo(() => {
    return sessions.find(s => s.status === "ABIERTA") || null;
  }, [sessions]);

  const refreshData = () => {
    setSessions(db.getCashBoxSessions());
    setTxs(db.getTransactions());
  };

  const handleInflow = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    // Admin verify
    const isValid = db.verifyPIN(UserRole.ADMIN, adminPin);
    if (!isValid) {
      setAuthError("PIN de Administrador inválido. La entrada de dinero no ha sido autorizada.");
      return;
    }

    db.registerCashInflow(amount, concept, authorizedBy || "Administrador", currentUserName, currentRole);
    refreshData();
    
    // Close form
    setShowInflowForm(false);
    setAmount(0);
    setConcept("");
    setAuthorizedBy("");
    setAdminPin("");
  };

  const handleOutflow = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    // Outflow is extremely sensitive. Must check admin password.
    const isValid = db.verifyPIN(UserRole.ADMIN, adminPin);
    if (!isValid) {
      setAuthError("La contraseña de Administrador no es válida. Retiro cancelado por seguridad.");
      return;
    }

    db.registerCashWithdrawal(amount, concept, authorizedBy || "Administración", currentUserName, currentRole);
    
    // Auto-generate receipt ticket
    const currentTxs = db.getTransactions();
    const newestTx = currentTxs[currentTxs.length - 1]; // because we pushed
    setActiveReceiptTx(newestTx);

    refreshData();
    setShowOutflowForm(false);
    setAmount(0);
    setConcept("");
    setAuthorizedBy("");
    setAdminPin("");
  };

  const handleOpenBox = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = db.openCashBox(openingBaseAmount, currentUserName, currentRole);
    if (ok) {
      refreshData();
      setShowOpenBoxForm(false);
    }
  };

  const handleCloseBox = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const isValid = db.verifyPIN(UserRole.ADMIN, adminPin);
    if (!isValid) {
      setAuthError("Clave administrativa errónea. No se puede completar el arqueo.");
      return;
    }

    const closed = db.closeCashBox(realCashOnBox, currentUserName, currentRole);
    if (closed) {
      setActiveSessionClosure(closed);
      refreshData();
      setShowCloseBoxForm(false);
      setRealCashOnBox(0);
      setAdminPin("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Caja Registradora y Retiros</h2>
          <p className="text-xs text-gray-500 mt-1">
            Supervise arqueos de caja en tiempo real, controle la base inicial de efectivo y autorice gastos de bodega con clave de seguridad.
          </p>
        </div>

        {activeSession ? (
          <button
            onClick={() => {
              setRealCashOnBox(activeSession.expectedCash);
              setAdminPin("");
              setAuthError("");
              setShowCloseBoxForm(true);
            }}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            Cerrar Caja (Arqueo)
          </button>
        ) : (
          <button
            onClick={() => {
              setOpeningBaseAmount(200000);
              setShowOpenBoxForm(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            Abrir Caja del Día
          </button>
        )}
      </div>

      {activeSession ? (
        /* Left/Right active details Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active stats metrics panels */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-50">
              <span className="font-extrabold text-xs text-gray-900 uppercase tracking-wider block">Dinero en Caja Activa</span>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
                ABIERTA
              </span>
            </div>

            <div className="text-center py-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
              <span className="text-xs text-gray-400 font-semibold block uppercase">Dinero Neto Esperado</span>
              <strong className="text-gray-950 font-mono font-bold text-3xl block">
                ${activeSession.expectedCash.toLocaleString("es-CO")}
              </strong>
            </div>

            <div className="space-y-2 text-xs divide-y divide-gray-100 font-semibold text-gray-500 pt-1">
              <div className="flex justify-between py-1.5">
                <span>Base Inicial:</span>
                <span className="font-mono text-gray-950 font-bold">${activeSession.initialBase.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-emerald-600">Ventas Registradas (POS):</span>
                <span className="font-mono text-emerald-700 font-bold">+${activeSession.salesSum.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-blue-500">Inyecciones extraordinarias:</span>
                <span className="font-mono text-blue-600 font-bold">+${activeSession.inflowsSum.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-red-500">Gastos / Retiros efectuados:</span>
                <span className="font-mono text-red-600 font-bold">-${activeSession.outflowsSum.toLocaleString("es-CO")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <button
                onClick={() => {
                  setAdminPin("");
                  setAuthError("");
                  setShowInflowForm(true);
                }}
                className="bg-blue-50 hover:bg-blue-100 py-2.5 rounded-xl text-xs text-blue-800 font-bold flex items-center justify-center gap-1 transition"
              >
                <ArrowUpRight className="w-4 h-4" />
                Ingresar Efectivo
              </button>
              <button
                onClick={() => {
                  setAdminPin("");
                  setAuthError("");
                  setShowOutflowForm(true);
                }}
                className="bg-red-50 hover:bg-red-100 py-2.5 rounded-xl text-xs text-red-800 font-bold flex items-center justify-center gap-1 transition"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Retirar Caja (Gasto)
              </button>
            </div>
          </div>

          {/* Core manual transactions tables */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 border-b pb-2 uppercase tracking-wide">Movimientos Extraordinarios Recientes</h3>
            <div className="overflow-x-auto max-h-72 divide-y divide-gray-50 text-xs text-gray-600">
              {txs.filter(tx => tx.date === new Date().toISOString().split("T")[0]).length === 0 ? (
                <div className="text-center py-16 text-gray-400">No se han registrado retiros o ingresos manuales hoy.</div>
              ) : (
                txs.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        tx.type === "INFLOW" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                      }`}>
                        {tx.type === "INFLOW" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <strong className="block text-gray-900 font-semibold">{tx.concept}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">Reg: {tx.responsibleAdmin} • Autorizó: {tx.authorizedBy} • {tx.time}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <strong className={`font-mono text-sm block ${
                        tx.type === "INFLOW" ? "text-blue-600" : "text-red-600"
                      }`}>
                        {tx.type === "INFLOW" ? "+" : "-"}${tx.amount.toLocaleString("es-CO")}
                      </strong>
                      <button
                        onClick={() => setActiveReceiptTx(tx)}
                        className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1 rounded"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Box is Closed banner state */
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <Wallet className="w-12 h-12 text-amber-600 mx-auto" />
          <h3 className="font-black text-amber-900 text-lg">Caja Registradora Cerrada</h3>
          <p className="text-xs text-amber-700 max-w-sm mx-auto">
            El sistema se encuentra inoperable de forma offline temporal para ventas POS hasta que el administrador declare una apertura de base física de caja para el día de hoy.
          </p>
          <button
            onClick={() => {
              setOpeningBaseAmount(200000);
              setShowOpenBoxForm(true);
            }}
            className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold p-2.5 rounded-xl text-xs transition"
          >
            Proceder con Apertura de Caja
          </button>
        </div>
      )}

      {/* HISTORIAL GENERAL DE ARQUEOS DE CAJA DE DIAS ANTERIORES */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-gray-900 border-b pb-3 uppercase tracking-wide mb-4">Auditoría de Arqueos de Caja</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-2.5">ID Sesión</th>
                <th className="px-4 py-2.5">Apertura</th>
                <th className="px-4 py-2.5">Cierre</th>
                <th className="px-4 py-2.5 text-right">Base Fija</th>
                <th className="px-4 py-2.5 text-right">Espera Caja</th>
                <th className="px-4 py-2.5 text-right">Físico Conteo</th>
                <th className="px-4 py-2.5 text-right">Diferencia / Cuadre</th>
                <th className="px-4 py-2.5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {sessions.map((s) => {
                const isDiff = s.difference !== null && s.difference !== 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/40">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{s.id}</td>
                    <td className="px-4 py-3">
                      <div>{new Date(s.openedAt).toLocaleDateString("es-CO")}</div>
                      <div className="text-[10px] text-gray-400">Por: {s.openedBy}</div>
                    </td>
                    <td className="px-4 py-3">
                      {s.closedAt ? (
                        <>
                          <div>{new Date(s.closedAt).toLocaleDateString("es-CO")}</div>
                          <div className="text-[10px] text-gray-400">Por: {s.closedBy}</div>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Sesión abierta</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">${s.initialBase.toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">${s.expectedCash.toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                      {s.realCash !== null ? `$${s.realCash.toLocaleString("es-CO")}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {s.difference !== null ? (
                        <span className={s.difference < 0 ? "text-red-650 font-extrabold text-red-600" : s.difference > 0 ? "text-indigo-600" : "text-emerald-600"}>
                          {s.difference > 0 ? "+" : ""}${s.difference.toLocaleString("es-CO")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        s.status === "ABIERTA" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: START NEW CASH BOX SESSION */}
      {showOpenBoxForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleOpenBox} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-emerald-600 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>Declarar Apertura de Caja Registradora</span>
              <button type="button" onClick={() => setShowOpenBoxForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Monto Base Inicial de Caja *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={openingBaseAmount}
                  onChange={(e) => setOpeningBaseAmount(Number(e.target.value))}
                  className="w-full text-center bg-gray-50 font-mono font-bold text-lg p-2 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Efectivo fijo base de caja para cambio sencillo. (Mínimo sugerido $200.000 COP)
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 transition"
              >
                Habilitar Caja Registradora
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MANUAL CASH INFLOW FORM */}
      {showInflowForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleInflow} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-blue-600 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>Registrar Entrada Extraordinaria de Caja</span>
              <button type="button" onClick={() => setShowInflowForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Valor Ingresado *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount || ""}
                    placeholder="0"
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 rounded font-mono font-bold text-sm focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Autorizado Por</label>
                  <input
                    type="text"
                    value={authorizedBy}
                    placeholder="Gerente"
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    className="w-full p-2 bg-gray-50 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Concepto Detallado del Ingreso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Inyección para sencillo, Devolución de cambio..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full p-2 bg-gray-50 rounded focus:bg-white"
                />
              </div>

              {/* ADMIN SECURITY LOCK ON TXS */}
              <div className="border bg-amber-55/40 bg-amber-50 p-3 rounded-lg border-amber-250 border-dashed space-y-2">
                <label className="font-bold text-[10px] text-amber-800 block uppercase tracking-wider">Autorización PIN Admin *</label>
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center bg-white font-mono tracking-widest text-sm p-1.5 border rounded"
                />
              </div>

              {authError && <p className="text-red-600 text-[10px] text-center font-bold">{authError}</p>}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition"
              >
                Efectuar Entrada de Dinero
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MANUAL OUTFLOW / GASTO DRAWER WITH ADMIN AUTH */}
      {showOutflowForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleOutflow} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-red-600 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>Registrar Salida de Caja (Egreso / Gasto)</span>
              <button type="button" onClick={() => setShowOutflowForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Valor Retirado *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount || ""}
                    placeholder="0"
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 rounded font-mono font-bold text-sm focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-500">Responsable Salida *</label>
                  <input
                    type="text"
                    required
                    value={authorizedBy}
                    placeholder="Ej. Empleado Carlos"
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    className="w-full p-2 bg-gray-50 rounded focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Concepto / Motivo Detallado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra de bolsas, Pago almuerzo domiciliario..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full p-2 bg-gray-50 rounded focus:bg-white"
                />
              </div>

              {/* ADMIN SECURITY LOCK ON TXS (OUTFLOW PREVENTER) */}
              <div className="border bg-amber-50 p-3 rounded-lg border-amber-200 border-dashed space-y-2">
                <label className="font-bold text-[10px] text-amber-800 block uppercase tracking-wider">Autorización PIN Admin Obligatorio *</label>
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center bg-white font-mono tracking-widest text-sm p-1.5 border rounded"
                />
              </div>

              {authError && <p className="text-red-650 text-[10px] text-red-600 text-center font-bold">{authError}</p>}

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition"
              >
                Confirmar y Retirar Dinero
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CIERRE DE CAJA ARQUEO CONFIRMATION WITH ADMIN AUTH */}
      {showCloseBoxForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCloseBox} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-red-700 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>Arqueo y Cierre Final de Turno</span>
              <button type="button" onClick={() => setShowCloseBoxForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs text-gray-700">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg space-y-1 text-yellow-800">
                <p className="font-bold uppercase tracking-wider text-[10px]">Cuadre Teórico del Sistema</p>
                <p>Efectivo esperado final: <strong className="font-mono text-xs">${activeSession?.expectedCash.toLocaleString("es-CO")}</strong></p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-600">Dinero Físico Real en Safe (Conteo Caja) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={realCashOnBox || ""}
                  placeholder="Ingrese monto exacto contado"
                  onChange={(e) => setRealCashOnBox(Number(e.target.value))}
                  className="w-full text-center bg-gray-50 font-mono font-bold text-base p-2 rounded focus:bg-white"
                />
                <span className="text-[10px] text-gray-400 block text-center">
                  El sistema calculará automáticamente cualquier faltante o excedente.
                </span>
              </div>

              <div className="border bg-amber-50 p-3 rounded-lg border-amber-250 border-dashed space-y-2">
                <label className="font-bold text-[10px] text-amber-800 block uppercase tracking-wider">Validación PIN Administrador *</label>
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center bg-white font-mono tracking-widest text-sm p-1.5 border rounded"
                />
              </div>

              {authError && <p className="text-red-650 text-red-600 text-[10px] text-center font-bold">{authError}</p>}

              <button
                type="submit"
                className="w-full bg-red-700 text-white py-2.5 rounded-lg font-bold hover:bg-red-800 transition shadow-inner"
              >
                Ejecutar Arqueo e Inhabilitar Caja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PRINTER STICKER FOR SPECIFIC WITHDRAWAL EXTRAORDINARY TX */}
      {activeReceiptTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl">
            <div className="bg-gray-100 p-3 border-b flex justify-between items-center text-xs font-bold text-gray-700">
              <span>COMPROBANTE DE MOVIMIENTO</span>
              <button onClick={() => { setActiveReceiptTx(null); }}>×</button>
            </div>

            <div className="p-5 space-y-4">
              <div id="print-receipt-tx" className="bg-white p-4 border border-gray-300 rounded-lg space-y-3 font-mono text-[10px] leading-relaxed text-gray-800 text-center">
                <div className="text-xs font-black tracking-tight">{db.getCompany().name}</div>
                <div className="text-[8px] text-gray-400 border-b border-dashed pb-2">NIT: {db.getCompany().nit} • {db.getCompany().address}</div>

                <div className="text-left space-y-1 pt-1 border-b border-dashed pb-3">
                  <div><strong>COMPROBANTE:</strong> {activeReceiptTx.id}</div>
                  <div><strong>FECHA:</strong> {activeReceiptTx.date} <strong>HORA:</strong> {activeReceiptTx.time}</div>
                  <div><strong>TIPO:</strong> {activeReceiptTx.type === "INFLOW" ? "INGRESO ADICIONAL" : "RETIRO DE CAJA (GASTO)"}</div>
                  <div><strong>AUTORIZA:</strong> {activeReceiptTx.authorizedBy}</div>
                  <div><strong>RESPONSABLE:</strong> {activeReceiptTx.responsibleAdmin}</div>
                </div>

                <div className="text-left bg-gray-50 p-2 rounded text-[10px] border">
                  <strong>MOTIVO:</strong> <span className="text-gray-600 block">{activeReceiptTx.concept}</span>
                </div>

                <div className="text-center pt-2">
                  <span className="text-[9px] text-gray-400 uppercase">MONTO EFECTUADO</span>
                  <strong className="block text-sm font-bold text-gray-900 border-t py-1">
                    ${activeReceiptTx.amount.toLocaleString("es-CO")}
                  </strong>
                </div>

                <div className="pt-2 flex justify-around border-t border-dashed text-[8px] text-gray-400 mt-4 leading-normal">
                  <div className="border-t w-16 pt-1 text-center mt-4">Autorizado por</div>
                  <div className="border-t w-16 pt-1 text-center mt-4">Recibe/Firma</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const markup = document.getElementById("print-receipt-tx")?.innerHTML;
                    const pop = window.open("", "_blank");
                    if (pop) {
                      pop.document.write(`<html><body style="font-family:monospace;padding:10px;"><div style="max-width:250px;margin:0 auto;">${markup}</div><script>window.print();</script></body></html>`);
                      pop.document.close();
                    }
                  }}
                  className="flex-1 bg-gray-950 text-white rounded-lg py-2 text-xs font-bold hover:bg-black flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Comprobante
                </button>
                <button
                  onClick={() => setActiveReceiptTx(null)}
                  className="bg-gray-100 flex-1 hover:bg-gray-250 py-2 rounded text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTER STICKER FOR DECLARED SESSION CLOSING REPORT */}
      {activeSessionClosure && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-1">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              ¡Arqueo Cerrado Exitosamente!
            </h4>

            <div id="print-session-closure-report" className="border p-4 rounded-xl space-y-3 font-mono text-[10px] text-gray-800 bg-white leading-relaxed text-center">
              <div className="text-xs font-black tracking-widest">{db.getCompany().name}</div>
              <div className="text-[8px] text-gray-400 uppercase tracking-wider">REPORTE FINAL DE CIERRE DE CAJA</div>
              
              <div className="text-left space-y-1 pt-2 border-t border-b border-dashed py-3 my-2">
                <div><strong>ID ARQUEO:</strong> {activeSessionClosure.id}</div>
                <div><strong>APERTURA:</strong> {new Date(activeSessionClosure.openedAt).toLocaleString("es-CO")} (<span className="text-gray-500">{activeSessionClosure.openedBy}</span>)</div>
                <div><strong>CIERRE:</strong> {activeSessionClosure.closedAt ? new Date(activeSessionClosure.closedAt).toLocaleString("es-CO") : "-"} (<span className="text-gray-500">{activeSessionClosure.closedBy}</span>)</div>
              </div>

              <div className="text-left space-y-2 border-b pb-3 text-[10px]">
                <div className="flex justify-between">
                  <span>(+) Base inicial fija:</span>
                  <span className="font-bold">${activeSessionClosure.initialBase.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>(+) Ventas POS Turno:</span>
                  <span className="font-bold">+${activeSessionClosure.salesSum.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>(+) Entradas Caja:</span>
                  <span className="font-bold">+${activeSessionClosure.inflowsSum.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>(-) Gastos / Retiros:</span>
                  <span className="font-bold">-${activeSessionClosure.outflowsSum.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-dashed pt-2">
                  <span>(=) EFECTIVO ESPERADO:</span>
                  <span>${activeSessionClosure.expectedCash.toLocaleString("es-CO")}</span>
                </div>
              </div>

              <div className="bg-gray-50 border p-3.5 rounded-lg space-y-1.5 text-left text-[11px] leading-normal font-sans">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Conteo Físico Caja Real:</span>
                  <span className="font-mono">${activeSessionClosure.realCash?.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1.5 border-t text-indigo-950">
                  <span>DIFERENCIA TOTAL:</span>
                  <span className={`font-mono ${activeSessionClosure.difference! < 0 ? "text-red-600 font-extrabold" : "text-emerald-700"}`}>
                    {activeSessionClosure.difference! > 0 ? "+" : ""}${activeSessionClosure.difference?.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 italic pt-1 font-sans text-center">
                  {activeSessionClosure.difference === 0 ? "✓ Cuadre de caja perfecto." : activeSessionClosure.difference! < 0 ? "⚠️ Alerta: Faltante de dinero detectado en Safe." : "💡 Excedente de dinero registrado."}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const data = document.getElementById("print-session-closure-report")?.innerHTML;
                  const pop = window.open("", "_blank");
                  if (pop) {
                    pop.document.write(`<html><body style="font-family:monospace;padding:20px;"><div style="max-width:300px;margin:0 auto;">${data}</div><script>window.print();</script></body></html>`);
                    pop.document.close();
                  }
                }}
                className="flex-1 bg-red-700 text-white rounded-xl py-2 font-bold hover:bg-red-800 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Arqueo
              </button>
              <button
                onClick={() => setActiveSessionClosure(null)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-xs font-semibold hover:bg-gray-200 transition"
              >
                Aceptar y Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

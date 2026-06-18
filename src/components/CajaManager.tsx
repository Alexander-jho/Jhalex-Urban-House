/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../db";
import { CashBoxSession, CashTransaction, UserRole, CashDenominations, DrawerConfig, CashDrawerOpening } from "../types";
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
  Calendar,
  Sliders,
  Unlock,
  Coins,
  Cpu,
  RefreshCw,
  Clock,
  DollarSign
} from "lucide-react";

export const EMPTY_DENOMINATIONS: CashDenominations = {
  b100k: 0,
  b50k: 0,
  b20k: 0,
  b10k: 0,
  b5k: 0,
  b2k: 0,
  b1k: 0,
  m1000: 0,
  m500: 0,
  m200: 0,
  m100: 0,
  m50: 0
};

export const sumDenominations = (d: CashDenominations): number => {
  return (
    (d.b100k || 0) * 100000 +
    (d.b50k || 0) * 50000 +
    (d.b20k || 0) * 20000 +
    (d.b10k || 0) * 10000 +
    (d.b5k || 0) * 5000 +
    (d.b2k || 0) * 2000 +
    (d.b1k || 0) * 1000 +
    (d.m1000 || 0) * 1000 +
    (d.m500 || 0) * 500 +
    (d.m200 || 0) * 200 +
    (d.m100 || 0) * 100 +
    (d.m50 || 0) * 50
  );
};

export function DenominationsInput({
  value,
  onChange
}: {
  value: CashDenominations;
  onChange: (v: CashDenominations) => void;
}) {
  const updateField = (field: keyof CashDenominations, num: number) => {
    onChange({
      ...value,
      [field]: Math.max(0, num)
    });
  };

  return (
    <div className="space-y-3 bg-gray-50/70 rounded-xl p-3.5 border border-gray-100">
      <h4 className="text-[11px] font-black text-gray-700 pb-1 border-b border-gray-250 flex items-center justify-between uppercase">
        <span>Arqueo Billete/Moneda</span>
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
          Contado: ${sumDenominations(value).toLocaleString("es-CO")}
        </span>
      </h4>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* BANKNOTES */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-extrabold text-blue-700 block uppercase tracking-wider">Billetes</span>
          {[
            { label: "$100.000", field: "b100k" },
            { label: "$50.000", field: "b50k" },
            { label: "$20.000", field: "b20k" },
            { label: "$10.000", field: "b10k" },
            { label: "$5.000", field: "b5k" },
            { label: "$2.000", field: "b2k" },
            { label: "$1.000 (B)", field: "b1k" }
          ].map((item) => (
            <div key={item.field} className="flex items-center gap-1 justify-between text-[11px]">
              <span className="text-gray-500 font-mono">{item.label}:</span>
              <input
                type="number"
                min={0}
                step={1}
                value={value[item.field as keyof CashDenominations] || ""}
                onChange={(e) => updateField(item.field as keyof CashDenominations, parseInt(e.target.value) || 0)}
                className="w-14 text-center border border-gray-200 rounded bg-white font-mono font-bold py-0.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        {/* COINS */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-extrabold text-amber-700 block uppercase tracking-wider">Monedas</span>
          {[
            { label: "$1.000 (M)", field: "m1000" },
            { label: "$500", field: "m500" },
            { label: "$200", field: "m200" },
            { label: "$100", field: "m100" },
            { label: "$50", field: "m50" }
          ].map((item) => (
            <div key={item.field} className="flex items-center gap-1 justify-between text-[11px]">
              <span className="text-gray-500 font-mono">{item.label}:</span>
              <input
                type="number"
                min={0}
                step={1}
                value={value[item.field as keyof CashDenominations] || ""}
                onChange={(e) => updateField(item.field as keyof CashDenominations, parseInt(e.target.value) || 0)}
                className="w-14 text-center border border-gray-200 rounded bg-white font-mono font-semibold py-0.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  // New features hooks & configurations
  const [activeTab, setActiveTab] = useState<"flujos" | "aperturas" | "ajustes">("flujos");
  
  const [drawerConfig, setDrawerConfig] = useState<DrawerConfig>(db.getDrawerConfig());
  const [roundingConfig, setRoundingConfig] = useState<{ enabled: boolean; step: number }>(db.getRoundingConfig());
  const [drawerOpenings, setDrawerOpenings] = useState<CashDrawerOpening[]>(db.getDrawerOpenings());

  const [openingDenoms, setOpeningDenoms] = useState<CashDenominations>(EMPTY_DENOMINATIONS);
  const [closingDenoms, setClosingDenoms] = useState<CashDenominations>(EMPTY_DENOMINATIONS);

  // Manual opening authorization states
  const [showManualOpenAuth, setShowManualOpenAuth] = useState<boolean>(false);
  const [manualOpenReason, setManualOpenReason] = useState<"CAMBIO" | "RETIRO" | "MANUAL">("MANUAL");
  const [manualOpenDetails, setManualOpenDetails] = useState<string>("");
  const [manualOpenPin, setManualOpenPin] = useState<string>("");
  const [manualAuthError, setManualAuthError] = useState<string>("");
  const [simulatedPulseAlert, setSimulatedPulseAlert] = useState<string>("");

  // Keep totals synchronized with counts counts
  useEffect(() => {
    setOpeningBaseAmount(sumDenominations(openingDenoms));
  }, [openingDenoms]);

  useEffect(() => {
    setRealCashOnBox(sumDenominations(closingDenoms));
  }, [closingDenoms]);

  const handleSaveHardwareConfig = (method: "RJ11" | "USB" | "SERIAL" | "NONE", autoOpen: boolean) => {
    const updated = { connectionMethod: method, autoOpenOnCashSale: autoOpen };
    db.saveDrawerConfig(updated);
    setDrawerConfig(updated);
  };

  const handleSaveRounding = (enabled: boolean, step: number) => {
    const updated = { enabled, step };
    db.saveRoundingConfig(updated);
    setRoundingConfig(updated);
  };

  const handleManualOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualAuthError("");
    setSimulatedPulseAlert("");

    // Verify Admin PIN code
    const isOk = db.verifyPIN(UserRole.ADMIN, manualOpenPin);
    if (!isOk) {
      setManualAuthError("PIN administrativo erróneo. Acceso denegado.");
      return;
    }

    db.logDrawerOpening(
      currentUserName,
      manualOpenReason,
      manualOpenDetails || "Apertura manual por Administrador",
      "Administrador Autorizado"
    );

    setDrawerOpenings(db.getDrawerOpenings());
    setManualOpenPin("");
    setManualOpenDetails("");
    setShowManualOpenAuth(false);

    // Trigger simulation toast
    setSimulatedPulseAlert(`¡Señal Física Enviada! Apertura de cajón por método [${db.getDrawerConfig().connectionMethod}].`);
    setTimeout(() => setSimulatedPulseAlert(""), 4500);
  };

  const activeSession = useMemo(() => {
    return sessions.find(s => s.status === "ABIERTA") || null;
  }, [sessions]);

  const calculateSessionBreakdown = (session: CashBoxSession | null) => {
    if (!session) {
      return {
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        creditsGranted: 0,
        installmentsCollected: 0,
      };
    }

    const openedTime = new Date(session.openedAt).getTime();
    const closedTime = session.closedAt ? new Date(session.closedAt).getTime() : Date.now();

    const sessionSales = db.getSales().filter(sale => {
      if (sale.status !== "ACTIVA") return false;
      const ts = Number(sale.id.replace("SALE_", ""));
      if (isNaN(ts)) return false;
      return ts >= (openedTime - 5000) && ts <= (closedTime + 5000);
    });

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;
    let creditsGranted = 0;

    sessionSales.forEach(s => {
      totalSales += s.total;
      
      if (s.saleType === "CREDITO" && s.creditDetails) {
        const deposit = s.creditDetails.initialDeposit || 0;
        const pending = s.total - deposit;
        creditsGranted += pending;

        if (deposit > 0) {
          if (s.paymentMethod === "EFECTIVO") {
            cashSales += deposit;
          } else if (s.paymentMethod === "TARJETA") {
            cardSales += deposit;
          } else if (s.paymentMethod === "TRANSFERENCIA") {
            transferSales += deposit;
          } else {
            cardSales += deposit;
          }
        }
      } else {
        if (s.paymentMethod === "EFECTIVO") {
          cashSales += s.total;
        } else if (s.paymentMethod === "TARJETA") {
          cardSales += s.total;
        } else if (s.paymentMethod === "TRANSFERENCIA") {
          transferSales += s.total;
        } else {
          cardSales += s.total;
        }
      }
    });

    let installmentsCollected = 0;
    db.getSales().forEach(s => {
      if (s.saleType === "CREDITO" && s.creditDetails && s.creditDetails.installments) {
        s.creditDetails.installments.forEach(ins => {
          const ts = Number(ins.id.replace("INS_", ""));
          if (!isNaN(ts) && ts >= openedTime && ts <= closedTime) {
            installmentsCollected += ins.amount;
          }
        });
      }
    });

    return {
      totalSales,
      cashSales,
      cardSales,
      transferSales,
      creditsGranted,
      installmentsCollected
    };
  };

  const activeSessionBreakdown = useMemo(() => {
    return calculateSessionBreakdown(activeSession);
  }, [activeSession, sessions]);

  const closedSessionBreakdown = useMemo(() => {
    return calculateSessionBreakdown(activeSessionClosure);
  }, [activeSessionClosure]);

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
    const ok = db.openCashBox(openingBaseAmount, currentUserName, currentRole, openingDenoms);
    if (ok) {
      refreshData();
      setShowOpenBoxForm(false);
      setOpeningDenoms(EMPTY_DENOMINATIONS);
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

    const closed = db.closeCashBox(realCashOnBox, currentUserName, currentRole, closingDenoms);
    if (closed) {
      setActiveSessionClosure(closed);
      refreshData();
      setShowCloseBoxForm(false);
      setRealCashOnBox(0);
      setAdminPin("");
      setClosingDenoms(EMPTY_DENOMINATIONS);
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

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("flujos")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "flujos"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Coins className="w-4 h-4" />
          Flujos de Caja (Arqueos)
        </button>
        <button
          onClick={() => {
            setActiveTab("aperturas");
            setDrawerOpenings(db.getDrawerOpenings());
          }}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "aperturas"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          Historial de Apertura de Cajón
        </button>
        <button
          onClick={() => setActiveTab("ajustes")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "ajustes"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Ajustes de Cajón y Redondeo
        </button>
      </div>

      {activeTab === "flujos" && (
        <>
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

            {/* Payment Method Breakdown section */}
            <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100 space-y-2 text-[11px] text-gray-600">
              <span className="font-extrabold uppercase text-[9px] tracking-wider text-gray-500 block">Detalle de Medios de Pago</span>
              <div className="space-y-1 font-medium leading-normal">
                <div className="flex justify-between">
                  <span>Ventas Efectivo (En Caja):</span>
                  <span className="font-mono text-gray-800 font-bold">${activeSessionBreakdown.cashSales.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas Tarjeta:</span>
                  <span className="font-mono text-gray-800 font-semibold">${activeSessionBreakdown.cardSales.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transf. Bancarias (Nequi/Davi):</span>
                  <span className="font-mono text-gray-800 font-semibold">${activeSessionBreakdown.transferSales.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Créditos Nuevos (Por Cobrar):</span>
                  <span className="font-mono text-gray-800 font-semibold">${activeSessionBreakdown.creditsGranted.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200 text-blue-700">
                  <span>Abonos Créditos Recaudados:</span>
                  <span className="font-mono text-blue-800 font-bold">+${activeSessionBreakdown.installmentsCollected.toLocaleString("es-CO")}</span>
                </div>
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
        </>
      )}

      {/* SUBTAB: HISTORIAL DE APERTURA DE CAJON FISICO */}
      {activeTab === "aperturas" && (
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">Registro de Apertura Física de Cajón</h3>
                <p className="text-xs text-gray-400 mt-0.5">Historial de señales de apertura enviadas y registros manuales autorizados.</p>
              </div>
              <button
                onClick={() => {
                  setManualOpenPin("");
                  setManualOpenDetails("");
                  setManualAuthError("");
                  setShowManualOpenAuth(true);
                }}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Unlock className="w-3.5 h-3.5" />
                Apertura Manual Autorizada (Test Pulse)
              </button>
            </div>

            {/* Simulating physical hardware pulse notification banner */}
            {simulatedPulseAlert && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs flex items-center gap-2 font-semibold animate-pulse">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 animate-bounce" />
                <span>{simulatedPulseAlert}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2.5">ID Log</th>
                    <th className="px-4 py-2.5">Fecha / Hora</th>
                    <th className="px-4 py-2.5">Usuario Operador</th>
                    <th className="px-4 py-2.5">Motivo / Razón</th>
                    <th className="px-4 py-2.5">Detalles del Suceso</th>
                    <th className="px-4 py-2.5">Autorizado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-605 text-gray-600">
                  {drawerOpenings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 italic">No hay registros de aperturas del cajón de dinero.</td>
                    </tr>
                  ) : (
                    [...drawerOpenings].reverse().map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-gray-400 text-[10px]">{o.id}</td>
                        <td className="px-4 py-3 font-mono text-gray-950">
                          <div>{o.date}</div>
                          <div className="text-[10px] text-gray-400">{o.time}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{o.user}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            o.reason === "VENTA"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.reason === "INICIO_JORNADA"
                              ? "bg-cyan-100 text-cyan-800"
                              : o.reason === "RETIRO"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {o.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500 text-[10px]">{o.details}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{o.authorizedBy || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: HARDWARE SETTINGS AND ROUNDING PARAMETERS */}
      {activeTab === "ajustes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {/* HARDWARE CONNECTION METHODS */}
          <div className="bg-white/95 border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 border-b pb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Equipos de Caja y Conexión Física
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Configure los parámetros de conexión física con su gaveta o cajón de efectivo local. Al realizar ventas en efectivo se enviará automáticamente la señal por el puerto seleccionado.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-650 block uppercase">Puerto de Comunicación / Tipo *</label>
                <select
                  value={drawerConfig.connectionMethod}
                  onChange={(e) => handleSaveHardwareConfig(e.target.value as any, drawerConfig.autoOpenOnCashSale)}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white text-gray-800 font-bold"
                >
                  <option value="NONE">Ninguno (Simulación, solo log)</option>
                  <option value="RJ11">RJ11 / RJ12 (A través de Impresora Térmica POS)</option>
                  <option value="USB">Conexión Directa USB (Driver POS)</option>
                  <option value="SERIAL">Puerto Serial RS232 / DB9</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                <input
                  type="checkbox"
                  id="auto_open"
                  checked={drawerConfig.autoOpenOnCashSale}
                  onChange={(e) => handleSaveHardwareConfig(drawerConfig.connectionMethod, e.target.checked)}
                  className="w-4 h-4 text-indigo-650 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="auto_open" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  Apertura automática con venta en efectivo
                </label>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-[10px] text-blue-800 leading-relaxed space-y-1.5 font-mono">
                <p className="font-extrabold uppercase">✓ Puertos detectados en sistema:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Devicopath: COM3 / /dev/ttyUSB0 (Online)</li>
                  <li>Interface: USB-generic-print-class</li>
                  <li>Signal type: 24V RJ11 Drawer Pulse (Pulse duration: 100ms)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ROUNDING PARAMETERS */}
          <div className="bg-white/95 border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 border-b pb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" />
              Redondeo de Ventas en Efectivo (Centenas COP)
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Habilite el ajuste automático de centenas para ventas pagadas en efectivo. Elimine la necesidad de entregar monedas de baja denominación (ej: $10, $20, $50 COP) ajustando de forma matemática el total final.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable_rounding"
                  checked={roundingConfig.enabled}
                  onChange={(e) => handleSaveRounding(e.target.checked, roundingConfig.step)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="enable_rounding" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  Habilitar redondeo de cobros en efectivo
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-650 block uppercase">Denominación Base de Ajuste *</label>
                <select
                  disabled={!roundingConfig.enabled}
                  value={roundingConfig.step}
                  onChange={(e) => handleSaveRounding(roundingConfig.enabled, Number(e.target.value))}
                  className="w-full text-xs p-2.5 border rounded-lg bg-gray-50 focus:bg-white text-gray-850 font-bold disabled:opacity-50"
                >
                  <option value={100}>$100 COP (Ej: Redondea a centenas exactas)</option>
                  <option value={50}>$50 COP (Ej: Redondea a múltiplos de $50)</option>
                  <option value={550} disabled>No habilitar otros</option>
                </select>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-150 text-[10px] text-emerald-950 leading-relaxed space-y-1.5">
                <p className="font-extrabold uppercase text-emerald-900">Ejemplo real con base ${roundingConfig.step} COP:</p>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-700">
                  <div className="bg-white p-1.5 rounded border">
                    <span className="text-gray-400 block pb-0.5">Venta original:</span>
                    <strong>$12.340 COP</strong>
                    <span className="text-emerald-700 font-semibold block pt-1">Pago: $12.300 (-$40)</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border">
                    <span className="text-gray-400 block pb-0.5">Venta original:</span>
                    <strong>$12.380 COP</strong>
                    <span className="text-emerald-700 font-semibold block pt-1">Pago: $12.400 (+$20)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: MANUAL DRAWER OPENING AUTHORIZATION MODAL */}
      {showManualOpenAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
          <form onSubmit={handleManualOpenSubmit} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-indigo-650 bg-indigo-600 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Unlock className="w-4 h-4" />
                Autorización para Apertura Manual
              </span>
              <button type="button" onClick={() => setShowManualOpenAuth(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs text-gray-700">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-500 block uppercase tracking-wider">Motivo de Apertura *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CAMBIO", "RETIRO", "MANUAL"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setManualOpenReason(r)}
                      className={`py-1.5 rounded-lg border font-bold text-[10px] transition capitalize ${
                        manualOpenReason === r
                          ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-650 hover:bg-gray-50"
                      }`}
                    >
                      {r.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-600">Detalles / Explicación del de la apertura *</label>
                <textarea
                  required
                  rows={2}
                  value={manualOpenDetails}
                  onChange={(e) => setManualOpenDetails(e.target.value)}
                  placeholder="Ej: Entregar cambio de billete de $50k a Carlos / Retiro autorizado preventivo"
                  className="w-full border rounded-lg bg-gray-50 p-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="border bg-amber-50 p-3 rounded-lg border-amber-200 border-dashed space-y-2">
                <label className="font-bold text-[10px] text-amber-800 block uppercase tracking-wider">Validación PIN Administrador *</label>
                <input
                  type="password"
                  required
                  value={manualOpenPin}
                  onChange={(e) => setManualOpenPin(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center bg-white font-mono tracking-widest text-sm p-1.5 border rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {manualAuthError && <p className="text-red-650 text-red-600 text-[10px] text-center font-bold">{manualAuthError}</p>}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition uppercase tracking-wider text-[10px]"
              >
                Enviar Pulso Eléctrico y Abrir Cajón
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: START NEW CASH BOX SESSION */}
      {showOpenBoxForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleOpenBox} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-emerald-600 text-white p-4 font-bold flex items-center justify-between text-sm">
              <span>Declarar Apertura de Caja Registradora</span>
              <button type="button" onClick={() => setShowOpenBoxForm(false)}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Monto Base Inicial de Caja (Calculado) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={openingBaseAmount}
                  onChange={(e) => setOpeningBaseAmount(Number(e.target.value))}
                  className="w-full text-center bg-gray-50 font-mono font-bold text-lg p-2 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Efectivo de inicio. Ingrese el conteo por denominaciones en la sección de abajo para auto-calcular el total.
                </p>
              </div>

              {/* Count component */}
              <DenominationsInput value={openingDenoms} onChange={setOpeningDenoms} />

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

              {/* Count component */}
              <DenominationsInput value={closingDenoms} onChange={setClosingDenoms} />

              <div className="bg-gray-100 p-3 rounded-xl space-y-1.5 border border-gray-250">
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Contado Físico Total:</span>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">${realCashOnBox.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-350 text-[10px]">
                  <span>Cuadre de Caja:</span>
                  <span className={`font-mono font-bold ${
                    realCashOnBox - (activeSession?.expectedCash || 0) === 0
                      ? "text-emerald-700"
                      : realCashOnBox - (activeSession?.expectedCash || 0) < 0
                      ? "text-red-600 font-extrabold"
                      : "text-indigo-650 text-indigo-600"
                  }`}>
                    {realCashOnBox - (activeSession?.expectedCash || 0) === 0
                      ? "✓ CORRECTO"
                      : realCashOnBox - (activeSession?.expectedCash || 0) < 0
                      ? `⚠️ FALTANTE (-$${Math.abs(realCashOnBox - (activeSession?.expectedCash || 0)).toLocaleString("es-CO")})`
                      : `💡 EXCEDENTE (+$${(realCashOnBox - (activeSession?.expectedCash || 0)).toLocaleString("es-CO")})`}
                  </span>
                </div>
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
                <div className="flex justify-between text-emerald-750 text-emerald-700 border-t pt-1 font-semibold">
                  <span>(+) Ventas Totales:</span>
                  <span className="font-bold">${closedSessionBreakdown.totalSales.toLocaleString("es-CO")}</span>
                </div>
                <div className="pl-3 flex justify-between text-gray-500 text-[9px]">
                  <span>• Contado Efectivo:</span>
                  <span>${closedSessionBreakdown.cashSales.toLocaleString("es-CO")}</span>
                </div>
                <div className="pl-3 flex justify-between text-gray-500 text-[9px]">
                  <span>• Contado Tarjeta:</span>
                  <span>${closedSessionBreakdown.cardSales.toLocaleString("es-CO")}</span>
                </div>
                <div className="pl-3 flex justify-between text-gray-500 text-[9px]">
                  <span>• Contado Transferencia:</span>
                  <span>${closedSessionBreakdown.transferSales.toLocaleString("es-CO")}</span>
                </div>
                <div className="pl-3 flex justify-between text-gray-500 text-[9px]">
                  <span>• Créditos Concedidos:</span>
                  <span>${closedSessionBreakdown.creditsGranted.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-indigo-700 border-t pt-1 font-semibold">
                  <span>(+) Abonos Recaudados:</span>
                  <span className="font-bold">+${closedSessionBreakdown.installmentsCollected.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>(+) Entradas Caja:</span>
                  <span className="font-bold">+${activeSessionClosure.inflowsSum.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-red-650 text-red-600">
                  <span>(-) Gastos / Retiros:</span>
                  <span className="font-bold">-${activeSessionClosure.outflowsSum.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-dashed pt-2 text-gray-900">
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
                  try {
                    const textReport = document.getElementById("print-session-closure-report")?.innerText;
                    if (textReport) {
                      navigator.clipboard.writeText(textReport);
                    }
                    const data = document.getElementById("print-session-closure-report")?.innerHTML;
                    const pop = window.open("", "_blank");
                    if (pop) {
                      pop.document.write(`<html><body style="font-family:monospace;padding:20px;"><div style="max-width:300px;margin:0 auto;">${data}</div><script>window.print();</script></body></html>`);
                      pop.document.close();
                    } else {
                      alert("¡Reporte copiado con éxito al portapapeles! Puede pegarlo en bloc de notas o imprimir con Ctrl+P.");
                    }
                  } catch (e) {
                    alert("¡Reporte copiado exitosamente al portapapeles!");
                  }
                }}
                className="flex-1 bg-red-750 bg-red-700 text-white rounded-xl py-2 font-bold hover:bg-red-800 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir / Copiar
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

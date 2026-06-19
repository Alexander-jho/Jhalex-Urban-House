/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { db } from "../db";
import { Product, Sale, CashTransaction, UserRole } from "../types";
import { FileSpreadsheet, Download, Upload, BarChart3, FileText, Printer, CheckCircle, ShieldAlert } from "lucide-react";

interface ContabilidadFinancieraProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function ContabilidadFinanciera({ currentRole, currentUserName }: ContabilidadFinancieraProps) {
  const [products] = useState<Product[]>(db.getProducts());
  const [sales] = useState<Sale[]>(db.getSales().filter(s => s.status === "ACTIVA"));
  const [txs] = useState<CashTransaction[]>(db.getTransactions());
  const sessions = db.getCashBoxSessions();
  const activeSession = sessions.find(s => s.status === "ABIERTA");

  // State backups
  const [backupFileContent, setBackupFileContent] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");

  const financialData = useMemo(() => {
    // 1. Expected Cash currently in drawer or last recorded
    const rawCash = activeSession ? activeSession.expectedCash : (sessions[0]?.expectedCash || 200000);

    // 2. Valued Inventory at Cost (Stock * CostPrice)
    const inventoryCostValuation = products.reduce((acc, curr) => acc + (curr.stock * curr.costPrice), 0);
    // Valued Inventory at Retail (Stock * SellPrice)
    const inventoryRetailValuation = products.reduce((acc, curr) => acc + (curr.stock * curr.sellPrice), 0);

    // 3. Outstanding Accounts Receivable (Credit pending balances)
    const accountsReceivable = sales.reduce((acc, curr) => {
      if (curr.creditDetails && curr.creditDetails.status === "PENDIENTE") {
        return acc + curr.creditDetails.pendingBalance;
      }
      return acc;
    }, 0);

    // Total Assets (Efectivo en Caja + Inventario a costo + Cuentas por Cobrar)
    const totalAssets = rawCash + inventoryCostValuation + accountsReceivable;

    // 4. INCOME STATEMENT (ESTADO DE RESULTADOS)
    // 4.1. Total Operational Revenue (All Sales total sum)
    const totalSalesRevenue = sales.reduce((acc, curr) => acc + curr.total, 0);

    // 4.2. Cost of Goods Sold (COGS)
    // COGS = sum(sold item quantity * item costPrice)
    const cogs = sales.reduce((acc, curr) => {
      const saleCogs = curr.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
      return acc + saleCogs;
    }, 0);

    // 4.3. Gross Profit (Revenue - COGS)
    const grossProfit = totalSalesRevenue - cogs;

    // 4.4. Operational Expenses (Outflows from Cash drawer)
    const operationalExpenses = txs.reduce((acc, curr) => {
      if (curr.type === "OUTFLOW") {
        return acc + curr.amount;
      }
      return acc;
    }, 0);

    // 4.5. Extra Inflow adjustments
    const extraordinaryInflows = txs.reduce((acc, curr) => {
      if (curr.type === "INFLOW") {
         return acc + curr.amount;
      }
      return acc;
    }, 0);

    // 4.6. Net Profit (Gross Profit - Expenses + Extra Inflows)
    const netProfit = grossProfit - operationalExpenses + extraordinaryInflows;

    return {
      rawCash,
      inventoryCostValuation,
      inventoryRetailValuation,
      accountsReceivable,
      totalAssets,
      totalSalesRevenue,
      cogs,
      grossProfit,
      operationalExpenses,
      extraordinaryInflows,
      netProfit
    };
  }, [products, sales, txs, activeSession, sessions]);

  // BACKUP OPERATIONS
  const triggerExportBackup = () => {
    const backupJsonStr = db.exportBackupData();
    const blob = new Blob([backupJsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SMAJ_BACKUP_SQLITE_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    
    // Log audit
    db.logAudit(
      currentUserName,
      currentRole,
      "EXPATRIAR_RESPALDO",
      "Mantenimiento",
      "Respaldo de información generado y descargado."
    );
  };

  const triggerImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorText("");
    setUploadSuccess("");
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const str = reader.result as string;
        const indexSuccessful = db.importBackupData(str, currentUserName);
        if (indexSuccessful) {
          setUploadSuccess("Base de datos restaurada con éxito. Por favor recargue el software.");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setErrorText("Error de lectura: El archivo proporcionado no tiene la estructura de SMAJ.");
        }
      };
      reader.readAsText(file);
    }
  };

  // EXCEL / CSV DUMP GENERATOR
  const triggerExportInventaryCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Codigo,Barras,Producto,Categoria,Marca,Modelo,Talla,Color,Costo,PrecioVenta,Stock,StockMinimo\n";
    
    products.forEach((p) => {
      const row = [
        p.id,
        p.code,
        p.barCode,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.brand,
        p.model,
        p.size,
        p.color,
        p.costPrice,
        p.sellPrice,
        p.stock,
        p.minStock
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `SMAJ_INVENTARIO_VALORIZADO_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Módulo de Contabilidad y Resguardo</h2>
          <p className="text-xs text-gray-500 mt-1">
            Balances generales, estados de pérdidas y ganancias en tiempo real. Exportación de información y copias de seguridad locales.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={triggerExportBackup}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-3.5 py-2 rounded-xl font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Copias de Seguridad (JSON)
          </button>
          
          <label className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl font-bold cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            Restaurar Datos
            <input
              type="file"
              accept=".json"
              onChange={triggerImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {errorText && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <span>{errorText}</span>
        </div>
      )}

      {/* CORE FINANCIALS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-fit" id="print-financial-dossier">
        
        {/* BALANCE GENERAL CARD (BASIC) */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-sm text-gray-950 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-indigo-600" />
              Balance General Básico (Finanzas)
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Exp: {new Date().toISOString().split("T")[0]}</span>
          </div>

          <div className="space-y-4 text-xs font-medium">
            <div className="space-y-2">
              <span className="font-extrabold text-indigo-700 block text-[10px] uppercase tracking-wider">Activos de la Empresa</span>
              <div className="flex justify-between py-1 border-b border-gray-55 border-dashed">
                <span>Efectivo en Caja Registradora:</span>
                <span className="font-mono font-bold text-gray-850">${financialData.rawCash.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-55 border-dashed">
                <span>Inventario Físico (A Costo):</span>
                <span className="font-mono font-bold text-gray-850">${financialData.inventoryCostValuation.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-55 border-dashed">
                <span>Cuentas por Cobrar (Créditos vigentes):</span>
                <span className="font-mono font-bold text-gray-850">${financialData.accountsReceivable.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t pt-2 text-indigo-950">
                <span>TOTAL ACTIVOS ESTIMADOS:</span>
                <span className="font-mono text-lg">${financialData.totalAssets.toLocaleString("es-CO")}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-extrabold text-gray-550 text-gray-500 block text-[10px] uppercase tracking-wider">Patrimonio Neto</span>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span>Capital Social Declarado:</span>
                <span className="font-mono font-bold text-gray-800">${financialData.totalAssets.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-gray-950">
                <span>TOTAL PATRIMONIO:</span>
                <span className="font-mono text-base">${financialData.totalAssets.toLocaleString("es-CO")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* INCOME STATEMENT CARD (LOSS & PROFITS) */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-sm text-gray-950 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-emerald-600" />
              Estado de Resultados (Ganancias/Pérdidas)
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Total Acumulado</span>
          </div>

          <div className="space-y-4 text-xs font-medium">
            <div className="space-y-2">
              <span className="font-extrabold text-emerald-700 block text-[10px] uppercase tracking-wider">Ingresos Operacionales</span>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span>Ventas Totales Brutas:</span>
                <span className="font-mono font-semibold">${financialData.totalSalesRevenue.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed text-red-650 text-red-650">
                <span>(-) Costo de Mercancía Vendida (COGS):</span>
                <span className="font-mono font-semibold text-red-600">-${financialData.cogs.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-emerald-950">
                <span>(=) UTILIDAD BRUTA ESTIMADA:</span>
                <span className="font-mono">${financialData.grossProfit.toLocaleString("es-CO")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-extrabold text-red-650 text-red-600 block text-[10px] uppercase tracking-wider">Egresos / Gastos</span>
              <div className="flex justify-between py-1 border-b border-dashed text-red-600">
                <span>(-) Retiros Egreso de Caja Registradora:</span>
                <span className="font-mono font-semibold">-${financialData.operationalExpenses.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed text-blue-600">
                <span>(+) Entradas extra de Capital:</span>
                <span className="font-mono font-semibold">+${financialData.extraordinaryInflows.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex justify-between font-black border-t-2 pt-2 text-gray-900 text-sm">
                <span>(=) GASTO OPERACIONAL / UTILIDAD NETA:</span>
                <span className={`font-mono text-lg ${financialData.netProfit >= 0 ? "text-emerald-700 font-extrabold" : "text-red-750 text-red-600"}`}>
                  ${financialData.netProfit.toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VALUED INVENTORY SUMMARY PORT & EXCEL TRIGGER */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <h3 className="font-bold text-sm text-gray-950 uppercase tracking-wide">Valoración Activa de Inventario Físico</h3>
            <p className="text-[10px] text-gray-400 font-medium">Inventario multiplicado por valores costo/venta para auditorías.</p>
          </div>
          
          <button
            onClick={triggerExportInventaryCSV}
            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs px-3.5 py-1.5 rounded-lg font-bold transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Descargar Libro de Excel (.CSV)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 border rounded-xl p-3 text-xs text-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Prendas en Stock Físico</span>
            <strong className="font-mono text-gray-800 text-lg">
              {products.reduce((acc, curr) => acc + curr.stock, 0)} unidades
            </strong>
          </div>
          <div className="bg-gray-50 border rounded-xl p-3 text-xs text-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Costo Valorizado</span>
            <strong className="font-mono text-amber-700 text-lg">
              ${financialData.inventoryCostValuation.toLocaleString("es-CO")}
            </strong>
          </div>
          <div className="bg-gray-50 border rounded-xl p-3 text-xs text-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Proyección Venta Retail</span>
            <strong className="font-mono text-emerald-700 text-lg">
              ${financialData.inventoryRetailValuation.toLocaleString("es-CO")}
            </strong>
          </div>
        </div>
      </div>

      {/* PRINT REPORT DOSSIER BAR BUTTON */}
      <div className="text-center">
        <button
          onClick={() => {
            const markup = document.getElementById("print-financial-dossier")?.innerHTML;
            const pop = window.open("", "_blank");
            if (pop) {
              pop.document.write(`
                <html>
                  <head>
                    <title>Reporte Financiero SMAJ URBAN CLOTHING</title>
                    <style>
                      body { font-family: sans-serif; padding: 40px; color: #111; line-height: 1.5; }
                      .financial-grid { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
                      h3 { border-bottom: 2px solid #000; padding-bottom: 5px; }
                      .flex { display: flex; justify-content: space-between; margin-bottom: 5px; }
                      strong { font-weight: bold; }
                    </style>
                  </head>
                  <body>
                    <h2>SMAJ URBAN CLOTHING - DOSSIER FINANCIERO</h2>
                    <p style="font-size:11px;color:#666;">Cerrado al: ${new Date().toLocaleString("es-CO")}</p>
                    <div>${markup}</div>
                    <script>window.print();</script>
                  </body>
                </html>
              `);
              pop.document.close();
            }
          }}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs py-3.5 px-6 rounded-xl inline-flex items-center gap-1.5 shadow-md active:scale-95 transition"
        >
          <Printer className="w-4 h-4" />
          Descargar Reporte Completo en PDF / Imprimir Balances
        </button>
      </div>
    </div>
  );
}

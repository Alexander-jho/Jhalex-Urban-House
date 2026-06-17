/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { db } from "../db";
import { Product, Sale, Client, Vendedor } from "../types";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  AlertTriangle,
  Layers,
  Users,
  Backpack,
  Activity,
  Award,
  CircleAlert
} from "lucide-react";

export function ReportesDash() {
  const products: Product[] = db.getProducts();
  const sales: Sale[] = db.getSales().filter(s => s.status === "ACTIVA");
  const clientes: Client[] = db.getClientes().filter(c => c.id !== "GENERICO");
  const sessions = db.getCashBoxSessions();
  const activeSession = sessions.find(s => s.status === "ABIERTA");

  const todayStr = new Date().toISOString().split("T")[0];

  // METRICS CALCULATIONS
  const stats = useMemo(() => {
    // 1. Sales of today
    const salesToday = sales.filter(s => s.date === todayStr);
    const totalSalesToday = salesToday.reduce((acc, curr) => acc + curr.total, 0);

    // 2. Active Cash holdings inside register box
    const cashAvailable = activeSession ? activeSession.expectedCash : 0;

    // 3. Products sold count
    const totalItemsSold = sales.reduce((acc, curr) => {
      return acc + curr.items.reduce((a, c) => a + c.quantity, 0);
    }, 0);

    // 4. Low stock count
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    // 5. Total inventory valuation at COST & SELL price
    const inventarioUnidadesCount = products.reduce((acc, curr) => acc + curr.stock, 0);
    const inventarioValCosto = products.reduce((acc, curr) => acc + (curr.costPrice * curr.stock), 0);
    const inventarioValVenta = products.reduce((acc, curr) => acc + (curr.sellPrice * curr.stock), 0);

    // 6. Net Profit earned mathematically
    // profit = items sold * (sellPrice - costPrice)
    // factoring custom percentage item.discountPercent
    const totalEarningsProfit = sales.reduce((acc, s) => {
      const saleMargin = s.items.reduce((sum, item) => {
        const actualReceiptPrice = item.sellPrice * (1 - (s.discountPercent / 100));
        const profitPerItem = actualReceiptPrice - item.costPrice;
        return sum + (profitPerItem * item.quantity);
      }, 0);
      return acc + saleMargin;
    }, 0);

    // Outstanding credits pending sum
    const totalCreditsPending = sales.reduce((acc, curr) => {
      if (curr.creditDetails && curr.creditDetails.status === "PENDIENTE") {
        return acc + curr.creditDetails.pendingBalance;
      }
      return acc;
    }, 0);

    return {
      totalSalesToday,
      cashAvailable,
      totalItemsSold,
      lowStockCount,
      inventarioUnidadesCount,
      inventarioValCosto,
      inventarioValVenta,
      totalEarningsProfit,
      totalCreditsPending
    };
  }, [sales, products, activeSession, todayStr]);

  // CATEGORY REPRESENTATION (For SVG Bar chart)
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = { Ropa: 0, Zapatos: 0, Accesorios: 0, Lociones: 0, Bolsos: 0 };
    sales.forEach(s => {
      s.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const cat = p ? p.category : "Ropa";
        if (counts[cat] !== undefined) {
          counts[cat] += item.quantity;
        } else {
          counts[cat] = item.quantity;
        }
      });
    });
    return Object.keys(counts).map(k => ({ name: k, total: counts[k] }));
  }, [sales, products]);

  // DAILY INCOME LINE MATRIX (Past 7 days including today)
  const last7DaysChartData = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0];
      const matchSales = sales.filter(s => s.date === str);
      const sum = matchSales.reduce((acc, curr) => acc + curr.total, 0);
      const label = d.toLocaleDateString("es-CO", { weekday: "short" });
      list.push({ label, amount: sum });
    }
    return list;
  }, [sales]);

  const maxChartVal = useMemo(() => {
    const max = Math.max(...last7DaysChartData.map(d => d.amount));
    return max <= 0 ? 100000 : max;
  }, [last7DaysChartData]);

  // Alert highlight catalog products list
  const criticalLowProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock).slice(0, 5);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Overview stats cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales today */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:scale-[1.01] transition duration-150">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider block">Ventas de Hoy</span>
            <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className="text-gray-950 font-mono font-bold text-2xl block">
              ${stats.totalSalesToday.toLocaleString("es-CO")}
            </strong>
            <span className="text-[10px] text-gray-400 font-mono">Corte local al día</span>
          </div>
        </div>

        {/* Profits */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:scale-[1.01] transition duration-150">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider block">Margen de Ganancia</span>
            <div className="bg-indigo-50 text-indigo-700 p-2 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className="text-gray-950 font-mono font-bold text-2xl block">
              ${stats.totalEarningsProfit.toLocaleString("es-CO")}
            </strong>
            <span className="text-[10px] text-gray-400 font-mono">Suma EBITDA de ventas activas</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:scale-[1.01] transition duration-150">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider block">Insumos Agotándose</span>
            <div className={`p-2 rounded-xl ${stats.lowStockCount > 0 ? "bg-red-50 text-red-650" : "bg-gray-50 text-gray-400"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className={`font-mono font-bold text-2xl block ${stats.lowStockCount > 0 ? "text-red-600" : "text-gray-950"}`}>
              {stats.lowStockCount} refs
            </strong>
            <span className="text-[10px] text-gray-400 font-mono">Bajo el umbral mínimo</span>
          </div>
        </div>

        {/* Cash in register session */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:scale-[1.01] transition duration-150">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider block">Efectivo en Caja</span>
            <div className="bg-amber-50 text-amber-700 p-2 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <strong className="text-gray-950 font-mono font-bold text-2xl block">
              ${stats.cashAvailable.toLocaleString("es-CO")}
            </strong>
            <span className="text-[10px] text-gray-400 font-mono">
              {activeSession ? "Arqueo de sesión activo" : "Caja total cerrada"}
            </span>
          </div>
        </div>
      </div>

      {/* METRIC GRAPHICS GRIDS (Columns 2 - Lines and Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly sales SVG line graph card */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-gray-950 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-indigo-600" />
              Ingresos de la Semana
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Resumen de Ventas</span>
          </div>

          <div className="w-full h-48 relative pt-4 flex items-end">
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[9px] text-gray-400 font-mono pr-2 border-r">
              <span>${maxChartVal.toLocaleString("es-CO")}</span>
              <span>${(maxChartVal / 2).toLocaleString("es-CO")}</span>
              <span>$0</span>
            </div>
            
            <div className="flex-1 h-36 ml-20 flex justify-between items-end relative">
              {/* Grid guide background lines */}
              <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-100 w-full" />
              <div className="absolute inset-x-0 top-[50%] border-t border-dashed border-gray-100 w-full" />
              <div className="absolute inset-x-0 bottom-0 border-t border-gray-250 w-full" />

              {/* Render lines and columns */}
              {last7DaysChartData.map((d, index) => {
                const percentHeight = Math.max(5, (d.amount / maxChartVal) * 100);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div className="absolute bottom-full mb-1 bg-gray-950 text-white rounded text-[9px] px-1.5 py-0.5 font-mono opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                      ${d.amount.toLocaleString("es-CO")}
                    </div>
                    
                    <div
                      style={{ height: `${percentHeight}%` }}
                      className="w-5 bg-gradient-to-t from-indigo-500/80 to-indigo-600 rounded-t-sm hover:brightness-110 transition"
                    />
                    
                    <span className="text-[9px] text-gray-400 font-semibold font-mono mt-2 uppercase">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom sold categories visual horizontal bars card */}
        <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-gray-950 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-amber-500" />
              Productos por Categoría
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-bold">Uds vendidas</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {categoryStats.map((c, i) => {
              const maxUnits = Math.max(...categoryStats.map(o => o.total)) || 1;
              const widthRatio = (c.total / maxUnits) * 100;
              return (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>{c.name}</span>
                    <span className="font-mono text-gray-900">{c.total} unidades</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      style={{ width: `${Math.max(3, widthRatio)}%` }}
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LOWER NOTIFICATION WARNING BANNER (Alert for critically low stocks) */}
      {criticalLowProducts.length > 0 && (
        <div className="bg-red-50 border border-red-150 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-widest">
            <CircleAlert className="w-5 h-5 text-red-650 animate-bounce" />
            Alerta Crítica: Re-abastecimiento del Inventario Requerido
          </div>
          <p className="text-xs text-red-600">
            Los siguientes artículos de moda urbana han cruzado o igualado las existencias mínimas de seguridad fijadas por el Administrador:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-xs font-medium text-gray-700">
            {criticalLowProducts.map((p) => {
              return (
                <div key={p.id} className="bg-white border rounded-xl p-3 flex justify-between items-center shadow-xs">
                  <div>
                    <span className="font-bold text-gray-900 block truncate max-w-[150px]">{p.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">Ref: {p.code} • Talla: {p.size}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                      {p.stock} uds disp
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">Mínimo: {p.minStock}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

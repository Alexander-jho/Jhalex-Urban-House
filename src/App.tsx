/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserRole, CompanyConfig } from "./types";
import { db } from "./db";
import { UserSelection } from "./components/UserSelection";
import { ReportesDash } from "./components/ReportesDash";
import { SalesPOS } from "./components/SalesPOS";
import { InventoryManager } from "./components/InventoryManager";
import { CajaManager } from "./components/CajaManager";
import { VendedorManager } from "./components/VendedorManager";
import { ClientesFidelizacion } from "./components/ClientesFidelizacion";
import { DescuentosPromociones } from "./components/DescuentosPromociones";
import { ContabilidadFinanciera } from "./components/ContabilidadFinanciera";
import { AuditoriaLogs } from "./components/AuditoriaLogs";
import { CompanySettings } from "./components/CompanySettings";
import { EtiquetasBarras } from "./components/EtiquetasBarras";
import { ProveedoresCompras } from "./components/ProveedoresCompras";
import { useAppearance } from "./components/AppearanceContext";

import {
  LayoutDashboard,
  ShoppingBag,
  Layers,
  Wallet,
  Users,
  Gift,
  Tags,
  BarChart3,
  ShieldCheck,
  Building,
  LogOut,
  Sparkles,
  WifiOff,
  Barcode,
  Truck
} from "lucide-react";

export default function App() {
  const { mode, setMode } = useAppearance();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("pos");
  const [company, setCompany] = useState<CompanyConfig>(db.getCompany());

  // Periodically refresh company info (like logos and name changed)
  const reloadCompanyInfo = () => {
    setCompany(db.getCompany());
  };

  // Default initial active tabs based on roles
  useEffect(() => {
    if (selectedRole === UserRole.SELLER) {
      setActiveTab("pos");
    } else {
      setActiveTab("dash");
    }
  }, [selectedRole]);

  // Handle successful login from PIN keypad
  const handleLoginSuccess = (role: UserRole, operatorName: string) => {
    setSelectedRole(role);
    setUserName(operatorName);
  };

  const handleLogout = () => {
    if (confirm("¿Desea cerrar el turno activo y cambiar de operador?")) {
      setSelectedRole(null);
      setUserName("");
    }
  };

  // Setup tabs config to match roles
  const tabsList = [
    { id: "dash", label: "Consola de Métricas", icon: LayoutDashboard, role: UserRole.ADMIN },
    { id: "pos", label: "Punto de Venta POS", icon: ShoppingBag, role: UserRole.SELLER }, // both can access POS
    { id: "inventory", label: "Inventarios & Moda", icon: Layers, role: UserRole.ADMIN },
    { id: "thirdparty", label: "Proveedores & Compras", icon: Truck, role: UserRole.ADMIN },
    { id: "labels", label: "Impresión de Etiquetas", icon: Barcode, role: UserRole.ADMIN },
    { id: "caja", label: "Arqueo de Caja", icon: Wallet, role: UserRole.SELLER }, // both can access Caja
    { id: "vendedores", label: "Nómina Vendedores", icon: Users, role: UserRole.ADMIN },
    { id: "clientes", label: "Fidelización", icon: Gift, role: UserRole.SELLER }, // both can manage customers
    { id: "promos", label: "Promociones", icon: Tags, role: UserRole.ADMIN },
    { id: "accounting", label: "Contabilidad", icon: BarChart3, role: UserRole.ADMIN },
    { id: "auditoria", label: "Seguridad / Logs", icon: ShieldCheck, role: UserRole.ADMIN },
    { id: "company", label: "Config. Empresa", icon: Building, role: UserRole.ADMIN }
  ];

  // Filtering tabs list based on authorization
  const visibleTabs = tabsList.filter((tab) => {
    if (selectedRole === UserRole.ADMIN) return true;
    return tab.role === UserRole.SELLER;
  });

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-linear-to-tr from-gray-900 via-gray-950 to-gray-900 flex items-center justify-center p-4">
        <UserSelection
          currentRole={UserRole.SELLER}
          currentUserName=""
          onSessionChanged={(session) => {
            setSelectedRole(session.role);
            setUserName(session.name);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-300 relative ${
      mode === "LIQUID" 
        ? "bg-slate-100 text-slate-900 overflow-x-hidden" 
        : "bg-slate-50/50 text-gray-800"
    }`}>
      
      {/* Dynamic Animated Blobs for Liquid Mode Background Depth */}
      {mode === "LIQUID" && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[5%] left-[25%] w-[380px] h-[380px] rounded-full bg-linear-to-tr from-indigo-200/35 via-violet-300/30 to-indigo-100/10 blur-[90px] animate-liquid-blob-1" />
          <div className="absolute bottom-[15%] right-[10%] w-[450px] h-[450px] rounded-full bg-linear-to-tr from-cyan-200/30 via-pink-200/25 to-purple-100/15 blur-[100px] animate-liquid-blob-2" />
          <div className="absolute top-[60%] left-[2%] w-[320px] h-[320px] rounded-full bg-violet-300/25 to-indigo-200/15 blur-[80px] animate-liquid-blob-1" />
        </div>
      )}

      {/* Brand Watermark (id="real_liquid_glass_brand_ui") */}
      {company.watermarkEnabled !== false && company.logo && (
        <div 
          id="real_liquid_glass_brand_ui"
          className={`fixed pointer-events-none z-0 transition-all duration-500 select-none ${
            company.watermarkPosition === "TOP_LEFT" ? "top-20 left-10" :
            company.watermarkPosition === "TOP_RIGHT" ? "top-20 right-10" :
            company.watermarkPosition === "BOTTOM_LEFT" ? "bottom-20 left-10" :
            company.watermarkPosition === "BOTTOM_RIGHT" ? "bottom-20 right-20" :
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" // default CENTER
          }`}
          style={{
            opacity: (company.watermarkOpacity ?? 12) / 100,
            width: `${(company.watermarkScale ?? 35) * 12}px`,
            maxWidth: '85vw',
            filter: mode === "LIQUID" ? "invert(1) brightness(0.6) blur(2px)" : "contrast(90%) blur(1px)",
          }}
        >
          <img 
            src={company.logo} 
            alt="JHALEX BRANDING WATERMARK" 
            className="w-full h-auto object-contain select-none opacity-80"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* GLOWING HIGH TOP BAR */}
      <header className={`sticky top-0 z-40 px-5 py-3 flex items-center justify-between transition-all duration-300 shrink-0 ${
        mode === "LIQUID" 
          ? "bg-slate-900/90 backdrop-blur-md border-b border-white/10 text-white shadow-xl" 
          : "bg-slate-950 text-white border-b border-gray-850 shadow-md"
      }`}>
        <div className="flex items-center gap-3">
          {company.logo ? (
            <img
              src={company.logo}
              alt="Logo"
              className="w-9 h-9 rounded-xl object-contain bg-white border border-gray-800 p-0.5"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-indigo-650 flex items-center justify-center font-bold text-sm tracking-wide bg-indigo-655 text-white">
              JH
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-sans font-black tracking-wider text-xs uppercase text-indigo-400">JHALEX</span>
              <span className="font-extrabold text-[10px] bg-indigo-650/40 text-indigo-300 px-1.5 py-0.5 rounded-md font-mono">PRO</span>
            </div>
            <h1 className="text-sm font-bold text-gray-100 tracking-tight mt-0.5 uppercase">
              {company.name}
            </h1>
          </div>
        </div>

        {/* Info Right controls */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
          {/* OFFLINE GREEN ACCENT indicator */}
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full text-emerald-400 text-[10px]">
            <WifiOff className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>MODO OFFLINE</span>
          </div>

          {/* Premium UI Mode Segmented Control */}
          <div className="flex items-center gap-0.5 bg-black/35 backdrop-blur-xs border border-white/15 p-0.5 rounded-lg select-none">
            <button
              onClick={() => setMode("CLEAR")}
              type="button"
              className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest transition-all duration-200 flex items-center gap-1 cursor-pointer focus:outline-none ${
                mode === "CLEAR"
                  ? "bg-white text-gray-950 shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${mode === "CLEAR" ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-gray-500"}`} />
              CLEAR
            </button>
            <button
              onClick={() => setMode("LIQUID")}
              type="button"
              className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest transition-all duration-200 flex items-center gap-1 cursor-pointer focus:outline-none ${
                mode === "LIQUID"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${mode === "LIQUID" ? "bg-cyan-300 animate-pulse shadow-[0_0_8px_#67e8f9]" : "bg-gray-500"}`} />
              LIQUID
            </button>
          </div>

          <div className="text-right">
            <div className="text-gray-300 font-bold flex items-center gap-1 justify-end">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {userName}
            </div>
            <div className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">
              OP: {selectedRole}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Cambiar Operador"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-850 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row z-10 relative overflow-hidden">
        
        {/* SIDE BAR NAVIGATION SELECTORS */}
        <aside className={`w-full md:w-60 p-4 shrink-0 flex flex-col gap-2 transition-all duration-300 ${
          mode === "LIQUID" 
            ? "bg-white/40 backdrop-blur-lg border-r border-white/50" 
            : "bg-white border-r border-gray-200"
        }`}>
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest pl-2 mb-1.5 block">
            Navegación Sistema
          </span>

          <nav className="space-y-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight transition duration-150 cursor-pointer ${
                    isActive
                      ? mode === "LIQUID"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-[1.01]"
                        : "bg-gray-950 text-white shadow-xs"
                      : mode === "LIQUID"
                        ? "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                        : "text-gray-550 hover:text-gray-950 hover:bg-gray-100/70"
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? (mode === "LIQUID" ? "text-cyan-300" : "text-indigo-400") : "text-gray-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN PANEL CONTENT LOADER WRAPPER */}
        <main className="flex-1 p-6 overflow-y-auto z-10 relative">
          {activeTab === "dash" && selectedRole === UserRole.ADMIN && <ReportesDash />}
          
          {activeTab === "pos" && (
            <SalesPOS
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "inventory" && selectedRole === UserRole.ADMIN && (
            <InventoryManager
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "thirdparty" && selectedRole === UserRole.ADMIN && (
            <ProveedoresCompras
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "labels" && selectedRole === UserRole.ADMIN && (
            <EtiquetasBarras
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "caja" && (
            <CajaManager
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "vendedores" && selectedRole === UserRole.ADMIN && (
            <VendedorManager
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "clientes" && (
            <ClientesFidelizacion
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "promos" && selectedRole === UserRole.ADMIN && (
            <DescuentosPromociones
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "accounting" && selectedRole === UserRole.ADMIN && (
            <ContabilidadFinanciera
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "auditoria" && selectedRole === UserRole.ADMIN && (
            <AuditoriaLogs
              currentRole={selectedRole}
              currentUserName={userName}
            />
          )}

          {activeTab === "company" && selectedRole === UserRole.ADMIN && (
            <CompanySettings
              currentRole={selectedRole}
              currentUserName={userName}
              onCompanyChange={reloadCompanyInfo}
            />
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className={`py-3.5 px-6 flex flex-col sm:flex-row justify-between items-center text-[11px] font-medium transition-all duration-300 z-15 shrink-0 ${
        mode === "LIQUID" 
          ? "bg-white/40 backdrop-blur-lg border-t border-white/50 text-slate-500" 
          : "bg-white border-t border-gray-250 text-gray-400"
      }`}>
        <span>© 2026 JHALEX URBAN HOUSE PRO — Suite Integral de Comercio.</span>
        <span className="font-mono tracking-wider text-[10px] mt-1 sm:mt-0">
          Base de Datos: SQLITE Emu (Offline Local Storage) • Versión 1.2.0
        </span>
      </footer>
    </div>
  );
}

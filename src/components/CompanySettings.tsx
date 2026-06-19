/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { db } from "../db";
import { CompanyConfig, UserRole } from "../types";
import { useAppearance } from "./AppearanceContext";
import { 
  Building2, 
  Save, 
  Upload, 
  Eye, 
  ShieldAlert, 
  CheckCircle, 
  AlertOctagon,
  Scale,
  ShieldCheck,
  Building,
  SlidersHorizontal,
  Sparkles,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  Globe
} from "lucide-react";

interface CompanySettingsProps {
  currentRole: UserRole;
  currentUserName: string;
  onCompanyChange?: () => void;
}

export function CompanySettings({ currentRole, currentUserName, onCompanyChange }: CompanySettingsProps) {
  const { mode } = useAppearance();
  const [config, setConfig] = useState<CompanyConfig>(db.getCompany());
  const [logoPreview, setLogoPreview] = useState<string>(config.logo);
  const [adminPin, setAdminPin] = useState<string>("");
  const [authorized, setAuthorized] = useState<boolean>(currentRole === UserRole.ADMIN);
  const [errorCode, setErrorCode] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [subTab, setSubTab] = useState<"GENERAL" | "LEGAL" | "TAX" | "DIAN" | "BRAND">("GENERAL");

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setConfig(prev => ({ ...prev, logo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const verifyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode("");
    const ok = db.verifyPIN(UserRole.ADMIN, adminPin);
    if (ok) {
      setAuthorized(true);
      setAdminPin("");
    } else {
      setErrorCode("Contraseña de administrador incorrecta");
    }
  };

  const handleSave = () => {
    setSuccess("");
    if (!authorized && currentRole !== UserRole.ADMIN) {
      setErrorCode("No tiene autorización para modificar los datos de la empresa.");
      return;
    }
    
    db.saveCompany(config, currentUserName, currentRole);
    if (onCompanyChange) {
      onCompanyChange();
    }
    setSuccess("Los datos de SMAJ URBAN CLOTHING se actualizaron correctamente.");
    setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  const selectPresetLogo = (presetUrl: string) => {
    setLogoPreview(presetUrl);
    setConfig(prev => ({ ...prev, logo: presetUrl }));
  };

  // Stock preset options for quick brand personalization
  const PRESET_LOGOS = [
    { name: "Urban Default", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop&q=80" },
    { name: "Gold Retro", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop&q=80" },
    { name: "Neon Street", url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200&h=200&fit=crop&q=80" },
  ];

  return (
    <div className={`${
      mode === "LIQUID"
        ? "liquid-glass-card shadow-xs animate-fade-in"
        : "bg-white border border-gray-200 shadow-2xs animate-fade-in"
    } rounded-2xl p-6`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Módulo Empresarial & Cumplimiento Legal</h2>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-200 uppercase tracking-wider self-start md:self-auto">
          Colombia DIAN Ready
        </span>
      </div>

      {!authorized && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-center">
          <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="font-semibold text-amber-900">Operación Restringida</h3>
          <p className="text-xs text-amber-700 mt-1 mb-4">
            Modificar el nombre, NIT, dirección o resoluciones legales de la empresa requiere autenticación de administrador por seguridad.
          </p>
          <form onSubmit={verifyAdmin} className="max-w-xs mx-auto flex gap-2">
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="PIN de Administrador"
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-center font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
            >
              Verificar
            </button>
          </form>
          {errorCode && <p className="text-red-600 text-xs mt-2 font-medium">{errorCode}</p>}
        </div>
      )}

      {/* Sub-Tab Navigation Header */}
      <div className={`flex flex-wrap gap-1 border-b border-gray-100 pb-3 mb-6 overflow-x-auto ${!authorized ? "opacity-30 pointer-events-none" : ""}`}>
        <button
          onClick={() => setSubTab("GENERAL")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "GENERAL"
              ? "bg-slate-900 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-105"
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          General & Contacto
        </button>
        <button
          onClick={() => setSubTab("LEGAL")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "LEGAL"
              ? "bg-slate-900 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-105"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Información Legal (NIT)
        </button>
        <button
          onClick={() => setSubTab("TAX")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "TAX"
              ? "bg-slate-900 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-105"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Config. Tributaria
        </button>
        <button
          onClick={() => setSubTab("DIAN")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "DIAN"
              ? "bg-slate-900 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-105"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Facturación Electrónica DIAN
        </button>
        <button
          onClick={() => setSubTab("BRAND")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "BRAND"
              ? "bg-slate-900 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-105"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Marca de Agua SMAJ
        </button>
      </div>

      {/* Settings Grid Content */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${!authorized ? "opacity-30 pointer-events-none" : ""}`}>
        
        {/* Left Side: Active Form Tab (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-5 bg-gray-50/40 p-5 rounded-2xl border border-gray-150">
          
          {subTab === "GENERAL" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <span>1. Datos del Almacén & Dirección</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Nombre Comercial</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Descripción Comercial (Slogan)</label>
                  <input
                    type="text"
                    value={config.commercialInfo}
                    onChange={(e) => setConfig(prev => ({ ...prev, commercialInfo: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Dirección Física del Local</label>
                  <input
                    type="text"
                    value={config.address}
                    onChange={(e) => setConfig(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Ciudad de Operación</label>
                  <input
                    type="text"
                    value={config.city}
                    onChange={(e) => setConfig(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Teléfono Móvil</label>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => setConfig(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">Correo Electrónico Comercial</label>
                  <input
                    type="email"
                    value={config.email}
                    onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Gerente / Administrador General Responsable</label>
                    <input
                      type="text"
                      value={config.responsible}
                      onChange={(e) => setConfig(prev => ({ ...prev, responsible: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Mensaje de Agradecimiento al Pie (Facturas / POS)</label>
                    <textarea
                      rows={3}
                      value={config.invoiceMessage}
                      onChange={(e) => setConfig(prev => ({ ...prev, invoiceMessage: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTab === "LEGAL" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <span>2. Información Legal de la Empresa (Cámara de Comercio Colombia)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">Razón Social Jurídica</label>
                  <input
                    type="text"
                    value={config.razonSocial || ""}
                    placeholder="Ej. SMAJ URBAN CLOTHING S.A.S."
                    onChange={(e) => setConfig(prev => ({ ...prev, razonSocial: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Dígito de Verificación (DV)</label>
                  <input
                    type="text"
                    maxLength={1}
                    value={config.dv || ""}
                    placeholder="Ej. 4"
                    onChange={(e) => setConfig(prev => ({ ...prev, dv: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Tipo de Sociedad</label>
                  <input
                    type="text"
                    value={config.tipoSociedad || ""}
                    placeholder="Ej. Sociedad por Acciones Simplificada S.A.S."
                    onChange={(e) => setConfig(prev => ({ ...prev, tipoSociedad: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">NIT de la Empresa</label>
                  <input
                    type="text"
                    value={config.nit}
                    placeholder="Ej. 901.442.238"
                    onChange={(e) => setConfig(prev => ({ ...prev, nit: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Cámara de Comercio (Seccional)</label>
                  <input
                    type="text"
                    value={config.ccmercio || ""}
                    placeholder="Ej. Cámara de Comercio de Cúcuta"
                    onChange={(e) => setConfig(prev => ({ ...prev, ccmercio: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Número de Matrícula Mercantil</label>
                  <input
                    type="text"
                    value={config.matriculaMercantil || ""}
                    placeholder="Ej. MC-20240985-11"
                    onChange={(e) => setConfig(prev => ({ ...prev, matriculaMercantil: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Fecha de Registro</label>
                  <input
                    type="date"
                    value={config.fechaRegistroCC || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, fechaRegistroCC: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Ciudad de Registro</label>
                  <input
                    type="text"
                    value={config.ciudadRegistroCC || ""}
                    placeholder="Ej. Cúcuta"
                    onChange={(e) => setConfig(prev => ({ ...prev, ciudadRegistroCC: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Teléfono Corporativo Legal</label>
                  <input
                    type="text"
                    value={config.telefonoEmpresarial || ""}
                    placeholder="Ej. 312 3456789"
                    onChange={(e) => setConfig(prev => ({ ...prev, telefonoEmpresarial: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Dirección Comercial Declarada</label>
                <input
                  type="text"
                  value={config.direccionComercial || ""}
                  placeholder="Avenida 10 # 24-85 Barrio Centro"
                  onChange={(e) => setConfig(prev => ({ ...prev, direccionComercial: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Correo Electrónico Corporativo</label>
                <input
                  type="email"
                  value={config.correoEmpresarial || ""}
                  placeholder="facturacion@smajurbanclothing.com"
                  onChange={(e) => setConfig(prev => ({ ...prev, correoEmpresarial: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {subTab === "TAX" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <span>3. Configuración Tributaria Colombia (DIAN)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Régimen Tributario</label>
                  <select
                    value={config.regimenTributario || "Régimen Común (Responsable de IVA)"}
                    onChange={(e) => setConfig(prev => ({ ...prev, regimenTributario: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Régimen Simplificado (No Responsable de IVA)">Régimen Simplificado (No Responsable de IVA)</option>
                    <option value="Régimen Común (Responsable de IVA)">Régimen Común (Responsable de IVA)</option>
                    <option value="Régimen Simple de Tributación (RST)">Régimen Simple de Tributación (RST)</option>
                    <option value="Gran Contribuyente Autorretenedor">Gran Contribuyente Autorretenedor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Actividad Económica CIIU Principal</label>
                  <input
                    type="text"
                    value={config.actividadCIIU || ""}
                    placeholder="Ej. 4771"
                    onChange={(e) => setConfig(prev => ({ ...prev, actividadCIIU: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Responsabilidades Fiscales RUT (Códigos separados por coma)</label>
                <input
                  type="text"
                  value={config.responsabilidadesFiscales || ""}
                  placeholder="Ej. O-13 Gran Contribuyente, O-47 Obligado a facturar electrónicamente"
                  onChange={(e) => setConfig(prev => ({ ...prev, responsabilidadesFiscales: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 mt-2">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 animate-pulse" />
                  Tarifa de Impuestos en Venta Co-Responsable
                </h4>
                <p className="text-[11px] text-amber-800 mt-1 mb-3">
                  En Colombia, la tarifa general de IVA activa para calzado deportivo e indumentaria es del 19%. Configure la tarifa porcentual por defecto para productos gravados.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-700">Porcentaje IVA General:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.ivaPercent ?? 19}
                      onChange={(e) => setConfig(prev => ({ ...prev, ivaPercent: Number(e.target.value) }))}
                      className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-center font-mono font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTab === "DIAN" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                  4. Resolución DIAN y Proveedor Tecnológico FE
                </h3>
                <span className="bg-indigo-50 text-indigo-750 font-mono text-[10px] px-2 py-0.5 rounded border border-indigo-200">
                  UBL 2.1 Protocol
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Proveedor Tecnológico Habilitado</label>
                  <input
                    type="text"
                    value={config.proveedorTecnologico || ""}
                    placeholder="Ej. CODIAN S.A.S. (Autorizado DIAN)"
                    onChange={(e) => setConfig(prev => ({ ...prev, proveedorTecnologico: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Resolución Facturación DIAN Núm.</label>
                  <input
                    type="text"
                    value={config.resolucionDian || ""}
                    placeholder="Ej. 187640398271"
                    onChange={(e) => setConfig(prev => ({ ...prev, resolucionDian: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Prefijo DIAN</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={config.prefijoFactura || ""}
                    placeholder="Ej. JUH"
                    onChange={(e) => setConfig(prev => ({ ...prev, prefijoFactura: e.target.value.toUpperCase() }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm uppercase text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Desde</label>
                  <input
                    type="number"
                    value={config.numeracionDesde ?? 1000}
                    onChange={(e) => setConfig(prev => ({ ...prev, numeracionDesde: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Hasta</label>
                  <input
                    type="number"
                    value={config.numeracionHasta ?? 9999}
                    onChange={(e) => setConfig(prev => ({ ...prev, numeracionHasta: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Siguiente Núm.</label>
                  <input
                    type="number"
                    value={config.numeracionSiguiente ?? 1004}
                    onChange={(e) => setConfig(prev => ({ ...prev, numeracionSiguiente: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 text-indigo-700 font-bold rounded-lg px-3 py-2 text-sm text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">Clave Técnica DIAN (UUID Habilitado)</label>
                  <input
                    type="password"
                    value={config.dianKey || ""}
                    placeholder="••••••••••••••••••••••••"
                    onChange={(e) => setConfig(prev => ({ ...prev, dianKey: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Ambiente DIAN</label>
                  <select
                    value={config.dianEnvironment || "PRUEBAS"}
                    onChange={(e) => setConfig(prev => ({ ...prev, dianEnvironment: e.target.value as "PRUEBAS" | "PRODUCCION" }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="PRUEBAS">HABILITACIÓN / PRUEBAS</option>
                    <option value="PRODUCCION">PRODUCCIÓN REAL FE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Fecha de Resolución DIAN</label>
                  <input
                    type="date"
                    value={config.resolucionFecha || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, resolucionFecha: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 mt-5 p-3 bg-indigo-50/40 rounded-lg border border-indigo-150">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[10px] text-indigo-800 leading-tight">
                    Módulo de transmisión xml activa. Las facturas emitidas por POS de SMAJ se conectarán con el CUFE corporativo simulado.
                  </span>
                </div>
              </div>
            </div>
          )}

          {subTab === "BRAND" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>5. Personalización Visual del Logo en Fondo (Liquid Glass)</span>
              </h3>

              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">Mostrar Marca de Agua Premium</span>
                    <span className="text-[10px] text-gray-500">Incrusta el logotipo corporativo en segundo plano de la aplicación</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.watermarkEnabled !== false}
                      onChange={(e) => setConfig(prev => ({ ...prev, watermarkEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                {config.watermarkEnabled !== false && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                        <span>Transparencia / Opacidad:</span>
                        <span className="font-mono text-indigo-600 font-bold">{config.watermarkOpacity ?? 12}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={config.watermarkOpacity ?? 12}
                        onChange={(e) => setConfig(prev => ({ ...prev, watermarkOpacity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                      <span className="text-[9px] text-gray-400 block mt-1">Recomendado: 8% a 15% para no nublar pantallas</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                        <span>Tamaño / Escala del Logo:</span>
                        <span className="font-mono text-indigo-600 font-bold">{config.watermarkScale ?? 35}</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="85"
                        value={config.watermarkScale ?? 35}
                        onChange={(e) => setConfig(prev => ({ ...prev, watermarkScale: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-750 block mb-1">Ubicación de Marca de Agua</label>
                      <select
                        value={config.watermarkPosition || "CENTER"}
                        onChange={(e) => setConfig(prev => ({ ...prev, watermarkPosition: e.target.value as any }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="CENTER">Por defecto: Centro de Pantalla</option>
                        <option value="TOP_LEFT">Config: Superior Izquierda</option>
                        <option value="TOP_RIGHT">Config: Superior Derecha</option>
                        <option value="BOTTOM_LEFT">Config: Inferior Izquierda</option>
                        <option value="BOTTOM_RIGHT">Config: Inferior Derecha</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Quick Branding & Logo Previews (Spans 1 col) */}
        <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-gray-200 pt-5 lg:pt-0 lg:pl-6 text-center">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest text-left">
            Imagen & Identidad Gráfica
          </h3>
          
          <div className="relative group w-36 h-36 mx-auto rounded-3xl overflow-hidden border-2 border-dashed border-gray-300 bg-white flex items-center justify-center shadow-inner hover:border-slate-900 transition">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo de Almacén" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-300" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <label className="inline-flex items-center gap-2 bg-slate-950 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition shadow-sm w-full justify-center">
              <Upload className="w-3.5 h-3.5" />
              Subir Logo PNG/JPG
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-gray-400">Formatos con fondo transparente recomendados (max 2MB)</p>
          </div>

          <div className="pt-3 border-t border-gray-150 text-left">
            <label className="text-xs font-bold text-gray-900 block mb-2 uppercase tracking-wider">Presets de Almacén</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_LOGOS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => selectPresetLogo(p.url)}
                  className="group relative border border-gray-200 hover:border-slate-900 rounded-xl overflow-hidden h-14 bg-white transition shadow-sm shrink-0"
                >
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover shrink-0" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] text-white py-0.5 text-center truncate group-hover:bg-slate-950 font-bold">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {authorized && (
        <div className="flex items-center justify-end mt-8 border-t border-gray-150 pt-5 gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-slate-950 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración Legal de Empresa
          </button>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-emerald-50 border border-emerald-250 text-emerald-850 text-xs py-2 px-3 rounded-xl flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

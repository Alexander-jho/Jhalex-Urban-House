/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { db } from "../db";
import { CompanyConfig, UserRole } from "../types";
import { Building2, Save, Upload, Eye, ShieldAlert, CheckCircle, AlertOctagon } from "lucide-react";

interface CompanySettingsProps {
  currentRole: UserRole;
  currentUserName: string;
  onCompanyChange?: () => void;
}

export function CompanySettings({ currentRole, currentUserName, onCompanyChange }: CompanySettingsProps) {
  const [config, setConfig] = useState<CompanyConfig>(db.getCompany());
  const [logoPreview, setLogoPreview] = useState<string>(config.logo);
  const [adminPin, setAdminPin] = useState<string>("");
  const [authorized, setAuthorized] = useState<boolean>(currentRole === UserRole.ADMIN);
  const [errorCode, setErrorCode] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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
    setSuccess("Los datos de JHALEX URBAN HOUSE se actualizaron correctamente.");
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
    <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-5">
        <Building2 className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Configuración de Identidad Comercial</h2>
      </div>

      {!authorized && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-center">
          <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="font-semibold text-amber-900">Operación Restringida</h3>
          <p className="text-xs text-amber-700 mt-1 mb-4">
            Modificar el nombre, NIT, dirección o logotipos de la empresa requiere autenticación de administrador por seguridad.
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

      {/* Settings Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!authorized ? "opacity-40 pointer-events-none" : ""}`}>
        
        {/* Left: Metadata Form */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Datos Principales</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Nombre del Almacén</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Identificación Tributaria (NIT)</label>
              <input
                type="text"
                value={config.nit}
                onChange={(e) => setConfig(prev => ({ ...prev, nit: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Dirección</label>
              <input
                type="text"
                value={config.address}
                onChange={(e) => setConfig(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Ciudad</label>
              <input
                type="text"
                value={config.city}
                onChange={(e) => setConfig(prev => ({ ...prev, city: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Teléfono Movil</label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Correo de Contacto</label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Gerente/Responsable del Almacén</label>
              <input
                type="text"
                value={config.responsible}
                onChange={(e) => setConfig(prev => ({ ...prev, responsible: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Descripción Comercial</label>
              <input
                type="text"
                value={config.commercialInfo}
                placeholder="Ej. Tienda de moda y estilo"
                onChange={(e) => setConfig(prev => ({ ...prev, commercialInfo: e.target.value }))}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Mensaje de Pie de Factura</label>
            <textarea
              rows={3}
              value={config.invoiceMessage}
              onChange={(e) => setConfig(prev => ({ ...prev, invoiceMessage: e.target.value }))}
              className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:bg-white resize-none"
            />
          </div>
        </div>

        {/* Right: Premium Custom Logo Tools */}
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-100 pt-5 md:pt-0 md:pl-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Imagen del Almacén</h3>
          
          <div className="relative group w-32 h-32 mx-auto rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo de Almacén" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-300" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="text-center">
            <label className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium px-4 py-2 rounded-lg cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              Subir Logo PNG/JPG
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-gray-400 mt-1.5">Permite cargar formatos PNG, JPG o SVG desde tu computador</p>
          </div>

          <div className="pt-2">
            <label className="text-xs font-medium text-gray-600 block mb-2">Preset Temáticos de Logo</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_LOGOS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => selectPresetLogo(p.url)}
                  className="group relative border border-gray-200 hover:border-gray-900 rounded-lg overflow-hidden h-14 bg-gray-50"
                >
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white py-0.5 text-center truncate group-hover:bg-black">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {authorized && (
        <div className="flex items-center justify-end mt-8 border-t border-gray-100 pt-5 gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar Configuraciones
          </button>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 text-green-700 text-xs py-2 px-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

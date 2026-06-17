/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { db } from "../db";
import { UserRole } from "../types";
import { Shield, User, KeyRound, Check, AlertCircle, RefreshCw } from "lucide-react";

interface UserSelectionProps {
  onSessionChanged: (user: { name: string; role: UserRole }) => void;
  currentRole: UserRole;
  currentUserName: string;
}

export function UserSelection({ onSessionChanged, currentRole, currentUserName }: UserSelectionProps) {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(currentRole === UserRole.ADMIN);
  const [pin, setPin] = useState<string>("");
  const [activeSellerId, setActiveSellerId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [oldPin, setOldPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");

  const vendedores = db.getVendedores().filter(v => v.status === "ACTIVO");

  const handleRoleToggle = (toAdmin: boolean) => {
    setIsAdminMode(toAdmin);
    setPin("");
    setError("");
    setSuccess("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const role = isAdminMode ? UserRole.ADMIN : UserRole.SELLER;
    const isValid = db.verifyPIN(role, pin);

    if (isValid) {
      let userName = "Administrador Principal";
      if (!isAdminMode) {
        const foundSeller = vendedores.find(v => v.id === activeSellerId);
        userName = foundSeller ? foundSeller.name : "Vendedor de Turno";
      }
      db.setActiveUser(userName, role);
      onSessionChanged({ name: userName, role });
      setSuccess("¡Acceso concedido exitosamente!");
      setPin("");
      setTimeout(() => setSuccess(""), 2000);
    } else {
      setError("PIN de seguridad incorrecto. Intenta de nuevo.");
      db.logAudit(
        "Acceso no autorizado",
        role,
        "INTENTO_FALLIDO_KEY",
        "Login Fallido",
        `Intento fallido de ingresar como ${isAdminMode ? "ADMINISTRADOR" : "VENDEDOR"}`
      );
    }
  };

  const handlePinChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const role = isAdminMode ? UserRole.ADMIN : UserRole.SELLER;
    const updated = db.changePIN(role, oldPin, newPin, currentUserName);

    if (updated) {
      setSuccess("¡PIN modificado con éxito!");
      setOldPin("");
      setNewPin("");
      setTimeout(() => {
        setSuccess("");
        setIsChangingPin(false);
      }, 2000);
    } else {
      setError("El PIN actual proporcionado no es correcto.");
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Acceso y Seguridad</h2>
        </div>
        <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-mono text-gray-600">
          Rol actual: {currentRole === UserRole.ADMIN ? "⚡ ADMINISTRADOR" : "👤 VENDEDOR"} ({currentUserName})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cambiar de Perfil */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Cambiar de Perfil</h3>
          
          <div className="bg-gray-50 p-1.5 rounded-xl flex gap-1">
            <button
              onClick={() => handleRoleToggle(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isAdminMode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Shield className={`w-4 h-4 ${isAdminMode ? "text-amber-500" : "text-gray-400"}`} />
              Administrador
            </button>
            <button
              onClick={() => handleRoleToggle(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !isAdminMode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <User className={`w-4 h-4 ${!isAdminMode ? "text-indigo-500" : "text-gray-400"}`} />
              Vendedor
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            {!isAdminMode && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Seleccionar Vendedor</label>
                <select
                  value={activeSellerId}
                  onChange={(e) => setActiveSellerId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Vendedor de Turno (Genérico)</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Ingrese PIN de acceso</label>
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition"
            >
              Confirmar Identidad
            </button>
          </form>
        </div>

        {/* Administrar PIN de Seguridad */}
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-100 pt-5 md:pt-0 md:pl-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Modificar PIN de Seguridad</h3>
            <button
              onClick={() => setIsChangingPin(!isChangingPin)}
              className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {isChangingPin ? "Cancelar" : "Modificar"}
            </button>
          </div>

          {isChangingPin ? (
            <form onSubmit={handlePinChange} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Perfil a modificar</label>
                <div className="bg-gray-100 py-1.5 px-3 rounded-lg text-sm text-gray-700 font-medium">
                  {isAdminMode ? "🔑 PIN de Administrador" : "👤 PIN de Vendedor"}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">PIN Actual</label>
                <input
                  type="password"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="Ingrese PIN viejo"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Nuevo PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Ingrese PIN nuevo"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition"
              >
                Guardar Nuevo PIN
              </button>
            </form>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2">
              <p className="font-semibold text-gray-700">Controles de Seguridad:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Por seguridad, asigne un PIN único para cada perfil y evite compartir sus claves de acceso.</li>
                <li>Consulte con el propietario o administrador de la marca para conocer su código de ingreso inicial.</li>
                <li>Operaciones de fin de día, anulación de facturas, cambio de precios y retiros obligatoriamente exigirán la clave de Administrador de forma proactiva.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="mt-4 bg-red-50 text-red-700 text-xs py-2 px-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 text-green-700 text-xs py-2 px-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

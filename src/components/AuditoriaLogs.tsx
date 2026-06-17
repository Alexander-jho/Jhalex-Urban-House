/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { db } from "../db";
import { AuditLog, UserRole } from "../types";
import { ShieldAlert, Trash2, Calendar, UserCheck } from "lucide-react";

interface AuditoriaLogsProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function AuditoriaLogs({ currentRole, currentUserName }: AuditoriaLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>(db.getAuditLogs());

  const handleClearLogs = () => {
    if (currentRole !== UserRole.ADMIN) {
      alert("Acción bloqueada. Solo un perfil Administrador puede depurar los logs de auditoría de seguridad fiscal.");
      return;
    }
    if (confirm("¿Está seguro de borrar permanentemente el historial de auditoría? Esta acción es irreversible por seguridad de la empresa.")) {
      db.clearAuditLogs(currentUserName);
      setLogs([]);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Search Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-950 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-4.5 h-4.5 text-red-600 animate-pulse" />
            Historial de Seguridad y Auditoría (Fiscal)
          </h2>
          <p className="text-[10px] text-gray-400 mt-1">
            Lista cronológica de operaciones seguras autorizadas con PIN de administrador o realizadas por vendedores en turno.
          </p>
        </div>
        
        {currentRole === UserRole.ADMIN && (
          <button
            onClick={handleClearLogs}
            className="text-[10px] bg-red-50 hover:bg-red-100 text-red-850 text-red-600 font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Depurar Logs
          </button>
        )}
      </div>

      <div className="overflow-x-auto border rounded-xl max-h-[460px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[9px]">
              <th className="px-4 py-3">Fecha y Hora</th>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">Módulo / Sección</th>
              <th className="px-4 py-3">Operación</th>
              <th className="px-4 py-3 pr-6">Justificación / Evento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-750 font-medium">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400">
                  El registro de auditoría local se encuentra vacío por el momento.
                </td>
              </tr>
            ) : (
              logs.slice().reverse().map((log) => {
                return (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                      <span>{log.date}</span> <span className="text-indigo-600 pl-1">{log.time}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{log.userRealName}</div>
                      <div className="text-[9px] text-gray-400 font-mono tracking-widest">{log.role}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-semibold">{log.module}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-[11px] leading-relaxed max-w-xs truncate-none pr-6">
                      {log.details}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { db } from "../db";
import { UserRole } from "../types";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Brain, 
  RotateCcw, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  BarChart,
  Boxes,
  Briefcase
} from "lucide-react";

interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface AsistenteAIProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function AsistenteAI({ currentRole, currentUserName }: AsistenteAIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: `**¡Hola, ${currentUserName}!** 👋\n\nSoy tu **Asistente de Inteligencia de Negocios** de **SMAJ Urban Clothing**. Estoy conectado en tiempo real con las bases de datos de inventario, ventas, compras de proveedores y balances contables de la empresa.\n\nPuedo ayudarte con análisis de utilidad mensual, alertas de stock mínimo, auditoría, proyecciones financieras y rotación de mercancía. Haz clic en una de las preguntas de acceso rápido o escríbeme directamente.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested analytical questions from requirements
  const SUGGESTED_PROMPTS = [
    {
      label: "Utilidad del Mes",
      prompt: "¿Cuál fue la utilidad y margen neto registrado este mes?",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 border-emerald-150"
    },
    {
      label: "Alerta de Reabastecimiento",
      prompt: "¿Qué productos debo volver a comprar por estar por debajo del stock mínimo?",
      icon: Boxes,
      color: "text-amber-600 bg-amber-50 border-amber-150"
    },
    {
      label: "Mejores Costos de Proveedor",
      prompt: "¿Qué proveedor ofrece el mejor costo de adquisición histórica y cuál es su NIT?",
      icon: Briefcase,
      color: "text-indigo-600 bg-indigo-50 border-indigo-150"
    },
    {
      label: "Rotación Talla/Color",
      prompt: "¿Qué talla y combinación de color tiene la mayor rotación de ventas en el POS?",
      icon: BarChart,
      color: "text-pink-600 bg-pink-50 border-pink-150"
    },
    {
      label: "Inventario Lento (>90 días)",
      prompt: "¿Qué productos llevan más de 90 días en el almacén sin registrar ventas?",
      icon: AlertCircle,
      color: "text-rose-600 bg-rose-50 border-rose-150"
    },
    {
      label: "Proyección del Próximo Mes",
      prompt: "¿Cuál es la proyección analítica de ventas y flujo para el próximo mes?",
      icon: Sparkles,
      color: "text-violet-600 bg-violet-50 border-violet-150"
    }
  ];

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setErrorText("");
    const userMessage: Message = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      // Fetch dynamic live ERP context to feed the AI
      const context = {
        company: db.getCompany(),
        products: db.getProducts().map(p => ({
          sku: p.code,
          name: p.name,
          category: p.category,
          brand: p.brand,
          color: p.color,
          size: p.size,
          cost: p.costPrice,
          price: p.sellPrice,
          stock: p.stock,
          minStock: p.minStock,
          enterDate: p.enterDate
        })),
        vendedores: db.getVendedores().map(v => ({
          name: v.name,
          cargo: v.cargo,
          status: v.status
        })),
        sales: db.getSales()
          .filter(s => s.status === "ACTIVA")
          .map(s => ({
            invoice: s.invoiceNumber,
            date: s.date,
            total: s.total,
            subtotal: s.subtotal,
            discount: s.discountAmount,
            paymentMethod: s.paymentMethod,
            seller: s.sellerName,
            items: s.items.map(item => ({
              code: item.productCode,
              name: item.productName,
              qty: item.quantity,
              cost: item.costPrice,
              sell: item.sellPrice,
              total: item.total
            }))
          })),
        suppliers: db.getProveedores(),
        purchases: db.getPurchases().map(pur => ({
          id: pur.purchaseNumber,
          date: pur.date,
          supplier: pur.supplierName,
          total: pur.total,
          items: pur.items.map(i => ({
            name: i.productName,
            cost: i.costPrice,
            qty: i.quantity
          }))
        })),
        promotions: db.getPromotions()
      };

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          context
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Fallo en la comunicación con el servidor de inteligencia artificial.");
      }

      const data = await response.json();

      const aiMessage: Message = {
        sender: "ai",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "No se pudo obtener respuesta. Revisa que tu servidor esté corriendo y configurado.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm("¿Estás seguro de que quieres restablecer el historial de consultas de IA?")) {
      setMessages([
        {
          sender: "ai",
          text: `**Historial reiniciado correctamente.** 👋\n\n¿Qué análisis financiero o del inventario de **SMAJ Urban Clothing** requieres realizar ahora? Estoy listo.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setErrorText("");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-14rem)] min-h-[480px]">
      
      {/* Sidebar: suggested tools & system metadata */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        
        {/* Core AI Intelligence Hub Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-none">Asesor Virtual SMAJ</h2>
              <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase tracking-wider block mt-1">
                Gemini 3.5 Engine • Active
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Navega con respuestas estructuradas respaldadas por modelos de razonamiento avanzado y el inventario en tiempo real de tu tienda.
          </p>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Base de datos conectada</span>
            <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
              Sincronizada
            </span>
          </div>
        </div>

        {/* Suggestion Quick Prompts Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Consultas Rápidas</span>
          </div>

          <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[220px] lg:max-h-none flex-1 pr-1">
            {SUGGESTED_PROMPTS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={loading}
                  className="flex items-start text-left gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50/50 hover:border-indigo-150 transition-all text-xs group cursor-pointer disabled:opacity-50"
                >
                  <div className={`p-1.5 rounded-lg border ${item.color} group-hover:scale-105 transition-transform shrink-0`}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-gray-800 group-hover:text-indigo-900 transition-colors">
                      {item.label}
                    </span>
                    <p className="text-[10px] text-gray-400 leading-normal line-clamp-1">
                      {item.prompt}
                    </p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-300 ml-auto self-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0 shrink-0" />
                </button>
              );
            })}
          </div>

          <button
            onClick={handleReset}
            className="mt-4 flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-500 hover:text-gray-700 rounded-xl text-xs font-medium transition-all w-full cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Chat</span>
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-650 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs uppercase tracking-wider">SMAJ AI ADVISOR</span>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Consultor Inteligente para retail de streetwear premium</p>
            </div>
          </div>

          <div className="text-[10px] font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded-lg">
            Rol: {currentRole}
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
          {messages.map((msg, index) => {
            const isAI = msg.sender === "ai";
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-4xl ${isAI ? "justify-start" : "justify-end ml-auto"}`}
              >
                {isAI && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                )}

                <div className="space-y-1 max-w-[85%]">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isAI
                        ? "bg-white border border-gray-150 text-gray-800 shadow-2xs rounded-tl-xs"
                        : "bg-indigo-600 text-white shadow-2xs rounded-tr-xs"
                    }`}
                  >
                    {/* Simplified formatting logic for markdown to produce elegant text in UI */}
                    <div className="whitespace-pre-wrap space-y-2">
                      {msg.text.split("\n\n").map((paragraph, pIdx) => {
                        // Check if it's a table representation (has | columns)
                        if (paragraph.includes("|") && paragraph.split("\n").length > 1) {
                          const lines = paragraph.trim().split("\n");
                          const headers = lines[0].split("|").map(h => h.trim()).filter(h => h);
                          const rows = lines.slice(2).map(line => line.split("|").map(r => r.trim()).filter(r => r));

                          return (
                            <div key={pIdx} className="overflow-x-auto my-3 border border-gray-200 rounded-lg bg-white">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {headers.map((h, hIdx) => (
                                      <th key={hIdx} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 text-gray-700">
                                  {rows.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="px-3 py-1.5 font-mono text-[10px]">
                                          {cell.replace(/\*\*/g, "")}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        // Normal bullet points list formatting
                        if (paragraph.startsWith("-") || paragraph.startsWith("*")) {
                          return (
                            <ul key={pIdx} className="list-disc pl-5 space-y-1">
                              {paragraph.split("\n").map((line, lIdx) => {
                                const cleanLine = line.replace(/^[-*]\s+/, "");
                                return (
                                  <li key={lIdx}>
                                    {formatText(cleanLine)}
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        }

                        return <p key={pIdx}>{formatText(paragraph)}</p>;
                      })}
                    </div>
                  </div>
                  
                  <span className={`text-[9px] text-gray-400 block px-1 ${!isAI ? "text-right" : ""}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {!isAI && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-indigo-700 uppercase">
                    {currentUserName.substring(0, 2)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Typing Indicator */}
          {loading && (
            <div className="flex gap-3 max-w-lg">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="p-3.5 bg-white border border-gray-150 rounded-2xl rounded-tl-xs shadow-2xs text-xs flex items-center gap-1.5 text-gray-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                <span>Analizando bases de datos del ERP de SMAJ...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorText && (
            <div className="p-4 bg-red-50 border border-red-150 rounded-xl text-xs text-red-800 flex items-start gap-2.5 max-w-xl mx-auto my-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error de sincronización AI:</span>
                <p className="mt-1 leading-relaxed">{errorText}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Panel */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            placeholder="Ej: ¿Cuál es nuestra utilidad de ventas de este mes frente a los costos?"
            className="flex-1 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-250 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-750 disabled:bg-gray-100 disabled:text-gray-400 text-white p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper to format simple bold text (**word**) inside UI output
function formatText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-gray-950">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    }
    return part;
  });
}

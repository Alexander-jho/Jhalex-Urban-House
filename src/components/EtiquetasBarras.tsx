/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { db } from "../db";
import { Product, UserRole, PriceHistoryLog } from "../types";
import { 
  Barcode, 
  Printer, 
  Search, 
  Plus, 
  Minus, 
  Sliders, 
  Eye, 
  Tag, 
  Check, 
  Info, 
  RefreshCw, 
  ChevronRight, 
  Trash2, 
  Edit3,
  Calendar,
  User,
  Hash
} from "lucide-react";
import { VisualBarcode } from "./InventoryManager";

interface EtiquetasBarrasProps {
  currentRole: UserRole;
  currentUserName: string;
}

export function EtiquetasBarras({ currentRole, currentUserName }: EtiquetasBarrasProps) {
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);
  
  // Custom label parameters
  const [quantity, setQuantity] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<"SMALL" | "SHOE" | "LARGE">("SMALL");
  const [labelDesign, setLabelDesign] = useState<"MODERN" | "CLASSIC" | "MINIMAL" | "BOLD">("MODERN");
  const [alignment, setAlignment] = useState<"LEFT" | "CENTER" | "RIGHT">("CENTER");
  
  // Design details
  const [showOldPrice, setShowOldPrice] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
  const [fontSizeAdjust, setFontSizeAdjust] = useState<number>(0); // -2 to +4 offset
  const [paddingAdjust, setPaddingAdjust] = useState<number>(0); // -2 to +4 offset
  
  // Scanner simulator
  const [scannedCode, setScannedCode] = useState("");
  const [scannerResult, setScannerResult] = useState<Product | null>(null);
  const [scannerError, setScannerError] = useState("");
  
  // Success state for print trigger
  const [successMessage, setSuccessMessage] = useState("");
  const printFrameRef = useRef<HTMLDivElement>(null);

  // Filter products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barCode.includes(searchTerm);
      const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categories = useMemo(() => db.getCategories().map(c => c.name), []);

  // Handles mock scan trigger
  const handleScanCode = (codeToScan: string) => {
    const code = codeToScan.trim();
    if (!code) return;

    const match = products.find(p => p.barCode === code || p.code.toLowerCase() === code.toLowerCase());
    if (match) {
      setScannerResult(match);
      setScannerError("");
      setSelectedProduct(match); // Also keep synced with selection
    } else {
      setScannerResult(null);
      setScannerError("No se encontró ningún producto con ese código de barras o código interno.");
    }
  };

  // Safe discount and pricing options
  const labelPriceDetails = useMemo(() => {
    if (!selectedProduct) return { price: 0, oldPrice: 0, discount: 0 };
    
    // Check if there is price history to derive previous cost
    let previousPrice = 0;
    if (selectedProduct.priceHistory && selectedProduct.priceHistory.length > 1) {
      // Find the second or prior entry
      const prior = selectedProduct.priceHistory[selectedProduct.priceHistory.length - 2];
      if (prior) previousPrice = prior.newPrice;
    }

    // Determine discount rate
    let discount = customDiscountPercent;
    if (discount <= 0 && previousPrice > selectedProduct.sellPrice) {
      discount = Math.round(((previousPrice - selectedProduct.sellPrice) / previousPrice) * 100);
    }

    return {
      price: selectedProduct.sellPrice,
      oldPrice: previousPrice || (discount > 0 ? Math.round(selectedProduct.sellPrice / (1 - discount / 100)) : 0),
      discount: discount
    };
  }, [selectedProduct, customDiscountPercent]);

  // Actual physical window print trigger helper
  const handleTriggerPrint = () => {
    if (!selectedProduct) return;
    
    setSuccessMessage(`Enviando ${quantity} etiqueta(s) a la cola de impresión...`);
    setTimeout(() => {
      setSuccessMessage("");
      
      // Let's open real print format by rendering in a new window or utilizing clean CSS custom print rules
      const printContents = document.getElementById("printable-area")?.innerHTML;
      if (!printContents) return;
      
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Imprimir Etiquetas SMAJ</title>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body {
                  font-family: 'Inter', sans-serif;
                  background: white;
                  color: black;
                  padding: 10px;
                  margin: 0;
                }
                @media print {
                  body {
                    padding: 0;
                    margin: 0;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .print-page {
                    page-break-after: always;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                  }
                }
              </style>
            </head>
            <body onload="window.print(); window.close();">
              <div class="flex flex-col gap-6 items-center">
                ${Array.from({ length: quantity }).map(() => `
                  <div class="print-page border border-dashed border-gray-300 p-6 rounded-lg bg-white" style="width: ${
                    labelSize === "SMALL" ? "240px" : labelSize === "SHOE" ? "320px" : "400px"
                  }; min-height: ${
                    labelSize === "SMALL" ? "180px" : labelSize === "SHOE" ? "220px" : "300px"
                  }">
                    ${printContents}
                  </div>
                `).join("")}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }, 2200);
  };

  // Formatted alignment classes
  const getAlignmentClass = () => {
    if (alignment === "LEFT") return "text-left items-start";
    if (alignment === "RIGHT") return "text-right items-end";
    return "text-center items-center";
  };

  const getDesignClasses = () => {
    switch (labelDesign) {
      case "MINIMAL":
        return {
          card: "border border-gray-400 bg-white p-4 font-sans text-gray-900 rounded-none",
          header: "text-xs font-mono uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-1.5 mb-2 w-full",
          brand: "font-bold text-[10px] tracking-wide text-gray-800",
          title: "text-sm font-light tracking-tight text-gray-900 leading-tight",
          badge: "bg-gray-100 text-gray-800 text-[9px] px-1.5 py-0.5 font-mono",
          price: "text-lg font-mono text-gray-950 font-bold",
        };
      case "CLASSIC":
        return {
          card: "border-4 border-gray-900 bg-white p-5 font-serif text-gray-950 rounded-xl shadow-xs",
          header: "border-b-2 border-gray-900 pb-2 mb-2 w-full text-center",
          brand: "font-extrabold text-xs tracking-wider text-gray-950 uppercase",
          title: "text-base font-bold text-gray-950 leading-snug",
          badge: "border border-gray-950 text-gray-950 text-[10px] px-2 py-0.5 uppercase tracking-wider font-semibold",
          price: "text-xl font-black text-gray-950",
        };
      case "BOLD":
        return {
          card: "border border-black bg-gray-950 p-6 font-mono text-white rounded-2xl shadow-md",
          header: "border-b border-gray-800 pb-2.5 mb-3 w-full",
          brand: "font-black text-xs tracking-widest text-indigo-400 uppercase",
          title: "text-sm font-semibold tracking-wide text-white leading-tight uppercase",
          badge: "bg-indigo-900/50 text-indigo-200 border border-indigo-700 text-[9px] px-2 py-0.5 rounded-md",
          price: "text-2xl font-black text-indigo-400",
        };
      case "MODERN":
      default:
        return {
          card: "border border-gray-200 bg-linear-to-b from-white to-gray-50/50 p-5 font-sans text-gray-900 rounded-2xl shadow-sm",
          header: "pb-2 mb-1.5 w-full flex flex-col items-center",
          brand: "font-extrabold text-xs tracking-widest text-gray-900 uppercase font-sans",
          title: "text-sm font-bold text-gray-950 leading-tight tracking-tight",
          badge: "bg-gray-950 text-white text-[9px] px-2 py-0.5 rounded-full font-bold",
          price: "text-xl font-extrabold text-gray-900 tracking-tight",
        };
    }
  };

  const styleSet = getDesignClasses();

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-white/85 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Barcode className="w-5 h-5 text-indigo-600" />
            Módulo de Etiquetas & Códigos de Barra
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Diseñe, previsualice e imprima de forma profesional etiquetas personalizadas para prendas, calzado y lociones.
          </p>
        </div>
        <div className="text-[10px] sm:text-xs font-mono text-gray-400 flex items-center gap-1.5 bg-gray-55/80 px-3 py-1.5 rounded-xl border border-gray-100">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          Precios actualizados automáticamente con historial integrado.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Product Selector & Barcode Scanner Simulator */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Scanner Simulator Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
              Simulador de Escáner de Barras
            </h3>
            
            <p className="text-[11px] text-gray-500 leading-snug">
              Simule el escaneo de un código físico. Ingrese el código de barras (ej. 770123...) o el código interno y presione enter para consultar información inmediata.
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleScanCode(scannedCode);
              }}
              className="relative"
            >
              <input
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder="Escanee o digite código..."
                className="w-full text-xs font-mono bg-gray-50 hover:bg-gray-100 focus:bg-white border hover:border-gray-300 focus:border-black rounded-lg pl-3 pr-10 py-2 focus:outline-none transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 p-1 rounded-md text-gray-400 hover:text-black transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {scannerError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-2 rounded-lg font-medium">
                {scannerError}
              </div>
            )}

            {scannerResult && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-900 block truncate max-w-[170px]">{scannerResult.name}</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-mono">{scannerResult.code}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600 border-t pt-2 mt-2">
                  <div>
                    <span className="block text-gray-400 lowercase">precio actual:</span>
                    <strong className="text-gray-900 font-bold text-xs">$ {scannerResult.sellPrice.toLocaleString()} COP</strong>
                  </div>
                  <div>
                    <span className="block text-gray-400 lowercase">existencias:</span>
                    <strong className={`font-bold ${scannerResult.stock <= scannerResult.minStock ? "text-red-600" : "text-gray-900"}`}>{scannerResult.stock} und</strong>
                  </div>
                </div>

                {scannerResult.priceHistory && scannerResult.priceHistory.length > 1 && (
                  <div className="border-t pt-2 mt-2">
                    <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block mb-1">Últimos Cambios de Precio:</span>
                    <div className="space-y-1">
                      {scannerResult.priceHistory.slice(-2).map((log, i) => (
                        <div key={i} className="flex justify-between text-[10px] bg-white p-1 rounded border border-gray-100">
                          <span className="text-gray-400 font-mono font-normal">{log.date}</span>
                          <span className="text-gray-700 font-semibold font-mono">
                            ${log.previousPrice.toLocaleString()} → ${log.newPrice.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Catalog Selection Sidebar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">
                Catálogo de Productos
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Seleccione un producto para previsualizar e imprimir su etiqueta</p>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar prendas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-gray-50 border rounded-lg pl-9 pr-3 py-1.5 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs bg-gray-50 border rounded-lg px-3 py-1.5 focus:bg-white focus:outline-none transition-all text-gray-700"
              >
                <option value="">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  No se encontraron productos coincidentes.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setCustomDiscountPercent(0); // Reset custom options on select
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition duration-150 flex items-center justify-between border ${
                        isSelected 
                          ? "bg-gray-900 text-white border-gray-900" 
                          : "bg-gray-50/50 hover:bg-gray-100 border-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold block truncate">{p.name}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                          {p.code} • Talla: {p.size || "Única"}
                        </span>
                      </div>
                      <span className="text-right font-mono font-bold shrink-0 self-center">
                        ${p.sellPrice.toLocaleString()}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Middle Side: Customization Parameters */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-5">
            <div>
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-gray-500" />
                Configuración del Diseño
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Defina tamaño, datos y estilo estético para las impresiones.</p>
            </div>

            {/* Format Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 block">Formato / Tamaño de Etiqueta:</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLabelSize("SMALL")}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                    labelSize === "SMALL" 
                      ? "bg-gray-900 text-white border-gray-900" 
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Pequeño (Prendas)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize("SHOE")}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                    labelSize === "SHOE" 
                      ? "bg-gray-900 text-white border-gray-900" 
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Zapatos
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize("LARGE")}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                    labelSize === "LARGE" 
                      ? "bg-gray-900 text-white border-gray-900" 
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Grande (General)
                </button>
              </div>
            </div>

            {/* Design Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 block">Estilo del Encofrado:</label>
              <div className="grid grid-cols-4 gap-1">
                {(["MODERN", "CLASSIC", "MINIMAL", "BOLD"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setLabelDesign(style)}
                    className={`py-1.5 rounded-md text-[10px] font-bold uppercase transition border ${
                      labelDesign === style 
                        ? "bg-gray-900 text-white border-gray-900" 
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {style.substring(0, 4)}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 block">Alineación del Contenido:</label>
              <div className="grid grid-cols-3 gap-1 px-1">
                {(["LEFT", "CENTER", "RIGHT"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => setAlignment(align)}
                    className={`py-1 border rounded-md text-[10px] font-semibold tracking-tight transition ${
                      alignment === align
                        ? "bg-gray-900 text-white border-gray-950"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {align === "LEFT" ? "Izquierda" : align === "CENTER" ? "Centrado" : "Derecha"}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Features */}
            <div className="space-y-3.5 border-t pt-3.5 mt-3 text-xs text-gray-700">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Mostrar Precio Anterior</span>
                <input
                  type="checkbox"
                  checked={showOldPrice}
                  onChange={(e) => setShowOldPrice(e.target.checked)}
                  className="w-4 h-4 rounded text-black focus:ring-black accent-black"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Mostrar Porcentaje de Descuento</span>
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => setShowDiscount(e.target.checked)}
                  className="w-4 h-4 rounded text-black focus:ring-black accent-black"
                />
              </div>

              {showDiscount && (
                <div className="space-y-1 pt-1.5 border-t border-dashed">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500">% Descuento Forzado:</span>
                    <span className="font-bold text-gray-900 text-[10px]">{customDiscountPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={customDiscountPercent}
                    onChange={(e) => setCustomDiscountPercent(Number(e.target.value))}
                    className="w-full accent-black bg-gray-100 h-1 rounded-lg"
                  />
                  <p className="text-[9px] text-gray-400">Si es cero, se calculará automáticamente si existe un precio anterior contrastado con el actual.</p>
                </div>
              )}
            </div>

            {/* Finetuners: Font size & padding spacing */}
            <div className="space-y-3.5 border-t pt-3.5 text-xs text-gray-700">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Escala de Letra (Zoom):</span>
                <div className="flex gap-1.5 items-center">
                  <button 
                    disabled={fontSizeAdjust <= -2}
                    onClick={() => setFontSizeAdjust(v => v - 1)}
                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs flex items-center justify-center disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="font-mono text-[10.5px] w-4 text-center">{fontSizeAdjust}</span>
                  <button 
                    disabled={fontSizeAdjust >= 4}
                    onClick={() => setFontSizeAdjust(v => v + 1)}
                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs flex items-center justify-center disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-semibold">Espaciador de Relleno:</span>
                <div className="flex gap-1.5 items-center">
                  <button 
                    disabled={paddingAdjust <= -2}
                    onClick={() => setPaddingAdjust(v => v - 1)}
                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs flex items-center justify-center disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="font-mono text-[10.5px] w-4 text-center">{paddingAdjust}</span>
                  <button 
                    disabled={paddingAdjust >= 4}
                    onClick={() => setPaddingAdjust(v => v + 1)}
                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-bold text-xs flex items-center justify-center disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Visualizer and Print controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-5">
            <div>
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-500" />
                Visualizador de Etiqueta (Preimpresión)
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Vista previa antes de despachar el comando a la ticketera.</p>
            </div>

            {selectedProduct ? (
              <div className="space-y-4">
                {/* Print Design Container box */}
                <div 
                  ref={printFrameRef}
                  className="bg-gray-100/60 rounded-2xl p-4 flex items-center justify-center min-h-[290px] border border-dashed border-gray-200"
                >
                  <div 
                    id="printable-area"
                    className={`w-full max-w-[270px] ${styleSet.card} ${getAlignmentClass()} transition-all`}
                    style={{
                      fontSize: `${100 + fontSizeAdjust * 10}%`,
                      padding: `${1.25 + paddingAdjust * 0.15}rem`
                    }}
                  >
                    {/* Header */}
                    <div className={styleSet.header}>
                      <span className={styleSet.brand}>SMAJ URBAN CLOTHING</span>
                      <span className="text-[8px] font-mono tracking-widest block text-gray-400 mt-0.5 animate-pulse">DESDE MEDELLÍN</span>
                    </div>

                    {/* Metadata parameters */}
                    <div className="space-y-1 w-full">
                      <h4 className={styleSet.title}>
                        {selectedProduct.name}
                      </h4>

                      <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                        {selectedProduct.size && (
                          <span className={styleSet.badge}>
                            TALLA: {selectedProduct.size}
                          </span>
                        )}
                        {selectedProduct.color && (
                          <span className={`${styleSet.badge} bg-gray-100 text-gray-700`}>
                            {selectedProduct.color}
                          </span>
                        )}
                        {selectedProduct.category && (
                          <span className={`${styleSet.badge} bg-gray-50 text-gray-500 border border-gray-100`}>
                            {selectedProduct.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barcodes section */}
                    <div className="my-4 w-full flex flex-col items-center">
                      <div className="bg-white p-1 rounded border border-gray-100 w-full flex justify-center">
                        <VisualBarcode value={selectedProduct.barCode} />
                      </div>
                      <span className="text-[8px] font-mono tracking-widest text-gray-400 block mt-1">
                        COD: {selectedProduct.code}
                      </span>
                    </div>

                    {/* Pricing details */}
                    <div className="w-full text-center border-t border-dashed border-gray-200 pt-3 mt-1.5">
                      {showOldPrice && labelPriceDetails.oldPrice > labelPriceDetails.price && (
                        <div className="flex justify-center items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] text-gray-400 line-through">
                            $ {labelPriceDetails.oldPrice.toLocaleString()}
                          </span>
                          {showDiscount && labelPriceDetails.discount > 0 && (
                            <span className="text-[9px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-extrabold">
                              -{labelPriceDetails.discount}% DESCUENTO
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="leading-tight">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">Precio de Venta</span>
                        <span className={styleSet.price}>
                          $ {labelPriceDetails.price.toLocaleString()} COP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantitative Selectors */}
                <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center text-xs text-gray-700">
                    <span className="font-bold">Cantidad de etiquetas:</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-7 h-7 bg-white hover:bg-gray-100 border text-gray-700 rounded-lg flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-sm w-5 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-7 h-7 bg-white hover:bg-gray-100 border text-gray-700 rounded-lg flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {successMessage && (
                  <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-[11px] font-medium p-3 rounded-lg text-center leading-relaxed">
                    {successMessage}
                  </div>
                )}

                {/* Dispatch Button */}
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 hover:indigo-500 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir ({quantity} {quantity === 1 ? "Etiqueta" : "Etiquetas"})
                </button>
                
                <p className="text-[10px] text-gray-400 text-center leading-snug col-span-full">
                  Compatible con impresoras de etiquetas de marcas Zebra, Brother, Xprinter, Epson y tiqueteras térmicas de 58mm/80mm de cinta continua.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs">
                Por favor añada o seleccione un producto del catálogo para inicializar la vista previa de etiquetas.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompanyConfig {
  name: string;
  logo: string; // Base64 data-uri or SVG/icon identifier
  nit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  responsible: string;
  commercialInfo: string;
  invoiceMessage: string;
}

export interface ProductTypeCategory {
  name: string;
  group: string;
}

export enum UserRole {
  ADMIN = "ADMIN",
  SELLER = "VENDEDOR"
}

export interface SystemUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // PIN coded for secure access
}

export interface PriceHistoryLog {
  id: string;
  previousPrice: number;
  newPrice: number;
  date: string;
  user: string;
}

export interface Product {
  id: string;
  code: string;
  barCode: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  color: string;
  size: string;
  description: string;
  supplier: string;
  enterDate: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  priceHistory?: PriceHistoryLog[];
  taxType?: "GRAVADO" | "EXCLUIDO";
  taxRate?: number; // e.g., 0, 5, 19
}

export interface InventoryHistory {
  id: string;
  productId: string;
  productName: string;
  type: "ENTRY" | "ADJUSTMENT" | "SALE" | "RETURN";
  quantity: number;
  previousStock: number;
  newStock: number;
  user: string;
  date: string;
  reason: string;
}

export interface Vendedor {
  id: string;
  name: string;
  document: string;
  phone: string;
  status: "ACTIVO" | "INACTIVO";
  commissionRate: number; // Percentage, e.g. 5 for 5%
}

export interface Client {
  id: string;
  name: string;
  document: string;
  documentType?: "CC" | "NIT" | "CE" | "RUT";
  phone: string;
  address: string;
  email: string;
  points: number;
  coupons: Coupon[];
}

export interface Coupon {
  code: string;
  description: string;
  discountPercent: number;
  minPurchase: number;
  used: boolean;
  expiryDate: string;
}

export enum PaymentMethod {
  CASH = "EFECTIVO",
  CARD = "TARJETA",
  TRANSFER = "TRANSFERENCIA",
  OTHER = "OTRO"
}

export enum SaleType {
  CASH = "CONTADO",
  CREDIT = "CREDITO"
}

export interface CreditInstallment {
  id: string;
  amount: number;
  date: string;
  receiptNumber?: string;
  user: string;
}

export interface CreditDetails {
  clientId: string;
  clientName: string;
  totalAmount: number;
  initialDeposit: number;
  pendingBalance: number;
  dueDate: string;
  installments: CreditInstallment[];
  status: "PENDIENTE" | "PAGADO";
}

export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  discountPercent: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  sellerId: string;
  sellerName: string;
  clientId: string;
  clientName: string;
  items: SaleItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  saleType: SaleType;
  creditDetails?: CreditDetails;
  status: "ACTIVA" | "CANCELADA";
  originalTotal?: number;
  roundedTotal?: number;
  roundingDifference?: number;
}

export interface CashTransaction {
  id: string;
  type: "INFLOW" | "OUTFLOW";
  amount: number;
  date: string;
  time: string;
  concept: string;
  responsibleAdmin: string;
  authorizedBy: string;
  supportNumber?: string; // "Soporte documental"
}

export interface CashDrawerOpening {
  id: string;
  date: string;
  time: string;
  user: string;
  reason: "VENTA" | "RETIRO" | "CAMBIO" | "INICIO_JORNADA" | "MANUAL";
  details: string;
  authorizedBy?: string;
}

export interface CashDenominations {
  b100k: number;
  b50k: number;
  b20k: number;
  b10k: number;
  b5k: number;
  b2k: number;
  b1k: number;
  m1000: number;
  m500: number;
  m200: number;
  m100: number;
  m50: number;
}

export interface DrawerConfig {
  connectionMethod: "RJ11" | "USB" | "SERIAL" | "NONE";
  autoOpenOnCashSale: boolean;
}

export interface CashBoxSession {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
  initialBase: number;
  initialBaseDenominations?: CashDenominations;
  salesSum: number;
  inflowsSum: number;
  outflowsSum: number;
  creditsSum: number;
  expectedCash: number;
  realCash: number | null;
  realCashDenominations?: CashDenominations;
  difference: number | null;
  status: "ABIERTA" | "CERRADA";
}

export interface Promotion {
  id: string;
  name: string; // e.g. "Navidad 20%"
  discountPercent: number;
  category?: string; // Applicable to high level e.g. "Ropa"
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  user: string;
  userRole: UserRole;
  date: string;
  time: string;
  operation: string;
  reason: string;
  details: string;
}

export interface Supplier {
  id: string;
  name: string;
  nit: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  suppliedProductsCount: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  time: string;
  items: {
    productId: string;
    productName: string;
    costPrice: number;
    quantity: number;
    total: number;
  }[];
  total: number;
  user: string;
  notes?: string;
}

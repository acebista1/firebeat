
export type UserRole = 'admin' | 'sales' | 'delivery';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
}

export interface Customer {
  id: string;
  name: string;           // "Shop Name"
  phone?: string;         // "Phone Number"
  panNumber?: string;     // "Pan Number"
  routeName?: string;     // "Route"
  locationText?: string;  // "lat,long"
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  submittedBy?: string;
  createdAt?: string;
  photoUrl?: string;
  creditLimit?: number;
  creditDays?: number;
  currentOutstanding?: number;
  status?: 'active' | 'inactive'; // helper for UI compatibility
}

export interface Company {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;                 // from "Product"
  companyId: string;
  companyName: string;
  baseRate: number;             // "Rate"
  productDiscountPct?: number;  // "Product Discount"
  discountedRate: number;       // "Discounted Rate"
  packetsPerCarton?: number;    // "Packets/Carton"
  piecesPerPacket?: number;     // "Pieces/Packet"
  orderMultiple: number;        // "Multiple"
  stockOut: boolean;            // "Stock Out"
  discountEditable: boolean;    // "Discount Editable"
  secondaryDiscountPct?: number;        // "secondary_Discount"
  secondaryQualifyingQty?: number;      // "qualifying_Qty"
  additionalSecondaryDiscountPct?: number;  // "additional_Secondary_Discount"
  additionalQualifyingQty?: number;         // "additional_Qualifying_Qty"
  secondaryAvailable: boolean;  // "secondary_Available"
  marginPct?: number;           // "Margin"
  isActive: boolean;
  // Helpers for UI
  mrp?: number; // kept for backward compatibility if needed
  sellingPrice?: number; // kept for backward compatibility if needed
  minOrderQty?: number; // helper map to orderMultiple
  status?: 'active' | 'inactive';
  category?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  qty: number;
  rate: number;           // This will be the Final/Net Rate
  total: number;
  // New fields for detailed invoice
  baseRate?: number;      // The original Rate before discounts
  discountPct?: number;   // Total applied discount percentage
  schemeAppliedText?: string; // Specific text about the scheme applied
  // Added for Reports
  companyId?: string;
  companyName?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  salespersonId: string;
  salespersonName: string;
  date: string;
  totalItems: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'dispatched' | 'delivered' | 'cancelled';
  items: OrderItem[];
  remarks?: string;
}

export interface DeliveryTask {
  id: string;
  orderId: string;
  customerName: string;
  address: string;
  amount: number;
  status: 'assigned' | 'completed' | 'failed';
  lat?: number;
  lng?: number;
}

// --- DISPATCH MANAGEMENT INTERFACES ---

export type OrderStatus = "pending" | "assigned" | "packed" | "out_for_delivery" | "delivered" | "partially_returned" | "returned";

export interface Route {
  id: string;
  name: string;          // e.g. "Route 1 - Kalopool"
  code?: string;         // e.g. "R1"
}

export interface Salesperson {
  id: string;
  name: string;
  code?: string;         // optional code like "SP01"
}

export interface SalesOrder {
  id: string;
  orderNumber: string;   // display code, e.g. "SO-2025-00123"
  orderDate: string;     // ISO date of Sales Order (D)
  deliveryDate: string;  // ISO date of intended delivery (D+1) – can be derived/mocked
  customerId: string;
  customerName: string;
  routeId: string;
  routeName: string;
  salespersonId: string;
  salespersonName: string;
  totalAmount: number;
  totalCases?: number;   // optional – derived from items in future
  status: OrderStatus;
  assignedTripId?: string; // null/undefined if not assigned to a dispatch trip yet
}

export interface DeliveryPerson {
  id: string;
  name: string;
  phone?: string;
  code?: string;         // e.g. "DP01"
  vehicleId?: string;
}

export interface Vehicle {
  id: string;
  name: string;          // e.g. "Van 1", "Bike A"
  registrationNo?: string;
  capacityCases?: number; // optional capacity
}

export type DispatchTripStatus = "draft" | "ready_for_packing" | "packed" | "out_for_delivery" | "completed";

export interface DispatchTrip {
  id: string;
  deliveryDate: string;       // date this trip will deliver on
  deliveryPersonId: string;
  deliveryPersonName: string;
  vehicleId?: string;
  vehicleName?: string;
  routeIds: string[];         // one or more route IDs handled in this trip
  routeNames: string[];       // denormalised names
  orderIds: string[];         // IDs of SalesOrder assigned to this trip
  totalOrders: number;        // derived or stored
  totalAmount: number;        // derived or stored
  totalCases?: number;        // optional
  status: DispatchTripStatus; // "draft" → "ready_for_packing" → "packed" → ...
  createdAt: string;
}

// --- SALES RETURN & DAMAGES INTERFACES ---

// Existing 'Invoice' concept is mapped to 'Order' or 'SalesOrder' in this app,
// but for the Returns module, we will define explicit Invoice structures 
// that might represent a "Finalized/Delivered Order".

export interface Invoice {
  id: string;
  invoiceNumber: string;    // e.g. "INV-2025-00123"
  customerId: string;
  customerName: string;
  routeName?: string;
  deliveryDate: string;     // ISO date
  totalAmount: number;
  status: "pending" | "delivered" | "partially_returned" | "returned";
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  companyName: string;
  qtyPieces: number;        // quantity originally invoiced (pieces)
  rate: number;             // per piece
  lineTotal: number;        // qtyPieces * rate
}

export type ReturnType = "full" | "partial";

export type ReturnReason =
  | "customer_rejected_full"
  | "customer_rejected_partial"
  | "price_issue"
  | "quality_issue"
  | "expiry_issue"
  | "other";

export type DamageReason =
  | "damaged_in_transit"
  | "damaged_at_customer"
  | "damaged_in_godown"
  | "expiry"
  | "other";

export interface SalesReturn {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  returnType: ReturnType;
  reason: ReturnReason;
  notes?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;       // ISO date-time
  totalReturnAmount: number;
}

export interface SalesReturnItem {
  id: string;
  salesReturnId: string;
  invoiceItemId: string;
  productId: string;
  productName: string;
  companyName: string;
  qtyInvoiced: number;     // original qty from invoice
  qtyReturnedGood: number; // returned back to GOOD stock
  qtyReturnedDamaged: number; // returned but DAMAGED, goes to damaged stock
  rate: number;
  lineReturnAmount: number;
}

export interface DamagedGoodsLog {
  id: string;
  productId: string;
  productName: string;
  companyName: string;
  qtyPieces: number;
  damageReason: DamageReason;
  sourceType: "return" | "internal";
  sourceInvoiceId?: string;
  sourceInvoiceNumber?: string;
  sourceTripId?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;       // ISO date-time
  notes?: string;
}


export type TaxMode = "EXCLUSIVE" | "INCLUSIVE" | "NONE";

export interface Product {
  id: string;
  company: string;
  name: string;
  sellRate: number;         // catalog rate
  discountedRate?: number;  // discounted catalog rate (if any)
  packetsPerCarton: number;
  piecesPerPacket: number;
  stockOut?: boolean;
}

export interface PurchaseLineDraft {
  id?: string;              // Temporary UI ID
  productId: string;
  productName: string;
  company: string;
  unit: "Piece";            // for now, just Piece
  qty: number;              // quantity in that unit
  rate: number;             // purchase rate per unit
  sellRate?: number;        // catalog rate (for info)
  suggestedRate?: number;   // suggested purchase rate (from backend or derived)
  piecesPerPacket?: number;
  packetsPerCarton?: number;
}

export interface PurchaseBillDraft {
  date: string;             // ISO date: "YYYY-MM-DD"
  companies: string[];      // selected companies for this bill
  vendor: string;
  billNo: string;
  taxMode: TaxMode;
  taxPct: number;
  discountType: "ABS" | "PCT";
  discountValue: number;
  otherCharges: number;
  notes?: string;
  lines: PurchaseLineDraft[];
}

export interface PurchaseBillSaved {
  id: string;               // internal ID (e.g. "PR-01", "PR-02")
  header: {
    billId: string;
    date: string;
    companySummary: string; // e.g., comma-joined companies
    vendor: string;
    billNo: string;
    taxMode: TaxMode;
    taxPct: number;
    discountType: "ABS" | "PCT";
    discountValue: number;
    otherCharges: number;
    notes?: string;
  };
  lines: {
    lineNo: number;
    productId: string;
    product: string;
    unit: string;
    qty: number;
    rate: number;
    gross: number;
    discount: number; // Apportioned discount (optional logic) or just 0 if handled at header
    tax: number;      // Apportioned tax
    other: number;
    net: number;
  }[];
  totals: {
    qty: number;
    gross: number;
    discount: number;
    tax: number;
    other: number;
    net: number;
  };
}

export interface PurchaseLineRow {
  id: string;        // Unique row ID for React keys
  date: string;      // "YYYY-MM-DD"
  billId: string;    // e.g. "PR-05"
  company: string;
  vendor: string;
  product: string;
  qty: number;
  rate: number;
  net: number;
  taxMode: TaxMode;
  notes?: string;
}

export interface PurchaseSearchQuery {
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  vendor?: string;
  billId?: string;
  product?: string;
  taxMode?: TaxMode | "";
  minRate?: number;
  maxRate?: number;
  minNet?: number;
  maxNet?: number;
}

export interface PurchaseSearchResult {
  total: number;
  page: number;
  pageSize: number;
  rows: PurchaseLineRow[];
}

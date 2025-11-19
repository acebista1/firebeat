
export interface ReportFilterState {
  startDate: string;
  endDate: string;
  companyIds: string[];
  employeeIds: string[];
}

export interface SalesReportRow {
  id: string;
  date: string;
  invoiceNo: string;
  salespersonName: string;
  customerName: string;
  companyName: string; // Representative company if mixed
  subTotal: number;
  discountAmount: number;
  grandTotal: number;
  paymentMode: string;
}

export interface DispatchRow {
  productId: string;
  productName: string;
  companyName: string;
  totalQty: number;
  cartons: number;
  packets: number;
  pieces: number;
  totalAmount: number; // optional, for value check
}

export interface SchemeRow {
  companyName: string;
  productName: string;
  totalQty: number;
  grossAmount: number;
  primaryDiscountPct: number;
  schemeDiscountPct: number; // Secondary
  totalDiscountAmt: number;
  netAmount: number;
}

export interface ChallanValidationRow {
  orderId: string;
  invoiceNo: string;
  customerName: string;
  date: string;
  expectedTotal: number;
  calculatedTotal: number;
  difference: number;
  status: 'MATCH' | 'MISMATCH';
  itemsCount: number;
}

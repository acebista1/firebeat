
import { Invoice, SalesReturn, DamagedGoodsLog, InvoiceItem, SalesReturnItem, ReturnReason, DamageReason } from '../types';

// --- INITIAL MOCK DATA ---

const mockInvoices: Invoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2025-1001',
    customerId: 'cust-1',
    customerName: 'Gupta General Store',
    routeName: 'Sector 15',
    deliveryDate: '2025-02-20',
    totalAmount: 4500,
    status: 'delivered',
    items: [
      { id: 'item-1', invoiceId: 'inv-001', productId: 'p1', productName: 'Parle-G 100g', companyName: 'Parle', qtyPieces: 50, rate: 10, lineTotal: 500 },
      { id: 'item-2', invoiceId: 'inv-001', productId: 'p2', productName: 'Britannia Cake', companyName: 'Britannia', qtyPieces: 20, rate: 25, lineTotal: 500 },
      { id: 'item-3', invoiceId: 'inv-001', productId: 'p3', productName: 'Coke 2L', companyName: 'Coca-Cola', qtyPieces: 10, rate: 90, lineTotal: 900 }
    ]
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2025-1002',
    customerId: 'cust-2',
    customerName: 'Sharma Kirana',
    routeName: 'MG Road',
    deliveryDate: '2025-02-21',
    totalAmount: 1200,
    status: 'delivered',
    items: [
      { id: 'item-4', invoiceId: 'inv-002', productId: 'p2', productName: 'Britannia Cake', companyName: 'Britannia', qtyPieces: 48, rate: 25, lineTotal: 1200 }
    ]
  },
  {
    id: 'inv-003',
    invoiceNumber: 'INV-2025-1003',
    customerId: 'cust-3',
    customerName: 'City Supermart',
    routeName: 'Civil Lines',
    deliveryDate: '2025-02-22',
    totalAmount: 8500,
    status: 'pending', // Pending delivery cannot be returned yet
    items: []
  }
];

const mockReturns: SalesReturn[] = [
  {
    id: 'ret-001',
    invoiceId: 'inv-001',
    invoiceNumber: 'INV-2025-1001',
    customerId: 'cust-1',
    customerName: 'Gupta General Store',
    returnType: 'partial',
    reason: 'quality_issue',
    notes: '2 bottles leaked',
    createdByUserId: 'u1',
    createdByUserName: 'Admin',
    createdAt: '2025-02-21T10:00:00Z',
    totalReturnAmount: 180
  }
];

const mockDamageLogs: DamagedGoodsLog[] = [
  {
    id: 'dmg-001',
    productId: 'p3',
    productName: 'Coke 2L',
    companyName: 'Coca-Cola',
    qtyPieces: 2,
    damageReason: 'damaged_at_customer',
    sourceType: 'return',
    sourceInvoiceNumber: 'INV-2025-1001',
    createdByUserId: 'u1',
    createdByUserName: 'Admin',
    createdAt: '2025-02-21T10:00:00Z'
  }
];

// --- SERVICE CLASS ---

export class MockReturnService {
  private static invoices = mockInvoices;
  private static returns = mockReturns;
  private static damageLogs = mockDamageLogs;

  static getInvoices(statusFilter?: string) {
    if (statusFilter) {
      return this.invoices.filter(i => i.status === statusFilter);
    }
    return this.invoices;
  }

  static getInvoiceById(id: string) {
    return this.invoices.find(i => i.id === id);
  }

  static getReturns() {
    return [...this.returns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static getReturnById(id: string) {
    return this.returns.find(r => r.id === id);
  }

  static getDamagedLogs() {
    return [...this.damageLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static createReturn(payload: {
    invoiceId: string;
    returnType: "full" | "partial";
    reason: ReturnReason;
    notes?: string;
    items: Array<{
      invoiceItemId: string;
      productId: string;
      qtyReturnedGood: number;
      qtyReturnedDamaged: number;
    }>;
  }) {
    const invoice = this.invoices.find(i => i.id === payload.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Calculate Total
    let totalAmount = 0;
    const returnItems: SalesReturnItem[] = [];
    const newDamageLogs: DamagedGoodsLog[] = [];

    payload.items.forEach(item => {
      const originalItem = invoice.items.find(i => i.id === item.invoiceItemId);
      if (!originalItem) return;

      const totalQty = item.qtyReturnedGood + item.qtyReturnedDamaged;
      const lineAmt = totalQty * originalItem.rate;
      totalAmount += lineAmt;

      if (totalQty > 0) {
        returnItems.push({
          id: `ri-${Date.now()}-${Math.random()}`,
          salesReturnId: 'temp',
          invoiceItemId: item.invoiceItemId,
          productId: originalItem.productId,
          productName: originalItem.productName,
          companyName: originalItem.companyName,
          qtyInvoiced: originalItem.qtyPieces,
          qtyReturnedGood: item.qtyReturnedGood,
          qtyReturnedDamaged: item.qtyReturnedDamaged,
          rate: originalItem.rate,
          lineReturnAmount: lineAmt
        });

        // If Damaged, Log it
        if (item.qtyReturnedDamaged > 0) {
          newDamageLogs.push({
            id: `dmg-${Date.now()}-${Math.random()}`,
            productId: originalItem.productId,
            productName: originalItem.productName,
            companyName: originalItem.companyName,
            qtyPieces: item.qtyReturnedDamaged,
            damageReason: payload.reason as DamageReason || 'other',
            sourceType: 'return',
            sourceInvoiceId: invoice.id,
            sourceInvoiceNumber: invoice.invoiceNumber,
            createdByUserId: 'current-user',
            createdByUserName: 'Current User',
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Create Return Record
    const newReturn: SalesReturn = {
      id: `ret-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      returnType: payload.returnType,
      reason: payload.reason,
      notes: payload.notes,
      createdByUserId: 'current-user',
      createdByUserName: 'Current User',
      createdAt: new Date().toISOString(),
      totalReturnAmount: totalAmount
    };

    // Update State
    this.returns.push(newReturn);
    this.damageLogs.push(...newDamageLogs);

    // Update Invoice Status
    invoice.status = payload.returnType === 'full' ? 'returned' : 'partially_returned';

    return newReturn;
  }

  static logInternalDamage(payload: {
    productId: string;
    productName: string;
    qtyPieces: number;
    reason: DamageReason;
    notes?: string;
  }) {
    const newLog: DamagedGoodsLog = {
      id: `dmg-${Date.now()}`,
      productId: payload.productId,
      productName: payload.productName,
      companyName: 'Unknown', // In real app, fetch from product ID
      qtyPieces: payload.qtyPieces,
      damageReason: payload.reason,
      sourceType: 'internal',
      createdByUserId: 'current-user',
      createdByUserName: 'Current User',
      createdAt: new Date().toISOString(),
      notes: payload.notes
    };
    this.damageLogs.push(newLog);
  }
}

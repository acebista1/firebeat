
import { SalesReportRow, DispatchRow, SchemeRow, ChallanValidationRow, ReportFilterState } from '../types/reports';
import { MOCK_PRODUCTS, MOCK_EMPLOYEES, MOCK_COMPANIES } from './mockMasterData';

// Helper to generate consistent random orders based on date
const generateMockOrdersForRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const orders = [];
  
  // Loop days
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Generate 5-10 orders per day
    const count = Math.floor(Math.random() * 5) + 5;
    for (let i = 0; i < count; i++) {
      const dateStr = d.toISOString().split('T')[0];
      const sp = MOCK_EMPLOYEES[Math.floor(Math.random() * MOCK_EMPLOYEES.length)];
      // Random mix of items
      const items = [];
      let subTotal = 0;
      let totalDiscount = 0;
      const itemCount = Math.floor(Math.random() * 5) + 1;
      
      for(let j=0; j<itemCount; j++) {
         const prod = MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)];
         const qty = Math.ceil(Math.random() * 10) * prod.orderMultiple;
         const rate = prod.baseRate;
         const gross = qty * rate;
         
         // Calculate Discount
         let discPct = ((prod.baseRate - prod.discountedRate) / prod.baseRate) * 100;
         // Apply scheme if eligible (Simulate secondary)
         let schemePct = 0;
         if (prod.secondaryAvailable && prod.secondaryQualifyingQty && qty >= prod.secondaryQualifyingQty) {
            schemePct = prod.secondaryDiscountPct || 0;
         }
         
         const totalDiscPct = discPct + schemePct;
         const discAmt = gross * (totalDiscPct / 100);
         
         items.push({
           productId: prod.id,
           productName: prod.name,
           companyId: prod.companyId,
           companyName: prod.companyName,
           qty,
           rate, // Base Rate
           gross,
           primaryDiscountPct: discPct,
           schemeDiscountPct: schemePct,
           discountAmount: discAmt,
           net: gross - discAmt,
           packetsPerCarton: prod.packetsPerCarton || 1,
           piecesPerPacket: prod.piecesPerPacket || 1
         });
         
         subTotal += gross;
         totalDiscount += discAmt;
      }

      orders.push({
        id: `ORD-${dateStr.replace(/-/g,'')}-${i}`,
        date: dateStr,
        invoiceNo: `INV-${dateStr.slice(2).replace(/-/g,'')}-${1000+i}`,
        salespersonId: sp.id,
        salespersonName: sp.name,
        customerName: `Shop ${String.fromCharCode(65 + i)} ${dateStr.slice(-2)}`,
        items,
        subTotal,
        discountAmount: totalDiscount,
        grandTotal: subTotal - totalDiscount,
        paymentMode: Math.random() > 0.5 ? 'Cash' : 'Credit'
      });
    }
  }
  return orders;
};

export const MockReportService = {
  
  getSalesReport: (filters: ReportFilterState): SalesReportRow[] => {
    let orders = generateMockOrdersForRange(filters.startDate, filters.endDate);
    
    // Filter
    if (filters.employeeIds.length > 0) {
      orders = orders.filter(o => filters.employeeIds.includes(o.salespersonId));
    }
    if (filters.companyIds.length > 0) {
      // Check if order has any item from selected companies
      orders = orders.filter(o => o.items.some((i: any) => filters.companyIds.includes(i.companyId)));
    }

    // Transform to Rows
    const rows: SalesReportRow[] = orders.map(o => {
      // Represent company as "Mixed" if multiple, or specific name if single
      const items = o.items as any[];
      const comps = Array.from(new Set(items.map(i => i.companyName as string)));
      const companyName = comps.length > 1 ? 'Mixed' : (comps[0] || 'Unknown');

      return {
        id: o.id,
        date: o.date,
        invoiceNo: o.invoiceNo,
        salespersonName: o.salespersonName,
        customerName: o.customerName,
        companyName,
        subTotal: o.subTotal,
        discountAmount: o.discountAmount,
        grandTotal: o.grandTotal,
        paymentMode: o.paymentMode
      };
    });

    // Sorting
    rows.sort((a, b) => a.date.localeCompare(b.date));

    return rows;
  },

  getDispatchReport: (filters: ReportFilterState): DispatchRow[] => {
    let orders = generateMockOrdersForRange(filters.startDate, filters.endDate);
    
    if (filters.employeeIds.length > 0) orders = orders.filter(o => filters.employeeIds.includes(o.salespersonId));
    
    const productMap = new Map<string, DispatchRow>();

    orders.forEach(order => {
      (order.items as any[]).forEach(item => {
        if (filters.companyIds.length > 0 && !filters.companyIds.includes(item.companyId)) return;

        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            companyName: item.companyName,
            totalQty: 0,
            cartons: 0,
            packets: 0,
            pieces: 0,
            totalAmount: 0
          });
        }
        
        const entry = productMap.get(item.productId)!;
        entry.totalQty += item.qty;
        entry.totalAmount += item.net;
        
        // Recalculate packing
        const ppCarton = item.packetsPerCarton || 1;
        const ppPacket = item.piecesPerPacket || 1;
        
        const totalPiecesInCarton = ppCarton * ppPacket;
        
        entry.cartons = Math.floor(entry.totalQty / totalPiecesInCarton);
        let remainder = entry.totalQty % totalPiecesInCarton;
        
        entry.packets = Math.floor(remainder / ppPacket);
        entry.pieces = remainder % ppPacket;
      });
    });

    return Array.from(productMap.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
  },

  getSchemeReport: (filters: ReportFilterState): SchemeRow[] => {
    let orders = generateMockOrdersForRange(filters.startDate, filters.endDate);
    
    const schemeMap = new Map<string, SchemeRow>();

    orders.forEach(order => {
      (order.items as any[]).forEach(item => {
        if (filters.companyIds.length > 0 && !filters.companyIds.includes(item.companyId)) return;
        
        const key = `${item.companyName}-${item.productName}`;
        if (!schemeMap.has(key)) {
          schemeMap.set(key, {
            companyName: item.companyName,
            productName: item.productName,
            totalQty: 0,
            grossAmount: 0,
            primaryDiscountPct: item.primaryDiscountPct,
            schemeDiscountPct: 0, // Will avg
            totalDiscountAmt: 0,
            netAmount: 0
          });
        }

        const entry = schemeMap.get(key)!;
        entry.totalQty += item.qty;
        entry.grossAmount += item.gross;
        entry.totalDiscountAmt += item.discountAmount;
        entry.netAmount += item.net;
      });
    });

    const rows = Array.from(schemeMap.values()).map(r => ({
      ...r,
      schemeDiscountPct: r.grossAmount > 0 
        ? Math.max(0, ((r.totalDiscountAmt / r.grossAmount) * 100) - r.primaryDiscountPct) 
        : 0
    }));

    return rows.sort((a, b) => a.companyName.localeCompare(b.companyName));
  },

  getChallanValidation: (filters: ReportFilterState): ChallanValidationRow[] => {
    let orders = generateMockOrdersForRange(filters.startDate, filters.endDate);
    if (filters.employeeIds.length > 0) orders = orders.filter(o => filters.employeeIds.includes(o.salespersonId));

    return orders.map(order => {
      // Simulate a random discrepancy for demo purposes (5% chance)
      const isCorrupted = Math.random() < 0.05; 
      const storedTotal = order.grandTotal;
      const realTotal = isCorrupted ? order.grandTotal + Math.floor(Math.random() * 100) : order.grandTotal;

      return {
        orderId: order.id,
        invoiceNo: order.invoiceNo,
        customerName: order.customerName,
        date: order.date,
        expectedTotal: storedTotal,
        calculatedTotal: realTotal,
        difference: realTotal - storedTotal,
        status: (Math.abs(realTotal - storedTotal) < 1 ? 'MATCH' : 'MISMATCH') as 'MATCH' | 'MISMATCH',
        itemsCount: order.items.length
      };
    });
  }
};

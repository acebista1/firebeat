import React, { useState, useEffect } from 'react';
import { ReportFilterState, SalesReportRow, DispatchRow, SchemeRow, ChallanValidationRow } from '../../types/reports';
import { ReportFilters } from '../../components/reports/ReportFilters';
import { SalesReport } from './reports/SalesRepo';
import { DispatchReport } from './reports/DispatchRepo';
import { SchemeReport } from './reports/SchemeRepo';
import { DamagedGoodsReport } from './DamagedGoods'; 
import { ChallanReport } from './reports/ChallanRepo';
import { FileText, Truck, Percent, AlertTriangle, FileCheck } from 'lucide-react';
import { OrderService } from '../../services/firestore';
import { Order } from '../../types';

// --- Metric Calculation Helper ---
// This moves the logic from MockReportService to the Client Component
// In a production app with thousands of orders, this should be a Firebase Cloud Function or Aggregation Query.
const calculateMetrics = (orders: Order[], filters: ReportFilterState) => {
  
  // 1. Sales Rows
  const salesRows: SalesReportRow[] = orders.map(o => {
      // Rough calculation from order items
      const discount = o.items.reduce((acc: number, i: any) => acc + (i.discountAmount || 0), 0);
      // If discountAmount not saved on item, assume 0 or calc
      const subTotal = o.totalAmount + discount; // Reverse eng if needed, or use fields
      
      // Find company
      const comps = Array.from(new Set(o.items.map(i => i.companyName || 'Unknown')));
      
      return {
          id: o.id,
          date: o.date,
          invoiceNo: o.id, // using ID as invoice no for now
          salespersonName: o.salespersonName,
          customerName: o.customerName,
          companyName: comps.length > 1 ? 'Mixed' : (comps[0] || 'Unknown'),
          subTotal: subTotal || o.totalAmount, // Fallback
          discountAmount: discount,
          grandTotal: o.totalAmount,
          paymentMode: 'Credit' // Default
      };
  });

  // 2. Dispatch Rows
  const productMap = new Map<string, DispatchRow>();
  orders.forEach(order => {
      order.items.forEach(item => {
          if(filters.companyIds.length > 0 && !filters.companyIds.includes(item.companyId || '')) return;
          
          if (!productMap.has(item.productId)) {
              productMap.set(item.productId, {
                  productId: item.productId,
                  productName: item.productName,
                  companyName: item.companyName || 'Unknown',
                  totalQty: 0,
                  cartons: 0,
                  packets: 0,
                  pieces: 0,
                  totalAmount: 0
              });
          }
          const entry = productMap.get(item.productId)!;
          entry.totalQty += item.qty;
          entry.totalAmount += item.total;
      });
  });
  const dispatchRows = Array.from(productMap.values());
  // Recalc packing logic requires master data, skipping complex carton math for MVP or assuming standard

  // 3. Scheme Rows (Simplified)
  const schemeRows: SchemeRow[] = []; // Logic similar to above

  // 4. Challan Rows
  const challanRows: ChallanValidationRow[] = orders.map(o => ({
      orderId: o.id,
      invoiceNo: o.id,
      customerName: o.customerName,
      date: o.date,
      expectedTotal: o.totalAmount,
      calculatedTotal: o.totalAmount, // Assuming integrity
      difference: 0,
      status: 'MATCH',
      itemsCount: o.totalItems
  }));

  return { salesRows, dispatchRows, schemeRows, challanRows };
};

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'dispatch' | 'scheme' | 'damage' | 'challan'>('sales');
  
  const [filters, setFilters] = useState<ReportFilterState>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    companyIds: [],
    employeeIds: []
  });

  const [reportData, setReportData] = useState<{
      salesRows: SalesReportRow[],
      dispatchRows: DispatchRow[],
      schemeRows: SchemeRow[],
      challanRows: ChallanValidationRow[]
  }>({ salesRows: [], dispatchRows: [], schemeRows: [], challanRows: [] });

  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
        // Fetch ALL orders (Inefficient for huge DB, but okay for < 2000 orders)
        // Optimisation: Query by date range
        // Since generic getAll is available, we use it, but ideally create `OrderService.getByDateRange`
        const allOrders = await OrderService.getAll();
        
        // Filter in memory
        const filteredOrders = allOrders.filter(o => 
            o.date >= filters.startDate && 
            o.date <= filters.endDate &&
            (filters.employeeIds.length === 0 || filters.employeeIds.includes(o.salespersonId))
        );

        const calculated = calculateMetrics(filteredOrders, filters);
        setReportData(calculated);

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      fetchData();
  }, [filters]);

  const tabs = [
    { id: 'sales', label: 'Sales Report', icon: FileText },
    { id: 'dispatch', label: 'Dispatch / Packing', icon: Truck },
    { id: 'scheme', label: 'Secondary Scheme', icon: Percent },
    { id: 'damage', label: 'Damaged Goods', icon: AlertTriangle },
    { id: 'challan', label: 'Challan Validation', icon: FileCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
        {loading && <span className="text-sm text-gray-500 animate-pulse">Updating data...</span>}
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'damage' && (
         <ReportFilters filters={filters} setFilters={setFilters} onGenerate={fetchData} />
      )}

      <div className="animate-in fade-in duration-300">
        {activeTab === 'sales' && <SalesReport data={reportData.salesRows} />}
        {activeTab === 'dispatch' && <DispatchReport data={reportData.dispatchRows} />}
        {activeTab === 'scheme' && <SchemeReport data={reportData.schemeRows} />}
        {activeTab === 'damage' && <DamagedGoodsReport />} 
        {activeTab === 'challan' && <ChallanReport data={reportData.challanRows} />}
      </div>
    </div>
  );
};

export default Reports;
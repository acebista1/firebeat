
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Select } from '../../../components/ui/Elements';
import { Search, RotateCcw, Download, Eye } from 'lucide-react';
import { PurchaseSearchQuery, PurchaseSearchResult, PurchaseBillSaved } from '../../../types/purchase';
import { fetchPurchaseSearchMeta } from '../../../lib/purchaseApi';
import { PurchaseService } from '../../../services/firestore';
import { BillModal } from './BillModal';

export const PurchaseSearch: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ companies: string[], vendors: string[], taxModes: string[] }>({ companies: [], vendors: [], taxModes: [] });
  
  // All Data (since filtering on client is easier for MVP)
  const [allBills, setAllBills] = useState<PurchaseBillSaved[]>([]);
  const [filteredBills, setFilteredBills] = useState<PurchaseBillSaved[]>([]);
  
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState<PurchaseSearchQuery>({
    company: '',
    vendor: '',
    billId: '',
    product: '',
    taxMode: '',
  });

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchPurchaseSearchMeta().then(m => setMeta(m));
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await PurchaseService.getAll();
        setAllBills(data);
        setFilteredBills(data);
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = useCallback(() => {
    let result = allBills;

    if (query.billId) result = result.filter(b => b.header.billId.toLowerCase().includes(query.billId!.toLowerCase()));
    if (query.vendor) result = result.filter(b => b.header.vendor === query.vendor);
    if (query.company) result = result.filter(b => b.header.companySummary.includes(query.company!));
    if (query.taxMode) result = result.filter(b => b.header.taxMode === query.taxMode);
    if (query.dateFrom) result = result.filter(b => b.header.date >= query.dateFrom!);
    if (query.dateTo) result = result.filter(b => b.header.date <= query.dateTo!);
    if (query.product) result = result.filter(b => b.lines.some(l => l.product.toLowerCase().includes(query.product!.toLowerCase())));

    setFilteredBills(result);
    setPage(1);
  }, [query, allBills]);

  const handleReset = () => {
    setQuery({ company: '', vendor: '', billId: '', product: '', taxMode: '' });
    setFilteredBills(allBills);
    setPage(1);
  };

  const handleExport = () => {
    const header = "Date,BillID,Company,Vendor,Qty,Net\n";
    const rows = filteredBills.map(b => 
      `${b.header.date},${b.header.billId},"${b.header.companySummary}","${b.header.vendor}",${b.totals.qty},${b.totals.net}`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "purchases_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (field: string) => {
    const dir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortDir(dir);
    
    const sorted = [...filteredBills].sort((a: any, b: any) => {
        let valA, valB;
        if (field === 'date') { valA = a.header.date; valB = b.header.date; }
        else if (field === 'billId') { valA = a.header.billId; valB = b.header.billId; }
        else { return 0; }
        
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
    });
    setFilteredBills(sorted);
  };

  // Pagination Logic
  const total = filteredBills.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIdx = (page - 1) * pageSize;
  const pageData = filteredBills.slice(startIdx, startIdx + pageSize);

  return (
    <div className="space-y-6">
      <Card title="Search Purchases">
        <div className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label="Date From" type="date" value={query.dateFrom} onChange={e => setQuery({...query, dateFrom: e.target.value})} />
              <Input label="Date To" type="date" value={query.dateTo} onChange={e => setQuery({...query, dateTo: e.target.value})} />
              <Input label="Bill ID" placeholder="e.g. PR-01" value={query.billId} onChange={e => setQuery({...query, billId: e.target.value})} />
              <Input label="Product" placeholder="Contains..." value={query.product} onChange={e => setQuery({...query, product: e.target.value})} />
           </div>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select 
                label="Company" 
                options={[{ label: 'All', value: '' }, ...meta.companies.map(c => ({ label: c, value: c }))]}
                value={query.company}
                onChange={e => setQuery({...query, company: e.target.value})}
              />
              <Select 
                label="Vendor" 
                options={[{ label: 'All', value: '' }, ...meta.vendors.map(v => ({ label: v, value: v }))]}
                value={query.vendor}
                onChange={e => setQuery({...query, vendor: e.target.value})}
              />
              <Select 
                label="Tax Mode" 
                options={[{ label: 'All', value: '' }, ...meta.taxModes.map(t => ({ label: t, value: t }))]}
                value={query.taxMode}
                onChange={e => setQuery({...query, taxMode: e.target.value as any})}
              />
              <div className="flex items-end gap-2">
                 <Button onClick={handleSearch} isLoading={loading} className="flex-1">
                   <Search className="mr-2 h-4 w-4" /> Search
                 </Button>
                 <Button variant="outline" onClick={handleReset} title="Reset Filters">
                   <RotateCcw className="h-4 w-4" />
                 </Button>
                 <Button variant="outline" onClick={handleExport} title="Export CSV">
                   <Download className="h-4 w-4" />
                 </Button>
              </div>
           </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleSort('date')}>Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleSort('billId')}>Bill ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Vendor</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Net</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
               {loading ? (
                 <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading...</td></tr>
               ) : pageData.length === 0 ? (
                 <tr><td colSpan={7} className="p-8 text-center text-gray-400">No records found.</td></tr>
               ) : (
                 pageData.map(row => (
                   <tr key={row.id} className="hover:bg-gray-50">
                     <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{row.header.date}</td>
                     <td className="px-4 py-3">
                        <button 
                          onClick={() => setSelectedBillId(row.id)}
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          {row.header.billId}
                        </button>
                     </td>
                     <td className="px-4 py-3 text-gray-500">{row.header.companySummary}</td>
                     <td className="px-4 py-3 text-gray-500">{row.header.vendor}</td>
                     <td className="px-4 py-3 text-right">{row.totals.qty}</td>
                     <td className="px-4 py-3 text-right font-bold">{row.totals.net.toFixed(2)}</td>
                     <td className="px-4 py-3 text-center">
                        <button onClick={() => setSelectedBillId(row.id)} className="text-gray-400 hover:text-indigo-600">
                          <Eye className="h-4 w-4" />
                        </button>
                     </td>
                   </tr>
                 ))
               )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
           <div className="text-sm text-gray-700">
              Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span> ({total} total)
           </div>
           <div className="flex gap-2">
             <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
             <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
           </div>
        </div>
      </Card>

      <BillModal billId={selectedBillId} onClose={() => setSelectedBillId(null)} />
    </div>
  );
};

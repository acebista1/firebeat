
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge } from '../../components/ui/Elements';
import { Eye, Plus, Search, FileText, Filter, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SalesReturn } from '../../types';
import { ReturnService } from '../../services/firestore';

export const ReturnsList: React.FC = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const data = await ReturnService.getAll();
            // Sort by date desc
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setReturns(data);
            setFilteredReturns(data);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    let result = returns;
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.invoiceNumber.toLowerCase().includes(lower) || 
        r.customerName.toLowerCase().includes(lower)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(r => r.returnType === typeFilter);
    }

    if (dateFilter) {
      // Matches returns created on this date. Assuming createdAt is ISO.
      result = result.filter(r => r.createdAt.startsWith(dateFilter));
    }

    setFilteredReturns(result);
  }, [searchTerm, typeFilter, dateFilter, returns]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sales Returns</h2>
          <p className="text-sm text-gray-500">Manage customer returns and rejections</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => navigate('/admin/damaged-goods')}>
             <FileText className="mr-2 h-4 w-4" /> Damaged Report
           </Button>
           <Button onClick={() => navigate('/admin/invoices/select-return')}>
             <Plus className="mr-2 h-4 w-4" /> Create Return
           </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-grow">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
             <Input 
               placeholder="Search Invoice or Customer..." 
               className="pl-9"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="relative w-full md:w-48">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
             <input 
               type="date"
               className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
             />
           </div>
           <div className="w-full md:w-48">
             <Select 
               options={[
                 { label: 'All Types', value: 'all' },
                 { label: 'Full Return', value: 'full' },
                 { label: 'Partial Return', value: 'partial' }
               ]}
               value={typeFilter}
               onChange={(e) => setTypeFilter(e.target.value)}
             />
           </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Return Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer / Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading returns...</td></tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No returns found.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-indigo-600">{ret.id}</div>
                      <div className="text-xs text-gray-500">{new Date(ret.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ret.customerName}</div>
                      <div className="text-xs text-gray-500">Inv: {ret.invoiceNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={ret.returnType === 'full' ? 'red' : 'yellow'}>
                        {ret.returnType === 'full' ? 'Full Return' : 'Partial'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {ret.reason.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      ₹{ret.totalReturnAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

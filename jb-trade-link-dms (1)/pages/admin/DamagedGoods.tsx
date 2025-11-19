
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import { DamagedGoodsLog, DamageReason } from '../../types';
import { DamageLogService } from '../../services/firestore';

export const DamagedGoodsReport: React.FC = () => {
  const [logs, setLogs] = useState<DamagedGoodsLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DamagedGoodsLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLog, setNewLog] = useState<{
    productName: string; 
    qtyPieces: number; 
    reason: DamageReason; 
    notes: string
  }>({
    productName: '',
    qtyPieces: 0,
    reason: 'damaged_in_godown',
    notes: ''
  });

  useEffect(() => {
    refreshLogs();
  }, []);

  const refreshLogs = async () => {
    setLoading(true);
    try {
        const data = await DamageLogService.getAll();
        // Sort Desc
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(data);
        setFilteredLogs(data);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    let result = logs;
    if (searchTerm) {
      result = result.filter(l => l.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (reasonFilter !== 'all') {
      result = result.filter(l => l.damageReason === reasonFilter);
    }
    setFilteredLogs(result);
  }, [searchTerm, reasonFilter, logs]);

  const handleLogInternal = async () => {
    if (!newLog.productName || newLog.qtyPieces <= 0) return;
    
    try {
        await DamageLogService.add({
            id: `DMG-${Date.now()}`,
            productId: 'manual-entry', 
            productName: newLog.productName,
            companyName: 'Internal',
            qtyPieces: newLog.qtyPieces,
            damageReason: newLog.reason,
            sourceType: 'internal',
            createdByUserId: 'admin',
            createdByUserName: 'Admin',
            createdAt: new Date().toISOString(),
            notes: newLog.notes
        });
        
        refreshLogs();
        setIsLogModalOpen(false);
        setNewLog({ productName: '', qtyPieces: 0, reason: 'damaged_in_godown', notes: '' });
    } catch (e) {
        alert("Failed to log damage");
    }
  };

  // Stats
  const totalDamaged = filteredLogs.reduce((sum, l) => sum + l.qtyPieces, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="text-red-500" /> Damaged Goods
          </h2>
        </div>
        <Button onClick={() => setIsLogModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Log Internal Damage
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-red-50 border-red-100">
          <p className="text-red-600 font-medium text-sm">Total Damaged Qty</p>
          <h3 className="text-2xl font-bold text-red-900">{totalDamaged} Pieces</h3>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500 font-medium text-sm">Returns Damage</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {filteredLogs.filter(l => l.sourceType === 'return').reduce((s, l) => s + l.qtyPieces, 0)}
          </h3>
        </Card>
        <Card className="p-4">
          <p className="text-gray-500 font-medium text-sm">Internal / Expired</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {filteredLogs.filter(l => l.sourceType === 'internal').reduce((s, l) => s + l.qtyPieces, 0)}
          </h3>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-grow">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
             <Input 
               placeholder="Search Product Name..." 
               className="pl-9"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="w-full md:w-48">
             <Select 
               options={[
                 { label: 'All Reasons', value: 'all' },
                 { label: 'Transit Damage', value: 'damaged_in_transit' },
                 { label: 'Customer Damage', value: 'damaged_at_customer' },
                 { label: 'Godown Damage', value: 'damaged_in_godown' },
                 { label: 'Expiry', value: 'expiry' }
               ]}
               value={reasonFilter}
               onChange={(e) => setReasonFilter(e.target.value)}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading logs...</td></tr>
              ) : filteredLogs.length === 0 ? (
                 <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No damage logs found.</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                      {log.qtyPieces}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {log.damageReason.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={log.sourceType === 'return' ? 'yellow' : 'gray'}>
                        {log.sourceType.toUpperCase()}
                      </Badge>
                      {log.sourceInvoiceNumber && <span className="text-xs text-gray-400 block mt-0.5">{log.sourceInvoiceNumber}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                      {log.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Internal Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Log Internal Damage">
        <div className="space-y-4">
          <Input 
             label="Product Name" 
             placeholder="Search or type product..." 
             value={newLog.productName}
             onChange={(e) => setNewLog({...newLog, productName: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
             <Input 
                label="Quantity (Pieces)" 
                type="number" 
                value={newLog.qtyPieces}
                onChange={(e) => setNewLog({...newLog, qtyPieces: parseInt(e.target.value) || 0})}
             />
             <Select 
               label="Reason"
               value={newLog.reason}
               onChange={(e) => setNewLog({...newLog, reason: e.target.value as DamageReason})}
               options={[
                 { label: 'Godown Damage', value: 'damaged_in_godown' },
                 { label: 'Expiry', value: 'expiry' },
                 { label: 'Other', value: 'other' }
               ]}
             />
          </div>
          <Input 
             label="Notes" 
             placeholder="Cause of damage..." 
             value={newLog.notes}
             onChange={(e) => setNewLog({...newLog, notes: e.target.value})}
          />
          <div className="flex justify-end gap-3 mt-6">
             <Button variant="outline" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
             <Button onClick={handleLogInternal} variant="danger">Log Damage</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

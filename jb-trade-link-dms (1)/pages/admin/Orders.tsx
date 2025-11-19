
import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Badge } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { Eye, CheckCircle, XCircle, Search, Truck, Calendar, Filter } from 'lucide-react';
import { Order } from '../../types';
import { useNavigate } from 'react-router-dom';

// Mock Data Generation
const generateMockOrders = (): Order[] => {
  const statuses: Order['status'][] = ['pending', 'approved', 'dispatched', 'delivered', 'cancelled'];
  
  return Array.from({ length: 25 }).map((_, i) => {
    // Weighted status distribution
    let statusIndex = 0;
    if (i < 8) statusIndex = 0; // More pending orders for testing bulk actions
    else if (i < 15) statusIndex = 1;
    else statusIndex = i % 5;

    return {
      id: `ORD-${202300 + i}`,
      customerId: `cust-${i}`,
      customerName: `Customer ${String.fromCharCode(65 + (i % 26))} Enterprises`,
      salespersonId: `sp-${i % 3}`,
      salespersonName: i % 3 === 0 ? 'Rahul Sharma' : i % 3 === 1 ? 'Amit Verma' : 'Office',
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      totalItems: Math.floor(Math.random() * 20) + 1,
      totalAmount: Math.floor(Math.random() * 10000) + 500,
      status: statuses[statusIndex],
      items: [
        { productId: 'p1', productName: 'Parle-G 100g', qty: 50, rate: 9.5, total: 475, baseRate: 10, discountPct: 5 },
        { productId: 'p2', productName: 'Britannia Cake', qty: 10, rate: 25, total: 250, baseRate: 25, discountPct: 0 },
        { productId: 'p3', productName: 'Coke 2L', qty: 5, rate: 85, total: 425, baseRate: 90, discountPct: 5.5, schemeAppliedText: '5% Bulk Disc' }
      ],
      remarks: i % 4 === 0 ? 'Urgent delivery requested. Gate closed after 6 PM.' : ''
    };
  });
};

export const OrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  
  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setOrders(generateMockOrders());
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(lower) || 
        o.customerName.toLowerCase().includes(lower) ||
        o.salespersonName.toLowerCase().includes(lower)
      );
    }
    setFilteredOrders(result);
    // Clear selection when filters change to avoid hidden selections
    setSelectedOrderIds(new Set());
  }, [orders, searchTerm, statusFilter]);

  // --- Actions ---

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleBulkStatusChange = (newStatus: Order['status']) => {
    if (selectedOrderIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to mark ${selectedOrderIds.size} orders as ${newStatus.toUpperCase()}?`)) return;

    setOrders(prev => prev.map(o => selectedOrderIds.has(o.id) ? { ...o, status: newStatus } : o));
    setSelectedOrderIds(new Set());
  };

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const goToDispatch = () => {
    setIsModalOpen(false);
    navigate('/admin/dispatch');
  };

  // --- Selection Logic ---

  const handleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
        <div className="flex gap-2">
           <span className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium flex items-center border border-indigo-100">
             Total: {orders.length}
           </span>
           <span className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center border border-yellow-100">
             Pending: {orders.filter(o => o.status === 'pending').length}
           </span>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
             <input 
               type="text" 
               placeholder="Search Order ID, Customer or Salesperson..." 
               className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <div className="w-full md:w-48">
            <Select 
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Dispatched', value: 'dispatched' },
                { label: 'Delivered', value: 'delivered' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
             <CheckCircle className="h-5 w-5 text-indigo-200" />
             <span className="font-medium">{selectedOrderIds.size} orders selected</span>
          </div>
          <div className="flex gap-3">
             <Button 
               variant="secondary" 
               size="sm" 
               onClick={() => handleBulkStatusChange('approved')} 
               className="bg-white text-indigo-700 hover:bg-indigo-50 border-transparent"
             >
               <CheckCircle className="mr-2 h-4 w-4" /> Approve Selected
             </Button>
             <Button 
               variant="danger" 
               size="sm" 
               onClick={() => handleBulkStatusChange('cancelled')} 
               className="bg-red-500 text-white hover:bg-red-600 border-transparent"
             >
               <XCircle className="mr-2 h-4 w-4" /> Reject Selected
             </Button>
             <div className="w-px bg-indigo-400 mx-1"></div>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setSelectedOrderIds(new Set())} 
               className="bg-transparent text-white border-white hover:bg-indigo-700"
             >
               Cancel
             </Button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                    ref={input => { if (input) input.indeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < filteredOrders.length; }}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Salesperson</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-600">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className={`hover:bg-gray-50 group ${selectedOrderIds.has(order.id) ? 'bg-indigo-50' : ''}`}
                    onClick={() => handleSelectRow(order.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                       <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={(e) => { e.stopPropagation(); handleSelectRow(order.id); }}
                       />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-600 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); openOrder(order); }}>
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.salespersonName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {order.totalItems}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      ₹{order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge color={
                        order.status === 'approved' ? 'green' :
                        order.status === 'pending' ? 'yellow' :
                        order.status === 'cancelled' ? 'red' :
                        order.status === 'dispatched' ? 'blue' : 'gray'
                      }>
                        {order.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openOrder(order)} className="text-gray-500 hover:text-indigo-600 p-1" title="View Details">
                        <Eye className="h-5 w-5" />
                      </button>
                      {order.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(order.id, 'approved')} 
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Approve"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleStatusChange(order.id, 'cancelled')} 
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Detail Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Order Details" size="xl">
        {selectedOrder && (
          <div className="space-y-6">
            
            {/* Header Status Bar */}
            <div className="flex justify-between items-start bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                 <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                   {selectedOrder.id}
                 </h3>
                 <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                   <Calendar className="h-3 w-3" /> {selectedOrder.date}
                 </p>
              </div>
              <div className="text-right">
                 <Badge color={
                    selectedOrder.status === 'approved' ? 'green' :
                    selectedOrder.status === 'pending' ? 'yellow' :
                    selectedOrder.status === 'cancelled' ? 'red' : 'blue'
                  }>
                    {selectedOrder.status.toUpperCase()}
                 </Badge>
                 <p className="text-xs text-gray-500 mt-1">Salesperson: {selectedOrder.salespersonName}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Customer Information</h4>
                <p className="text-lg font-medium text-gray-900">{selectedOrder.customerName}</p>
                <p className="text-sm text-gray-500">ID: {selectedOrder.customerId}</p>
                <p className="text-sm text-gray-500 mt-1">Route: Kalopool (Mock)</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Order Remarks</h4>
                {selectedOrder.remarks ? (
                  <p className="text-sm text-gray-800 bg-yellow-50 p-2 rounded border border-yellow-100">
                    {selectedOrder.remarks}
                  </p>
                ) : (
                   <p className="text-sm text-gray-400 italic">No remarks provided.</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
               <h4 className="text-sm font-bold text-gray-700 mb-2">Order Items</h4>
               <div className="border rounded-lg overflow-hidden">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                       {selectedOrder.items.map((item, idx) => (
                         <tr key={idx} className="text-sm">
                           <td className="px-4 py-2 text-gray-900">
                             {item.productName}
                             {item.schemeAppliedText && <div className="text-xs text-green-600">{item.schemeAppliedText}</div>}
                           </td>
                           <td className="px-4 py-2 text-center text-gray-900">{item.qty}</td>
                           <td className="px-4 py-2 text-right text-gray-900">
                             ₹{item.rate}
                             {item.baseRate && item.baseRate > item.rate && (
                               <span className="block text-[10px] text-gray-400 line-through">₹{item.baseRate}</span>
                             )}
                           </td>
                           <td className="px-4 py-2 text-right font-medium text-gray-900">₹{item.total}</td>
                         </tr>
                       ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                       <tr>
                         <td colSpan={3} className="px-4 py-2 text-right font-bold text-gray-900">Grand Total</td>
                         <td className="px-4 py-2 text-right font-bold text-indigo-600">₹{selectedOrder.totalAmount.toLocaleString()}</td>
                       </tr>
                    </tfoot>
                 </table>
               </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
               {selectedOrder.status === 'pending' ? (
                 <>
                   <Button variant="danger" onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}>
                     <XCircle className="mr-2 h-4 w-4" /> Reject
                   </Button>
                   <Button variant="primary" onClick={() => handleStatusChange(selectedOrder.id, 'approved')}>
                     <CheckCircle className="mr-2 h-4 w-4" /> Approve Order
                   </Button>
                 </>
               ) : selectedOrder.status === 'approved' ? (
                 <Button onClick={goToDispatch} className="bg-indigo-600 hover:bg-indigo-700">
                   <Truck className="mr-2 h-4 w-4" /> Assign Delivery
                 </Button>
               ) : (
                 <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
               )}
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Select, Badge } from '../../components/ui/Elements';
import { ArrowLeft, Save, AlertTriangle, Search, Package, CheckCircle, Calendar, Filter } from 'lucide-react';
import { Invoice, ReturnReason, ReturnType, Order, SalesReturn, SalesReturnItem, DamagedGoodsLog, DamageReason } from '../../types';
import { OrderService, ReturnService, DamageLogService } from '../../services/firestore';

// --- Adapting Order to Invoice Interface for this View ---
// The app treats 'Order' with status 'delivered' as an Invoice.
const SelectInvoiceStep = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const [allInvoices, setAllInvoices] = useState<Order[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
        setLoading(true);
        try {
            // In a real app, query only delivered/dispatched
            const data = await OrderService.getAll();
            const delivered = data.filter(o => ['delivered', 'dispatched', 'approved'].includes(o.status));
            setAllInvoices(delivered);
            setFilteredInvoices(delivered);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadOrders();
  }, []);

  useEffect(() => {
    let result = allInvoices;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(inv => 
        inv.customerName.toLowerCase().includes(lower) || 
        inv.id.toLowerCase().includes(lower)
      );
    }

    if (dateFilter) {
      result = result.filter(inv => inv.date === dateFilter);
    }

    setFilteredInvoices(result);
  }, [searchTerm, dateFilter, allInvoices]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800">Select Invoice for Return</h2>
        <p className="text-gray-500">Search and select a delivered invoice to process a sales return.</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
             <Input 
               placeholder="Search Customer or Invoice #" 
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
          {(searchTerm || dateFilter) && (
             <Button variant="ghost" onClick={() => { setSearchTerm(''); setDateFilter(''); }}>
               Clear
             </Button>
          )}
        </div>
      </Card>

      {/* List */}
      <div className="grid gap-4">
        {loading ? <div className="text-center p-10">Loading invoices...</div> : filteredInvoices.map(inv => (
           <Card key={inv.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-indigo-500 hover:bg-gray-50" onClick={() => onSelect(inv.id)}>
               <div className="flex justify-between items-center">
                 <div>
                   <h3 className="font-bold text-lg text-gray-800">{inv.customerName}</h3>
                   <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-1 items-center">
                     <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{inv.id}</span>
                     <span>•</span>
                     <span>{inv.date}</span>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-indigo-600 text-lg">₹{inv.totalAmount.toLocaleString()}</p>
                   <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-500">{inv.totalItems} Items</span>
                      <Badge color={inv.status === 'delivered' ? 'green' : 'blue'}>
                        {inv.status}
                      </Badge>
                   </div>
                 </div>
               </div>
           </Card>
        ))}
        {!loading && filteredInvoices.length === 0 && (
          <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Package className="h-10 w-10 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">No eligible invoices found.</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or date filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const CreateReturn: React.FC = () => {
  const navigate = useNavigate();
  const { invoiceId: paramInvoiceId } = useParams();
  
  const [invoice, setInvoice] = useState<Order | null>(null);
  const [step, setStep] = useState<'select' | 'details'>(paramInvoiceId ? 'details' : 'select');

  // Form State
  const [returnType, setReturnType] = useState<ReturnType>('partial');
  const [reason, setReason] = useState<ReturnReason>('customer_rejected_partial');
  const [notes, setNotes] = useState('');
  
  // Line Items State: { [itemId]: { good: number, damaged: number } }
  const [lineItems, setLineItems] = useState<Record<string, { good: number, damaged: number }>>({});

  // --- Load Invoice ---
  const loadInvoice = async (id: string) => {
    const orders = await OrderService.getOrdersByIds([id]);
    if (orders.length > 0) {
      const inv = orders[0];
      setInvoice(inv);
      // Initialize Line Items with 0
      const initialLines: Record<string, { good: number, damaged: number }> = {};
      // Using productID as key since OrderItems don't always have unique IDs in this schema
      inv.items.forEach(item => {
        initialLines[item.productId] = { good: 0, damaged: 0 };
      });
      setLineItems(initialLines);
      setStep('details');
    }
  };

  useEffect(() => {
    if (paramInvoiceId) loadInvoice(paramInvoiceId);
  }, [paramInvoiceId]);

  // --- Handlers ---

  const handleQtyChange = (itemId: string, field: 'good' | 'damaged', val: string) => {
    const numVal = parseInt(val) || 0;
    if (numVal < 0) return;
    
    setLineItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: numVal
      }
    }));
  };

  const handleConfirm = async () => {
    if (!invoice) return;

    // Validation
    let hasItems = false;
    let isValid = true;
    const itemsPayload: any[] = [];
    let totalReturnAmt = 0;

    const isFull = returnType === 'full';

    invoice.items.forEach(item => {
        const entry = lineItems[item.productId] || { good: 0, damaged: 0 };
        
        let qtyGood = 0;
        let qtyDamaged = 0;

        if (isFull) {
            const isDamagedReason = reason.includes('damage') || reason.includes('expiry');
            qtyGood = isDamagedReason ? 0 : item.qty;
            qtyDamaged = isDamagedReason ? item.qty : 0;
        } else {
            qtyGood = entry.good;
            qtyDamaged = entry.damaged;
        }

        if (qtyGood + qtyDamaged > 0) {
            hasItems = true;
            if (qtyGood + qtyDamaged > item.qty) isValid = false;
            
            const lineTotal = (qtyGood + qtyDamaged) * item.rate;
            totalReturnAmt += lineTotal;

            itemsPayload.push({
                productId: item.productId,
                productName: item.productName,
                companyName: item.companyName || 'Unknown',
                qtyInvoiced: item.qty,
                qtyReturnedGood: qtyGood,
                qtyReturnedDamaged: qtyDamaged,
                rate: item.rate,
                lineReturnAmount: lineTotal
            });
        }
    });

    if (!isValid) {
      alert("Error: Returned quantity cannot exceed invoiced quantity.");
      return;
    }
    if (!hasItems) {
      alert("Error: Please select at least one item to return.");
      return;
    }

    try {
      // 1. Create Sales Return Record
      const returnId = `RET-${Date.now()}`;
      const salesReturn: SalesReturn = {
          id: returnId,
          invoiceId: invoice.id,
          invoiceNumber: invoice.id,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          returnType,
          reason,
          notes,
          createdByUserId: 'admin', // TODO: Get from Auth context
          createdByUserName: 'Admin User',
          createdAt: new Date().toISOString(),
          totalReturnAmount: totalReturnAmt
      };
      await ReturnService.add(salesReturn);

      // 2. Log Damaged Goods
      for (const item of itemsPayload) {
          if (item.qtyReturnedDamaged > 0) {
              const log: DamagedGoodsLog = {
                  id: `DMG-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                  productId: item.productId,
                  productName: item.productName,
                  companyName: item.companyName,
                  qtyPieces: item.qtyReturnedDamaged,
                  damageReason: reason as DamageReason,
                  sourceType: 'return',
                  sourceInvoiceId: invoice.id,
                  sourceInvoiceNumber: invoice.id,
                  createdByUserId: 'admin',
                  createdByUserName: 'Admin User',
                  createdAt: new Date().toISOString(),
                  notes: `Return from ${invoice.customerName}`
              };
              await DamageLogService.add(log);
          }
      }
      
      // 3. Update Invoice Status? (Optional)
      // await OrderService.updateStatus(invoice.id, returnType === 'full' ? 'returned' : 'partially_returned');

      alert("Return Processed Successfully");
      navigate('/admin/returns');
    } catch (e) {
      console.error(e);
      alert("Failed to create return");
    }
  };

  // --- Render Select Step ---
  if (step === 'select') {
    return <SelectInvoiceStep onSelect={loadInvoice} />;
  }

  if (!invoice) return <div>Loading...</div>;

  // --- Calculations for Summary ---
  const totalReturnAmount = invoice.items.reduce((sum, item) => {
    if (returnType === 'full') return sum + item.total;
    const entry = lineItems[item.productId] || { good: 0, damaged: 0 };
    return sum + ((entry.good + entry.damaged) * item.rate);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
         <Button variant="ghost" onClick={() => navigate('/admin/returns')}>
           <ArrowLeft className="h-5 w-5" />
         </Button>
         <div>
           <h2 className="text-2xl font-bold text-gray-800">Create Return</h2>
           <p className="text-sm text-gray-500">Invoice: {invoice.id}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-6">
           <Card className="p-4" title="Return Details">
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Return Type</label>
                 <div className="flex gap-4">
                   <label className="flex items-center gap-2 cursor-pointer">
                     <input 
                       type="radio" 
                       name="rtype" 
                       checked={returnType === 'full'} 
                       onChange={() => setReturnType('full')}
                       className="text-indigo-600 focus:ring-indigo-500"
                     />
                     <span className="text-sm">Full Return</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                     <input 
                       type="radio" 
                       name="rtype" 
                       checked={returnType === 'partial'} 
                       onChange={() => setReturnType('partial')}
                       className="text-indigo-600 focus:ring-indigo-500"
                     />
                     <span className="text-sm">Partial Return</span>
                   </label>
                 </div>
               </div>

               <Select 
                 label="Reason"
                 value={reason}
                 onChange={(e) => setReason(e.target.value as ReturnReason)}
                 options={[
                   { label: 'Customer Rejected (Partial)', value: 'customer_rejected_partial' },
                   { label: 'Customer Rejected (Full)', value: 'customer_rejected_full' },
                   { label: 'Damaged / Quality Issue', value: 'quality_issue' },
                   { label: 'Expired', value: 'expiry_issue' },
                   { label: 'Price Issue', value: 'price_issue' },
                   { label: 'Other', value: 'other' },
                 ]}
               />

               <Input 
                 label="Notes" 
                 value={notes} 
                 onChange={(e) => setNotes(e.target.value)} 
                 placeholder="Any additional remarks..."
               />
             </div>
           </Card>

           <Card className="p-4 bg-gray-50">
              <h4 className="font-bold text-gray-700 mb-2">Invoice Summary</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium">{invoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">{invoice.date}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Total Invoice Value</span>
                  <span className="font-bold">₹{invoice.totalAmount.toLocaleString()}</span>
                </div>
              </div>
           </Card>
        </div>

        {/* Right: Items Grid */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Items to Return</h3>
              <Badge color={returnType === 'full' ? 'red' : 'yellow'}>
                 {returnType === 'full' ? 'All Items Selected' : 'Select Qty'}
              </Badge>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Inv Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase w-24">Good Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase w-24">Dmg Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amt</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map(item => {
                    const entry = lineItems[item.productId] || { good: 0, damaged: 0 };
                    const isFull = returnType === 'full';
                    const currentReturnQty = isFull ? item.qty : (entry.good + entry.damaged);
                    const currentAmt = currentReturnQty * item.rate;
                    const isError = !isFull && (entry.good + entry.damaged > item.qty);

                    return (
                      <tr key={item.productId} className={currentReturnQty > 0 ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">Rate: ₹{item.rate}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {item.qty}
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            disabled={isFull}
                            className={`w-16 text-center text-sm border rounded py-1 ${isFull ? 'bg-gray-100 text-gray-400' : 'border-gray-300 focus:ring-indigo-500'}`}
                            value={isFull ? (reason.includes('damage') ? 0 : item.qty) : entry.good}
                            onChange={(e) => handleQtyChange(item.productId, 'good', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            disabled={isFull}
                            className={`w-16 text-center text-sm border rounded py-1 ${isFull ? 'bg-gray-100 text-gray-400' : 'border-gray-300 focus:ring-indigo-500'}`}
                            value={isFull ? (reason.includes('damage') ? item.qty : 0) : entry.damaged}
                            onChange={(e) => handleQtyChange(item.productId, 'damaged', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          ₹{currentAmt.toFixed(2)}
                          {isError && <div className="text-[10px] text-red-600 font-bold">Exceeds Qty</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Please verify physical stock before confirming.
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Return Value</div>
                <div className="text-2xl font-bold text-indigo-600">₹{totalReturnAmount.toLocaleString()}</div>
              </div>
            </div>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button variant="outline" size="lg" onClick={() => navigate('/admin/returns')}>Cancel</Button>
            <Button size="lg" onClick={handleConfirm}>
              <CheckCircle className="mr-2 h-5 w-5" /> Confirm Return
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, SearchableSelect } from '../../../components/ui/Elements';
import { 
  Product, 
  PurchaseBillDraft, 
  PurchaseLineDraft, 
  TaxMode 
} from '../../../types/purchase';
import { 
  fetchProductCatalog, 
  fetchPurchaseSearchMeta, 
  getSuggestedPurchaseRate
} from '../../../lib/purchaseApi';
import { PurchaseService } from '../../../services/firestore';
import { Trash2, ArrowRight, ArrowLeft, CheckCircle, Info } from 'lucide-react';

interface PurchaseEntryWizardProps {
  onBillSaved: () => void;
}

export const PurchaseEntryWizard: React.FC<PurchaseEntryWizardProps> = ({ onBillSaved }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ companies: string[]; taxModes: TaxMode[] }>({ companies: [], taxModes: [] });
  const [catalog, setCatalog] = useState<Product[]>([]);
  
  // Draft State
  const [draft, setDraft] = useState<PurchaseBillDraft>({
    date: new Date().toISOString().split('T')[0],
    companies: [],
    vendor: '',
    billNo: '',
    taxMode: 'EXCLUSIVE',
    taxPct: 13,
    discountType: 'ABS',
    discountValue: 0,
    otherCharges: 0,
    lines: [],
    notes: ''
  });

  // Step 2 Line Input State
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [currentQty, setCurrentQty] = useState<number>(0);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [lineInfo, setLineInfo] = useState<{ company: string; sellRate: number; suggested: number | null }>({
    company: '-',
    sellRate: 0,
    suggested: null
  });

  // Initial Data Fetch
  useEffect(() => {
    fetchPurchaseSearchMeta().then(m => setMeta(m));
    fetchProductCatalog().then(p => setCatalog(p));
  }, []);

  // Handlers

  const handleAddLine = () => {
    const product = catalog.find(p => p.id === currentProduct);
    if (!product || currentQty <= 0 || currentRate <= 0) return;

    const newLine: PurchaseLineDraft = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      productName: product.name,
      company: product.company,
      unit: 'Piece',
      qty: currentQty,
      rate: currentRate,
      sellRate: lineInfo.sellRate,
      suggestedRate: lineInfo.suggested || undefined,
      piecesPerPacket: product.piecesPerPacket
    };

    setDraft(prev => ({ ...prev, lines: [...prev.lines, newLine] }));
    
    // Reset Inputs
    setCurrentProduct('');
    setCurrentQty(0);
    setCurrentRate(0);
    setLineInfo({ company: '-', sellRate: 0, suggested: null });
  };

  const handleRemoveLine = (index: number) => {
    setDraft(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  };

  const handleProductSelect = async (prodId: string) => {
    setCurrentProduct(prodId);
    const product = catalog.find(p => p.id === prodId);
    if (product) {
      const suggested = await getSuggestedPurchaseRate(prodId);
      setLineInfo({
        company: product.company,
        sellRate: product.discountedRate || product.sellRate,
        suggested
      });
      if (suggested) setCurrentRate(suggested);
    } else {
      setLineInfo({ company: '-', sellRate: 0, suggested: null });
    }
  };

  const handleSave = async () => {
    if (draft.lines.length === 0) return;
    setLoading(true);
    try {
      // Generate Bill ID & Structure for Firestore
      const billId = `PR-${Date.now()}`;
      
      const sumGross = draft.lines.reduce((acc, l) => acc + (l.qty * l.rate), 0);
      const discountAmt = draft.discountType === 'PCT' ? sumGross * (draft.discountValue / 100) : draft.discountValue;
      const taxableBase = Math.max(sumGross - discountAmt, 0);
      
      let taxAmt = 0;
      let net = 0;

      if (draft.taxMode === 'EXCLUSIVE') {
        taxAmt = taxableBase * (draft.taxPct / 100);
        net = taxableBase + taxAmt + draft.otherCharges;
      } else if (draft.taxMode === 'INCLUSIVE') {
        const preTax = taxableBase / (1 + (draft.taxPct / 100));
        taxAmt = taxableBase - preTax;
        net = taxableBase + draft.otherCharges;
      } else {
        net = taxableBase + draft.otherCharges;
      }

      const savedBill = {
        id: billId,
        header: {
            billId,
            date: draft.date,
            companySummary: draft.companies.join(', '),
            vendor: draft.vendor,
            billNo: draft.billNo,
            taxMode: draft.taxMode,
            taxPct: draft.taxPct,
            discountType: draft.discountType,
            discountValue: draft.discountValue,
            otherCharges: draft.otherCharges,
            notes: draft.notes
        },
        lines: draft.lines.map((l, idx) => ({
            lineNo: idx + 1,
            productId: l.productId,
            product: l.productName,
            unit: l.unit,
            qty: l.qty,
            rate: l.rate,
            gross: l.qty * l.rate,
            discount: 0,
            tax: 0,
            other: 0,
            net: l.qty * l.rate
        })),
        totals: {
            qty: draft.lines.reduce((s, l) => s + l.qty, 0),
            gross: sumGross,
            discount: discountAmt,
            tax: taxAmt,
            other: draft.otherCharges,
            net
        }
      };

      await PurchaseService.add(savedBill);
      
      alert(`Bill Saved Successfully! ID: ${billId}`);
      onBillSaved(); 
      // Reset
      setDraft({
        date: new Date().toISOString().split('T')[0],
        companies: [],
        vendor: '',
        billNo: '',
        taxMode: 'EXCLUSIVE',
        taxPct: 13,
        discountType: 'ABS',
        discountValue: 0,
        otherCharges: 0,
        lines: [],
        notes: ''
      });
      setStep(1);
    } catch(e) {
        console.error(e);
        alert("Failed to save bill to database.");
    } finally {
      setLoading(false);
    }
  };

  // Calculations for Step 3
  const sumGross = draft.lines.reduce((sum, l) => sum + (l.qty * l.rate), 0);
  const discountAmt = draft.discountType === 'PCT' ? sumGross * (draft.discountValue / 100) : draft.discountValue;
  const taxableBase = Math.max(sumGross - discountAmt, 0);
  
  let taxAmt = 0;
  let net = 0;

  if (draft.taxMode === 'EXCLUSIVE') {
    taxAmt = taxableBase * (draft.taxPct / 100);
    net = taxableBase + taxAmt + draft.otherCharges;
  } else if (draft.taxMode === 'INCLUSIVE') {
    const preTax = taxableBase / (1 + (draft.taxPct / 100));
    taxAmt = taxableBase - preTax;
    net = taxableBase + draft.otherCharges;
  } else {
    net = taxableBase + draft.otherCharges;
  }

  // Filtered Catalog based on selected companies
  const filteredCatalog = draft.companies.length > 0 
    ? catalog.filter(p => draft.companies.includes(p.company))
    : catalog;

  const productOptions = filteredCatalog.map(p => ({ label: p.name, value: p.id }));

  return (
    <Card className="border-t-4 border-t-indigo-600">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800">Purchase Entry</h2>
        {/* Stepper */}
        <div className="flex items-center mt-4 text-sm font-medium text-gray-500">
          <span className={`${step >= 1 ? 'text-indigo-600' : ''}`}>1. Header</span>
          <div className="h-px w-8 bg-gray-300 mx-2"></div>
          <span className={`${step >= 2 ? 'text-indigo-600' : ''}`}>2. Products</span>
          <div className="h-px w-8 bg-gray-300 mx-2"></div>
          <span className={`${step >= 3 ? 'text-indigo-600' : ''}`}>3. Review</span>
        </div>
      </div>

      {/* STEP 1: HEADER */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Companies</label>
               <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border p-2 rounded bg-gray-50">
                 {meta.companies.map(c => (
                   <label key={c} className="flex items-center space-x-2 text-sm cursor-pointer">
                     <input 
                        type="checkbox" 
                        className="rounded text-indigo-600"
                        checked={draft.companies.includes(c)}
                        onChange={(e) => {
                          if(e.target.checked) setDraft(p => ({...p, companies: [...p.companies, c]}));
                          else setDraft(p => ({...p, companies: p.companies.filter(x => x !== c)}));
                        }}
                     />
                     <span>{c}</span>
                   </label>
                 ))}
               </div>
               {draft.companies.length === 0 && <p className="text-xs text-gray-500 mt-1">Leave empty to allow all products.</p>}
             </div>
             <div className="space-y-4">
                <Input label="Vendor Name" value={draft.vendor} onChange={e => setDraft({...draft, vendor: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Bill No" value={draft.billNo} onChange={e => setDraft({...draft, billNo: e.target.value})} />
                  <Input type="date" label="Date" value={draft.date} onChange={e => setDraft({...draft, date: e.target.value})} />
                </div>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
             <Select 
                label="Tax Mode" 
                value={draft.taxMode}
                options={meta.taxModes.map(m => ({ label: m, value: m }))}
                onChange={e => setDraft({...draft, taxMode: e.target.value as TaxMode})}
             />
             <Input 
                label="Tax %" 
                type="number" 
                value={draft.taxPct} 
                onChange={e => setDraft({...draft, taxPct: Number(e.target.value)})} 
                disabled={draft.taxMode === 'NONE'}
             />
             <Input 
                label="Other Charges" 
                type="number" 
                value={draft.otherCharges} 
                onChange={e => setDraft({...draft, otherCharges: Number(e.target.value)})} 
             />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-2 items-end">
                <div className="flex-grow">
                   <Input 
                     label="Discount" 
                     type="number" 
                     value={draft.discountValue} 
                     onChange={e => setDraft({...draft, discountValue: Number(e.target.value)})} 
                   />
                </div>
                <div className="w-24">
                   <Select 
                     options={[{ label: '₹', value: 'ABS' }, { label: '%', value: 'PCT' }]}
                     value={draft.discountType}
                     onChange={e => setDraft({...draft, discountType: e.target.value as any})}
                   />
                </div>
              </div>
              <div className="md:col-span-2">
                 <Input label="Notes" value={draft.notes} onChange={e => setDraft({...draft, notes: e.target.value})} placeholder="Optional remarks" />
              </div>
           </div>

           <div className="flex justify-end pt-4">
             <Button onClick={() => setStep(2)} disabled={!draft.vendor || !draft.billNo}>
               Next Step <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
        </div>
      )}

      {/* STEP 2: PRODUCTS */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Input Row */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
             <div className="md:col-span-5">
               <SearchableSelect 
                 label="Product" 
                 options={productOptions} 
                 value={currentProduct} 
                 onChange={handleProductSelect}
                 placeholder="Search product..."
               />
             </div>
             <div className="md:col-span-2">
               <Input label="Qty" type="number" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
             </div>
             <div className="md:col-span-2">
               <Input label="Rate" type="number" value={currentRate} onChange={e => setCurrentRate(Number(e.target.value))} />
             </div>
             <div className="md:col-span-3">
               <Button onClick={handleAddLine} className="w-full" disabled={!currentProduct || currentQty <= 0}>
                 Add Line
               </Button>
             </div>
             
             {/* Info Row */}
             <div className="md:col-span-12 flex gap-4 text-xs text-gray-600 pt-2">
               <span className="bg-white border px-2 py-1 rounded">Co: <strong>{lineInfo.company}</strong></span>
               <span className="bg-white border px-2 py-1 rounded">Sell Rate: <strong>{lineInfo.sellRate}</strong></span>
               <span className="bg-white border px-2 py-1 rounded">Suggested: <strong>{lineInfo.suggested ?? 'N/A'}</strong></span>
             </div>
          </div>

          {/* Lines Table */}
          <div className="border rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Co.</th>
                  <th className="px-3 py-2 text-center">Unit</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {draft.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{line.productName}</td>
                    <td className="px-3 py-2 text-gray-500">{line.company}</td>
                    <td className="px-3 py-2 text-center">{line.unit}</td>
                    <td className="px-3 py-2 text-right">{line.qty}</td>
                    <td className="px-3 py-2 text-right">{line.rate}</td>
                    <td className="px-3 py-2 text-right font-medium">{(line.qty * line.rate).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleRemoveLine(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {draft.lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400">No lines added yet.</td>
                  </tr>
                )}
              </tbody>
              {draft.lines.length > 0 && (
                 <tfoot className="bg-gray-50 font-bold">
                   <tr>
                     <td colSpan={5} className="px-3 py-2 text-right">Total Gross:</td>
                     <td className="px-3 py-2 text-right">
                       {draft.lines.reduce((s, l) => s + (l.qty*l.rate), 0).toFixed(2)}
                     </td>
                     <td></td>
                   </tr>
                 </tfoot>
              )}
            </table>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={draft.lines.length === 0}>
              Review Bill <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 max-w-lg mx-auto">
            <h3 className="text-center font-bold text-indigo-900 text-lg mb-4">Bill Summary</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Total</span>
                <span className="font-medium">₹{sumGross.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount ({draft.discountType === 'PCT' ? `${draft.discountValue}%` : 'Flat'})</span>
                <span className="text-green-700">- ₹{discountAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({draft.taxMode} {draft.taxMode !== 'NONE' ? `${draft.taxPct}%` : ''})</span>
                <span className="text-red-700">+ ₹{taxAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Other Charges</span>
                <span className="font-medium">+ ₹{draft.otherCharges.toFixed(2)}</span>
              </div>
              
              <div className="h-px bg-indigo-200 my-2"></div>
              
              <div className="flex justify-between text-xl font-bold text-indigo-900">
                <span>Net Payable</span>
                <span>₹{net.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-center text-indigo-700">
              {draft.lines.length} products • {draft.companies.length || 'All'} companies
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleSave} size="lg" isLoading={loading} className="px-8">
              <CheckCircle className="mr-2 h-5 w-5" /> Save Bill
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

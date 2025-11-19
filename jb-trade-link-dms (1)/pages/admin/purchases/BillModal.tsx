
import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Elements';
import { Printer, Download, X } from 'lucide-react';
import { PurchaseBillSaved } from '../../../types/purchase';
import { PurchaseService } from '../../../services/firestore';

interface BillModalProps {
  billId: string | null;
  onClose: () => void;
}

export const BillModal: React.FC<BillModalProps> = ({ billId, onClose }) => {
  const [bill, setBill] = useState<PurchaseBillSaved | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (billId) {
      setLoading(true);
      PurchaseService.getById(billId).then(res => {
        setBill(res);
        setLoading(false);
      });
    } else {
      setBill(null);
    }
  }, [billId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!bill) return;
    
    const header = `Bill ID,${bill.header.billId}\nDate,${bill.header.date}\nVendor,${bill.header.vendor}\nBill No,${bill.header.billNo}\nTax Mode,${bill.header.taxMode}\n\n`;
    const columns = "Line,Product,Qty,Rate,Gross,Net\n";
    const rows = bill.lines.map(l => 
      `${l.lineNo},"${l.product}",${l.qty},${l.rate},${l.gross},${l.net}`
    ).join("\n");
    const footer = `\nTotal,,,,${bill.totals.gross},${bill.totals.net}`;
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + columns + rows + footer);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `purchase_${bill.header.billId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!billId) return null;

  return (
    <Modal isOpen={!!billId} onClose={onClose} title={`Purchase Bill ${billId}`} size="xl">
      {loading || !bill ? (
        <div className="p-8 text-center text-gray-500">Loading bill details...</div>
      ) : (
        <div className="space-y-6">
          {/* Print-only Header */}
          <div className="hidden print:block text-center mb-4">
            <h1 className="text-2xl font-bold">Purchase Bill</h1>
          </div>

          {/* Header Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded border border-gray-200 text-sm">
            <div>
              <span className="block text-gray-500">Date</span>
              <span className="font-bold">{bill.header.date}</span>
            </div>
            <div>
              <span className="block text-gray-500">Bill ID</span>
              <span className="font-bold text-indigo-600">{bill.header.billId}</span>
            </div>
            <div>
              <span className="block text-gray-500">Vendor</span>
              <span className="font-bold">{bill.header.vendor}</span>
            </div>
            <div>
              <span className="block text-gray-500">Vendor Bill #</span>
              <span className="font-bold">{bill.header.billNo}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-gray-500">Companies</span>
              <span className="font-medium">{bill.header.companySummary}</span>
            </div>
            <div>
               <span className="block text-gray-500">Tax Mode</span>
               <span className="font-medium">{bill.header.taxMode} ({bill.header.taxPct}%)</span>
            </div>
            {bill.header.notes && (
              <div className="col-span-4 mt-2 pt-2 border-t border-gray-200">
                <span className="block text-gray-500">Notes</span>
                <span className="italic text-gray-700">{bill.header.notes}</span>
              </div>
            )}
          </div>

          {/* Lines Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">Unit</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Rate</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Gross</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bill.lines.map(line => (
                  <tr key={line.lineNo}>
                    <td className="px-3 py-2 text-gray-500">{line.lineNo}</td>
                    <td className="px-3 py-2 font-medium">{line.product}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{line.unit}</td>
                    <td className="px-3 py-2 text-right">{line.qty}</td>
                    <td className="px-3 py-2 text-right">{line.rate.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{line.gross.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{line.net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 bg-indigo-50 p-4 rounded border border-indigo-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Qty</span>
                <span className="font-medium">{bill.totals.qty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Total</span>
                <span className="font-medium">₹{bill.totals.gross.toFixed(2)}</span>
              </div>
              {bill.totals.discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>- ₹{bill.totals.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>₹{bill.totals.tax.toFixed(2)}</span>
              </div>
              {bill.totals.other > 0 && (
                 <div className="flex justify-between text-gray-600">
                   <span>Other Charges</span>
                   <span>₹{bill.totals.other.toFixed(2)}</span>
                 </div>
              )}
              <div className="flex justify-between text-lg font-bold text-indigo-900 pt-2 border-t border-indigo-200">
                <span>Net Total</span>
                <span>₹{bill.totals.net.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

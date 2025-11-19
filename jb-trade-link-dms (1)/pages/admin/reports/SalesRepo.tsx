import React from 'react';
import { Card, Button } from '../../../components/ui/Elements';
import { SalesReportRow } from '../../../types/reports';
import { Download } from 'lucide-react';

export const SalesReport: React.FC<{ data: SalesReportRow[] }> = ({ data }) => {
  // Calc Totals
  const totalSub = data.reduce((s, r) => s + r.subTotal, 0);
  const totalDisc = data.reduce((s, r) => s + r.discountAmount, 0);
  const totalGrand = data.reduce((s, r) => s + r.grandTotal, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Sales Report</h3>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Salesperson</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Inv No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Co.</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Subtotal</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Disc</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.length === 0 ? (
                 <tr><td colSpan={8} className="p-8 text-center text-gray-500">No sales data found for selected range.</td></tr>
              ) : (
                data.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-2">{row.salespersonName}</td>
                    <td className="px-4 py-2 font-mono text-xs text-indigo-600">{row.invoiceNo.slice(0,8)}...</td>
                    <td className="px-4 py-2">{row.customerName}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{row.companyName}</td>
                    <td className="px-4 py-2 text-right">{row.subTotal.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{row.discountAmount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-bold">{row.grandTotal.toFixed(2)}</td>
                    </tr>
                ))
              )}
            </tbody>
            {data.length > 0 && (
                <tfoot className="bg-gray-50 font-bold text-gray-900">
                <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">TOTAL</td>
                    <td className="px-4 py-3 text-right">₹{totalSub.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{totalDisc.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">₹{totalGrand.toLocaleString()}</td>
                </tr>
                </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};
import React from 'react';
import { Card, Button } from '../../../components/ui/Elements';
import { DispatchRow } from '../../../types/reports';
import { Printer } from 'lucide-react';

export const DispatchReport: React.FC<{ data: DispatchRow[] }> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Dispatch / Packing List</h3>
        <Button variant="outline" size="sm">
          <Printer className="mr-2 h-4 w-4" /> Print Packing List
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-center font-bold text-indigo-700 bg-indigo-50">Total Qty</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map(row => (
                <tr key={row.productId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">{row.companyName}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{row.productName}</td>
                  <td className="px-4 py-2 text-center font-bold bg-gray-50">{row.totalQty}</td>
                  <td className="px-4 py-2 text-right">₹{row.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={4} className="text-center p-8 text-gray-400">No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
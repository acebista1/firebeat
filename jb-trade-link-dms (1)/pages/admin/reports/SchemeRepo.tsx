import React from 'react';
import { Card } from '../../../components/ui/Elements';
import { SchemeRow } from '../../../types/reports';

export const SchemeReport: React.FC<{ data: SchemeRow[] }> = ({ data }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Secondary Discount Analysis</h3>
      
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total Qty</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Gross Amt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">No data available.</td></tr>
              ) : (
                data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{row.companyName}</td>
                    <td className="px-4 py-2 font-medium">{row.productName}</td>
                    <td className="px-4 py-2 text-right">{row.totalQty}</td>
                    <td className="px-4 py-2 text-right text-gray-600">₹{row.grossAmount.toLocaleString()}</td>
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
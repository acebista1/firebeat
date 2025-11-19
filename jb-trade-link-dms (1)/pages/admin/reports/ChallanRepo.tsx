import React from 'react';
import { Card, Button, Badge } from '../../../components/ui/Elements';
import { ChallanValidationRow } from '../../../types/reports';
import { Printer, CheckCircle, AlertTriangle } from 'lucide-react';

export const ChallanReport: React.FC<{ data: ChallanValidationRow[] }> = ({ data }) => {
  const issuesCount = data.filter(r => r.status === 'MISMATCH').length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-lg font-bold text-gray-800">Challan Validation & Generation</h3>
           {issuesCount > 0 ? (
             <p className="text-sm text-red-600 font-medium flex items-center mt-1">
               <AlertTriangle className="h-4 w-4 mr-1" /> {issuesCount} discrepancies found.
             </p>
           ) : (
             <p className="text-sm text-green-600 font-medium flex items-center mt-1">
               <CheckCircle className="h-4 w-4 mr-1" /> All calculations match system totals.
             </p>
           )}
        </div>
        <Button variant="primary" size="sm" disabled={issuesCount > 0}>
          <Printer className="mr-2 h-4 w-4" /> Print All Valid Challans
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Inv No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Items</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.length === 0 ? (
                 <tr><td colSpan={7} className="p-8 text-center text-gray-400">No data available.</td></tr>
              ) : (
                data.map(row => (
                    <tr key={row.orderId} className={row.status === 'MISMATCH' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2 font-mono text-xs text-indigo-600">{row.orderId.slice(0,8)}</td>
                    <td className="px-4 py-2">{row.date}</td>
                    <td className="px-4 py-2">{row.customerName}</td>
                    <td className="px-4 py-2 text-center">{row.itemsCount}</td>
                    <td className="px-4 py-2 text-right">₹{row.expectedTotal.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">
                        <Badge color={row.status === 'MATCH' ? 'green' : 'red'}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-center">
                        {row.status === 'MATCH' && (
                        <button className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">
                            Print
                        </button>
                        )}
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
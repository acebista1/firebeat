
import React from 'react';
import { Card, Button } from '../../components/ui/Elements';
import { ShoppingBag, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">My Dashboard</h2>
        <Button onClick={() => navigate('/sales/create-order')}>
          <Plus className="mr-2 h-4 w-4" /> Create Order
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Today's Sales</p>
              <h3 className="text-3xl font-bold mt-1">₹45,200</h3>
            </div>
            <TrendingUp className="h-8 w-8 text-indigo-200" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Orders Taken</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900">14</h3>
            </div>
            <ShoppingBag className="h-8 w-8 text-indigo-600 opacity-20" />
          </div>
        </Card>
      </div>

      <Card title="Recent Orders">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#202{i}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Shree Ram General Store</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹3,450</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Confirmed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

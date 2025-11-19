
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../components/ui/Elements';
import { DollarSign, Truck, Users, Package, ArrowRight, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
];

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-full bg-${color}-100`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
    </div>
  </Card>
);

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
        <Button variant="outline" onClick={() => navigate('/admin/health')}>
          <Activity className="mr-2 h-4 w-4" /> System Setup & Health
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sales Today" value="₹1,24,500" icon={DollarSign} color="green" />
        <StatCard title="Pending Deliveries" value="12" icon={Truck} color="orange" />
        <StatCard title="Total Customers" value="450" icon={Users} color="blue" />
        
        {/* Replaced Products Card with System Health for visibility during setup */}
        <Card className="p-4 border-l-4 border-indigo-500 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/admin/health')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">System Status</p>
              <h3 className="text-lg font-bold mt-1 text-indigo-700">Configure DB</h3>
            </div>
            <div className="p-3 rounded-full bg-indigo-100">
              <Activity className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Weekly Sales Trend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Today's Orders">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Order #10{i}</p>
                  <p className="text-xs text-gray-500">Kirana Store A • 12 items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹1,200</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
              </div>
            ))}
            <button 
              onClick={() => navigate('/admin/orders')}
              className="w-full text-center text-sm text-indigo-600 font-medium hover:text-indigo-800 mt-2 flex items-center justify-center"
            >
              Go to Orders <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

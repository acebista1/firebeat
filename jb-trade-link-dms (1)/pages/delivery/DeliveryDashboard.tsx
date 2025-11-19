import React from 'react';
import { Card, Button } from '../../components/ui/Elements';
import { MapPin, CheckCircle, Clock, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DeliveryDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-gray-800">Delivery Dashboard</h2>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Assigned</p>
          <h3 className="text-2xl font-bold text-blue-900">12</h3>
        </Card>
        <Card className="p-4 bg-green-50 border-green-100">
          <p className="text-sm text-green-600 font-medium">Completed</p>
          <h3 className="text-2xl font-bold text-green-900">4</h3>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-100">
          <p className="text-sm text-yellow-600 font-medium">Pending</p>
          <h3 className="text-2xl font-bold text-yellow-900">8</h3>
        </Card>
        <Card className="p-4 bg-indigo-50 border-indigo-100">
          <p className="text-sm text-indigo-600 font-medium">Cash Collected</p>
          <h3 className="text-2xl font-bold text-indigo-900">₹12.5k</h3>
        </Card>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Route</h3>
          <Button size="sm" onClick={() => navigate('/delivery/route-map')}>
            <Navigation className="mr-1 h-4 w-4" /> Map View
          </Button>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i, idx) => (
            <Card key={i} className="p-4 relative">
               <div className="absolute top-4 right-4">
                 {idx === 0 ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Next</span>
                 ) : (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">Seq: {idx + 1}</span>
                 )}
               </div>
               <h4 className="font-bold text-gray-900">Gupta General Store</h4>
               <p className="text-sm text-gray-500 mb-2"><MapPin className="inline h-3 w-3 mr-1" /> Sector 14, Main Market</p>
               <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                 <span className="font-semibold text-indigo-600">₹4,300</span>
                 <Button size="sm" variant="outline" onClick={() => navigate(`/delivery/invoice/${i}`)}>
                   View Order
                 </Button>
               </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { Edit2, Eye, MapPin, CreditCard, UserPlus, Navigation } from 'lucide-react';
import { Customer } from '../../types';
import { CustomerService } from '../../services/firestore';

export const mockCustomers: Customer[] = [
  { 
    id: '1', name: 'Gupta General Store', phone: '9876543210', panNumber: 'ABCDE1234F', 
    routeName: 'Sector 15', locationText: '28.4595,77.0266', isActive: true, 
    creditLimit: 50000, currentOutstanding: 12500, creditDays: 15, submittedBy: 'Rahul Sharma'
  },
  { 
    id: '2', name: 'Sharma Kirana', phone: '8765432109', panNumber: 'FGHIJ5678K', 
    routeName: 'MG Road', locationText: '28.4700,77.0300', isActive: true, 
    creditLimit: 20000, currentOutstanding: 0, creditDays: 7, submittedBy: 'Rahul Sharma'
  }
];

export const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState('all');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await CustomerService.getAll();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Unique Routes for Filter
  const routes = Array.from(new Set(customers.map(c => c.routeName || 'Unknown')));

  const handleEdit = (customer: Customer) => {
    setCurrentCustomer(customer);
    setFormData({ ...customer });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setCurrentCustomer(null);
    setFormData({
      name: '',
      phone: '',
      routeName: '',
      panNumber: '',
      locationText: '',
      creditLimit: 0,
      creditDays: 0,
      isActive: true
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;

    try {
      if (currentCustomer) {
        await CustomerService.update(currentCustomer.id, formData);
        setCustomers(prev => prev.map(c => c.id === currentCustomer.id ? { ...c, ...formData } as Customer : c));
      } else {
        const newCustomer = {
          ...formData,
          currentOutstanding: 0,
          createdAt: new Date().toISOString(),
          status: 'active'
        } as Omit<Customer, 'id'>;
        const saved = await CustomerService.add(newCustomer);
        setCustomers([...customers, saved]);
      }
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save customer");
    }
  };

  const openDetails = (customer: Customer) => {
    setCurrentCustomer(customer);
    setDetailsOpen(true);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, locationText: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        setIsGettingLocation(false);
      },
      () => {
        alert("Unable to retrieve location");
        setIsGettingLocation(false);
      }
    );
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm);
    const matchesRoute = filterRoute === 'all' || c.routeName === filterRoute;
    return matchesSearch && matchesRoute;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
        <Button onClick={handleAdd}>
          <UserPlus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-64">
            <Input 
              placeholder="Search Name or Phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select 
              options={[{ label: 'All Routes', value: 'all' }, ...routes.map(r => ({ label: r, value: r }))]}
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name / Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Credit Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 <tr><td colSpan={5} className="text-center p-4">Loading customers...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                 <tr><td colSpan={5} className="text-center p-4">No customers found.</td></tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                      {customer.panNumber && <div className="text-xs text-gray-500">PAN: {customer.panNumber}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {customer.routeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900">Limit: ₹{customer.creditLimit?.toLocaleString()}</div>
                      <div className={`${(customer.currentOutstanding || 0) > (customer.creditLimit || 0) ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                        Due: ₹{customer.currentOutstanding?.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={customer.isActive ? 'green' : 'red'}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => openDetails(customer)} className="text-gray-600 hover:text-gray-900 p-1">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(customer)} className="text-indigo-600 hover:text-indigo-900 p-1">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={currentCustomer ? "Edit Customer" : "Add Customer"} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Shop Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <Input label="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <Input label="PAN Number (Optional)" value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value})} />
          <Input label="Route Name" value={formData.routeName} onChange={e => setFormData({...formData, routeName: e.target.value})} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="flex gap-2">
              <input 
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.locationText} 
                onChange={e => setFormData({...formData, locationText: e.target.value})} 
                placeholder="lat,long"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleGetLocation} 
                isLoading={isGettingLocation}
                title="Get Current Location"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="col-span-2 bg-gray-50 p-3 rounded border border-gray-200 mt-2">
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Credit Configuration
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Credit Limit (₹)" 
                type="number" 
                value={formData.creditLimit} 
                onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} 
              />
              <Input 
                label="Credit Days" 
                type="number" 
                value={formData.creditDays} 
                onChange={e => setFormData({...formData, creditDays: Number(e.target.value)})} 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <input 
              type="checkbox" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-sm text-gray-700">Customer is Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Customer</Button>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isDetailsOpen} onClose={() => setDetailsOpen(false)} title="Customer Details">
        {currentCustomer && (
          <div className="space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{currentCustomer.name}</h3>
                <p className="text-gray-500 flex items-center gap-1 text-sm mt-1">
                  <MapPin className="h-3 w-3" /> {currentCustomer.locationText || "Location not tagged"}
                </p>
              </div>
              <Badge color={currentCustomer.isActive ? 'green' : 'red'}>{currentCustomer.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium">{currentCustomer.phone}</p>
              </div>
              <div>
                <p className="text-gray-500">Route</p>
                <p className="font-medium">{currentCustomer.routeName}</p>
              </div>
              <div>
                <p className="text-gray-500">PAN</p>
                <p className="font-medium">{currentCustomer.panNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Submitted By</p>
                <p className="font-medium">{currentCustomer.submittedBy || 'System'}</p>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-4">
              <h4 className="font-semibold text-indigo-900 mb-3">Financial Status</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 text-sm">Credit Limit</span>
                <span className="font-bold text-gray-900">₹{currentCustomer.creditLimit?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 text-sm">Outstanding</span>
                <span className="font-bold text-red-600">₹{currentCustomer.currentOutstanding?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Credit Days</span>
                <span className="font-medium text-gray-900">{currentCustomer.creditDays} Days</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

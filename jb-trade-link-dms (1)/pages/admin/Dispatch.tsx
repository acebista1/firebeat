
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Truck, Plus, ChevronDown, ChevronRight, MapPin, Package, ArrowRight
} from 'lucide-react';
import { Card, Button } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { Order, DispatchTrip, User } from '../../types';
import { OrderService, TripService, UserService } from '../../services/firestore';
import { VEHICLES } from '../../services/mockDispatchData'; // Keep vehicles mock for now as master data

interface OrderGroup {
  id: string;
  name: string;
  orders: Order[];
  totalAmount: number;
}

export const DispatchPlanner: React.FC = () => {
  const navigate = useNavigate();
  
  // --- Live Data State ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [trips, setTrips] = useState<DispatchTrip[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- Selection & Filters ---
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- UI State ---
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isCreateTripModalOpen, setCreateTripModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh
  
  // --- New Trip Form State ---
  const [newTripData, setNewTripData] = useState({
    deliveryPersonId: '',
    vehicleId: ''
  });

  // --- Load Data ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Approved Orders (Ready for Dispatch)
        const pendingOrders = await OrderService.getPendingDispatch();
        setOrders(pendingOrders);

        // 2. Fetch Active Trips (Simple fetch all for now, usually filter by date/status)
        const allTrips = await TripService.getAll();
        // Filter for recent trips or active ones
        setTrips(allTrips.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // 3. Fetch Delivery Staff
        const users = await UserService.getAll();
        setDeliveryStaff(users.filter(u => u.role === 'delivery'));
      } catch (e) {
        console.error("Error loading dispatch data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refreshKey]);

  // Filter Logic
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Grouping Logic (by Salesperson)
  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const key = order.salespersonId;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: order.salespersonName,
        orders: [],
        totalAmount: 0
      };
    }
    acc[key].orders.push(order);
    acc[key].totalAmount += order.totalAmount;
    return acc;
  }, {} as Record<string, OrderGroup>);

  // --- Actions ---

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) newSet.delete(groupId);
    else newSet.add(groupId);
    setExpandedGroups(newSet);
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(orderId)) newSet.delete(orderId);
    else newSet.add(orderId);
    setSelectedOrderIds(newSet);
  };

  const toggleGroupSelection = (groupOrders: Order[]) => {
    const newSet = new Set(selectedOrderIds);
    const allSelected = groupOrders.every(o => newSet.has(o.id));
    
    if (allSelected) {
      groupOrders.forEach(o => newSet.delete(o.id));
    } else {
      groupOrders.forEach(o => newSet.add(o.id));
    }
    setSelectedOrderIds(newSet);
  };

  const handleCreateTrip = async () => {
    if (!newTripData.deliveryPersonId) return;

    const dp = deliveryStaff.find(d => d.id === newTripData.deliveryPersonId);
    const veh = VEHICLES.find(v => v.id === newTripData.vehicleId);

    const newTrip: Omit<DispatchTrip, 'id'> = {
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryPersonId: dp!.id,
      deliveryPersonName: dp!.name,
      vehicleId: veh?.id,
      vehicleName: veh?.name,
      routeIds: [],
      routeNames: [],
      orderIds: [],
      totalOrders: 0,
      totalAmount: 0,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    try {
      const createdTrip = await TripService.add(newTrip);
      
      // Assign if selected
      if (selectedOrderIds.size > 0) {
        const selectedOrdersList = orders.filter(o => selectedOrderIds.has(o.id));
        await TripService.assignOrders(createdTrip.id, Array.from(selectedOrderIds), createdTrip as DispatchTrip, selectedOrdersList);
        setSelectedOrderIds(new Set());
      }

      setCreateTripModalOpen(false);
      setNewTripData({ deliveryPersonId: '', vehicleId: '' });
      setRefreshKey(k => k + 1); // Reload
    } catch (e) {
      console.error(e);
      alert("Failed to create trip");
    }
  };

  const handleAssignToTrip = async (tripId: string) => {
    if (selectedOrderIds.size === 0) return;
    const trip = trips.find(t => t.id === tripId);
    if(!trip) return;

    const selectedOrdersList = orders.filter(o => selectedOrderIds.has(o.id));
    
    try {
      await TripService.assignOrders(tripId, Array.from(selectedOrderIds), trip, selectedOrdersList);
      setSelectedOrderIds(new Set());
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error(e);
      alert("Failed to assign orders");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-gray-100">
      {/* --- Top Bar --- */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dispatch Planner</h1>
          <p className="text-xs text-gray-500">Assign approved orders to delivery trips</p>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-medium border border-blue-100 flex items-center">
            Pending: {filteredOrders.length} Orders
          </div>
          <div className="bg-green-50 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-100 flex items-center">
            Value: ₹{filteredOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
          </div>
        </div>
      </header>

      {/* --- Main Content Area (Split View) --- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* --- LEFT: Order Pool --- */}
        <div className="w-full lg:w-7/12 flex flex-col border-r border-gray-200 bg-white h-1/2 lg:h-auto">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
               <input 
                 type="text" 
                 placeholder="Search Customer or Order #" 
                 className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
             </div>
          </div>

          {/* Selection Hint Banner */}
          {selectedOrderIds.size > 0 && (
            <div className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium flex justify-between items-center shadow-sm shrink-0 z-10">
              <span>{selectedOrderIds.size} Orders Selected</span>
              <button 
                onClick={() => setSelectedOrderIds(new Set())}
                className="text-indigo-100 hover:text-white underline text-xs"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
               <div className="p-10 text-center text-gray-500">Loading orders...</div>
            ) : Object.keys(groupedOrders).length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                 <Package className="h-16 w-16 mb-2" />
                 <p>No pending orders found</p>
               </div>
            ) : (
              Object.values(groupedOrders).map((group: OrderGroup) => {
                const isExpanded = expandedGroups.has(group.id);
                const groupSelectedCount = group.orders.filter(o => selectedOrderIds.has(o.id)).length;
                const isAllSelected = groupSelectedCount === group.orders.length;
                const isPartialSelected = groupSelectedCount > 0 && !isAllSelected;

                return (
                  <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    {/* Group Header */}
                    <div className="flex items-center bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center h-5 mr-3">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={isAllSelected}
                          ref={input => { if (input) input.indeterminate = isPartialSelected; }}
                          onChange={() => toggleGroupSelection(group.orders)}
                        />
                      </div>
                      <div 
                        className="flex-1 flex items-center cursor-pointer"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <button className="mr-2 text-gray-500">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">{group.name || 'Direct/Office'}</h3>
                          <p className="text-xs text-gray-500">{group.orders.length} orders • ₹{group.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Group Content */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 border-t border-gray-100">
                        {group.orders.map(order => (
                          <div 
                            key={order.id} 
                            className={`px-4 py-3 flex items-start gap-3 hover:bg-indigo-50 transition-colors cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-indigo-50' : ''}`}
                            onClick={() => toggleOrderSelection(order.id)}
                          >
                            <input 
                              type="checkbox" 
                              checked={selectedOrderIds.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600"
                              onClick={e => e.stopPropagation()} 
                            />
                            <div className="flex-1">
                               <div className="flex justify-between mb-1">
                                 <span className="font-medium text-gray-900 text-sm">{order.customerName}</span>
                                 <span className="font-bold text-gray-900 text-sm">₹{order.totalAmount.toLocaleString()}</span>
                               </div>
                               <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono truncate max-w-[100px]">{order.id}</span>
                                  {order.remarks && <span className="text-amber-600 font-medium truncate">{order.remarks}</span>}
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* --- RIGHT: Trip Planner --- */}
        <div className="w-full lg:w-5/12 flex flex-col bg-gray-50 h-1/2 lg:h-auto border-t lg:border-t-0">
          <div className="p-4 flex justify-between items-center border-b border-gray-200 bg-white shrink-0">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Truck size={20} className="text-indigo-600" /> Trips
            </h2>
            <Button onClick={() => setCreateTripModalOpen(true)} size="sm">
              <Plus size={16} className="mr-1" /> New Trip
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {trips.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Truck size={48} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">No active trips.</p>
                  <p className="text-xs text-gray-400 mt-1">Create a trip to start assigning orders.</p>
               </div>
             ) : (
               trips.map(trip => (
                 <Card key={trip.id} className="border-l-4 border-l-indigo-600 bg-white overflow-visible">
                    <div className="flex flex-col gap-3">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                         <div>
                           <h3 className="font-bold text-lg text-gray-900">{trip.deliveryPersonName}</h3>
                           <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                             <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{trip.vehicleName || 'No Vehicle'}</span>
                             <span className="text-gray-400">{trip.deliveryDate}</span>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="text-2xl font-bold text-indigo-600">₹{trip.totalAmount.toLocaleString()}</div>
                           <div className="text-xs font-medium text-gray-600">{trip.totalOrders} Orders</div>
                         </div>
                      </div>

                      {/* Action Area */}
                      {selectedOrderIds.size > 0 && trip.status === 'draft' ? (
                        <Button 
                          className="w-full animate-pulse bg-indigo-600 hover:bg-indigo-700 text-white" 
                          onClick={() => handleAssignToTrip(trip.id)}
                        >
                          <ArrowRight size={16} className="mr-2" /> 
                          Assign {selectedOrderIds.size} Selected
                        </Button>
                      ) : (
                        <div className="h-px bg-gray-200 my-1"></div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex justify-end">
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => navigate(`/admin/dispatch/trips/${trip.id}`)}
                         >
                           Manage Trip
                         </Button>
                      </div>
                    </div>
                 </Card>
               ))
             )}
          </div>
        </div>

      </div>

      {/* --- Create Trip Modal --- */}
      <Modal isOpen={isCreateTripModalOpen} onClose={() => setCreateTripModalOpen(false)} title="Create New Dispatch Trip">
        <div className="space-y-4">
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Person</label>
             <select 
               className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
               value={newTripData.deliveryPersonId}
               onChange={(e) => {
                 const val = e.target.value;
                 const dp = deliveryStaff.find(d => d.id === val);
                 setNewTripData({ deliveryPersonId: val, vehicleId: '' }); // Reset vehicle or auto-select if user model had it
               }}
             >
               <option value="">Select Driver...</option>
               {deliveryStaff.map(dp => (
                 <option key={dp.id} value={dp.id}>{dp.name}</option>
               ))}
             </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
             <select 
               className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
               value={newTripData.vehicleId}
               onChange={(e) => setNewTripData({ ...newTripData, vehicleId: e.target.value })}
             >
               <option value="">Select Vehicle...</option>
               {VEHICLES.map(v => (
                 <option key={v.id} value={v.id}>{v.name} ({v.registrationNo})</option>
               ))}
             </select>
          </div>

          {selectedOrderIds.size > 0 && (
            <div className="bg-indigo-50 text-indigo-800 text-sm p-3 rounded border border-indigo-100 flex items-start gap-2">
              <Package size={16} className="mt-0.5" />
              <div>
                <strong>{selectedOrderIds.size} Orders selected.</strong>
                <p>These will be automatically added to this new trip.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setCreateTripModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTrip} disabled={!newTripData.deliveryPersonId}>Create Trip</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

import { Route, Salesperson, SalesOrder, DeliveryPerson, Vehicle, DispatchTrip } from '../types';

// --- Constants ---
export const ROUTES: Route[] = [
  { id: 'r1', name: 'Kalopool', code: 'R1' },
  { id: 'r2', name: 'Ratopool & Gattekulo', code: 'R2' },
  { id: 'r3', name: 'Baneshwor', code: 'R3' },
  { id: 'r4', name: 'Putalisadak', code: 'R4' },
];

export const SALESPERSONS: Salesperson[] = [
  { id: 'sp1', name: 'Rahul Sharma', code: 'SP01' },
  { id: 'sp2', name: 'Amit Verma', code: 'SP02' },
];

export const DELIVERY_PERSONS: DeliveryPerson[] = [
  { id: 'dp1', name: 'Suresh Kumar', phone: '9876500001', vehicleId: 'v1' },
  { id: 'dp2', name: 'Ramesh Yadav', phone: '9876500002', vehicleId: 'v2' },
  { id: 'dp3', name: 'Mahesh Singh', phone: '9876500003', vehicleId: 'v3' },
];

export const VEHICLES: Vehicle[] = [
  { id: 'v1', name: 'Tata Ace (Van 1)', registrationNo: 'KA-01-1234', capacityCases: 100 },
  { id: 'v2', name: 'Bolero (Van 2)', registrationNo: 'KA-02-5678', capacityCases: 150 },
  { id: 'v3', name: 'Bike A', registrationNo: 'KA-03-9012', capacityCases: 20 },
];

// --- Initial Mock State ---

// Helper to generate random orders
const generateOrders = (count: number, dateStr: string): SalesOrder[] => {
  const orders: SalesOrder[] = [];
  for (let i = 1; i <= count; i++) {
    const route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    
    // Introduce "Office" orders (~20% probability)
    const isOfficeOrder = Math.random() < 0.2;
    const sp = isOfficeOrder 
      ? { id: 'office', name: 'Office' } 
      : SALESPERSONS[Math.floor(Math.random() * SALESPERSONS.length)];

    const amount = Math.floor(Math.random() * 5000) + 500;
    
    orders.push({
      id: `so-${dateStr}-${i}`,
      orderNumber: `SO-${dateStr.replace(/-/g, '')}-${1000 + i}`,
      orderDate: dateStr,
      deliveryDate: dateStr, // Simplification: delivery same day or filtered by viewing date
      customerId: `cust-${i}`,
      customerName: `Shop ${String.fromCharCode(65 + (i % 26))} - ${i}`,
      routeId: route.id,
      routeName: route.name,
      salespersonId: sp.id,
      salespersonName: sp.name,
      totalAmount: amount,
      totalCases: Math.floor(Math.random() * 10) + 1,
      status: 'pending',
      assignedTripId: undefined
    });
  }
  return orders;
};

// We'll keep these in memory for the session
let mockOrders: SalesOrder[] = [
  ...generateOrders(15, new Date().toISOString().split('T')[0]), // Today
  ...generateOrders(10, new Date(Date.now() + 86400000).toISOString().split('T')[0]), // Tomorrow
];

let mockTrips: DispatchTrip[] = [];

// --- Service Functions ---

export const MockDispatchService = {
  getOrdersByDate: (date: string) => {
    // In a real app, we'd query by deliveryDate
    // For this mock, we just return all orders that match the date string in ID or property
    return mockOrders.filter(o => o.deliveryDate === date || o.orderDate === date);
  },

  getAllOrders: () => [...mockOrders],

  getTripsByDate: (date: string) => {
    return mockTrips.filter(t => t.deliveryDate === date);
  },
  
  getTripById: (id: string) => {
    return mockTrips.find(t => t.id === id);
  },

  createTrip: (trip: DispatchTrip) => {
    mockTrips = [...mockTrips, trip];
    return trip;
  },

  updateTripStatus: (tripId: string, status: any) => {
    mockTrips = mockTrips.map(t => t.id === tripId ? { ...t, status } : t);
  },

  assignOrdersToTrip: (tripId: string, orderIds: string[]) => {
    // 1. Update Trip
    const trip = mockTrips.find(t => t.id === tripId);
    if (!trip) return;

    // Calculate new totals
    const ordersToAdd = mockOrders.filter(o => orderIds.includes(o.id));
    const additionalAmount = ordersToAdd.reduce((sum, o) => sum + o.totalAmount, 0);
    const additionalOrders = ordersToAdd.length;

    // Update trip
    mockTrips = mockTrips.map(t => {
        if (t.id === tripId) {
            // Add unique route names if not present
            const newRouteNames = new Set(t.routeNames);
            const newRouteIds = new Set(t.routeIds);
            ordersToAdd.forEach(o => {
                newRouteNames.add(o.routeName);
                newRouteIds.add(o.routeId);
            });

            return {
                ...t,
                orderIds: [...t.orderIds, ...orderIds],
                totalAmount: t.totalAmount + additionalAmount,
                totalOrders: t.totalOrders + additionalOrders,
                routeNames: Array.from(newRouteNames),
                routeIds: Array.from(newRouteIds)
            };
        }
        return t;
    });

    // 2. Update Orders
    mockOrders = mockOrders.map(o => {
      if (orderIds.includes(o.id)) {
        return { ...o, status: 'assigned', assignedTripId: tripId };
      }
      return o;
    });
  },

  removeOrderFromTrip: (tripId: string, orderId: string) => {
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) return;

    // Update Trip
    mockTrips = mockTrips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          orderIds: t.orderIds.filter(id => id !== orderId),
          totalAmount: t.totalAmount - order.totalAmount,
          totalOrders: t.totalOrders - 1
        };
      }
      return t;
    });

    // Update Order
    mockOrders = mockOrders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'pending', assignedTripId: undefined };
      }
      return o;
    });
  }
};

import { supabase } from '../lib/supabase';
import { Product, Customer, Order, User, Company, DispatchTrip, SalesReturn, DamagedGoodsLog } from '../types';
import { PurchaseBillSaved } from '../types/purchase';

// Collection/Table Names
export const COLS = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  USERS: 'users',
  COMPANIES: 'companies',
  TRIPS: 'trips',
  PURCHASES: 'purchases',
  RETURNS: 'returns',
  DAMAGE_LOGS: 'damage_logs'
};

// Helper to standardize response
const handleResponse = async <T>(query: any): Promise<T[]> => {
  const { data, error } = await query;
  if (error) {
    // Log the full error structure for debugging
    console.error("Supabase Request Failed:", JSON.stringify(error, null, 2));
    // Throw a clean error with the message
    throw new Error(error.message || "Unknown Database Error");
  }
  return data || [];
};

// --- Specific Services ---

export const ProductService = {
  getAll: () => handleResponse<Product>(supabase.from(COLS.PRODUCTS).select('*')),
  add: async (product: Omit<Product, 'id'>) => {
    // Allow string IDs if provided (for migration), else let DB generate or use random
    const id = (product as any).id || Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase.from(COLS.PRODUCTS).insert({ ...product, id }).select().single();
    if (error) throw new Error(error.message);
    return data as Product;
  },
  update: async (id: string, product: Partial<Product>) => {
    const { error } = await supabase.from(COLS.PRODUCTS).update(product).eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export const CustomerService = {
  getAll: () => handleResponse<Customer>(supabase.from(COLS.CUSTOMERS).select('*')),
  add: async (customer: Omit<Customer, 'id'>) => {
    const id = (customer as any).id || Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase.from(COLS.CUSTOMERS).insert({ ...customer, id }).select().single();
    if (error) throw new Error(error.message);
    return data as Customer;
  },
  update: async (id: string, customer: Partial<Customer>) => {
    const { error } = await supabase.from(COLS.CUSTOMERS).update(customer).eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export const CompanyService = {
  getAll: () => handleResponse<Company>(supabase.from(COLS.COMPANIES).select('*')),
  add: async (company: Omit<Company, 'id'>) => {
    const id = (company as any).id || Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase.from(COLS.COMPANIES).insert({ ...company, id }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};

export const OrderService = {
  getAll: () => handleResponse<Order>(supabase.from(COLS.ORDERS).select('*')),
  add: async (order: Omit<Order, 'id'>) => {
    const id = (order as any).id || `ORD-${Date.now()}`;
    const { data, error } = await supabase.from(COLS.ORDERS).insert({ ...order, id }).select().single();
    if (error) throw new Error(error.message);
    return data as Order;
  },
  updateStatus: async (id: string, status: string) => {
    const { error } = await supabase.from(COLS.ORDERS).update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  },
  getPendingDispatch: async () => {
    return handleResponse<Order>(
      supabase.from(COLS.ORDERS).select('*').eq('status', 'approved')
    );
  },
  getBySalesperson: async (spId: string) => {
    return handleResponse<Order>(
      supabase.from(COLS.ORDERS).select('*').eq('salespersonId', spId)
    );
  },
  getOrdersByIds: async (ids: string[]) => {
    if (ids.length === 0) return [];
    return handleResponse<Order>(
      supabase.from(COLS.ORDERS).select('*').in('id', ids)
    );
  }
};

export const TripService = {
  getAll: () => handleResponse<DispatchTrip>(supabase.from(COLS.TRIPS).select('*')),
  getById: async (id: string) => {
    const { data, error } = await supabase.from(COLS.TRIPS).select('*').eq('id', id).single();
    if (error) return null;
    return data as DispatchTrip;
  },
  add: async (trip: Omit<DispatchTrip, 'id'>) => {
    const id = (trip as any).id || `TRIP-${Date.now()}`;
    const { data, error } = await supabase.from(COLS.TRIPS).insert({ ...trip, id }).select().single();
    if (error) throw new Error(error.message);
    return data as DispatchTrip;
  },
  update: async (id: string, data: Partial<DispatchTrip>) => {
    const { error } = await supabase.from(COLS.TRIPS).update(data).eq('id', id);
    if (error) throw new Error(error.message);
  },
  
  assignOrders: async (tripId: string, orderIds: string[], currentTripData: DispatchTrip, ordersToAdd: Order[]) => {
    const additionalAmount = ordersToAdd.reduce((sum, o) => sum + o.totalAmount, 0);
    const additionalCount = ordersToAdd.length;
    
    const newOrderIds = [...(currentTripData.orderIds || []), ...orderIds];
    const newTotalAmount = currentTripData.totalAmount + additionalAmount;
    const newTotalOrders = currentTripData.totalOrders + additionalCount;
    
    // Transaction-like update
    const { error } = await supabase.from(COLS.TRIPS).update({
       orderIds: newOrderIds,
       totalAmount: newTotalAmount,
       totalOrders: newTotalOrders
    }).eq('id', tripId);

    if (error) throw new Error(error.message);

    // Update orders
    for (const oid of orderIds) {
        const { error: orderError } = await supabase.from(COLS.ORDERS).update({ status: 'dispatched', assignedTripId: tripId }).eq('id', oid);
        if (orderError) console.error(`Failed to update order ${oid}:`, orderError);
    }
  },

  removeOrder: async (tripId: string, orderId: string, currentTripData: DispatchTrip, orderData: Order) => {
     const newOrderIds = currentTripData.orderIds.filter(id => id !== orderId);
     const newTotalAmount = currentTripData.totalAmount - orderData.totalAmount;
     const newTotalOrders = currentTripData.totalOrders - 1;

     const { error } = await supabase.from(COLS.TRIPS).update({
        orderIds: newOrderIds,
        totalAmount: newTotalAmount,
        totalOrders: newTotalOrders
     }).eq('id', tripId);
     
     if (error) throw new Error(error.message);

     await supabase.from(COLS.ORDERS).update({ status: 'approved', assignedTripId: null }).eq('id', orderId);
  }
};

export const UserService = {
  getAll: () => handleResponse<User>(supabase.from(COLS.USERS).select('*')),
  add: async (user: Omit<User, 'id'>) => {
    const { data, error } = await supabase.from(COLS.USERS).insert(user).select().single();
    if (error) throw new Error(error.message);
    return data as User;
  },
  update: async (id: string, data: Partial<User>) => {
    const { error } = await supabase.from(COLS.USERS).update(data).eq('id', id);
    if (error) throw new Error(error.message);
  },
  delete: async (id: string) => {
    const { error } = await supabase.from(COLS.USERS).delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  getByEmail: async (email: string) => {
    return handleResponse<User>(
      supabase.from(COLS.USERS).select('*').eq('email', email)
    );
  }
};

export const PurchaseService = {
  getAll: () => handleResponse<PurchaseBillSaved>(supabase.from(COLS.PURCHASES).select('*')),
  add: async (bill: PurchaseBillSaved) => {
    const { error } = await supabase.from(COLS.PURCHASES).upsert(bill);
    if (error) throw new Error(error.message);
    return bill;
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from(COLS.PURCHASES).select('*').eq('id', id).single();
    if (error) return null;
    return data as PurchaseBillSaved;
  }
};

export const ReturnService = {
  getAll: () => handleResponse<SalesReturn>(supabase.from(COLS.RETURNS).select('*')),
  add: async (ret: SalesReturn) => {
    const { error } = await supabase.from(COLS.RETURNS).insert(ret);
    if (error) throw new Error(error.message);
    return ret;
  },
  getById: async (id: string) => {
    const { data } = await supabase.from(COLS.RETURNS).select('*').eq('id', id).single();
    return data as SalesReturn;
  }
};

export const DamageLogService = {
  getAll: () => handleResponse<DamagedGoodsLog>(supabase.from(COLS.DAMAGE_LOGS).select('*')),
  add: async (log: DamagedGoodsLog) => {
    const { error } = await supabase.from(COLS.DAMAGE_LOGS).insert(log);
    if (error) throw new Error(error.message);
    return log;
  }
};

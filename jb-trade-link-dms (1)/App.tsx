
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/auth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { UserRole } from './types';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/Users';
import { CustomerManagement } from './pages/admin/Customers';
import { CompanyManagement } from './pages/admin/Companies';
import { ProductManagement } from './pages/admin/Products';
import { OrderManagement } from './pages/admin/Orders';
import { DispatchPlanner } from './pages/admin/Dispatch';
import { DispatchTripDetails } from './pages/admin/DispatchTripDetails';
import { Purchases } from './pages/admin/Purchases';
import { Reports } from './pages/admin/Reports';
import { SystemHealth } from './pages/admin/SystemHealth';

// Returns & Damages
import { ReturnsList } from './pages/admin/Returns';
import { CreateReturn } from './pages/admin/CreateReturn';
import { DamagedGoodsReport } from './pages/admin/DamagedGoods';

// Sales Pages
import { SalesDashboard } from './pages/sales/SalesDashboard';
import { CreateOrder } from './pages/sales/CreateOrder';

// Delivery Pages
import { DeliveryDashboard } from './pages/delivery/DeliveryDashboard';

// Placeholder for missing pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 text-center text-gray-500">
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p>This module is under development.</p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    // Redirect to their dashboard if they try to access unauthorized routes
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/products" element={<ProductManagement />} />
            <Route path="/admin/companies" element={<CompanyManagement />} />
            <Route path="/admin/customers" element={<CustomerManagement />} />
            <Route path="/admin/orders" element={<OrderManagement />} />
            <Route path="/admin/dispatch" element={<DispatchPlanner />} />
            <Route path="/admin/dispatch/trips/:id" element={<DispatchTripDetails />} />
            <Route path="/admin/purchases" element={<Purchases />} />
            
            {/* Returns & Damages */}
            <Route path="/admin/returns" element={<ReturnsList />} />
            <Route path="/admin/invoices/select-return" element={<CreateReturn />} />
            <Route path="/admin/invoices/:invoiceId/return" element={<CreateReturn />} />
            <Route path="/admin/damaged-goods" element={<DamagedGoodsReport />} />
            
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/health" element={<SystemHealth />} />
          </Route>

          {/* Sales Routes */}
          <Route element={<ProtectedRoute allowedRoles={['sales', 'admin']} />}>
            <Route path="/sales/dashboard" element={<SalesDashboard />} />
            <Route path="/sales/create-order" element={<CreateOrder />} />
            <Route path="/sales/orders" element={<Placeholder title="My Orders" />} />
            <Route path="/sales/performance" element={<Placeholder title="Performance Metrics" />} />
          </Route>

          {/* Delivery Routes */}
          <Route element={<ProtectedRoute allowedRoles={['delivery', 'admin']} />}>
            <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
            <Route path="/delivery/route-map" element={<Placeholder title="Route Map" />} />
            <Route path="/delivery/invoice/:id" element={<Placeholder title="Invoice Details" />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;

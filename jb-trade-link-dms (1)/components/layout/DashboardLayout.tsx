
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingBag, 
  Truck, 
  FileText, 
  LogOut, 
  Menu, 
  Bell,
  Map as MapIcon,
  Building2,
  PlusCircle,
  RotateCcw,
  AlertTriangle,
  ShoppingCart,
  Activity
} from 'lucide-react';
import { useAuth } from '../../services/auth';
import { UserRole } from '../../types';

const navItems: Record<UserRole, { label: string; path: string; icon: any }[]> = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'System Health', path: '/admin/health', icon: Activity }, // Moved up for visibility
    { label: 'New Order', path: '/sales/create-order', icon: PlusCircle },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Companies', path: '/admin/companies', icon: Building2 },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Sales Orders', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Purchases', path: '/admin/purchases', icon: ShoppingCart },
    { label: 'Dispatch', path: '/admin/dispatch', icon: Truck },
    { label: 'Returns', path: '/admin/returns', icon: RotateCcw },
    { label: 'Damaged Goods', path: '/admin/damaged-goods', icon: AlertTriangle },
    { label: 'Reports', path: '/admin/reports', icon: FileText },
  ],
  sales: [
    { label: 'Dashboard', path: '/sales/dashboard', icon: LayoutDashboard },
    { label: 'Create Order', path: '/sales/create-order', icon: ShoppingBag },
    { label: 'My Orders', path: '/sales/orders', icon: FileText },
    { label: 'Performance', path: '/sales/performance', icon: Users },
  ],
  delivery: [
    { label: 'Dashboard', path: '/delivery/dashboard', icon: LayoutDashboard },
    { label: 'Route Map', path: '/delivery/route-map', icon: MapIcon },
  ]
};

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const roleNav = navItems[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-center border-b border-gray-200 bg-indigo-700">
          <h1 className="text-2xl font-extrabold text-white tracking-widest">FIREBEAT</h1>
        </div>
        <nav className="mt-6 px-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {roleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-gray-200 p-4 bg-white">
          <div className="mb-2 text-xs text-center text-gray-400">Logged in as {user.role}</div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between bg-white px-6 shadow-sm z-10">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 text-gray-400 hover:text-gray-500">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <div className="flex items-center">
              <img 
                className="h-8 w-8 rounded-full object-cover border border-gray-200"
                src={user.avatarUrl}
                alt={user.name}
              />
              <div className="ml-3 hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
};

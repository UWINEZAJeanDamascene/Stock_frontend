import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Truck, 
  Users, 
  Warehouse, 
  FileText, 
  ShoppingCart,
  Quote, 
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '../components/ui/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Stock', href: '/stock', icon: Warehouse },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Quotations', href: '/quotations', icon: Quote },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
          <Warehouse className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-white">StockManager</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-medium">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-slate-400">{user?.role || 'Staff'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/settings"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

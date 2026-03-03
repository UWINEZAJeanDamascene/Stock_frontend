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
  LogOut,
  X,
  UserCog
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '../components/ui/utils';
import { Button } from '@/app/components/ui/button';

// Navigation items with required permissions
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:read' as const },
  { name: 'Products', href: '/products', icon: Package, permission: 'products:read' as const },
  { name: 'Categories', href: '/categories', icon: Tags, permission: 'categories:read' as const },
  { name: 'Suppliers', href: '/suppliers', icon: Truck, permission: 'suppliers:read' as const },
  { name: 'Clients', href: '/clients', icon: Users, permission: 'clients:read' as const },
  { name: 'Stock', href: '/stock', icon: Warehouse, permission: 'stock:read' as const },
  { name: 'Invoices', href: '/invoices', icon: FileText, permission: 'invoices:read' as const },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart, permission: 'purchases:read' as const },
  { name: 'Quotations', href: '/quotations', icon: Quote, permission: 'quotations:read' as const },
  { name: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports:read' as const },
];

const adminNavigation = [
  { name: 'User Management', href: '/users', icon: UserCog, permission: 'users:read' as const },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { user, logout, hasPermission: checkPermission, isAdmin } = useAuth();

  // Filter navigation items based on user permissions
  const filteredNavigation = navigation.filter(item => 
    checkPermission(item.permission)
  );

  const filteredAdminNavigation = adminNavigation.filter(item => 
    checkPermission(item.permission)
  );

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-800 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white hidden sm:inline">StockManager</span>
        </div>
        {onNavigate && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigate}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 md:px-3 md:py-4">
        <ul className="space-y-0.5 md:space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-2 text-xs md:text-sm md:px-3 md:py-2.5 font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 md:h-5 md:w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
          {/* Admin-only navigation */}
          {isAdmin() && filteredAdminNavigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-2 text-xs md:text-sm md:px-3 md:py-2.5 font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 md:h-5 md:w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-2 md:p-4">
        <div className="flex items-center gap-2 mb-2 md:mb-3 md:gap-3">
          <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-medium">
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
            onClick={handleNavigate}
            className="flex flex-1 items-center justify-center gap-1 md:gap-2 rounded-lg bg-slate-800 px-2 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

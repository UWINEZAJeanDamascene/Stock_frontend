import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { dashboardApi, invoicesApi } from '@/lib/api';
import { 
  Package, 
  Users, 
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardData {
  products: {
    total: number;
    totalLastMonth?: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
  invoices: {
    total: number;
    pending: number;
    monthly: { count: number; total: number; paid: number };
    yearly: { count: number; total: number; paid: number };
  };
  quotations: { active: number };
  clients: { total: number; totalLastMonth?: number };
}

interface SalesData {
  month: string;
  sales: number;
}

interface StockData {
  type: string;
  quantity: number;
}

interface TopProductData {
  _id: {
    name: string;
    sku: string;
  };
  totalRevenue: number;
  totalQuantity: number;
}

interface TopClientData {
  _id: {
    name: string;
    code: string;
  };
  totalAmount: number;
  invoiceCount: number;
}

interface InvoiceStatusData {
  status: string;
  count: number;
}

// Generate mock data for demonstration when API returns empty data
const getMockSalesData = (): SalesData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return months.map((month, index) => ({
    month,
    sales: Math.floor(Math.random() * 50000) + 10000 + (index * 5000),
  }));
};

// Helper to convert API date format to month name
const convertToMonthName = (dateStr: string): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // If it's already a short month name, return as is
  if (months.includes(dateStr)) {
    return dateStr;
  }
  
  // Try to parse as date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return months[date.getMonth()];
  }
  
  return dateStr;
};

const getMockStockData = (): StockData[] => {
  return [
    { type: 'in', quantity: Math.floor(Math.random() * 500) + 100 },
    { type: 'out', quantity: Math.floor(Math.random() * 300) + 50 },
  ];
};

// Colors for pie charts
const COLORS = ['#22c55e', '#eab308', '#ef4444', '#6366f1', '#8b5cf6'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [topClients, setTopClients] = useState<TopClientData[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [stockPeriod, setStockPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const [statsRes, salesRes, stockRes, topProductsRes, topClientsRes, invoicesRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getSalesChart({ period: salesPeriod }),
          dashboardApi.getStockMovementChart({ period: stockPeriod }),
          dashboardApi.getTopSellingProducts({ limit: 5 }),
          dashboardApi.getTopClients({ limit: 5 }),
          invoicesApi.getAll({ limit: 1000 }),
        ]);

        if (statsRes.success) {
          setData(statsRes.data as DashboardData);
        }
        
        if (salesRes.success) {
          const sales = salesRes.data as SalesData[];
          // Convert date strings to month names
          const formattedSales = sales.map(item => ({
            ...item,
            month: convertToMonthName(item.month)
          }));
          console.log('Sales data received:', formattedSales);
          setSalesData(formattedSales.length > 0 ? formattedSales : getMockSalesData());
        }
        
        if (stockRes.success) {
          const stock = stockRes.data as StockData[];
          console.log('Stock data received:', stock);
          setStockData(stock.length > 0 ? stock : getMockStockData());
        }
        
        if (topProductsRes.success) {
          const products = topProductsRes.data as TopProductData[];
          console.log('Top products received:', products);
          setTopProducts(products);
        }
        
        if (topClientsRes.success) {
          const clients = topClientsRes.data as TopClientData[];
          console.log('Top clients received:', clients);
          setTopClients(clients);
        }
        
        // Process invoice status from actual invoice data
        if (invoicesRes.success) {
          const invoices = invoicesRes.data as any[];
          const paidCount = invoices.filter(inv => inv.status === 'paid').length;
          const pendingCount = invoices.filter(inv => inv.status === 'pending' || inv.status === 'partial').length;
          const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
          
          setInvoiceStatus([
            { status: 'Paid', count: paidCount },
            { status: 'Pending', count: pendingCount },
            { status: 'Overdue', count: overdueCount },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch chart data when period changes
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const [salesRes, stockRes] = await Promise.all([
          dashboardApi.getSalesChart({ period: salesPeriod }),
          dashboardApi.getStockMovementChart({ period: stockPeriod }),
        ]);
        
        if (salesRes.success) {
          const sales = salesRes.data as SalesData[];
          // Convert date strings to month names
          const formattedSales = sales.map(item => ({
            ...item,
            month: convertToMonthName(item.month)
          }));
          setSalesData(formattedSales.length > 0 ? formattedSales : getMockSalesData());
        }
        if (stockRes.success) {
          const stock = stockRes.data as StockData[];
          setStockData(stock.length > 0 ? stock : getMockStockData());
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
      }
    };
    fetchChartData();
  }, [salesPeriod, stockPeriod]);

  // Calculate Y-axis domain based on actual data
  const getYAxisDomain = (data: { sales: number }[]) => {
    if (!data || data.length === 0) return [0, 100];
    const maxValue = Math.max(...data.map(d => d.sales));
    // Add 10% padding to the max value
    return [0, Math.ceil(maxValue * 1.1)];
  };

  // Calculate Y-axis domain for stock chart based on quantity
  const getStockYAxisDomain = (data: { quantity: number }[]) => {
    if (!data || data.length === 0) return [0, 100];
    const maxValue = Math.max(...data.map(d => d.quantity));
    // Add 10% padding to the max value
    return [0, Math.ceil(maxValue * 1.1)];
  };
  const formatLargeNumber = (value: number): string => {
    if (value >= 1e9) {
      return `FRW ${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `FRW ${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `FRW ${(value / 1e3).toFixed(1)}k`;
    }
    return `FRW ${value.toLocaleString()}`;
  };

  // Format number for Y-axis
  const formatYAxis = (value: number): string => {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}k`;
    }
    return value.toString();
  };

  // Calculate stats from real data
  const totalProducts = data?.products?.total || 0;
  const totalClients = data?.clients?.total || 0;
  const lowStockCount = data?.products?.lowStock || 0;
  const totalRevenue = data?.invoices?.yearly?.total || 0;
  
  // Extract monthly data for type safety
  const monthly = data?.invoices?.monthly;
  const monthlyGrowth = (monthly?.total ?? 0) > 0 && monthly?.paid != null
    ? Math.round((monthly.paid / monthly.total) * 100)
    : 0;

  // Calculate dynamic percentage changes
  const productsLastMonth = data?.products?.totalLastMonth;
  const productsChange = productsLastMonth != null && productsLastMonth > 0
    ? Math.round(((totalProducts - productsLastMonth) / productsLastMonth) * 100)
    : 0;

  const clientsLastMonth = data?.clients?.totalLastMonth;
  const clientsChange = clientsLastMonth != null && clientsLastMonth > 0
    ? Math.round(((totalClients - clientsLastMonth) / clientsLastMonth) * 100)
    : 0;

  const statCards = [
    { 
      title: 'Total Products', 
      value: totalProducts, 
      icon: Package, 
      color: 'bg-blue-500',
      change: `${productsChange >= 0 ? '+' : ''}${productsChange}%`,
      trend: productsChange >= 0 ? 'up' : 'down'
    },
    { 
      title: 'Total Revenue', 
      value: formatLargeNumber(totalRevenue), 
      icon: DollarSign, 
      color: 'bg-green-500',
      change: `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}%`,
      trend: monthlyGrowth >= 0 ? 'up' : 'down'
    },
    { 
      title: 'Total Clients', 
      value: totalClients, 
      icon: Users, 
      color: 'bg-purple-500',
      change: `${clientsChange >= 0 ? '+' : ''}${clientsChange}%`,
      trend: clientsChange >= 0 ? 'up' : 'down'
    },
    { 
      title: 'Low Stock Items', 
      value: lowStockCount, 
      icon: AlertTriangle, 
      color: 'bg-red-500',
      change: lowStockCount > 0 ? `-${lowStockCount}` : '0',
      trend: lowStockCount > 0 ? 'down' : 'up'
    },
  ];

  return (
    <Layout>
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm md:text-base text-slate-500 hidden sm:block">Welcome back! Here's what's happening with your business.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              {statCards.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className={`p-2.5 md:p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs md:text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                  <h3 className="text-slate-500 text-xs md:text-sm font-medium">{stat.title}</h3>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* Sales Chart */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-slate-800">Sales Overview</h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setSalesPeriod('week')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${salesPeriod === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => setSalesPeriod('month')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${salesPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Month
                    </button>
                    <button 
                      onClick={() => setSalesPeriod('year')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${salesPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Year
                    </button>
                  </div>
                </div>
                <div className="h-64">
                  {salesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.3}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#64748b" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={12} 
                          tickFormatter={formatYAxis}
                          domain={getYAxisDomain(salesData)}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatLargeNumber(value), 'Revenue']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="sales" 
                          name="Revenue"
                          fill="url(#colorSales)" 
                          radius={[4, 4, 0, 0]}
                          animationDuration={500}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      No sales data available
                    </div>
                  )}
                </div>
                {/* Sales Summary */}
                {salesData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Total Sales</p>
                        <p className="text-xl font-bold text-slate-800">
                          {formatLargeNumber(salesData.reduce((sum, item) => sum + item.sales, 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Transactions</p>
                        <p className="text-xl font-bold text-slate-800">{salesData.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stock Movement Chart */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Stock Movement</h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setStockPeriod('week')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${stockPeriod === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => setStockPeriod('month')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${stockPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Month
                    </button>
                    <button 
                      onClick={() => setStockPeriod('year')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${stockPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Year
                    </button>
                  </div>
                </div>
                <div className="h-64">
                  {stockData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="type" 
                          stroke="#64748b" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={12} 
                          tickFormatter={formatYAxis}
                          domain={getStockYAxisDomain(stockData)}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatLargeNumber(value), 'Quantity']}
                        />
                        <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      No stock movement data available
                    </div>
                  )}
                </div>
                {/* Stock Movement Summary */}
                {stockData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Stock In</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatLargeNumber(stockData.find(s => s.type === 'in')?.quantity || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Stock Out</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatLargeNumber(stockData.find(s => s.type === 'out')?.quantity || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* Invoice Summary */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Invoice Summary</h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500">Total Invoices</p>
                    <p className="text-xl md:text-2xl font-bold text-slate-800">{data?.invoices?.total || 0}</p>
                  </div>
                  <div className="p-3 md:p-4 bg-yellow-50 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500">Pending</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-600">{data?.invoices?.pending || 0}</p>
                  </div>
                  <div className="p-3 md:p-4 bg-green-50 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500">Monthly Paid</p>
                    <p className="text-lg md:text-2xl font-bold text-green-600">{formatLargeNumber(data?.invoices?.monthly?.paid || 0)}</p>
                  </div>
                  <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500">Yearly Total</p>
                    <p className="text-lg md:text-2xl font-bold text-blue-600">{formatLargeNumber(data?.invoices?.yearly?.total || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Top Products by Revenue */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Products by Revenue</h3>
                {topProducts.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={topProducts.map(p => ({
                          name: p._id?.name || 'Unknown',
                          revenue: p.totalRevenue || 0,
                          quantity: p.totalQuantity || 0
                        })).reverse()} 
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis 
                          type="number" 
                          stroke="#64748b" 
                          fontSize={12}
                          tickFormatter={formatYAxis}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={100}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatLargeNumber(value), 'Revenue']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} animationDuration={500} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    No top products data available
                  </div>
                )}
              </div>
            </div>

            {/* Tertiary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Revenue by Client */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue by Client</h3>
                {topClients.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={topClients.map(c => ({
                          name: c._id?.name || 'Unknown',
                          revenue: c.totalAmount || 0,
                        })).reverse()} 
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis 
                          type="number" 
                          stroke="#64748b" 
                          fontSize={12}
                          tickFormatter={formatYAxis}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={100}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatLargeNumber(value), 'Revenue']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={500} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    No client data available
                  </div>
                )}
              </div>

              {/* Invoice Status Breakdown */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Invoice Status Breakdown</h3>
                {invoiceStatus.length > 0 && invoiceStatus.some(s => s.count > 0) ? (
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={invoiceStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="status"
                        >
                          {invoiceStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [value, name]}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    No invoice status data available
                  </div>
                )}
                {/* Status percentages */}
                {invoiceStatus.length > 0 && (
                  <div className="mt-4 flex justify-center gap-4">
                    {invoiceStatus.map((status, index) => {
                      const total = invoiceStatus.reduce((sum, s) => sum + s.count, 0);
                      const percentage = total > 0 ? Math.round((status.count / total) * 100) : 0;
                      return (
                        <div key={status.status} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-sm text-slate-600">{status.status}: {percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

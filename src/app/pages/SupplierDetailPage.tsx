import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { suppliersApi } from '@/lib/api';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2, Package, History, FileText, MapPin, Phone, Mail, Calendar, DollarSign, Edit, Power } from 'lucide-react';

interface Supplier {
  _id: string;
  name: string;
  code?: string;
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  taxId?: string;
  paymentTerms: string;
  notes?: string;
  isActive: boolean;
  totalPurchases: number;
  lastPurchaseDate?: string;
  productsSupplied?: { _id: string; name: string; sku: string; unit: string }[];
  createdAt?: string;
  updatedAt?: string;
}

interface PurchaseHistory {
  _id: string;
  product: { _id: string; name: string; sku: string; unit: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  movementDate: string;
  batchNumber?: string;
  notes?: string;
  performedBy?: { name: string };
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0.00';
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(value);
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  cash: 'Cash',
  credit_7: 'Credit 7 Days',
  credit_15: 'Credit 15 Days',
  credit_30: 'Credit 30 Days',
  credit_45: 'Credit 45 Days',
  credit_60: 'Credit 60 Days',
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'products' | 'history'>('profile');
  const [historySummary, setHistorySummary] = useState<{ totalAmount: number; totalQuantity: number; totalPurchases: number } | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    }
  }, [searchParams]);

  useEffect(() => {
    if (id) {
      fetchSupplier();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'history' && id) {
      fetchPurchaseHistory();
    }
  }, [activeTab, id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const response = await suppliersApi.getById(id!);
      if (response.success) {
        const data = response as { data: Supplier };
        setSupplier(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch supplier:', err);
      setError('Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await suppliersApi.getPurchaseHistory(id!, { limit: 50 });
      if (response.success) {
        const data = response as unknown as { data: PurchaseHistory[]; summary: { totalAmount: number; totalQuantity: number; totalPurchases: number } };
        setPurchaseHistory(data.data || []);
        setHistorySummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch purchase history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!supplier) return;
    try {
      await suppliersApi.toggleStatus(supplier._id);
      fetchSupplier();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError('Failed to update supplier status');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </Layout>
    );
  }

  if (!supplier) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Supplier not found</p>
          <button onClick={() => navigate('/suppliers')} className="mt-4 text-indigo-600 hover:underline">
            Back to Suppliers
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/suppliers')}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">{supplier.name}</h1>
            <p className="text-slate-500">Supplier Code: {supplier.code || '-'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {supplier.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Purchases</p>
                <p className="text-xl font-bold">{formatCurrency(supplier.totalPurchases)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Products Supplied</p>
                <p className="text-xl font-bold">{supplier.productsSupplied?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Last Supply</p>
                <p className="text-xl font-bold">{formatDate(supplier.lastPurchaseDate)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment Terms</p>
                <p className="text-xl font-bold">{PAYMENT_TERMS_LABELS[supplier.paymentTerms] || supplier.paymentTerms}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'products' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Products ({supplier.productsSupplied?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Supply History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-slate-400" />
                      <span>{supplier.contact?.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-slate-400" />
                      <span>{supplier.contact?.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-slate-400" />
                      <span>
                        {[supplier.contact?.address, supplier.contact?.city, supplier.contact?.country].filter(Boolean).join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Business Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">Tax ID</p>
                      <p>{supplier.taxId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Payment Terms</p>
                      <p>{PAYMENT_TERMS_LABELS[supplier.paymentTerms] || supplier.paymentTerms}</p>
                    </div>
                    {supplier.notes && (
                      <div>
                        <p className="text-sm text-slate-500">Notes</p>
                        <p>{supplier.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t flex gap-3">
                <button 
                  onClick={handleToggleStatus}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <Power className="h-4 w-4" />
                  {supplier.isActive ? 'Deactivate' : 'Activate'} Supplier
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-sm border">
            {supplier.productsSupplied && supplier.productsSupplied.length > 0 ? (
              <div className="divide-y">
                {supplier.productsSupplied.map((product) => (
                  <div key={product._id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Package className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-slate-500">SKU: {product.sku} | Unit: {product.unit}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No products linked to this supplier
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Summary */}
            {historySummary && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-sm text-slate-500">Total Orders</p>
                  <p className="text-2xl font-bold">{historySummary.totalPurchases}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-sm text-slate-500">Total Quantity</p>
                  <p className="text-2xl font-bold">{historySummary.totalQuantity.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-sm text-slate-500">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(historySummary.totalAmount)}</p>
                </div>
              </div>
            )}

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {historyLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : purchaseHistory.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Product</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Quantity</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Unit Cost</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Total</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Batch #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchaseHistory.map((purchase) => (
                      <tr key={purchase._id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm">{formatDate(purchase.movementDate)}</td>
                        <td className="p-4 text-sm">
                          <p className="font-medium">{purchase.product?.name || '-'}</p>
                          <p className="text-slate-500 text-xs">{purchase.product?.sku}</p>
                        </td>
                        <td className="p-4 text-sm text-right">{purchase.quantity} {purchase.product?.unit}</td>
                        <td className="p-4 text-sm text-right">{formatCurrency(purchase.unitCost)}</td>
                        <td className="p-4 text-sm text-right font-medium">{formatCurrency(purchase.totalCost)}</td>
                        <td className="p-4 text-sm">{purchase.batchNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No purchase history found for this supplier
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

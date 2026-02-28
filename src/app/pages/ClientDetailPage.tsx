import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { clientsApi, invoicesApi, quotationsApi } from '@/lib/api';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2, Package, History, FileText, MapPin, Phone, Mail, Calendar, DollarSign, Edit, Power, Receipt, Quote } from 'lucide-react';

interface Client {
  _id: string;
  name: string;
  code?: string;
  type: 'individual' | 'company';
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  taxId?: string;
  paymentTerms: string;
  creditLimit: number;
  outstandingBalance: number;
  totalPurchases: number;
  lastPurchaseDate?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  grandTotal: number;
  amountPaid: number;
  balance: number;
  status: string;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  quotationDate: string;
  createdAt: string;
  grandTotal: number;
  status: string;
  validUntil?: string;
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

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices' | 'quotations' | 'outstanding'>('profile');
  const [invoiceSummary, setInvoiceSummary] = useState<{ totalInvoices: number; totalAmount: number; totalPaid: number; totalOutstanding: number } | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history' || tab === 'invoices') {
      setActiveTab('invoices');
    }
  }, [searchParams]);

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'invoices' && id) {
      fetchInvoices();
    }
    if (activeTab === 'quotations' && id) {
      fetchQuotations();
    }
    if (activeTab === 'outstanding' && id) {
      fetchOutstandingInvoices();
    }
  }, [activeTab, id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await clientsApi.getById(id!);
      if (response.success) {
        const data = response as { data: Client };
        setClient(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch client:', err);
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await invoicesApi.getAll({ clientId: id, limit: 50 });
      if (response.success) {
        const data = response as { data: Invoice[] };
        const invoiceList = data.data || [];
        setInvoices(invoiceList);
        
        // Calculate summary
        const totalAmount = invoiceList.reduce((sum, inv) => sum + inv.grandTotal, 0);
        const totalPaid = invoiceList.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const totalOutstanding = invoiceList.reduce((sum, inv) => sum + inv.balance, 0);
        setInvoiceSummary({
          totalInvoices: invoiceList.length,
          totalAmount,
          totalPaid,
          totalOutstanding
        });
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      setQuotationsLoading(true);
      const response = await quotationsApi.getAll({ clientId: id, limit: 50 });
      if (response.success) {
        const data = response as { data: Quotation[] };
        setQuotations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setQuotationsLoading(false);
    }
  };

  const fetchOutstandingInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await clientsApi.getOutstandingInvoices(id!);
      if (response.success) {
        const data = response as { data: Invoice[] };
        setOutstandingInvoices(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch outstanding invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!client) return;
    try {
      await clientsApi.toggleStatus(client._id);
      fetchClient();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError('Failed to update client status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-blue-100 text-blue-700',
      pending: 'bg-amber-100 text-amber-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-slate-100 text-slate-600',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-slate-100 text-slate-600',
      draft: 'bg-slate-100 text-slate-600',
    };
    return statusClasses[status] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Client not found</p>
          <button onClick={() => navigate('/clients')} className="mt-4 text-indigo-600 hover:underline">
            Back to Clients
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <button 
            onClick={() => navigate('/clients')}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 truncate">{client.name}</h1>
            <p className="text-sm text-slate-500 hidden md:block">Client Code: {client.code || '-'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {client.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Total Purchases</p>
                <p className="text-lg md:text-xl font-bold">{formatCurrency(client.totalPurchases)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Receipt className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Outstanding Balance</p>
                <p className="text-lg md:text-xl font-bold">{formatCurrency(client.outstandingBalance)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Last Purchase</p>
                <p className="text-lg md:text-xl font-bold">{formatDate(client.lastPurchaseDate)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Credit Limit</p>
                <p className="text-lg md:text-xl font-bold">{formatCurrency(client.creditLimit)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-4 md:mb-6 overflow-x-auto">
          <div className="flex gap-4 md:gap-6 min-w-max">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('quotations')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'quotations' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Quotations
            </button>
            <button
              onClick={() => setActiveTab('outstanding')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'outstanding' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Outstanding
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Contact Information</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Mail className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm truncate">{client.contact?.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <Phone className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span>{client.contact?.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm">
                        {[client.contact?.address, client.contact?.city, client.contact?.country].filter(Boolean).join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Business Details</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">Type</p>
                      <p className="capitalize text-sm md:text-base">{client.type || 'individual'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Tax ID</p>
                      <p className="text-sm md:text-base">{client.taxId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Payment Terms</p>
                      <p className="text-sm md:text-base">{PAYMENT_TERMS_LABELS[client.paymentTerms] || client.paymentTerms}</p>
                    </div>
                    {client.notes && (
                      <div>
                        <p className="text-sm text-slate-500">Notes</p>
                        <p className="text-sm md:text-base">{client.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-3 md:pt-4 border-t flex gap-2 md:gap-3">
                <button 
                  onClick={handleToggleStatus}
                  className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
                >
                  <Power className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">{client.isActive ? 'Deactivate' : 'Activate'} Client</span>
                  <span className="sm:hidden">{client.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-3 md:space-y-4">
            {/* Summary */}
            {invoiceSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">Total Invoices</p>
                  <p className="text-xl md:text-2xl font-bold">{invoiceSummary.totalInvoices}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">Total Amount</p>
                  <p className="text-xl md:text-2xl font-bold">{formatCurrency(invoiceSummary.totalAmount)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">Total Paid</p>
                  <p className="text-xl md:text-2xl font-bold">{formatCurrency(invoiceSummary.totalPaid)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">Outstanding</p>
                  <p className="text-xl md:text-2xl font-bold">{formatCurrency(invoiceSummary.totalOutstanding)}</p>
                </div>
              </div>
            )}

            {/* Invoices Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {invoicesLoading ? (
                <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
              ) : invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Invoice #</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Due Date</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Total</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Paid</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Balance</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm font-medium">{invoice.invoiceNumber}</td>
                        <td className="p-4 text-sm">{formatDate(invoice.invoiceDate)}</td>
                        <td className="p-4 text-sm">{formatDate(invoice.dueDate)}</td>
                        <td className="p-4 text-sm text-right font-medium">{formatCurrency(invoice.grandTotal)}</td>
                        <td className="p-4 text-sm text-right">{formatCurrency(invoice.amountPaid)}</td>
                        <td className="p-4 text-sm text-right">{formatCurrency(invoice.balance)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-slate-500">
                  No invoices found for this client
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'quotations' && (
          <div className="space-y-3 md:space-y-4">
            {/* Quotations Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {quotationsLoading ? (
                <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
              ) : quotations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Quotation #</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Valid Until</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Total</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {quotations.map((quotation) => (
                      <tr key={quotation._id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm font-medium">{quotation.quotationNumber}</td>
                        <td className="p-4 text-sm">{formatDate(quotation.createdAt || quotation.quotationDate)}</td>
                        <td className="p-4 text-sm">{formatDate(quotation.validUntil)}</td>
                        <td className="p-4 text-sm text-right font-medium">{formatCurrency(quotation.grandTotal)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(quotation.status)}`}>
                            {quotation.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-slate-500">
                  No quotations found for this client
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'outstanding' && (
          <div className="space-y-3 md:space-y-4">
            {/* Outstanding Invoices Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {invoicesLoading ? (
                <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
              ) : outstandingInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Invoice #</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Due Date</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Total</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Paid</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Balance</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {outstandingInvoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm font-medium">{invoice.invoiceNumber}</td>
                        <td className="p-4 text-sm">{formatDate(invoice.invoiceDate)}</td>
                        <td className="p-4 text-sm">{formatDate(invoice.dueDate)}</td>
                        <td className="p-4 text-sm text-right font-medium">{formatCurrency(invoice.grandTotal)}</td>
                        <td className="p-4 text-sm text-right">{formatCurrency(invoice.amountPaid)}</td>
                        <td className="p-4 text-sm text-right text-amber-600 font-medium">{formatCurrency(invoice.balance)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-slate-500">
                  No outstanding invoices for this client
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

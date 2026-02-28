import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { quotationsApi, clientsApi, productsApi } from '@/lib/api';
import { Quote, Plus, Search, Eye, FileDown, Loader2, Clock, CheckCircle, X, Send, FileText, Check, Trash2 } from 'lucide-react';

interface QuotationItem {
  product: { _id: string; name: string; sku: string };
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  total: number;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  client: { _id: string; name: string; taxId?: string };
  companyTin?: string;
  createdAt: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' | 'expired';
  terms?: string;
  notes?: string;
}

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  averageCost: number;
}

interface FormItem {
  id: string;
  product: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formClient, setFormClient] = useState('');
  const [formCompanyTin, setFormCompanyTin] = useState('');
  const [formItems, setFormItems] = useState<FormItem[]>([{ id: '1', product: '', itemCode: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 18 }]);
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formTerms, setFormTerms] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotationsRes, clientsRes, productsRes] = await Promise.all([
        quotationsApi.getAll(),
        clientsApi.getAll(),
        productsApi.getAll()
      ]);
      
      if (quotationsRes.success) {
        const data = quotationsRes as { data: Quotation[] };
        setQuotations(data.data || []);
      }
      if (clientsRes.success) {
        const data = clientsRes as { data: Client[] };
        setClients(data.data || []);
      }
      if (productsRes.success) {
        const data = productsRes as { data: Product[] };
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotations = quotations.filter(q => 
    q.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'converted': return 'bg-blue-100 text-blue-700';
      case 'sent': return 'bg-purple-100 text-purple-700';
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'expired': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const viewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };

  const openCreateModal = () => {
    setFormClient('');
    setFormCompanyTin('');
    setFormItems([{ id: '1', product: '', itemCode: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 18 }]);
    setFormValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormTerms('Payment due within 30 days');
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormClient(quotation.client?._id || '');
    setFormCompanyTin(quotation.companyTin || '');
    // map quotation items into FormItem
    setFormItems((quotation.items || []).map((it, idx) => ({
      id: (it.product?._id || idx).toString(),
      product: (it.product as any)?._id || (it.product as any) || '',
      itemCode: it.itemCode || (it.product as any)?.sku || '',
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || 0,
      discount: it.discount || 0,
      taxRate: it.taxRate || 18
    })));
    setFormValidUntil(quotation.validUntil ? quotation.validUntil.split('T')[0] : '');
    setFormTerms(quotation.terms || '');
    setFormNotes(quotation.notes || '');
    setShowModal(true);
  };

  const addItem = () => {
    setFormItems([...formItems, { id: Date.now().toString(), product: '', itemCode: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 18 }]);
  };

  const removeItem = (id: string) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FormItem, value: string | number) => {
    setFormItems(formItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'product' && value) {
          const product = products.find(p => p._id === value);
          if (product) {
            updated.unitPrice = product.averageCost || 0;
            updated.itemCode = product.sku;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateItemTotal = (item: FormItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = item.discount;
    const tax = (subtotal - discount) * (item.taxRate / 100);
    return subtotal - discount + tax;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    formItems.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      totalTax += (itemSubtotal - item.discount) * (item.taxRate / 100);
    });
    return { subtotal, totalTax, grandTotal: subtotal + totalTax };
  };

  const handleSend = async (id: string) => {
    if (!confirm('Send this quotation to the client?')) return;
    try {
      setActionLoading(id);
      await quotationsApi.update(id, { status: 'sent' });
      fetchData();
    } catch (err) {
      console.error('Failed to send:', err);
      setError('Failed to send quotation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this quotation?')) return;
    try {
      setActionLoading(id);
      await quotationsApi.approve(id);
      fetchData();
    } catch (err) {
      console.error('Failed to approve:', err);
      setError('Failed to approve quotation. Only sent quotations can be approved.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToInvoice = async (id: string) => {
    const dueDate = prompt('Enter due date (YYYY-MM-DD):', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (!dueDate) return;
    try {
      setActionLoading(id);
      await quotationsApi.convertToInvoice(id, { dueDate });
      alert('Quotation converted to invoice successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to convert:', err);
      setError('Failed to convert. Only approved quotations can be converted to invoice.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClient) {
      setError('Please select a client');
      return;
    }
    if (formItems.some(item => !item.product)) {
      setError('Please select all products');
      return;
    }

    setSubmitting(true);
    
    const items = formItems.map(item => {
      const product = products.find(p => p._id === item.product);
      const subtotal = item.quantity * item.unitPrice;
      const totalTax = (subtotal - item.discount) * (item.taxRate / 100);
      return {
        product: item.product,
        itemCode: item.itemCode || product?.sku || '',
        description: `${product?.name || ''} - ${item.quantity} ${product?.unit || ''}`,
        quantity: item.quantity,
        unit: product?.unit || 'pcs',
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        subtotal,
        total: subtotal - item.discount + totalTax
      };
    });

    const totals = calculateTotals();

    const quotationData = {
      client: formClient,
      companyTin: formCompanyTin,
      items,
      validUntil: formValidUntil,
      terms: formTerms,
      notes: formNotes,
      subtotal: totals.subtotal,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal
    };

    try {
      if (editingQuotation) {
        await quotationsApi.update(editingQuotation._id, quotationData);
        setEditingQuotation(null);
      } else {
        await quotationsApi.create(quotationData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const getActionButtons = (quotation: Quotation) => {
    const buttons = [];
    const isLoading = actionLoading === quotation._id;
    
    if (quotation.status === 'draft') {
      buttons.push(
        <button key="send" onClick={() => handleSend(quotation._id)} disabled={isLoading} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Send to client">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      );
    }
    
    if (quotation.status === 'sent') {
      buttons.push(
        <button key="approve" onClick={() => handleApprove(quotation._id)} disabled={isLoading} className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Approve quotation">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
      );
    }
    
    if (quotation.status === 'approved') {
      buttons.push(
        <button key="convert" onClick={() => handleConvertToInvoice(quotation._id)} disabled={isLoading} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Convert to invoice">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        </button>
      );
    }
    
    return buttons;
  };

  const handleDownload = async (id: string, filename?: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`/api/quotations/${id}/pdf`);
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `quotation-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setError('Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    if (!confirm('Delete this quotation? This action cannot be undone.')) return;
    try {
      setActionLoading(id);
      await quotationsApi.delete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete quotation:', err);
      setError('Failed to delete quotation');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = quotations.filter(q => q.status === 'draft' || q.status === 'sent').length;
  const acceptedCount = quotations.filter(q => q.status === 'approved' || q.status === 'converted').length;
  const totalValue = quotations.reduce((sum, q) => sum + (q.grandTotal ?? 0), 0);
  const totals = calculateTotals();

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quotations</h1>
            <p className="text-slate-500">Manage quotes and proposals</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
            <Plus className="h-5 w-5" /> Create Quotation
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100"><Quote className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Total Quotes</p>
                <p className="text-2xl font-bold text-slate-800">{quotations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-100"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-slate-100"><Quote className="h-5 w-5 text-slate-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Total Value</p>
                <p className="text-2xl font-bold text-slate-800">FRW {totalValue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input type="text" placeholder="Search quotations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
            <Quote className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No quotations found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Quote #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Valid Until</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600">{quotation.quotationNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{quotation.client?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 text-right font-medium">FRW {((quotation.grandTotal ?? 0) || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>{quotation.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => viewQuotation(quotation)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                        {getActionButtons(quotation)}
                        {['draft', 'sent'].includes(quotation.status) ? (
                          <button onClick={() => openEditModal(quotation)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit">
                            <FileText className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button onClick={() => handleDownload(quotation._id, `quotation-${quotation.quotationNumber || quotation._id}.pdf`)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Download PDF">
                          {actionLoading === quotation._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleDeleteQuotation(quotation._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Quotation">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {showViewModal && selectedQuotation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Quotation Details</h2>
                <button onClick={() => { setShowViewModal(false); setSelectedQuotation(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-slate-500">Quotation Number</p>
                    <p className="font-semibold">{selectedQuotation.quotationNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Company TIN</p>
                    <p className="font-semibold">{selectedQuotation.companyTin || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedQuotation.status)}`}>{selectedQuotation.status}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Client</p>
                    <p className="font-semibold">{selectedQuotation.client?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Client TIN</p>
                    <p className="font-semibold">{selectedQuotation.client?.taxId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Valid Until</p>
                    <p className="font-semibold">{selectedQuotation.validUntil ? new Date(selectedQuotation.validUntil).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
                
                <h3 className="font-semibold mb-3">Items</h3>
                <table className="w-full mb-6">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 text-xs font-semibold">No.</th>
                      <th className="text-left p-2 text-xs font-semibold">Description</th>
                      <th className="text-center p-2 text-xs font-semibold">Unit</th>
                      <th className="text-right p-2 text-xs font-semibold">Quantity</th>
                      <th className="text-right p-2 text-xs font-semibold">Unit rate FRW</th>
                      <th className="text-right p-2 text-xs font-semibold">Total With VAT FRW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuotation.items?.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 text-sm">{index + 1}</td>
                        <td className="p-2 text-sm">{item.product?.name || item.description}</td>
                        <td className="p-2 text-sm text-center">{item.unit}</td>
                        <td className="p-2 text-sm text-right">{item.quantity}</td>
                        <td className="p-2 text-sm text-right">{item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-sm text-right font-medium">{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between"><span>Total VAT Exclusive (RWF):</span> <span>{selectedQuotation.subtotal?.toFixed(2)}</span></p>
                        <p className="flex justify-between"><span>VAT (18%):</span> <span>{selectedQuotation.totalTax?.toFixed(2)}</span></p>
                        <p className="flex justify-between font-bold text-lg"><span>Value Total Amount (RWF):</span> <span>{selectedQuotation.grandTotal?.toFixed(2)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedQuotation.terms && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-500">Terms</p>
                    <p className="text-sm">{selectedQuotation.terms}</p>
                  </div>
                )}

                {selectedQuotation.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-500">Notes</p>
                    <p className="text-sm">{selectedQuotation.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Create Quotation</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Client *</label>
                    <select value={formClient} onChange={(e) => setFormClient(e.target.value)} className="w-full p-2 border rounded-lg" required>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company TIN</label>
                    <input 
                      type="text" 
                      value={formCompanyTin} 
                      onChange={(e) => setFormCompanyTin(e.target.value)} 
                      className="w-full p-2 border rounded-lg" 
                      placeholder="Your company TIN number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valid Until *</label>
                    <input type="date" value={formValidUntil} onChange={(e) => setFormValidUntil(e.target.value)} className="w-full p-2 border rounded-lg" required />
                  </div>
                </div>

                <h3 className="font-semibold mb-3">Items</h3>
                <div className="space-y-3 mb-6">
                  {formItems.map((item) => (
                    <div key={item.id} className="flex gap-2 items-end">
                      <div className="w-24">
                        <label className="block text-xs text-slate-500 mb-1">Item Code</label>
                        <input 
                          type="text" 
                          value={item.itemCode || ''} 
                          onChange={(e) => updateItem(item.id, 'itemCode', e.target.value)} 
                          className="w-full p-2 border rounded-lg text-sm" 
                          placeholder="SKU"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">Product</label>
                        <select value={item.product} onChange={(e) => updateItem(item.id, 'product', e.target.value)} className="w-full p-2 border rounded-lg text-sm" required>
                          <option value="">Select product</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="block text-xs text-slate-500 mb-1">Qty</label>
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full p-2 border rounded-lg text-sm" required />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-slate-500 mb-1">Unit Price</label>
                        <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg text-sm" required />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-slate-500 mb-1">Disc.</label>
                        <input type="number" step="0.01" min="0" value={item.discount} onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg text-sm" />
                      </div>
                      <div className="w-16">
                        <label className="block text-xs text-slate-500 mb-1">Tax %</label>
                        <input type="number" min="0" max="100" value={item.taxRate} onChange={(e) => updateItem(item.id, 'taxRate', parseInt(e.target.value) || 0)} className="w-full p-2 border rounded-lg text-sm" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-slate-500 mb-1">Total</label>
                        <div className="p-2 bg-slate-50 rounded-lg text-sm font-medium">{calculateItemTotal(item).toFixed(2)}</div>
                      </div>
                      <button type="button" onClick={() => removeItem(item.id)} disabled={formItems.length === 1} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="mb-6 text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Add Item</button>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
                    <textarea value={formTerms} onChange={(e) => setFormTerms(e.target.value)} rows={2} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between"><span>Total VAT Exclusive (RWF):</span> <span>{totals.subtotal.toFixed(2)}</span></p>
                        <p className="flex justify-between"><span>VAT (18%):</span> <span>{totals.totalTax.toFixed(2)}</span></p>
                        <p className="flex justify-between font-bold text-lg"><span>Value Total Amount (RWF):</span> <span>{totals.grandTotal.toFixed(2)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Quotation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

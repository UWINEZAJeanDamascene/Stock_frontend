import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { purchasesApi, suppliersApi, productsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { FileText, Plus, Search, Eye, Download, X, Loader2, DollarSign, Clock, CheckCircle, CreditCard, Trash2, Package, AlertCircle, Trash } from 'lucide-react';

interface PurchaseItem {
  product: { _id: string; name: string; sku: string };
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  discount: number;
  taxCode: 'A' | 'B' | 'None';
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalWithTax: number;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplier: { _id: string; name: string; taxId?: string; contact?: { address?: string } };
  supplierTin?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierInvoiceNumber?: string;
  purchaseDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  items: PurchaseItem[];
  totalAEx: number;
  totalB18: number;
  totalTaxA: number;
  totalTaxB: number;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  roundedAmount: number;
  amountPaid: number;
  balance: number;
  status: 'draft' | 'ordered' | 'received' | 'partial' | 'paid' | 'cancelled';
  currency: string;
  paymentTerms: string;
  terms?: string;
  notes?: string;
  stockAdded: boolean;
}

interface Supplier {
  _id: string;
  name: string;
  code?: string;
  taxId?: string;
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  paymentTerms?: string;
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
  unitCost: number;
  discount: number;
  taxCode: 'A' | 'B' | 'None';
  taxRate: number;
}

const CURRENCIES = [
  { value: 'FRW', label: 'FRW - Rwandan Franc' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'LBP', label: 'LBP - Lebanese Pound' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
];

const PAYMENT_TERMS = [
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'credit_7', label: 'Credit 7 Days' },
  { value: 'credit_15', label: 'Credit 15 Days' },
  { value: 'credit_30', label: 'Credit 30 Days' },
  { value: 'credit_45', label: 'Credit 45 Days' },
  { value: 'credit_60', label: 'Credit 60 Days' },
];

const TAX_CODES = [
  { value: 'A', label: 'A (0%)', rate: 0 },
  { value: 'B', label: 'B (18%)', rate: 18 },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'credit', label: 'Credit/Account' },
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierInvoice, setFormSupplierInvoice] = useState('');
  const [formCurrency, setFormCurrency] = useState('FRW');
  const [formPaymentTerms, setFormPaymentTerms] = useState('cash');
  const [formItems, setFormItems] = useState<FormItem[]>([{ id: '1', product: '', itemCode: '', quantity: 1, unitCost: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExpectedDate, setFormExpectedDate] = useState('');
  const [formTerms, setFormTerms] = useState('Payment due within 30 days');
  const [formNotes, setFormNotes] = useState('');

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplierData, setSelectedSupplierData] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        purchasesApi.getAll({ page: 1, limit: 50 }),
        suppliersApi.getAll({ page: 1, limit: 100 }),
        productsApi.getAll({ page: 1, limit: 100 })
      ]);
      
      if (purchasesRes.success) {
        const data = purchasesRes as { data: Purchase[] };
        setPurchases(data.data || []);
      }
      if (suppliersRes.success) {
        setSuppliers((suppliersRes as { data: Supplier[] }).data || []);
      }
      if (productsRes.success) {
        setProducts((productsRes as { data: Product[] }).data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierInvoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.code?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'received': return 'bg-blue-100 text-blue-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      case 'ordered': return 'bg-purple-100 text-purple-700';
      case 'cancelled': return 'bg-slate-100 text-slate-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const viewPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowViewModal(true);
  };

  const openPaymentModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowPaymentModal(true);
  };

  const openCancelModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const openDeleteModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    setFormSupplier('');
    setFormSupplierInvoice('');
    setFormCurrency('FRW');
    setFormPaymentTerms('cash');
    setFormItems([{ id: '1', product: '', itemCode: '', quantity: 1, unitCost: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormExpectedDate('');
    setFormTerms('Payment due within 30 days');
    setFormNotes('');
    setSelectedSupplierData(null);
    setSupplierSearch('');
    setShowModal(true);
  };

  const selectSupplier = (supplier: Supplier) => {
    setFormSupplier(supplier._id);
    setSelectedSupplierData(supplier);
    setSupplierSearch(supplier.name);
    setShowSupplierDropdown(false);
    
    if (supplier.paymentTerms) {
      setFormPaymentTerms(supplier.paymentTerms);
    }
  };

  const addItem = () => {
    setFormItems([...formItems, { id: Date.now().toString(), product: '', itemCode: '', quantity: 1, unitCost: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
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
            updated.unitCost = product.averageCost || 0;
            updated.itemCode = product.sku;
          }
        }
        
        if (field === 'taxCode') {
          const tax = TAX_CODES.find(t => t.value === value);
          if (tax) {
            updated.taxRate = tax.rate;
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateItemTotal = (item: FormItem) => {
    const subtotal = item.quantity * item.unitCost;
    const discount = item.discount;
    const netAmount = subtotal - discount;
    const tax = netAmount * (item.taxRate / 100);
    return netAmount + tax;
  };

  const calculateTotals = () => {
    let totalAEx = 0;
    let totalB18 = 0;
    let totalTaxA = 0;
    let totalTaxB = 0;
    let subtotal = 0;
    let totalDiscount = 0;

    formItems.forEach(item => {
      const itemSubtotal = item.quantity * item.unitCost;
      const itemDiscount = item.discount;
      const netAmount = itemSubtotal - itemDiscount;
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      if (item.taxCode === 'A') {
        totalAEx += netAmount;
        totalTaxA += netAmount * (item.taxRate / 100);
      } else if (item.taxCode === 'B') {
        totalB18 += netAmount;
        totalTaxB += netAmount * (item.taxRate / 100);
      }
    });

    const totalTax = totalTaxA + totalTaxB;
    const grandTotal = subtotal - totalDiscount + totalTax;
    const roundedAmount = Math.round(grandTotal * 100) / 100;

    return { totalAEx, totalB18, totalTaxA, totalTaxB, subtotal, totalDiscount, totalTax, grandTotal, roundedAmount };
  };

  const handleReceivePurchase = async () => {
    if (!selectedPurchase) return;
    
    setReceiveLoading(true);
    try {
      await purchasesApi.receive(selectedPurchase._id);
      setShowViewModal(false);
      setSelectedPurchase(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to receive purchase:', err);
      setError(err.message || 'Failed to receive purchase');
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPaymentLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const paymentData = {
      amount: Number(formData.get('amount')),
      paymentMethod: formData.get('paymentMethod') as 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'credit',
      reference: formData.get('reference') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };
    
    try {
      if (selectedPurchase) {
        await purchasesApi.recordPayment(selectedPurchase._id, paymentData);
        setShowPaymentModal(false);
        setSelectedPurchase(null);
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    
    setPaymentLoading(true);
    try {
      await purchasesApi.cancel(selectedPurchase._id, cancelReason);
      setShowCancelModal(false);
      setSelectedPurchase(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to cancel purchase:', err);
      setError(err.message || 'Failed to cancel purchase');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!selectedPurchase) return;
    
    setDeleteLoading(true);
    try {
      await purchasesApi.delete(selectedPurchase._id);
      setShowDeleteModal(false);
      setSelectedPurchase(null);
      setShowViewModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete purchase:', err);
      setError(err.message || 'Failed to delete purchase');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      setPdfLoading(id);
      const blob = await purchasesApi.getPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setError('Failed to download PDF');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier) {
      setError('Please select a supplier');
      return;
    }
    if (formItems.some(item => !item.product)) {
      setError('Please select all products');
      return;
    }

    setSubmitting(true);
    
    const items = formItems.map(item => {
      const product = products.find(p => p._id === item.product);
      const subtotal = item.quantity * item.unitCost;
      const discount = item.discount;
      const netAmount = subtotal - discount;
      const taxRate = item.taxRate;
      const taxAmount = netAmount * (taxRate / 100);
      const totalWithTax = netAmount + taxAmount;
      
      return {
        product: item.product,
        itemCode: item.itemCode || product?.sku || '',
        description: `${product?.name || ''} - ${item.quantity} ${product?.unit || ''}`,
        quantity: item.quantity,
        unit: product?.unit || 'pcs',
        unitCost: item.unitCost,
        discount: item.discount,
        taxCode: item.taxCode,
        taxRate: item.taxRate,
        taxAmount,
        subtotal,
        totalWithTax
      };
    });

    const totals = calculateTotals();

    const purchaseData = {
      supplier: formSupplier,
      supplierInvoiceNumber: formSupplierInvoice || undefined,
      currency: formCurrency,
      paymentTerms: formPaymentTerms,
      supplierTin: selectedSupplierData?.taxId,
      supplierName: selectedSupplierData?.name,
      supplierAddress: selectedSupplierData?.contact?.address,
      items,
      purchaseDate: formPurchaseDate,
      expectedDeliveryDate: formExpectedDate || undefined,
      terms: formTerms,
      notes: formNotes,
      ...totals
    };

    try {
      await purchasesApi.create(purchaseData);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save:', err);
      setError(err.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();
  const totalPurchases = purchases.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.roundedAmount ?? 0), 0);
  const totalPaid = purchases.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amountPaid ?? 0), 0);
  const totalDue = purchases.filter(p => p.status !== 'paid' && p.status !== 'cancelled').reduce((sum, p) => sum + (p.balance ?? 0), 0);

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Purchases</h1>
            <p className="text-sm text-slate-500 hidden sm:block">Track purchases from suppliers</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Create Purchase
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-blue-100"><DollarSign className="h-4 w-4 md:h-5 md:w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Total Purchases</p>
                <p className="text-lg md:text-2xl font-bold text-slate-800">{formatCurrency(totalPurchases)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-green-100"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Total Paid</p>
                <p className="text-lg md:text-2xl font-bold text-slate-800">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-amber-100"><Clock className="h-4 w-4 md:h-5 md:w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Total Due</p>
                <p className="text-lg md:text-2xl font-bold text-amber-600">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-purple-100"><Package className="h-4 w-4 md:h-5 md:w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">Total Orders</p>
                <p className="text-lg md:text-2xl font-bold text-slate-800">{purchases.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="bg-white rounded-xl p-8 md:p-12 shadow-sm border border-slate-200 text-center">
            <FileText className="h-8 w-8 md:h-12 md:w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No purchases found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">PO #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Supplier</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Supplier Invoice</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Paid</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-emerald-600">{purchase.purchaseNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{purchase.supplier?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{purchase.supplierInvoiceNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 text-right font-medium">{formatCurrency(purchase.roundedAmount)}</td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right">{formatCurrency(purchase.amountPaid)}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>{purchase.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => viewPurchase(purchase)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                        {(purchase.status === 'received' || purchase.status === 'partial') && (
                          <button onClick={() => openPaymentModal(purchase)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Record Payment"><CreditCard className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => handleDownloadPDF(purchase._id)} disabled={pdfLoading === purchase._id} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Download PDF">{pdfLoading === purchase._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button>
                        <button onClick={() => openDeleteModal(purchase)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Purchase Modal */}
        {showViewModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-lg font-semibold">Purchase Details</h2>
                  <p className="text-sm text-slate-500">{selectedPurchase.purchaseNumber}</p>
                </div>
                <button onClick={() => { setShowViewModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPurchase.status)}`}>{selectedPurchase.status}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Supplier</p>
                    <p className="font-semibold">{selectedPurchase.supplier?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Purchase Date</p>
                    <p className="font-semibold">{selectedPurchase.purchaseDate ? new Date(selectedPurchase.purchaseDate).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Supplier Invoice</p>
                    <p className="font-semibold">{selectedPurchase.supplierInvoiceNumber || '-'}</p>
                  </div>
                </div>

                {selectedPurchase.supplierTin && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Supplier TIN: {selectedPurchase.supplierTin}</p>
                    {selectedPurchase.supplierAddress && <p className="text-sm text-slate-500">Address: {selectedPurchase.supplierAddress}</p>}
                  </div>
                )}
                
                <h3 className="font-semibold mb-3">Items</h3>
                <table className="w-full mb-6">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 text-xs font-semibold">Item Code</th>
                      <th className="text-left p-2 text-xs font-semibold">Item Description</th>
                      <th className="text-right p-2 text-xs font-semibold">Qty</th>
                      <th className="text-center p-2 text-xs font-semibold">Tax</th>
                      <th className="text-right p-2 text-xs font-semibold">Unit Price</th>
                      <th className="text-right p-2 text-xs font-semibold">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 text-sm">{item.itemCode || '-'}</td>
                        <td className="p-2 text-sm">{item.product?.name || item.description}</td>
                        <td className="p-2 text-sm text-right">{item.quantity} {item.unit}</td>
                        <td className="p-2 text-sm text-center">{item.taxCode}: {item.taxRate}%</td>
                        <td className="p-2 text-sm text-right">{formatCurrency(item.unitCost)}</td>
                        <td className="p-2 text-sm text-right font-medium">{formatCurrency(item.totalWithTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div>
                      <p className="text-sm font-semibold mb-2">Summary</p>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between"><span>Total Rwf:</span> <span>FRW {selectedPurchase.roundedAmount?.toFixed(2)}</span></p>
                        <p className="flex justify-between"><span>Total A-EX Rwf:</span> <span>FRW {selectedPurchase.totalAEx?.toFixed(2) || '0.00'}</span></p>
                        <p className="flex justify-between"><span>Total B-18% Rwf:</span> <span>FRW {selectedPurchase.totalB18?.toFixed(2) || '0.00'}</span></p>
                        <p className="flex justify-between"><span>Total Tax B Rwf:</span> <span>FRW {selectedPurchase.totalTaxB?.toFixed(2) || '0.00'}</span></p>
                        <p className="flex justify-between font-bold"><span>Total Tax Rwf:</span> <span>FRW {selectedPurchase.totalTax?.toFixed(2)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  {selectedPurchase.status === 'draft' && (
                    <button onClick={handleReceivePurchase} disabled={receiveLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                      {receiveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Package className="h-4 w-4" /> Receive & Add Stock
                    </button>
                  )}
                  {(selectedPurchase.status === 'received' || selectedPurchase.status === 'partial') && (
                    <button onClick={() => openPaymentModal(selectedPurchase)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Record Payment
                    </button>
                  )}
                  {selectedPurchase.status !== 'cancelled' && selectedPurchase.status !== 'paid' && (
                    <button onClick={() => openCancelModal(selectedPurchase)} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2">
                      <X className="h-4 w-4" /> Cancel Purchase
                    </button>
                  )}
                  <button onClick={() => handleDownloadPDF(selectedPurchase._id)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                  {selectedPurchase.status === 'draft' && (
                    <button onClick={() => openDeleteModal(selectedPurchase)} className="px-4 py-2 bg-red-700 text-white rounded-lg flex items-center gap-2">
                      <Trash className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {showPaymentModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Record Payment</h2>
                <button onClick={() => { setShowPaymentModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-2">Total: <span className="font-semibold text-slate-800">FRW {selectedPurchase.roundedAmount?.toFixed(2)}</span></p>
                  <p className="text-sm text-slate-500 mb-2">Amount Paid: <span className="font-semibold text-green-600">FRW {selectedPurchase.amountPaid?.toFixed(2)}</span></p>
                  <p className="text-sm text-slate-500">Balance Due: <span className="font-semibold text-red-600">FRW {selectedPurchase.balance?.toFixed(2)}</span></p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount *</label>
                  <input type="number" name="amount" step="0.01" min="0" max={selectedPurchase.balance} className="w-full p-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method *</label>
                  <select name="paymentMethod" className="w-full p-2 border rounded-lg" required>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference</label>
                  <input type="text" name="reference" className="w-full p-2 border rounded-lg" placeholder="Transaction ID, Cheque #, etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea name="notes" rows={2} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedPurchase(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={paymentLoading}>Cancel</button>
                  <button type="submit" disabled={paymentLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                    {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Purchase Modal */}
        {showCancelModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-red-600">Cancel Purchase</h2>
                <button onClick={() => { setShowCancelModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCancelPurchase} className="p-6 space-y-4">
                {selectedPurchase.stockAdded && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Warning: Stock will be reversed if you cancel this purchase</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Reason for cancellation *</label>
                  <textarea 
                    value={cancelReason} 
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3} 
                    className="w-full p-2 border rounded-lg" 
                    required 
                    placeholder="Please provide a reason..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowCancelModal(false); setSelectedPurchase(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={paymentLoading}>Close</button>
                  <button type="submit" disabled={paymentLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2">
                    {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cancel Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Purchase Modal */}
        {showDeleteModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-red-600">Delete Purchase</h2>
                <button onClick={() => { setShowDeleteModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Warning: This action cannot be undone!</span>
                </div>
                <p>Are you sure you want to delete purchase <strong>{selectedPurchase.purchaseNumber}</strong>? This will permanently remove the purchase from the system.</p>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedPurchase(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={deleteLoading}>Cancel</button>
                  <button onClick={handleDeletePurchase} disabled={deleteLoading} className="px-4 py-2 bg-red-700 text-white rounded-lg flex items-center gap-2">
                    {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Purchase Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Create Purchase</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">Supplier *</label>
                    <input 
                      type="text" 
                      value={supplierSearch}
                      onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Search by name or code..."
                    />
                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuppliers.slice(0, 10).map(supplier => (
                          <button
                            key={supplier._id}
                            type="button"
                            onClick={() => selectSupplier(supplier)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-b-0"
                          >
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-xs text-slate-500">{supplier.code}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier Invoice #</label>
                    <input type="text" value={formSupplierInvoice} onChange={(e) => setFormSupplierInvoice(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Supplier's invoice number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier TIN</label>
                    <input type="text" value={selectedSupplierData?.taxId || ''} className="w-full p-2 border rounded-lg bg-slate-50" readOnly placeholder="Auto-filled" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Currency</label>
                    <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} className="w-full p-2 border rounded-lg">
                      {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Terms</label>
                    <select value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value)} className="w-full p-2 border rounded-lg">
                      {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Date</label>
                    <input type="date" value={formPurchaseDate} onChange={(e) => setFormPurchaseDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expected Delivery</label>
                    <input type="date" value={formExpectedDate} onChange={(e) => setFormExpectedDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>

                <h3 className="font-semibold mb-3">Items</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-2 text-xs font-semibold">Product</th>
                        <th className="text-center p-2 text-xs font-semibold w-20">Qty</th>
                        <th className="text-right p-2 text-xs font-semibold w-24">Unit Cost</th>
                        <th className="text-right p-2 text-xs font-semibold w-20">Disc.</th>
                        <th className="text-center p-2 text-xs font-semibold w-20">Tax</th>
                        <th className="text-right p-2 text-xs font-semibold w-24">Total</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">
                            <select value={item.product} onChange={(e) => updateItem(item.id, 'product', e.target.value)} className="w-full p-2 border rounded-lg text-sm" required>
                              <option value="">Select product</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full p-2 border rounded-lg text-sm text-right" required />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" min="0" value={item.unitCost} onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg text-sm text-right" required />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" min="0" value={item.discount} onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg text-sm text-right" />
                          </td>
                          <td className="p-2">
                            <select value={item.taxCode} onChange={(e) => updateItem(item.id, 'taxCode', e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                              {TAX_CODES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </td>
                          <td className="p-2 text-right font-medium">
                            FRW {calculateItemTotal(item).toFixed(2)}
                          </td>
                          <td className="p-2">
                            <button type="button" onClick={() => removeItem(item.id)} disabled={formItems.length === 1} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addItem} className="mb-6 text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Add Item</button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold mb-3">Tax Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Total A-Ex (0%):</span><span>FRW {totals.totalAEx.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Total B (18%):</span><span>FRW {totals.totalB18.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tax A:</span><span>FRW {totals.totalTaxA.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tax B:</span><span>FRW {totals.totalTaxB.toFixed(2)}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span><span>FRW {totals.subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Discount:</span><span>-FRW {totals.totalDiscount.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tax:</span><span>FRW {totals.totalTax.toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total:</span><span>FRW {totals.grandTotal.toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold text-lg text-emerald-600"><span>Rounded:</span><span>FRW {totals.roundedAmount.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border rounded-lg text-sm" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Purchase (Draft)
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

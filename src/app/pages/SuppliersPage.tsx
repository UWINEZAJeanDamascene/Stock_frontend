import { useEffect, useState, useRef } from 'react';
import { Layout } from '../layout/Layout';
import { suppliersApi, reportsApi } from '@/lib/api';
import { useNavigate } from 'react-router';
import { Truck, Plus, Search, X, Loader2, FileDown, MoreHorizontal, Eye, Edit, History, Power, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  productsSupplied?: { _id: string; name: string; sku: string }[];
  productsCount?: number;
}

const PAYMENT_TERMS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_7', label: 'Credit 7 Days' },
  { value: 'credit_15', label: 'Credit 15 Days' },
  { value: 'credit_30', label: 'Credit 30 Days' },
  { value: 'credit_45', label: 'Credit 45 Days' },
  { value: 'credit_60', label: 'Credit 60 Days' },
];

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0.00';
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(value);
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedSupplierProducts, setSelectedSupplierProducts] = useState<Supplier | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('cash');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId && !(event.target as Element)?.closest('.actions-menu')) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm, filterStatus]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: '1', limit: '100' };
      
      if (searchTerm.trim()) {
        params.search = searchTerm;
      }
      
      if (filterStatus.trim()) {
        params.isActive = filterStatus;
      }
      
      const response = await suppliersApi.getAll(params);
      if (response.success) {
        const data = response as { data: Supplier[] };
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (supplier?: Supplier) => {
    setOpenMenuId(null);
    if (supplier) {
      setEditingSupplier(supplier);
      setFormName(supplier.name);
      setFormPhone(supplier.contact?.phone || '');
      setFormEmail(supplier.contact?.email || '');
      setFormAddress(supplier.contact?.address || '');
      setFormCity(supplier.contact?.city || '');
      setFormCountry(supplier.contact?.country || '');
      setFormTaxId(supplier.taxId || '');
      setFormPaymentTerms(supplier.paymentTerms || 'cash');
      setFormNotes(supplier.notes || '');
      setFormIsActive(supplier.isActive !== false);
    } else {
      setEditingSupplier(null);
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormCity('');
      setFormCountry('');
      setFormTaxId('');
      setFormPaymentTerms('cash');
      setFormNotes('');
      setFormIsActive(true);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await suppliersApi.delete(id);
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete supplier');
    }
  };

  const handleToggleStatus = async (id: string) => {
    setOpenMenuId(null);
    try {
      await suppliersApi.toggleStatus(id);
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError('Failed to update supplier status');
    }
  };

  const handleViewProfile = (supplier: Supplier) => {
    setOpenMenuId(null);
    navigate(`/suppliers/${supplier._id}`);
  };

  const handleViewSupplyHistory = (supplier: Supplier) => {
    setOpenMenuId(null);
    navigate(`/suppliers/${supplier._id}?tab=history`);
  };

  const handleViewProducts = (supplier: Supplier) => {
    setSelectedSupplierProducts(supplier);
    setShowProductsModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const supplierData = {
      name: formName,
      contact: {
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        country: formCountry,
      },
      taxId: formTaxId,
      paymentTerms: formPaymentTerms,
      notes: formNotes,
      isActive: formIsActive,
    };

    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier._id, supplierData);
      } else {
        await suppliersApi.create(supplierData);
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const blob = type === 'excel' 
        ? await reportsApi.exportExcel('suppliers')
        : await reportsApi.exportPDF('suppliers');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suppliers_export_${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export:', err);
      setError('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLocation = (supplier: Supplier): string => {
    const parts = [];
    if (supplier.contact?.city) parts.push(supplier.contact.city);
    if (supplier.contact?.country) parts.push(supplier.contact.country);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

const canEditSuppliers = hasPermission('suppliers:create') || hasPermission('suppliers:update') || hasPermission('suppliers:delete');

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Suppliers</h1>
            <p className="text-sm text-slate-500 hidden sm:block">Manage supplier relationships</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative group">
              <button 
                disabled={exporting}
                className="flex items-center gap-2 px-3 md:px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export'}</span>
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                >
                  Export to Excel
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                >
                  Export to PDF
                </button>
              </div>
            </div>
            {hasPermission('suppliers:create') && (
              <button onClick={() => openModal()} className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Supplier</span>
              </button>
            )}
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1 min-w-[150px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm" 
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm min-w-[100px]"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500">No suppliers found</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Code</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Phone</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Location</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600">Products</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Last Supply</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600">Total Purchases</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm">{supplier.code || '-'}</td>
                      <td className="p-4 text-sm">
                        <button 
                          onClick={() => handleViewProfile(supplier)}
                          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          {supplier.name || '-'}
                        </button>
                      </td>
                      <td className="p-4 text-sm">{supplier.contact?.email || '-'}</td>
                      <td className="p-4 text-sm">{supplier.contact?.phone || '-'}</td>
                      <td className="p-4 text-sm">{getLocation(supplier)}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleViewProducts(supplier)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs hover:bg-indigo-200 cursor-pointer"
                        >
                          <Package className="h-3 w-3" />
                          {supplier.productsCount || supplier.productsSupplied?.length || 0} products
                        </button>
                      </td>
                      <td className="p-4 text-sm">{formatDate(supplier.lastPurchaseDate)}</td>
                      <td className="p-4 text-right font-medium">{formatCurrency(supplier.totalPurchases)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="relative inline-block actions-menu">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === supplier._id ? null : supplier._id);
                              }}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {openMenuId === supplier._id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-lg shadow-lg z-10 py-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewProfile(supplier);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" /> View Profile
                                </button>
                                {hasPermission('suppliers:update') && (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openModal(supplier);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                                    >
                                      <Edit className="h-4 w-4" /> Edit
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewSupplyHistory(supplier);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                                    >
                                      <History className="h-4 w-4" /> Supply History
                                    </button>
                                    <hr className="my-1" />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStatus(supplier._id);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                                    >
                                      <Power className="h-4 w-4" /> {supplier.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Supplier Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b">
                <h2 className="text-lg font-semibold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full p-2 border rounded-lg" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input type="text" value={formCountry} onChange={(e) => setFormCountry(e.target.value)} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tax ID</label>
                    <input type="text" value={formTaxId} onChange={(e) => setFormTaxId(e.target.value)} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Terms</label>
                    <select value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value)} className="w-full p-2 border rounded-lg">
                      {PAYMENT_TERMS.map(term => <option key={term.value} value={term.value}>{term.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                  <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    {submitting ? 'Saving...' : (editingSupplier ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products Modal */}
        {showProductsModal && selectedSupplierProducts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b">
                <h2 className="text-lg font-semibold">Products Supplied by {selectedSupplierProducts.name}</h2>
                <button onClick={() => setShowProductsModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-4 md:p-6">
                {selectedSupplierProducts.productsSupplied && selectedSupplierProducts.productsSupplied.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSupplierProducts.productsSupplied.map((product) => (
                      <div key={product._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No products linked to this supplier</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

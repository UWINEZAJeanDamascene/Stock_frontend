import { useEffect, useState, useRef } from 'react';
import { Layout } from '../layout/Layout';
import { productsApi, categoriesApi, suppliersApi, reportsApi } from '@/lib/api';
import { Package, Plus, Search, X, Loader2, FileDown, MoreHorizontal, Eye, Edit, Trash2, History } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  category: { _id: string; name: string } | string;
  supplier?: { _id: string; name: string; code: string } | string;
  unit: string;
  currentStock: number;
  lowStockThreshold: number;
  averageCost: number;
  isArchived: boolean;
  isLowStock: boolean;
  updatedAt?: string;
  lastSupplyDate?: string;
  lastSaleDate?: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Supplier {
  _id: string;
  name: string;
  code: string;
}

interface StockMovement {
  _id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  movementDate: string;
}

const UNIT_OPTIONS = ['kg', 'g', 'pcs', 'box', 'm', 'm²', 'm³', 'l', 'ml', 'ton', 'bag', 'roll', 'sheet', 'set'];

function formatNumber(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'.padStart(decimals, '.0');
  }
  if (!isFinite(value)) {
    return '0'.padStart(decimals, '.0');
  }
  return value.toFixed(decimals);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCategoryName(category: Product['category']): string {
  if (!category) return '-';
  if (typeof category === 'string') return '-';
  if (category.name) return category.name;
  return '-';
}

function getSupplierName(supplier: Product['supplier']): string {
  if (!supplier) return '-';
  if (typeof supplier === 'string') return '-';
  if (supplier.name) return supplier.name;
  return '-';
}

function getStatusBadge(product: Product): { label: string; className: string } {
  if (product.isArchived) {
    return { label: 'Archived', className: 'bg-slate-100 text-slate-600' };
  }
  if (product.currentStock === 0) {
    return { label: 'Out of Stock', className: 'bg-red-100 text-red-700' };
  }
  if (product.currentStock <= (product.lowStockThreshold || 10)) {
    return { label: 'Low Stock', className: 'bg-yellow-100 text-yellow-700' };
  }
  return { label: 'In Stock', className: 'bg-green-100 text-green-700' };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formCurrentStock, setFormCurrentStock] = useState(0);
  const [formLowStockThreshold, setFormLowStockThreshold] = useState(10);
  const [formAverageCost, setFormAverageCost] = useState(0);

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
    fetchData();
  }, [searchTerm, filterCategory, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build filters - only include non-empty values
      const params: Record<string, string> = {
        page: '1', 
        limit: '100'
      };
      
      if (searchTerm.trim()) {
        params.search = searchTerm;
      }
      
      if (filterCategory.trim()) {
        params.category = filterCategory;
      }
      
      if (filterStatus.trim()) {
        params.status = filterStatus;
      }
      
      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        productsApi.getAll(params),
        categoriesApi.getAll(),
        suppliersApi.getAll({ limit: 100 })
      ]);
      
      if (productsRes.success) {
        const data = productsRes as { data: Product[] };
        setProducts(data.data || []);
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.data as Category[]);
      }
      if (suppliersRes.success) {
        setSuppliers(suppliersRes.data as Supplier[]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product?: Product) => {
    setOpenMenuId(null);
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormSku(product.sku);
      setFormDescription(product.description || '');
      const catId = typeof product.category === 'object' ? product.category?._id : product.category;
      setFormCategory(catId || '');
      const supId = typeof product.supplier === 'object' ? product.supplier?._id : product.supplier;
      setFormSupplier(supId || '');
      setFormUnit(product.unit || 'pcs');
      setFormCurrentStock(Number(product.currentStock) || 0);
      setFormLowStockThreshold(Number(product.lowStockThreshold) || 10);
      setFormAverageCost(Number(product.averageCost) || 0);
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormSku('');
      setFormDescription('');
      setFormCategory('');
      setFormSupplier('');
      setFormUnit('pcs');
      setFormCurrentStock(0);
      setFormLowStockThreshold(10);
      setFormAverageCost(0);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.delete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete');
    }
  };

  const handleViewHistory = async (productId: string) => {
    setOpenMenuId(null);
    try {
      const historyRes = await productsApi.getLifecycle(productId);
      if (historyRes.success) {
        const data = historyRes as { data: { product: Product; timeline: unknown[] } };
        setSelectedProduct(data.data.product);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleViewProduct = (product: Product) => {
    setOpenMenuId(null);
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const productData = {
      name: formName,
      sku: formSku,
      description: formDescription,
      category: formCategory,
      supplier: formSupplier || undefined,
      unit: formUnit,
      currentStock: formCurrentStock,
      lowStockThreshold: formLowStockThreshold,
      averageCost: formAverageCost,
    };

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct._id, productData);
      } else {
        await productsApi.create(productData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const blob = type === 'excel' 
        ? await reportsApi.exportExcel('products')
        : await reportsApi.exportPDF('products');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
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

  // Get the most recent stock movement date for a product
  const getLastMovementDate = (product: Product): string => {
    const lastSupply = product.lastSupplyDate ? new Date(product.lastSupplyDate) : null;
    const lastSale = product.lastSaleDate ? new Date(product.lastSaleDate) : null;
    const lastUpdated = product.updatedAt ? new Date(product.updatedAt) : null;
    
    const dates = [lastSupply, lastSale, lastUpdated].filter(Boolean) as Date[];
    if (dates.length === 0) return '-';
    
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    return formatDate(latest.toISOString());
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Products</h1>
            <p className="text-slate-500">Manage products</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button 
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <FileDown className="h-5 w-5" />
                {exporting ? 'Exporting...' : 'Export'}
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
            <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="h-5 w-5" /> Add Product
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border" 
            />
          </div>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 rounded-lg border"
          >
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-lg border"
          >
            <option value="">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No products found</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">SKU</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Category</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Supplier</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Unit</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600">Stock</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600">Min Stock</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Last Updated</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((product) => {
                    const status = getStatusBadge(product);
                    return (
                      <tr key={product._id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm">{product.sku || '-'}</td>
                        <td className="p-4 text-sm">
                          <button 
                            onClick={() => handleViewProduct(product)}
                            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            {product.name || '-'}
                          </button>
                        </td>
                        <td className="p-4 text-sm">{getCategoryName(product.category)}</td>
                        <td className="p-4 text-sm">{getSupplierName(product.supplier)}</td>
                        <td className="p-4 text-sm">{product.unit || '-'}</td>
                        <td className="p-4 text-right">{formatNumber(product.currentStock, 0)}</td>
                        <td className="p-4 text-right">{formatNumber(product.lowStockThreshold, 0)}</td>
                        <td className="p-4 text-sm">{getLastMovementDate(product)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="relative inline-block actions-menu">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === product._id ? null : product._id);
                              }}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {openMenuId === product._id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded-lg shadow-lg z-10 py-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewProduct(product);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" /> View Details
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openModal(product);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" /> Edit
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewHistory(product._id);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2"
                                >
                                  <History className="h-4 w-4" /> View History
                                </button>
                                <hr className="my-1" />
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(product._id);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Product Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full p-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU *</label>
                    <input type="text" value={formSku} onChange={(e) => setFormSku(e.target.value.toUpperCase())} className="w-full p-2 border rounded-lg uppercase" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category *</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full p-2 border rounded-lg" required>
                      <option value="">Select category</option>
                      {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier</label>
                    <select value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} className="w-full p-2 border rounded-lg">
                      <option value="">Select supplier</option>
                      {suppliers.map(sup => <option key={sup._id} value={sup._id}>{sup.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit *</label>
                    <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="w-full p-2 border rounded-lg" required>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Average Cost</label>
                    <input type="number" step="0.01" min="0" value={formAverageCost} onChange={(e) => setFormAverageCost(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Stock</label>
                    <input type="number" min="0" value={formCurrentStock} onChange={(e) => setFormCurrentStock(parseInt(e.target.value) || 0)} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                    <input type="number" min="0" value={formLowStockThreshold} onChange={(e) => setFormLowStockThreshold(parseInt(e.target.value) || 10)} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={submitting}>Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Detail Modal */}
        {showDetailModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Product Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Name</label>
                    <p className="text-lg font-medium">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">SKU</label>
                    <p className="text-lg">{selectedProduct.sku}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Category</label>
                    <p>{getCategoryName(selectedProduct.category)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Supplier</label>
                    <p>{getSupplierName(selectedProduct.supplier)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Current Stock</label>
                    <p className="text-2xl font-bold">{formatNumber(selectedProduct.currentStock, 0)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Low Stock Threshold</label>
                    <p className="text-2xl font-bold">{formatNumber(selectedProduct.lowStockThreshold, 0)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Average Cost</label>
                    <p className="text-2xl font-bold">FRW {formatNumber(selectedProduct.averageCost)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Status</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${getStatusBadge(selectedProduct).className}`}>
                      {getStatusBadge(selectedProduct).label}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Last Updated</label>
                    <p>{getLastMovementDate(selectedProduct)}</p>
                  </div>
                </div>
                {selectedProduct.description && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Description</label>
                    <p>{selectedProduct.description}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-4 border-t">
                  <button 
                    onClick={() => { setShowDetailModal(false); openModal(selectedProduct); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" /> Edit Product
                  </button>
                  <button 
                    onClick={() => handleViewHistory(selectedProduct._id)}
                    className="px-4 py-2 border border-slate-300 rounded-lg flex items-center gap-2"
                  >
                    <History className="h-4 w-4" /> View Full History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

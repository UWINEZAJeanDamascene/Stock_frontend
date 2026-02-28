import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { stockApi, productsApi } from '@/lib/api';
import { Plus, Search, X, Loader2 } from 'lucide-react';

interface StockMovement {
  _id: string;
  product: { _id: string; name: string; sku: string };
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference?: string;
  referenceNumber?: string;
  notes?: string;
  // backend uses `movementDate` (also accept older `date` or `createdAt` for compatibility)
  movementDate?: string;
  date?: string;
  createdAt?: string;
  // backend uses `performedBy` (also accept older `createdBy`)
  performedBy?: { name?: string };
  createdBy?: { name?: string };
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
}

export default function StockPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);

  // Form fields
  const [formProduct, setFormProduct] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitCost, setFormUnitCost] = useState(0);
  const [formSupplier, setFormSupplier] = useState('');
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movementsRes, productsRes] = await Promise.all([
        stockApi.getMovements({ type: filterType as 'in' | 'out' | 'adjustment' | undefined, page: 1, limit: 50 }),
        productsApi.getAll({ page: 1, limit: 100 })
      ]);
      
      if (movementsRes.success) {
        const data = movementsRes as { data: StockMovement[] };
        setMovements(data.data || []);
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

  const openModal = (type: 'in' | 'out' | 'adjustment') => {
    setModalType(type);
    setFormProduct('');
    setFormQuantity(1);
    setFormUnitCost(0);
    setFormSupplier('');
    setFormBatchNumber('');
    setFormReference('');
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (movement: StockMovement) => {
    setEditingMovement(movement);
    setModalType(movement.type);
    setFormProduct(movement.product?._id || '');
    setFormQuantity(movement.quantity || 1);
    setFormUnitCost((movement as any).unitCost || 0);
    setFormSupplier((movement as any).supplier?._id || (movement as any).supplier || '');
    setFormBatchNumber((movement as any).batchNumber || '');
    setFormReference(movement.referenceNumber || movement.reference || '');
    setFormNotes(movement.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingMovement) {
        // update metadata only
        await stockApi.updateMovement(editingMovement._id, {
          notes: formNotes,
          referenceNumber: formReference || undefined,
          batchNumber: formBatchNumber || undefined,
          unitCost: formUnitCost || undefined,
          movementDate: undefined
        });
        setEditingMovement(null);
        setShowModal(false);
        fetchData();
        return;
      }
      if (modalType === 'in') {
        await stockApi.receiveStock({
          product: formProduct,
          quantity: formQuantity,
          unitCost: formUnitCost,
          supplier: formSupplier && formSupplier.trim() !== '' ? formSupplier : undefined,
          batchNumber: formBatchNumber || undefined,
          notes: formNotes,
        });
      } else {
        await stockApi.adjustStock({
          product: formProduct,
          quantity: formQuantity,
          type: modalType === 'adjustment' ? 'in' : 'out',
          reason: modalType === 'adjustment' ? 'correction' : 'transfer',
          notes: formNotes,
        });
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Stock In';
      case 'out': return 'Stock Out';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'bg-green-100 text-green-700';
      case 'out': return 'bg-red-100 text-red-700';
      case 'adjustment': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100';
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Stock Movements</h1>
            <p className="text-slate-500">Track stock in, out, and adjustments</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openModal('in')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
              <Plus className="h-5 w-5" /> Stock In
            </button>
            <button onClick={() => openModal('out')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg">
              <Plus className="h-5 w-5" /> Stock Out
            </button>
            <button onClick={() => openModal('adjustment')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
              <Plus className="h-5 w-5" /> Adjustment
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input type="text" placeholder="Search by product name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-lg border" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2.5 rounded-lg border">
            <option value="">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No stock movements found</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Product</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Quantity</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Reference</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Notes</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">By</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((movement) => (
                  <tr key={movement._id} className="hover:bg-slate-50">
                    <td className="p-4 text-sm">
                      {((movement.movementDate || movement.date || movement.createdAt)
                        ? new Date(movement.movementDate || movement.date || movement.createdAt!).toLocaleDateString()
                        : '-')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(movement.type)}`}>
                        {getTypeLabel(movement.type)}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="font-medium">{movement.product?.name || '-'}</div>
                      <div className="text-slate-500 text-xs">{movement.product?.sku || '-'}</div>
                    </td>
                    <td className="p-4 text-sm text-right font-medium">
                      {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                    </td>
                    <td className="p-4 text-sm">{movement.referenceNumber || movement.reference || '-'}</td>
                    <td className="p-4 text-sm text-slate-500 max-w-xs truncate">{movement.notes || '-'}</td>
                    <td className="p-4 text-sm">{movement.performedBy?.name || movement.createdBy?.name || '-'}</td>
                    <td className="p-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(movement)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit movement">
                          Edit
                        </button>
                        <button onClick={async () => {
                          if (!confirm('Delete this stock movement? This will revert the product stock.')) return;
                          try {
                            setActionLoading(movement._id);
                            await stockApi.deleteMovement(movement._id);
                            fetchData();
                          } catch (err) {
                            console.error('Failed to delete movement:', err);
                            setError('Failed to delete movement');
                          } finally {
                            setActionLoading(null);
                          }
                        }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete movement" disabled={actionLoading === movement._id}>
                          {actionLoading === movement._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Delete</span>}
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

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">{getTypeLabel(modalType)}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product *</label>
                  <select value={formProduct} onChange={(e) => setFormProduct(e.target.value)} className="w-full p-2 border rounded-lg" required>
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku}) - Stock: {p.currentStock || 0} {p.unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity *</label>
                    <input type="number" min="1" value={formQuantity} onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)} className="w-full p-2 border rounded-lg" required />
                  </div>
                  {modalType === 'in' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Unit Cost</label>
                      <input type="number" step="0.01" min="0" value={formUnitCost} onChange={(e) => setFormUnitCost(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg" />
                    </div>
                  )}
                </div>
                {modalType === 'in' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch Number</label>
                    <input type="text" value={formBatchNumber} onChange={(e) => setFormBatchNumber(e.target.value)} className="w-full p-2 border rounded-lg" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Reference</label>
                  <input type="text" value={formReference} onChange={(e) => setFormReference(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Invoice #, PO #, etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border rounded-lg" placeholder="Additional details..." />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={submitting}>Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit
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

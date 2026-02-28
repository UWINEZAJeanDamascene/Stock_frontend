import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { categoriesApi } from '@/lib/api';
import { Tags, Plus, Search, Edit, Trash2, X, Loader2 } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.getAll();
      if (response.success) {
        setCategories(response.data as Category[]);
      }
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await categoriesApi.delete(id);
      fetchCategories();
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const categoryData = {
      name: formData.get('name'),
      description: formData.get('description'),
      isActive: formData.get('isActive') === 'on',
    };
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory._id, categoryData);
      } else {
        await categoriesApi.create(categoryData);
      }
      setShowModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
            <p className="text-slate-500">Manage categories</p>
          </div>
          <button onClick={() => { setEditingCategory(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg">
            <Plus className="h-5 w-5" /> Add Category
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-lg border" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No categories</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <div key={category._id} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-indigo-100"><Tags className="h-5 w-5 text-indigo-600" /></div>
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <span className={`text-xs ${category.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCategory(category); setShowModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(category._id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {category.description && <p className="mt-3 text-sm text-slate-500">{category.description}</p>}
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">{editingCategory ? 'Edit' : 'Add'} Category</h2>
                <button onClick={() => { setShowModal(false); setEditingCategory(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input type="text" name="name" defaultValue={editingCategory?.name} className="w-full p-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea name="description" defaultValue={editingCategory?.description} rows={3} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isActive" id="isActive" defaultChecked={editingCategory?.isActive !== false} className="w-4 h-4 rounded border-slate-300" />
                  <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); setEditingCategory(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    {submitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
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

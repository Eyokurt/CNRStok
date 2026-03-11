import { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';

const emptyForm = { name: '', barcode: '', unit_price: '', stock_quantity: '', category: '', critical_level: '10' };

export default function Products() {
  const { dark } = useTheme();
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const load = () => getProducts().then(r => setProducts(r.data));
  useEffect(() => { load(); }, []);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (p) => { setForm({ ...p, unit_price: String(p.unit_price), stock_quantity: String(p.stock_quantity), critical_level: String(p.critical_level) }); setEditingId(p.id); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...form, unit_price: parseFloat(form.unit_price), stock_quantity: parseInt(form.stock_quantity), critical_level: parseInt(form.critical_level) };
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success("Ürün güncellendi");
      } else {
        await createProduct(payload);
        toast.success("Ürün eklendi");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bir hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try { await deleteProduct(id); toast.success('Ürün silindi'); load(); } catch (err) { toast.error('Silinemedi'); }
  };

  const stockBadge = (qty, critical) => {
    if (qty === 0) return <span className="bg-red-500/15 text-red-500 px-2.5 py-1 rounded-full text-xs font-bold">Tükendi</span>;
    if (qty <= critical) return <span className="bg-amber-500/15 text-amber-500 px-2.5 py-1 rounded-full text-xs font-bold">{qty}</span>;
    return <span className="bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full text-xs font-bold">{qty}</span>;
  };

  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-300' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-700'}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Stok Yönetimi</h2>
          <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>{products.length} kayıtlı ürün</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Ara... (İsim veya Barkod)" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`px-4 py-2 rounded-lg border text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary-500
              ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-300' : 'bg-white border-surface-300 text-surface-900'}`} />
          {categories.length > 0 && (
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className={`px-4 py-2 rounded-lg border text-sm focus:outline-none
                ${dark ? 'bg-surface-800 border-surface-700 text-white' : 'bg-white border-surface-300 text-surface-900'}`}>
              <option value="">Tüm Kategoriler</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button onClick={openNew}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-600/25">
            + Yeni Ürün
          </button>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${dark ? 'border-surface-700 bg-surface-800/50 text-surface-300' : 'border-surface-200 bg-surface-50 text-surface-600'}`}>
                <th className="text-left py-3 px-4 font-medium">Ürün Adı</th>
                <th className="text-left py-3 px-4 font-medium">Barkod</th>
                <th className="text-left py-3 px-4 font-medium">Kategori</th>
                <th className="text-right py-3 px-4 font-medium">Birim Fiyat</th>
                <th className="text-center py-3 px-4 font-medium">Stok</th>
                <th className="text-center py-3 px-4 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b transition-colors
                  ${dark ? 'border-surface-800 hover:bg-surface-800/50' : 'border-surface-100 hover:bg-surface-50'}`}>
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4 font-mono text-xs">{p.barcode || '—'}</td>
                  <td className="py-3 px-4">{p.category || '—'}</td>
                  <td className="py-3 px-4 text-right">₺{p.unit_price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center">{stockBadge(p.stock_quantity, p.critical_level)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-primary-400 hover:bg-primary-500/10 transition-colors" title="Düzenle">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors" title="Sil">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className={`py-8 text-center ${dark ? 'text-surface-300' : 'text-surface-700'}`}>Ürün bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl ${dark ? 'bg-surface-900 text-white' : 'bg-white text-surface-900'}`}>
            <h3 className="text-lg font-bold mb-5">{editingId ? 'Ürün Düzenle' : 'Yeni Ürün'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Ürün Adı *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Barkod</label>
                  <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Kategori</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Birim Fiyat (₺) *</label>
                  <input required type="number" step="0.01" min="0" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Stok Adedi *</label>
                  <input required type="number" min="0" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Kritik Seviye</label>
                  <input type="number" min="0" value={form.critical_level} onChange={e => setForm({ ...form, critical_level: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-200 hover:bg-surface-300 text-surface-700'}`}>
                  İptal
                </button>
                <button type="submit" className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

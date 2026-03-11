import { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';

const emptyForm = { business_name: '', tax_office: '', tax_number: '', phone: '', address: '', plate_number: '' };

export default function Customers() {
  const { dark } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = () => getCustomers().then(r => setCustomers(r.data));
  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.plate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (c) => { setForm({ ...c }); setEditingId(c.id); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        toast.success("Müşteri güncellendi");
      } else {
        await createCustomer(form);
        toast.success("Müşteri oluşturuldu");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bir hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
    try {
      await deleteCustomer(id);
      toast.success('Müşteri silindi');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Silinemedi');
    }
  };

  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-300' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-700'}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Müşteriler</h2>
          <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>{customers.length} kayıtlı müşteri</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ara... (İsim veya Plaka)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`px-4 py-2 rounded-lg border text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500
              ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-300' : 'bg-white border-surface-300 text-surface-900'}`}
          />
          <button onClick={openNew}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-600/25">
            + Yeni Müşteri
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden transition-colors
        ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${dark ? 'border-surface-700 bg-surface-800/50 text-surface-300' : 'border-surface-200 bg-surface-50 text-surface-600'}`}>
                <th className="text-left py-3 px-4 font-medium">İşyeri Adı</th>
                <th className="text-left py-3 px-4 font-medium">Plaka</th>
                <th className="text-left py-3 px-4 font-medium">Telefon</th>
                <th className="text-left py-3 px-4 font-medium">Vergi No</th>
                <th className="text-center py-3 px-4 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={`border-b transition-colors
                  ${dark ? 'border-surface-800 hover:bg-surface-800/50' : 'border-surface-100 hover:bg-surface-50'}`}>
                  <td className="py-3 px-4 font-medium">{c.business_name}</td>
                  <td className="py-3 px-4">
                    <span className="bg-primary-500/15 text-primary-400 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider">
                      {c.plate_number}
                    </span>
                  </td>
                  <td className="py-3 px-4">{c.phone || '—'}</td>
                  <td className="py-3 px-4">{c.tax_number || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-primary-400 hover:bg-primary-500/10 transition-colors" title="Düzenle">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors" title="Sil">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="5" className={`py-8 text-center ${dark ? 'text-surface-300' : 'text-surface-700'}`}>Müşteri bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl transition-colors
            ${dark ? 'bg-surface-900 text-white' : 'bg-white text-surface-900'}`}>
            <h3 className="text-lg font-bold mb-5">{editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5 opacity-70">İşyeri Adı *</label>
                  <input required value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Plaka *</label>
                  <input required value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} className={inputCls} placeholder="34 ABC 123" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Telefon</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Vergi Dairesi</label>
                  <input value={form.tax_office} onChange={e => setForm({ ...form, tax_office: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Vergi No</label>
                  <input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Adres</label>
                  <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors
                    ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-200 hover:bg-surface-300 text-surface-700'}`}>
                  İptal
                </button>
                <button type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
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

import { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';

const emptyForm = { business_name: '', tax_office: '', tax_number: '', phone: '', address: '', plate_number: '' };

export default function Customers() {
  const { dark } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const load = () => {
    setLoading(true);
    getCustomers()
      .then(r => setCustomers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.plate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (c) => { setForm({ ...c }); setEditingId(c.id); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Lutfen formdaki hatalari duzeltin");
      return;
    }
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        toast.success("Musteri guncellendi");
      } else {
        await createCustomer(form);
        toast.success("Musteri olusturuldu");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bir hata olustu');
    }
  };

  const handleDeleteTrigger = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteCustomer(deleteConfirmId);
      toast.success('Musteri silindi');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Silinemedi');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Client side validation logic
  const validationErrors = {};
  if (form.plate_number) {
    const cleaned = form.plate_number.replace(/[^A-Za-z0-9]/g, '');
    if (cleaned.length < 5 || cleaned.length > 10) {
      validationErrors.plate_number = 'Plaka 5 ila 10 karakter olmalidir';
    } else if (!(/[A-Za-z]/.test(cleaned) && /[0-9]/.test(cleaned))) {
      validationErrors.plate_number = 'Plaka hem harf hem de rakam icermelidir';
    }
  }
  if (form.phone) {
    const cleaned = form.phone.replace(/\D/g, '');
    if (cleaned.length !== 10 && cleaned.length !== 11) {
      validationErrors.phone = 'Telefon 10 veya 11 haneli olmalidir (Ornek: 05551234567)';
    }
  }
  if (form.tax_number) {
    const cleaned = form.tax_number.replace(/\D/g, '');
    if (cleaned.length !== 10 && cleaned.length !== 11) {
      validationErrors.tax_number = 'Vergi no 10 (VKN) veya 11 (TCKN) haneli olmalidir';
    }
  }

  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-400' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-500'}`;

  const inputErrCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 border-red-500 bg-red-500/5`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Musteriler</h2>
          <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>{customers.length} kayitli musteri</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ara... (Isim veya Plaka)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`px-4 py-2 rounded-lg border text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all
              ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-400' : 'bg-white border-surface-300 text-surface-900'}`}
          />
          <button onClick={openNew}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-primary-600/25">
            + Yeni Musteri
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden transition-all duration-300
        ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${dark ? 'border-surface-700 bg-surface-800/50 text-surface-300' : 'border-surface-200 bg-surface-50 text-surface-600'}`}>
                <th className="text-left py-3.5 px-4 font-semibold">Isyeri Adi</th>
                <th className="text-left py-3.5 px-4 font-semibold">Plaka</th>
                <th className="text-left py-3.5 px-4 font-semibold">Telefon</th>
                <th className="text-left py-3.5 px-4 font-semibold">Vergi No</th>
                <th className="text-center py-3.5 px-4 font-semibold">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={`border-b ${dark ? 'border-surface-800' : 'border-surface-100'} animate-skeleton-pulse`}>
                    <td className="py-4 px-4"><div className={`h-4 w-40 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                    <td className="py-4 px-4"><div className={`h-6 w-20 rounded-md ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                    <td className="py-4 px-4"><div className={`h-4 w-28 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                    <td className="py-4 px-4"><div className={`h-4 w-24 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                    <td className="py-4 px-4"><div className={`h-8 w-16 mx-auto rounded-md ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                  </tr>
                ))
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className={`border-b transition-colors duration-200
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
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-primary-400 hover:bg-primary-500/10 transition-colors" title="Duzenle">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteTrigger(c.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors" title="Sil">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="5" className={`py-12 text-center text-sm ${dark ? 'text-surface-400' : 'text-surface-500'}`}>Musteri bulunamadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-scale-in border
            ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
            <h3 className="text-lg font-bold mb-5">{editingId ? 'Musteri Duzenle' : 'Yeni Musteri'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Isyeri Adi *</label>
                  <input required value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} className={inputCls} placeholder="Musteri ya da firma unvani" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Plaka *</label>
                  <input required value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} className={validationErrors.plate_number ? inputErrCls : inputCls} placeholder="34ABC123" />
                  {validationErrors.plate_number && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.plate_number}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Telefon</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={validationErrors.phone ? inputErrCls : inputCls} placeholder="05XXXXXXXXX" />
                  {validationErrors.phone && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.phone}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Vergi Dairesi</label>
                  <input value={form.tax_office} onChange={e => setForm({ ...form, tax_office: e.target.value })} className={inputCls} placeholder="Vergi Dairesi" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Vergi No</label>
                  <input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} className={validationErrors.tax_number ? inputErrCls : inputCls} placeholder="VKN veya TCKN" />
                  {validationErrors.tax_number && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.tax_number}</span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Adres</label>
                  <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className={inputCls} placeholder="Musteri adres bilgisi" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-surface-800 border-surface-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-100 hover:bg-surface-200 text-surface-700'}`}>
                  Iptal
                </button>
                <button type="submit"
                  disabled={Object.keys(validationErrors).length > 0}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg
                    ${Object.keys(validationErrors).length > 0
                      ? 'bg-surface-700 text-surface-400 cursor-not-allowed shadow-none'
                      : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/25 hover:shadow-primary-600/40'}`}>
                  {editingId ? 'Guncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-scale-in border
            ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-bold">Musteriyi Sil</h3>
            </div>
            <p className={`text-sm mb-6 ${dark ? 'text-surface-300' : 'text-surface-600'}`}>
              Bu musteriyi silmek istediginize emin misiniz? Bu islem geri alinamaz ve musteriye bagli faturalar etkilenebilir.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-100 hover:bg-surface-200 text-surface-700'}`}>
                Vazgec
              </button>
              <button type="button" onClick={confirmDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 transition-all">
                Musteriyi Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, getProductHistory } from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';

const emptyForm = { name: '', barcode: '', unit_price: '', stock_quantity: '', category: '', critical_level: '10', storage_location: '' };

export default function Products() {
  const { dark } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Ürün Detay ve Analiz State'leri
  const [activeTab, setActiveTab] = useState('list'); // 'list' veya 'locations'
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [productHistory, setProductHistory] = useState([]);
  const [chartType, setChartType] = useState('sales'); // 'sales' veya 'stock'
  const [hoveredData, setHoveredData] = useState(null);

  const handleRowClick = async (product) => {
    setDetailsProduct(product);
    setProductHistory([]);
    setHistoryLoading(true);
    setChartType('sales');
    setHoveredData(null);
    setShowDetailsModal(true);
    try {
      const res = await getProductHistory(product.id);
      setProductHistory(res.data.history || []);
    } catch (err) {
      toast.error('Ürün analiz geçmişi yüklenemedi');
    } finally {
      setHistoryLoading(false);
    }
  };

  const load = () => {
    setLoading(true);
    getProducts()
      .then(r => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (p) => {
    setForm({
      name: p.name || '',
      barcode: p.barcode || '',
      unit_price: String(p.unit_price),
      stock_quantity: String(p.stock_quantity),
      category: p.category || '',
      critical_level: String(p.critical_level),
      storage_location: p.storage_location || ''
    });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Lutfen formdaki hatalari duzeltin");
      return;
    }
    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      unit_price: parseFloat(form.unit_price) || 0.0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      category: form.category.trim() || null,
      critical_level: parseInt(form.critical_level) || 0,
      storage_location: form.storage_location.trim() || null
    };
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success("Urun guncellendi");
      } else {
        await createProduct(payload);
        toast.success("Urun eklendi");
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
      await deleteProduct(deleteConfirmId);
      toast.success('Urun silindi');
      load();
    } catch (err) {
      toast.error('Silinemedi');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Client side validation logic
  const validationErrors = {};
  if (form.unit_price) {
    const val = parseFloat(form.unit_price);
    if (isNaN(val) || val < 0) {
      validationErrors.unit_price = 'Birim fiyat negatif olamaz';
    }
  }
  if (form.stock_quantity) {
    const val = parseInt(form.stock_quantity);
    if (isNaN(val) || val < 0) {
      validationErrors.stock_quantity = 'Stok adedi negatif olamaz';
    }
  }
  if (form.critical_level) {
    const val = parseInt(form.critical_level);
    if (isNaN(val) || val < 0) {
      validationErrors.critical_level = 'Kritik seviye negatif olamaz';
    }
  }

  const stockBadge = (qty, critical) => {
    if (qty === 0) return <span className="bg-red-500/15 text-red-500 px-2.5 py-1 rounded-full text-xs font-bold">Tukendi</span>;
    if (qty <= critical) return <span className="bg-amber-500/15 text-amber-500 px-2.5 py-1 rounded-full text-xs font-bold">{qty}</span>;
    return <span className="bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full text-xs font-bold">{qty}</span>;
  };

  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-400' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-500'}`;

  const inputErrCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 border-red-500 bg-red-500/5`;

  // Konum bazlı gruplama hesaplamaları
  const groupedByLocation = products.reduce((acc, p) => {
    const loc = p.storage_location || 'Konum Belirtilmemiş';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(p);
    return acc;
  }, {});

  const sortedLocations = Object.keys(groupedByLocation).sort((a, b) => {
    if (a === 'Konum Belirtilmemiş') return 1;
    if (b === 'Konum Belirtilmemiş') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Stok Yonetimi</h2>
          <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>{products.length} kayitli urun</p>
        </div>
        <button onClick={openNew}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-primary-600/25">
          + Yeni Urun
        </button>
      </div>

      {/* Sekmeler */}
      <div className={`flex border-b ${dark ? 'border-surface-800' : 'border-surface-200'}`}>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[2px] cursor-pointer
            ${activeTab === 'list'
              ? 'border-primary-600 text-primary-500 font-bold'
              : `border-transparent text-surface-500 ${dark ? 'hover:text-white' : 'hover:text-surface-900'}`}`}
        >
          Ürün Listesi
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[2px] cursor-pointer
            ${activeTab === 'locations'
              ? 'border-primary-600 text-primary-500 font-bold'
              : `border-transparent text-surface-500 ${dark ? 'hover:text-white' : 'hover:text-surface-900'}`}`}
        >
          Konum Bazlı Dağılım
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="flex gap-3 flex-wrap justify-end">
            <input type="text" placeholder="Ara... (Isim veya Barkod)" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`px-4 py-2 rounded-lg border text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all
                ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-400' : 'bg-white border-surface-300 text-surface-900'}`} />
            {categories.length > 0 && (
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className={`px-4 py-2 rounded-lg border text-sm focus:outline-none transition-all
                  ${dark ? 'bg-surface-800 border-surface-700 text-white' : 'bg-white border-surface-300 text-surface-900'}`}>
                <option value="">Tum Kategoriler</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${dark ? 'border-surface-700 bg-surface-800/50 text-surface-300' : 'border-surface-200 bg-surface-50 text-surface-600'}`}>
                    <th className="text-left py-3.5 px-4 font-semibold">Urun Adi</th>
                    <th className="text-left py-3.5 px-4 font-semibold">Barkod</th>
                    <th className="text-left py-3.5 px-4 font-semibold">Kategori</th>
                    <th className="text-right py-3.5 px-4 font-semibold">Birim Fiyat</th>
                    <th className="text-center py-3.5 px-4 font-semibold">Stok</th>
                    <th className="text-center py-3.5 px-4 font-semibold">Islemler</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className={`border-b ${dark ? 'border-surface-800' : 'border-surface-100'} animate-skeleton-pulse`}>
                        <td className="py-4 px-4"><div className={`h-4 w-48 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                        <td className="py-4 px-4"><div className={`h-4 w-20 rounded font-mono ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                        <td className="py-4 px-4"><div className={`h-4 w-24 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                        <td className="py-4 px-4"><div className={`h-4 w-16 ml-auto rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                        <td className="py-4 px-4"><div className={`h-6 w-16 mx-auto rounded-full ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                        <td className="py-4 px-4"><div className={`h-8 w-16 mx-auto rounded-md ${dark ? 'bg-surface-800' : 'bg-surface-200'}`}></div></td>
                      </tr>
                    ))
                  ) : (
                    filtered.map(p => (
                      <tr key={p.id}
                        onClick={() => handleRowClick(p)}
                        className={`border-b transition-colors duration-200 cursor-pointer
                          ${dark ? 'border-surface-800 hover:bg-surface-800/40' : 'border-surface-100 hover:bg-surface-50'}`}>
                        <td className="py-3 px-4 font-medium">{p.name}</td>
                        <td className="py-3 px-4 font-mono text-xs">{p.barcode || '—'}</td>
                        <td className="py-3 px-4">{p.category || '—'}</td>
                        <td className="py-3 px-4 text-right">₺{p.unit_price.toFixed(2)} TL</td>
                        <td className="py-3 px-4 text-center">{stockBadge(p.stock_quantity, p.critical_level)}</td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1.5 rounded-md text-primary-400 hover:bg-primary-500/10 transition-colors" title="Duzenle">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTrigger(p.id); }} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors" title="Sil">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan="6" className={`py-12 text-center text-sm ${dark ? 'text-surface-400' : 'text-surface-500'}`}>Urun bulunamadi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sortedLocations.map(loc => {
            const items = groupedByLocation[loc];
            return (
              <div key={loc} className={`rounded-xl border overflow-hidden transition-all duration-300
                ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
                
                {/* Header */}
                <div className={`px-5 py-3.5 flex items-center justify-between border-b
                  ${dark ? 'bg-surface-850 border-surface-800' : 'bg-surface-50 border-surface-200'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm
                      ${loc === 'Konum Belirtilmemiş'
                        ? (dark ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-500')
                        : 'bg-primary-600/10 text-primary-500 border border-primary-500/20'}`}>
                      {loc}
                    </span>
                    <span className={`text-xs ${dark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {items.length} Farklı Ürün
                    </span>
                  </div>
                </div>

                {/* Content Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b text-[11px] uppercase tracking-wider ${dark ? 'border-surface-800 text-surface-400' : 'border-surface-150 text-surface-500'}`}>
                        <th className="text-left py-2.5 px-5 font-semibold">Ürün Adı</th>
                        <th className="text-left py-2.5 px-5 font-semibold">Barkod</th>
                        <th className="text-left py-2.5 px-5 font-semibold">Kategori</th>
                        <th className="text-right py-2.5 px-5 font-semibold">Birim Fiyat</th>
                        <th className="text-center py-2.5 px-5 font-semibold">Stok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(p => (
                        <tr
                          key={p.id}
                          onClick={() => handleRowClick(p)}
                          className={`border-b transition-colors duration-150 cursor-pointer
                            ${dark ? 'border-surface-800/60 hover:bg-surface-800/40' : 'border-surface-100 hover:bg-surface-50'}`}
                        >
                          <td className="py-2.5 px-5 font-medium">{p.name}</td>
                          <td className="py-2.5 px-5 font-mono text-xs">{p.barcode || '—'}</td>
                          <td className="py-2.5 px-5">{p.category || '—'}</td>
                          <td className="py-2.5 px-5 text-right">₺{p.unit_price.toFixed(2)} TL</td>
                          <td className="py-2.5 px-5 text-center">{stockBadge(p.stock_quantity, p.critical_level)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-scale-in border
            ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
            <h3 className="text-lg font-bold mb-5">{editingId ? 'Urun Duzenle' : 'Yeni Urun'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Urun Adi *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Urun veya hizmet adi" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Barkod</label>
                  <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className={inputCls} placeholder="Barkod numarasi" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Kategori</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls} placeholder="Kategori" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Birim Fiyat (TL) *</label>
                  <input required type="number" step="0.01" min="0" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} className={validationErrors.unit_price ? inputErrCls : inputCls} placeholder="0.00" />
                  {validationErrors.unit_price && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.unit_price}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Stok Adedi *</label>
                  <input required type="number" min="0" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className={validationErrors.stock_quantity ? inputErrCls : inputCls} placeholder="0" />
                  {validationErrors.stock_quantity && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.stock_quantity}</span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Kritik Seviye (Stok bu seviyenin altina indiginde uyari verilir) *</label>
                  <input type="number" min="0" value={form.critical_level} onChange={e => setForm({ ...form, critical_level: e.target.value })} className={validationErrors.critical_level ? inputErrCls : inputCls} placeholder="10" />
                  {validationErrors.critical_level && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.critical_level}</span>
                  )}
                </div>
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Stok Konumu (Raf, Kat vb.)</label>
                  <input
                    value={form.storage_location || ''}
                    onChange={e => {
                      setForm({ ...form, storage_location: e.target.value });
                      setShowLocSuggestions(true);
                    }}
                    onFocus={() => setShowLocSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowLocSuggestions(false), 200);
                    }}
                    className={inputCls}
                    placeholder="Örn: Raf 3, Kat 2"
                  />
                  {showLocSuggestions && (() => {
                    const existingLocations = [...new Set(products.map(p => p.storage_location).filter(Boolean))];
                    const filteredLocations = existingLocations.filter(loc => 
                      loc.toLowerCase().includes((form.storage_location || '').toLowerCase()) && 
                      loc.toLowerCase() !== (form.storage_location || '').toLowerCase()
                    );
                    if (filteredLocations.length === 0) return null;
                    return (
                      <div className={`absolute z-30 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border shadow-lg text-sm
                        ${dark ? 'bg-surface-800 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
                        {filteredLocations.map(loc => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, storage_location: loc });
                              setShowLocSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-primary-500/10 transition-colors cursor-pointer block"
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
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
              <h3 className="text-lg font-bold">Urunu Sil</h3>
            </div>
            <p className={`text-sm mb-6 ${dark ? 'text-surface-300' : 'text-surface-600'}`}>
              Bu urunu silmek istediginize emin misiniz? Bu islem geri alinamaz ve fatura kalemlerindeki gecmis veriler etkilenebilir.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-100 hover:bg-surface-200 text-surface-700'}`}>
                Vazgec
              </button>
              <button type="button" onClick={confirmDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 transition-all">
                Urunu Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Detay ve Analiz Popup Modalı */}
      {showDetailsModal && detailsProduct && (() => {
        const maxVal = Math.max(...productHistory.map(d => chartType === 'sales' ? d.sales : d.stock), 5);
        const N = productHistory.length || 24;
        const getX = (idx) => 40 + (idx / (N - 1)) * 405;
        const getY = (val) => 15 + 160 - (val / maxVal) * 160;

        const points = productHistory.map((d, idx) => {
          const val = chartType === 'sales' ? d.sales : d.stock;
          return `${getX(idx)},${getY(val)}`;
        });
        const areaD = productHistory.length > 0 ? `M ${getX(0)},175 L ${points.join(' L ')} L ${getX(N - 1)},175 Z` : '';
        const lineD = productHistory.length > 0 ? `M ${points.join(' L ')}` : '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-4xl mx-4 rounded-2xl shadow-2xl transition-all duration-300 animate-scale-in border overflow-hidden
              ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
              
              {/* Modal Header */}
              <div className={`px-6 py-4 flex items-center justify-between border-b ${dark ? 'border-surface-800 bg-surface-950/30' : 'border-surface-100 bg-surface-50/50'}`}>
                <div>
                  <h3 className="text-lg font-bold">Ürün Analizi & Detayları</h3>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-surface-400' : 'text-surface-500'}`}>Son 2 yıla ait stok ve satış hareketleri</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)}
                  className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-surface-800 text-surface-400 hover:text-white' : 'hover:bg-surface-150 text-surface-500 hover:text-surface-900'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Sol Sütun: Ürün Bilgileri */}
                <div className="md:col-span-5 space-y-4">
                  <div className={`p-4 rounded-xl border ${dark ? 'bg-surface-800/30 border-surface-800' : 'bg-surface-50/50 border-surface-100'}`}>
                    <h4 className="text-sm font-bold text-primary-500 mb-3">Genel Bilgiler</h4>
                    <div className="space-y-3.5">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Ürün Adı</span>
                        <span className="text-base font-semibold block">{detailsProduct.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Barkod</span>
                          <span className="text-sm font-mono block truncate" title={detailsProduct.barcode || '—'}>
                            {detailsProduct.barcode ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${dark ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'}`}>
                                {detailsProduct.barcode}
                              </span>
                            ) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Kategori</span>
                          <span className="text-sm font-medium block truncate" title={detailsProduct.category || '—'}>
                            {detailsProduct.category ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${dark ? 'bg-surface-800 text-surface-300' : 'bg-surface-100 text-surface-700'}`}>
                                {detailsProduct.category}
                              </span>
                            ) : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Stok Konumu</span>
                        <span className="text-sm font-semibold block">
                          {detailsProduct.storage_location ? (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-600/10 text-primary-500 border border-primary-500/20">
                              {detailsProduct.storage_location}
                            </span>
                          ) : (
                            <span className="text-surface-400 dark:text-surface-500 text-xs italic">Belirtilmemiş</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${dark ? 'bg-surface-800/30 border-surface-800' : 'bg-surface-50/50 border-surface-100'}`}>
                    <h4 className="text-sm font-bold text-primary-500 mb-3">Fiyat ve Stok Durumu</h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Birim Satış Fiyatı</span>
                        <span className="text-lg font-bold text-emerald-500 font-mono">₺{detailsProduct.unit_price.toFixed(2)} <span className="text-xs font-normal">TL</span></span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Mevcut Stok</span>
                        <div className="mt-1">{stockBadge(detailsProduct.stock_quantity, detailsProduct.critical_level)}</div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Kritik Stok Seviyesi</span>
                        <span className="text-sm font-bold font-mono">{detailsProduct.critical_level} Adet</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Kayıt Tarihi</span>
                        <span className="text-sm font-medium">
                          {detailsProduct.created_at ? new Date(detailsProduct.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sağ Sütun: Grafik ve Analiz */}
                <div className="md:col-span-7 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h4 className="text-sm font-bold text-primary-500">2 Yıllık Değişim Analizi</h4>
                    
                    {/* Sekme Seçiciler */}
                    <div className={`flex rounded-lg p-0.5 border text-xs font-semibold ${dark ? 'bg-surface-950 border-surface-800' : 'bg-surface-100 border-surface-200'}`}>
                      <button
                        onClick={() => { setChartType('sales'); setHoveredData(null); }}
                        className={`px-3 py-1.5 rounded-md transition-all duration-200 ${chartType === 'sales'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : `text-surface-500 ${dark ? 'hover:text-white' : 'hover:text-surface-900'}`}`}
                      >
                        Satış Adetleri
                      </button>
                      <button
                        onClick={() => { setChartType('stock'); setHoveredData(null); }}
                        className={`px-3 py-1.5 rounded-md transition-all duration-200 ${chartType === 'stock'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : `text-surface-500 ${dark ? 'hover:text-white' : 'hover:text-surface-900'}`}`}
                      >
                        Stok Seviyesi (Tahmini)
                      </button>
                    </div>
                  </div>

                  {/* Grafik Alanı */}
                  <div className={`relative flex-1 min-h-[220px] rounded-xl border p-4 flex items-center justify-center
                    ${dark ? 'bg-surface-950/20 border-surface-800' : 'bg-surface-50/20 border-surface-150'}`}>
                    {historyLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin"></div>
                        <span className={`text-xs ${dark ? 'text-surface-400' : 'text-surface-500'}`}>Analiz verileri yükleniyor...</span>
                      </div>
                    ) : productHistory.length === 0 ? (
                      <span className={`text-xs ${dark ? 'text-surface-400' : 'text-surface-500'}`}>Analiz verisi bulunamadı</span>
                    ) : (
                      <div className="w-full h-full flex flex-col relative select-none">
                        {/* SVG Çizimi */}
                        <div className="flex-1 w-full relative">
                          <svg viewBox="0 0 460 200" className="w-full h-full overflow-visible">
                            {/* SVG Defs */}
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={dark ? 0.35 : 0.2} />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>

                            {/* Izgara Çizgileri ve Y Eksen Değerleri */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                              const y = 15 + ratio * 160;
                              const gridVal = Math.round(maxVal * (1 - ratio));
                              return (
                                <g key={i} className="opacity-45">
                                  <line
                                    x1={40}
                                    y1={y}
                                    x2={445}
                                    y2={y}
                                    stroke={dark ? '#334155' : '#e2e8f0'}
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                  />
                                  <text
                                    x={32}
                                    y={y + 3.5}
                                    textAnchor="end"
                                    className={`text-[9px] font-mono font-semibold ${dark ? 'fill-surface-400' : 'fill-surface-500'}`}
                                  >
                                    {gridVal}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Dolgu Alanı */}
                            {areaD && (
                              <path
                                d={areaD}
                                fill="url(#chartGradient)"
                              />
                            )}

                            {/* Çizgi Yolu */}
                            {lineD && (
                              <path
                                d={lineD}
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* X Ekseni Etiketleri */}
                            {productHistory.map((d, idx) => {
                              if (idx % 4 !== 0 && idx !== N - 1) return null;
                              const x = getX(idx);
                              return (
                                <g key={idx} className="opacity-70">
                                  <line
                                    x1={x}
                                    y1={175}
                                    x2={x}
                                    y2={180}
                                    stroke={dark ? '#475569' : '#cbd5e1'}
                                    strokeWidth={1}
                                  />
                                  <text
                                    x={x}
                                    y={193}
                                    textAnchor="middle"
                                    className={`text-[9px] font-semibold ${dark ? 'fill-surface-400' : 'fill-surface-500'}`}
                                  >
                                    {d.label}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Hover Kılavuz Çizgisi */}
                            {hoveredData && (
                              <line
                                x1={hoveredData.x}
                                y1={15}
                                x2={hoveredData.x}
                                y2={175}
                                stroke={dark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.25)'}
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                              />
                            )}

                            {/* Hover Noktaları */}
                            {hoveredData && (
                              <>
                                <circle
                                  cx={hoveredData.x}
                                  cy={hoveredData.y}
                                  r={6.5}
                                  fill="#6366f1"
                                  className="animate-ping opacity-60"
                                />
                                <circle
                                  cx={hoveredData.x}
                                  cy={hoveredData.y}
                                  r={4.5}
                                  fill="#6366f1"
                                  stroke={dark ? '#0f172a' : '#ffffff'}
                                  strokeWidth={1.5}
                                />
                              </>
                            )}

                            {/* Hover Etkileşim Kutuları */}
                            {productHistory.map((d, idx) => {
                              const x = getX(idx);
                              const colWidth = 405 / (N - 1);
                              const val = chartType === 'sales' ? d.sales : d.stock;
                              return (
                                <rect
                                  key={idx}
                                  x={x - colWidth / 2}
                                  y={15}
                                  width={colWidth}
                                  height={160}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredData({ ...d, x, y: getY(val) })}
                                  onMouseLeave={() => setHoveredData(null)}
                                />
                              );
                            })}
                          </svg>

                          {/* HTML Tooltip Kutusu */}
                          {hoveredData && (
                            <div
                              className="absolute z-10 p-2.5 rounded-lg shadow-xl text-xs border transition-all duration-100 pointer-events-none"
                              style={{
                                left: `${(hoveredData.x / 460) * 100}%`,
                                top: `${(hoveredData.y / 200) * 100 - 32}%`,
                                transform: hoveredData.x > 300 ? 'translate(-108%, -50%)' : 'translate(8%, -50%)',
                                backgroundColor: dark ? '#1e293b' : '#ffffff',
                                borderColor: dark ? '#334155' : '#e2e8f0',
                                color: dark ? '#f8fafc' : '#0f172a',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              <div className="font-bold opacity-75">{hoveredData.label} {hoveredData.year}</div>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                <span className="font-semibold whitespace-nowrap">
                                  {chartType === 'sales' ? 'Satış:' : 'Stok:'} {chartType === 'sales' ? hoveredData.sales : hoveredData.stock} Adet
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className={`px-6 py-4 flex justify-end border-t ${dark ? 'border-surface-800 bg-surface-950/20' : 'border-surface-100 bg-surface-50/50'}`}>
                <button onClick={() => setShowDetailsModal(false)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors
                    ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-100 hover:bg-surface-200 text-surface-700'}`}>
                  Kapat
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

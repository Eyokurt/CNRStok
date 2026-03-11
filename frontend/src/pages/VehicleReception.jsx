import { useState, useEffect, useRef } from 'react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, uploadVehiclePhotos, deleteVehiclePhoto } from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';

export default function VehicleReception() {
  const { dark } = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);

  const emptyForm = {
    plate_number: '', owner_name: '', owner_phone: '', vehicle_brand: '',
    vehicle_model: '', vehicle_year: '', vehicle_color: '', km_reading: '',
    complaints: '', diagnosis: '', notes: ''
  };
  const [form, setForm] = useState(emptyForm);

  const fetchVehicles = async () => {
    try {
      const res = await getVehicles(null, search || null);
      setVehicles(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, [search]);

  const inShop = vehicles.filter(v => v.status === 'in_shop');
  const delivered = vehicles.filter(v => v.status === 'delivered');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.plate_number.trim()) return;
    const payload = {
      ...form,
      plate_number: form.plate_number.toUpperCase().trim(),
      vehicle_year: form.vehicle_year ? parseInt(form.vehicle_year) : null,
      km_reading: form.km_reading ? parseInt(form.km_reading) : null,
    };
    try {
      if (editingId) {
        await updateVehicle(editingId, payload);
        toast.success("Araç bilgisi güncellendi");
      } else {
        await createVehicle(payload);
        toast.success("Araç kaydı oluşturuldu");
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata olustu');
    }
  };

  const handleEdit = (v) => {
    setForm({
      plate_number: v.plate_number || '', owner_name: v.owner_name || '',
      owner_phone: v.owner_phone || '', vehicle_brand: v.vehicle_brand || '',
      vehicle_model: v.vehicle_model || '', vehicle_year: v.vehicle_year || '',
      vehicle_color: v.vehicle_color || '', km_reading: v.km_reading || '',
      complaints: v.complaints || '', diagnosis: v.diagnosis || '', notes: v.notes || ''
    });
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Bu arac kaydini silmek istediginize emin misiniz?');
    if (!confirmed) return;
    await deleteVehicle(id);
    toast.success("Araç silindi");
    fetchVehicles();
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateVehicle(id, { status: newStatus });
    fetchVehicles();
  };

  const handlePhotoUpload = async (receptionId, files) => {
    if (!files.length) return;
    setUploadingId(receptionId);
    try {
      await uploadVehiclePhotos(receptionId, Array.from(files));
      toast.success("Fotoğraflar yüklendi");
      fetchVehicles();
    } catch { toast.error('Fotograf yuklenemedi'); }
    setUploadingId(null);
  };

  const handlePhotoDelete = async (receptionId, photoId) => {
    const confirmed = window.confirm('Fotografi silmek istediginize emin misiniz?');
    if (!confirmed) return;
    await deleteVehiclePhoto(receptionId, photoId);
    toast.success("Fotoğraf silindi");
    fetchVehicles();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-400' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-500'}`;
  const cardCls = `rounded-xl border transition-colors ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`;

  // ─── BÜYÜK KART — Dükkandaki Araçlar ──────────────────
  const InShopCard = ({ v }) => {
    const isExpanded = expandedId === v.id;
    return (
      <div className={`${cardCls} overflow-hidden`}>
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between cursor-pointer ${dark ? 'hover:bg-surface-800/50' : 'hover:bg-surface-50'}`}
             onClick={() => setExpandedId(isExpanded ? null : v.id)}>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold tracking-wider ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              {v.plate_number}
            </div>
            <div>
              <span className="font-semibold">{v.vehicle_brand} {v.vehicle_model}</span>
              {v.vehicle_color && <span className={`ml-2 text-xs ${dark ? 'text-surface-400' : 'text-surface-500'}`}>({v.vehicle_color})</span>}
            </div>
            {v.owner_name && <span className={`text-sm ${dark ? 'text-surface-400' : 'text-surface-500'}`}>— {v.owner_name}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${dark ? 'text-surface-400' : 'text-surface-500'}`}>{formatDate(v.received_at)}</span>
            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${dark ? 'text-surface-400' : 'text-surface-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className={`px-5 pb-5 border-t animate-fade-in ${dark ? 'border-surface-800' : 'border-surface-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Sol: Araç Bilgileri */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold opacity-60 uppercase tracking-wider">Arac Bilgileri</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {v.owner_name && <div><span className="opacity-50">Sahip:</span> <span className="font-medium">{v.owner_name}</span></div>}
                  {v.owner_phone && <div><span className="opacity-50">Tel:</span> <span className="font-medium">{v.owner_phone}</span></div>}
                  {v.vehicle_year && <div><span className="opacity-50">Yil:</span> <span className="font-medium">{v.vehicle_year}</span></div>}
                  {v.km_reading && <div><span className="opacity-50">KM:</span> <span className="font-medium">{v.km_reading.toLocaleString('tr-TR')} km</span></div>}
                </div>

                {v.complaints && (
                  <div>
                    <h5 className="text-xs font-bold text-amber-400 mb-1">Musteri Sikayetleri</h5>
                    <p className={`text-sm p-3 rounded-lg ${dark ? 'bg-surface-800' : 'bg-amber-50 text-surface-800'}`}>{v.complaints}</p>
                  </div>
                )}
                {v.diagnosis && (
                  <div>
                    <h5 className="text-xs font-bold text-blue-400 mb-1">Tespit / Tani</h5>
                    <p className={`text-sm p-3 rounded-lg ${dark ? 'bg-surface-800' : 'bg-blue-50 text-surface-800'}`}>{v.diagnosis}</p>
                  </div>
                )}
                {v.notes && (
                  <div>
                    <h5 className="text-xs font-bold opacity-50 mb-1">Notlar</h5>
                    <p className={`text-sm p-3 rounded-lg ${dark ? 'bg-surface-800' : 'bg-surface-100'}`}>{v.notes}</p>
                  </div>
                )}
              </div>

              {/* Sağ: Fotoğraflar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold opacity-60 uppercase tracking-wider">Fotograflar</h4>
                  <label className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors
                    ${dark ? 'bg-primary-500/15 text-primary-400 hover:bg-primary-500/25' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>
                    {uploadingId === v.id ? 'Yukleniyor...' : '+ Fotograf Ekle'}
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={e => handlePhotoUpload(v.id, e.target.files)} />
                  </label>
                </div>
                {v.photos && v.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {v.photos.map(photo => (
                      <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden">
                        <img src={photo.file_path} alt="Arac" className="w-full h-full object-cover" />
                        <button onClick={() => handlePhotoDelete(v.id, photo.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs text-center py-6 ${dark ? 'text-surface-500' : 'text-surface-400'}`}>Henuz fotograf eklenmedi</p>
                )}
              </div>
            </div>

            {/* Aksiyonlar */}
            <div className={`flex items-center gap-2 mt-4 pt-4 border-t ${dark ? 'border-surface-800' : 'border-surface-100'}`}>
              <button onClick={() => handleEdit(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors
                  ${dark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                Duzenle
              </button>
              <button onClick={() => handleStatusChange(v.id, 'delivered')}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                Teslim Et
              </button>
              <button onClick={() => handleDelete(v.id)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors ml-auto">
                Sil
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── KÜÇÜK SATIR — Teslim Edilen Araçlar ──────────────
  const DeliveredRow = ({ v }) => (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors
      ${dark ? 'hover:bg-surface-800/50' : 'hover:bg-surface-50'}`}>
      <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider
        ${dark ? 'bg-surface-700 text-surface-300' : 'bg-surface-200 text-surface-600'}`}>
        {v.plate_number}
      </span>
      <span className="font-medium flex-1">{v.vehicle_brand} {v.vehicle_model} {v.vehicle_color ? `(${v.vehicle_color})` : ''}</span>
      {v.owner_name && <span className={`text-xs ${dark ? 'text-surface-400' : 'text-surface-500'}`}>{v.owner_name}</span>}
      <span className={`text-xs ${dark ? 'text-surface-500' : 'text-surface-400'}`}>
        Teslim: {formatDate(v.delivered_at)}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => handleStatusChange(v.id, 'in_shop')} title="Tekrar Kabul Et"
          className={`p-1.5 rounded-md transition-colors ${dark ? 'hover:bg-surface-700 text-surface-400' : 'hover:bg-surface-200 text-surface-500'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button onClick={() => handleDelete(v.id)} title="Sil"
          className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Arac Kabul</h2>
          <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>Isyerine gelen araclari kayit altina alin</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors shadow-lg shadow-primary-600/25">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Arac Kabul
        </button>
      </div>

      {/* Arama */}
      <div className="relative">
        <svg className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? 'text-surface-400' : 'text-surface-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Plaka, sahip adi veya marka ile ara..."
          value={search} onChange={e => setSearch(e.target.value)}
          className={`pl-11 ${inputCls}`} />
      </div>

      {/* ─── Form Modal ──────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className={`${cardCls} w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 mx-4`} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-5">{editingId ? 'Arac Kaydini Duzenle' : 'Yeni Arac Kabul'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Plaka + Sahip */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Plaka *</label>
                  <input type="text" required value={form.plate_number}
                    onChange={e => setForm({ ...form, plate_number: e.target.value.toUpperCase() })}
                    placeholder="34 ABC 123" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Arac Sahibi</label>
                  <input type="text" value={form.owner_name}
                    onChange={e => setForm({ ...form, owner_name: e.target.value })}
                    placeholder="Ad Soyad" className={inputCls} />
                </div>
              </div>

              {/* Tel + Marka + Model */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Telefon</label>
                  <input type="text" value={form.owner_phone}
                    onChange={e => setForm({ ...form, owner_phone: e.target.value })}
                    placeholder="05XX XXX XX XX" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Marka</label>
                  <input type="text" value={form.vehicle_brand}
                    onChange={e => setForm({ ...form, vehicle_brand: e.target.value })}
                    placeholder="BMW, Mercedes..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Model</label>
                  <input type="text" value={form.vehicle_model}
                    onChange={e => setForm({ ...form, vehicle_model: e.target.value })}
                    placeholder="320i, C200..." className={inputCls} />
                </div>
              </div>

              {/* Yıl + Renk + KM */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Yil</label>
                  <input type="number" value={form.vehicle_year}
                    onChange={e => setForm({ ...form, vehicle_year: e.target.value })}
                    placeholder="2024" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">Renk</label>
                  <input type="text" value={form.vehicle_color}
                    onChange={e => setForm({ ...form, vehicle_color: e.target.value })}
                    placeholder="Siyah, Beyaz..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70">KM</label>
                  <input type="number" value={form.km_reading}
                    onChange={e => setForm({ ...form, km_reading: e.target.value })}
                    placeholder="45000" className={inputCls} />
                </div>
              </div>

              {/* Şikayetler + Tespit + Notlar */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-amber-400">Musteri Sikayetleri</label>
                <textarea rows="3" value={form.complaints}
                  onChange={e => setForm({ ...form, complaints: e.target.value })}
                  placeholder="Musteri ne sikayetlerle geldi..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-blue-400">Tespit / Tani</label>
                <textarea rows="3" value={form.diagnosis}
                  onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                  placeholder="Yapilan tespit ve tani bilgileri..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">Ek Notlar</label>
                <textarea rows="2" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ekstra notlar..." className={inputCls} />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors
                    ${dark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'}`}>
                  Iptal
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-lg shadow-primary-600/25">
                  {editingId ? 'Guncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className={`text-center py-10 ${dark ? 'text-surface-400' : 'text-surface-500'}`}>Yukleniyor...</p>
      ) : (
        <>
          {/* ─── Dükkandaki Araçlar ──────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-lg font-bold">Dukkandaki Araclar</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {inShop.length}
              </span>
            </div>
            {inShop.length > 0 ? (
              <div className="space-y-3">
                {inShop.map(v => <InShopCard key={v.id} v={v} />)}
              </div>
            ) : (
              <div className={`${cardCls} p-8 text-center`}>
                <p className={`text-sm ${dark ? 'text-surface-400' : 'text-surface-500'}`}>
                  Dukkanda bekleyen arac bulunmuyor
                </p>
              </div>
            )}
          </div>

          {/* ─── Teslim Edilen Araçlar ───────────────────── */}
          {delivered.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${dark ? 'text-surface-400' : 'text-surface-500'}`}>
                  Teslim Edilen Araclar
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${dark ? 'bg-surface-700 text-surface-400' : 'bg-surface-200 text-surface-500'}`}>
                  {delivered.length}
                </span>
              </div>
              <div className={`${cardCls} divide-y ${dark ? 'divide-surface-800' : 'divide-surface-100'}`}>
                {delivered.map(v => <DeliveredRow key={v.id} v={v} />)}
              </div>
            </div>
          )}

          {vehicles.length === 0 && !loading && (
            <div className={`${cardCls} p-12 text-center`}>
              <svg className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-surface-600' : 'text-surface-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className={`font-medium ${dark ? 'text-surface-300' : 'text-surface-600'}`}>Henuz arac kaydı yok</p>
              <p className={`text-sm mt-1 ${dark ? 'text-surface-500' : 'text-surface-400'}`}>
                "Yeni Arac Kabul" butonuna tiklayarak baslayabilirsiniz
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

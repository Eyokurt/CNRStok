import { useState, useEffect, useRef } from 'react';
import api, { getVehicles, createVehicle, updateVehicle, deleteVehicle, uploadVehiclePhotos, deleteVehiclePhoto } from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const emptyForm = {
  plate_number: '', owner_name: '', owner_phone: '', vehicle_brand: '',
  vehicle_model: '', vehicle_year: '', vehicle_color: '', km_reading: '',
  complaints: '', diagnosis: '', notes: ''
};

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
  
  // Custom dialog overlay states
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [photoDeleteConfirm, setPhotoDeleteConfirm] = useState(null); // { receptionId, photoId }

  // Vehicle Service History & QR states
  const [receptionHistory, setReceptionHistory] = useState({});
  const [loadingHistoryId, setLoadingHistoryId] = useState(null);
  const [qrShareReception, setQrShareReception] = useState(null);

  // QR Mobile Upload states
  const [qrUploadReceptionId, setQrUploadReceptionId] = useState(null);
  const [qrUploadToken, setQrUploadToken] = useState(null);
  const [qrUploadTimeLeft, setQrUploadTimeLeft] = useState(600);
  const [qrUploadLoading, setQrUploadLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const fetchVehicles = async () => {
    try {
      const res = await getVehicles(null, search || null);
      setVehicles(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, [search]);

  const handleOpenQrUpload = async (id) => {
    setQrUploadLoading(true);
    setQrUploadReceptionId(id);
    setQrUploadTimeLeft(600);
    try {
      const res = await api.get(`/vehicles/${id}/upload-token`);
      setQrUploadToken(res.data.token);
    } catch {
      toast.error("Yükleme bağlantısı alınamadı");
      setQrUploadReceptionId(null);
    } finally {
      setQrUploadLoading(false);
    }
  };

  // Poll for photos and handle countdown
  useEffect(() => {
    if (!qrUploadReceptionId) return;

    // 1. Countdown timer
    const countdown = setInterval(() => {
      setQrUploadTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Polling for photos
    const poller = setInterval(async () => {
      try {
        const res = await getVehicle(qrUploadReceptionId);
        setVehicles(prev => prev.map(v => v.id === qrUploadReceptionId ? res.data : v));
      } catch { /* ignore */ }
    }, 4000);

    return () => {
      clearInterval(countdown);
      clearInterval(poller);
    };
  }, [qrUploadReceptionId]);


  const handleToggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Fetch vehicle visit history on-demand
      if (!receptionHistory[id]) {
        try {
          setLoadingHistoryId(id);
          const res = await api.get(`/vehicles/${id}/history`);
          setReceptionHistory(prev => ({ ...prev, [id]: res.data }));
        } catch {
          toast.error("Servis gecmisi yuklenemedi");
        } finally {
          setLoadingHistoryId(null);
        }
      }
    }
  };

  const inShop = vehicles.filter(v => v.status === 'in_shop' || v.status === 'ready');
  const delivered = vehicles.filter(v => v.status === 'delivered');

  const handleDownloadPdf = async (id, plateNumber) => {
    try {
      const res = await api.get(`/vehicles/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Arac_Kabul_${plateNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Kabul formu PDF indirildi');
    } catch {
      toast.error('PDF indirilemedi');
    }
  };

  const handlePrint = (id) => {
    const token = localStorage.getItem('token');
    const printUrl = `/api/vehicles/${id}/pdf?token=${token}`;
    const existingFrame = document.getElementById('print-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.open(printUrl, '_blank');
      }
    };
    iframe.src = printUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Lutfen formdaki hatalari duzeltin");
      return;
    }
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
        toast.success("Arac bilgisi guncellendi");
      } else {
        await createVehicle(payload);
        toast.success("Arac kaydi olusturuldu");
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

  const handleDeleteTrigger = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteVehicle(deleteConfirmId);
      toast.success("Arac silindi");
      fetchVehicles();
    } catch {
      toast.error("Arac silinemedi");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateVehicle(id, { status: newStatus });
      let msg = "Durum guncellendi";
      if (newStatus === 'delivered') msg = "Arac teslim edildi";
      else if (newStatus === 'ready') msg = "Arac teslim alinmaya hazir duruma getirildi";
      else if (newStatus === 'in_shop') msg = "Arac tekrar onarima alindi";
      toast.success(msg);
      fetchVehicles();
    } catch {
      toast.error("Durum guncellenemedi");
    }
  };

  const handlePhotoUpload = async (receptionId, files) => {
    if (!files.length) return;
    setUploadingId(receptionId);
    try {
      await uploadVehiclePhotos(receptionId, Array.from(files));
      toast.success("Fotograflar yuklendi");
      fetchVehicles();
    } catch { toast.error('Fotograf yuklenemedi'); }
    setUploadingId(null);
  };

  const handlePhotoDeleteTrigger = (receptionId, photoId) => {
    setPhotoDeleteConfirm({ receptionId, photoId });
  };

  const confirmPhotoDelete = async () => {
    if (!photoDeleteConfirm) return;
    const { receptionId, photoId } = photoDeleteConfirm;
    try {
      await deleteVehiclePhoto(receptionId, photoId);
      toast.success("Fotograf silindi");
      fetchVehicles();
    } catch {
      toast.error("Fotograf silinemedi");
    } finally {
      setPhotoDeleteConfirm(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // Client-side validations
  const validationErrors = {};
  if (form.plate_number) {
    const cleaned = form.plate_number.replace(/[^A-Za-z0-9]/g, '');
    if (cleaned.length < 5 || cleaned.length > 10) {
      validationErrors.plate_number = 'Plaka 5 ila 10 karakter olmalidir';
    } else if (!(/[A-Za-z]/.test(cleaned) && /[0-9]/.test(cleaned))) {
      validationErrors.plate_number = 'Plaka hem harf hem de rakam icermelidir';
    }
  }
  if (form.owner_phone) {
    const cleaned = form.owner_phone.replace(/\D/g, '');
    if (cleaned.length !== 10 && cleaned.length !== 11) {
      validationErrors.owner_phone = 'Telefon 10 veya 11 haneli olmalidir';
    }
  }
  if (form.vehicle_year) {
    const val = parseInt(form.vehicle_year);
    if (isNaN(val) || val < 1900 || val > new Date().getFullYear() + 1) {
      validationErrors.vehicle_year = 'Gecersiz uretim yili';
    }
  }
  if (form.km_reading) {
    const val = parseInt(form.km_reading);
    if (isNaN(val) || val < 0) {
      validationErrors.km_reading = 'KM degeri negatif olamaz';
    }
  }

  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-400' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-500'}`;

  const inputErrCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 border-red-500 bg-red-500/5`;

  const cardCls = `rounded-xl border transition-all duration-300 ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`;

  const InShopCard = ({ v }) => {
    const isExpanded = expandedId === v.id;
    return (
      <div className={`${cardCls} overflow-hidden shadow-sm hover:shadow-md`}>
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between cursor-pointer ${dark ? 'hover:bg-surface-800/50' : 'hover:bg-surface-50'}`}
             onClick={() => handleToggleExpand(v.id)}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold tracking-wider ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              {v.plate_number}
            </div>
            {v.status === 'ready' && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold animate-pulse ${dark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                Teslim Alınmaya Hazır
              </span>
            )}
            <div>
              <span className="font-semibold">{v.vehicle_brand} {v.vehicle_model}</span>
              {v.vehicle_color && <span className={`ml-2 text-xs ${dark ? 'text-surface-400' : 'text-surface-505'}`}>({v.vehicle_color})</span>}
            </div>
            {v.owner_name && <span className={`text-sm ${dark ? 'text-surface-400' : 'text-surface-500'}`}>— {v.owner_name}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${dark ? 'text-surface-400' : 'text-surface-500'}`}>{formatDate(v.received_at)}</span>
            <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${dark ? 'text-surface-400' : 'text-surface-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className={`px-5 pb-5 border-t animate-fade-in ${dark ? 'border-surface-800' : 'border-surface-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Left: Vehicle Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider">Arac Bilgileri</h4>
                <div className="grid grid-cols-2 gap-3 text-sm p-4 rounded-xl dark:bg-surface-850 bg-surface-50">
                  {v.owner_name && <div><span className="opacity-50">Sahip:</span> <span className="font-semibold">{v.owner_name}</span></div>}
                  {v.owner_phone && <div><span className="opacity-50">Tel:</span> <span className="font-semibold">{v.owner_phone}</span></div>}
                  {v.vehicle_year && <div><span className="opacity-50">Yil:</span> <span className="font-semibold">{v.vehicle_year}</span></div>}
                  {v.km_reading && <div><span className="opacity-50">KM:</span> <span className="font-semibold">{v.km_reading.toLocaleString('tr-TR')} km</span></div>}
                </div>

                {v.complaints && (
                  <div>
                    <h5 className="text-xs font-bold text-amber-500 mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                      Musteri Sikayetleri
                    </h5>
                    <p className={`text-sm p-3 rounded-lg leading-relaxed ${dark ? 'bg-surface-800' : 'bg-amber-50/50 text-surface-800 border border-amber-100'}`}>{v.complaints}</p>
                  </div>
                )}
                {v.diagnosis && (
                  <div>
                    <h5 className="text-xs font-bold text-primary-400 mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Tespit / Tani
                    </h5>
                    <p className={`text-sm p-3 rounded-lg leading-relaxed ${dark ? 'bg-surface-800' : 'bg-primary-50/20 text-surface-800 border border-primary-100/30'}`}>{v.diagnosis}</p>
                  </div>
                )}
                {v.notes && (
                  <div>
                    <h5 className="text-xs font-bold opacity-50 mb-1.5">Notlar</h5>
                    <p className={`text-sm p-3 rounded-lg leading-relaxed ${dark ? 'bg-surface-800' : 'bg-surface-100'}`}>{v.notes}</p>
                  </div>
                )}
              </div>

              {/* Right: Photos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider">Fotograflar</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => handleOpenQrUpload(v.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] flex items-center gap-1.5
                        ${dark ? 'bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 border border-primary-500/10' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-4v-4m0 4h4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Telefondan Yükle (QR)
                    </button>
                    <label className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-1.5
                      ${dark ? 'bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 border border-primary-500/10' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>
                      {uploadingId === v.id ? 'Yukleniyor...' : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          + Bilgisayardan Yükle
                        </>
                      )}
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => handlePhotoUpload(v.id, e.target.files)} />
                    </label>
                  </div>
                </div>
                {v.photos && v.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {v.photos.map(photo => (
                      <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border dark:border-surface-800 border-surface-200">
                        <img src={photo.file_path} alt="Arac" className="w-full h-full object-cover" />
                        <button onClick={() => handlePhotoDeleteTrigger(v.id, photo.id)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-all shadow-md flex items-center justify-center">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs text-center py-10 rounded-xl border border-dashed ${dark ? 'text-surface-500 border-surface-800' : 'text-surface-400 border-surface-200'}`}>Henuz fotograf eklenmedi</p>
                )}
              </div>
            </div>

            {/* Technician Visits History View */}
            <div className={`mt-6 pt-4 border-t ${dark ? 'border-surface-800' : 'border-surface-100'}`}>
              <h4 className="text-xs font-bold opacity-60 uppercase tracking-wider mb-3">Servis Gecmisi (Diger Ziyaretler)</h4>
              {loadingHistoryId === v.id ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : receptionHistory[v.id] && receptionHistory[v.id].length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {receptionHistory[v.id].map(h => (
                    <div key={h.id} className={`p-3 rounded-lg text-xs border ${dark ? 'bg-surface-850 border-surface-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-dashed border-slate-200 dark:border-surface-800">
                        <span className="font-bold text-primary-505">{formatDate(h.received_at)}</span>
                        <span className="opacity-60">KM: {h.km_reading ? h.km_reading.toLocaleString('tr-TR') : '—'}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
                        <div>
                          <span className="block font-bold opacity-50 mb-0.5">Sikayet</span>
                          <p className="leading-relaxed whitespace-pre-line">{h.complaints || '—'}</p>
                        </div>
                        <div>
                          <span className="block font-bold opacity-50 mb-0.5">Islem / Tani</span>
                          <p className="leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">{h.diagnosis || '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xs text-center py-4 rounded-xl border border-dashed ${dark ? 'text-surface-500 border-surface-800' : 'text-surface-400 border-surface-200'}`}>
                  Bu araca ait baska bir gecmis ziyaret bulunmuyor.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-2 mt-6 pt-4 border-t flex-wrap ${dark ? 'border-surface-800' : 'border-surface-100'}`}>
              <button onClick={() => handleEdit(v)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors
                  ${dark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                Duzenle
              </button>
              <button onClick={() => handleDownloadPdf(v.id, v.plate_number)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-colors inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF Indir
              </button>
              <button onClick={() => handlePrint(v.id)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 transition-colors inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Yazdir
              </button>
              <button onClick={() => setQrShareReception(v)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-colors inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-4v-4m0 4h4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                QR Paylas
              </button>
              {v.status === 'in_shop' ? (
                <button onClick={() => handleStatusChange(v.id, 'ready')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  Teslime Hazır
                </button>
              ) : (
                <button onClick={() => handleStatusChange(v.id, 'in_shop')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors
                    ${dark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                  Tekrar Onarıma Al
                </button>
              )}
              <button onClick={() => handleStatusChange(v.id, 'delivered')}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10">
                Teslim Et
              </button>
              <button onClick={() => handleDeleteTrigger(v.id)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors ml-auto">
                Sil
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const DeliveredRow = ({ v }) => (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200
      ${dark ? 'hover:bg-surface-800/50' : 'hover:bg-surface-50'}`}>
      <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider
        ${dark ? 'bg-surface-700 text-surface-300' : 'bg-surface-200 text-surface-600'}`}>
        {v.plate_number}
      </span>
      <span className="font-medium flex-1 text-sm">{v.vehicle_brand} {v.vehicle_model} {v.vehicle_color ? `(${v.vehicle_color})` : ''}</span>
      {v.owner_name && <span className={`text-xs ${dark ? 'text-surface-400' : 'text-surface-505'}`}>{v.owner_name}</span>}
      <span className={`text-xs opacity-60 ${dark ? 'text-surface-400' : 'text-surface-600'}`}>
        Teslim: {formatDate(v.delivered_at)}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => handleDownloadPdf(v.id, v.plate_number)} title="Kabul Formu Indir"
          className={`p-1.5 rounded-md transition-colors ${dark ? 'hover:bg-surface-700 text-primary-400' : 'hover:bg-surface-200 text-primary-600'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button onClick={() => handlePrint(v.id)} title="Yazdir"
          className={`p-1.5 rounded-md transition-colors ${dark ? 'hover:bg-surface-700 text-emerald-400' : 'hover:bg-surface-200 text-emerald-600'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
        <button onClick={() => setQrShareReception(v)} title="QR Paylas"
          className={`p-1.5 rounded-md transition-colors ${dark ? 'hover:bg-surface-700 text-primary-400' : 'hover:bg-surface-200 text-primary-600'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-4v-4m0 4h4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button onClick={() => handleStatusChange(v.id, 'in_shop')} title="Tekrar Kabul Et"
          className={`p-1.5 rounded-md transition-colors ${dark ? 'hover:bg-surface-700 text-surface-400' : 'hover:bg-surface-200 text-surface-500'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button onClick={() => handleDeleteTrigger(v.id)} title="Sil"
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-primary-600/25">
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Arac Kabul
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? 'text-surface-400' : 'text-surface-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Plaka, sahip adi veya marka ile ara..."
          value={search} onChange={e => setSearch(e.target.value)}
          className={`pl-11 ${inputCls}`} />
      </div>

      {/* Form Modal Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className={`${cardCls} w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 mx-4 animate-scale-in border shadow-2xl`} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-5 dark:border-surface-800 border-surface-100 pb-2 border-b">{editingId ? 'Arac Kaydini Duzenle' : 'Yeni Arac Kabul'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Plaka + Sahip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Plaka *</label>
                  <input type="text" required value={form.plate_number}
                    onChange={e => setForm({ ...form, plate_number: e.target.value.toUpperCase() })}
                    placeholder="34 ABC 123" className={validationErrors.plate_number ? inputErrCls : inputCls} />
                  {validationErrors.plate_number && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.plate_number}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Arac Sahibi</label>
                  <input type="text" value={form.owner_name}
                    onChange={e => setForm({ ...form, owner_name: e.target.value })}
                    placeholder="Ad Soyad" className={inputCls} />
                </div>
              </div>

              {/* Tel + Marka + Model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Telefon</label>
                  <input type="text" value={form.owner_phone}
                    onChange={e => setForm({ ...form, owner_phone: e.target.value })}
                    placeholder="05XX XXX XX XX" className={validationErrors.owner_phone ? inputErrCls : inputCls} />
                  {validationErrors.owner_phone && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.owner_phone}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Marka</label>
                  <input type="text" value={form.vehicle_brand}
                    onChange={e => setForm({ ...form, vehicle_brand: e.target.value })}
                    placeholder="BMW, Mercedes..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Model</label>
                  <input type="text" value={form.vehicle_model}
                    onChange={e => setForm({ ...form, vehicle_model: e.target.value })}
                    placeholder="320i, C200..." className={inputCls} />
                </div>
              </div>

              {/* Yıl + Renk + KM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Yil</label>
                  <input type="number" value={form.vehicle_year}
                    onChange={e => setForm({ ...form, vehicle_year: e.target.value })}
                    placeholder="2024" className={validationErrors.vehicle_year ? inputErrCls : inputCls} />
                  {validationErrors.vehicle_year && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.vehicle_year}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">Renk</label>
                  <input type="text" value={form.vehicle_color}
                    onChange={e => setForm({ ...form, vehicle_color: e.target.value })}
                    placeholder="Siyah, Beyaz..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-75">KM</label>
                  <input type="number" value={form.km_reading}
                    onChange={e => setForm({ ...form, km_reading: e.target.value })}
                    placeholder="45000" className={validationErrors.km_reading ? inputErrCls : inputCls} />
                  {validationErrors.km_reading && (
                    <span className="text-red-500 text-[11px] mt-1 block">{validationErrors.km_reading}</span>
                  )}
                </div>
              </div>

              {/* Şikayetler + Tespit + Notlar */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-amber-500">Musteri Sikayetleri</label>
                <textarea rows="3" value={form.complaints}
                  onChange={e => setForm({ ...form, complaints: e.target.value })}
                  placeholder="Musteri ne sikayetlerle geldi..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-primary-400">Tespit / Tani</label>
                <textarea rows="3" value={form.diagnosis}
                  onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                  placeholder="Yapilan tespit ve tani bilgileri..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 opacity-75">Ek Notlar</label>
                <textarea rows="2" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ekstra notlar..." className={inputCls} />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t dark:border-surface-800 border-surface-100 mt-6">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${dark ? 'bg-surface-800 text-surface-300 hover:bg-surface-700' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'}`}>
                  Iptal
                </button>
                <button type="submit"
                  disabled={Object.keys(validationErrors).length > 0}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg
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

      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-lg font-bold">Dukkandaki Araclar</h3>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${cardCls} px-5 py-4 flex items-center justify-between animate-skeleton-pulse`}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`h-8 w-24 rounded-lg ${dark ? 'bg-surface-800' : 'bg-surface-200'}`} />
                <div className={`h-4 w-32 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`} />
                <div className={`h-4 w-20 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`} />
              </div>
              <div className={`h-5 w-5 rounded ${dark ? 'bg-surface-800' : 'bg-surface-200'}`} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Active shop logs */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
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
              <div className={`${cardCls} p-10 text-center`}>
                <p className={`text-sm ${dark ? 'text-surface-400' : 'text-surface-505'}`}>
                  Dukkanda bekleyen arac bulunmuyor
                </p>
              </div>
            )}
          </div>

          {/* Delivered logs */}
          {delivered.length > 0 && (
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${dark ? 'text-surface-400' : 'text-surface-505'}`}>
                  Teslim Edilen Araclar
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${dark ? 'bg-surface-700 text-surface-400' : 'bg-surface-200 text-surface-505'}`}>
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
              <p className={`font-semibold ${dark ? 'text-surface-300' : 'text-surface-600'}`}>Henuz arac kaydi yok</p>
              <p className={`text-sm mt-1 ${dark ? 'text-surface-505' : 'text-surface-400'}`}>
                "Yeni Arac Kabul" butonuna tiklayarak baslayabilirsiniz
              </p>
            </div>
          )}
        </>
      )}

      {/* Delete Vehicle Registration Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-scale-in border
            ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-bold">Arac Kaydini Sil</h3>
            </div>
            <p className={`text-sm mb-6 ${dark ? 'text-surface-300' : 'text-surface-600'}`}>
              Bu arac kaydini silmek istediginize emin misiniz? Bu islem geri alinamaz ve araca yuklenmis olan tum fotograflar silinecektir.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-100 hover:bg-surface-200 text-surface-700'}`}>
                Vazgec
              </button>
              <button type="button" onClick={confirmDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 transition-all">
                Arac Kaydini Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation Modal */}
      {photoDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-scale-in border
            ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-bold">Fotografi Sil</h3>
            </div>
            <p className={`text-sm mb-6 ${dark ? 'text-surface-300' : 'text-surface-600'}`}>
              Bu arac fotografini silmek istediginize emin misiniz? Bu islem geri alinamaz.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPhotoDeleteConfirm(null)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${dark ? 'bg-surface-800 hover:bg-surface-700 text-surface-300' : 'bg-surface-100 hover:bg-surface-200 text-surface-700'}`}>
                Vazgec
              </button>
              <button type="button" onClick={confirmPhotoDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 transition-all">
                Fotografi Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Share Modal Dialog */}
      {qrShareReception && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-scale-in border
            ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
            
            <div className="flex items-center justify-between mb-6 pb-2 border-b dark:border-surface-800 border-slate-100">
              <h3 className="text-lg font-bold text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-4v-4m0 4h4m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Musteriyle QR Paylas
              </h3>
              <button onClick={() => setQrShareReception(null)} className="opacity-50 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="flex flex-col items-center space-y-4">
              {/* Dynamic local vector QR Code */}
              <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 flex items-center justify-center">
                <QRCodeSVG 
                  value={`${window.location.origin}/shared/vehicle/${qrShareReception.qr_token}`} 
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="text-center space-y-1 px-4">
                <span className="text-xs font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full">
                  {qrShareReception.plate_number}
                </span>
                <p className={`text-sm font-semibold pt-1 ${dark ? 'text-surface-300' : 'text-slate-700'}`}>
                  {qrShareReception.vehicle_brand} {qrShareReception.vehicle_model}
                </p>
                <p className={`text-xs ${dark ? 'text-surface-500' : 'text-slate-400'}`}>
                  Musteriniz bu QR kodu okutarak sisteme giris yapmadan aracinin durumunu takip edebilir.
                </p>
              </div>

              {/* Share link and Actions */}
              <div className="w-full space-y-3 pt-3">
                <div className="relative">
                  <input 
                    type="text" 
                    readOnly
                    value={`${window.location.origin}/shared/vehicle/${qrShareReception.qr_token}`}
                    className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none pr-20 ${
                      dark ? 'bg-surface-850 border-surface-800 text-surface-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/shared/vehicle/${qrShareReception.qr_token}`);
                      toast.success("Baglanti panoya kopyalandi");
                    }}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded text-[10px] font-bold transition-all"
                  >
                    Kopyala
                  </button>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setQrShareReception(null)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      dark ? 'bg-surface-800 border-surface-700 hover:bg-surface-700 text-surface-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Kapat
                  </button>
                  {qrShareReception.owner_phone && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=${qrShareReception.owner_phone.replace(/\D/g, '')}&text=${encodeURIComponent(
                        `Merhaba ${qrShareReception.owner_name || 'Müşterimiz'}, ${qrShareReception.plate_number} plakalı aracınızın servis kabul kaydı açılmıştır. Aracınızın canlı onarım durumunu ve servis geçmişini bu bağlantıdan şifresiz takip edebilirsiniz: ${window.location.origin}/shared/vehicle/${qrShareReception.qr_token}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10 text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.013-5.102-2.861-6.953C16.63 1.95 14.157.945 11.53.945c-5.446 0-9.873 4.42-9.877 9.855-.001 1.745.467 3.447 1.353 4.957l-1.01 3.693 3.791-.994c1.472.802 3.12 1.222 4.87 1.222zm11.302-6.84c-.297-.15-1.758-.868-2.031-.967-.272-.099-.47-.15-.668.15-.197.297-.767.967-.94 1.165-.173.197-.347.223-.644.074-.297-.15-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.15-.173.2-.297.298-.495.099-.198.05-.371-.025-.521-.075-.15-.668-1.609-.914-2.203-.24-.579-.484-.5-.668-.51-.173-.008-.371-.01-.569-.01-.197 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      WhatsApp Paylas
                    </a>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* QR Photo Upload Modal Dialog */}
      {qrUploadReceptionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl transition-all duration-300 animate-scale-in border
            ${dark ? 'bg-surface-900 border-surface-800 text-white' : 'bg-white border-surface-200 text-surface-900'}`}>
            
            <div className="flex items-center justify-between mb-6 pb-2 border-b dark:border-surface-800 border-slate-100">
              <h3 className="text-lg font-bold text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Telefondan Fotoğraf Yükle
              </h3>
              <button onClick={() => setQrUploadReceptionId(null)} className="opacity-50 hover:opacity-100 transition-opacity">✕</button>
            </div>

            {qrUploadLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs opacity-60">Bağlantı şifreleniyor...</p>
              </div>
            ) : qrUploadToken ? (
              <div className="flex flex-col items-center space-y-4">
                <span className="text-[10px] text-surface-400 text-center font-medium max-w-[280px]">
                  Telefonunuzun kamerası ile aşağıdaki QR kodu taratarak fotoğraf yükleme ekranına gidin.
                </span>
                
                {/* Dynamic local vector QR Code */}
                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 flex items-center justify-center">
                  <QRCodeSVG 
                    value={`${window.location.origin}/shared/vehicle/upload?token=${qrUploadToken}`} 
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="text-center space-y-1.5 px-4 w-full">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-500 font-semibold bg-amber-500/5 py-1 px-3 rounded-full border border-amber-500/10">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.241 8H18" />
                    </svg>
                    <span>Canlı İzleniyor: Telefonda çektiğiniz görseller anında buraya gelecektir.</span>
                  </div>
                  
                  <div className="text-center pt-2">
                    <p className={`text-[11px] ${qrUploadTimeLeft === 0 ? 'text-red-500 font-bold' : 'opacity-60'}`}>
                      {qrUploadTimeLeft === 0 
                        ? 'Oturum süresi doldu. Lütfen kodu yenileyin.' 
                        : `Bağlantı Süresi: ${Math.floor(qrUploadTimeLeft / 60)}d ${qrUploadTimeLeft % 60}s`}
                    </p>
                  </div>
                </div>

                <div className="w-full pt-3 flex gap-2">
                  <button 
                    onClick={() => handleOpenQrUpload(qrUploadReceptionId)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      dark ? 'bg-surface-800 border-surface-700 hover:bg-surface-700 text-surface-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Kodu Yenile
                  </button>
                  <button 
                    onClick={() => setQrUploadReceptionId(null)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/10 text-center transition-all flex items-center justify-center"
                  >
                    Kapat / Tamam
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-red-500 font-semibold">Token alınamadı. Lütfen tekrar deneyin.</p>
                <button 
                  onClick={() => handleOpenQrUpload(qrUploadReceptionId)}
                  className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg"
                >
                  Tekrar Dene
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

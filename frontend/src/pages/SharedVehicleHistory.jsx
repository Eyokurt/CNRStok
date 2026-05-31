import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SharedVehicleHistory() {
  const { qrToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(false);
        // Direct axios request since it does not need JWT authorization headers
        const res = await axios.get(`/api/vehicles/public/${qrToken}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError(true);
        toast.error('Gecersiz veya suresi dolmus servis kaydi');
      } finally {
        setLoading(false);
      }
    };
    if (qrToken) {
      fetchHistory();
    }
  }, [qrToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-950 py-12 px-4 transition-colors duration-300">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Skeleton Header */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-surface-800 animate-pulse">
            <div className="h-6 w-48 bg-slate-200 dark:bg-surface-800 rounded mb-4" />
            <div className="h-4 w-72 bg-slate-150 dark:bg-surface-800 rounded" />
          </div>
          {/* Skeleton Status */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-surface-800 animate-pulse">
            <div className="flex justify-between items-center mb-6">
              <div className="h-4 w-24 bg-slate-200 dark:bg-surface-800 rounded" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-surface-800 rounded" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-surface-800 rounded" />
            </div>
            <div className="h-2 w-full bg-slate-150 dark:bg-surface-800 rounded" />
          </div>
          {/* Skeleton Body */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-surface-800 animate-pulse space-y-4">
            <div className="h-5 w-32 bg-slate-200 dark:bg-surface-800 rounded" />
            <div className="h-4 w-full bg-slate-150 dark:bg-surface-800 rounded" />
            <div className="h-4 w-full bg-slate-150 dark:bg-surface-800 rounded" />
            <div className="h-4 w-2/3 bg-slate-150 dark:bg-surface-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-surface-950 flex flex-col justify-center items-center p-4 transition-colors duration-300">
        <div className="max-w-md w-full text-center bg-white dark:bg-surface-900 rounded-2xl p-8 shadow-md border border-slate-100 dark:border-surface-800">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Kayıt Bulunamadı</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Aradığınız servis kaydı bulunamadı veya paylaşım bağlantısı geçerliliğini yitirdi. Lütfen dükkan yetkilisiyle iletişime geçin.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all shadow-sm"
          >
            Ana Sayfaya Git
          </a>
        </div>
      </div>
    );
  }

  const current = data.current_reception;
  const history = data.history;

  // Formatting Date helpers
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine current active stepper state
  // Stepper steps: 1: Accepted, 2: In Service, 3: Ready for Collection, 4: Delivered
  let stepperStep = 1;
  if (current.status === 'delivered') {
    stepperStep = 4;
  } else if (current.status === 'ready') {
    stepperStep = 3;
  } else if (current.status === 'in_shop') {
    stepperStep = current.diagnosis ? 2 : 1.5;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-950 py-10 px-4 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Workshop Letterhead Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-surface-800 transition-all">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {data.company_name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 max-w-lg">
                {data.company_address || 'Servis İstasyonu'}
              </p>
            </div>
            {data.company_phone && (
              <a
                href={`tel:${data.company_phone}`}
                className="inline-flex items-center self-start md:self-auto gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-all border border-indigo-100 dark:border-indigo-900/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {data.company_phone}
              </a>
            )}
          </div>
        </div>

        {/* Live Repair Stepper */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-surface-800 transition-all">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6">
            Onarım Süreci Durumu
          </h2>
          
          <div className="relative flex justify-between items-center w-full">
            {/* Background Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 dark:bg-surface-800 rounded -z-0" />
            
            {/* Progress Active Line */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded -z-0 transition-all duration-700" 
              style={{ width: stepperStep === 1 ? '0%' : stepperStep === 1.5 ? '16%' : stepperStep === 2 ? '33%' : stepperStep === 3 ? '66%' : '100%' }}
            />

            {/* Step 1: Accepted */}
            <div className="z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                stepperStep >= 1 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                  : 'bg-slate-200 text-slate-500 dark:bg-surface-800 dark:text-slate-500'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[10px] md:text-xs font-semibold mt-2 text-slate-700 dark:text-slate-300 text-center">
                Kabul Edildi
              </span>
            </div>

            {/* Step 2: In Service */}
            <div className="z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                stepperStep >= 1.5
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                  : 'bg-slate-200 text-slate-500 dark:bg-surface-800 dark:text-slate-500'
              }`}>
                {stepperStep === 1.5 ? (
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                ) : stepperStep > 1.5 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">2</span>
                )}
              </div>
              <span className="text-[10px] md:text-xs font-semibold mt-2 text-slate-700 dark:text-slate-300 text-center">
                {stepperStep === 1.5 ? 'Teşhiste' : 'İşlemde / Onarımda'}
              </span>
            </div>

            {/* Step 3: Ready for Collection */}
            <div className="z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                stepperStep >= 3
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                  : 'bg-slate-200 text-slate-500 dark:bg-surface-800 dark:text-slate-500'
              }`}>
                {stepperStep === 3 ? (
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                ) : stepperStep > 3 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">3</span>
                )}
              </div>
              <span className="text-[10px] md:text-xs font-semibold mt-2 text-slate-700 dark:text-slate-300 text-center">
                Teslim Alınmaya Hazır
              </span>
            </div>

            {/* Step 4: Delivered */}
            <div className="z-10 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                stepperStep >= 4 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-200 text-slate-500 dark:bg-surface-800 dark:text-slate-500'
              }`}>
                {stepperStep === 4 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">4</span>
                )}
              </div>
              <span className="text-[10px] md:text-xs font-semibold mt-2 text-slate-700 dark:text-slate-300 text-center">
                Teslim Edildi
              </span>
            </div>
          </div>
        </div>

        {/* Current Active Vehicle Reception Info */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-sm border border-slate-100 dark:border-surface-800 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4 flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <span className="bg-white/20 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
                Mevcut Kayıt
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {current.vehicle_brand} {current.vehicle_model}
              </h2>
            </div>
            <div className="bg-white text-indigo-700 font-bold px-3 py-1 rounded-xl text-center shadow-sm text-sm tracking-wider self-start md:self-auto">
              {current.plate_number}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Grid details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-surface-950/40 p-4 rounded-xl border border-slate-100 dark:border-surface-800">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Müşteri Adi</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{current.owner_name}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Telefon</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{current.owner_phone}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Kabul Tarihi</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{formatDate(current.received_at)}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Araç Km</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {current.km_reading ? `${current.km_reading.toLocaleString('tr-TR')} km` : '—'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-surface-800">
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Model Yılı</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{current.vehicle_year || '—'}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-surface-800">
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Renk</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{current.vehicle_color || '—'}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-surface-800 col-span-2">
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Teslim Tarihi</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {current.delivered_at ? formatDate(current.delivered_at) : 'Devam Ediyor'}
                </span>
              </div>
            </div>

            {/* Complaints and Diagnosis Blocks */}
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                  Müşteri Şikayetleri ve Talepleri
                </span>
                <div className="bg-amber-50/50 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-200/40 dark:border-amber-900/20 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {current.complaints || 'Belirtilmemiş'}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                  Arıza Tespit ve Yapılan İşlemler
                </span>
                <div className="bg-indigo-50/40 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-200/45 dark:border-indigo-900/20 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {current.diagnosis || 'Arıza tespit süreci devam ediyor.'}
                </div>
              </div>
            </div>

            {/* Attached Photos Carousel/List */}
            {current.photos && current.photos.length > 0 && (
              <div>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                  Araç Görsel Raporu
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {current.photos.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setActivePhoto(p.file_path)}
                      className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-slate-100 dark:border-surface-800 hover:scale-102 hover:shadow-md transition-all duration-300"
                    >
                      <img 
                        src={p.file_path} 
                        alt="Vehicle Diagnostic"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Vehicle Service History Timeline (Returning visits) */}
        {history && history.length > 0 && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-surface-800 transition-all">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6">
              Geçmiş Servis Raporları ({history.length})
            </h2>

            <div className="relative border-l-2 border-slate-150 dark:border-surface-800 ml-3 pl-6 space-y-8">
              {history.map(h => (
                <div key={h.id} className="relative">
                  {/* Circle indicator */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-300 dark:bg-surface-700 border-2 border-white dark:border-surface-900" />
                  
                  <div className="bg-slate-50 dark:bg-surface-950/40 p-4 rounded-xl border border-slate-100 dark:border-surface-850">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 pb-2 border-b border-slate-200/50 dark:border-surface-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatDate(h.received_at)}
                      </span>
                      <span className="bg-slate-200 dark:bg-surface-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
                        KM: {h.km_reading ? `${h.km_reading.toLocaleString('tr-TR')} km` : '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block font-bold text-slate-500 mb-1">Müşteri Şikayetleri</span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-white dark:bg-surface-900 p-2.5 rounded-lg border border-slate-100 dark:border-surface-850">
                          {h.complaints || 'Belirtilmemiş'}
                        </p>
                      </div>
                      <div>
                        <span className="block font-bold text-slate-500 mb-1">Yapılan İşlem / Ariza Tespiti</span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-white dark:bg-surface-900 p-2.5 rounded-lg border border-slate-100 dark:border-surface-850">
                          {h.diagnosis || 'Giriş kaydı bulunuyor, işlem tespiti girilmemiş.'}
                        </p>
                      </div>
                    </div>

                    {/* Historical Photos */}
                    {h.photos && h.photos.length > 0 && (
                      <div className="mt-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Görseller</span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {h.photos.map(p => (
                            <div 
                              key={p.id}
                              onClick={() => setActivePhoto(p.file_path)}
                              className="w-12 h-12 aspect-square rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border border-slate-100 dark:border-surface-800 hover:scale-102"
                            >
                              <img src={p.file_path} alt="Past Diagnostic" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Modern Lightbox Photo Modal */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActivePhoto(null)}
        >
          <button 
            onClick={() => setActivePhoto(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-all bg-white/10 p-2 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img 
            src={activePhoto} 
            alt="Expanded visual diagnostic report" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

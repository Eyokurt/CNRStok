import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SharedVehicleUpload() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  
  // Selected files state: array of { id, file, preview }
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Read token from URL query params
    const params = new URLSearchParams(window.location.search);
    const tokenVal = params.get('token');
    if (!tokenVal) {
      setError('Geçersiz bağlantı. Yükleme bağlantısı (token) bulunamadı.');
      setLoading(false);
      return;
    }
    setToken(tokenVal);

    // Fetch vehicle details using public details endpoint
    axios.get(`/api/vehicles/public-upload/details`, { params: { token: tokenVal } })
      .then(res => {
        setVehicle(res.data);
      })
      .catch(err => {
        const msg = err.response?.data?.detail || 'Bağlantı doğrulanamadı. Geçersiz veya süresi dolmuş olabilir.';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Convert to rich file object
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    // Clear value to allow selecting same file again if deleted
    e.target.value = '';
  };

  const handleRemoveFile = (id, previewUrl) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
    URL.revokeObjectURL(previewUrl);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    selectedFiles.forEach(item => {
      formData.append('files', item.file);
    });

    try {
      await axios.post(`/api/vehicles/public-upload/photos?token=${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Cleanup previews
      selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Fotoğraflar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  // Revoke URLs on unmount to prevent leaks
  useEffect(() => {
    return () => {
      selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, [selectedFiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061E29] text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold opacity-75 animate-pulse">Bağlantı doğrulanıyor, lütfen bekleyin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#061E29] text-white flex flex-col p-6 font-sans">
      {/* Premium Header */}
      <header className="flex flex-col items-center text-center mt-4 mb-8">
        <div className="w-12 h-12 bg-primary-900/40 rounded-xl border border-primary-500/20 flex items-center justify-center mb-3 shadow-lg shadow-primary-500/5">
          <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight">CNRStok Mobil Yükleme</h1>
        <p className="text-xs text-surface-400 mt-1">Servis aracı için hızlı fotoğraf ekleme portalı</p>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <span className="font-semibold block mb-0.5">İşlem Başarısız</span>
                <p className="leading-relaxed text-xs opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success ? (
          <div className="text-center p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-2xl animate-scale-in space-y-5 my-6">
            <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5 animate-pulse">
              <svg className="w-8 h-8 text-emerald-400 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-emerald-400">Yükleme Başarılı!</h2>
              <p className="text-xs leading-relaxed text-surface-300">
                Seçtiğiniz fotoğraflar sisteme başarıyla aktarıldı. Bilgisayar ekranından hemen kontrol edebilirsiniz.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-md transition-all duration-200 mt-2"
            >
              Daha Fazla Fotoğraf Yükle
            </button>
          </div>
        ) : (
          vehicle && (
            <div className="space-y-6">
              {/* Vehicle card */}
              <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/60 shadow-lg flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary-400">Yükleme Yapılacak Araç</span>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary-500/15 text-primary-300 border border-primary-500/10 text-xs">
                      {vehicle.plate_number}
                    </span>
                    <span>{vehicle.vehicle_brand} {vehicle.vehicle_model}</span>
                  </div>
                  {vehicle.vehicle_color && (
                    <p className="text-xs text-surface-400 italic">Renk: {vehicle.vehicle_color}</p>
                  )}
                </div>
                <div className="w-1.5 h-7 rounded-full bg-primary-500 animate-pulse" />
              </div>

              {/* Upload UI Box */}
              <div className="space-y-4">
                {/* Photo Previews */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-surface-300">Seçilen Fotoğraflar ({selectedFiles.length})</span>
                      <button 
                        onClick={() => {
                          selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
                          setSelectedFiles([]);
                        }}
                        className="text-[10px] text-red-400 hover:underline font-semibold"
                      >
                        Tümünü Temizle
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {selectedFiles.map((fileObj) => (
                        <div key={fileObj.id} className="relative aspect-square rounded-xl overflow-hidden border border-surface-800 bg-surface-950 group shadow-md">
                          <img src={fileObj.preview} alt="Önizleme" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleRemoveFile(fileObj.id, fileObj.preview)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white text-xs flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                            title="Sil"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Big camera trigger */}
                <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-surface-800 bg-surface-900/20 hover:bg-surface-900/40 transition-all cursor-pointer text-center group min-h-[160px]">
                  <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-primary-500/20 transition-all shadow-md">
                    <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">Fotoğraf Çek / Ekle</span>
                  <span className="text-[10px] text-surface-500 mt-1 max-w-[200px]">
                    Kameranızı açmak veya galerinizden birden fazla fotoğraf seçmek için tıklayın
                  </span>
                  
                  {/* HTML File input - capturing environments triggers mobile camera, multiple allows multiple select */}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {/* Submit actions */}
                {selectedFiles.length > 0 && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-primary-500/20 hover:shadow-primary-500/35 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Fotoğraflar Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>{selectedFiles.length} Fotoğrafı Yükle</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer Branding */}
      <footer className="text-center text-[10px] text-surface-600 mt-12 py-4">
        &copy; {new Date().getFullYear()} CNRStok Servis Otomasyon Sistemi. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}

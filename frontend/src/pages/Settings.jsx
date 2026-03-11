import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { dark } = useTheme();
  const [form, setForm] = useState({
    company_name: '',
    company_address: '',
    company_tax_office: '',
    company_tax_number: '',
    company_phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings()
      .then(res => setForm(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings(form);
      setSaved(true);
      toast.success("Ayarlar kaydedildi");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error('Ayarlar kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `w-full px-4 py-3 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-300' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-700'}`;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-primary-500 text-lg">Yükleniyor...</div></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Ayarlar</h2>
        <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>
          Faturalarda görünecek firma bilgilerinizi buradan güncelleyebilirsiniz
        </p>
      </div>

      <div className={`rounded-xl border p-6 transition-colors ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        <h3 className="text-lg font-semibold mb-5">Firma Bilgileri</h3>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1.5 opacity-70">Firma / İşyeri Adı</label>
            <input
              value={form.company_name}
              onChange={e => setForm({ ...form, company_name: e.target.value })}
              className={inputCls}
              placeholder="Örn: ABC Otomotiv Ltd. Şti."
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 opacity-70">Adres</label>
            <textarea
              value={form.company_address}
              onChange={e => setForm({ ...form, company_address: e.target.value })}
              rows={2}
              className={inputCls}
              placeholder="Örn: Atatürk Cad. No:123, Kadıköy / İstanbul"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70">Vergi Dairesi</label>
              <input
                value={form.company_tax_office}
                onChange={e => setForm({ ...form, company_tax_office: e.target.value })}
                className={inputCls}
                placeholder="Örn: Kadıköy VD"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70">Vergi Numarası</label>
              <input
                value={form.company_tax_number}
                onChange={e => setForm({ ...form, company_tax_number: e.target.value })}
                className={inputCls}
                placeholder="Örn: 1234567890"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 opacity-70">Telefon</label>
            <input
              value={form.company_phone}
              onChange={e => setForm({ ...form, company_phone: e.target.value })}
              className={inputCls}
              placeholder="Örn: 0216 123 45 67"
            />
          </div>

          <div className="flex items-center gap-4 pt-3">
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg
                ${saving
                  ? 'bg-surface-700 text-surface-300 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/25'
                }`}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {saved && (
              <span className="text-emerald-400 text-sm font-medium animate-fade-in">
                Ayarlar kaydedildi
              </span>
            )}
          </div>
        </form>
      </div>

      <div className={`rounded-xl border p-5 transition-colors ${dark ? 'bg-surface-900/50 border-surface-800' : 'bg-surface-50 border-surface-200'}`}>
        <p className={`text-xs ${dark ? 'text-surface-300' : 'text-surface-700'}`}>
          <strong>İpucu:</strong> Burada girdiğiniz bilgiler, oluşturduğunuz fatura PDF'lerinin üst kısmında firma başlığı olarak görünecektir.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { authLogin, authRegister } from '../api';
import { useTheme } from '../ThemeContext';

export default function Login({ onLogin }) {
  const { dark } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', business_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = isRegister
        ? await authRegister(form)
        : await authLogin({ username: form.username, password: form.password });

      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-4 py-3 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-400' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-500'}`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300
      ${dark ? 'bg-surface-950' : 'bg-surface-100'}`}>
      <div className={`w-full max-w-md rounded-2xl p-8 shadow-2xl border transition-colors
        ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              StokTakip
            </span>
          </h1>
          <p className={`text-sm mt-2 ${dark ? 'text-surface-400' : 'text-surface-600'}`}>
            Fatura Yönetim Sistemi
          </p>
        </div>

        {/* Tab Switch */}
        <div className={`flex rounded-lg overflow-hidden mb-6 border ${dark ? 'border-surface-700' : 'border-surface-200'}`}>
          <button
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${!isRegister
                ? 'bg-primary-600 text-white'
                : dark ? 'bg-surface-800 text-surface-400 hover:text-white' : 'bg-surface-50 text-surface-600 hover:text-surface-900'
              }`}>
            Giriş Yap
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${isRegister
                ? 'bg-primary-600 text-white'
                : dark ? 'bg-surface-800 text-surface-400 hover:text-white' : 'bg-surface-50 text-surface-600 hover:text-surface-900'
              }`}>
            Kayıt Ol
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-surface-400' : 'text-surface-600'}`}>
              Kullanıcı Adı
            </label>
            <input
              required
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className={inputCls}
              placeholder="ornek_kullanici"
              autoComplete="username"
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-surface-400' : 'text-surface-600'}`}>
              Şifre
            </label>
            <input
              required
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className={inputCls}
              placeholder="••••••••"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegister && (
            <div className="animate-fade-in">
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-surface-400' : 'text-surface-600'}`}>
                İşyeri / Firma Adı
              </label>
              <input
                type="text"
                value={form.business_name}
                onChange={e => setForm({ ...form, business_name: e.target.value })}
                className={inputCls}
                placeholder="ABC Otomotiv"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg mt-2
              ${loading
                ? 'bg-surface-700 text-surface-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/25 hover:shadow-primary-600/40'
              }`}>
            {loading ? 'Lütfen bekleyin...' : isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

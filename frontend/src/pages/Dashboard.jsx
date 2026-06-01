import { useState, useEffect } from 'react';
import { getDashboard } from '../api';
import { useTheme } from '../ThemeContext';

export default function Dashboard() {
  const { dark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-primary-500 text-lg">Yükleniyor...</div></div>;

  const cards = [
    { 
      label: 'Toplam Müşteri', 
      value: stats?.total_customers ?? 0, 
      iconColor: 'text-primary-500 dark:text-primary-400 bg-primary-500/10 dark:bg-primary-500/15', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      label: 'Toplam Ürün', 
      value: stats?.total_products ?? 0, 
      iconColor: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      label: 'Kesilen Fatura', 
      value: stats?.total_invoices ?? 0, 
      iconColor: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      label: 'Toplam Gelir', 
      value: `₺${(stats?.total_revenue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 
      iconColor: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/15', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>Genel bakış ve kritik stok uyarıları</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <div key={i} className={`rounded-lg p-5 border shadow-sm transition-all duration-200
            ${dark 
              ? 'bg-surface-900 border-surface-800 hover:border-surface-700 text-white' 
              : 'bg-white border-surface-200 hover:border-surface-300 text-surface-900'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold tracking-wider uppercase ${dark ? 'text-surface-400' : 'text-surface-500'}`}>{card.label}</p>
                <p className="text-2xl font-extrabold tracking-tight mt-1">{card.value}</p>
              </div>
              <div className={`p-2.5 rounded-md ${card.iconColor}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Stock Warnings */}
      <div className={`rounded-xl border p-6 transition-colors
        ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Kritik Stok Uyarıları
        </h3>
        {stats?.critical_stock_products?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${dark ? 'border-surface-700 text-surface-300' : 'border-surface-200 text-surface-600'}`}>
                  <th className="text-left py-3 px-4 font-medium">Ürün</th>
                  <th className="text-left py-3 px-4 font-medium">Kategori</th>
                  <th className="text-center py-3 px-4 font-medium">Stok</th>
                  <th className="text-center py-3 px-4 font-medium">Kritik Seviye</th>
                  <th className="text-center py-3 px-4 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {stats.critical_stock_products.map(product => (
                  <tr key={product.id} className={`border-b transition-colors
                    ${dark ? 'border-surface-800 hover:bg-surface-800/50' : 'border-surface-100 hover:bg-surface-50'}`}>
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4">{product.category || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold
                        ${product.stock_quantity === 0
                          ? 'bg-red-500/15 text-red-500'
                          : 'bg-amber-500/15 text-amber-500'
                        }`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">{product.critical_level}</td>
                    <td className="py-3 px-4 text-center">
                      {product.stock_quantity === 0
                        ? <span className="text-red-500 font-semibold text-xs">Tükendi</span>
                        : <span className="text-amber-500 font-semibold text-xs">Düşük</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={`text-center py-8 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>
            Stok seviyeleri normal. Kritik ürün bulunmuyor.
          </p>
        )}
      </div>
    </div>
  );
}

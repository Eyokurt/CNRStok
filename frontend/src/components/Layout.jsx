import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  )},
  { to: '/customers', label: 'Müşteriler', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { to: '/products', label: 'Stok', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )},
  { to: '/invoices/new', label: 'Fatura Kes', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )},
  { to: '/invoices', label: 'Faturalar', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
  { to: '/vehicles', label: 'Arac Kabul', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11v5a1 1 0 001 1h1m16-6v5a1 1 0 01-1 1h-1M3 11h18" />
    </svg>
  )},
  { to: '/settings', label: 'Ayarlar', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
];

export default function Layout({ user, onLogout }) {
  const { dark, toggle } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`w-64 flex-shrink-0 flex flex-col border-r transition-colors duration-300
        ${dark ? 'bg-surface-900 border-surface-800 text-surface-100' : 'bg-white border-surface-200 text-surface-800'}`}>
        
        {/* Logo */}
        <div className={`px-6 py-5 border-b ${dark ? 'border-surface-800' : 'border-surface-200'}`}>
          <h1 className="text-xl font-bold">
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              StokTakip
            </span>
          </h1>
          <p className={`text-xs mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>Fatura Yönetim Sistemi</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/invoices'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 transform
                ${isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 scale-[1.02]'
                  : dark
                    ? 'text-surface-300 hover:bg-surface-800 hover:text-white hover:translate-x-1'
                    : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900 hover:translate-x-1'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer: User + Theme */}
        <div className={`px-4 py-4 border-t space-y-2 ${dark ? 'border-surface-800' : 'border-surface-200'}`}>
          {/* User info */}
          {user && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg
              ${dark ? 'bg-surface-800/50' : 'bg-surface-50'}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                {user.business_name && (
                  <p className={`text-xs truncate ${dark ? 'text-surface-400' : 'text-surface-500'}`}>{user.business_name}</p>
                )}
              </div>
              <button onClick={onLogout} title="Çıkış Yap"
                className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${dark
                ? 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200 hover:text-surface-900'
              }`}
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {dark ? 'Açık Mod' : 'Koyu Mod'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto transition-colors duration-300
        ${dark ? 'bg-surface-950 text-surface-100' : 'bg-surface-50 text-surface-800'}`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import InvoiceCreate from './pages/InvoiceCreate';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';
import VehicleReception from './pages/VehicleReception';

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setChecking(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (checking) return null;

  return (
    <ThemeProvider>
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-surface-800 dark:text-white',
        duration: 3000,
      }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          } />
          <Route path="/" element={
            <ProtectedRoute user={user}>
              <Layout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="invoices/new" element={<InvoiceCreate />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="vehicles" element={<VehicleReception />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

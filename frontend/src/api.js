import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ─── JWT Token Interceptor ─────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → Login'e yönlendir
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────
export const authLogin = (data) => api.post('/auth/login', data);
export const authRegister = (data) => api.post('/auth/register', data);
export const authMe = () => api.get('/auth/me');

// ─── Customers ──────────────────────────────────────────
export const getCustomers = () => api.get('/customers/');
export const searchCustomers = (q) => api.get(`/customers/search?q=${encodeURIComponent(q)}`);
export const createCustomer = (data) => api.post('/customers/', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// ─── Products ───────────────────────────────────────────
export const getProducts = (category) => api.get('/products/', { params: category ? { category } : {} });
export const searchProducts = (q) => api.get(`/products/search?q=${encodeURIComponent(q)}`);
export const createProduct = (data) => api.post('/products/', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getProductHistory = (id) => api.get(`/products/${id}/history`);

// ─── Invoices ───────────────────────────────────────────
export const getInvoices = () => api.get('/invoices/');
export const createInvoice = (data) => api.post('/invoices/', data);

// ─── Dashboard ──────────────────────────────────────────
export const getDashboard = () => api.get('/dashboard/');

// ─── Settings ───────────────────────────────────────────
export const getSettings = () => api.get('/settings/');
export const updateSettings = (data) => api.put('/settings/', data);

// ─── Vehicle Reception ─────────────────────────────────
export const getVehicles = (status, search) => {
  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;
  return api.get('/vehicles/', { params });
};
export const getVehicle = (id) => api.get(`/vehicles/${id}`);
export const createVehicle = (data) => api.post('/vehicles/', data);
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`);
export const uploadVehiclePhotos = (id, files) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  return api.post(`/vehicles/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const deleteVehiclePhoto = (receptionId, photoId) => api.delete(`/vehicles/${receptionId}/photos/${photoId}`);

export default api;

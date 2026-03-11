import { useState, useEffect } from 'react';
import { getInvoices } from '../api';
import api from '../api';
import { useTheme } from '../ThemeContext';
import { toast } from 'react-hot-toast';

export default function Invoices() {
  const { dark } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices()
      .then(r => setInvoices(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPdf = async (id, invoiceNumber) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF indirilemedi');
    }
  };

  const handlePrint = (id) => {
    const token = localStorage.getItem('token');
    const printUrl = `/api/invoices/${id}/pdf?token=${token}`;
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-primary-500 text-lg">Yükleniyor...</div></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Faturalar</h2>
        <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>{invoices.length} fatura kaydı</p>
      </div>

      <div className={`rounded-xl border overflow-hidden ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${dark ? 'border-surface-700 bg-surface-800/50 text-surface-300' : 'border-surface-200 bg-surface-50 text-surface-600'}`}>
                <th className="text-left py-3 px-4 font-medium">Fatura No</th>
                <th className="text-left py-3 px-4 font-medium">Müşteri</th>
                <th className="text-right py-3 px-4 font-medium">Ara Toplam</th>
                <th className="text-right py-3 px-4 font-medium">İskonto</th>
                <th className="text-right py-3 px-4 font-medium">KDV</th>
                <th className="text-right py-3 px-4 font-medium">Toplam</th>
                <th className="text-left py-3 px-4 font-medium">Tarih</th>
                <th className="text-center py-3 px-4 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className={`border-b transition-colors
                  ${dark ? 'border-surface-800 hover:bg-surface-800/50' : 'border-surface-100 hover:bg-surface-50'}`}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-primary-400">{inv.invoice_number}</td>
                  <td className="py-3 px-4 font-medium">{inv.customer_name || `#${inv.customer_id}`}</td>
                  <td className="py-3 px-4 text-right">₺{inv.subtotal.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-amber-400">-₺{inv.discount_amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">+₺{inv.kdv_amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-bold">₺{inv.total.toFixed(2)}</td>
                  <td className="py-3 px-4 text-xs">{new Date(inv.created_at).toLocaleDateString('tr-TR')}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                        className="px-3 py-1.5 bg-primary-600/15 text-primary-400 hover:bg-primary-600/25 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                        title="PDF İndir">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        PDF
                      </button>
                      <button onClick={() => handlePrint(inv.id)}
                        className="px-3 py-1.5 bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                        title="Yazdır">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Yazdır
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan="8" className={`py-8 text-center ${dark ? 'text-surface-300' : 'text-surface-700'}`}>Henüz fatura kesilmemiş</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { searchCustomers, searchProducts, createInvoice } from '../api';
import { useTheme } from '../ThemeContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function InvoiceCreate() {
  const { dark } = useTheme();
  const navigate = useNavigate();

  // Customer autocomplete state
  const [plateSearch, setPlateSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // Invoice state
  const [items, setItems] = useState([]);
  const [extras, setExtras] = useState([]);
  const [discountRate, setDiscountRate] = useState(0);
  const [kdvRate, setKdvRate] = useState(18);
  const [submitting, setSubmitting] = useState(false);

  // Extra item form
  const [extraDesc, setExtraDesc] = useState('');
  const [extraPrice, setExtraPrice] = useState('');
  const [extraQty, setExtraQty] = useState(1);

  // ─── PLAKA / İŞYERİ AUTOCOMPLETE ─────
  useEffect(() => {
    if (plateSearch.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(() => {
      searchCustomers(plateSearch)
        .then(res => { setSuggestions(res.data); setShowSuggestions(true); })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [plateSearch]);

  // ─── ÜRÜN AUTOCOMPLETE ───────────────
  useEffect(() => {
    if (productSearch.length < 1) { setProductSuggestions([]); return; }
    const timer = setTimeout(() => {
      searchProducts(productSearch)
        .then(res => { setProductSuggestions(res.data); setShowProductSuggestions(true); })
        .catch(() => setProductSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setPlateSearch(customer.plate_number);
    setShowSuggestions(false);
  };

  const addProduct = (product) => {
    const exists = items.find(i => i.product_id === product.id);
    if (exists) {
      setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        product_id: product.id, name: product.name,
        unit_price: product.unit_price, stock_available: product.stock_quantity, quantity: 1
      }]);
    }
    setProductSearch('');
    setShowProductSuggestions(false);
  };

  const updateQty = (productId, qty) => {
    if (qty < 1) return;
    setItems(items.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const removeItem = (productId) => setItems(items.filter(i => i.product_id !== productId));

  // ─── EKSTRA KALEM ─────────────────────
  const addExtra = () => {
    const desc = extraDesc.trim() || 'İşçilik';
    if (!extraPrice) return;
    setExtras([...extras, {
      id: Date.now(),
      description: desc,
      unit_price: parseFloat(extraPrice),
      quantity: extraQty || 1
    }]);
    setExtraDesc('');
    setExtraPrice('');
    setExtraQty(1);
  };

  const removeExtra = (id) => setExtras(extras.filter(e => e.id !== id));

  // Calculations
  const productSubtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const extrasSubtotal = extras.reduce((sum, e) => sum + e.unit_price * e.quantity, 0);
  const subtotal = productSubtotal + extrasSubtotal;
  const discountAmount = subtotal * (discountRate / 100);
  const afterDiscount = subtotal - discountAmount;
  const kdvAmount = afterDiscount * (kdvRate / 100);
  const total = afterDiscount + kdvAmount;

  const handleSubmit = async () => {
    if (!selectedCustomer) { toast.error('Lütfen müşteri seçin'); return; }
    if (items.length === 0 && extras.length === 0) { toast.error('Lütfen en az bir kalem ekleyin'); return; }

    for (const item of items) {
      if (item.quantity > item.stock_available) {
        toast.error(`"${item.name}" için yetersiz stok! Mevcut: ${item.stock_available}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        discount_rate: discountRate,
        kdv_rate: kdvRate,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        extras: extras.map(e => ({ description: e.description, unit_price: e.unit_price, quantity: e.quantity }))
      };
      await createInvoice(payload);
      toast.success('Fatura başarıyla oluşturuldu!');
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fatura oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500
    ${dark ? 'bg-surface-800 border-surface-700 text-white placeholder-surface-300' : 'bg-white border-surface-300 text-surface-900 placeholder-surface-700'}`;
  const cardCls = `rounded-xl border p-6 transition-colors ${dark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'}`;

  const hasItems = items.length > 0 || extras.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Yeni Fatura</h2>
        <p className={`text-sm mt-1 ${dark ? 'text-surface-300' : 'text-surface-700'}`}>Müşteri ve ürün bilgilerini girerek fatura oluşturun</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Panel — Müşteri + Ürünler + Ekstralar */}
        <div className="lg:col-span-2 space-y-6">

          {/* Müşteri Seçimi */}
          <div className={cardCls}>
            <h3 className="text-lg font-semibold mb-4">Müşteri Bilgileri</h3>
            <div className="relative">
              <input type="text" placeholder="Plaka veya İşyeri adı yazın..."
                value={plateSearch}
                onChange={e => { setPlateSearch(e.target.value.toUpperCase()); setSelectedCustomer(null); }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className={inputCls} />
              {showSuggestions && suggestions.length > 0 && (
                <div className={`absolute z-30 w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto animate-slide-down
                  ${dark ? 'bg-surface-800 border-surface-700' : 'bg-white border-surface-200'}`}>
                  {suggestions.map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors
                        ${dark ? 'hover:bg-surface-700' : 'hover:bg-surface-50'}`}>
                      <div>
                        <span className="font-medium">{c.business_name}</span>
                        <span className={`ml-2 text-xs ${dark ? 'text-surface-300' : 'text-surface-700'}`}>{c.address}</span>
                      </div>
                      <span className="bg-primary-500/15 text-primary-400 px-2 py-0.5 rounded text-xs font-bold">{c.plate_number}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className={`mt-4 p-4 rounded-lg border animate-fade-in
                ${dark ? 'bg-surface-800/50 border-surface-700' : 'bg-primary-50 border-primary-200'}`}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="opacity-60">İşyeri:</span> <span className="font-medium">{selectedCustomer.business_name}</span></div>
                  <div><span className="opacity-60">Plaka:</span> <span className="font-bold text-primary-400">{selectedCustomer.plate_number}</span></div>
                  <div><span className="opacity-60">Vergi Dairesi:</span> {selectedCustomer.tax_office || '—'}</div>
                  <div><span className="opacity-60">Vergi No:</span> {selectedCustomer.tax_number || '—'}</div>
                  <div><span className="opacity-60">Telefon:</span> {selectedCustomer.phone || '—'}</div>
                  <div className="col-span-2"><span className="opacity-60">Adres:</span> {selectedCustomer.address || '—'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Ürün Ekleme */}
          <div className={cardCls}>
            <h3 className="text-lg font-semibold mb-4">Ürünler</h3>
            <div className="relative mb-4">
              <input type="text" placeholder="Ürün adı veya barkod ile ara..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onFocus={() => productSuggestions.length > 0 && setShowProductSuggestions(true)}
                className={inputCls} />
              {showProductSuggestions && productSuggestions.length > 0 && (
                <div className={`absolute z-30 w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto animate-slide-down
                  ${dark ? 'bg-surface-800 border-surface-700' : 'bg-white border-surface-200'}`}>
                  {productSuggestions.map(p => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors
                        ${dark ? 'hover:bg-surface-700' : 'hover:bg-surface-50'}`}>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {p.barcode && <span className={`ml-2 text-xs font-mono ${dark ? 'text-surface-300' : 'text-surface-700'}`}>{p.barcode}</span>}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary-400">₺{p.unit_price.toFixed(2)}</span>
                        <span className={`ml-2 text-xs ${p.stock_quantity <= p.critical_level ? 'text-amber-400' : dark ? 'text-surface-300' : 'text-surface-700'}`}>
                          Stok: {p.stock_quantity}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ürün listesi */}
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${dark ? 'border-surface-700 text-surface-300' : 'border-surface-200 text-surface-600'}`}>
                      <th className="text-left py-2 px-3 font-medium">Ürün</th>
                      <th className="text-center py-2 px-3 font-medium">Miktar</th>
                      <th className="text-right py-2 px-3 font-medium">Birim</th>
                      <th className="text-right py-2 px-3 font-medium">Toplam</th>
                      <th className="text-center py-2 px-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.product_id} className={`border-b ${dark ? 'border-surface-800' : 'border-surface-100'}`}>
                        <td className="py-2 px-3 font-medium">{item.name}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => updateQty(item.product_id, item.quantity - 1)}
                              className={`w-7 h-7 rounded-md text-xs font-bold transition-colors
                                ${dark ? 'bg-surface-700 hover:bg-surface-600 text-white' : 'bg-surface-200 hover:bg-surface-300'}`}>−</button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <button onClick={() => updateQty(item.product_id, item.quantity + 1)}
                              className={`w-7 h-7 rounded-md text-xs font-bold transition-colors
                                ${dark ? 'bg-surface-700 hover:bg-surface-600 text-white' : 'bg-surface-200 hover:bg-surface-300'}`}>+</button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">₺{item.unit_price.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-medium">₺{(item.unit_price * item.quantity).toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">
                          <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-300">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {items.length === 0 && (
              <p className={`text-center py-4 text-sm ${dark ? 'text-surface-300' : 'text-surface-700'}`}>
                Henüz ürün eklenmedi. Yukarıdan ürün arayarak ekleyin.
              </p>
            )}
          </div>

          {/* Ekstra Kalemler */}
          <div className={cardCls}>
            <h3 className="text-lg font-semibold mb-4">Ekstra Kalemler</h3>
            <p className={`text-xs mb-4 ${dark ? 'text-surface-400' : 'text-surface-500'}`}>
              İşçilik, servis, nakliye gibi stok dışı kalemleri ekleyin
            </p>

            {/* Ekstra ekleme formu */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <input type="text" placeholder="Açıklama (Boş bırakılırsa: İşçilik)"
                  value={extraDesc} onChange={e => setExtraDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExtra()}
                  className={inputCls} />
              </div>
              <div className="w-24">
                <input type="number" placeholder="Adet" min="1"
                  value={extraQty} onChange={e => setExtraQty(parseInt(e.target.value) || 1)}
                  className={`text-center ${inputCls}`} />
              </div>
              <div className="w-32">
                <input type="number" placeholder="Tutar (₺)" min="0" step="0.01"
                  value={extraPrice} onChange={e => setExtraPrice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExtra()}
                  className={inputCls} />
               </div>
              <button onClick={addExtra}
                disabled={!extraPrice}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                  ${!extraPrice
                    ? 'bg-surface-700 text-surface-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                + Ekle
              </button>
            </div>

            {/* Ekstra listesi */}
            {extras.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${dark ? 'border-surface-700 text-surface-300' : 'border-surface-200 text-surface-600'}`}>
                      <th className="text-left py-2 px-3 font-medium">Açıklama</th>
                      <th className="text-center py-2 px-3 font-medium">Adet</th>
                      <th className="text-right py-2 px-3 font-medium">Birim</th>
                      <th className="text-right py-2 px-3 font-medium">Toplam</th>
                      <th className="text-center py-2 px-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extras.map(extra => (
                      <tr key={extra.id} className={`border-b ${dark ? 'border-surface-800' : 'border-surface-100'}`}>
                        <td className="py-2 px-3">
                          <span className="font-medium">{extra.description}</span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>ekstra</span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold">{extra.quantity}</td>
                        <td className="py-2 px-3 text-right">₺{extra.unit_price.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-medium">₺{(extra.unit_price * extra.quantity).toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">
                          <button onClick={() => removeExtra(extra.id)} className="text-red-400 hover:text-red-300">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sağ Panel — Özet */}
        <div className="space-y-6">
          <div className={`${cardCls} sticky top-6`}>
            <h3 className="text-lg font-semibold mb-4">Fatura Özeti</h3>
            
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">İskonto (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={discountRate}
                  onChange={e => setDiscountRate(parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">KDV (%)</label>
                <input type="number" min="0" max="100" step="1" value={kdvRate}
                  onChange={e => setKdvRate(parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
            </div>

            <div className={`space-y-2.5 text-sm pt-4 border-t ${dark ? 'border-surface-700' : 'border-surface-200'}`}>
              {productSubtotal > 0 && (
                <div className="flex justify-between opacity-60">
                  <span>Ürünler</span>
                  <span>₺{productSubtotal.toFixed(2)}</span>
                </div>
              )}
              {extrasSubtotal > 0 && (
                <div className="flex justify-between opacity-60">
                  <span>Ekstralar</span>
                  <span>₺{extrasSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="opacity-70">Ara Toplam</span>
                <span className="font-medium">₺{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>İskonto (%{discountRate})</span>
                <span>-₺{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-primary-400">
                <span>KDV (%{kdvRate})</span>
                <span>+₺{kdvAmount.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-xl font-bold pt-3 border-t ${dark ? 'border-surface-700' : 'border-surface-200'}`}>
                <span>TOPLAM</span>
                <span className="text-primary-400">₺{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedCustomer || !hasItems}
              className={`w-full mt-6 py-3 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg
                ${submitting || !selectedCustomer || !hasItems
                  ? 'bg-surface-700 text-surface-300 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/25 hover:shadow-primary-600/40'
                }`}
            >
              {submitting ? 'Oluşturuluyor...' : 'Faturayı Oluştur'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

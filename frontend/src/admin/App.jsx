import { useEffect, useState } from 'react';
import { api } from '../api.js';

const money = (value) => `Rp${Number(value).toLocaleString('id-ID')}`;
const STATUSES = [['baru', 'Baru'], ['diproses', 'Diproses'], ['siap_diambil', 'Siap diambil'], ['selesai', 'Selesai'], ['dibatalkan', 'Dibatalkan']];
const EMPTY_FORM = { id: '', name: '', category: '', description: '', imageUrl: '', active: true };

function AdminHeader() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="wordmark" href="/">Alikha <span>Bakery</span></a>
        <a href="/" className="back-link">Lihat toko</a>
      </div>
    </header>
  );
}

function Login({ onLogin }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('Memeriksa akses...');
    setBusy(true);
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: event.currentTarget.elements.password.value }) });
      event.currentTarget.reset();
      onLogin();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="wrap admin-main">
        <section className="login-panel" aria-labelledby="login-title">
          <p className="eyebrow">Area pengelola</p>
          <h1 id="login-title">Masuk ke admin</h1>
          <form onSubmit={submit} className="admin-form">
            <label htmlFor="admin-password">Kata sandi admin</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
            <button className="button" type="submit" disabled={busy}>Masuk</button>
            <p className="form-message" role="status" aria-live="polite">{message}</p>
          </form>
        </section>
      </main>
    </>
  );
}

function OrderRow({ order, onStatusChange }) {
  const statusName = STATUSES.find(([value]) => value === order.status)?.[1] || order.status;
  return (
    <article className="order-row">
      <div className="order-row__top">
        <div>
          <h3>{order.code} · {order.customerName}</h3>
          <p className="order-meta">{order.customerPhone} · {new Date(order.createdAt).toLocaleString('id-ID')}</p>
        </div>
        <span className="status-label" data-status={order.status}>{statusName}</span>
      </div>
      <div className="order-items">
        {order.items.map((item, index) => (
          <p key={index}>{item.name} × {item.quantity} · {money(item.subtotal)}</p>
        ))}
        <p style={{ fontWeight: 700 }}>Total: {money(order.total)}</p>
        {order.note ? <p className="order-meta">Catatan: {order.note}</p> : null}
      </div>
      <div className="order-actions">
        <label htmlFor={`status-${order.id}`}>Status pesanan</label>
        <select id={`status-${order.id}`} value={order.status} onChange={(event) => onStatusChange(order, event.target.value)}>
          {STATUSES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
      </div>
    </article>
  );
}

function ProductRow({ product, onEdit, onToggle }) {
  return (
    <article className="admin-product">
      <div className="admin-product__top">
        <div>
          <h3>{product.name}</h3>
          <p className="order-meta">{product.category} · {money(product.price)} · {product.active ? 'Tampil' : 'Disembunyikan'}</p>
        </div>
        <div className="admin-product__actions">
          <button className="button button--outline" type="button" onClick={() => onEdit(product)}>Ubah</button>
          <button className="button button--outline" type="button" onClick={() => onToggle(product)}>{product.active ? 'Sembunyikan' : 'Tampilkan'}</button>
        </div>
      </div>
      {product.description ? <p className="order-meta">{product.description}</p> : null}
    </article>
  );
}

function Dashboard({ onLogout }) {
  const [orders, setOrders] = useState(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState(null);
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [productMessage, setProductMessage] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadOrders(q = '') {
    try {
      const data = await api(`/api/admin/orders?q=${encodeURIComponent(q)}`);
      setOrders(data.orders);
    } catch (error) {
      setOrders([]);
      setDashboardMessage(error.message);
    }
  }

  async function loadProducts() {
    try {
      const data = await api('/api/admin/products');
      setProducts(data.products);
    } catch (error) {
      setProducts([]);
      setProductMessage(error.message);
    }
  }

  useEffect(() => { loadOrders(); loadProducts(); }, []);

  async function changeStatus(order, status) {
    setDashboardMessage('');
    try {
      await api(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadOrders(query);
    } catch (error) {
      setDashboardMessage(error.message);
    }
  }

  async function toggleProduct(product) {
    setProductMessage('');
    try {
      await api('/api/admin/products', { method: 'PUT', body: JSON.stringify({ ...product, active: !product.active }) });
      await loadProducts();
    } catch (error) {
      setProductMessage(error.message);
    }
  }

  function editProduct(product) {
    setForm({ id: product.id, name: product.name, category: product.category, description: product.description, imageUrl: product.imageUrl, active: product.active });
    setFile(null);
    setPreview(product.imageUrl);
    document.getElementById('product-name')?.focus();
  }

  function resetProductForm() {
    setForm(EMPTY_FORM);
    setFile(null);
    setPreview('');
    setProductMessage('');
  }

  function onFileChange(event) {
    const picked = event.target.files?.[0] || null;
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(picked ? URL.createObjectURL(picked) : '');
  }

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: key === 'active' ? event.target.checked : event.target.value }));

  async function submitProduct(event) {
    event.preventDefault();
    setProductMessage('');
    const formEl = event.currentTarget;
    if (!form.name.trim() || !form.category.trim()) { setProductMessage('Lengkapi nama dan kategori.'); return; }
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (file) {
        const uploaded = await api('/api/admin/uploads', { method: 'POST', body: file });
        imageUrl = uploaded.url;
      }
      await api('/api/admin/products', { method: form.id ? 'PUT' : 'POST', body: JSON.stringify({ ...form, imageUrl, price: Number(form.price) }) });
      resetProductForm();
      formEl.reset();
      setProductMessage('Produk tersimpan.');
      await loadProducts();
    } catch (error) {
      setProductMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="wrap admin-main">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">Ruang kerja</p>
            <h1>Pesanan dan produk</h1>
          </div>
          <button className="button button--outline" type="button" onClick={onLogout}>Keluar</button>
        </div>
        <p className="form-message" role="status" aria-live="polite">{dashboardMessage}</p>

        <section className="admin-section" aria-labelledby="orders-title">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">Tindak lanjut pembeli</p>
              <h2 id="orders-title">Pesanan</h2>
            </div>
            <button className="button button--outline" type="button" onClick={() => loadOrders(query)}>Muat ulang</button>
          </div>
          <label htmlFor="order-search">Cari kode, nama, atau nomor WhatsApp</label>
          <input id="order-search" type="search" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); loadOrders(event.target.value); }} />
          <div className="orders-list" aria-live="polite">
            {orders === null ? <p>Memuat pesanan...</p> : null}
            {orders !== null && !orders.length ? <p className="empty-copy">{query ? 'Tidak ada pesanan yang cocok dengan pencarian.' : 'Belum ada pesanan masuk. Pesanan pelanggan akan muncul di sini setelah dikirim.'}</p> : null}
            {orders !== null && orders.map((order) => <OrderRow key={order.id} order={order} onStatusChange={changeStatus} />)}
          </div>
        </section>

        <section className="admin-section" aria-labelledby="products-title">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">Katalog toko</p>
              <h2 id="products-title">Produk</h2>
            </div>
          </div>
          <form className="product-form" onSubmit={submitProduct}>
            <label htmlFor="product-name">Nama produk</label>
            <input id="product-name" value={form.name} onChange={update('name')} maxLength={100} required />
            <label htmlFor="product-category">Kategori</label>
            <input id="product-category" value={form.category} onChange={update('category')} maxLength={50} placeholder="Kue atau cookies" required />
            <label htmlFor="product-price">Harga (Rupiah)</label>
            <input id="product-price" type="number" min={1} max={100000000} step={1} inputMode="numeric" value={form.price} onChange={update('price')} required />
            <label htmlFor="product-description">Deskripsi</label>
            <textarea id="product-description" rows={3} maxLength={500} value={form.description} onChange={update('description')} />
            <label htmlFor="product-image">Foto produk (opsional, JPG/PNG/WebP, maks 5 MB)</label>
            <input id="product-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
            {preview ? <img className="product-preview" src={preview} alt={form.name ? `Pratinjau ${form.name}` : 'Pratinjau produk'} width={160} height={120} /> : null}
            <label className="checkbox-row">
              <input type="checkbox" checked={form.active} onChange={update('active')} /> Tampilkan di katalog
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : form.id ? 'Simpan perubahan' : 'Simpan produk'}</button>
              {form.id ? <button className="button button--outline" type="button" onClick={resetProductForm}>Batalkan edit</button> : null}
            </div>
            <p className="form-message" role="status" aria-live="polite">{productMessage}</p>
          </form>
          <div className="products-list" aria-live="polite">
            {products === null ? <p>Memuat produk...</p> : null}
            {products !== null && !products.length ? <p className="empty-copy">Katalog masih kosong. Tambahkan produk nyata untuk mulai menerima pesanan.</p> : null}
            {products !== null && products.map((product) => <ProductRow key={product.id} product={product} onEdit={editProduct} onToggle={toggleProduct} />)}
          </div>
        </section>
      </main>
    </>
  );
}

export function App() {
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    api('/api/admin/me').then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return <main className="wrap admin-main"><p>Memeriksa sesi...</p></main>;
  }
  return authed
    ? <Dashboard onLogout={async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); setAuthed(false); }} />
    : <Login onLogin={() => setAuthed(true)} />;
}

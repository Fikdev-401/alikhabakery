import { useEffect, useState } from 'react';
import { api } from '../api.js';

const money = (value) => `Rp${Number(value).toLocaleString('id-ID')}`;

function Header() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="skip-link" href="#produk">Langsung ke katalog</a>
        <a className="wordmark" href="#top" aria-label="Alikha Bakery, kembali ke atas">Alikha <span>Bakery</span></a>
        <nav aria-label="Navigasi utama">
          <a href="#produk">Produk</a>
          <a href="#lokasi">Lokasi</a>
          <a className="admin-link" href="/admin.html">Admin</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-image">
        <img src="/assets/img/photo-f10324991.webp" alt="Cookies panggang tersusun di atas loyang" width="1280" height="962" fetchPriority="high" data-source="stand-in" data-subject="stand-in" />
      </div>
      <div className="wrap hero-copy">
        <p className="eyebrow">Alikha Bakery · Ciranjang, Cianjur</p>
        <h1 id="hero-title">Kue dan cookies di Ciranjang</h1>
        <p className="hero-lead">Pilih dari katalog Alikha Bakery, lalu lanjutkan pesanan melalui WhatsApp.</p>
        <a className="button" href="#pesan">Pesan lewat WhatsApp</a>
      </div>
    </section>
  );
}

function ProductCard({ product, quantity, onChange }) {
  const brokenImage = (event) => event.currentTarget.closest('.product-card__image')?.classList.add('is-broken');
  const dec = () => onChange(product.id, Math.max(0, quantity - 1));
  const inc = () => onChange(product.id, Math.min(99, quantity + 1));
  return (
    <article className="product-card">
      {product.imageUrl ? (
        <div className="product-card__image">
          <img src={product.imageUrl} alt={product.name} loading="lazy" width="600" height="450" onError={brokenImage} />
        </div>
      ) : null}
      <div className="product-card__body">
        <p>{product.category}</p>
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        <p className="product-price">{money(product.price)}</p>
        <div className="quantity-control">
          <button type="button" onClick={dec} aria-label={`Kurangi ${product.name}`}>−</button>
          <output aria-label={`Jumlah ${product.name}`}>{quantity}</output>
          <button type="button" onClick={inc} aria-label={`Tambah ${product.name}`}>+</button>
        </div>
      </div>
    </article>
  );
}

function CatalogSection({ products, status, onRetry, quantities, setQuantity }) {
  const statusText = status === 'loading' ? 'Memuat katalog.' : status === 'error' ? 'Terjadi kesalahan saat memuat katalog.' : products.length ? `${products.length} produk tersedia.` : 'Katalog belum memiliki produk.';
  return (
    <section className="catalog section" id="produk" aria-labelledby="catalog-title">
      <div className="wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pilihan Alikha Bakery</p>
            <h2 id="catalog-title">Katalog kue dan cookies</h2>
          </div>
          <p className="section-intro">Harga mengikuti katalog Alikha Bakery.</p>
        </div>
        <p className="sr-only" role="status" aria-live="polite">{statusText}</p>
        {status === 'loading' ? <p className="loading-copy">Memuat katalog...</p> : null}
        {status === 'error' ? (
          <div className="error-state">
            <h3>Katalog belum dapat dimuat</h3>
            <p>Periksa koneksi, lalu coba muat ulang katalog.</p>
            <button className="button button--outline" type="button" onClick={onRetry}>Coba lagi</button>
          </div>
        ) : null}
        {status === 'ready' && !products.length ? (
          <div className="empty-state">
            <span className="empty-mark" aria-hidden="true">A</span>
            <h3>Menu sedang disiapkan</h3>
            <p>Produk akan muncul di sini setelah katalog Alikha Bakery diperbarui.</p>
          </div>
        ) : null}
        <div className="product-grid" aria-busy={status === 'loading'} hidden={status !== 'ready' || !products.length}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} quantity={quantities[product.id] || 0} onChange={setQuantity} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OrderForm({ products, quantities, onOrdered }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const items = products.filter((product) => (quantities[product.id] || 0) > 0);
  const total = items.reduce((sum, product) => sum + product.price * quantities[product.id], 0);
  const count = items.reduce((sum, product) => sum + quantities[product.id], 0);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!items.length) { setMessage('Pilih produk sebelum mengirim pesanan.'); return; }
    setSending(true);
    try {
      const result = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          name: form.elements.name.value,
          phone: form.elements.phone.value,
          note: form.elements.note.value,
          items: items.map((product) => ({ productId: product.id, quantity: quantities[product.id] })),
        }),
      });
      form.reset();
      onOrdered();
      setMessage(result.whatsappUrl
        ? `Pesanan ${result.orderCode} tersimpan. WhatsApp dibuka untuk konfirmasi.`
        : `Pesanan ${result.orderCode} tersimpan. Admin akan melihat pesanan ini. WhatsApp toko belum dikonfigurasi.`);
      if (result.whatsappUrl) window.location.assign(result.whatsappUrl);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="order-form" onSubmit={submit} noValidate>
      <label htmlFor="customer-name">Nama</label>
      <input id="customer-name" name="name" autoComplete="name" maxLength={100} required />
      <label htmlFor="customer-phone">Nomor WhatsApp Anda</label>
      <input id="customer-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={24} required />
      <p className="field-hint">Nomor ini digunakan admin untuk menghubungi Anda terkait pesanan.</p>
      <div className="order-summary">
        <span>Produk dipilih</span>
        <strong>{count ? `${count} item · ${money(total)}` : 'Belum ada'}</strong>
      </div>
      <label htmlFor="order-note">Catatan pesanan <span>(opsional)</span></label>
      <textarea id="order-note" name="note" rows={3} maxLength={500} />
      <button className="button" type="submit" disabled={sending}>{sending ? 'Menyimpan pesanan...' : 'Kirim pesanan'}</button>
      <p className="form-message" role="status" aria-live="polite">{message}</p>
    </form>
  );
}

function OrderSection({ products, quantities, onOrdered }) {
  return (
    <section className="order-section section" id="pesan" aria-labelledby="order-title">
      <div className="wrap order-layout">
        <div className="order-copy">
          <p className="eyebrow">Pemesanan</p>
          <h2 id="order-title">Kirim pesanan ke Alikha Bakery</h2>
          <p>Isi kontak dan jumlah produk. Pesanan dicatat terlebih dahulu, lalu Anda dapat melanjutkan konfirmasi melalui WhatsApp.</p>
          <p className="no-payment">Pembayaran belum dilakukan melalui website.</p>
        </div>
        <OrderForm products={products} quantities={quantities} onOrdered={onOrdered} />
      </div>
    </section>
  );
}

function Closing() {
  return (
    <footer className="site-footer" id="lokasi">
      <div className="wrap footer-inner">
        <div>
          <p className="eyebrow">Lokasi toko</p>
          <h2>Alikha Bakery di Ciranjang</h2>
          <p>Ciranjang, Cianjur, Jawa Barat</p>
          <p className="visit-note">Alamat lengkap dan jam operasional akan ditambahkan setelah dikonfirmasi.</p>
          <a className="button" href="#pesan">Pesan lewat WhatsApp</a>
        </div>
        <div className="footer-meta">
          <a className="wordmark" href="#top">Alikha <span>Bakery</span></a>
          <a className="footer-credit" href="/credits.html">Kredit foto</a>
        </div>
      </div>
    </footer>
  );
}

export function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [quantities, setQuantities] = useState({});

  async function load() {
    setStatus('loading');
    try {
      const data = await api('/api/products');
      setProducts(data.products);
      setStatus('ready');
    } catch {
      setProducts([]);
      setStatus('error');
    }
  }
  useEffect(() => { load(); }, []);

  const setQuantity = (productId, quantity) => setQuantities((prev) => ({ ...prev, [productId]: quantity }));
  const resetQuantities = () => setQuantities({});

  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <CatalogSection products={products} status={status} onRetry={load} quantities={quantities} setQuantity={setQuantity} />
        <OrderSection products={products} quantities={quantities} onOrdered={resetQuantities} />
      </main>
      <Closing />
    </>
  );
}

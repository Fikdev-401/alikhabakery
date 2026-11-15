import express from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrisma } from './lib/prisma.js';
import { buildOrderLines, cleanPhone, validText, whatsappUrl, ORDER_STATUSES } from './lib/validate.js';
import { verifyPassword, createRateLimiter, newSessionToken, newOrderCode } from './lib/auth.js';
import { detectImageType, EXTENSION } from './lib/images.js';

const here = dirname(fileURLToPath(import.meta.url));
const uploadsDir = resolve(here, '../uploads');
const SESSION_MS = 8 * 60 * 60 * 1000;

function getCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

const publicProduct = (row) => ({ id: row.id, name: row.name, category: row.category, description: row.description, price: row.price, imageUrl: row.imageUrl || '' });
const adminProduct = (row) => ({ ...publicProduct(row), active: row.active });

function parseProductInput(input) {
  if (!validText(input.name, 100) || !validText(input.category, 50)) return { error: 'Lengkapi nama dan kategori produk.' };
  if (!Number.isSafeInteger(input.price) || input.price < 1 || input.price > 100_000_000) return { error: 'Harga harus berupa angka Rupiah yang valid.' };
  if (typeof input.description !== 'string' || input.description.length > 500) return { error: 'Deskripsi maksimal 500 karakter.' };
  const imageUrl = typeof input.imageUrl === 'string' ? input.imageUrl.trim() : '';
  // Lokal: hanya path unggahan dengan nama yang memang digenerate server; eksternal: HTTPS saja.
  const isUploadPath = /^\/uploads\/[0-9a-f]{32}\.(png|jpe?g|webp)$/.test(imageUrl);
  const isHttpsUrl = /^https:\/\//i.test(imageUrl) && imageUrl.length <= 1000;
  if (imageUrl && !isUploadPath && !isHttpsUrl) return { error: 'Foto harus hasil unggahan atau URL HTTPS.' };
  return {
    data: {
      name: input.name.trim(),
      category: input.category.trim(),
      description: input.description.trim(),
      price: input.price,
      imageUrl,
      active: input.active !== false,
    },
  };
}

export function createApp({ prisma = getPrisma(), env = process.env } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  mkdirSync(uploadsDir, { recursive: true });

  const sessions = new Map();
  const loginLimiter = createRateLimiter();

  function requireAdmin(req, res, next) {
    const token = getCookie(req, 'alikha_session');
    const session = token && sessions.get(token);
    if (!session || session.expires < Date.now()) {
      if (token) sessions.delete(token);
      return res.status(401).json({ error: 'Silakan masuk sebagai admin.' });
    }
    session.expires = Date.now() + SESSION_MS;
    next();
  }

  // Sesi memakai cookie SameSite=Strict; cek Origin menahan permintaan lintas situs ke endpoint yang mengubah data.
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next();
    const origin = req.headers.origin;
    if (origin) {
      const allowedHost = req.headers['x-forwarded-host'] || req.headers.host;
      try {
        if (new URL(origin).host !== allowedHost) return res.status(403).json({ error: 'Asal permintaan tidak diizinkan.' });
      } catch {
        return res.status(403).json({ error: 'Asal permintaan tidak diizinkan.' });
      }
    }
    next();
  });

  app.get('/api/products', async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
      res.json({ products: products.map(publicProduct) });
    } catch (err) { next(err); }
  });

  app.post('/api/orders', async (req, res, next) => {
    try {
      const { name, phone, note, items } = req.body || {};
      if (!validText(name, 100)) return res.status(400).json({ error: 'Nama wajib diisi, maksimal 100 karakter.' });
      const phoneDigits = cleanPhone(phone);
      if (!/^\d{8,15}$/.test(phoneDigits)) return res.status(400).json({ error: 'Masukkan nomor WhatsApp yang valid.' });
      const productIds = Array.isArray(items) ? [...new Set(items.map((item) => item?.productId))] : [];
      const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true }, select: { id: true, name: true, price: true } });
      const result = buildOrderLines(items, new Map(products.map((product) => [product.id, product])));
      if (result.error) return res.status(400).json({ error: result.error });
      const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';
      const code = newOrderCode();
      const order = await prisma.$transaction(async (tx) => tx.order.create({
        data: {
          code,
          customerName: name.trim(),
          customerPhone: phoneDigits,
          note: cleanNote || null,
          status: 'baru',
          total: result.total,
          items: { create: result.lines },
        },
        include: { items: true },
      }));
      res.status(201).json({
        orderCode: code,
        whatsappUrl: whatsappUrl(env.WHATSAPP_NUMBER, { code, customerName: order.customerName, note: cleanNote, total: order.total, items: order.items }),
      });
    } catch (err) { next(err); }
  });

  app.post('/api/admin/login', (req, res, next) => {
    try {
      const ip = req.socket.remoteAddress || 'unknown';
      if (!loginLimiter.check(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit.' });
      if (!verifyPassword(env.ALIKHA_ADMIN_PASSWORD, req.body?.password)) return res.status(401).json({ error: 'Kata sandi tidak cocok.' });
      loginLimiter.reset(ip);
      const token = newSessionToken();
      sessions.set(token, { expires: Date.now() + SESSION_MS });
      res.setHeader('set-cookie', `alikha_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${req.secure ? '; Secure' : ''}`);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = getCookie(req, 'alikha_session');
    if (token) sessions.delete(token);
    res.setHeader('set-cookie', 'alikha_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ authenticated: true }));

  // Unggahan foto produk: raw body (bukan multipart), tipe dicek dari magic bytes,
  // nama file digenerate server sehingga tidak ada jalur filename dari client.
  app.post('/api/admin/uploads', requireAdmin, express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb' }), async (req, res, next) => {
    try {
      const type = detectImageType(req.body);
      if (!type) return res.status(400).json({ error: 'File bukan gambar JPG, PNG, atau WebP yang valid.' });
      const name = `${randomBytes(16).toString('hex')}.${EXTENSION[type]}`;
      await writeFile(resolve(uploadsDir, name), req.body);
      res.status(201).json({ url: `/uploads/${name}` });
    } catch (err) { next(err); }
  });

  app.get('/api/admin/products', requireAdmin, async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ products: products.map(adminProduct) });
    } catch (err) { next(err); }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
    try {
      const { error, data } = parseProductInput(req.body || {});
      if (error) return res.status(400).json({ error });
      const product = await prisma.product.create({ data: { ...data, active: true } });
      res.status(201).json({ product: adminProduct(product) });
    } catch (err) { next(err); }
  });

  app.put('/api/admin/products', requireAdmin, async (req, res, next) => {
    try {
      const input = req.body || {};
      if (typeof input.id !== 'string') return res.status(400).json({ error: 'ID produk tidak valid.' });
      const { error, data } = parseProductInput(input);
      if (error) return res.status(400).json({ error });
      const product = await prisma.product.update({ where: { id: input.id }, data });
      res.json({ product: adminProduct(product) });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan.' });
      next(err);
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim().slice(0, 100);
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true },
        where: q ? {
          OR: [
            { code: { contains: q } },
            { customerName: { contains: q } },
            { customerPhone: { contains: q } },
          ],
        } : undefined,
      });
      res.json({
        orders: orders.map((order) => ({
          id: order.id,
          code: order.code,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          note: order.note || '',
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          items: order.items.map((item) => ({ productId: item.productId, name: item.name, unitPrice: item.unitPrice, quantity: item.quantity, subtotal: item.subtotal })),
        })),
      });
    } catch (err) { next(err); }
  });

  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res, next) => {
    try {
      const { status } = req.body || {};
      if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Status pesanan tidak valid.' });
      await prisma.order.update({ where: { id: req.params.id }, data: { status } });
      res.json({ ok: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      next(err);
    }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

  app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', setHeaders: (res) => res.setHeader('x-content-type-options', 'nosniff') }));

  // Produksi: backend juga menyajikan hasil build frontend (frontend/dist) bila ada.
  const distDir = resolve(here, '../../frontend/dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir, { setHeaders: (res, filePath) => { if (filePath.endsWith('.html')) res.setHeader('cache-control', 'no-cache'); } }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const lastSegment = req.path.split('/').pop() || '';
      // Path ber-ekstensi (aset yang tidak ada) tetap 404, bukan dialihkan ke index.html.
      if (lastSegment.includes('.')) return next();
      res.sendFile(resolve(distDir, 'index.html'));
    });
  }
  app.use((req, res) => res.status(404).json({ error: 'Halaman tidak ditemukan.' }));

  app.use((err, req, res, next) => {
    if (res.headersSent) return;
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Format data tidak valid.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Ukuran data terlalu besar.' });
    const status = err.status || err.statusCode;
    if (status && status < 500) return res.status(status).json({ error: err.message || 'Permintaan tidak valid.' });
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  });

  return app;
}

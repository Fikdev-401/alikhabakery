import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderLines, cleanPhone, whatsappUrl } from '../src/lib/validate.js';
import { verifyPassword, createRateLimiter, newOrderCode } from '../src/lib/auth.js';

const catalog = new Map([['p1', { id: 'p1', name: 'Cookies Cokelat', price: 25000 }]]);

test('buildOrderLines recalculates prices from the catalog and rejects bad input', () => {
  const ok = buildOrderLines([{ productId: 'p1', quantity: 2, price: 1 }], catalog);
  assert.equal(ok.total, 50000);
  assert.equal(ok.lines[0].unitPrice, 25000);
  assert.equal(buildOrderLines([], catalog).error, 'Pilih setidaknya satu produk.');
  assert.ok(buildOrderLines([{ productId: 'p1', quantity: 0 }], catalog).error);
  assert.ok(buildOrderLines([{ productId: 'p1', quantity: 1.5 }], catalog).error);
  assert.ok(buildOrderLines([{ productId: 'gone', quantity: 1 }], catalog).error);
  assert.ok(buildOrderLines(Array.from({ length: 21 }, () => ({ productId: 'p1', quantity: 1 })), catalog).error);
});

test('cleanPhone strips separators only', () => {
  assert.equal(cleanPhone(' +62 812-3456.7890 '), '6281234567890');
  assert.equal(cleanPhone(undefined), '');
});

test('whatsappUrl only builds with a valid configured number', () => {
  const order = { code: 'ALK-ABC123', customerName: 'Pembeli', note: '', total: 50000, items: [{ name: 'Cookies Cokelat', quantity: 2, subtotal: 50000 }] };
  const url = whatsappUrl('+62 812-3456-7890', order);
  assert.match(url, /^https:\/\/wa\.me\/6281234567890\?text=/);
  assert.ok(decodeURIComponent(url).includes('Cookies Cokelat x2'));
  assert.equal(whatsappUrl('', order), null);
  assert.equal(whatsappUrl('08123', order), null);
});

test('verifyPassword enforces the 16 character minimum and the limiter caps attempts', () => {
  assert.equal(verifyPassword('short', 'short'), false);
  assert.equal(verifyPassword(undefined, 'whatever'), false);
  assert.equal(verifyPassword('a-very-long-admin-password', 'a-very-long-admin-password'), true);
  assert.equal(verifyPassword('a-very-long-admin-password', 'wrong-password-xxxx'), false);
  const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
  assert.equal(limiter.check('ip1'), true);
  assert.equal(limiter.check('ip1'), true);
  assert.equal(limiter.check('ip1'), false);
  limiter.reset('ip1');
  assert.equal(limiter.check('ip1'), true);
  assert.match(newOrderCode(), /^ALK-[0-9A-F]{6}$/);
});

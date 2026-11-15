import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function verifyPassword(configured, input) {
  if (typeof configured !== 'string' || configured.length < 16 || typeof input !== 'string') return false;
  const salt = randomBytes(16);
  const expected = scryptSync(configured, salt, 32);
  const actual = scryptSync(input, salt, 32);
  return timingSafeEqual(expected, actual);
}

export function createRateLimiter({ windowMs = 10 * 60_000, max = 8 } = {}) {
  const hits = new Map();
  return {
    check(key) {
      const now = Date.now();
      const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
      if (recent.length >= max) return false;
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
    reset(key) { hits.delete(key); },
  };
}

export function newSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function newOrderCode() {
  return `ALK-${randomBytes(3).toString('hex').toUpperCase()}`;
}

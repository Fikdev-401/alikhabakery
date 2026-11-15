export const ORDER_STATUSES = ['baru', 'diproses', 'siap_diambil', 'selesai', 'dibatalkan'];

export function validText(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

export function cleanPhone(value) {
  return typeof value === 'string' ? value.replace(/[\s()+.-]/g, '') : '';
}

// Harga selalu dihitung ulang dari katalog, tidak pernah dipercaya dari browser.
export function buildOrderLines(items, productsById) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return { error: 'Pilih setidaknya satu produk.' };
  }
  const lines = [];
  for (const item of items) {
    if (typeof item?.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      return { error: 'Produk atau jumlah pesanan tidak valid.' };
    }
    const product = productsById.get(item.productId);
    if (!product) return { error: 'Salah satu produk sudah tidak tersedia. Muat ulang katalog.' };
    lines.push({ productId: product.id, name: product.name, unitPrice: product.price, quantity: item.quantity, subtotal: product.price * item.quantity });
  }
  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
  if (!Number.isSafeInteger(total) || total <= 0) return { error: 'Total pesanan tidak valid.' };
  return { lines, total };
}

export function whatsappUrl(number, order) {
  const digits = (number || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(digits)) return null;
  const summary = [
    `Halo Alikha Bakery, saya ${order.customerName}.`,
    `Pesanan ${order.code}:`,
    ...order.items.map((item) => `- ${item.name} x${item.quantity}: Rp${item.subtotal.toLocaleString('id-ID')}`),
    `Total: Rp${order.total.toLocaleString('id-ID')}`,
    `Catatan: ${order.note || '-'}`,
  ].join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(summary)}`;
}

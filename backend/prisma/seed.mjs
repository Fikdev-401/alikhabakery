import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data contoh, bukan produk nyata: setiap deskripsi diawali "[Contoh]" agar mudah
// dikenali dan diganti admin. Harga masih tebakan wajar; sampoinkan sebelum go-live.
const samples = [
  { name: 'Nastar Lebaran', category: 'Cookies', price: 95000, description: '[Contoh] Toples isi 500 gram, isi sekitar 25 butir.' },
  { name: 'Choco Chip Cookies', category: 'Cookies', price: 85000, description: '[Contoh] Toples isi 500 gram, renyah dengan choco chip melimpah.' },
  { name: 'Kastengel Keju', category: 'Cookies', price: 100000, description: '[Contoh] Toples isi 500 gram, keju cheddar asli.' },
  { name: 'Brownies Panggang', category: 'Kue', price: 120000, description: '[Contoh] Dipotong 20, cocok untuk hampers.' },
  { name: 'Bolu Pandan', category: 'Kue', price: 75000, description: '[Contoh] Bulat 18 cm, tekstur lembut.' },
  { name: 'Cheese Cake Original', category: 'Kue', price: 150000, description: '[Contoh] Ukuran 16 cm, pendinginan dijamin.' },
];

const count = await prisma.product.count();
if (count > 0) {
  console.log(`Skip seed: katalog sudah berisi ${count} produk. Hapus manual di admin bila ingin mengganti.`);
} else {
  await prisma.product.createMany({ data: samples.map((sample) => ({ ...sample, active: true })) });
  console.log(`Seed selesai: ${samples.length} produk contoh (deskripsi berawalan [Contoh]).`);
}

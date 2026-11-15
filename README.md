# Alikha Bakery

MVP etalase dan admin order untuk Alikha Bakery, Ciranjang. Tidak ada payment gateway: pesanan disimpan, lalu dikonfirmasi lewat WhatsApp.

- `frontend/` — React + Vite (halaman toko `index.html`, halaman admin `admin.html`)
- `backend/` — Express + Prisma + MySQL
- `PRD.md` — ruang lingkup, keputusan yang belum dikonfirmasi, kriteria penerimaan
- `BUILD-NOTES.md` — catatan desain dan foto stand-in

## Menjalankan (development)

Perlu Node.js 22.13+ dan MySQL yang berjalan.

### Backend

1. `cd backend && cp .env.example .env`
2. Isi `.env`: `DATABASE_URL` (mis. `mysql://root:password@localhost:3306/alikha_bakery`), `ALIKHA_ADMIN_PASSWORD` (unik, minimal 16 karakter), `WHATSAPP_NUMBER` (format 62xxxxxxxxxxx).
3. `npm install`
4. `npm run db:push` untuk membuat tabel (database dibuat bila user MySQL punya izin).
5. (Opsional) `npm run db:seed` untuk mengisi 6 produk contoh berdeskripsi `[Contoh]` — hanya berjalan bila katalog masih kosong; ganti dengan produk nyata lewat admin.
6. `npm run dev` — API di `http://localhost:3000`.

Catatan: bila npm memblokir skrip instalasi (install scripts) sehingga muncul error "did not initialize yet" dari Prisma, jalankan `npx prisma generate` sekali secara manual.

### Frontend

1. `cd frontend && npm install`
2. `npm run dev` — toko di `http://localhost:5173`, admin di `http://localhost:5173/admin.html`.
3. Vite mem-proxy `/api` ke `http://localhost:3000`.

## Produksi

1. `cd frontend && npm run build` menghasilkan `frontend/dist`.
2. Jalankan backend saja: `cd backend && npm start`. Backend otomatis menyajikan `frontend/dist` bila ada, jadi satu proses cukup di belakang reverse proxy.
3. Gunakan HTTPS (cookie sesi otomatis `Secure` di belakang proxy yang meneruskan `X-Forwarded-Proto`) dan backup MySQL rutin beserta folder `backend/uploads/` (foto produk).

Foto produk diunggah admin langsung dari halaman admin (file JPG/PNG/WebP maks 5 MB, tipe divalidasi dari isi file); file disimpan di `backend/uploads/` dan disajikan di `/uploads/`. Jika `WHATSAPP_NUMBER` belum diatur, pesanan tetap tersimpan dan terlihat admin, tetapi tanpa tautan WhatsApp.

## Test

`cd backend && npm test` — unit test untuk validasi pesanan, perhitungan harga server-side, pembuat tautan WhatsApp, password, dan rate limiter.

Katalog sengaja kosong sampai admin mengisi produk nyata. Foto cookies di hero adalah stand-in berlisensi terbuka (lihat `BUILD-NOTES.md` dan `/credits.html`); ganti dengan foto milik toko sebelum publikasi.

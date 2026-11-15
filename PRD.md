# PRD: Alikha Bakery Ciranjang

**Jenis usaha:** toko roti dan kue lokal dengan pemesanan melalui WhatsApp  
**Status:** MVP draft, perlu konfirmasi pemilik untuk detail operasional  
**Pemilik produk:** Alikha Bakery  
**Lokasi:** Ciranjang, Cianjur, Jawa Barat

## Ringkasan

Alikha Bakery membutuhkan etalase digital untuk memperkenalkan produk kue dan cookies, menerima pesanan tanpa payment gateway, lalu mencatat data pembeli agar admin dapat menindaklanjuti dan mengelola status pesanan. Tahap pertama menghubungkan pelanggan ke WhatsApp toko setelah pesanan tersimpan di sistem. Admin mengelola katalog dan pesanan dari halaman yang memerlukan login.

**Teknologi:** frontend React + Vite di `frontend/`, backend Express + Prisma + MySQL di `backend/`.

## Masalah dan tujuan

Pelanggan perlu melihat produk yang benar-benar tersedia dan mengirim detail pesanan dengan mudah. Pemilik perlu satu tempat untuk melihat siapa yang memesan, apa yang dipesan, nilai pesanan, kontak, catatan, dan progres tindak lanjut.

### Tujuan MVP

- Menampilkan katalog yang dikelola admin, tanpa produk/harga contoh yang seolah nyata.
- Mengumpulkan nama, nomor WhatsApp pelanggan, item, kuantitas, dan catatan pesanan.
- Menyimpan pesanan beserta snapshot harga sebelum membuka percakapan WhatsApp.
- Menyediakan login admin, CRUD produk sederhana, daftar/detail pesanan, pencarian, dan perubahan status.
- Tidak memproses pembayaran online. Pembayaran dan konfirmasi dilakukan di luar sistem.

### Bukan tujuan MVP

- Payment gateway, keranjang multi-pelanggan yang tersinkron antar perangkat, pengiriman otomatis, manajemen stok, kupon, ulasan, akun pelanggan, notifikasi otomatis, laporan analitik, dan multi-admin.

## Pengguna

1. **Pelanggan lokal:** melihat menu, memilih kuantitas, memberikan kontak/catatan, lalu melanjutkan konfirmasi melalui WhatsApp.
2. **Admin/pemilik:** masuk ke dashboard, mengelola produk aktif/nonaktif, memeriksa data pembeli dan detail order, serta memperbarui status.

## Alur utama

### Pelanggan

1. Membuka halaman toko dan melihat informasi brand/lokasi yang sudah diketahui.
2. Menelusuri katalog produk aktif. Jika katalog kosong, melihat arahan bahwa menu sedang disiapkan, bukan data demonstrasi.
3. Memilih produk dan kuantitas, lalu mengisi nama, nomor WhatsApp, serta catatan opsional.
4. Mengirim pesanan. Server memvalidasi produk/harga dan menyimpan pesanan terlebih dahulu.
5. Jika nomor WhatsApp toko telah dikonfigurasi, browser membuka pesan WhatsApp berisi ringkasan order. Pelanggan menyelesaikan konfirmasi dengan admin. Jika belum dikonfigurasi, pesanan tetap terlihat admin dan pelanggan diberi keterangan bahwa koneksi WhatsApp belum disetel.

### Admin

1. Masuk dengan kata sandi dari konfigurasi server.
2. Melihat pesanan terbaru, mencari berdasarkan nama/nomor/kode pesanan, membuka detail, dan mengubah status.
- Menambah produk dengan nama, kategori, harga Rupiah, deskripsi, dan foto unggahan opsional (JPG/PNG/WebP, maks 5 MB, divalidasi dari isi file); menyunting atau menonaktifkan produk.
4. Keluar. Sesi berakhir di memori server saat server restart.

## Ruang lingkup fitur

### Etalase

- Halaman responsif berbahasa Indonesia.
- Identitas teks Alikha Bakery dan konteks Ciranjang, Cianjur.
- Katalog hanya membaca produk aktif dari API.
- Pemilih kuantitas dan ringkasan pesanan.
- Form pemesanan dengan label aksesibel dan validasi.
- Tautan WhatsApp dibuat server-side setelah pesanan tersimpan.
- Keadaan loading, kosong, dan error untuk katalog serta proses pemesanan.

### Admin

- Login/logout dengan cookie sesi `HttpOnly`, `SameSite=Strict`.
- Produk: tambah, edit, aktif/nonaktif; harga disimpan sebagai integer Rupiah.
- Pesanan: daftar, pencarian, detail, dan status `baru`, `diproses`, `siap_diambil`, `selesai`, `dibatalkan`.
- Data pelanggan hanya dapat dibaca setelah autentikasi admin.
- Status dan item order tetap tersimpan setelah server restart.

## Data utama

- **Product:** id, nama, kategori, deskripsi, harga IDR, foto (path unggahan atau URL) opsional, status aktif, waktu dibuat/diubah.
- **Order:** id/kode, nama pelanggan, nomor WhatsApp, catatan, item, snapshot nama dan harga, jumlah, subtotal/total IDR, status, waktu dibuat/diubah.
- **Admin session:** token acak yang hanya tersimpan di memori server; tidak menyimpan data pelanggan di browser.

## Aturan bisnis

- Harga dan total dihitung ulang server dari katalog, bukan dipercaya dari browser.
- Item harus produk aktif dan kuantitas bilangan bulat positif dalam batas aman.
- Tidak ada pembayaran online atau status lunas otomatis.
- Admin dapat mengubah status pesanan, bukan mengubah snapshot harga pesanan lama.
- Produk nonaktif tidak dapat dipesan dan tidak dihapus dari riwayat order.
- Nomor WhatsApp toko, jam buka, alamat jalan, varian, harga, ketersediaan, minimum order, waktu produksi, metode ambil/kirim harus dikonfirmasi pemilik. Jangan tampilkan nilai asumsi sebagai fakta.

## Keamanan dan privasi

- Password admin disetel melalui environment, tidak dikirim ke client.
- Login dibatasi percobaan sederhana per IP; cookie sesi `HttpOnly`, `SameSite=Strict`, dengan `Secure` pada HTTPS.
- Semua endpoint admin memerlukan sesi; validasi input dilakukan server-side; query database memakai parameter Prisma.
- Output teks pelanggan ditampilkan sebagai teks, bukan HTML.
- Data pelanggan dipakai untuk pemrosesan pesanan. Kebijakan privasi dan masa retensi perlu disahkan sebelum peluncuran publik.
- Jalankan di HTTPS dan atur backup MySQL serta folder `uploads/` sebelum produksi.

## Kriteria penerimaan

- Tanpa produk, etalase menampilkan keadaan kosong dan tidak mengarang produk, harga, rating, atau testimoni.
- Produk yang ditambahkan admin tampil di katalog; edit/nonaktif tercermin setelah reload.
- Pesanan valid tersimpan di MySQL dan tampil pada admin setelah submit.
- Total order memakai harga server dan tetap sama walau harga produk berubah kemudian.
- Input tidak valid ditolak dengan pesan yang bisa dipahami; API tidak membocorkan detail stack.
- Pengguna tanpa sesi tidak dapat membaca atau mengubah produk/pesanan admin.
- Pembaruan status tersimpan; restart server tidak menghapus katalog maupun pesanan.
- WhatsApp dibuka hanya jika nomor toko telah dikonfigurasi, dan hanya setelah pesanan tersimpan.
- Navigasi keyboard, label form, fokus terlihat, dan layout ponsel berfungsi.

## Risiko dan keputusan yang perlu pemilik konfirmasi

1. Nomor WhatsApp format internasional tanpa `+` untuk konfigurasi `WHATSAPP_NUMBER`.
2. Nomor WhatsApp admin/password awal serta proses rotasi kredensial.
3. Alamat toko yang boleh dipublikasikan, jam operasional, pilihan ambil/kirim, cakupan pengiriman.
4. Nama/kategori/varian produk, harga, foto milik toko, ketersediaan harian, dan lead time.
5. Kebijakan pembatalan, pembayaran saat ambil/transfer manual, retensi data order, kebijakan privasi.
6. Hosting Node.js dengan MySQL, Prisma, dan HTTPS.

## Ukuran keberhasilan MVP

Belum menetapkan target angka sebelum baseline dan data penjualan tersedia. Indikator operasional yang dapat ditinjau setelah peluncuran: pesanan tercatat dengan detail pelanggan lengkap, status tindak lanjut diperbarui, dan kasus pesanan yang tidak terbuka di WhatsApp dapat ditemukan admin.

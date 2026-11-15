import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT || 3000);

if (!process.env.WHATSAPP_NUMBER) console.warn('WHATSAPP_NUMBER belum diatur: pesanan tetap tersimpan tanpa tautan WhatsApp.');
if (!process.env.ALIKHA_ADMIN_PASSWORD || process.env.ALIKHA_ADMIN_PASSWORD.length < 16) console.warn('ALIKHA_ADMIN_PASSWORD belum diatur (minimal 16 karakter): login admin nonaktif.');

app.listen(port, () => console.log(`Alikha Bakery backend berjalan di http://localhost:${port}`));

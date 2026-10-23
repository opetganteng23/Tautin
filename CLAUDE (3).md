# Tautin: Platform "Link in Bio"

Domain: `tautin.ailo.ai.id` → halaman user di `tautin.ailo.ai.id/:username`
Terbuka untuk umum. Paket, harga, dan batas fitur diatur admin dari dashboard (bukan hardcode).

## Stack & infrastruktur
- KEPUTUSAN FINAL: Next.js (App Router) fullstack satu aplikasi, Node.js. Route handlers untuk API, SSR/ISR + cache untuk halaman publik. Bukan Express murni.
- MongoDB (autentikasi aktif, tidak dibuka ke publik, backup berkala)
- Server: Biznet Gio Cloud (Nginx + HTTPS, proses dijaga PM2)
- Email: Gmail App Password lewat modul mailer TERPISAH (mudah diganti ke Brevo/SendGrid/SES)
- Pembayaran: Midtrans Snap (QRIS & Virtual Account), sandbox dulu
- Config lewat `.env` (jangan commit): MONGODB_URI, SESSION/JWT_SECRET, MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, BASE_URL

## Aturan desain utama
1. Semua batas fitur dibaca dari koleksi `plans`. Tidak ada angka batas di kode.
2. QRIS/VA bukan pembayaran berulang → model PRABAYAR (bayar 1 bulan / 1 tahun, aktif sampai `planExpiresAt`).
3. Webhook Midtrans: verifikasi signature + cek status ke API Midtrans; proses harus IDEMPOTEN (flag `processed` di order).
4. Setelah paket kedaluwarsa + masa tenggang → turun ke paket Free. Link berlebih DINONAKTIFKAN, bukan dihapus.
5. Keamanan platform terbuka: validasi URL (tolak `javascript:` dll), blocklist domain, Google Safe Browsing, reserved username, rate limit login, verifikasi email, hash password kuat (argon2/bcrypt), IP di klik di-hash (UU PDP).
6. Tema = konfigurasi JSON (warna, font, gaya tombol, background), bukan template kode. Tema premium bisa dikunci per paket.
7. Domain kustom user: DITUNDA ke tahap 2 (Caddy on-demand TLS). Siapkan field `customDomain` saja.

## Mode gratis (dua-duanya)
- A. Paket Free permanen dengan batas yang diatur admin.
- B. Trial paket berbayar (durasi `trialDays` per paket, diatur admin).
- Saklar "mode gratis global" di `settings` untuk membuka fitur premium sementara.

## Periode
Bulanan dan tahunan. Tiap paket punya `priceMonthly` dan `priceYearly`.

## Skema MongoDB
- `users`: email, passwordHash, username (unik), role (user/admin), status (active/suspended), emailVerified, planId, planExpiresAt, trialUsed, createdAt
- `profiles`: userId, displayName, bio, avatarUrl, themeId, themeOverrides, customDomain
- `links`: userId, title, url, order, isActive, type (link/header/social), clickCount
- `plans`: name, priceMonthly, priceYearly, maxLinks, analyticsLevel, allowedThemes, removeBranding, trialDays, isActive, isFree
- `orders`: userId, planId, period (monthly/yearly), amount, midtransOrderId, status (pending/settlement/expire/cancel), paymentType, paidAt, processed
- `clickEvents`: linkId, profileId, timestamp, ipHash, country, device, referrer, isBot (TTL index, mis. 12 bulan)
- `pageViews`: profileId, timestamp, referrer, device, country (TTL index)
- `analyticsDaily`: ringkasan harian agar grafik cepat
- `themes`: name, config, isPremium
- `reports`: profileId, reason, reporterEmail, status
- `blocklist`: domain, alasan
- `settings`: freeModeGlobal, reservedUsernames, gracePeriodDays, dll.

## Halaman & endpoint
- Publik: landing, harga, `/:username` (SSR + cache), `/r/:linkId` (redirect + catat klik), daftar, login, verifikasi email, lupa password
- Dashboard user: kelola link (tambah/edit/drag-urut/aktif-nonaktif), profil & tema, analitik, langganan (pilih paket, bayar, riwayat), pengaturan akun
- Dashboard admin: statistik platform, kelola user (cari, suspend, ubah paket manual, beri trial), kelola paket & harga, kelola tema, daftar order, laporan & blocklist, pengaturan global (saklar mode gratis)
- Webhook: `POST /api/midtrans/notification`
- Cron harian: turunkan akun kedaluwarsa, email pengingat H-7 dan H-1, rangkum analitik

## Default yang dipakai (bisa diubah admin)
- Masa tenggang setelah kedaluwarsa: 7 hari (`settings.gracePeriodDays`)
- Trial: sekali per akun, untuk paket berbayar yang `trialDays > 0`

## Tahapan pengerjaan (kerjakan berurutan, uji tiap tahap)
1. Fondasi: setup proyek, koneksi MongoDB, autentikasi, verifikasi email, role
2. Inti produk: profil, link, halaman publik `/:username`, redirect + pencatatan klik
3. Paket & batas: koleksi plans, pengecekan batas, trial, mode free
4. Tema & analitik: sistem tema, dashboard analitik
5. Pembayaran: Midtrans Snap sandbox, webhook, aktivasi paket, kedaluwarsa & pengingat
6. Admin & moderasi: dashboard admin lengkap, laporan, blocklist, Safe Browsing
7. Produksi: deploy Biznet Gio, Nginx + HTTPS, PM2, backup MongoDB, pindah ke Midtrans production

## Tampilan & animasi (front-end)
Gaya visual mengikuti ailo.ai.id: halaman sangat interaktif, banyak animasi 3D.
Brand: "AILO · Telkom University's Center of Excellence". Metadata halaman ailo.ai.id mengindikasikan Next.js.
Catatan: library 3D/animasi di ailo.ai.id BELUM diverifikasi dari kode. Buka ailo.ai.id di browser, cek DevTools (Network/Sources) untuk melihat library yang dipakai (Three.js, GSAP, dll.), lalu samakan.
Pendekatan yang disarankan:
- Landing page & dashboard: React (Next.js) + Three.js via React Three Fiber (@react-three/fiber, @react-three/drei); Framer Motion/GSAP untuk transisi dan scroll.
- Halaman publik `/:username` (dibuka dari bio Instagram/TikTok, kebanyakan di HP): jangan berat. Animasi 3D ringan (CSS 3D tilt/parallax, atau scene Three.js kecil yang dimuat lazy), SSR + cache, hormati `prefers-reduced-motion`, fallback statis untuk HP lemah.
- Target halaman publik: tampil < 2 detik di 4G; 3D dimuat setelah konten utama.
- Efek 3D bisa menjadi bagian dari tema (mis. tema premium dengan latar 3D, tombol tilt-on-hover).
- Stack sudah diputuskan: Next.js (App Router + route handlers). Cron harian dan webhook Midtrans tetap dijalankan di server Biznet Gio (PM2 + Nginx), bukan di platform serverless.

## Catatan
- Verifikasi bisnis Midtrans production butuh waktu → daftarkan sejak awal pengembangan.
- Gmail dibatasi ±500 penerima/hari; ganti penyedia email bila volume naik.
- Mulai dari tahap 1. Jangan loncat ke tahap berikutnya sebelum tahap sebelumnya berjalan.

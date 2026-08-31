# JANG GURU APP HUB (MySQL Full-Stack Edition)

Aplikasi Web Administrasi Guru, Jurnal Mengajar, Wali Kelas, Absensi Siswa, Rekap Nilai, dan Asisten Pedagogi AI (EduAsisten) berbasis React + Node.js Express + MySQL.

---

## 📦 Cara Ekspor & Download Kode Sumber (ZIP)

Anda dapat mengunduh seluruh proyek ini ke dalam file `.zip` langsung dari **Google AI Studio**:
1. Klik menu **Settings** (ikon roda gigi / titik tiga di pojok kanan atas interface AI Studio).
2. Pilih opsi **"Export"** atau **"Download as ZIP"** (atau **"Export to GitHub"** jika ingin langsung push ke repository).
3. Ekstrak file `.zip` yang diunduh ke folder komputer lokal Anda.

---

## 🚀 Panduan Menjalankan di Komputer Lokal (Localhost)

### 1. Prasyarat
- **Node.js**: Versi 18 atau lebih baru ([Unduh Node.js](https://nodejs.org/))
- **MySQL Database Server**: XAMPP, Laragon, MySQL Community Server, atau Docker.

---

### 2. Impor Database MySQL
1. Buka **phpMyAdmin** (`http://localhost/phpmyadmin`) atau terminal MySQL Anda.
2. Buat database baru bernama `jang_guru_db`:
   ```sql
   CREATE DATABASE jang_guru_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Impor file **`database.sql`** yang tersedia di direktori utama proyek ini ke dalam database `jang_guru_db`.

---

### 3. Konfigurasi File Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan sesuaikan koneksi database Anda:
```env
# Koneksi MySQL Lokal (Contoh XAMPP default tanpa password)
DATABASE_URL="mysql://root@localhost:3306/jang_guru_db"

# Kunci API Gemini (Opsional, untuk fitur AI Asisten & Penilaian Cerdas)
GEMINI_API_KEY="AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

### 4. Instal Dependensi & Jalankan Aplikasi
Buka terminal / command prompt di folder proyek:

```bash
# Instal modul dependensi
npm install

# Jalankan server pengembangan (Express + Vite)
npm run dev
```

Aplikasi akan otomatis berjalan di **`http://localhost:3000`**.

---

## 📱 Cara Mengakses Dari Semua Perangkat (HP, Tablet, Laptop Lain)

Aplikasi **Jang Guru App Hub** mendukung penuh akses lintas perangkat:

### A. Akses Melalui Jaringan Wi-Fi Lokal (LAN)
1. Pastikan HP / Tablet Anda terhubung ke jaringan Wi-Fi yang sama dengan Laptop/PC server.
2. Di aplikasi Laptop/PC, klik tombol **"Akses HP / Multi-Device"** di header atas untuk menampilkan **QR Code** dan alamat IP lokal (misal: `http://192.168.1.15:3000`).
3. Scan QR Code menggunakan kamera HP / Tablet atau ketikkan alamat IP tersebut di browser HP Anda.
4. Server telah dikonfigurasi dengan binding `0.0.0.0:3000` dan CORS aktif sehingga dapat diakses lancar dari perangkat manapun di jaringan lokal.

### B. Instal Sebagai Aplikasi Native (PWA - Progressive Web App)
- **Di Android (Google Chrome)**: Buka web aplikasi di HP -> Ketuk menu titik tiga (⋮) di pojok kanan atas browser -> Pilih **"Tambahkan ke Layar Utama"** / **"Instal Aplikasi"**.
- **Di iPhone / iPad (Safari)**: Buka web aplikasi di Safari -> Ketuk ikon **Bagikan (Share)** di bagian bawah -> Pilih **"Tambah ke Layar Utama" (Add to Home Screen)**.
- **Di Windows / macOS (Chrome / Edge)**: Klik ikon unduh/instal di address bar browser untuk memasang aplikasi ke desktop.

---

## 🛠️ Fitur Utama Terintegrasi MySQL
- **Buku Induk & Manajemen Kelas**: Data siswa, NIS, kelas tersinkronisasi relasional.
- **Absensi Presensi Digital**: Rekapitulasi status kehadiran (Hadir, Sakit, Izin, Alpa).
- **Jadwal Pelajaran**: Penjadwalan mingguan per hari, jam, kelas, dan mapel.
- **Tugas & Penilaian**: Bank tugas, pengumpulan tugas siswa, dan buku nilai formatif & sumatif.
- **Jurnal Harian Mengajar**: Lengkap dengan dokumentasi foto dan refleksi pedagogik.
- **Ruang Wali Kelas**: Catatan perkembangan siswa dan laporan kunjungan rumah (Home Visit).
- **EduAsisten Kurikulum Merdeka**: Perancangan Modul Ajar Deep Learning (8-3-3-4) dan analisis Taksonomi Bloom C1–C6.
- **MySQL Studio Control**: Pengujian koneksi real-time, inisialisasi DDL, dan SQL Query Console langsung dari UI.

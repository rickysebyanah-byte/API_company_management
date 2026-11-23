# 🏢 Company Management REST API (Supabase & PostgreSQL)

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database%20Cloud-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Secure%20Auth-FB0058?style=for-the-badge&logo=json-web-tokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

Sistem Backend RESTful API enterprise-grade untuk manajemen internal perusahaan. Didukung oleh database cloud **Supabase (PostgreSQL)**, arsitektur **Role-Based Access Control (RBAC)** 5 tingkat, otentikasi stateless **JSON Web Tokens (JWT)**, serta validasi input ketat dan pagination standar industri.

---

## 📑 Daftar Isi
- [Fitur Utama](#-fitur-utama)
- [Arsitektur & Hierarki RBAC](#-arsitektur--hierarki-rbac)
- [Skema Database (ERD)](#-skema-database-erd)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Setup Supabase](#-panduan-setup-supabase)
- [Panduan Menjalankan Project](#-panduan-menjalankan-project)
- [Daftar Akun Demo](#-daftar-akun-demo)
- [Katalog 50+ Endpoint REST API](#-katalog-50-endpoint-rest-api)
- [Pengujian dengan Postman](#-pengujian-dengan-postman)
- [Keamanan & Best Practices](#-keamanan--best-practices)
- [Panduan Push ke GitHub](#-panduan-push-ke-github)

---

## 🚀 Fitur Utama

- **Cloud Database Supabase (PostgreSQL)**: Tidak memerlukan instalasi lokal seperti XAMPP atau MySQL. Database tersimpan di cloud Supabase dan diakses secara aman melalui koneksi terenkripsi SSL.
- **Dual Supabase Integration**: Mendukung koneksi pooler berkecepatan tinggi via `pg` (node-postgres) dan client resmi `@supabase/supabase-js`.
- **Otentikasi & Keamanan JWT**: Token bearer stateless dengan masa berlaku kedaluwarsa otomatis dan verifikasi akun aktif di setiap request.
- **5 Tingkat Role (RBAC)**: Pembatasan hak akses berbasis wewenang (`Admin`, `HRD`, `Keuangan`, `Manager`, `Karyawan`).
- **Dashboard Eksekutif Real-Time**: Statistik total karyawan, rasio kehadiran hari ini, total kas keuangan, dan permohonan cuti pending.
- **Manajemen Pengajuan Cuti & Izin (Leave Requests)**: Alur pengajuan cuti tahunan, sakit, izin penting oleh karyawan dengan review/approval dari HRD/Admin.
- **Pusat Pengumuman Internal (Announcements)**: Publikasi berita, surat edaran, dan pengumuman kantor dengan level prioritas (`Low`, `Normal`, `High`, `Urgent`).
- **Struktur Organisasi Luas (45+ Jabatan)**: Mencakup 11 departemen korporat (Executive, Engineering, HR, Finance, Product/UIUX, Marketing, Sales, Operations, Legal, dll).
- **Pendeteksi Siklus Atasan (Anti-Cycle Manager)**: Validasi rekursif mencegah seorang atasan menjadi bawahan dari bawahannya sendiri.
- **Presensi Digital Terintegrasi**: Presensi masuk dan pulang otomatis tersinkronisasi zona waktu `Asia/Jakarta (WIB)`.
- **Penggajian & Transaksi Keuangan**: Manajemen slip gaji karyawan, pencatatan kas keluar-masuk, dan kalkulasi otomatis saldo bersih perusahaan.
- **Evaluasi Kinerja (KPI)**: Monitoring pencapaian tugas bawahan oleh Manager dan pencatatan skor performa periodik.

---

## 🛡️ Arsitektur & Hierarki RBAC

| Role | Deskripsi & Hak Akses Utama | Prefix Endpoint |
| :--- | :--- | :--- |
| **Admin** | Akses penuh seluruh sistem, manajemen pengguna, dan penugasan role | `/api/users/*` + Seluruh endpoint |
| **HRD** | Mengelola departemen, jabatan, profil karyawan, absensi, cuti, dan pengumuman | `/api/hr/*`, `/api/leaves/*`, `/api/announcements/*` |
| **Keuangan** | Mengelola penggajian karyawan, pencatatan transaksi kas, dan laporan keuangan | `/api/finance/*` |
| **Manager** | Memantau daftar bawahan langsung dan membuat laporan evaluasi kinerja (KPI) | `/api/manager/*` |
| **Karyawan** | Melihat/mengubah profil pribadi, ubah password, absensi, dan pengajuan cuti | `/api/me/*`, `/api/leaves/*` |

---

## 🗄️ Skema Database (ERD)

```mermaid
erDiagram
    roles ||--o{ users : "assigned_to"
    users ||--o| employees : "has_profile"
    departments ||--o{ positions : "categorizes"
    positions ||--o{ employees : "held_by"
    employees ||--o{ employees : "supervises"
    employees ||--o{ attendances : "records"
    employees ||--o{ salaries : "receives"
    users ||--o{ financial_transactions : "records"
    employees ||--o{ performance_reports : "evaluated_as"
    employees ||--o{ performance_reports : "reviewed_by"
    employees ||--o{ leave_requests : "applies"
    employees ||--o{ leave_requests : "reviewed_by"
    users ||--o{ announcements : "authored_by"

    roles {
        SERIAL id PK
        VARCHAR name UK
        VARCHAR description
    }
    users {
        SERIAL id PK
        VARCHAR username UK
        VARCHAR email UK
        VARCHAR password_hash
        INT role_id FK
        BOOLEAN is_active
        TIMESTAMPTZ created_at
    }
    departments {
        SERIAL id PK
        VARCHAR name UK
        VARCHAR description
    }
    positions {
        SERIAL id PK
        INT department_id FK
        VARCHAR name
    }
    employees {
        SERIAL id PK
        INT user_id FK,UK
        VARCHAR employee_code UK
        VARCHAR full_name
        INT position_id FK
        INT manager_id FK
        DATE hire_date
        VARCHAR phone
    }
    attendances {
        SERIAL id PK
        INT employee_id FK
        DATE date
        TIME check_in
        TIME check_out
        VARCHAR status
        TEXT notes
    }
    salaries {
        SERIAL id PK
        INT employee_id FK
        CHAR month
        NUMERIC base_salary
        NUMERIC allowance
        NUMERIC deduction
        NUMERIC net_salary
        VARCHAR payment_status
        TIMESTAMPTZ paid_at
    }
    financial_transactions {
        SERIAL id PK
        VARCHAR type
        VARCHAR category
        NUMERIC amount
        TEXT description
        DATE transaction_date
        INT recorded_by FK
    }
    performance_reports {
        SERIAL id PK
        INT employee_id FK
        VARCHAR period
        INT tasks_completed
        NUMERIC kpi_score
        TEXT feedback
        INT reviewed_by FK
        TIMESTAMPTZ created_at
    }
    leave_requests {
        SERIAL id PK
        INT employee_id FK
        VARCHAR leave_type
        DATE start_date
        DATE end_date
        TEXT reason
        VARCHAR status
        INT reviewed_by FK
        TEXT review_notes
        TIMESTAMPTZ reviewed_at
    }
    announcements {
        SERIAL id PK
        VARCHAR title
        TEXT content
        VARCHAR priority
        VARCHAR category
        INT author_id FK
        TIMESTAMPTZ created_at
    }
```

---

## 📁 Struktur Direktori

```text
company-management-api/
├── src/
│   ├── app.js                          # Express app configuration & global route mounting
│   ├── server.js                       # Entry point aplikasi & startup database check
│   ├── config/
│   │   ├── database.js                 # Pool connection Supabase PostgreSQL & error normalization
│   │   └── initDb.js                   # DDL table creation & automated enterprise seeder
│   ├── controllers/
│   │   ├── announcementController.js   # Pengumuman internal & berita kantor
│   │   ├── attendanceController.js     # Presensi karyawan & validasi jam
│   │   ├── authController.js           # Login & otentikasi JWT
│   │   ├── dashboardController.js      # Ringkasan analitik eksekutif
│   │   ├── departmentController.js     # Master departemen perusahaan
│   │   ├── employeeController.js       # Data karyawan & self-profile management
│   │   ├── financeController.js        # Gaji, transaksi kas, & kalkulasi laba/rugi
│   │   ├── leaveController.js          # Pengajuan & persetujuan cuti/izin
│   │   ├── managerController.js        # Manajemen bawahan langsung & laporan KPI
│   │   ├── positionController.js       # Master jabatan perusahaan
│   │   └── userController.js           # Manajemen akun & penugasan role
│   ├── middlewares/
│   │   ├── authMiddleware.js           # Verifikasi JWT Bearer token
│   │   ├── errorHandler.js             # Global error handler
│   │   ├── rbacMiddleware.js           # Filter otorisasi berbasis role
│   │   └── validationMiddleware.js     # Validasi format request express-validator
│   ├── routes/
│   │   ├── announcementRoutes.js
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── financeRoutes.js
│   │   ├── hrRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── managerRoutes.js
│   │   └── userRoutes.js
│   └── utils/
│       └── helpers.js                  # Paginasi, format tanggal WIB, & struktur JSON standar
├── .env.example                        # Template konfigurasi variabel lingkungan
├── package.json                        # Metadata paket & scripts
├── postman_collection.json             # Koleksi Postman lengkap 50+ request & automated tests
├── README.md                           # Dokumentasi teknis komprehensif
└── supabase_schema.sql                 # Skema DDL & seed data untuk Supabase SQL Editor
```

---

## ⚡ Panduan Setup Supabase

### Langkah 1: Buat Project di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan buat akun/login.
2. Klik tombol **New Project**.
3. Masukkan nama project (misal: `company-management-api`) dan tentukan **Database Password**.
4. Pilih region terdekat (misal: `Singapore (ap-southeast-1)`).
5. Tunggu hingga database siap digunakan.

### Langkah 2: Ambil URI Database
1. Buka **Project Settings** > **Database** pada sidebar kiri.
2. Scroll ke bagian **Connection string**, pilih tab **URI** (atau Session pooler port `5432`).
3. Salin URL-nya:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Ganti `[YOUR-PASSWORD]` dengan password database Anda.

### Langkah 3: Eksekusi Skema Tabel & Data Awal
Jalankan seeder otomatis dari terminal:
```bash
npm run init-db
```
*Atau buka file `supabase_schema.sql`, salin seluruh kodenya, buka **SQL Editor** di dashboard Supabase Anda, lalu klik **Run**.*

---

## 🚀 Panduan Menjalankan Project

### 1. Kloning & Instal Dependensi
```bash
git clone <URL_REPOSITORY_ANDA>
cd company-management-api
npm install
```

### 2. Salin dan Sesuaikan File .env
Buat file `.env` di root direktori project:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_2026_enterprise_company_api
JWT_EXPIRES_IN=24h

# Supabase PostgreSQL Connection
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase API (Opsional)
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

### 3. Migrasi & Seeding Data
```bash
npm run init-db
```

### 4. Menjalankan Server
```bash
# Mode Development (auto-reload)
npm run dev

# Mode Production
npm start
```
Server akan aktif di: `http://localhost:3000`

---

## 👥 Daftar Akun Demo

| Role | Username | Password | Nama Karyawan | Kode Karyawan | Jabatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `password123` | Super Admin | `EMP-001` | System Administrator |
| **HRD** | `siti_hrd` | `password123` | Siti Rahmawati | `EMP-002` | HR Manager |
| **Keuangan** | `andi_keuangan` | `password123` | Andi Wijaya | `EMP-003` | Finance Lead |
| **Manager** | `budi_manager` | `password123` | Budi Santoso | `EMP-004` | Engineering Manager |
| **Karyawan** | `rina_dev` | `password123` | Rina Kartika | `EMP-005` | Backend Developer (Bawahan Budi) |
| **Karyawan** | `dimas_qa` | `password123` | Dimas Pratama | `EMP-006` | QA Engineer (Bawahan Budi) |

---

## 📡 Katalog 50+ Endpoint REST API

### 1. Autentikasi & Health Check
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Login pengguna, menghasilkan JWT Bearer Token |
| `GET` | `/health` | Public | Status real-time koneksi database Supabase |
| `GET` | `/` | Public | Spesifikasi REST API & daftar route yang tersedia |

### 2. Modul Dashboard Eksekutif (`/api/dashboard`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Admin, HRD, Keuangan, Manager | Statistik ringkasan karyawan, absensi hari ini, kas, & cuti |
| `GET` | `/api/dashboard` | Admin, HRD, Keuangan, Manager | Alias ke statistik dashboard |

### 3. Modul Pengguna (`/api/users`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/roles` | Admin | Mengambil daftar seluruh role sistem |
| `GET` | `/api/users` | Admin | Mengambil daftar seluruh pengguna (paginated) |
| `GET` | `/api/users/:id` | Admin | Mengambil detail spesifik satu pengguna |
| `POST` | `/api/users` | Admin | Membuat akun pengguna baru |
| `PUT` | `/api/users/:id` | Admin | Memperbarui data pengguna / status aktif |
| `DELETE`| `/api/users/:id` | Admin | Menghapus pengguna (dengan proteksi relasi) |

### 4. Modul HRD - Departemen & Jabatan (`/api/hr`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hr/departments` | Admin, HRD | Mengambil daftar seluruh 11 departemen |
| `GET` | `/api/hr/departments/:id` | Admin, HRD | Mengambil detail satu departemen |
| `POST` | `/api/hr/departments` | Admin, HRD | Menambahkan departemen baru |
| `DELETE`| `/api/hr/departments/:id` | Admin, HRD | Menghapus departemen (aman dari relasi) |
| `GET` | `/api/hr/positions` | Admin, HRD | Mengambil daftar 45+ jabatan (`?department_id=`) |
| `GET` | `/api/hr/positions/:id` | Admin, HRD | Mengambil detail satu jabatan |
| `POST` | `/api/hr/positions` | Admin, HRD | Menambahkan jabatan baru |
| `DELETE`| `/api/hr/positions/:id` | Admin, HRD | Menghapus jabatan (aman dari relasi) |

### 5. Modul HRD - Karyawan & Absensi (`/api/hr`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hr/employees` | Admin, HRD | Mengambil daftar seluruh karyawan lengkap |
| `GET` | `/api/hr/employees/:id` | Admin, HRD | Mengambil detail spesifik karyawan |
| `POST` | `/api/hr/employees` | Admin, HRD | Mendaftarkan profil karyawan ke akun pengguna |
| `PUT` | `/api/hr/employees/:id` | Admin, HRD | Memperbarui informasi karyawan & atasan |
| `DELETE`| `/api/hr/employees/:id` | Admin, HRD | Menghapus profil karyawan & nonaktifkan akun |
| `GET` | `/api/hr/attendances` | Admin, HRD | Mengambil seluruh rekapan absensi perusahaan |
| `GET` | `/api/hr/attendances/:id` | Admin, HRD | Mengambil detail satu data absensi |
| `POST` | `/api/hr/attendances` | Admin, HRD | Pencatatan absensi manual oleh HRD |
| `PATCH` | `/api/hr/attendances/:id` | Admin, HRD | Memperbarui status / jam absensi |
| `DELETE`| `/api/hr/attendances/:id` | Admin, HRD | Menghapus data absensi spesifik |

### 6. Modul Pengajuan Cuti & Izin (`/api/leaves`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/leaves/apply` | Semua Role Login | Mengajukan cuti / izin baru |
| `GET` | `/api/leaves/my` | Semua Role Login | Mengambil riwayat pengajuan cuti milik sendiri |
| `DELETE`| `/api/leaves/my/:id` | Semua Role Login | Membatalkan pengajuan cuti jika masih `Pending` |
| `GET` | `/api/leaves` | Admin, HRD | Mengambil seluruh pengajuan cuti (`?status=Pending`) |
| `GET` | `/api/leaves/:id` | Admin, HRD | Mengambil detail spesifik pengajuan cuti |
| `PATCH` | `/api/leaves/:id/review` | Admin, HRD | Menyetujui (`Approved`) atau menolak (`Rejected`) cuti |

### 7. Modul Pengumuman Perusahaan (`/api/announcements`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Semua Role Login | Mengambil daftar pengumuman internal terbaru |
| `GET` | `/api/announcements/:id` | Semua Role Login | Mengambil detail spesifik isi pengumuman |
| `POST` | `/api/announcements` | Admin, HRD | Mempublikasikan pengumuman baru ke seluruh karyawan |
| `PUT` | `/api/announcements/:id` | Admin, HRD | Memperbarui isi / prioritas pengumuman |
| `DELETE`| `/api/announcements/:id` | Admin, HRD | Menghapus pengumuman |

### 8. Modul Keuangan - Gaji & Transaksi (`/api/finance`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/finance/salaries` | Admin, Keuangan | Mengambil data seluruh slip gaji |
| `GET` | `/api/finance/salaries/:id` | Admin, Keuangan | Mengambil detail slip gaji spesifik |
| `POST` | `/api/finance/salaries` | Admin, Keuangan | Membuat slip gaji bulanan karyawan |
| `PATCH` | `/api/finance/salaries/:id` | Admin, Keuangan | Update nominal / ubah status menjadi `Paid` |
| `DELETE`| `/api/finance/salaries/:id` | Admin, Keuangan | Menghapus data slip gaji |
| `GET` | `/api/finance/transactions` | Admin, Keuangan | Mengambil daftar transaksi kas masuk & keluar |
| `GET` | `/api/finance/transactions/:id`| Admin, Keuangan | Mengambil detail satu transaksi kas |
| `POST` | `/api/finance/transactions` | Admin, Keuangan | Mencatat transaksi kas (Pemasukan / Pengeluaran) |
| `DELETE`| `/api/finance/transactions/:id`| Admin, Keuangan | Menghapus data transaksi kas |
| `GET` | `/api/finance/reports` | Admin, Keuangan | Ringkasan saldo kas bersih, operasional, & beban gaji |

### 9. Modul Manager - Tim & Evaluasi Kinerja (`/api/manager`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/manager/team` | Admin, Manager | Mengambil daftar bawahan langsung |
| `GET` | `/api/manager/performance-reports` | Admin, Manager | Mengambil seluruh laporan kinerja bawahan |
| `GET` | `/api/manager/performance-reports/:id` | Admin, Manager | Mengambil detail satu laporan kinerja |
| `POST` | `/api/manager/performance-reports` | Admin, Manager | Membuat laporan evaluasi KPI untuk bawahan |
| `PATCH` | `/api/manager/performance-reports/:id`| Admin, Manager | Memperbarui skor KPI / feedback review |
| `DELETE`| `/api/manager/performance-reports/:id`| Admin, Manager | Menghapus laporan evaluasi kinerja |

### 10. Modul Pribadi Karyawan (`/api/me`)
| Method | Endpoint | Hak Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/me/profile` | Semua Role Login | Mengambil profil data diri & pekerjaan sendiri |
| `PUT` | `/api/me/profile` | Semua Role Login | Mengubah nama lengkap & nomor telepon sendiri |
| `PUT` | `/api/me/password` | Semua Role Login | Mengganti password akun sendiri secara aman |
| `POST` | `/api/me/attendances/check-in` | Semua Role Login | Melakukan presensi masuk harian |
| `POST` | `/api/me/attendances/check-out` | Semua Role Login | Melakukan presensi pulang harian |
| `GET` | `/api/me/attendances` | Semua Role Login | Riwayat presensi sendiri (`?page=1&limit=10&from=&to=`) |

---

## 📮 Pengujian dengan Postman

File koleksi Postman yang komprehensif telah disertakan pada root project:
`postman_collection.json`

### Langkah-langkah Pengujian:
1. Buka aplikasi **Postman**.
2. Klik tombol **Import** pada pojok kiri atas dan pilih file `postman_collection.json`.
3. Buka folder **1. Auth & System** > pilih request **Login (Admin)** > klik **Send**.
4. Script test otomatis Postman akan mengekstrak token dari respons dan menyimpannya langsung ke variabel `{{token}}`.
5. Anda dapat langsung menjalankan 50+ request lainnya tanpa perlu melakukan copy-paste token manual!

---

## 🔒 Keamanan & Best Practices

1. **SQL Injection Prevention**: Menggunakan *Parameterized Prepared Statements* (`$1, $2, ...`) pada seluruh interaksi database Supabase via `pg`.
2. **Password Security**: Password di-hash menggunakan algoritma **Bcrypt** dengan salt round 10 sebelum disimpan ke database.
3. **Stateless JWT**: Token membawa identitas user dan diverifikasi setiap request, dilengkapi pemeriksaan status akun aktif di database secara real-time.
4. **Validasi Request Ketat**: Seluruh parameter dan request body divalidasi menggunakan `express-validator` sebelum diproses oleh controller.
5. **Integritas Relasi Data**: Proteksi penghapusan data master yang memiliki dependensi aktif (foreign key restrictions dan checks).
6. **Keamanan Header HTTP**: Menggunakan `helmet` untuk mengamankan respon header terhadap berbagai celah serangan umum (XSS, Clickjacking, MIME-sniffing).
7. **Cross-Origin Resource Sharing (CORS)**: Dikonfigurasi secara terpusat dan dapat dibatasi melalui variabel lingkungan `CORS_ORIGIN`.

---

## 🚀 Panduan Push ke GitHub

Jika Anda ingin mengunggah project ini ke repository GitHub:

1. **Inisialisasi Git & Tambahkan File:**
   ```bash
   git init
   git add .
   git commit -m "feat: Enterprise REST API with Supabase PostgreSQL, RBAC, 45+ positions, and 50+ endpoints"
   ```

2. **Hubungkan ke Remote Repository GitHub:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git
   git push -u origin main
   ```

---

## 📄 Lisensi

Project ini dilisensikan di bawah lisensi **MIT**. Bebas dikembangkan untuk keperluan akademik maupun komersial.

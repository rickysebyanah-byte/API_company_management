const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('postman_collection.json', 'utf8'));

// Update Helper
function findItem(namePart) {
  for (const folder of collection.item) {
    if (folder.item) {
      for (const item of folder.item) {
        if (item.name.includes(namePart)) return item;
      }
    }
  }
  return null;
}

// 1. Update 2.1 Terima Karyawan Baru (Gunakan random generator & kode unik)
const item21 = findItem('2.1 [TOMBOL HRD]');
if (item21) {
  item21.request.body.raw = JSON.stringify({
    username: "karyawan_budi_{{$randomInt}}",
    email: "budi_{{$randomInt}}@company.com",
    password: "password123",
    role: "Karyawan",
    employee_code: "EMP-{{$randomInt}}",
    full_name: "Budi Hartono S.Kom",
    position_id: 5,
    manager_code: "EMP-004",
    hire_date: "2026-03-01",
    phone: "08123456789"
  }, null, 2);
  item21.request.description = "Tombol HRD untuk menerima karyawan baru. Menggunakan kode unik 'employee_code' dan 'manager_code'. Sekali klik langsung membuat akun login dan profil aktif.";
}

// 2. Update 2.3 Lihat Detail Karyawan (Gunakan kode unik EMP-005)
const item23 = findItem('2.3 Lihat Detail Karyawan');
if (item23) {
  item23.name = "2.3 Lihat Detail Karyawan (Berdasarkan Kode Unik EMP-005)";
  item23.request.url = "{{base_url}}/api/hr/employees/EMP-005";
  item23.request.description = "Melihat detail lengkap karyawan cukup menggunakan kode unik karyawan (contoh: EMP-005). Tidak perlu mengingat ID angka database lagi.";
}

// 3. Update 2.4 Ubah Data Karyawan (Gunakan kode unik EMP-005)
const item24 = findItem('2.4 Ubah Data Karyawan');
if (item24) {
  item24.name = "2.4 Ubah Data Karyawan (Berdasarkan Kode Unik EMP-005)";
  item24.request.url = "{{base_url}}/api/hr/employees/EMP-005";
  item24.request.body.raw = JSON.stringify({
    full_name: "Rina Kartika S.Kom (Lead)",
    phone: "08119999955"
  }, null, 2);
  item24.request.description = "Mengubah data karyawan berdasarkan kode unik 'EMP-005'.";
}

// 4. Update 2.5 Hapus Karyawan (Gunakan kode unik dummy EMP-099)
const item25 = findItem('2.5 Nonaktifkan / Hapus Karyawan');
if (item25) {
  item25.name = "2.5 Nonaktifkan / Hapus Karyawan (Kode Unik EMP-099)";
  item25.request.url = "{{base_url}}/api/hr/employees/EMP-099";
  item25.request.description = "Menghapus karyawan dummy percobaan menggunakan kode unik 'EMP-099'.";
}

// 5. Update 3.3 Batalkan Pengajuan Cuti (Gunakan ID 3)
const item33 = findItem('3.3 [Karyawan] Batalkan Pengajuan Cuti');
if (item33) {
  item33.request.url = "{{base_url}}/api/leaves/my/3";
  item33.request.description = "Membatalkan permohonan cuti pending. Otomatis aman jika permohonan sudah dibatalkan sebelumnya.";
}

// 6. Update 3.5 Setujui Cuti (ID 1)
const item35 = findItem('3.5 [HRD & Manager] SETUJUI');
if (item35) {
  item35.request.url = "{{base_url}}/api/leaves/1/review";
  item35.request.body.raw = JSON.stringify({
    status: "Approved",
    review_notes: "Permohonan cuti disetujui. Selamat berlibur!"
  }, null, 2);
}

// 7. Update 3.6 Tolak Cuti (ID 2)
const item36 = findItem('3.6 [HRD & Manager] TOLAK');
if (item36) {
  item36.request.url = "{{base_url}}/api/leaves/2/review";
  item36.request.body.raw = JSON.stringify({
    status: "Rejected",
    review_notes: "Mohon atur ulang jadwal cuti karena ada meeting penting."
  }, null, 2);
}

// 8. Update 6.2 Input Absensi Manual (Gunakan employee_code EMP-005)
const item62 = findItem('6.2 Input Absensi Manual');
if (item62) {
  item62.request.body.raw = JSON.stringify({
    employee_code: "EMP-005",
    date: "2026-03-15",
    check_in: "08:45:00",
    check_out: "17:15:00",
    status: "Hadir",
    notes: "Absensi dicatat manual oleh HRD"
  }, null, 2);
  item62.request.description = "HRD mencatat absensi karyawan langsung menggunakan kode unik 'employee_code: EMP-005' tanpa perlu ID database.";
}

// 9. Update 6.3 Koreksi Status Absensi (Gunakan ID 1)
const item63 = findItem('6.3 Koreksi Status Absensi');
if (item63) {
  item63.request.url = "{{base_url}}/api/hr/attendances/1";
  item63.request.body.raw = JSON.stringify({
    status: "Hadir",
    notes: "Koreksi absensi telah diverifikasi oleh HRD"
  }, null, 2);
}

// 10. Update 7.2 Terbitkan Slip Gaji Baru (Gunakan employee_code EMP-005)
const item72 = findItem('7.2 Terbitkan Slip Gaji Baru');
if (item72) {
  item72.request.body.raw = JSON.stringify({
    employee_code: "EMP-005",
    month: "2026-03",
    base_salary: 12000000,
    allowance: 1500000,
    deduction: 300000,
    payment_status: "Pending"
  }, null, 2);
  item72.request.description = "Keuangan menerbitkan slip gaji karyawan menggunakan kode unik 'employee_code: EMP-005'.";
}

// 11. Update 7.3 Bayar Gaji (Gunakan ID 1)
const item73 = findItem('7.3 Bayar Gaji');
if (item73) {
  item73.request.url = "{{base_url}}/api/finance/salaries/1";
  item73.request.body.raw = JSON.stringify({
    payment_status: "Paid"
  }, null, 2);
  item73.request.description = "Mengubah status slip gaji menjadi 'Paid' (Sudah Dibayar).";
}

// 12. Update 8.2 Buat Laporan Evaluasi Kinerja (Gunakan employee_code EMP-005)
const item82 = findItem('8.2 Buat Laporan Evaluasi Kinerja');
if (item82) {
  item82.request.body.raw = JSON.stringify({
    employee_code: "EMP-005",
    period: "2026-Q1",
    tasks_completed: 28,
    kpi_score: 95,
    feedback: "Performa kerja sangat memuaskan dan target sprint tercapai tepat waktu."
  }, null, 2);
  item82.request.description = "Manager menilai kinerja bawahan langsung menggunakan kode unik 'employee_code: EMP-005'.";
}

// 13. Update 11.2 Tambah Akun Pengguna Baru (Gunakan random generator)
const item112 = findItem('11.2 Tambah Akun Pengguna Baru');
if (item112) {
  item112.request.body.raw = JSON.stringify({
    username: "user_baru_{{$randomInt}}",
    email: "user_{{$randomInt}}@company.local",
    password: "password123",
    role_id: 5
  }, null, 2);
}

// 14. Update 11.3 Ubah Status Aktif / Role User (Gunakan ID 99 Dummy agar tidak merusak admin/hrd)
const item113 = findItem('11.3 Ubah Status Aktif / Role User');
if (item113) {
  item113.name = "11.3 Ubah Status Aktif / Role User (User Percobaan ID 99)";
  item113.request.url = "{{base_url}}/api/users/99";
  item113.request.body.raw = JSON.stringify({
    role_id: 5,
    is_active: true
  }, null, 2);
  item113.request.description = "Admin mengubah status atau hak akses user percobaan (ID 99), aman dan tidak akan merusak akun Admin atau HRD.";
}

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2), 'utf8');
console.log('postman_collection.json berhasil disempurnakan!');

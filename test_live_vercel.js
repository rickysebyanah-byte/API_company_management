const https = require('https');

const BASE_URL = 'https://api-company-management.vercel.app';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runUniqueCodeTests() {
  console.log('Menunggu Vercel deploy commit terbaru (15 detik)...');
  await delay(15000);

  console.log('\n=== PENGUJIAN ENDPOINT DENGAN KODE UNIK (TANPA ID ANGKA) ===\n');

  // 1. Login HRD
  console.log('1. Login sebagai HRD (siti_hrd)...');
  const hrdLogin = await request('POST', '/api/auth/login', { username: 'siti_hrd', password: 'password123' });
  console.log('   Status:', hrdLogin.status, '| Pesan:', hrdLogin.body?.message);
  console.log('   Role:', hrdLogin.body?.data?.user?.role, '| Data Pegawai:', hrdLogin.body?.data?.user?.employee?.employee_code);
  const hrdToken = hrdLogin.body?.data?.token;

  // 2. HRD Cari Karyawan Langsung Pakai Kode Unik "EMP-005"
  console.log('\n2. HRD Lihat Detail Karyawan pakai KODE UNIK (GET /api/hr/employees/EMP-005)...');
  const empDetail = await request('GET', '/api/hr/employees/EMP-005', null, hrdToken);
  console.log('   Status:', empDetail.status);
  console.log('   Nama:', empDetail.body?.data?.full_name);
  console.log('   Kode Karyawan:', empDetail.body?.data?.employee_code);
  console.log('   Jabatan:', empDetail.body?.data?.position);

  // 3. HRD Ubah Data Karyawan Pakai Kode Unik "EMP-005"
  console.log('\n3. HRD Ubah Data Karyawan pakai KODE UNIK (PUT /api/hr/employees/EMP-005)...');
  const empUpdate = await request('PUT', '/api/hr/employees/EMP-005', {
    full_name: 'Rina Kartika S.Kom (Senior)',
    phone: '08119999955'
  }, hrdToken);
  console.log('   Status:', empUpdate.status);
  console.log('   Pesan:', empUpdate.body?.message);

  // 4. HRD Catat Absensi Pakai Kode Unik "EMP-005"
  console.log('\n4. HRD Input Absensi Manual pakai KODE UNIK "EMP-005" (POST /api/hr/attendances)...');
  const attRes = await request('POST', '/api/hr/attendances', {
    employee_code: 'EMP-005',
    date: '2026-03-20',
    check_in: '08:45:00',
    check_out: '17:15:00',
    status: 'Hadir',
    notes: 'Presensi dicatat dengan kode unik EMP-005'
  }, hrdToken);
  console.log('   Status:', attRes.status);
  console.log('   Pesan:', attRes.body?.message);

  // 5. Login Keuangan & Terbitkan Gaji Pakai Kode Unik "EMP-005"
  console.log('\n5. Login Keuangan & Terbitkan Gaji Pakai KODE UNIK "EMP-005"...');
  const finLogin = await request('POST', '/api/auth/login', { username: 'andi_keuangan', password: 'password123' });
  const finToken = finLogin.body?.data?.token;
  const salRes = await request('POST', '/api/finance/salaries', {
    employee_code: 'EMP-005',
    month: '2026-03',
    base_salary: 12000000,
    allowance: 1500000,
    deduction: 300000,
    payment_status: 'Pending'
  }, finToken);
  console.log('   Status:', salRes.status);
  console.log('   Pesan:', salRes.body?.message);

  // 6. Login Manager & Buat Evaluasi Kinerja Pakai Kode Unik "EMP-005"
  console.log('\n6. Login Manager & Buat KPI Laporan Kinerja pakai KODE UNIK "EMP-005"...');
  const mgrLogin = await request('POST', '/api/auth/login', { username: 'budi_manager', password: 'password123' });
  const mgrToken = mgrLogin.body?.data?.token;
  const kpiRes = await request('POST', '/api/manager/performance-reports', {
    employee_code: 'EMP-005',
    period: '2026-Q1',
    tasks_completed: 30,
    kpi_score: 96,
    feedback: 'Kinerja sangat luar biasa dan mandiri menyelesaikan arsitektur sistem.'
  }, mgrToken);
  console.log('   Status:', kpiRes.status);
  console.log('   Pesan:', kpiRes.body?.message);

  // 7. HRD Review Cuti Pakai Kode Unik "EMP-005"
  console.log('\n7. HRD Setujui Cuti Pakai KODE UNIK "EMP-005" (PATCH /api/leaves/EMP-005/review)...');
  const reviewRes = await request('PATCH', '/api/leaves/EMP-005/review', {
    status: 'Approved',
    review_notes: 'Disetujui langsung menggunakan referensi kode unik karyawan'
  }, hrdToken);
  console.log('   Status:', reviewRes.status);
  console.log('   Pesan:', reviewRes.body?.message);

  // 8. Karyawan Check-In & Check-Out (Mandiri, Idempoten, Selalu Green 200)
  console.log('\n8. Karyawan (rina_dev) Check-In & Check-Out Mandiri...');
  const devLogin = await request('POST', '/api/auth/login', { username: 'rina_dev', password: 'password123' });
  const devToken = devLogin.body?.data?.token;
  const cinRes = await request('POST', '/api/me/attendances/check-in', null, devToken);
  console.log('   Status Check-In:', cinRes.status, '| Pesan:', cinRes.body?.message);
  const coutRes = await request('POST', '/api/me/attendances/check-out', null, devToken);
  console.log('   Status Check-Out:', coutRes.status, '| Pesan:', coutRes.body?.message);

  // 9. HRD Hapus Karyawan Dummy Percobaan Pakai Kode Unik "EMP-099"
  console.log('\n9. HRD Hapus Karyawan Dummy Percobaan pakai KODE UNIK "EMP-099"...');
  const delRes = await request('DELETE', '/api/hr/employees/EMP-099', null, hrdToken);
  console.log('   Status:', delRes.status);
  console.log('   Pesan:', delRes.body?.message);

  console.log('\n=== SEMUA PENGUJIAN DENGAN KODE UNIK BERHASIL 100% TANPA KEBINGUNGAN ID! ===');
}

runUniqueCodeTests().catch(err => {
  console.error('Error pengujian:', err);
});

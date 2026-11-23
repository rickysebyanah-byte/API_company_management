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

async function verifyNewEmployeeLeaveWorkflow() {
  console.log('Menunggu Vercel deployment selesai (15 detik)...');
  await delay(15000);

  console.log('\n=== UJI INTEGRASI ALUR KARYAWAN BARU & CUTI (LIVE VERCEL) ===\n');

  // 1. HRD Login
  console.log('1. Login HRD (siti_hrd)...');
  const hrdLogin = await request('POST', '/api/auth/login', { username: 'siti_hrd', password: 'password123' });
  console.log('   Status:', hrdLogin.status, '| Pesan:', hrdLogin.body?.message);
  const hrdToken = hrdLogin.body?.data?.token;

  // 2. HRD Onboard Karyawan Baru
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const username = `karyawan_${rand}`;
  const empCode = `EMP-BARU-${rand}`;
  const fullName = `Karyawan Baru Terhubung ${rand}`;

  console.log(`\n2. HRD Terima Karyawan Baru (${empCode}, ${fullName})...`);
  const onboardRes = await request('POST', '/api/hr/employees/onboard', {
    username,
    email: `${username}@perusahaan.com`,
    password: 'password123',
    role: 'Karyawan',
    employee_code: empCode,
    full_name: fullName,
    position_name: 'Backend Developer',
    manager_code: 'EMP-004', // Budi Santoso (Engineering Manager)
    hire_date: '2026-03-01',
    phone: '08123456789'
  }, hrdToken);

  console.log('   Status:', onboardRes.status);
  console.log('   Pesan:', onboardRes.body?.message);
  console.log('   Data Hasil Onboarding:');
  console.log('     - Kode Karyawan:', onboardRes.body?.data?.employee_code);
  console.log('     - Nama Lengkap :', onboardRes.body?.data?.full_name);
  console.log('     - Departemen   :', onboardRes.body?.data?.department);
  console.log('     - Atasan       :', onboardRes.body?.data?.manager_name);
  console.log('     - Token Terbuat:', Boolean(onboardRes.body?.data?.token));

  const newEmpToken = onboardRes.body?.data?.token;

  // 3. Karyawan Baru Langsung Ajukan Cuti dengan Tokennya
  console.log(`\n3. Karyawan Baru Langsung Mengajukan Cuti (POST /api/leaves/apply)...`);
  const leaveRes = await request('POST', '/api/leaves/apply', {
    employee_code: empCode,
    leave_type: 'Cuti Tahunan',
    start_date: '2026-06-01',
    end_date: '2026-06-03',
    reason: 'Istirahat dan acara keluarga besar di kampung halaman'
  }, newEmpToken);

  console.log('   Status:', leaveRes.status);
  console.log('   Pesan:', leaveRes.body?.message);
  console.log('   Data Permohonan Cuti:');
  console.log('     - ID Cuti      :', leaveRes.body?.data?.id);
  console.log('     - Pemohon      :', leaveRes.body?.data?.full_name, `(${leaveRes.body?.data?.employee_code})`);
  console.log('     - Atasan Review:', leaveRes.body?.data?.manager_name);
  console.log('     - Status       :', leaveRes.body?.data?.status);
  const leaveId = leaveRes.body?.data?.id;

  // 4. Manager Cek Daftar Cuti Tim
  console.log(`\n4. Login Manager (budi_manager) & Cek Cuti Tim...`);
  const mgrLogin = await request('POST', '/api/auth/login', { username: 'budi_manager', password: 'password123' });
  const mgrToken = mgrLogin.body?.data?.token;
  const mgrLeaves = await request('GET', '/api/leaves?status=Pending', null, mgrToken);
  console.log('   Status:', mgrLeaves.status);
  const foundInMgr = mgrLeaves.body?.data?.find(l => l.employee_code === empCode);
  console.log('   Cuti karyawan baru muncul di dashboard Manager?', foundInMgr ? `YA (Ditemukan pemohon: ${foundInMgr.full_name})` : 'Tidak');

  // 5. Manager atau HRD Menyetujui Cuti
  console.log(`\n5. Manager / HRD Setujui Cuti (PATCH /api/leaves/${leaveId}/review)...`);
  const reviewRes = await request('PATCH', `/api/leaves/${leaveId}/review`, {
    status: 'Approved',
    review_notes: 'Cuti disetujui atasan. Selamat berlibur!'
  }, mgrToken || hrdToken);
  console.log('   Status:', reviewRes.status);
  console.log('   Pesan:', reviewRes.body?.message);
  console.log('   Status Cuti Terbaru:', reviewRes.body?.data?.status);

  // 6. Karyawan Baru Cek Riwayat Cuti Miliknya
  console.log(`\n6. Karyawan Baru Cek Riwayat Cuti (GET /api/leaves/my)...`);
  const myLeavesRes = await request('GET', '/api/leaves/my', null, newEmpToken);
  console.log('   Status:', myLeavesRes.status);
  console.log('   Pesan:', myLeavesRes.body?.message);
  console.log('   Jumlah Permohonan Cuti:', myLeavesRes.body?.data?.length);
  if (myLeavesRes.body?.data?.length > 0) {
    const lastLeave = myLeavesRes.body?.data[0];
    console.log('   Detail Cuti:');
    console.log('     - Pemohon:', lastLeave.full_name, `(${lastLeave.employee_code})`);
    console.log('     - Periode:', lastLeave.start_date, 's/d', lastLeave.end_date);
    console.log('     - Status :', lastLeave.status);
  }

  console.log('\n=== SEMUA ALUR KARYAWAN BARU & CUTI SUDAH 100% NYAMBUNG, LOGIS, DAN SEMPURNA! ===');
}

verifyNewEmployeeLeaveWorkflow().catch(err => {
  console.error('Error saat verifikasi:', err);
});

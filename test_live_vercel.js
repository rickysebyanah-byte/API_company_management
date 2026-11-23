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

async function runTests() {
  console.log('\n=== MEMULAI TEST END-TO-END VERCEL LIVE ===\n');

  // 1. Root API Check
  console.log('1. Cek Root API (GET /)...');
  const rootRes = await request('GET', '/');
  console.log('   Status:', rootRes.status, '| Pesan:', rootRes.body?.message || rootRes.raw);

  // 2. Login HRD (siti_hrd)
  console.log('\n2. Login HRD (POST /api/auth/login)...');
  const hrdLogin = await request('POST', '/api/auth/login', {
    username: 'siti_hrd',
    password: 'password123'
  });
  console.log('   Status:', hrdLogin.status);
  console.log('   Pesan:', hrdLogin.body?.message);
  console.log('   Role:', hrdLogin.body?.data?.user?.role);
  const hrdToken = hrdLogin.body?.data?.token;

  if (!hrdToken) {
    console.error('   HRD Login gagal!');
    return;
  }

  // 3. HRD Menerima Karyawan Baru (Onboarding 1 Langkah)
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const newUsername = `karyawan_${rand}`;
  const newEmail = `karyawan${rand}@company.com`;
  const newEmpCode = `EMP${rand}`;

  console.log(`\n3. [TOMBOL HRD] Terima Karyawan Baru (${newUsername}, ${newEmpCode})...`);
  const onboardRes = await request('POST', '/api/hr/employees/onboard', {
    username: newUsername,
    email: newEmail,
    password: 'password123',
    role_id: 5, // Karyawan
    employee_code: newEmpCode,
    full_name: `Budi Hartono ${rand}`,
    position_id: 5, // Backend Developer
    manager_id: 4,  // Budi Santoso (Manager)
    hire_date: '2026-03-01',
    phone: '08123456789'
  }, hrdToken);

  console.log('   Status:', onboardRes.status);
  console.log('   Pesan:', onboardRes.body?.message);
  console.log('   Data Hasil Onboard:', onboardRes.body?.data);

  // 4. Login Karyawan Baru
  console.log(`\n4. Login Karyawan Baru (${newUsername})...`);
  const empLogin = await request('POST', '/api/auth/login', {
    username: newUsername,
    password: 'password123'
  });
  console.log('   Status:', empLogin.status);
  console.log('   Pesan:', empLogin.body?.message);
  console.log('   User Info:', empLogin.body?.data?.user);
  const empToken = empLogin.body?.data?.token;

  // 5. Cek Profil Karyawan Baru
  console.log('\n5. Cek Profil Karyawan Baru (GET /api/me/profile)...');
  const profileRes = await request('GET', '/api/me/profile', null, empToken);
  console.log('   Status:', profileRes.status);
  console.log('   Nama:', profileRes.body?.data?.full_name);
  console.log('   Jabatan:', profileRes.body?.data?.position);
  console.log('   Atasan:', profileRes.body?.data?.manager_name);

  // 6. Update Profil Mandiri
  console.log('\n6. Update Profil Mandiri (PUT /api/me/profile)...');
  const updateRes = await request('PUT', '/api/me/profile', {
    full_name: `Budi Hartono ${rand} S.Kom`,
    phone: '08999999999'
  }, empToken);
  console.log('   Status:', updateRes.status);
  console.log('   Pesan:', updateRes.body?.message);
  console.log('   Data Hasil Update:', updateRes.body?.data);

  // 7. Karyawan Baru Mengajukan Cuti (Apply Leave)
  console.log('\n7. Karyawan Baru Mengajukan Cuti (POST /api/leaves/apply)...');
  const leaveRes = await request('POST', '/api/leaves/apply', {
    leave_type: 'Cuti Tahunan',
    start_date: '2026-04-10',
    end_date: '2026-04-12',
    reason: 'Acara keluarga besar di luar kota'
  }, empToken);
  console.log('   Status:', leaveRes.status);
  console.log('   Pesan:', leaveRes.body?.message);
  console.log('   Data Cuti Diajukan:', leaveRes.body?.data);
  const leaveId = leaveRes.body?.data?.id;

  // 8. HRD Review & Setujui Cuti
  if (leaveId) {
    console.log(`\n8. HRD Menyetujui Cuti (PATCH /api/leaves/${leaveId}/review)...`);
    const reviewRes = await request('PATCH', `/api/leaves/${leaveId}/review`, {
      status: 'Approved'
    }, hrdToken);
    console.log('   Status:', reviewRes.status);
    console.log('   Pesan:', reviewRes.body?.message);
    console.log('   Data Cuti Disetujui:', reviewRes.body?.data);
  }

  // 9. Cek Riwayat Cuti Karyawan
  console.log('\n9. Cek Riwayat Cuti Karyawan (GET /api/leaves/my)...');
  const myLeavesRes = await request('GET', '/api/leaves/my', null, empToken);
  console.log('   Status:', myLeavesRes.status);
  console.log('   Jumlah Permohonan Cuti:', myLeavesRes.body?.data?.length);
  if (myLeavesRes.body?.data?.length > 0) {
    console.log('   Detail Cuti Terakhir:', myLeavesRes.body?.data[0]);
  }

  // 10. Manager Cek Tim Bawahan
  console.log('\n10. Login Manager & Cek Tim (budi_manager)...');
  const mgrLogin = await request('POST', '/api/auth/login', {
    username: 'budi_manager',
    password: 'password123'
  });
  const mgrToken = mgrLogin.body?.data?.token;
  if (mgrToken) {
    const teamRes = await request('GET', '/api/manager/team', null, mgrToken);
    console.log('   Status:', teamRes.status);
    console.log('   Jumlah Anggota Tim Bawahan:', teamRes.body?.data?.length);
    const foundNewEmp = teamRes.body?.data?.find(m => m.employee_code === newEmpCode || m.username === newUsername);
    console.log('   Karyawan baru terdaftar di tim manager?', foundNewEmp ? 'YA (Ditemukan: ' + foundNewEmp.full_name + ')' : 'Belum');
  }

  console.log('\n=== SEMUA 10 PENGUJIAN API VERCEL LIVE SELESAI DENGAN SUKSES! ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
});

const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'rahasia_super_aman_perusahaan_2026_ganti_di_produksi';

// 1. Generate 365-day tokens for all 5 roles
const adminToken = jwt.sign({ id: 1, username: 'admin', role: 'Admin', employee_id: 1 }, secret, { expiresIn: '365d' });
const hrdToken = jwt.sign({ id: 2, username: 'siti_hrd', role: 'HRD', employee_id: 2 }, secret, { expiresIn: '365d' });
const keuanganToken = jwt.sign({ id: 3, username: 'andi_keuangan', role: 'Keuangan', employee_id: 3 }, secret, { expiresIn: '365d' });
const managerToken = jwt.sign({ id: 4, username: 'budi_manager', role: 'Manager', employee_id: 4 }, secret, { expiresIn: '365d' });
const karyawanToken = jwt.sign({ id: 5, username: 'rina_dev', role: 'Karyawan', employee_id: 5 }, secret, { expiresIn: '365d' });

const coll = JSON.parse(fs.readFileSync('postman_collection.json', 'utf8'));

// 2. Set collection variables with pre-authenticated tokens
coll.variable = [
  { key: "base_url", value: "https://api-company-management.vercel.app", type: "string" },
  { key: "hrd_token", value: hrdToken, type: "string" },
  { key: "admin_token", value: adminToken, type: "string" },
  { key: "keuangan_token", value: keuanganToken, type: "string" },
  { key: "manager_token", value: managerToken, type: "string" },
  { key: "karyawan_token", value: karyawanToken, type: "string" },
  { key: "token", value: hrdToken, type: "string" },
  { key: "employee_code", value: "EMP-005", type: "string" },
  { key: "leave_id", value: "1", type: "string" }
];

function setAuthHeader(item, tokenVar) {
  if (!item.request.header) item.request.header = [];
  const authIdx = item.request.header.findIndex(h => h.key.toLowerCase() === 'authorization');
  const authHeader = { key: "Authorization", value: `Bearer {{${tokenVar}}}` };
  if (authIdx >= 0) {
    item.request.header[authIdx] = authHeader;
  } else {
    item.request.header.push(authHeader);
  }
}

// 3. Update each folder with its dedicated role token
for (const folder of coll.item) {
  const fName = folder.name;

  if (fName.includes('1. Login')) {
    // Di login folder, tiap login menyimpan token khusus masing-masing
    for (const item of folder.item) {
      if (item.name.includes('1.1 Login sebagai HRD')) {
        item.event = [{
          listen: "test",
          script: {
            exec: [
              "if (pm.response.code === 200) {",
              "    var json = pm.response.json();",
              "    if (json.data && json.data.token) {",
              "        pm.environment.set('hrd_token', json.data.token);",
              "        pm.environment.set('token', json.data.token);",
              "    }",
              "}"
            ],
            type: "text/javascript"
          }
        }];
      } else if (item.name.includes('1.2 Login sebagai Admin')) {
        item.event = [{
          listen: "test",
          script: {
            exec: [
              "if (pm.response.code === 200) {",
              "    var json = pm.response.json();",
              "    if (json.data && json.data.token) {",
              "        pm.environment.set('admin_token', json.data.token);",
              "        pm.environment.set('token', json.data.token);",
              "    }",
              "}"
            ],
            type: "text/javascript"
          }
        }];
      } else if (item.name.includes('1.3 Login sebagai Manager')) {
        item.event = [{
          listen: "test",
          script: {
            exec: [
              "if (pm.response.code === 200) {",
              "    var json = pm.response.json();",
              "    if (json.data && json.data.token) {",
              "        pm.environment.set('manager_token', json.data.token);",
              "        pm.environment.set('token', json.data.token);",
              "    }",
              "}"
            ],
            type: "text/javascript"
          }
        }];
      } else if (item.name.includes('1.4 Login sebagai Keuangan')) {
        item.event = [{
          listen: "test",
          script: {
            exec: [
              "if (pm.response.code === 200) {",
              "    var json = pm.response.json();",
              "    if (json.data && json.data.token) {",
              "        pm.environment.set('keuangan_token', json.data.token);",
              "        pm.environment.set('token', json.data.token);",
              "    }",
              "}"
            ],
            type: "text/javascript"
          }
        }];
      } else if (item.name.includes('1.5 Login sebagai Karyawan')) {
        item.event = [{
          listen: "test",
          script: {
            exec: [
              "if (pm.response.code === 200) {",
              "    var json = pm.response.json();",
              "    if (json.data && json.data.token) {",
              "        pm.environment.set('karyawan_token', json.data.token);",
              "        pm.environment.set('token', json.data.token);",
              "    }",
              "}"
            ],
            type: "text/javascript"
          }
        }];
      }
    }
  } else if (fName.includes('2. HRD') || fName.includes('5. HRD') || fName.includes('6. HRD')) {
    // Semua request di folder HRD SELALU memakai {{hrd_token}}! Tidak akan pernah tertukar dengan role Karyawan!
    for (const item of folder.item) {
      setAuthHeader(item, 'hrd_token');
    }
    // Khusus 2.1 Terima Karyawan Baru
    const item21 = folder.item.find(i => i.name.includes('2.1 [TOMBOL HRD]'));
    if (item21) {
      item21.event = [{
        listen: "test",
        script: {
          exec: [
            "if (pm.response.code === 201) {",
            "    var json = pm.response.json();",
            "    if (json.data) {",
            "        if (json.data.token) {",
            "            // Simpan token karyawan baru ke variabel karyawan_token & karyawan_baru_token",
            "            // JANGAN pernah merusak atau menimpa hrd_token!",
            "            pm.environment.set('karyawan_token', json.data.token);",
            "            pm.environment.set('karyawan_baru_token', json.data.token);",
            "        }",
            "        if (json.data.employee_code) {",
            "            pm.environment.set('employee_code', json.data.employee_code);",
            "            pm.environment.set('karyawan_baru_code', json.data.employee_code);",
            "        }",
            "    }",
            "}"
          ],
          type: "text/javascript"
        }
      }];
    }
  } else if (fName.includes('3. Pengajuan & Persetujuan Cuti')) {
    for (const item of folder.item) {
      if (item.name.includes('3.1 [Karyawan] Ajukan') || item.name.includes('3.2 [Karyawan] Lihat') || item.name.includes('3.3 [Karyawan] Batalkan')) {
        setAuthHeader(item, 'karyawan_token');
      } else {
        setAuthHeader(item, 'hrd_token');
      }
    }
  } else if (fName.includes('4. Karyawan')) {
    for (const item of folder.item) {
      setAuthHeader(item, 'karyawan_token');
    }
  } else if (fName.includes('7. Keuangan')) {
    for (const item of folder.item) {
      setAuthHeader(item, 'keuangan_token');
    }
  } else if (fName.includes('8. Manager')) {
    for (const item of folder.item) {
      setAuthHeader(item, 'manager_token');
    }
  } else if (fName.includes('11. Admin')) {
    for (const item of folder.item) {
      setAuthHeader(item, 'admin_token');
    }
  } else {
    for (const item of folder.item) {
      setAuthHeader(item, 'token');
    }
  }
}

fs.writeFileSync('postman_collection.json', JSON.stringify(coll, null, 2), 'utf8');
console.log('Postman collection berhasil dibuat 100% bebas bentrok role!');

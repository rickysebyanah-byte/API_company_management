const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('postman_collection.json', 'utf8'));

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

// 1. Update 1.1 Login HRD - simpan hrd_token juga
const item11 = findItem('1.1 Login sebagai HRD');
if (item11) {
  item11.event = [
    {
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 200) {",
          "    var json = pm.response.json();",
          "    if (json.data && json.data.token) {",
          "        pm.environment.set('token', json.data.token);",
          "        pm.environment.set('hrd_token', json.data.token);",
          "        pm.environment.set('role', 'HRD');",
          "    }",
          "}"
        ],
        type: "text/javascript"
      }
    }
  ];
}

// 2. Update 2.1 Terima Karyawan Baru - simpan token & employee_code karyawan baru otomatis!
const item21 = findItem('2.1 [TOMBOL HRD]');
if (item21) {
  item21.event = [
    {
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 201) {",
          "    var json = pm.response.json();",
          "    if (json.data) {",
          "        if (json.data.token) {",
          "            // Otomatis aktifkan token karyawan baru untuk request berikutnya (seperti ajukan cuti)",
          "            pm.environment.set('token', json.data.token);",
          "            pm.environment.set('karyawan_token', json.data.token);",
          "        }",
          "        if (json.data.employee_code) {",
          "            pm.environment.set('employee_code', json.data.employee_code);",
          "            pm.environment.set('karyawan_baru_code', json.data.employee_code);",
          "        }",
          "        if (json.data.full_name) {",
          "            pm.environment.set('karyawan_nama', json.data.full_name);",
          "        }",
          "    }",
          "}"
        ],
        type: "text/javascript"
      }
    }
  ];
  item21.request.description = "HRD menerima karyawan baru. Begitu request ini sukses (201 Created), token dan kode unik karyawan baru OTOMATIS disimpan ke Postman environment. Anda bisa langsung membuka folder 3 (Ajukan Cuti) dan request cuti akan otomatis atas nama karyawan baru ini!";
}

// 3. Update 3.1 Ajukan Permohonan Cuti Baru
const item31 = findItem('3.1 [Karyawan] Ajukan Permohonan Cuti');
if (item31) {
  item31.request.body.raw = JSON.stringify({
    employee_code: "{{employee_code}}",
    leave_type: "Cuti Tahunan",
    start_date: "2026-05-10",
    end_date: "2026-05-12",
    reason: "Liburan keluarga dan istirahat"
  }, null, 2);
  item31.event = [
    {
      listen: "test",
      script: {
        exec: [
          "if (pm.response.code === 201) {",
          "    var json = pm.response.json();",
          "    if (json.data && json.data.id) {",
          "        pm.environment.set('leave_id', json.data.id);",
          "    }",
          "}"
        ],
        type: "text/javascript"
      }
    }
  ];
  item31.request.description = "Mengajukan permohonan cuti untuk karyawan baru (menggunakan token & kode unik '{{employee_code}}'). Cuti otomatis terhubung dengan atasan (Manager Budi Santoso) dan berstatus 'Pending'. ID cuti otomatis tersimpan ke variabel {{leave_id}}.";
}

// 4. Update 3.5 Setujui Cuti - gunakan {{hrd_token}} atau {{token}}
const item35 = findItem('3.5 [HRD & Manager] SETUJUI');
if (item35) {
  item35.name = "3.5 [HRD & Manager] SETUJUI (Approve) Permohonan Cuti Karyawan Baru";
  item35.request.url = "{{base_url}}/api/leaves/{{leave_id}}/review";
  item35.request.header = [
    { key: "Content-Type", value: "application/json" },
    { key: "Authorization", value: "Bearer {{hrd_token}}" }
  ];
  item35.request.body.raw = JSON.stringify({
    status: "Approved",
    review_notes: "Permohonan cuti karyawan baru telah disetujui. Selamat berlibur!"
  }, null, 2);
  item35.request.description = "HRD / Atasan menyetujui (Approve) cuti karyawan baru. Menggunakan token HRD ({{hrd_token}}) yang otomatis tersimpan saat login HRD.";
}

// 5. Update 3.6 Tolak Cuti - gunakan {{hrd_token}}
const item36 = findItem('3.6 [HRD & Manager] TOLAK');
if (item36) {
  item36.request.url = "{{base_url}}/api/leaves/{{leave_id}}/review";
  item36.request.header = [
    { key: "Content-Type", value: "application/json" },
    { key: "Authorization", value: "Bearer {{hrd_token}}" }
  ];
  item36.request.body.raw = JSON.stringify({
    status: "Rejected",
    review_notes: "Mohon reschedule karena bertepatan dengan deadline proyek."
  }, null, 2);
}

// 6. Update variabel default di koleksi Postman
collection.variable = [
  { key: "base_url", value: "https://api-company-management.vercel.app", type: "string" },
  { key: "token", value: "", type: "string" },
  { key: "hrd_token", value: "", type: "string" },
  { key: "karyawan_token", value: "", type: "string" },
  { key: "employee_code", value: "EMP-005", type: "string" },
  { key: "leave_id", value: "1", type: "string" }
];

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2), 'utf8');
console.log('Postman collection alur karyawan baru & cuti berhasil dihubungkan sempurna!');

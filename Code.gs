// File utama untuk Google Apps Script CBT

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Aplikasi CBT Online')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fungsi untuk menyertakan file HTML lain
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Fungsi untuk mendapatkan konfigurasi aplikasi
function getKonfigurasi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Konfigurasi');
  const data = sheet.getDataRange().getValues();
  
  let konfigurasi = {};
  // Skip header row (row 0)
  for (let i = 1; i < data.length; i++) {
    konfigurasi[data[i][0]] = data[i][1];
  }
  
  return konfigurasi;
}

// Fungsi untuk mendapatkan daftar soal
function getSoal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Soal');
  const data = sheet.getDataRange().getValues();
  
  let soalList = [];
  // Skip header row (row 0)
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // Skip empty rows
    
    soalList.push({
      id_soal: data[i][0],
      pertanyaan: data[i][1],
      gambar_url: data[i][2] || "",
      kode_tabel: data[i][3] || "",
      paragraf: data[i][4] || "",
      pilihan_a: data[i][5] || "",
      pilihan_b: data[i][6] || "",
      pilihan_c: data[i][7] || "",
      pilihan_d: data[i][8] || "",
      pilihan_e: data[i][9] || "",
      jawaban_benar: data[i][10] || "",
      poin: data[i][11] || 1,
      kategori: data[i][12] || ""
    });
  }
  
  return soalList;
}

// Fungsi untuk menyimpan biodata peserta
function simpanBiodata(data) {
  // Validasi data
  if (!data.nama || !data.sekolah || !data.jenjang || !data.kelas || !data.rombel || !data.no_wa) {
    return { success: false, message: "Semua field harus diisi" };
  }
  
  // Format no_wa jika perlu (pastikan diawali dengan 62)
  let noWA = data.no_wa;
  if (noWA.startsWith("0")) {
    noWA = "62" + noWA.substring(1);
  } else if (!noWA.startsWith("62")) {
    noWA = "62" + noWA;
  }
  
  // Kembalikan data yang sudah divalidasi
  return { 
    success: true, 
    biodata: {
      nama: data.nama,
      sekolah: data.sekolah,
      jenjang: data.jenjang,
      kelas: data.kelas,
      rombel: data.rombel,
      no_wa: noWA
    }
  };
}

// Fungsi untuk menyimpan hasil ujian
function simpanHasil(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Hasil');
  
  // Buat sheet jika belum ada
  if (!sheet) {
    sheet = ss.insertSheet('Hasil');
    sheet.appendRow([
      'Timestamp', 'Nama', 'Sekolah', 'Jenjang', 'Kelas', 'Rombel', 'No. WA', 
      'Durasi (detik)', 'Jawaban', 'Skor', 'Nilai'
    ]);
  }
  
  // Hitung skor
  const soalList = getSoal();
  const jawaban = data.jawaban;
  let totalPoin = 0;
  let skorDiperoleh = 0;
  
  soalList.forEach((soal, idx) => {
    totalPoin += soal.poin;
    if (jawaban[idx] === soal.jawaban_benar) {
      skorDiperoleh += soal.poin;
    }
  });
  
  // Hitung nilai
  const nilai = (skorDiperoleh * 100) / totalPoin;
  
  // Simpan hasil ke sheet
  sheet.appendRow([
    new Date(),
    data.biodata.nama,
    data.biodata.sekolah,
    data.biodata.jenjang,
    data.biodata.kelas,
    data.biodata.rombel,
    data.biodata.no_wa,
    data.durasi,
    JSON.stringify(jawaban),
    skorDiperoleh,
    nilai
  ]);
  
  // Data hasil untuk ditampilkan
  return {
    biodata: data.biodata,
    durasi: data.durasi,
    jawaban: jawaban,
    totalSoal: soalList.length,
    totalPoin: totalPoin,
    skorDiperoleh: skorDiperoleh,
    nilai: nilai.toFixed(2),
    showResults: getKonfigurasi().showResults === "TRUE",
    printable: getKonfigurasi().printable === "TRUE"
  };
}

// Fungsi untuk membuat PDF hasil
function generatePDF(data) {
  const template = HtmlService.createTemplateFromFile('Hasil');
  template.data = data;
  const html = template.evaluate().getContent();
  
  const blob = Utilities.newBlob(html, MimeType.HTML, "hasil_ujian.html");
  const pdf = blob.getAs(MimeType.PDF);
  
  return pdf.getBytes();
}

// ============================================================
// Setup.gs — Tek seferlik kurulum. Apps Script editöründe
//             "Çalıştır > setup" ile başlatılır.
// ============================================================

function setup() {
  // Mevcut bir spreadsheet var mı?
  let ss;
  const existingId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (existingId) {
    try { ss = SpreadsheetApp.openById(existingId); }
    catch (e) { ss = SpreadsheetApp.create('Bilet Rezervasyon Sistemi'); }
  } else {
    ss = SpreadsheetApp.create('Bilet Rezervasyon Sistemi');
  }

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  // Sayfaları oluştur
  _setupAyarlar(ss);
  _setupEtkinlikler(ss);
  _setupSalonlar(ss);
  _setupRezervasyon(ss);
  _setupLoginLogs(ss);

  // Varsayılan boş sayfayı sil
  ['Sheet1', 'Sayfa1'].forEach(name => {
    const s = ss.getSheetByName(name);
    if (s && ss.getSheets().length > 1) try { ss.deleteSheet(s); } catch(e) {}
  });

  const webUrl = ScriptApp.getService().getUrl();

  // Sheets üzerinden "Onaylı" yapılınca mail gitsin diye trigger kur
  setupEditTrigger();

  // Standalone script'te getUi() çalışmaz — Logger kullanıyoruz
  console.log('=== KURULUM TAMAMLANDI ===');
  console.log('Spreadsheet URL : ' + ss.getUrl());
  console.log('Spreadsheet ID  : ' + ss.getId());
  console.log('Web App URL     : ' + webUrl);
  console.log('Sonraki adım    : Dağıt > Web uygulaması olarak dağıt > Herkese erişim');

  // Spreadsheet'e de not bırak
  try {
    const ayarlar = ss.getSheetByName('⚙️ Ayarlar');
    if (ayarlar) ayarlar.getRange('B6').setValue(webUrl);
  } catch(e) {}

  return {
    ok:             true,
    spreadsheetUrl: ss.getUrl(),
    spreadsheetId:  ss.getId(),
    webAppUrl:      webUrl
  };
}

// ─── Ayarlar Sayfası ──────────────────────────────────────────
function _setupAyarlar(ss) {
  let sh = ss.getSheetByName('⚙️ Ayarlar') || ss.insertSheet('⚙️ Ayarlar', 0);
  sh.clear();

  const webUrl = ScriptApp.getService().getUrl();

  const rows = [
    ['BİLET REZERVASYON SİSTEMİ — AYARLAR', '', ''],
    ['', '', ''],
    ['GENEL', '', ''],
    ['Uygulama Adı',    'Bilet Rezervasyon Sistemi', ''],
    ['Admin E-posta',   '',                          'Onay bildirimleri buraya gider'],
    ['Web App URL',     webUrl,                      'Otomatik dolduruldu (salt okunur)'],
    ['Admin Şifresi',  'admin123',                   'Admin paneli girişi için'],
    ['', '', ''],
    ['E-POSTA', '', ''],
    ['E-posta Bildirimi', 'Açık',                    'Müşteriye otomatik mail gönder'],
    ['', '', ''],
    ['GÖRÜNÜM', '', ''],
    ['Tema Rengi',     '#1a73e8',                    'Hex renk kodu (#rrggbb)'],
    ['Logo Başlığı',   'BİLET SİSTEMİ',              'Kullanıcı sayfası başlığı'],
    ['', '', ''],
    ['ÖDEME BİLGİLERİ', '', ''],
    ['Banka Adı',      '',                           'Örn: Ziraat Bankası'],
    ['Hesap Sahibi',   '',                           'Hesap sahibinin adı'],
    ['IBAN',           '',                           'Örn: TR00 0000 0000 0000 0000 0000 00'],
    ['', '', ''],
    ['İLETİŞİM', '', ''],
    ['Telefon 1',      '',                           'Birincil iletişim numarası'],
    ['Telefon 2',      '',                           'İkincil numara (opsiyonel)'],
    ['Telefon 3',      '',                           'Üçüncü numara (opsiyonel)'],
    ['', '', ''],
    ['ÖDEME SAYFASI METNİ', '', ''],
    ['Ödeme Açıklaması', 'Lütfen rezervasyon ID\'nizi ödeme açıklamasına yazınız. Ödemeniz onaylandıktan sonra biletiniz e-posta adresinize gönderilecektir.', 'Kullanıcıya gösterilecek metin'],
  ];

  sh.getRange(1, 1, rows.length, 3).setValues(rows);

  // Başlık satırı
  sh.getRange('A1:C1').merge()
    .setBackground('#1a73e8').setFontColor('#fff')
    .setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('A1').setValue('BİLET REZERVASYON SİSTEMİ — AYARLAR');

  // Bölüm başlıkları (satır 3, 9, 12, 16, 21, 26)
  [3, 9, 12, 16, 21, 26].forEach(r => {
    sh.getRange(r, 1, 1, 3).merge()
      .setBackground('#e8f0fe').setFontColor('#1a73e8').setFontWeight('bold');
  });

  // E-posta dropdown
  const emailRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Açık', 'Kapalı'], true).setAllowInvalid(false).build();
  sh.getRange('B10').setDataValidation(emailRule);

  sh.setColumnWidth(1, 180);
  sh.setColumnWidth(2, 320);
  sh.setColumnWidth(3, 280);

  sh.setFrozenRows(1);
}

// ─── Etkinlikler Sayfası ──────────────────────────────────────
function _setupEtkinlikler(ss) {
  let sh = ss.getSheetByName('📅 Etkinlikler') || ss.insertSheet('📅 Etkinlikler');

  const headers = [
    'ID','Etkinlik Adı','Tarih','Saat','Salon ID','Salon Adı',
    'Durum','Fiyat (₺)','Açıklama','Rezervasyon Linki',
    'Toplam Koltuk','Dolu','Boş','Oluşturma Tarihi'
  ];
  const widths  = [100,220,100,70,100,160,110,90,220,340,110,70,70,150];
  const colors  = { header: '#1a73e8' };

  _buildHeader(sh, headers, widths, colors.header);
  sh.setFrozenRows(1);

  // Durum dropdown (G sütunu = 7)
  _addDropdown(sh, 2, 7, 5000, 1, ['Aktif','Pasif','Taslak','Tamamlandı']);

  // Koşullu biçimlendirme — Durum
  sh.setConditionalFormatRules([
    _cfRule(sh, 2, 7, 5000, 'Aktif',      '#c8e6c9','#1b5e20'),
    _cfRule(sh, 2, 7, 5000, 'Pasif',      '#ffcdd2','#b71c1c'),
    _cfRule(sh, 2, 7, 5000, 'Taslak',     '#fff9c4','#f57f17'),
    _cfRule(sh, 2, 7, 5000, 'Tamamlandı', '#e3f2fd','#0d47a1'),
  ]);
}

// ─── Salonlar Sayfası ─────────────────────────────────────────
function _setupSalonlar(ss) {
  let sh = ss.getSheetByName('🏛️ Salonlar') || ss.insertSheet('🏛️ Salonlar');

  const headers = ['ID','Salon Adı','Açıklama','Genişlik','Yükseklik','Koltuk Sayısı','Düzen JSON','Oluşturma Tarihi','Son Güncelleme'];
  const widths  = [110,200,240,80,80,100,0,150,150];

  _buildHeader(sh, headers, widths, '#0f9d58');
  sh.setFrozenRows(1);

  // JSON sütunu gizle (G=7) — gerekirse gösterilebilir
  sh.hideColumns(7);
}

// ─── Rezervasyonlar Sayfası ───────────────────────────────────
function _setupRezervasyon(ss) {
  let sh = ss.getSheetByName('📋 Rezervasyonlar') || ss.insertSheet('📋 Rezervasyonlar');

  const headers = [
    'Rezervasyon ID','Etkinlik ID','Etkinlik Adı','Koltuk ID','Koltuk Adı',
    'Ad Soyad','E-posta','Telefon','Kişi Sayısı',
    'Durum','Rezervasyon Tarihi','Onay Tarihi','Tutar (₺)','Notlar'
  ];
  const widths = [140,100,210,100,140,190,200,130,80,110,150,150,90,240];

  _buildHeader(sh, headers, widths, '#e64a19');
  sh.setFrozenRows(1);

  // Durum dropdown (J = 10)
  _addDropdown(sh, 2, 10, 10000, 1, ['Beklemede','Onaylı','İptal','İade']);

  sh.setConditionalFormatRules([
    _cfRule(sh, 2, 10, 10000, 'Beklemede', '#fff9c4','#f57f17'),
    _cfRule(sh, 2, 10, 10000, 'Onaylı',    '#c8e6c9','#1b5e20'),
    _cfRule(sh, 2, 10, 10000, 'İptal',     '#ffcdd2','#b71c1c'),
    _cfRule(sh, 2, 10, 10000, 'İade',      '#e1bee7','#4a148c'),
  ]);
}

// ─── Giriş Logları Sayfası ───────────────────────────────────
function _setupLoginLogs(ss) {
  let sh = ss.getSheetByName('🔒 Giriş Logları') || ss.insertSheet('🔒 Giriş Logları');

  const headers = ['Tarih / Saat', 'E-posta', 'Sonuç', 'Açıklama'];
  const widths  = [160, 200, 110, 320];
  _buildHeader(sh, headers, widths, '#5f6368');
  sh.setFrozenRows(1);

  sh.setConditionalFormatRules([
    _cfRule(sh, 2, 3, 50000, 'Başarılı',   '#e6f4ea', '#1b5e20'),
    _cfRule(sh, 2, 3, 50000, 'Başarısız',  '#fce8e6', '#b71c1c'),
  ]);
}

// ─── Yardımcılar ─────────────────────────────────────────────
function _buildHeader(sh, headers, widths, bgColor) {
  // Mevcut verileri koru — sadece satır 1'i yaz
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
  } else {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const hdr = sh.getRange(1, 1, 1, headers.length);
  hdr.setBackground(bgColor).setFontColor('#fff')
     .setFontWeight('bold').setHorizontalAlignment('center');

  widths.forEach((w, i) => { if (w > 0) sh.setColumnWidth(i + 1, w); });
}

function _addDropdown(sh, startRow, col, rowCount, colCount, values) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true).setAllowInvalid(false).build();
  sh.getRange(startRow, col, rowCount, colCount).setDataValidation(rule);
}

function _cfRule(sh, r, c, rows, text, bg, fg) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text)
    .setBackground(bg).setFontColor(fg)
    .setRanges([sh.getRange(r, c, rows, 1)])
    .build();
}

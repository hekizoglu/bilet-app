// ============================================================
// Tickets.gs — Ayarlar okuma/yazma + bilet görseli + email
// ============================================================

// ─── Settings ─────────────────────────────────────────────────
var SETTINGS_CACHE_KEY = 'app_settings_v1';

function getSettings() {
  // CacheService ile 3 dakikalık önbellek
  try {
    const cache  = CacheService.getScriptCache();
    const cached = cache.get(SETTINGS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch(e) {}

  const sh   = getSheet('⚙️ Ayarlar');
  const data = sh.getDataRange().getValues();
  const out  = {};
  data.forEach(row => {
    const key = String(row[0] || '').trim();
    if (key && key !== '' && !key.startsWith('//')) {
      out[key] = row[1] !== undefined ? row[1] : '';
    }
  });

  try {
    CacheService.getScriptCache().put(SETTINGS_CACHE_KEY, JSON.stringify(out), 180);
  } catch(e) {}

  return out;
}

function saveSettings(payload) {
  const sh   = getSheet('⚙️ Ayarlar');
  const data = sh.getDataRange().getValues();
  Object.entries(payload).forEach(([key, val]) => {
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        sh.getRange(i + 1, 2).setValue(val);
        break;
      }
    }
  });
  // Önbelleği temizle — bir sonraki istekte taze veri gelsin
  try { CacheService.getScriptCache().remove(SETTINGS_CACHE_KEY); } catch(e) {}
  return { success: true };
}

// ─── Admin şifre doğrulama + kaba kuvvet koruması ────────────
var FAIL_KEY     = 'admin_login_fails';
var LOCKOUT_KEY  = 'admin_lockout_until';
var MAX_FAILS    = 5;    // Bu kadar yanlış denemeden sonra kilitle
var LOCKOUT_SECS = 900;  // 15 dakika kilit
var WINDOW_SECS  = 900;  // Sayaç bu süre içinde sıfırlanmaz

/**
 * Dönen nesne:
 *   { success: true }
 *   { success: false, attemptsLeft: N }        → kalan deneme hakkı
 *   { success: false, locked: true, secondsLeft: N } → hesap kilitli
 */
function verifyAdminPassword(password) {
  const cache = CacheService.getScriptCache();

  // ── Kilit kontrolü ────────────────────────────────────────
  const lockedUntil = cache.get(LOCKOUT_KEY);
  if (lockedUntil) {
    const secsLeft = Math.ceil((parseInt(lockedUntil) - Date.now()) / 1000);
    if (secsLeft > 0) {
      _logLoginAttempt(false, 'KİLİTLİ — ' + secsLeft + ' sn kaldı');
      return { success: false, locked: true, secondsLeft: secsLeft };
    }
    // Süre dolmuş, kilidi kaldır
    cache.remove(LOCKOUT_KEY);
    cache.remove(FAIL_KEY);
  }

  // ── Şifre kontrolü ────────────────────────────────────────
  const settings = getSettings();
  const stored   = String(settings['Admin Şifresi'] || 'admin123');
  const ok       = password === stored;

  if (ok) {
    cache.remove(FAIL_KEY);
    cache.remove(LOCKOUT_KEY);
    _logLoginAttempt(true, 'Başarılı giriş');
    return { success: true };
  }

  // ── Başarısız: sayacı artır ────────────────────────────────
  const fails = parseInt(cache.get(FAIL_KEY) || '0') + 1;
  cache.put(FAIL_KEY, String(fails), WINDOW_SECS);

  if (fails >= MAX_FAILS) {
    const unlockAt = Date.now() + LOCKOUT_SECS * 1000;
    cache.put(LOCKOUT_KEY, String(unlockAt), LOCKOUT_SECS + 60);
    _logLoginAttempt(false, fails + '. hatalı deneme — KİLİT BAŞLADI (' + LOCKOUT_SECS / 60 + ' dk)');
    return { success: false, locked: true, secondsLeft: LOCKOUT_SECS };
  }

  _logLoginAttempt(false, fails + '. hatalı deneme — kalan hak: ' + (MAX_FAILS - fails));
  return { success: false, attemptsLeft: MAX_FAILS - fails };
}

// ─── Giriş log kaydı ─────────────────────────────────────────
function _logLoginAttempt(success, note) {
  try {
    const sh = getSheet('🔒 Giriş Logları');
    if (!sh) return;
    const lr = sh.getLastRow() + 1;
    const email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'Anonim / Belirlenemedi';
    sh.getRange(lr, 1, 1, 4).setValues([[new Date(), email, success ? 'Başarılı' : 'Başarısız', note || '']]);
    sh.getRange(lr, 1).setNumberFormat('dd.MM.yyyy HH:mm:ss');
    sh.getRange(lr, 1, 1, 4).setBackground(success ? '#e6f4ea' : '#fce8e6');
  } catch(e) {
    console.error('Giriş log hatası:', e.message);
  }
}

// ─── Ticket HTML generator (A5 · emoji-free · print-ready) ──
function generateTicketHtml(res, ev) {
  const settings    = getSettings();
  const appName     = settings['Uygulama Adı'] || 'BİLET SİSTEMİ';
  const logoTitle   = settings['Logo Başlığı'] || appName;
  const themeColor  = settings['Tema Rengi']   || '#1a73e8';
  const barcode     = _barcodeHtml(res.id);
  const confirmedAt = res.confirmedAt || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm');
  // Numarasız koltuk tespiti
  const isUnnumbered = String(res.seatId || '').startsWith('UN_');

  // A5 yatay ≈ 555px × 393px  (148mm × 105mm @ 96dpi)
  return `
<table cellpadding="0" cellspacing="0" border="0"
  style="width:555px;font-family:Arial,Helvetica,sans-serif;
         border-radius:10px;overflow:hidden;
         box-shadow:0 4px 18px rgba(0,0,0,.18);
         border:1px solid #dde1e7;background:#fff;
         margin:12px auto">
  <tr>

    <!-- SOL BANT (dikey başlık) -->
    <td width="52" style="background:${themeColor};text-align:center;vertical-align:middle;padding:0">
      <div style="writing-mode:vertical-rl;transform:rotate(180deg);
                  color:#fff;font-size:10px;font-weight:700;
                  letter-spacing:3px;text-transform:uppercase;
                  padding:16px 0;white-space:nowrap">
        ${_esc(logoTitle)}
      </div>
    </td>

    <!-- ANA İÇERİK -->
    <td style="padding:0;vertical-align:top">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%">

        <!-- Üst: Etkinlik bilgileri -->
        <tr>
          <td style="padding:20px 22px 16px;border-bottom:1px dashed #d0d5dd">
            <div style="font-size:9px;color:#9aa3af;letter-spacing:2px;
                        text-transform:uppercase;margin-bottom:6px">ETKİNLİK</div>
            <div style="font-size:17px;font-weight:700;color:#111827;
                        line-height:1.25;margin-bottom:12px">
              ${_esc(ev ? ev.name : '')}
            </div>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:28px">
                  <div style="font-size:9px;color:#9aa3af;letter-spacing:1px;
                              text-transform:uppercase;margin-bottom:3px">TARİH</div>
                  <div style="font-size:13px;font-weight:700;color:#1d2129">
                    ${ev ? (ev.dateDisplay || ev.date) : '-'}
                  </div>
                </td>
                <td style="padding-right:28px">
                  <div style="font-size:9px;color:#9aa3af;letter-spacing:1px;
                              text-transform:uppercase;margin-bottom:3px">SAAT</div>
                  <div style="font-size:13px;font-weight:700;color:#1d2129">
                    ${ev ? (ev.time || '-') : '-'}
                  </div>
                </td>
                <td>
                  <div style="font-size:9px;color:#9aa3af;letter-spacing:1px;
                              text-transform:uppercase;margin-bottom:3px">SALON</div>
                  <div style="font-size:13px;font-weight:700;color:#1d2129">
                    ${_esc(ev ? (ev.layoutName || '-') : '-')}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alt: Koltuk + barkod -->
        <tr>
          <td style="padding:0">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
              <tr>

                <!-- Koltuk -->
                <td style="padding:16px 22px;vertical-align:middle;width:55%">
                  <div style="font-size:9px;color:#9aa3af;letter-spacing:2px;
                              text-transform:uppercase;margin-bottom:4px">KOLTUK / MASA</div>
                  <div style="font-size:${isUnnumbered?'20px':'36px'};font-weight:900;letter-spacing:2px;
                              color:${themeColor};line-height:1.2">
                    ${_esc(res.seatName || res.seatId)}
                  </div>
                  ${isUnnumbered
                    ? '<div style="margin-top:5px;font-size:10px;color:#9aa3af;font-style:italic">Sandalye numarasi yoktur</div>'
                    : ''}
                  <div style="margin-top:8px;font-size:13px;
                              font-weight:600;color:#1d2129">
                    ${_esc(res.name)}
                  </div>
                  <div style="margin-top:2px;font-size:11px;color:#6b7280">
                    ${_esc(res.email || '')}
                  </div>
                </td>

                <!-- Barkod -->
                <td style="padding:16px 22px 16px 0;vertical-align:middle;
                           border-left:1px dashed #d0d5dd;text-align:center">
                  <div style="font-size:9px;color:#9aa3af;letter-spacing:1.5px;
                              text-transform:uppercase;margin-bottom:6px">BİLET NO</div>
                  <div style="font-family:monospace;font-size:10px;font-weight:700;
                              letter-spacing:2px;color:#374151;margin-bottom:10px;
                              word-break:break-all">
                    ${_esc(res.id)}
                  </div>
                  <div style="line-height:0;display:inline-block;
                              background:#fff;padding:4px;
                              border:1px solid #e5e7eb;border-radius:3px">
                    ${barcode}
                  </div>
                  <div style="font-size:9px;color:#9aa3af;margin-top:8px">
                    Onay: ${confirmedAt}
                  </div>
                </td>

              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>

    <!-- SAĞ AKSAN ŞERİT -->
    <td width="8" style="background:${themeColor};opacity:.15"></td>

  </tr>
</table>`;
}

// ─── Email: Kullanıcıya onay + bilet ─────────────────────────
function sendTicketEmail(reservationId) {
  const allRes = getReservations();
  const res = allRes.find(r => r.id === reservationId);
  if (!res || !res.email) return false;

  const ev       = getEventById(res.eventId);
  const settings = getSettings();
  const appName  = settings['Uygulama Adı'] || 'Bilet Sistemi';
  const ticket   = generateTicketHtml(res, ev);

  const themeColor = settings['Tema Rengi'] || '#1a73e8';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td align="center" style="padding:24px 12px">
<table cellpadding="0" cellspacing="0" border="0" width="580" style="max-width:580px">

  <!-- ONAY BANNER -->
  <tr>
    <td style="background:${themeColor};border-radius:10px 10px 0 0;
               padding:28px 32px;text-align:center">
      <div style="width:48px;height:48px;border-radius:50%;
                  background:rgba(255,255,255,.2);
                  margin:0 auto 12px;line-height:48px;
                  font-size:26px;color:#fff;font-weight:700">OK</div>
      <div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:6px">
        Biletiniz Onaylandi!</div>
      <div style="color:rgba(255,255,255,.85);font-size:14px">
        Odemeniz alindi, rezervasyonunuz kesinlesti.</div>
    </td>
  </tr>

  <!-- KARSILAMA -->
  <tr>
    <td style="background:#fff;padding:24px 32px 16px;
               border-left:1px solid #e4e6ea;border-right:1px solid #e4e6ea">
      <p style="margin:0 0 8px;font-size:15px;color:#1d2129">
        Sayin <strong>${_esc(res.name)}</strong>,</p>
      <p style="margin:0;font-size:14px;color:#606770;line-height:1.7">
        <strong>${_esc(ev ? ev.name : '')}</strong> etkinligine ait biletiniz
        onaylanmistir. Asagidaki bileti etkinlige gelirken ibraz ediniz.</p>
    </td>
  </tr>

  <!-- BİLET -->
  <tr>
    <td style="background:#fff;padding:8px 32px 24px;
               border-left:1px solid #e4e6ea;border-right:1px solid #e4e6ea">
      ${ticket}
    </td>
  </tr>

  <!-- DETAY TABLOSU -->
  <tr>
    <td style="background:#f8f9fa;padding:20px 32px;
               border:1px solid #e4e6ea;border-top:none">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"
             style="font-size:13px;border-collapse:collapse">
        <tr>
          <td style="padding:7px 0;color:#80868b;width:38%;
                     border-bottom:1px solid #e9ecef">Etkinlik</td>
          <td style="padding:7px 0;font-weight:700;color:#1d2129;
                     border-bottom:1px solid #e9ecef">${_esc(ev ? ev.name : '')}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#80868b;border-bottom:1px solid #e9ecef">Tarih</td>
          <td style="padding:7px 0;font-weight:700;border-bottom:1px solid #e9ecef">
            ${ev ? (ev.dateDisplay || ev.date) : ''}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#80868b;border-bottom:1px solid #e9ecef">Saat</td>
          <td style="padding:7px 0;font-weight:700;border-bottom:1px solid #e9ecef">
            ${ev ? (ev.time || '') : ''}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#80868b;border-bottom:1px solid #e9ecef">Koltuk</td>
          <td style="padding:7px 0;font-weight:700;color:${themeColor};
                     border-bottom:1px solid #e9ecef">
            ${_esc(res.seatName || res.seatId)}
            ${isUnnumbered ? ' <span style="font-weight:400;font-size:11px;color:#9aa3af">(Sandalye numarasi yoktur)</span>' : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#80868b">Bilet No</td>
          <td style="padding:7px 0;font-family:monospace;font-size:12px;
                     letter-spacing:1px">${_esc(res.id)}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#1d2129;border-radius:0 0 10px 10px;
               padding:16px 32px;text-align:center;
               font-size:12px;color:#9aa3af">
      ${_esc(appName)} &nbsp;|&nbsp; İyi eglenceler dileriz!
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>`;

  try {
    GmailApp.sendEmail(
      res.email,
      'Biletiniz Onaylandi - ' + (ev ? ev.name : 'Etkinlik'),
      'Biletiniz onaylandi. Bilet No: ' + res.id,
      { htmlBody: html, name: appName }
    );
    return true;
  } catch(e) {
    console.error('Kullanıcı ticket email hatası:', e.message);
    return false;
  }
}

// ─── Email: Yöneticiye bildirim ───────────────────────────────
function sendAdminConfirmNotification(res, ev) {
  const settings   = getSettings();
  const adminEmail = String(settings['Admin E-posta'] || '').trim();
  if (!adminEmail) return;

  const adminUrl = ScriptApp.getService().getUrl();

  try {
    GmailApp.sendEmail(
      adminEmail,
      '[ONAYLANDI] ' + (ev ? ev.name : '') + ' - ' + res.name,
      'Rezervasyon onaylandi. Admin paneli: ' + adminUrl,
      {
        htmlBody: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:Arial,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="480"
       style="max-width:480px;margin:0 auto;background:#fff;
              border-radius:10px;overflow:hidden;
              box-shadow:0 2px 12px rgba(0,0,0,.1)">
  <tr>
    <td style="background:#0f9d58;padding:20px;text-align:center">
      <div style="color:#fff;font-size:18px;font-weight:700">
        Rezervasyon Onaylandi</div>
    </td>
  </tr>
  <tr>
    <td style="padding:20px;font-size:14px;color:#1d2129;line-height:2">
      <strong>Ad Soyad:</strong> ${_esc(res.name)}<br>
      <strong>E-posta:</strong> ${_esc(res.email || '-')}<br>
      <strong>Telefon:</strong> ${_esc(res.phone || '-')}<br>
      <strong>Etkinlik:</strong> ${_esc(ev ? ev.name : '-')}<br>
      <strong>Tarih:</strong> ${ev ? (ev.dateDisplay || ev.date) : '-'}<br>
      <strong>Koltuk:</strong> ${_esc(res.seatName || res.seatId)}<br>
      <strong>Bilet No:</strong>
        <span style="font-family:monospace;font-size:12px">${_esc(res.id)}</span>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 20px;text-align:center;border-top:1px solid #e4e6ea">
      <a href="${adminUrl}"
         style="display:inline-block;background:#1a73e8;color:#fff;
                padding:11px 28px;border-radius:8px;text-decoration:none;
                font-size:14px;font-weight:600;letter-spacing:.3px">
        Admin Paneline Git
      </a>
    </td>
  </tr>
  <tr>
    <td style="background:#f8f9fa;padding:10px 20px;
               font-size:11px;color:#80868b;text-align:center;
               border-top:1px solid #e4e6ea">
      Kullaniciya otomatik onay e-postasi gonderildi. &nbsp;|&nbsp;
      <a href="${adminUrl}" style="color:#1a73e8;text-decoration:none">${adminUrl}</a>
    </td>
  </tr>
</table>
</body></html>`
      }
    );
  } catch(e) {
    console.error('Admin email hatası:', e.message);
  }
}

// ─── Yardımcılar ─────────────────────────────────────────────
function _barcodeHtml(id) {
  let bars = '';
  const chars = (id + id).split('').slice(0, 48);
  chars.forEach(ch => {
    const code  = ch.charCodeAt(0);
    const width = (code % 3) + 1;
    const dark  = code % 2 === 0;
    bars += `<span style="display:inline-block;width:${width}px;height:36px;background:${dark ? '#1d2129' : '#fff'};vertical-align:top"></span>`;
  });
  return bars;
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Client wrappers ──────────────────────────────────────────
function clientGetSettings()       { return getSettings(); }
function clientSaveSettings(data)  { return saveSettings(data); }

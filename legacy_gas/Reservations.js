// ============================================================
// Reservations.gs — Rezervasyon CRUD + email bildirimleri
// ============================================================

var RES_SHEET = '📋 Rezervasyonlar';

function getReservations(eventId) {
  const sh   = getSheet(RES_SHEET);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const tz = Session.getScriptTimeZone();
  return data.slice(1)
    .filter(r => r[0] && (!eventId || String(r[1]) === eventId))
    .map(r => ({
      id:          String(r[0]),
      eventId:     String(r[1]),
      eventName:   r[2],
      seatId:      String(r[3]),
      seatName:    r[4],
      name:        r[5],
      email:       r[6],
      phone:       r[7],
      personCount: r[8] || 1,
      status:      r[9],
      reservedAt:  r[10] ? Utilities.formatDate(new Date(r[10]), tz, 'dd.MM.yyyy HH:mm') : '',
      confirmedAt: r[11] ? Utilities.formatDate(new Date(r[11]), tz, 'dd.MM.yyyy HH:mm') : '',
      amount:      r[12] || 0,
      notes:       r[13],
    }));
}

// Sadece aktif (iptal/iade dışı) rezervasyonların koltuk ID'lerini döner
function getReservedSeats(eventId) {
  return getReservations(eventId)
    .filter(r => r.status !== 'İptal' && r.status !== 'İade')
    .map(r => ({ seatId: r.seatId, status: r.status }));
}

// data = { eventId, seatIds:[], seatNames:{id:label}, name, email, phone,
//          personCount, notes, skipDuplicateCheck? }
function createReservation(data) {
  const lock = LockService.getPublicLock();
  try {
    lock.waitLock(12000);
  } catch (e) {
    return { success: false, error: 'Sunucu meşgul, lütfen tekrar deneyin.' };
  }

  try {
    const seatIds = data.seatIds || [];

    // Koltuk çakışma kontrolü
    const reserved = getReservedSeats(data.eventId);
    for (const sid of seatIds) {
      if (reserved.find(r => r.seatId === sid)) {
        return { success: false, error: 'Seçilen koltuk/masa az önce rezerve edildi: ' + sid + '. Lütfen başka bir yer seçin.' };
      }
    }

    // Aynı e-posta + aynı etkinlik tekrar kontrolü (admin bypass edilebilir)
    if (!data.skipDuplicateCheck && data.email) {
      const dup = getReservations(data.eventId).find(r =>
        String(r.email).toLowerCase() === String(data.email).toLowerCase() &&
        r.status !== 'İptal' && r.status !== 'İade'
      );
      if (dup) {
        return { success: false, error: 'Bu e-posta adresiyle bu etkinliğe zaten rezervasyon yapılmış (ID: ' + dup.id + ').' };
      }
    }

    const sh   = getSheet(RES_SHEET);
    const ev   = getEventById(data.eventId);
    const now  = new Date();
    const ids  = [];
    const rows = [];

    for (const sid of seatIds) {
      const resId = 'RES-' + Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
      ids.push(resId);
      rows.push([
        resId,
        data.eventId,
        ev ? ev.name : '',
        sid,
        data.seatNames ? (data.seatNames[sid] || sid) : sid,
        data.name,
        data.email || '',
        data.phone || '',
        data.personCount || 1,
        data.initialStatus || 'Beklemede',
        now,
        data.initialStatus === 'Onaylı' ? now : '',
        ev ? (ev.price || 0) : 0,
        data.notes || ''
      ]);
    }

    // Toplu yazma
    if (rows.length > 0) {
      const startRow = sh.getLastRow() + 1;
      sh.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
      sh.getRange(startRow, 11, rows.length, 1).setNumberFormat('dd.MM.yyyy HH:mm');
      if (data.initialStatus === 'Onaylı') {
        sh.getRange(startRow, 12, rows.length, 1).setNumberFormat('dd.MM.yyyy HH:mm');
      }
    }

    refreshEventSeatCounts(data.eventId);

    // Email: admin oluşturuyorsa ve Onaylı ise bilet, değilse standart bildirim
    if (data.initialStatus === 'Onaylı') {
      ids.forEach(id => { try { sendTicketEmail(id); } catch(e) {} });
    } else if (!data.skipEmailNotification) {
      _sendConfirmation(data, ev, ids);
    }

    return { success: true, reservationIds: ids };

  } finally {
    lock.releaseLock();
  }
}

function updateReservationStatus(reservationId, status, note) {
  const sh   = getSheet(RES_SHEET);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === reservationId) {
      sh.getRange(i + 1, 10).setValue(status);
      if (status === 'Onaylı') {
        sh.getRange(i + 1, 12).setValue(new Date()).setNumberFormat('dd.MM.yyyy HH:mm');
      }
      if (note) sh.getRange(i + 1, 14).setValue(note);

      const eventId = String(data[i][1]);
      refreshEventSeatCounts(eventId);

      const resObj = {
        id:        String(data[i][0]),
        eventId:   eventId,
        seatId:    String(data[i][3]),
        seatName:  data[i][4],
        name:      data[i][5],
        email:     data[i][6],
        phone:     data[i][7],
        eventName: data[i][2],
        confirmedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm'),
      };

      if (status === 'Onaylı') {
        try {
          sendTicketEmail(reservationId);
          sendAdminConfirmNotification(resObj, getEventById(eventId));
        } catch(e) { console.error('Onay emaili gönderilemedi:', e.message); }
      }

      if (status === 'İptal' || status === 'İade') {
        try {
          _sendCancellationEmail(resObj, getEventById(eventId), status);
        } catch(e) { console.error('İptal/İade emaili gönderilemedi:', e.message); }
      }

      return true;
    }
  }
  return false;
}

// Birden fazla rezervasyonu aynı anda güncelle
function bulkUpdateReservations(ids, status) {
  if (!ids || !ids.length) return { success: false, error: 'Rezervasyon seçilmedi.' };

  const sh   = getSheet(RES_SHEET);
  const data = sh.getDataRange().getValues();
  const now  = new Date();
  const idSet = new Set(ids);
  const affectedEvents = new Set();
  const toEmail = [];
  let updated = 0;

  for (let i = 1; i < data.length; i++) {
    if (!idSet.has(String(data[i][0]))) continue;
    sh.getRange(i + 1, 10).setValue(status);
    if (status === 'Onaylı') {
      sh.getRange(i + 1, 12).setValue(now).setNumberFormat('dd.MM.yyyy HH:mm');
    }
    affectedEvents.add(String(data[i][1]));
    toEmail.push({
      id:        String(data[i][0]),
      eventId:   String(data[i][1]),
      name:      data[i][5],
      email:     data[i][6],
      seatName:  data[i][4] || String(data[i][3]),
      eventName: data[i][2],
    });
    updated++;
  }

  affectedEvents.forEach(evId => refreshEventSeatCounts(evId));

  // Toplu email gönderimi
  toEmail.forEach(r => {
    if (!r.email) return;
    try {
      if (status === 'Onaylı') {
        sendTicketEmail(r.id);
      } else if (status === 'İptal' || status === 'İade') {
        _sendCancellationEmail(r, getEventById(r.eventId), status);
      }
    } catch(e) { console.error('Toplu email hatası:', r.id, e.message); }
  });

  return { success: true, updated };
}

function deleteReservation(reservationId) {
  const sh   = getSheet(RES_SHEET);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === reservationId) {
      const eventId = String(data[i][1]);
      sh.deleteRow(i + 1);
      if (eventId) refreshEventSeatCounts(eventId);
      return true;
    }
  }
  return false;
}

// ─── Email: İptal / İade bildirimi ───────────────────────────
function _sendCancellationEmail(res, ev, status) {
  if (!res.email) return;
  try {
    const settings   = getSettings();
    const appName    = settings['Uygulama Adı'] || 'Bilet Sistemi';
    const isIade     = status === 'İade';
    const themeColor = isIade ? '#6a1b9a' : '#c62828';
    const label      = isIade ? 'Rezervasyon Iade Edildi' : 'Rezervasyon Iptal Edildi';
    const aciklama   = isIade
      ? 'Rezervasyonunuz iade edilmistir. Odemeniz en kisa surede hesabiniza aktarilacaktir.'
      : 'Rezervasyonunuz iptal edilmistir. Herhangi bir sorunuz icin bizimle iletisime gecebilirsiniz.';
    const evName = ev ? ev.name : (res.eventName || '');
    const evDate = ev ? (ev.dateDisplay || ev.date) : '';
    const phones = [settings['Telefon 1'], settings['Telefon 2'], settings['Telefon 3']].filter(Boolean);

    GmailApp.sendEmail(
      res.email,
      label + (evName ? ' - ' + evName : ''),
      label + '. Rezervasyon No: ' + res.id,
      {
        name: appName,
        htmlBody: `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td align="center" style="padding:24px 12px">
<table cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px">

  <tr>
    <td style="background:${themeColor};border-radius:10px 10px 0 0;
               padding:28px 32px;text-align:center">
      <div style="color:#fff;font-size:21px;font-weight:700;margin-bottom:8px">${label}</div>
      <div style="color:rgba(255,255,255,.85);font-size:13px;line-height:1.6">${aciklama}</div>
    </td>
  </tr>

  <tr>
    <td style="background:#fff;padding:24px 32px;
               border-left:1px solid #e4e6ea;border-right:1px solid #e4e6ea">
      <p style="margin:0 0 16px;font-size:15px;color:#1d2129">
        Sayin <strong>${_esc(res.name)}</strong>,</p>
      <table width="100%" style="font-size:13px;border-collapse:collapse">
        ${evName ? `<tr>
          <td style="padding:8px 0;color:#80868b;width:36%;border-bottom:1px solid #f1f3f4">Etkinlik</td>
          <td style="padding:8px 0;font-weight:700;border-bottom:1px solid #f1f3f4">${_esc(evName)}</td>
        </tr>` : ''}
        ${evDate ? `<tr>
          <td style="padding:8px 0;color:#80868b;border-bottom:1px solid #f1f3f4">Tarih</td>
          <td style="padding:8px 0;font-weight:700;border-bottom:1px solid #f1f3f4">${evDate}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:8px 0;color:#80868b;border-bottom:1px solid #f1f3f4">Koltuk</td>
          <td style="padding:8px 0;font-weight:700;color:${themeColor};
                     border-bottom:1px solid #f1f3f4">${_esc(res.seatName || res.seatId)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#80868b">Rezervasyon No</td>
          <td style="padding:8px 0;font-family:monospace;font-size:12px;
                     letter-spacing:1px">${_esc(res.id)}</td>
        </tr>
      </table>
    </td>
  </tr>

  ${phones.length ? `<tr>
    <td style="background:#f8f9fa;padding:14px 32px;text-align:center;
               border-left:1px solid #e4e6ea;border-right:1px solid #e4e6ea;
               font-size:13px;color:#3c4043">
      Iletisim: ${phones.map(p => '<strong>' + _esc(p) + '</strong>').join(' &nbsp;|&nbsp; ')}
    </td>
  </tr>` : ''}

  <tr>
    <td style="background:#1d2129;border-radius:0 0 10px 10px;
               padding:14px 32px;text-align:center;
               font-size:12px;color:#9aa3af">
      ${_esc(appName)}
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>`
      }
    );
  } catch(e) {
    console.error('İptal/İade email hatası:', e.message);
  }
}

// ─── Email: Yeni rezervasyon bildirimi ────────────────────────
function _sendConfirmation(resData, ev, ids) {
  if (!resData.email) return;
  try {
    const sh   = getSheet('⚙️ Ayarlar');
    const vals = sh.getDataRange().getValues();
    const emailRow = vals.find(r => r[0] === 'E-posta Bildirimi');
    if (emailRow && emailRow[1] === 'Kapalı') return;
  } catch(e) {}

  try {
    const evName = ev ? ev.name : 'Etkinlik';
    const evDate = ev ? ev.dateDisplay : '';
    const evTime = ev ? ev.time : '';
    const price  = ev ? (ev.price || 0) : 0;

    const subject = 'Rezervasyon Alindi - ' + evName;
    const body =
      'Sayin ' + resData.name + ',\n\n' +
      'Rezervasyon talebiniz basariyla alinmistir.\n\n' +
      'Etkinlik : ' + evName + '\n' +
      'Tarih    : ' + evDate + '\n' +
      'Saat     : ' + evTime + '\n' +
      'Koltuk   : ' + resData.seatIds.join(', ') + '\n' +
      'Tutar    : ' + (price * resData.seatIds.length) + ' TL\n\n' +
      'Rezervasyon ID(ler): ' + ids.join(', ') + '\n\n' +
      'Odemeniz onaylandiktan sonra rezervasyonunuz kesinlesecek ve bildirim alacaksiniz.\n\n' +
      'Iyi eglenceler dileriz.';

    MailApp.sendEmail(resData.email, subject, body);

    // Admin bildirimi
    try {
      const sh   = getSheet('⚙️ Ayarlar');
      const vals = sh.getDataRange().getValues();
      const adminRow = vals.find(r => r[0] === 'Admin E-posta');
      if (adminRow && adminRow[1]) {
        const adminUrl   = ScriptApp.getService().getUrl();
        const totalTutar = price * resData.seatIds.length;
        MailApp.sendEmail(
          adminRow[1],
          '[YENI REZERVASYON] ' + evName + ' - ' + resData.name,
          'Yeni rezervasyon: ' + resData.name + ' / ' + resData.seatIds.join(', ') +
          '\nAdmin paneli: ' + adminUrl,
          {
            htmlBody: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:Arial,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="480"
       style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;
              overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)">
  <tr><td style="background:#e64a19;padding:20px;text-align:center">
    <div style="color:#fff;font-size:18px;font-weight:700">Yeni Rezervasyon</div>
    <div style="color:rgba(255,255,255,.85);font-size:13px;margin-top:4px">Onay bekleniyor</div>
  </td></tr>
  <tr><td style="padding:20px;font-size:14px;color:#1d2129;line-height:2">
    <strong>Ad Soyad:</strong> ${_esc(resData.name)}<br>
    <strong>E-posta:</strong> ${_esc(resData.email || '-')}<br>
    <strong>Telefon:</strong> ${_esc(resData.phone || '-')}<br>
    <strong>Etkinlik:</strong> ${_esc(evName)}<br>
    <strong>Tarih / Saat:</strong> ${evDate}${evTime ? ' ' + evTime : ''}<br>
    <strong>Koltuk:</strong> ${_esc(resData.seatIds.join(', '))}<br>
    <strong>Tutar:</strong> ${totalTutar} TL<br>
    <strong>Rezervasyon ID:</strong>
      <span style="font-family:monospace;font-size:12px">${ids.join(', ')}</span>
  </td></tr>
  <tr><td style="padding:16px 20px;text-align:center;border-top:1px solid #e4e6ea">
    <a href="${adminUrl}"
       style="display:inline-block;background:#1a73e8;color:#fff;padding:11px 28px;
              border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
      Admin Panelinde Onayla
    </a>
  </td></tr>
  <tr><td style="background:#f8f9fa;padding:10px 20px;font-size:11px;
                 color:#80868b;text-align:center;border-top:1px solid #e4e6ea">
    <a href="${adminUrl}" style="color:#1a73e8;text-decoration:none">${adminUrl}</a>
  </td></tr>
</table>
</body></html>`
          }
        );
      }
    } catch(e) {}

  } catch(e) {
    console.error('Email gonderilemedi:', e.message);
  }
}

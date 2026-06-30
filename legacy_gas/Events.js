// ============================================================
// Events.gs — Etkinlik CRUD işlemleri
// ============================================================

var EVENTS_SHEET = '📅 Etkinlikler';

function getEvents() {
  const sh   = getSheet(EVENTS_SHEET);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const tz = Session.getScriptTimeZone();
  return data.slice(1)
    .filter(r => r[0])
    .map(r => ({
      id:          String(r[0]),
      name:        r[1],
      date:        r[2] ? Utilities.formatDate(new Date(r[2]), tz, 'yyyy-MM-dd') : '',
      dateDisplay: r[2] ? Utilities.formatDate(new Date(r[2]), tz, 'dd.MM.yyyy') : '',
      time:        _formatTime(r[3], tz),
      layoutId:    String(r[4] || ''),
      layoutName:  r[5],
      status:      r[6],
      price:       parseFloat(String(r[7] || '0').replace(',', '.')) || 0,
      description: r[8],
      link:        r[9],
      totalSeats:  r[10] || 0,
      occupied:    r[11] || 0,
      available:   r[12] || 0,
      createdAt:   r[13] ? Utilities.formatDate(new Date(r[13]), tz, 'dd.MM.yyyy HH:mm') : '',
    }));
}

function getEventById(eventId) {
  return getEvents().find(e => e.id === eventId) || null;
}

function createEvent(data) {
  const sh      = getSheet(EVENTS_SHEET);
  const id      = 'EVT-' + new Date().getTime();
  const webUrl  = ScriptApp.getService().getUrl();
  const link    = webUrl + '?event=' + id;
  const layout  = data.layoutId ? getLayoutById(data.layoutId) : null;
  const total   = layout ? (layout.seatCount || 0) : 0;

  sh.appendRow([
    id,
    data.name,
    new Date(data.date),
    data.time || '',
    data.layoutId || '',
    layout ? layout.name : '',
    data.status || 'Taslak',
    data.price || 0,
    data.description || '',
    link,
    total,
    0,
    total,
    new Date()
  ]);

  const lr = sh.getLastRow();
  sh.getRange(lr, 3).setNumberFormat('dd.MM.yyyy');
  sh.getRange(lr, 14).setNumberFormat('dd.MM.yyyy HH:mm');

  return { success: true, id: id, link: link };
}

// Etkinlik bilgilerini güncelle (ad, tarih, saat, salon, fiyat, açıklama, durum)
function updateEvent(eventId, data) {
  const sh    = getSheet(EVENTS_SHEET);
  const rows  = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== eventId) continue;

    const layout = data.layoutId ? getLayoutById(data.layoutId) : null;

    if (data.name        !== undefined) sh.getRange(i + 1, 2).setValue(data.name);
    if (data.date        !== undefined) sh.getRange(i + 1, 3).setValue(new Date(data.date)).setNumberFormat('dd.MM.yyyy');
    if (data.time        !== undefined) sh.getRange(i + 1, 4).setValue(data.time || '');
    if (data.layoutId    !== undefined) {
      sh.getRange(i + 1, 5).setValue(data.layoutId || '');
      sh.getRange(i + 1, 6).setValue(layout ? layout.name : '');
      // Salon değiştiyse toplam koltuk sayısını güncelle
      const total = layout ? (layout.seatCount || 0) : (rows[i][10] || 0);
      const occ   = rows[i][11] || 0;
      sh.getRange(i + 1, 11).setValue(total);
      sh.getRange(i + 1, 13).setValue(Math.max(0, total - occ));
    }
    if (data.status      !== undefined) sh.getRange(i + 1, 7).setValue(data.status);
    if (data.price       !== undefined) sh.getRange(i + 1, 8).setValue(data.price || 0);
    if (data.description !== undefined) sh.getRange(i + 1, 9).setValue(data.description || '');

    return { success: true };
  }
  return { success: false, error: 'Etkinlik bulunamadı.' };
}

function updateEventStatus(eventId, status) {
  const sh   = getSheet(EVENTS_SHEET);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === eventId) {
      sh.getRange(i + 1, 7).setValue(status);
      return true;
    }
  }
  return false;
}

// Etkinliği ve ilişkili tüm rezervasyonları sil
function deleteEvent(eventId) {
  // Önce ilişkili rezervasyonları sil
  const resSh   = getSheet('📋 Rezervasyonlar');
  const resData = resSh.getDataRange().getValues();
  for (let i = resData.length - 1; i >= 1; i--) {
    if (String(resData[i][1]) === eventId) {
      resSh.deleteRow(i + 1);
    }
  }

  // Sonra etkinliği sil
  const sh   = getSheet(EVENTS_SHEET);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === eventId) {
      sh.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// Saat değerini güvenli şekilde HH:mm formatına çevirir.
// Google Sheets zaman değerlerini 1899-12-30 bazlı Date objesi olarak döndürür.
function _formatTime(val, tz) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, tz || Session.getScriptTimeZone(), 'HH:mm');
  }
  const s = String(val).trim();
  // ISO string içeriyorsa (1899-12-31T...) Date'e çevir
  if (s.includes('T') || s.includes('1899')) {
    try { return Utilities.formatDate(new Date(s), tz || Session.getScriptTimeZone(), 'HH:mm'); } catch(e) {}
  }
  return s; // Zaten "20:00" gibi metin ise olduğu gibi döndür
}

// Etkinliği kopyala — yeni tarihle Taslak olarak oluşturur
function copyEvent(eventId, newDate) {
  const ev = getEventById(eventId);
  if (!ev) return { success: false, error: 'Etkinlik bulunamadı.' };
  return createEvent({
    name:        ev.name + ' (Kopya)',
    date:        newDate || ev.date,
    time:        ev.time,
    layoutId:    ev.layoutId,
    price:       ev.price,
    description: ev.description,
    status:      'Taslak',
  });
}

// Etkinliğin müsait koltuk listesini döner (layout JSON'dan dolu olanlar çıkarılır)
// Numarasız masalar: { id, name, table, unnumbered:true } olarak döner
function getAvailableSeatsForEvent(eventId) {
  const ev = getEventById(eventId);
  if (!ev || !ev.layoutId) return [];
  const layout = getLayoutById(ev.layoutId);
  if (!layout || !layout.layoutJson) return [];
  try {
    const ld    = JSON.parse(layout.layoutJson);
    const taken = new Set(getReservedSeats(eventId).map(r => r.seatId));
    const seats = [];
    (ld.tables || []).forEach(t => {
      const tableLabel = t.label || t.id || '';
      // Numarasız masa tespiti: tüm sandalyeler UN_ önekli
      const isUnnumbered = (t.chairs || []).length > 0 &&
                           t.chairs.every(c => String(c.id).startsWith('UN_'));
      (t.chairs || []).forEach(c => {
        if (taken.has(c.id)) return;
        if (isUnnumbered) {
          seats.push({
            id:         c.id,
            name:       tableLabel + ' (Numarasız)',
            table:      tableLabel,
            unnumbered: true
          });
        } else {
          seats.push({
            id:         c.id,
            name:       c.label || c.id,
            table:      tableLabel,
            unnumbered: false
          });
        }
      });
    });
    // Bağımsız sandalyeler
    (ld.soloChairs || []).forEach(sc => {
      if (!taken.has(sc.id)) {
        seats.push({
          id:         sc.id,
          name:       sc.label || sc.id,
          table:      'Bağımsız Sandalyeler',
          unnumbered: false
        });
      }
    });

    return seats;
  } catch(e) {
    console.error('getAvailableSeatsForEvent hatası:', e.message);
    return [];
  }
}

// Etkinlikteki koltuk sayılarını yeniden hesapla
function refreshEventSeatCounts(eventId) {
  const sh   = getSheet(EVENTS_SHEET);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === eventId) {
      const total    = data[i][10] || 0;
      const reserved = getReservedSeats(eventId);
      const occ      = reserved.length;
      sh.getRange(i + 1, 12).setValue(occ);
      sh.getRange(i + 1, 13).setValue(Math.max(0, total - occ));
      return;
    }
  }
}

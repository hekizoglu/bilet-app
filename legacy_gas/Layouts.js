// ============================================================
// Layouts.gs — Salon düzeni kaydetme / yükleme
// ============================================================

var LAYOUTS_SHEET = '🏛️ Salonlar';

function getLayouts() {
  const sh   = getSheet(LAYOUTS_SHEET);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const tz = Session.getScriptTimeZone();
  return data.slice(1)
    .filter(r => r[0])
    .map(r => ({
      id:          String(r[0]),
      name:        r[1],
      description: r[2],
      width:       r[3] || 900,
      height:      r[4] || 600,
      seatCount:   r[5] || 0,
      layoutJson:  r[6],   // Ham JSON string (büyük olabilir)
      createdAt:   r[7] ? Utilities.formatDate(new Date(r[7]), tz, 'dd.MM.yyyy HH:mm') : '',
      updatedAt:   r[8] ? Utilities.formatDate(new Date(r[8]), tz, 'dd.MM.yyyy HH:mm') : '',
    }));
}

// layoutJson olmadan (liste için hafif versiyon) — clientGetLayouts bunu kullanır
function getLayoutsSummary() {
  return getLayouts().map(l => ({
    id:          l.id,
    name:        l.name,
    description: l.description,
    seatCount:   l.seatCount,
    createdAt:   l.createdAt,
    updatedAt:   l.updatedAt,
  }));
}

function getLayoutById(layoutId) {
  return getLayouts().find(l => l.id === layoutId) || null;
}

// data = { id?, name, description, layout: { width, height, stage?, tables:[] } }
function saveLayout(data) {
  const sh   = getSheet(LAYOUTS_SHEET);
  const rows = sh.getDataRange().getValues();

  const layoutJson = JSON.stringify(data.layout);
  const seatCount  = _countSeats(data.layout);
  const now        = new Date();

  // Güncelleme?
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id || '')) {
      sh.getRange(i + 1, 2).setValue(data.name);
      sh.getRange(i + 1, 3).setValue(data.description || '');
      sh.getRange(i + 1, 4).setValue(data.layout.width  || 900);
      sh.getRange(i + 1, 5).setValue(data.layout.height || 600);
      sh.getRange(i + 1, 6).setValue(seatCount);
      sh.getRange(i + 1, 7).setValue(layoutJson);
      sh.getRange(i + 1, 9).setValue(now).setNumberFormat('dd.MM.yyyy HH:mm');
      return { success: true, id: String(rows[i][0]) };
    }
  }

  // Yeni kayıt
  const id = data.id || ('SAL-' + now.getTime());
  sh.appendRow([id, data.name, data.description || '', data.layout.width || 900, data.layout.height || 600, seatCount, layoutJson, now, now]);
  const lr = sh.getLastRow();
  sh.getRange(lr, 8, 1, 2).setNumberFormat('dd.MM.yyyy HH:mm');

  return { success: true, id: id };
}

function deleteLayout(layoutId) {
  // Aktif/Taslak etkinlikte kullanılan salon silinemez
  const events = getEvents();
  const inUse  = events.find(ev =>
    ev.layoutId === layoutId && ev.status !== 'Tamamlandı' && ev.status !== 'Pasif'
  );
  if (inUse) {
    return { success: false, error: '"' + inUse.name + '" etkinliğinde kullanılan salon silinemez. Önce etkinliği pasife alın.' };
  }

  const sh   = getSheet(LAYOUTS_SHEET);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === layoutId) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Salon bulunamadı.' };
}

function _countSeats(layout) {
  if (!layout || !layout.tables) return 0;
  return layout.tables.reduce((sum, t) => sum + (t.chairs ? t.chairs.length : 0), 0);
}

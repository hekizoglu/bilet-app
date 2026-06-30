// ============================================================
// Code.gs — Ana giriş noktası, yönlendirme ve yardımcı fonksiyonlar
// ============================================================

// Execution-level spreadsheet cache — aynı istek içinde openById() tek seferlik çalışır
var _ssCache = null;

function doGet(e) {
  const p = e.parameter;

  if (p.page === 'designer') {
    const tpl = HtmlService.createTemplateFromFile('Designer');
    tpl.layoutId   = p.layoutId   || 'new';
    tpl.layoutName = p.layoutName || '';
    return tpl.evaluate()
      .setTitle('Salon Tasarımcısı')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (p.event) {
    const ev = getEventById(p.event);
    // Etkinlik yoksa veya Aktif değilse erişimi engelle
    if (!ev) {
      return HtmlService.createHtmlOutput(_infoPage('Etkinlik bulunamadi.', 'Bu etkinlik mevcut degil veya kaldirilmis olabilir.'));
    }
    if (ev.status !== 'Aktif') {
      return HtmlService.createHtmlOutput(_infoPage('Etkinlik Aktif Degil', 'Bu etkinlik su anda rezervasyona kapali. Lutfen daha sonra tekrar deneyin.'));
    }
    const tpl = HtmlService.createTemplateFromFile('UserReservation');
    tpl.eventId   = p.event;
    tpl.eventJson = JSON.stringify(ev);
    return tpl.evaluate()
      .setTitle(ev.name + ' — Rezervasyon')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Default → Admin Panel
  const tpl = HtmlService.createTemplateFromFile('AdminPanel');
  return tpl.evaluate()
    .setTitle('Admin Paneli — Bilet Sistemi')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Pasif/hata sayfası şablonu
function _infoPage(title, message) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + title + '</title>' +
    '<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;' +
    'align-items:center;min-height:100vh;margin:0;background:#f0f2f5}' +
    '.box{text-align:center;padding:48px 40px;background:#fff;border-radius:12px;' +
    'box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:440px}' +
    'h2{color:#1d2129;margin:0 0 12px}p{color:#606770;line-height:1.6;margin:0}</style>' +
    '</head><body><div class="box"><h2>' + title + '</h2><p>' + message + '</p></div></body></html>';
}

// HTML include helper
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Web app URL
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// Spreadsheet erişimi — execution-level cache ile her istek içinde tek openById()
function getSpreadsheet() {
  if (_ssCache) return _ssCache;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Spreadsheet bulunamadi. Once setup() calistirin.');
  _ssCache = SpreadsheetApp.openById(id);
  return _ssCache;
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

// Tüm client-side'dan çağrılabilir metodlar
function clientGetEvents()              { return getEvents(); }
function clientGetLayouts()             { return getLayoutsSummary(); }   // JSON içermeyen özet
function clientGetReservations(evId)    { return getReservations(evId); }
function clientGetReservedSeats(evId)   { return getReservedSeats(evId); }
function clientGetLayoutById(id)        { return getLayoutById(id); }
function clientCreateEvent(data)        { return createEvent(data); }
function clientUpdateEvent(id, data)    { return updateEvent(id, data); }
function clientUpdateEventStatus(id, s) { return updateEventStatus(id, s); }
function clientDeleteEvent(id)          { return deleteEvent(id); }
function clientSaveLayout(data)         { return saveLayout(data); }
function clientDeleteLayout(id)         { return deleteLayout(id); }
function clientCreateReservation(data)  { return createReservation(data); }
function clientUpdateReservation(id, s, note) { return updateReservationStatus(id, s, note); }
function clientVerifyAdminPassword(pw)         { return verifyAdminPassword(pw); }
function clientDeleteReservation(id)           { return deleteReservation(id); }
function clientBulkUpdateReservations(ids, st) { return bulkUpdateReservations(ids, st); }
function clientCopyEvent(id, newDate)          { return copyEvent(id, newDate); }
function clientGetAvailableSeats(eventId)      { return getAvailableSeatsForEvent(eventId); }

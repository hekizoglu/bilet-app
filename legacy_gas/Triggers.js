// ============================================================
// Triggers.gs — Sheets üzerinde yapılan manuel değişiklikleri
//               izler. Admin "Onaylı" yazınca otomatik mail gider.
// ============================================================

/**
 * Sheets'te bir hücre elle düzenlenince tetiklenir.
 * Trigger kurulumu: setupEditTrigger() fonksiyonu ile yapılır.
 */
function onSheetEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();

    // Sadece Rezervasyonlar sayfasını izle
    if (sheet.getName() !== '📋 Rezervasyonlar') return;

    // Sadece J sütunu (Durum = 10. sütun)
    if (range.getColumn() !== 10) return;

    const newValue = String(range.getValue() || '').trim();
    const validStatuses = ['Onaylı', 'İptal', 'İade'];
    if (!validStatuses.includes(newValue)) return;

    const row = range.getRow();
    if (row <= 1) return; // Başlık satırı

    // Rezervasyon ID — A sütunu, Etkinlik ID — B sütunu
    const reservationId = String(sheet.getRange(row, 1).getValue() || '').trim();
    const eventId       = String(sheet.getRange(row, 2).getValue() || '').trim();
    if (!reservationId) return;

    // İptal veya İade: koltuk sayılarını güncelle + müşteriye bildirim gönder
    if (newValue === 'İptal' || newValue === 'İade') {
      if (eventId) refreshEventSeatCounts(eventId);
      const email = String(sheet.getRange(row, 7).getValue() || '').trim();
      if (email) {
        const resObj = {
          id:        reservationId,
          name:      String(sheet.getRange(row, 6).getValue() || ''),
          email:     email,
          seatName:  String(sheet.getRange(row, 5).getValue() || sheet.getRange(row, 4).getValue() || ''),
          eventName: String(sheet.getRange(row, 3).getValue() || ''),
        };
        try { _sendCancellationEmail(resObj, null, newValue); } catch(e) { console.error('Trigger iptal email hatası:', e.message); }
      }
      return;
    }

    // Onaylı: onay tarihi yaz + email gönder
    sheet.getRange(row, 12)
      .setValue(new Date())
      .setNumberFormat('dd.MM.yyyy HH:mm');

    if (eventId) refreshEventSeatCounts(eventId);

    // Kullanıcıya bilet maili gönder
    const sent = sendTicketEmail(reservationId);
    console.log('Ticket email gönderildi:', reservationId, sent);

    // Yöneticiye bildirim
    const res = getReservations().find(r => r.id === reservationId);
    if (res) {
      const ev = getEventById(res.eventId);
      sendAdminConfirmNotification(res, ev);
    }

  } catch (err) {
    console.error('onSheetEdit hatası:', err.message);
  }
}

/**
 * Trigger'ı kur — setup() çalıştırıldığında otomatik çağrılır.
 * Elle de çalıştırılabilir: Apps Script editöründe setupEditTrigger seç → Çalıştır.
 */
function setupEditTrigger() {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!ssId) {
    console.error('SPREADSHEET_ID bulunamadı. Önce setup() çalıştırın.');
    return false;
  }

  // Zaten kuruluysa tekrar kurma
  const existing = ScriptApp.getProjectTriggers();
  for (const t of existing) {
    if (t.getHandlerFunction() === 'onSheetEdit') {
      console.log('onSheetEdit trigger zaten kurulu — ID:', t.getUniqueId());
      return true;
    }
  }

  // Yeni trigger oluştur
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(ssId)
    .onEdit()
    .create();

  console.log('✅ onSheetEdit trigger kuruldu. Artık Sheets üzerinden "Onaylı" yazdığınızda mail otomatik gider.');
  return true;
}

/**
 * Kurulu tüm trigger'ları listele (debug için)
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    console.log(t.getHandlerFunction(), '|', t.getEventType(), '|', t.getUniqueId());
  });
  console.log('Toplam:', triggers.length);
}

/**
 * onSheetEdit trigger'ını sil (sıfırlamak için)
 */
function removeEditTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onSheetEdit') {
      ScriptApp.deleteTrigger(t);
      console.log('Trigger silindi.');
    }
  });
}

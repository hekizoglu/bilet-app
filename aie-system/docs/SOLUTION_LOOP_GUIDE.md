# 🔧 ÇÖZÜM DÖNGÜSÜ (Solution Loop) - Kurallar ve Yapı

## 📌 Genel Bakış

**Analiz Döngüsü** ile üretilen FAZ 14-18 görevlerini **otomatik olarak çözen** sistem.

```
┌─────────────────────┐
│  ANALIZ DÖNGÜSÜ     │ → 15 fikir / döngü
│ (Engine.js)         │   FAZ 14-18'e eklenir
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  ÇÖZÜM DÖNGÜSÜ      │ → Görevleri sırayla çözer
│ (Solution Engine)   │   Kodu yazar, test eder
└─────────────────────┘
```

---

## 🎯 ÇÖZÜM DÖNGÜSÜ'NÜN AMACI

1. **Otomatik Çözüm**: FAZ 14-18'deki [ ] görevleri otomatik olarak çöz
2. **Kod Yazma**: Her görev için gerekli kod değişikliklerini uygula
3. **Testing**: Unit, Load, Security, Integration, E2E testleri çalıştır
4. **Roadmap Güncelleme**: [ ] → [x] olarak işaretle
5. **Git Tracking**: Her çözümü commit et

---

## ⚙️ ÇÖZÜM DÖNGÜSÜ'NÜN AŞAMALARI

### 1️⃣ Görev Çıkarma
```javascript
// Roadmap.md'den çözülmemiş görevleri al
[ ] "Hata loglarını inceleyip root cause analizi yap"
[ ] "Auth middleware'de try-catch bloklarını güçlendir"
...
```

### 2️⃣ Görev Analizi
```javascript
Görev: "Hata loglarını inceleyip root cause analizi yap"
│
├─ Tür: 🔴 HATA DÜZELTMESİ
├─ FAZ: 14
├─ Puan: 40/40
├─ Zorluk: ORTA
├─ Etkilenen Dosyalar: 
│  ├─ backend/routes/auth.js
│  ├─ backend/middlewares/auth.js
│  └─ backend/logs/errors.log
│
└─ Test Stratejisi: unit-test
```

### 3️⃣ Çözüm Planı Oluşturma
```javascript
PLAN:
├─ Adım 1: Hata loglarını inceleyip root cause analizi yap
├─ Adım 2: Error handling mekanizmasını refactor et
├─ Adım 3: Unit testleri yaz ve çalıştır
└─ Adım 4: Değişiklikleri commit et
```

### 4️⃣ Adımları Uygulama
```javascript
[1/4] Hata loglarını inceleyip root cause analizi yap
      ✓ Kod değiştirildi

[2/4] Error handling mekanizmasını refactor et
      ✓ Kod değiştirildi

[3/4] Unit testleri yaz ve çalıştır
      ✓ Test başarılı

[4/4] Değişiklikleri commit et
      ✓ Git commit yapıldı
```

### 5️⃣ Roadmap Güncelleme
```markdown
### 14.1 Auth Modülü Hata Düzeltme
- [x] Hata loglarını inceleyip root cause analizi yap  ← [ ] → [x]
- [x] Auth middleware'de try-catch bloklarını güçlendir
- [x] Error handling mekanizmasını refactor et
- [x] JWT token validation edge cases'i test et
```

### 6️⃣ Sonraki Göreve Geç
```
Tamamlanan: FAZ 14.1 ✅
Sonraki: FAZ 14.2 (Reservation Modülü)
```

---

## 📋 ÇÖZÜM DÖNGÜSÜ PLANLARI - FAZ'lara Göre

### 🔴 FAZ 14: HATA DÜZELTMESİ VE REFACTORING

**Plan Adımları:**
1. Hata loglarını inceleyip root cause analizi yap
2. Error handling mekanizmasını refactor et
3. Unit testleri yaz ve çalıştır
4. Değişiklikleri commit et

**Etkilenen Dosyalar:**
- `backend/routes/auth.js`
- `backend/routes/reservations.js`
- `backend/routes/halls.js`
- `backend/middlewares/auth.js`

**Test Türü:** `unit-test`

---

### ⚡ FAZ 15: BACKEND PERFORMANS OPTIMIZASYONU

**Plan Adımları:**
1. Redis caching sistemi ekle
2. Database querylerini optimize et (N+1 fix)
3. Pagination ekle
4. Load test çalıştır ve metrik topla
5. Değişiklikleri commit et

**Etkilenen Dosyalar:**
- `backend/index.js`
- `backend/middlewares/cache.js`
- `backend/routes/events.js`
- `backend/routes/reservations.js`

**Test Türü:** `load-test`

**Caching Stratejisi:**
```javascript
// Redis TTL: 5 dakika
/api/events → Cache 5 min
/api/halls → Cache 5 min
/api/reservations → No cache (real-time)
```

---

### 🛡️ FAZ 16: GÜVENLİK GÜÇLENDIRMESI

**Plan Adımları:**
1. Rate limiting middleware ekle
2. CORS policy sıkılaştır
3. Helmet.js configuration güçlendir
4. CSRF token validation ekle
5. Security scan çalıştır
6. Değişiklikleri commit et

**Etkilenen Dosyalar:**
- `backend/index.js`
- `backend/middlewares/rateLimit.js`
- `backend/middlewares/auth.js`

**Test Türü:** `security-scan`

**Güvenlik Standartları:**
- OWASP Top 10
- PCI-DSS Compliance

---

### 📋 FAZ 17: İŞ MANTĞI VALIDASYONLARI

**Plan Adımları:**
1. Validasyon kurallarını merkezi yerde topla
2. Backend endpoint'lerine validasyon ekle
3. Frontend validasyonlarını senkronize et
4. Integration testleri çalıştır
5. Değişiklikleri commit et

**Etkilenen Dosyalar:**
- `backend/utils/validations.js` (YENİ)
- `backend/routes/events.js`
- `backend/routes/reservations.js`
- `frontend/src/utils/validators.ts`

**Test Türü:** `integration-test`

**Validasyon Kuralları:**
```javascript
eventDate >= today (Geçmiş tarih kontrol)
capacity >= 1 (Kapasite minimum)
seat availability check (Koltuk kontrolü)
concurrent reservation handling (Eşzamanlı rez kontrolü)
```

---

### 📱 FAZ 18: FRONTEND UX İYİLEŞTİRMELERİ

**Plan Adımları:**
1. UI component'lerini iyileştir (1-click payment)
2. Mobile responsiveness ekle
3. Search/filter UX iyileştir
4. E2E testleri çalıştır
5. Değişiklikleri commit et

**Etkilenen Dosyalar:**
- `frontend/src/app/event/[id]/page.tsx`
- `frontend/src/components/PaymentFlow.tsx`
- `frontend/src/components/SearchComponent.tsx`
- `frontend/src/app/globals.css`

**Test Türü:** `e2e-test`

**UX Metrikler:**
```
Öncesi: %22 ödeme adımında çıkış
Hedef: %5 altında çıkış

Öncesi: Yüksek arama sonrası çıkış
Hedef: Autocomplete + filter persistence ile çöz
```

---

## 🔄 DÖNGÜ BAŞLATMA

### Komut
```bash
cd aie-system/loop
node solution-engine.js
```

### Çıktı Örneği
```
╔════════════════════════════════════════════════════════════════╗
║           🔧 ÇÖZÜM DÖNGÜSÜ BAŞLATILDI                        ║
╚════════════════════════════════════════════════════════════════╝

📋 GÖREV SIRASI OLUŞTURULDU
   Toplam görev: 18
   1. FAZ 14 - Auth Modülü Hata Düzeltme (40/40)
   2. FAZ 14 - Reservation Modülü Hata Düzeltme (40/40)
   3. FAZ 14 - Hall Modülü Hata Düzeltme (40/40)
   4. FAZ 16 - Hızlı Güvenlik Audit (40/40)
   5. FAZ 17 - Tarih Validasyonları (40/40)
   6. FAZ 17 - Kapasite Validasyonları (40/40)
   7. FAZ 17 - Koltuk Rezervasyon Mantığı (40/40)
   8. FAZ 17 - Hata Yakalama ve Retry (51/40)
   9. FAZ 15 - API Endpoint'leri Caching (47/40)
   10. FAZ 18 - Ödeme Akışı Sadeleştirme (61/40)
   11. FAZ 18 - Arama ve Filtreleme UX (51.5/40)

╔═══════════════════════════════════════════════════════════╗
║ 📋 ÇÖZÜLECEK GÖREV
╠═══════════════════════════════════════════════════════════╣
║ ID: 3F2A9K1M
║ FAZ: 14 | Tür: 🔴 HATA DÜZELTMESİ
║ Başlık: Auth Modülü Hata Düzeltme
║ Puan: 40/40 | Zorluk: 🟢 ORTA
║ Durum: ⏳ Bekleme
║ Alt-Görevler: 4 adet
╚═══════════════════════════════════════════════════════════╝

🔍 GÖREV ANALIZI...
   ✓ Alt-görevler: 4
   ✓ Puanlama: 40/40

📐 ÇÖZÜM PLANI OLUŞTURULUYOR...
   ✓ 4 adım planlandı

⚙️  ÇÖZÜM UYGULANIYORU...
   [1/4] Hata loglarını inceleyip root cause analizi yap
        ✓ Kod değiştirildi
   [2/4] Error handling mekanizmasını refactor et
        ✓ Kod değiştirildi
   [3/4] Unit testleri yaz ve çalıştır
        ✓ Test başarılı
   [4/4] Değişiklikleri commit et
        ✓ Git commit yapıldı

📌 ROADMAP GÜNCELLENIYOR...
   ✓ [ ] → [x] işaretlendi

✅ GÖREV TAMAMLANDI (12.3s)

...

╔════════════════════════════════════════════════════════════════╗
║                   ✅ ÇÖZÜM DÖNGÜSÜ TAMAMLANDI                ║
╠════════════════════════════════════════════════════════════════╣
║ ⏱️  Toplam Süre: 156.8s
║ ✅ Tamamlanan: 11
║ ❌ Başarısız: 0
║ 📊 Başarı Oranı: %100
╚════════════════════════════════════════════════════════════════╝
```

---

## 📊 ÇÖZÜM DÖNGÜSÜ İSTATİSTİKLERİ

### Çıktı Dosyaları
```
📁 aie-system/solutions/
├─ solution-log.json          (Tüm çözüm geçmişi)
├─ solution-status.md         (Markdown rapor)
└─ {TASK-ID}-*.patch          (Her görev için patch dosyası)
```

### solution-log.json
```json
{
  "completedCount": 11,
  "failedCount": 0,
  "totalTime": 156.8,
  "tasks": [
    {
      "id": "3F2A9K1M",
      "fazNumber": 14,
      "taskName": "Auth Modülü Hata Düzeltme",
      "status": "✅ Tamamlandı",
      "duration": 12.3,
      "gitCommit": "commit-a1b2c3d4"
    }
  ]
}
```

---

## 🎮 KONTROL MEKANIZMALARI

### Otomatik Retry
```javascript
Hata durumunda:
├─ Deneme 1: Başarısız ❌
├─ 2 saniye bekleme
├─ Deneme 2: Başarısız ❌
├─ 2 saniye bekleme
├─ Deneme 3: BAŞARILI ✅
└─ Sonraki göreve geç

Max retries: 3
```

### Hata Yönetimi
```javascript
if (error) {
  task.errors.push(error.message);
  task.retries++;
  
  if (task.retries >= MAX_RETRIES) {
    task.status = FAILED;
    failedTasks.push(task);
  } else {
    retry();
  }
}
```

### Görev Sırası
```javascript
priorityOrder = [14, 16, 17, 15, 18]
// Hata → Güvenlik → Logic → Performans → UX

// Her FAZ içinde alt-görevler sırayla çözülür
FAZ 14:
├─ 14.1: Auth Hata
├─ 14.2: Reservation Hata
└─ 14.3: Hall Hata
```

---

## 📈 ÖRNEK BAŞARILI ÇALIŞMA

```
┌─────────────────────────────────────┐
│ Başlangıç: 11 çözülmemiş görev      │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│ FAZ 14.1: Auth Hata Düzeltme        │
│ 4 alt-görev → 4 adım çözüm → ✅    │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│ FAZ 14.2: Reservation Hata Düzeltme │
│ 4 alt-görev → 4 adım çözüm → ✅    │
└────────────┬────────────────────────┘
             ↓
             ...
             ↓
┌─────────────────────────────────────┐
│ FAZ 18.2: Arama/Filter UX           │
│ 6 alt-görev → 5 adım çözüm → ✅    │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│ SONUÇ: 11/11 tamamlandı ✅          │
│ Toplam Süre: 156.8s                 │
│ Başarı Oranı: %100                  │
└─────────────────────────────────────┘
```

---

## 🔐 KURALLAR VE SINIRLAMASİ

| Kural | Tanım |
|-------|-------|
| **Max Retries** | Her görev max 3 kez denenir |
| **Task Delay** | Görevler arası 2 saniye bekleme |
| **Timeout** | Hepsi otomatik (deadline yok) |
| **Parallel** | Görevler sırayla (paralel DEĞİL) |
| **Rollback** | Başarısız görev devam eder (rollback yok) |
| **Notification** | Console + Markdown rapor |
| **Git Auto-Commit** | Her görev tamamlandığında commit |

---

## 🚀 GELECEK GELIŞTIRMELER

- [ ] Parallel task execution (birden fazla görev eş zamanlı)
- [ ] ML-based automatic code generation
- [ ] Slack/Discord notifications
- [ ] Web dashboard for monitoring
- [ ] Database logging
- [ ] Performance metrics collection
- [ ] Automated code review
- [ ] Rollback on failure mechanism


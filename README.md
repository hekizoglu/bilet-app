# 🎫 Bilet Uygulaması — Kapsamlı Sistem Kılavuzu

> **Bu belge, sistemi hiç bilmeyen birinin okuyarak uygulamanın uzmanı olmasını sağlamak amacıyla hazırlanmıştır.**
> Her dosya, her akış, her mantık hatası ve çözümü detaylı olarak açıklanmıştır.

---

## İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Teknoloji Yığını](#2-teknoloji-yığını)
3. [Proje Dizin Yapısı](#3-proje-dizin-yapısı)
4. [Veritabanı Şeması (Prisma)](#4-veritabanı-şeması-prisma)
5. [Kimlik Doğrulama Akışı (Auth)](#5-kimlik-doğrulama-akışı-auth)
6. [Etkinlik Yönetimi](#6-etkinlik-yönetimi)
7. [Salon Tasarım Aracı (Hall Designer)](#7-salon-tasarım-aracı-hall-designer)
8. [Bilet Satın Alma Akışı (Rezervasyon)](#8-bilet-satın-alma-akışı-rezervasyon)
9. [Ödeme Sistemi](#9-ödeme-sistemi)
10. [Bekleme Listesi (Waitlist) ve Soft Hold](#10-bekleme-listesi-waitlist-ve-soft-hold)
11. [Kupon ve İndirim Sistemi](#11-kupon-ve-indirim-sistemi)
12. [Sadakat Puanı Sistemi](#12-sadakat-puanı-sistemi)
13. [Kapıda QR Check-in](#13-kapıda-qr-check-in)
14. [Gerçek Zamanlı İletişim (Socket.io)](#14-gerçek-zamanlı-iletişim-socketio)
15. [Güvenlik Katmanları](#15-güvenlik-katmanları)
16. [Yardımcı Altyapılar (Cache, Queue, CircuitBreaker)](#16-yardımcı-altyapılar)
17. [Tespit Edilen Mantık Hataları ve Çözümleri](#17-tespit-edilen-mantık-hataları-ve-çözümleri)
18. [Üretim Ortamına Çıkarken Yapılması Gerekenler](#18-üretim-ortamına-çıkarken-yapılması-gerekenler)
19. [Kurulum ve Çalıştırma](#19-kurulum-ve-çalıştırma)

---

## 1. Genel Bakış

Bilet Uygulaması, etkinlik bilet satışını, masa/koltuk rezervasyonunu ve ödeme takibini tek çatı altında toplayan tam teşekküllü bir platformdur.

**Üç temel kullanıcı rolü vardır:**

| Rol | Ne Yapabilir? |
|-----|---------------|
| **CUSTOMER** | Etkinlikleri görüntüler, bilet alır, bekleme listesine kaydolur, profilini yönetir |
| **ORGANIZER** | Etkinlik ve salon oluşturur, rezervasyonları yönetir, ödeme onaylar |
| **ADMIN** | Tüm ORGANIZER yetkileri + kupon yönetimi, iade işlemi, rol değiştirme, sistem ayarları |

**Kural:** Sisteme yalnızca `@gmail.com` uzantılı e-posta adresleri ile Google OAuth üzerinden kayıt olunabilir. Başka hiçbir e-posta sağlayıcısı (Outlook, Yahoo vb.) kabul edilmez. Bu kısıtlama `backend/routes/auth.js` satır 72-75'te uygulanmaktadır.

---

## 2. Teknoloji Yığını

```
┌───────────────────────────────────────────────────────┐
│                    FRONTEND (Port 3005)                │
│   Next.js 16 (App Router) + React + TailwindCSS       │
│   react-konva (Salon Tasarımı) + socket.io-client     │
│   Sentry (Hata İzleme)                                │
├───────────────────────────────────────────────────────┤
│                    BACKEND (Port 5000)                 │
│   Express.js + Prisma ORM + Socket.io                 │
│   Helmet + CORS + Rate Limiting + Zod Validation      │
│   Sentry + Morgan Logger + Circuit Breaker            │
├───────────────────────────────────────────────────────┤
│                    VERİTABANI                          │
│   PostgreSQL 16 (Ana DB) — Prisma ile yönetilir       │
│   Redis (Opsiyonel ama prod için zorunlu)              │
│     → Socket.io Adapter (çekirdekler arası iletişim)  │
│     → Redlock (dağıtık kilit — çifte satış önleme)    │
│     → Rate Limit Store (DDoS koruması)                │
├───────────────────────────────────────────────────────┤
│                    ALTYAPI                             │
│   PM2 (Cluster Mode — tüm CPU çekirdeklerini kullanır)│
│   Docker Compose (PostgreSQL + Backend + Frontend)    │
│   Nodemailer (E-posta) + Telegram Bot API             │
└───────────────────────────────────────────────────────┘
```

---

## 3. Proje Dizin Yapısı

```
bilet-app/
├── backend/
│   ├── index.js                 # Ana sunucu (Express + Socket.io + Redis Adapter)
│   ├── routes/
│   │   ├── auth.js              # Google OAuth giriş + Gmail kısıtlaması
│   │   ├── events.js            # Etkinlik CRUD + Waitlist kaydı
│   │   ├── halls.js             # Salon CRUD + Klonlama
│   │   ├── reservations.js      # Bilet satışı, onay, iptal, iade, check-in (1163 satır)
│   │   ├── payments.js          # IBAN doğrulama, webhook, kredi kartı simülasyonu
│   │   ├── coupons.js           # Kupon CRUD + doğrulama
│   │   ├── users.js             # Profil yönetimi + rol değiştirme
│   │   └── telegram.js          # Telegram Mini App auth
│   ├── middlewares/
│   │   ├── auth.js              # JWT doğrulama middleware
│   │   └── validate.js          # Zod şema doğrulama middleware
│   ├── services/
│   │   └── pricingService.js    # Fiyat hesaplama (kupon + sadakat puanı)
│   ├── utils/
│   │   ├── cache.js             # In-memory TTL cache (Map tabanlı)
│   │   ├── circuitBreaker.js    # Dış servislere Circuit Breaker + Retry
│   │   ├── encryption.js        # AES-256-CBC şifreleme (IBAN, Bot Token vb.)
│   │   ├── logger.js            # Winston logger
│   │   └── queue.js             # In-memory asenkron iş kuyruğu
│   └── prisma/
│       └── schema.prisma        # Veritabanı şeması (7 model)
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router sayfaları
│       │   ├── page.tsx         # Anasayfa (Etkinlik Listesi)
│       │   ├── login/           # Google Login sayfası
│       │   ├── admin/           # Admin paneli (designer, events, halls, reservations vb.)
│       │   ├── event/[id]/      # Etkinlik detay + koltuk seçimi
│       │   ├── payment/mobile/  # Ödeme sayfası
│       │   └── profile/         # Kullanıcı profili + ayarlar
│       └── components/
│           ├── HallDesignerCanvas.tsx  # Salon tasarım aracı (react-konva, 50KB)
│           ├── SeatMapViewer.tsx       # Müşteri tarafı koltuk haritası
│           └── ...
├── docker-compose.yml           # PostgreSQL + Backend + Frontend container'ları
├── ecosystem.config.js          # PM2 Cluster yapılandırması
└── README.md                    # Bu dosya
```

---

## 4. Veritabanı Şeması (Prisma)

Dosya: `backend/prisma/schema.prisma`

**7 model bulunur:**

| Model | Amaç | Önemli Alanlar |
|-------|-------|----------------|
| **User** | Kullanıcılar | email (unique), role, iban (şifreli), points |
| **Hall** | Salonlar | layoutJson (kanvas verisi, JSON string), seatCount |
| **Event** | Etkinlikler | hallId (FK), isSeated, capacity, paymentType, visibility, privateSlug |
| **Reservation** | Biletler/Rezervasyonlar | eventId (FK), seatId, ticketCode (unique), status, paymentStatus, earnedPoints, isUsed |
| **Waitlist** | Bekleme Listesi | eventId (FK), email, status (PENDING/NOTIFIED) |
| **Coupon** | İndirim Kuponları | code (unique), discountType, discountValue, maxUses, usedCount |
| **Setting** | Sistem Ayarları | key-value çiftleri |

### Reservation Statüleri

```
Beklemede → (Admin Onayı) → Onaylı → (Check-in) → isUsed=true
    │                           │
    │ (Admin İptal)             │ (İade)
    ↓                           ↓
  İptal                       İptal (paymentStatus: refunded)
```

Özel statü: `Ödeme Bekleniyor` — Waitlist'ten gelen geçici "Soft Hold" rezervasyonları için kullanılır (15 dk opsiyon süresi).

---

## 5. Kimlik Doğrulama Akışı (Auth)

Dosya: `backend/routes/auth.js`

### Akış:

```
Kullanıcı → "Google ile Giriş Yap" → Frontend Google'dan IdToken alır
  → POST /api/auth/google { token: "..." }
    → Backend Google sunucularında token'ı doğrular (verifyIdToken)
    → E-posta @gmail.com ile bitiyor mu? (Hayırsa → 403 Rejected)
    → DB'de kullanıcı var mı? (Yoksa oluştur)
    → Kendi JWT tokeni üret (12 saat TTL)
    → Frontend'e { token, user: { email, role } } dön
```

### Güvenlik Noktaları:

1. **Gmail Kısıtlaması:** `!payload.email.endsWith('@gmail.com')` kontrolü yapılır. Sadece `@gmail.com` kabul edilir. Admin e-postası (`ADMIN_EMAIL` env) bu kuraldan muaftır.
2. **Rate Limiting:** Auth endpointine 15 dakikada 5 deneme limiti vardır (Redis varsa paylaşımlı store).
3. **Token Cache:** Aynı Google token kısa süre içinde tekrar gelirse API'ye gitmeden cache'ten döner (performans).
4. **Test Token'ları:** `LOCAL_TEST_TOKEN`, `LOCAL_ADMIN_TOKEN` gibi geliştirme token'ları sadece dev ortamda kolaylık sağlar. Üretimde `GOOGLE_CLIENT_ID` ayarlı olmalıdır.

### Telegram Auth:

Dosya: `backend/routes/telegram.js` — Telegram Mini App'ten giriş yapanlar için ayrı bir auth mekanizması mevcuttur. Bu kullanıcılara `{tgId}@telegram.local` formatında sahte e-posta atanır. Bu adresler Gmail kısıtlamasına tabi değildir çünkü farklı bir endpoint (`/api/telegram/auth`) üzerinden girerler. Üretimde bu ayrımın bilinçli olup olmadığına dikkat edilmelidir.

---

## 6. Etkinlik Yönetimi

Dosya: `backend/routes/events.js`

### Etkinlik Türleri:

| Alan | Değerler | Açıklama |
|------|----------|----------|
| `isSeated` | true/false | Koltuklu mu, Genel Giriş mi? |
| `paymentType` | free / creditcard / cardless | Ödeme yöntemi |
| `visibility` | PUBLIC / PRIVATE | Herkese açık mı, gizli link mi? |
| `status` | Taslak / Aktif / Pasif | Bilet satışa açık mı? |

### Validasyon Kuralları (Zod):
- Tarih gelecekte olmalı (geçmiş tarihe etkinlik eklenemez)
- Koltuklu ise `hallId` zorunlu, koltuksuz ise `capacity` zorunlu
- Fiyat negatif olamaz

### Gizli Etkinlikler (PRIVATE):
- Oluşturulduğunda 12 haneli rastgele `privateSlug` atanır
- Müşteri etkinliğe sadece slug linki ile erişebilir (UUID ile direkt erişim engellenir)
- Admin istediğinde yeni slug üretebilir (`/regenerate-slug`)

---

## 7. Salon Tasarım Aracı (Hall Designer)

Dosya: `frontend/src/components/HallDesignerCanvas.tsx` (50KB, ~1100 satır)

Admin panelinden (`/admin/designer`) erişilir. `react-konva` (Canvas tabanlı 2D çizim) kütüphanesi kullanır.

### Özellikler:

1. **Manuel Canvas Boyutları:** Genişlik ve Yükseklik (px) olarak manuel girilebilir
2. **Otomatik Yerleşim Sihirbazı:** Salon ölçüleri, masa sayısı, sandalye sayısı, sahne konumu gibi parametreler girilerek tek tıkla salon düzeni oluşturulur
3. **Sürükle-Bırak:** Her eleman (masa, sahne, bistro, çıkış kapısı) fareyle taşınabilir, boyutlandırılabilir
4. **Hizalama:** Seçili elemanları Sol/Sağ/Üst/Alt/Orta'ya hizalayabilirsiniz
5. **Izgara Dağıtım (Grid Distribute):** Seçili elemanları otomatik olarak eşit aralıklı ızgaraya dağıtır
6. **Çoklu Seçim:** Ctrl+tıklama veya dikdörtgen seçim (rubber-band) ile birden fazla elemanı aynı anda seçip toplu taşıma/hizalama yapabilirsiniz

### Verinin Saklanması:
Salon düzeni, `layoutJson` alanında JSON string olarak veritabanına kaydedilir:
```json
{
  "canvas": { "width": 1000, "height": 800 },
  "elements": [
    { "id": "table-1", "type": "round_table", "x": 100, "y": 200, "seatCount": 8, "label": "Masa 1", ... },
    { "id": "stage-1", "type": "stage", "x": 400, "y": 50, ... }
  ]
}
```

---

## 8. Bilet Satın Alma Akışı (Rezervasyon)

Dosya: `backend/routes/reservations.js` — Sistemin en kritik ve en karmaşık dosyasıdır (1163 satır).

### Tam Akış (POST /api/reservations):

```
1. Rate Limiter → 1 dakikada max 5 deneme
2. Zod Validasyon → email, customer, eventIdOrSlug zorunlu
3. Kilit Alma →
     Redis varsa: Redlock.acquire("lock:event:ID", 15 saniye)
     Redis yoksa: async-mutex (fallback, tek process)
4. Etkinlik Bulma → UUID mi slug mu tespit edip DB'den çek
5. Kontroller →
     - Etkinlik "Aktif" mi?
     - Tarih geçmemiş mi?
     - PRIVATE ise UUID ile mi geldi? (Engellenecek)
6. Prisma Transaction (Serializable Isolation) →
     a. Koltuklu → Layout JSON'dan koltuk doğrula + double-booking kontrolü
     b. Koltuksuz → Kapasite kontrolü
     c. Kupon varsa → Doğrula, indirim hesapla, usedCount artır
     d. Fiyat hesapla (pricingService.calculateFinalPrice)
     e. Sadakat puanı hesapla (fiyatın %5'i)
     f. Puanı SADECE ücretsiz bilette anında ver (ücretlide onay anında)
     g. Reservation kaydı oluştur
7. Kilit Serbest Bırak → lock.release()
8. Cache Temizle → İlgili availability + reservation listesi
9. Socket.io Yayını → seat_booked (müşterilere) + new_sale (admin room'a)
10. Telegram Bildirimi (cardless ise) → TaskQueue'ya asenkron ekle
11. Ücretsiz ise → QR kodlu e-bilet maili TaskQueue'ya ekle
12. Response → 201 Created
```

### Koltuk Doğrulama:
Müşterinin gönderdiği `seatId`, salon layout JSON'ından (`extractSeatsFromLayout` fonksiyonu) çapraz kontrol edilir. Müşterinin gönderdiği `seatName` **yok sayılır** ve veritabanından doğrulanmış isim kullanılır (istemci taraflı sahtekarlık önleme).

---

## 9. Ödeme Sistemi

### Ödeme Türleri:

| Tür | Akış |
|-----|------|
| **free** | Ödeme yok, bilet anında onaylı. QR kodlu e-posta gönderilir |
| **cardless** | Havale/EFT: Admin IBAN bilgisi gösterilir, müşteri transfer yapar, admin panelden onaylar |
| **creditcard** | Kredi kartı simülasyonu: Kart bilgileri alınır, ödeme simüle edilir, bilet onaylanır |

### Dosyalar ve Endpoint'ler:

**`backend/routes/payments.js`:**
- `POST /validate-iban` — IBAN format doğrulama (ibantools kütüphanesi)
- `GET /mask-iban` — IBAN maskeleme (TR33 **** **** ... **78 02)
- `POST /:reservationId/manual-verify` — Admin: Manuel ödeme doğrulama
- `POST /bank-webhook` — Banka webhook: Otomatik ödeme eşleştirme (referans koduyla)
- `POST /:reservationId/pay-creditcard` — Kredi kartı ödeme simülasyonu

**`backend/routes/reservations.js`:**
- `POST /:id/approve` — Admin: Ödeme onayı (amountReceived kontrolü ile)
- `POST /:id/cancel` — Admin: İptal
- `POST /:id/refund` — Admin: İade
- `POST /:id/request-payment` — Müşteri: "Transfer yaptım" bildirimi

### Banka Webhook Güvenliği:
- Aynı `transactionId`'nin tekrar işlenmesi engellenir (fraud detection)
- Ödeme referans kodu regex ile açıklamadan ayrıştırılır
- `updateMany` ile sadece `pending` olan rezervasyonlar güncellenir (race condition koruması)

---

## 10. Bekleme Listesi (Waitlist) ve Soft Hold

### Waitlist Kaydı:
- `POST /api/events/:id/waitlist` — Müşteri adını, e-postasını girer
- Aynı e-posta + aynı etkinlik için çifte kayıt engellenir
- Etkinlik "Aktif" ve tarihi gelecekte olmalı

### Soft Hold Akışı (Bilet İptal Edildiğinde):

```
1. Admin bir bileti iptal eder (POST /:id/cancel)
2. Koltuk boşa çıkar → Socket.io ile seat_released yayınlanır
3. TaskQueue'ya "notifyWaitlist" job'ı eklenir (asenkron, non-blocking)
4. Job çalışır:
   a. Bekleme listesinin ilk sırasındaki kişi bulunur (FIFO sırası)
   b. Bu kişi adına statüsü "Ödeme Bekleniyor" olan geçici rezervasyon oluşturulur
   c. Waitlist entry statüsü "NOTIFIED" olarak güncellenir
   d. setTimeout(15 dakika) → Eğer hâlâ 'pending' ise iptal et
   e. E-posta gönderilir: "15 dakikan var, ödeme yap yoksa bilet gider"
```

**Kritik Not:** 15 dakikalık geri sayım `setTimeout` ile yapılır. Sunucu yeniden başlarsa bu timer kaybolur. Üretimde bu işlemin BullMQ veya benzeri bir kalıcı kuyruk sistemiyle yapılması önerilir.

---

## 11. Kupon ve İndirim Sistemi

Dosya: `backend/routes/coupons.js`

- **Kupon Türleri:** PERCENTAGE (yüzdelik) veya FIXED (sabit tutar)
- **Kullanım Limiti:** `maxUses` belirlenebilir, `usedCount` ile takip edilir
- **Süre Limiti:** `validUntil` tarihi geçince otomatik devre dışı
- **Doğrulama:** `POST /api/coupons/validate` public endpoint (müşteri checkout'ta kupon girebilir)
- **Yönetim:** Sadece ADMIN yetkisi gerekli

### Fiyat Hesaplama:
`backend/services/pricingService.js` → `calculateFinalPrice(basePrice, coupon, loyaltyPointsUsed)`:
- Kupon indirimi uygulanır (yüzde veya sabit)
- Sadakat puanı indirimi uygulanır (1 puan = 1 TL)
- Sonuç asla negatif olmaz (minimum 0)

---

## 12. Sadakat Puanı Sistemi

- Müşteri bilet aldığında, ödediği tutarın **%5'i** kadar puan hesaplanır
- **UYARI:** Puan **SADECE ödeme onaylandığında** (veya ücretsiz bilet alındığında) kullanıcı hesabına eklenir. Beklemede olan biletler için puan verilmez
- Bu mantık `reservations.js` satır 387-397 (ücretsiz anında) ve satır 578-584 (admin onayında) uygulanır
- Kullanıcının toplam puanı `User.points` alanında tutulur

---

## 13. Kapıda QR Check-in

### Akış:
1. Bilet onaylandığında QR kodu müşteriye e-posta ile gönderilir (qrcode kütüphanesi, Base64)
2. Kapı görevlisi `/admin/scanner` sayfasından QR okutabilir
3. `POST /api/reservations/checkin` → ticketCode ile bilet bulunur, `isUsed: true` yapılır
4. İkinci okutmada "Bu bilet daha önce kullanılmış!" hatası verilir

### Offline Mod:
- `GET /api/reservations/scanner/:eventId` — Tüm onaylı biletleri JSON olarak indir
- `POST /api/reservations/bulk-checkin` — Offline okutulan biletleri toplu olarak sisteme eşitle

---

## 14. Gerçek Zamanlı İletişim (Socket.io)

Dosya: `backend/index.js` satır 54-90

### Event'ler:

| Event | Yön | Açıklama |
|-------|-----|----------|
| `join_event` | Client→Server | Müşteri etkinlik odasına katılır |
| `join_admin` | Client→Server | Admin, admin odasına katılır |
| `seat_booked` | Server→Clients | Koltuk rezerve edildi (kırmızıya dön) |
| `seat_released` | Server→Clients | Koltuk serbest bırakıldı (yeşile dön) |
| `new_sale` | Server→Admin | Yeni satış bildirimi (dashboard) |

### Redis Adapter:
PM2 cluster modunda birden fazla Node.js process'i çalışır. A process'indeki Socket mesajı B process'ine varsayılan olarak iletilmez. `@socket.io/redis-adapter` tüm process'leri Redis üzerinden bağlayarak mesajların tüm client'lara ulaşmasını sağlar.

---

## 15. Güvenlik Katmanları

### 15.1. Kimlik ve Erişim
- **Google OAuth 2.0** — Sadece `@gmail.com` adresleri kabul edilir
- **JWT** — 12 saatlik token, her API isteğinde `Authorization: Bearer <token>` zorunlu
- **Rol Tabanlı Yetkilendirme** — Her endpoint'te `req.user.role` kontrol edilir

### 15.2. Giriş Doğrulama
- **Zod** — Tüm kritik endpoint'lerde şema doğrulama (email formatı, string uzunluğu, enum değerleri)
- **xss-clean** — XSS (Cross-Site Scripting) saldırıları engellenir
- **Helmet** — HTTP güvenlik başlıkları otomatik eklenir

### 15.3. Hız Sınırlama (Rate Limiting)
| Endpoint | Limit | Window |
|----------|-------|--------|
| Genel API | 100 istek | 15 dakika |
| Auth (/api/auth/google) | 5 deneme | 15 dakika |
| Bilet Alma (POST /reservations) | 5 deneme | 1 dakika |
| Ödeme Doğrulama | 5 deneme | 15 dakika |

### 15.4. Şifreleme
- IBAN, Telegram Bot Token, Chat ID gibi hassas veriler `AES-256-CBC` ile şifrelenerek DB'ye yazılır
- Şifreleme anahtarı `JWT_SECRET`'tan türetilir (`backend/utils/encryption.js`)

### 15.5. CORS
- İzin verilen origin'ler `ALLOWED_ORIGINS` env değişkeninden okunur
- Geliştirmede `localhost:*` otomatik izinli

---

## 16. Yardımcı Altyapılar

### 16.1. Cache (`backend/utils/cache.js`)
- In-memory Map tabanlı, TTL destekli basit cache
- Etkinlik listesi, availability bilgisi 5 dakika cache'lenir
- `clearEventCache(eventId)` ile ilgili tüm cache temizlenir
- **⚠ PM2 Cluster'da her process'in kendi cache'i vardır** — İleride Redis cache'e geçilmesi önerilir

### 16.2. Queue (`backend/utils/queue.js`)
- In-memory asenkron iş kuyruğu (EventEmitter tabanlı)
- E-posta ve Telegram bildirimleri HTTP yanıtını bekletmeden arka planda çalışır
- İşler sırayla (sequential) çalışır, bir iş bitince 100ms sonra diğeri başlar
- **⚠ Sunucu yeniden başlarsa kuyruk kaybolur** — İleride BullMQ'ya geçilmesi önerilir

### 16.3. Circuit Breaker (`backend/utils/circuitBreaker.js`)
- SMTP veya Telegram API'si çöktüğünde, hatalı istekleri tekrar göndermeye çalışıp sistemi boğmamak için tasarlanmıştır
- 3 ardışık hata → Circuit OPEN (15 sn boyunca istek göndermeden direkt reddet)
- 15 sn sonra → HALF-OPEN (bir deneme yap, başarılı ise normal dön)
- Retry: Üstel bekleme (1s → 2s → 4s) ile 3 deneme

---

## 17. Tespit Edilen Mantık Hataları ve Çözümleri

### ✅ ÇÖZÜLDÜ: Çifte Satış (Double-Booking) — PM2 Cluster + In-Memory Mutex

**Sorun:** `async-mutex` sadece kendi process'ini kilitler. PM2 ile 8 process çalışırken, iki farklı process'e düşen iki müşteri aynı koltuğu satın alabilirdi.

**Çözüm:** `ioredis` + `redlock` kütüphanesi ile Redis üzerinde dağıtık kilit (distributed lock) uygulandı. Tüm process'ler aynı Redis lock'unu kullanır. Fallback olarak mutex korundu (Redis yokken tek process modunda çalışır).

**Dosya:** `backend/routes/reservations.js` satır 24-38 ve 261-266

---

### ✅ ÇÖZÜLDÜ: Socket.io Mesajlarının Diğer Process'lere Ulaşmaması

**Sorun:** A process'indeki müşteri bilet aldığında, sadece A'ya bağlı diğer müşteriler "koltuk doldu" güncellemesini görüyordu.

**Çözüm:** `@socket.io/redis-adapter` kurularak tüm process'ler Redis Pub/Sub üzerinden bağlandı.

**Dosya:** `backend/index.js` satır 67-70

---

### ✅ ÇÖZÜLDÜ: DDoS Korumasının Process'lere Bölünmesi

**Sorun:** `express-rate-limit` in-memory çalıştığı için, "100 istek/15dk" limiti aslında 8 process × 100 = 800 isteğe çıkıyordu.

**Çözüm:** `rate-limit-redis` ile Redis store'a bağlandı. Tüm process'ler aynı sayacı kullanır.

**Dosya:** `backend/index.js` satır 99-105, `backend/routes/auth.js` satır 22-27

---

### ✅ ÇÖZÜLDÜ: Sadakat Puanı Hırsızlığı

**Sorun:** Müşteri bilet alır almaz (ödeme beklerken) puan kazanıyordu. İptal ederse puan hesabında kalıyordu.

**Çözüm:** Puan ekleme, sadece admin'in `/approve` endpoint'ine veya ücretsiz bilet alındığı ana taşındı.

**Dosya:** `backend/routes/reservations.js` satır 387-397 (ücretsiz) ve 578-584 (onay)

---

### ✅ ÇÖZÜLDÜ: Kuyruk (Queue) Bloklama — 15 Dakika Donma

**Sorun:** Waitlist soft hold için "15 dakika sonra iptal et" emri queue'ya verilmişti. Sıralı çalışan queue 15 dakika boyunca duracaktı.

**Çözüm:** Gecikmeli iş `setTimeout`'a taşındı (queue'yu bloklamaz).

**Dosya:** `backend/routes/reservations.js` satır 695-716

---

### ✅ ÇÖZÜLDÜ: Ödeme Onayında Tutar Kontrolü Eksikliği

**Sorun:** Admin, hiç tutar kontrolü yapılmadan herhangi bir bileti "Onaylı" yapabiliyordu. 100₺'lik bilete 10₺ gönderen müşteri de onaylanabilirdi.

**Çözüm:** `amountReceived` parametresi eklendi ve beklenen tutarla karşılaştırılır.

**Dosya:** `backend/routes/reservations.js` satır 549-570

---

### ✅ ÇÖZÜLDÜ: payments.js Webhook'ta Tanımsız Değişken Hatası

**Sorun:** `bank-webhook` endpoint'inde DB güncelleme sonucu `updatedReservation` adlı değişkende tutuluyordu, ama response'ta `updated` (tanımsız) referans ediliyordu. Webhook'tan ödeme geldiğinde sunucu crash olacaktı.

**Çözüm:** `updated` → `updatedReservation` olarak düzeltildi.

**Dosya:** `backend/routes/payments.js` satır 286, 293

---

### ⚠ BİLİNEN KISITLAMALAR (Henüz Çözülmedi):

1. **In-Memory Cache (PM2'de tutarsız):** Her process kendi cache'ini tutar. Bir process'te cache temizlendiğinde diğerleri eski veriyi gösterebilir. **Çözüm:** Redis cache'e geçilmesi.

2. **setTimeout Zamanlayıcı Kalıcılığı:** Sunucu yeniden başlarsa 15 dakikalık soft hold zamanlayıcıları kaybolur. Ödeme bekleniyor statüsündeki geçici rezervasyonlar ebediyen asılı kalır. **Çözüm:** BullMQ veya cron job ile periyodik temizlik.

3. **Telegram Auth Gmail Bypass:** `telegram.js` route'u `@telegram.local` sahte e-postalar oluşturur — bu Gmail kısıtlamasına tabi değildir. Bu bilinçli bir tasarım kararıdır (Telegram kullanıcılarının Gmail hesabı olmayabilir), ama farkında olunmalıdır.

4. **Admin Stats'ta PrismaClient Sızıntısı:** `index.js` satır 148'de her istatistik sorgusunda yeni `PrismaClient` oluşturulup `$disconnect()` yapılıyor. Yoğun trafik altında bağlantı havuzu şişebilir. **Çözüm:** Global Prisma instance kullanılması.

---

## 18. Üretim Ortamına Çıkarken Yapılması Gerekenler

| # | Görev | Öncelik |
|---|-------|---------|
| 1 | `REDIS_URL` ortam değişkenini ayarlayın | 🔴 Zorunlu |
| 2 | `JWT_SECRET`'ı güçlü rastgele string yapın | 🔴 Zorunlu |
| 3 | `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` alın | 🔴 Zorunlu |
| 4 | SMTP ayarlarını gerçek servise çevirin (Ethereal → SendGrid/Mailgun) | 🔴 Zorunlu |
| 5 | `ALLOWED_ORIGINS`'e gerçek domain'i ekleyin | 🔴 Zorunlu |
| 6 | PM2 `ecosystem.config.js` ile cluster modda başlatın | 🟡 Önemli |
| 7 | PostgreSQL bağlantı havuzunu yapılandırın (PgBouncer) | 🟡 Önemli |
| 8 | Nginx reverse proxy + SSL sertifikası kurun | 🟡 Önemli |
| 9 | In-memory cache'i Redis'e taşıyın | 🟢 İyileştirme |
| 10 | Queue'yu BullMQ'ya taşıyın | 🟢 İyileştirme |

---

## 19. Kurulum ve Çalıştırma

### Gereksinimler:
- Node.js 18+
- PostgreSQL 16
- Redis (opsiyonel, ama prod için zorunlu)

### Adımlar:

```bash
# 1. Repo'yu klonla
git clone <repo-url>
cd bilet-app

# 2. Backend bağımlılıkları
cd backend
npm install

# 3. .env dosyasını oluştur
cp ../.env.example ../.env
# .env dosyasını düzenleyin: DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID vb.

# 4. Veritabanını oluştur
npx prisma db push

# 5. Backend'i başlat
node index.js
# Sunucu Port 5000'de çalışır

# 6. Frontend bağımlılıkları
cd ../frontend
npm install

# 7. Frontend'i başlat
npm run dev
# Uygulama Port 3005'te çalışır
```

### Docker ile:
```bash
docker compose --profile production up -d
```

### PM2 ile (Üretim):
```bash
pm2 start ecosystem.config.js --env production
```

---

*Son güncelleme: 8 Temmuz 2026*

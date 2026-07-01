# 🎫 Bilet Uygulaması

> **Interaktif koltuk haritası, anlık rezervasyon, QR bilet ve ödeme takibiyle tam donanımlı etkinlik bilet yönetim sistemi.**

[![Node.js](https://img.shields.io/badge/Node.js-24.x%20LTS-green?logo=node.js)](https://nodejs.org/en/about/previous-releases)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/docs/app/getting-started/deploying)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-blue?logo=prisma)](https://prisma.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-white?logo=socket.io)](https://socket.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Production-336791?logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-Private-red)](#)

> ⚠️ **Mevcut Durumu:** 0.9-hardening (üretim hazırlığı aşaması) · [Kritik Değerlendirme](./ROADMAP.md#-kritik-değerlendirme-üretim-hazırlığı-ve-sertleştirme-2026-07-01)

---

## ✨ Özellikler

| Kategori | Özellikler |
|---|---|
| 🎭 **Etkinlik Yönetimi** | Koltuklu / genel girişli etkinlik oluşturma, hall tasarımcısı |
| 🎟️ **Rezervasyon** | Anlık koltuk rezervasyonu, çift-rezervasyon koruması |
| 💳 **Ödeme** | Ücretsiz, kredi kartı (simülasyon), IBAN/havale, Telegram onayı |
| 📧 **Bildirimler** | QR kodlu e-bilet e-postası, Telegram admin bildirimleri |
| 🔐 **Güvenlik** | JWT auth, Zod doğrulama, Rate Limiting, Helmet, Circuit Breaker |
| 📡 **Gerçek Zamanlı** | Socket.IO ile anlık koltuk doluluk güncellemesi |
| 🖨️ **Check-in** | QR kod okutma ile kapı giriş doğrulaması |
| 📊 **Admin Panel** | Dashboard, raporlama, iade yönetimi |

---

## 🚀 Hızlı Başlangıç (Yerel Geliştirme)

### Gereksinimler
- **Node.js** `>= 24 <25` (LTS) · [node.org/about/previous-releases](https://nodejs.org/en/about/previous-releases)
- **npm** `>= 10.x`
- **PostgreSQL** `>= 14` (üretim ortamı için gerekli)
  - Yerel geliştirme: Docker PostgreSQL önerilir (SQLite demo-only)
- **Redis** `>= 6` (queue, cache, session management için)

### 1. Projeyi Klonlayın
```bash
git clone <repo-url>
cd bilet-app
```

### 2. Ortam Değişkenlerini Ayarlayın
```bash
# Şablon dosyasını kopyalayın
cp .env.example .env

# .env dosyasını düzenleyin
notepad .env
```

**Gerekli ortam değişkenleri:**
```
JWT_SECRET=your-secret-key-min-32-chars
DATABASE_URL=postgresql://user:password@localhost:5432/bilet_app
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your-google-oauth-id
GOOGLE_CLIENT_SECRET=your-secret
NODE_ENV=development|production
```

### 3. Backend Kurulumu
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Frontend Kurulumu
```bash
cd frontend
npm install
```

### 5. Çalıştırın (2 terminal)

**Terminal 1 — Backend:**
```bash
cd backend
node index.js
# → http://localhost:5000 adresinde çalışır
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:3000 adresinde çalışır
```

---

## 🧪 Testler

```bash
# Zod validasyon & API testi
node backend/test-api.js

# Tam E2E senaryosu (Rezervasyon → Onay → Check-in)
node backend/test-e2e.js

# Auth middleware testi
node backend/test-auth.js

# DDoS / Rate Limiter yük testi (sunucu çalışırken)
node backend/test-load.js
```

### ✅ Son Test Sonuçları

| Test | Sonuç |
|---|---|
| API & Zod Validasyon | ✅ BAŞARILI |
| E2E (Rezervasyon → Onay → Check-in) | ✅ BAŞARILI |
| Auth Middleware | ✅ BAŞARILI |
| Yük Testi — Rate Limiter (1000 istek) | ✅ 900/1000 engellendi (429) |

---

## 🐳 Docker ile Çalıştırma (Önerilen: Tüm Ortamlar)

```bash
# Production .env dosyasını hazırlayın
cp .env.production.example .env

# Tüm servisleri başlatın (PostgreSQL + Redis + Backend + Frontend)
docker-compose up -d

# Logları izleyin
docker-compose logs -f backend

# İlk çalıştırmada migrations uygulanır
docker exec -it bilet_backend npx prisma migrate deploy
docker exec -it bilet_backend npx prisma generate
```

> **Önemli:** 
> - Yerel geliştirmede de PostgreSQL + Redis Docker'dan çalıştırmanız **şiddetle önerilir**
> - SQLite sadece hızlı prototype'lama için uygun (production hazırlığında PostgreSQL kullanın)
> - Multi-server deployment'da Redis adapter zorunlu (Socket.IO sticky session gerekli)

---

## 🏗️ Mimari

```
bilet-app/
├── backend/                  # Express.js API Sunucusu (Port 5000)
│   ├── routes/               # API endpoint'leri
│   │   ├── auth.js           # Google OAuth + JWT
│   │   ├── events.js         # Etkinlik CRUD
│   │   ├── halls.js          # Salon ve koltuk yönetimi
│   │   ├── reservations.js   # Rezervasyon & bilet
│   │   ├── payments.js       # Ödeme akışları
│   │   └── users.js          # Kullanıcı profil
│   ├── middlewares/
│   │   └── auth.js           # JWT doğrulama middleware
│   ├── utils/
│   │   ├── circuitBreaker.js # Circuit Breaker & Retry mekanizması
│   │   ├── cache.js          # Bellek içi önbellek
│   │   ├── encryption.js     # AES-256 şifreleme
│   │   └── logger.js         # Winston loglama
│   └── prisma/
│       └── schema.prisma     # Veritabanı şeması
│
├── frontend/                 # Next.js 15 Uygulaması (Port 3000)
│   └── src/app/              # App Router sayfaları
│
├── docker-compose.yml        # Production container yapılandırması
├── .env.example              # Ortam değişkeni şablonu
└── .env.production.example   # Production ortam şablonu
```

---

## 🔐 Güvenlik

| Katman | Uygulama |
|---|---|
| **Kimlik Doğrulama** | JWT (HS256, 1 saat TTL), Google OAuth 2.0 |
| **Yetkilendirme** | Role-based (ADMIN, ORGANIZER, CUSTOMER) |
| **Input Doğrulama** | Zod şemaları tüm POST/PATCH endpoint'lerinde |
| **Rate Limiting** | 100 istek/15dk (genel), 5 istek/15dk (ödeme) |
| **DDoS Koruması** | express-rate-limit |
| **HTTP Güvenlik** | Helmet.js (CSP, HSTS, XSS, X-Frame-Options) |
| **CORS** | Whitelist tabanlı (`ALLOWED_ORIGINS` env) |
| **Circuit Breaker** | SMTP ve Telegram servisleri için fail-fast (opossum) |
| **Şifreleme** | AES-GCM (AEAD) · hassas ödeme verileri için (OWASP Cheat Sheet) |
| **Audit Log** | Tüm kritik işlemler kaydedilir (kim/ne/IP/tarih) |
| **Idempotency** | Ödeme/onay istekleri için idempotency key sistemi |

---

## 📡 API Endpoint'leri

| Yöntem | Endpoint | Açıklama | Auth |
|---|---|---|---|
| POST | `/api/auth/google` | Google OAuth ile giriş | - |
| GET | `/api/events` | Etkinlik listesi | - |
| POST | `/api/events` | Etkinlik oluştur | ADMIN |
| GET | `/api/halls` | Salon listesi | - |
| POST | `/api/reservations` | Rezervasyon oluştur | - |
| POST | `/api/reservations/:id/approve` | Rezervasyon onayla | ADMIN |
| POST | `/api/reservations/:id/checkin` | Kapı check-in | ADMIN |
| POST | `/api/payments/:id/verify` | Ödeme doğrula | ADMIN |
| GET | `/api/admin/stats` | Dashboard istatistikleri | ADMIN |
| GET | `/api/admin/reports` | Finansal raporlar | ADMIN |
| GET | `/health` | Sunucu sağlık kontrolü | - |

---

## 🗺️ Yol Haritası

Tüm **18 geliştirme fazı** tamamlanmıştır. Detaylar için [ROADMAP.md](./ROADMAP.md) dosyasına bakın.

---

## 📄 Dökümanlar

| Dosya | İçerik |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Teknik mimari kararlar |
| [SECURITY.md](./SECURITY.md) | Güvenlik politikaları |
| [PRODUCT.md](./PRODUCT.md) | Ürün vizyonu ve hedefler |
| [ROADMAP.md](./ROADMAP.md) | Tamamlanan fazlar |
| [RISK_REGISTER.md](./RISK_REGISTER.md) | Aktif risk kaydı |

---

## 👤 Geliştirici Notları

- **Yerel test hesabı:** `LOCAL_TEST_TOKEN` ve `LOCAL_ADMIN_TOKEN` değerleriyle giriş yapılabilir (Google OAuth olmadan)
- **E-posta:** Geliştirme ortamında Ethereal SMTP kullanılır, gerçek e-posta gönderilmez
- **Veritabanı:** Yerel ortamda SQLite, production'da PostgreSQL önerilir

---

*Son güncelleme: 2026-07-01 · Versiyon: 0.9-hardening · Konumlandırma: Üretim Hazırlığı Aşaması*

---

## 📌 Kritik Notlar

### Ürün Hazırlığı
Bu uygulama **0.9-hardening** konumlandırmasındadır:
- ✅ Ürün fikri güçlü (etkinlik + QR + ödeme + admin panel)
- ✅ Mimari iskelet doğru (Express + Prisma + Next.js + Socket.IO)
- ⚠️ **Kritik:** Aynı koltuğa 1000 istek atıldığında 0 çifte satış **garantisi** şart
- ⚠️ **Kritik:** Ödeme-onay tutarlılığı (idempotency) zorunlu
- ⚠️ **Kritik:** QR güvenliği ve audit log üretim için şart

### Üretim Öncesi
Bunlar olmadan **para toplayan canlı sisteme çıkma:**
```
✓ PostgreSQL production konfigurasyonu
✓ Çifte rezervasyon testi = 0 hata (k6 load test)
✓ QR 2. okutma engelleme kontrolü
✓ Admin audit log aktif
✓ Rate limiter Redis tabanlı
✓ Backup/restore testi başarılı
✓ OWASP ZAP baseline scan
✓ Runbook (operasyon el kitabı) yazılmış
```

**Detaylı kontrol listesi:** [ROADMAP.md](./ROADMAP.md#-production-çıkış-kontrol-listesi) · **Test planı:** [ROADMAP.md](./ROADMAP.md#-test-planı-saldırı-gibi-test)

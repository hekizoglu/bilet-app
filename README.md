# 🎫 Bilet Uygulaması

> **Interaktif koltuk haritası, anlık rezervasyon, QR bilet ve ödeme takibiyle tam donanımlı etkinlik bilet yönetim sistemi.**

[![Node.js](https://img.shields.io/badge/Node.js-24.x-green?logo=node.js)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-blue?logo=prisma)](https://prisma.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-white?logo=socket.io)](https://socket.io)
[![License](https://img.shields.io/badge/License-Private-red)](#)

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
- Node.js `>= 20.x`
- npm `>= 9.x`

### 1. Projeyi Klonlayın
```bash
git clone <repo-url>
cd bilet-app
```

### 2. Ortam Değişkenlerini Ayarlayın
```bash
# Şablon dosyasını kopyalayın
cp .env.example .env

# .env dosyasını düzenleyin (en az JWT_SECRET ve DATABASE_URL dolu olmalı)
notepad .env
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

## 🐳 Docker ile Çalıştırma (Production)

```bash
# .env.production.example dosyasını kopyalayıp doldurun
cp .env.production.example .env

# Tüm servisleri başlatın (PostgreSQL + Backend + Frontend)
docker-compose up -d

# Logları izleyin
docker-compose logs -f backend
```

> **Not:** İlk çalıştırmada Prisma migration'larının uygulandığından emin olun:
> ```bash
> docker exec -it bilet_backend npx prisma migrate deploy
> ```

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
| **HTTP Güvenlik** | Helmet.js (CSP, HSTS, XSS koruması) |
| **CORS** | Whitelist tabanlı (`ALLOWED_ORIGINS` env) |
| **Circuit Breaker** | SMTP ve Telegram servisleri için fail-fast |
| **Şifreleme** | AES-256-CBC (hassas ödeme verileri için) |

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

*Son güncelleme: 2026-07-01 · Versiyon: 1.0.0-rc*

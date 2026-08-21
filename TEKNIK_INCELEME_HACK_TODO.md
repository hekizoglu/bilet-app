# 🎫 bilet-app — Teknik İnceleme & Hack-Todo Listesi

> **İnceleme tarihi:** 2026-08-21
> **Repo:** https://github.com/hekizoglu/bilet-app (110 commit, 215 dosya)
> **Kapsam:** Backend (Express + Prisma + Socket.io), Frontend (Next.js 16), CI/CD, Docker, legacy GAS, dokümantasyon
> **Yöntem:** Statik kod analizi + testlerin yerelde çalıştırılması (64/64 test) + frontend build + ESLint + TypeScript

---

## 0. Yönetici Özeti

**Değerlendirme: Olgun bir "tek kişilik ürün" kodu.** Mimari düşünülmüş (dağıtık kilit, circuit breaker, rate limit, queue, feature flag, Sentry, testler), dokümantasyon fazlasıyla zengin. Ancak:

- 🔴 **3 kritik güvenlik açığı** (P0) — en önemlisi **sahte banka webhook'u ile bedava bilet alınabilmesi**
- 🟠 **8 yüksek öncelikli sorun** (P1) — kırık endpoint'ler, CI'nin kırmızı olması, Docker deploy'un çalışmaması
- 🟡 **13 orta** (P2) + 🟢 iyileştirme önerileri (P3)

Testler **şema kurulduğunda 64/64 geçiyor** (kod mantığı sağlam), frontend build başarılı, TypeScript temiz. Asıl sorunlar: **güvenlik katmanındaki boşluklar, frontend-backend uyumsuzluğu, CI pipeline eksikliği ve deploy konfigürasyonu.**

---

## 1. Proje Profili

| Katman | Teknoloji | Not |
|---|---|---|
| Frontend | Next.js 16.2 (App Router), React 19, Tailwind 4, react-konva, PWA, Sentry | Port 3005, build ✅ |
| Backend | Express 5, Prisma 5 (SQLite şema — README'de "PostgreSQL 16" deniyor ⚠), Socket.io + Redis adapter | Port 5000 |
| Veri katmanı | SQLite (şema) / PostgreSQL (docker-compose) / **MySQL (ARCHITECTURE.md)** — **3 belge 3 farklı DB söylüyor** | ⚠️ Tutarsız |
| Altyapı | Redis (opsiyonel), PM2 cluster, Docker, GitHub Actions | Redis yoksa kilit simüle edilir |
| Eski sistem | Google Apps Script + Sheets (`legacy_gas/`, ~4800 satır) | `.clasp.json` ile deploy edilebilir |
| Test | Jest: 8 suite, 64 test (unit + integration) | Yerelde 64/64 ✅ (şema sonrası) |

Roller: `CUSTOMER`, `ORGANIZER`, `ADMIN` — Google OAuth (yalnız @gmail.com) + yerel test token'ları + Telegram Mini App auth.

---

## 2. 🔴 P0 — Kritik Güvenlik Açıkları (acil düzelt)

### P0-1. Sahte banka webhook'u ile bedava bilet ⚡ En kritik
**Yer:** `backend/routes/payments.js:184` — `POST /api/payments/bank-webhook`
**Sorun:** Endpoint'te **kimlik doğrulama yok** (`requireAuth` yok), **imza doğrulaması yok**, **gönderen kaynak kontrolü yok**. Sadece `description` alanında `PAYMENT-YYYY-MM-DD-XXXXXX` formatında bir referans varsa rezervasyonu **"Ödenmiş + Onaylı"** yapıyor. Referans kodu:
- Rezervasyon yapıldığında cevapta dönüyor,
- `GET /api/reservations/public/:id` (auth'suz, P0-2) ile de okunabiliyor.

Ayrıca webhook'ta **tutar kontrolü yok** — `amount` sadece `paymentDetails`'a yazılıyor, beklenen tutarla karşılaştırılmıyor. Eksik tutarla ödeme de otomatik onaylanır.

```js
// Şu an: herkes bu isteği atabilir → bilet anında Onaylı
POST /api/payments/bank-webhook
{ "description": "PAYMENT-2026-08-21-A1B2C3-D4E5F6 odeme", "amount": 0 }
```
**Çözüm:** (1) Webhook'a **HMAC imza doğrulaması** (bankanın verdiği secret ile) veya IP allowlist, (2) `amount >= beklenen tutar` kontrolü (paymentDetails'daki `finalPrice` ile karşılaştır), (3) yeniden deneme koruması mevcut (transactionId) — korunmalı, (4) webhook isteklerini ayrı, kimliksiz rate limiter'a bağla.
**Efor:** 4–6 saat

### P0-2. IDOR: Auth'suz rezervasyon + admin IBAN sızıntısı
**Yer:** `backend/routes/reservations.js` — `GET /api/reservations/public/:id`
**Sorun:** Kimlik doğrulaması olmadan, rezervasyon UUID'sini bilen herkes şunları alır:
- Müşteri **adı, e-posta adresi, telefon**
- `paymentReference`, koltuk adı
- **Admin'in IBAN'ı, Telegram kullanıcı adı ve e-posta adresi** (`adminPayment` objesi — şifreli değil)

UUID tahmin edilemez ancak `/payment/mobile?id=...` URL'sinde taşınıyor; link paylaşımı/çerez/analitik kayıtları yoluyla sızabilir. Ayrıca bu endpoint'in varlığı yüzünden P0-1 için gereken referans da sızdırılıyor.
**Çözüm:** Bu endpoint'i ya tamamen kaldır (frontend'i düzelt) ya da `ticketCode`/e-posta doğrulamalı bir "bilet sorgulama" akışına çevir. Admin IBAN'ı maskele, e-posta/telegram bilgilerini gösterme.
**Efor:** 2–4 saat

### P0-3. Kredi kartı + CVV backend'e düz metin gidiyor
**Yer:** `frontend/src/app/payment/mobile/page.tsx:147` → `backend/routes/payments.js:359` (`POST /api/payments/:reservationId/pay-creditcard`)
**Sorun:** Kart numarası, **CVV** ve son kullanma tarihi backend'e JSON ile gönderiliyor; backend sadece simülasyon yapıyor (son 4 hane saklıyor) ama **CVV'yi hiç saklamaması gerekir** (PCI-DSS: CVV işlenemez/saklanamaz). Production'da 403 dönüyor ama altyapı orada duruyor; gerçek bir sanal POS entegrasyonunda bile kart verisi müşteri tarayıcısından POS'a doğrudan gitmelidir (tokenization).
**Çözüm:** `iyzico`/`PayTR`/`Param` vb. Türk sanal POS entegrasyonu; kredi kartı verisi backend'e asla düşmesin. Simülasyon endpoint'ini tamamen kaldır.
**Efor:** 2–5 gün (POS entegrasyonu ile)

### P0-4. JWT & şifreleme fallback anahtarları kodda
**Yer:** `backend/index.js` (socket `join_admin`): `process.env.JWT_SECRET || 'supersecret_bilet_key'` — `backend/utils/encryption.js:6`: `'super-secret-key-for-encryption-which-is-long-enough'`
**Sorun:** `JWT_SECRET` ortam değişkeni boşsa herkes bilinen anahtarla **kendi ADMIN token'ını imzalayıp admin_room'a katılabilir** (canlı satış bildirimlerini dinler) ve tüm IBAN/Telegram şifrelemeleri tahmin edilebilir anahtarla yapılmış olur (`users.js`'deki decrypt'ler boşalır).
**Çözüm:** Start-up'ta zorunlu ortam değişkeni doğrulaması (boşsa process'i başlatma — `getJwtSecret()` bunu zaten yapıyor, aynı desen socket tarafına da uygulanmalı); encryption key'i `JWT_SECRET`'ten türetmek yerine ayrı `ENCRYPTION_KEY` env'i kullan.
**Efor:** 2 saat

### P0-5. `.env.staging` git'e commit edilmiş
**Yer:** Kök dizin `.env.staging` (git ls-files'da görünüyor)
**Sorun:** Staging DB bağlantı bilgisi, JWT secret, SMTP ve Telegram değerleri repoda. `.gitignore` deseni `.env.staging`'i yakalamıyor (sadece `.env.*.local` var) → gelecekte de sızabilir. Değerler placeholder gibi görünse de **gerçek olduğu varsayılarak rotasyon yapılmalı.**
**Çözüm:** `git rm --cached .env.staging`, `.gitignore`'a `.env.staging` ekle, staging secret'larını rotasyona tabi tut. `.clasp.json` (Apps Script ID) da repodan çıkarılmalı.
**Efor:** 30 dk

---

## 3. 🟠 P1 — Yüksek Öncelikli

### P1-1. Koltuk kilidi DoS (auth'suz `lock-seat`)
**Yer:** `backend/routes/reservations.js` — `POST /api/reservations/lock-seat`
**Sorun:** Auth yok; herkes her koltuğu **5 dakikalığına** kilitleyebilir (`seat_lock:*` Redis anahtarı). `checkoutLimiter` (100 istek/dk) var ama yeterli değil — uzun süreli/dağıtık saldırıda **tüm koltuklar kilitlenir, satış durur**. HTTP `unlock` eyleminde de sahiplik kontrolü yok (socket akışında var).
**Çözüm:** (1) Kilide **sahip token'ı** yaz ve sadece sahibi kilidi kaldırsın (socket akışındaki gibi), (2) kilit TTL'ini kısalt (2 dk) ve periyodik yenile (heartbeat), (3) anonim kullanıcı başına çok daha agresif rate limit (örn. 10/dk), (4) captcha/PoW opsiyonu.
**Efor:** 4 saat

### P1-2. `bulk-checkin` — etkinlik sahipliği kontrolü yok
**Yer:** `backend/routes/reservations.js` — `POST /api/reservations/bulk-checkin`
**Sorun:** Auth'lu herkes (CUSTOMER dahil), **herhangi bir etkinliğin** bilet kodlarını `isUsed=true` yapabilir. Kapıdaki scanner'ı işlemez hale getirmek (DoS) veya müşteriyi mağdur etmek mümkün. Diğer check-in endpoint'lerinde sahiplik kontrolü var — burada unutulmuş.
**Çözüm:** Her ticketCode için etkinlik sahipliği doğrula (bulk işlemi transaction'da, organizer/ADMIN kontrolüyle).
**Efor:** 2 saat

### P1-3. Sadakat puanı başkasının hesabından harcanabilir
**Yer:** `backend/routes/reservations.js` — checkout'ta `usePoints` bloğu
**Sorun:** Checkout auth'suz (misafir alışverişi) ve puan, JWT kimliğine değil **formdaki `email` alanına** göre düşülüyor. Başka birinin e-posta adresini yazıp `usePoints: true` gönderen saldırgan o kişinin puanlarını kendi biletine harcayabilir. Ayrıca puan kazanımı da formdaki email'e yazılıyor.
**Çözüm:** Puan harcama/kazanma yalnızca **JWT doğrulamalı** kullanıcı hesaplarında; misafir checkout'ta `usePoints` reddedilsin (`requireAuth`'lu ayrı akış veya `req.user.email === body.email` kontrolü).
**Efor:** 3 saat

### P1-4. Docker Compose ile deploy'da tüm API çağrıları kırık (`/api/api/`)
**Yer:** `docker-compose.yml` → `NEXT_PUBLIC_API_URL=http://localhost:5000/api` + tüm frontend dosyaları `${API_BASE}/api/...`
**Sorun:** Frontend kodları URL'ye `/api` suffix'i **elle ekliyor** (örn. `${API_BASE}/api/events/aggregator`). Env set edilirse istekler `http://.../api/api/events/...` olur → **%100 404**. Docker/üretim kurulumu bu haliyle çalışmaz. Ayrıca `NEXT_PUBLIC_SOCKET_URL` env'i kodlarda hiç kullanılmıyor (socket'ler `NEXT_PUBLIC_API_URL`'e bağlanıyor) ve `http://localhost:5000` tarayıcıdaki localhost'u işaret ettiğinden uzak sunucudan asla bağlanamaz.
**Çözüm:** Tek bir API base kuralı: kodlardan `/api` suffix'lerini kaldırıp base'e koy ya da env değerini `/api`siz yap. `NEXT_PUBLIC_SOCKET_URL`'i koda bağla (veya sil). E2E olarak docker-compose ile test et.
**Efor:** 3–4 saat

### P1-5. Frontend backend'de olmayan endpoint'ler çağırıyor (404)
| Frontend çağrısı | Backend durumu |
|---|---|
| `GET /api/users/me` (event sayfası: puan/e-posta otodoldurma) | ❌ Yok (`/profile` var) |
| `POST /api/users/switch-role` (dashboard layout: rol değiştirme) | ❌ Yok |
| `POST /api/notifications/:id/read` | ⚠️ PATCH olarak var — method uyuşmaz, 404 |

→ Profil sayfasında puan görünmüyor, rol değiştirme butonu çalışmıyor, bildirim tek okuma kırık.
**Efor:** 2–3 saat (endpoint'leri ekle veya frontend'i düzelt)

### P1-6. CI pipeline'ı kırmızı: integration testleri çalıştırılamıyor
**Yer:** `.github/workflows/ci.yml`
**Sorun:** Integration testleri `DATABASE_URL` ister; CI'da set edilmiyor ve **`prisma db push` çalıştırılmıyor** → `PrismaClientInitializationError` ile 15 test fail. Yerelde şema kurulup (`db push`) çalıştırınca **64/64 geçiyor** — yani kod sağlam, pipeline eksik. (Commit log'da "adjust Jest coverage thresholds to pass GitHub Actions CI unit test job" var — coverage eşiği %2'ye düşürülerek unit job geçirilmiş, integration göz ardı edilmiş.)
**Çözüm:** CI'a `DATABASE_URL="file:./prisma/ci.db"` env + `npx prisma db push --skip-generate` adımı ekle; coverage eşiklerini anlamlı değerlere çek (%60+); frontend lint job'ı ekle.
**Efor:** 2 saat

### P1-7. Status string kaosu → hatırlatma ve katılımcı listesi sessizce bozuk
**Sorun:** Aynı kavram 4 farklı yazımla:
- `'Onaylı'` (rezervasyonların çoğu) ✅
- `'Onayland'` — `events.js /attendees` (yanlış yazım → **her zaman boş liste**)
- `'Onaylandı'` — `reminderCron.js` (yanlış → hatırlatma hiç gönderilmez)
- `'Ödeme Bekleniyor'` — hiçbir yerde set edilmiyor, sadece temizlik sorgusunda aranıyor

Ayrıca `services/reminderCron.js` **hiçbir yerden import edilmiyor** → 24 saat/2 saat hatırlatma cron'u hiç çalışmıyor. `notificationService.sendEmail` ise MOCK (sadece `console.log`).
**Çözüm:** Status'leri enum sabitlerine taşı (`RESERVATION_STATUS = { APPROVED: 'Onaylı', ... }`), reminder cron'u index.js'e bağla (setInterval/cron), sendEmail'i gerçek nodemailer'e bağla.
**Efor:** 4 saat

### P1-8. Türkçe karakter mojibake (bozuk encoding) kod içinde
**Yer:** `events.js`, `reservations.js` ve bazı mesajlarda: `"Yetkisiz i�lem"`, `"Kullan�c�"`, `"Onayland"` vb.
**Sorun:** Dosyalar UTF-8 değil (CP1254/Latin-5 karışımı) kaydedilmiş → API yanıtlarındaki hata mesajları ve DB'ye yazılan bazı değerler bozuk görünüyor. `sed`/Windows editörleriyle düzeltilmiş olabilir.
**Çözüm:** Tüm backend dosyalarını UTF-8'e normalize et (`iconv -f CP1254 -t UTF-8`), editorconfig/`.gitattributes` ile UTF-8 zorla (`.gitattributes` var ama içeriği kontrol edilmeli).
**Efor:** 1–2 saat

---

## 4. 🟡 P2 — Orta Öncelik

| # | Bulgu | Yer | Öneri |
|---|---|---|---|
| P2-1 | **XSS koruması devre dışı** — `xss-clean` yorum satırına alınmış ("req.query read-only" nedeniyle); paketin kendisi bakımsız/deprecated | `backend/index.js:162` | React escape ettiği için acil değil; yine de girişleri zod ile sıkılaştır, `sanitize-html` kullan ya da kaldır; CSP'yi production'da açık tut |
| P2-2 | **In-memory cache PM2'de tutarsız** — her process kendi cache'i (README'de bilinen kısıtlama) | `backend/utils/cache.js` | Redis cache'e geç (örn. ioredis + TTL), ya da cache'i sadece read-only veriye indir |
| P2-3 | **In-memory queue iş kaybı** — process restart'ta kuyruktaki mail/telegram işleri kaybolur | `backend/utils/queue.js` | BullMQ (Redis) geçişi; en azından işler DB'ye persist edilsin |
| P2-4 | **Duplicate route'lar** — `events.js` içinde `approve`/`reject`/`suspend` iki kez tanımlı; Express ilkini kullanır, ikincisi ölü kod (ör. reject'te "reason zorunlu" davranışı yalnızca ikinci tanımda) | `backend/routes/events.js` | Tekilleştir, davranış farklarını birleştir |
| P2-5 | **Duplike check-in endpoint'leri** — `/checkin`, `/check-in`, `/bulk-checkin`, `/sync` aynı işi 4 farklı biçimde yapıyor | `reservations.js` | Tek bir servis fonksiyonuna indir |
| P2-6 | **Admin stats organizatöre açık** — `GET /api/admin/stats` ORGANIZER için de tüm sistemin etkinlik/salon/rezervasyon sayılarını döner | `backend/index.js` | ORGANIZER'a kendi verisiyle sınırla |
| P2-7 | **PRIVATE etkinlik güncellenirken slug üretilmiyor** — PUBLIC→PRIVATE geçişte `privateSlug` null kalır, davet linki çalışmaz | `backend/routes/events.js` (PUT) | PUT'ta da `visibility === 'PRIVATE' && !privateSlug` ise üret |
| P2-8 | **Hall koltuk sayısı hesaplamaları çelişiyor** — `getCalculatedSeatCount` `'seat'/'chair'` sayıyor; `extractSeatsFromLayout` `'chair'` + masa/bistro sayıyor; `'seat'` tipi varsa tutarsız | `halls.js` / `reservations.js` | Tek bir "layout metrik" modülü oluştur |
| P2-9 | **ESLint: 130 hata + 74 uyarı** (çoğu `no-explicit-any`); CI'da lint job'ı yok | `frontend/` | `any`'leri tiplendir; lint'i CI'a ekle |
| P2-10 | **Sentry tracesSampleRate 1.0** — her istek izleniyor (maliyet); `SENTRY_DSN` boşken de init yapılıyor | `backend/index.js` | 0.1–0.2'ye düşür; DSN yoksa init'i atla |
| P2-11 | **Global rate limit 100 istek/15 dk** tüm `/api`'de — agresif; gerçek kullanıcı koltuk yenilemede kilitlenebilir | `backend/index.js` | Kimlik bazlı limit + anonim IP için ayrı eşikler |
| P2-12 | **`redlock` beta sürüm** (5.0.0-beta.2) + Redis yokken kilit simüle ediliyor (prod'da Redis şart, dokümante edilmeli) | `reservations.js` | Kararlı sürüme geç; Redis zorunluluğunu start-up check'i ile garanti et |
| P2-13 | **`expiresAt` checkout'ta set edilmiyor** — "Ödeme Bekleniyor" bekleme süresi hiç tanımlanmıyor; 5 dk temizlik interval'i `createdAt`'e güveniyor (PM2'de her process ayrı interval çalıştırır — çifte temizlik) | `reservations.js` / `index.js` | Beklenen ödeme süresini checkout'ta belirle; interval'i tek process'e (leader lock) bağla |
| P2-14 | **Kök dizin `manifest.json` + `frontend/public/manifest.json`** — iki manifest, hangisi geçerli belirsiz; `public/sw.js` elle yazılmış ve next-pwa'nın üretimiyle çakışabilir | — | PWA manifest/SW üretimini tek kaynağa indir |
| P2-15 | **legacy GAS clickjacking riski** — `XFrameOptionsMode.ALLOWALL` tüm sayfalarda; AdminPanel şifresi GAS property'de saklanıyor olabilir (doğrulanmadı) | `legacy_gas/Code.js` | Eski sistemi kapatma planı (`ARCHIVE_ROADMAP.md` ile uyumlu); aktifse frame koruması ekle |
| P2-16 | **Telegram auth Gmail kısıtlamasını baypas ediyor** — `@telegram.local` sahte domain (README'de bilinçli deniyor) | `routes/telegram.js` | Bilinçli ama risk: spam hesaplar; Telegram ID doğrulaması yeterli — dokümante edilmiş haliyle kabul edilebilir |
| P2-17 | **`mask-iban` auth'lu ama admin IBAN'ı `admin-payment-info`'da auth'suz düz metin** — tutarsız güvenlik modeli | `users.js` | P0-2 ile birlikte ele al |

---

## 5. 🟢 P3 — İyileştirme / Teknik Borç

- **Token revokasyonu yok:** `tokenVersion` payload'da var ama doğrulanmıyor; şifre/rol değişiminde eski token'lar 12 saat geçerli kalır. (JWT blacklist veya tokenVersion kontrolü)
- **`password` alanı User modelinde** ama hiç kullanılmıyor — şemadan kaldır ya da şifreli giriş ekle.
- **`GET /api/admin/reports` ve `stats`** her istekte ağır toplama yapıyor (tüm rezervasyonlar belleğe) — sayfalama/agregasyon sorgusu (GROUP BY) kullan.
- **Express 5 geçişi yarım:** `xss-clean` uyumsuz, bazı yollar `req.query` değiştirmeye çalışmış — kod tabanını Express 5 kurallarına göre tarayın.
- **Checkout'ta `10mb` JSON limiti** — gerçekçi limit `100kb` bile fazla; DoS yüzeyini küçült.
- **Hata mesajları `details: error.message` ile sızdırıyor** — üretimde internal hata detaylarını gizle (Sentry'e gönder, client'a genel mesaj).
- **`mask-iban`, `validate-iban`** iyi uygulamalar — devamı: IBAN'a sahiplik doğrulaması (isim kontrolü) yok, sadece format.
- **`availability` cache 5 dk** — bilet alımından sonra `clearEventCache` çağrılıyor, iyi. Ama `lock-seat` kilitleri cache'e yansımıyor (Redis'ten okunuyor, iyi).
- **Socket `join_event` ve koltuk olayları** kimlik doğrulamasız — bilgi sızıntısı yok (sadece koltuk durumu), kabul edilebilir.
- **Test kapsamı:** Ödeme webhook'u, check-in yetkileri, lock-seat DoS senaryoları için test yok — P0 düzeltmeleriyle birlikte eklenmeli.
- **`.gitattributes`** UTF-8 zorunluluğu için güncellenmeli (P1-8 ile birlikte).

---

## 6. Ne İyi Yapılmış? (Korunmalı)

✅ **Çifte satış koruması:** Redlock (Redis) + `Serializable` transaction + DB tarafı doğrulama — katmanlı ve doğru.
✅ **Zod validasyonu** route'larda yaygın; `seatName` gibi kritik alanlar client'tan değil **DB'den doğrulanarak** atanıyor (güzel bir dokunuş).
✅ **Rate limiting** (auth, checkout, webhook, feedback, kupon, rapor) + Redis store.
✅ **Circuit breaker + retryWithBackoff + job queue** dış servis dayanıklılığı.
✅ **Atomic check-in** (`updateMany` + `isUsed:false` koşulu) — çifte check-in yarışını engelliyor.
✅ **Kupon concurrency koruması** (`updateMany` + `usedCount < maxUses`).
✅ **Testler mantıksal olarak sağlam** — 64/64 geçiyor (pipeline sorunu hariç).
✅ **Docker non-root kullanıcı**, HEALTHCHECK, multi-stage build.
✅ **Bilinçli dokümantasyon** — README'de bilinen kısıtlamalar bile listelenmiş (nadir ve değerli).
✅ **KVKK bilinci:** gizlilik politikası sayfası, cookie consent, feedback IP kaydı.
✅ Sentry, morgan, p95/error-rate metrikleri + finansal tutarsızlık alarmı.

---

## 7. Öncelikli Yol Haritası (Hack-Todo Özeti)

| Öncelik | Sprint önerisi | Maddeler |
|---|---|---|
| 🔴 **Sprint 1 — Güvenlik** (2–3 gün) | Hemen | P0-1 webhook imza+tutar, P0-2 IDOR kapat, P0-3 kart verisi backend'den çıkar, P0-4 secret zorunluluğu, P0-5 env temizliği |
| 🟠 **Sprint 2 — Bütünlük** (2–3 gün) | Hemen ardından | P1-1 lock DoS, P1-2 bulk-checkin yetkisi, P1-3 puan JWT'si, P1-4 docker API base, P1-5 eksik endpoint'ler, P1-6 CI düzelt |
| 🟡 **Sprint 3 — Kalite** (3–5 gün) | 1–2 hafta | P1-7 status enum'ları + cron, P1-8 UTF-8, P2 listesi |
| 🟢 **Sürekli** | Backlog | P3 teknik borç, test kapsamı artırma |

**Düzeltme sonrası yeniden test:** `cd backend && npx prisma db push && npm test` → 64/64 hedef; frontend `npx next build` + `npx eslint src` → 0 hata hedefi.

---

## 8. Doğrulama Notları (Bu Rapordaki İddiaların Testi)

| İddia | Doğrulama |
|---|---|
| Testler 64/64 geçiyor | `prisma db push` sonrası `npx jest` → ✅ 8 suite, 64 test PASS |
| CI kırık | `.github/workflows/ci.yml`'de `DATABASE_URL` yok, `db push` yok → yerelde aynı koşulda 15 test FAIL |
| Frontend build | `npx next build` → ✅ 27 rota, hata yok |
| TypeScript | `npx tsc --noEmit` → ✅ 0 hata |
| ESLint | ❌ 130 hata, 74 uyarı (çoğunlukla `no-explicit-any`) |
| `.env.staging` repoda | `git ls-files` → ✅ takip ediliyor |
| `bank-webhook` auth'suz | `routes/payments.js:184` → ✅ `requireAuth` yok |
| `/api/users/me` yok | `grep` → ✅ backend'de tanımsız |
| reminderCron çalışmıyor | `grep reminderCron` → ✅ hiçbir yerden import edilmiyor |

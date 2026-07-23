# 🔒 Modüler Denetim: P0 Kimlik Doğrulama ve Güvenlik (Auth & Security Audit 2026-07-23)

Bu doküman, Bilet Uygulaması'nın kimlik doğrulama (Authentication), yetkilendirme (Authorization/RBAC), JWT token güvenliği, rate-limiting ve OAuth2 akışlarının sıfır halüsinasyon ilkesiyle denetlenmesi amacıyla hazırlanmıştır.

---

### ═══ FAZ 1: JWT & Token Güvenlik Denetimi ═══
- [x] **1.1. JWT Secret Sertleştirme:** Production ortamında `JWT_SECRET` zorunluluğunun kontrol edilmesi ve fallback anahtar kullanımının prod'da engellenmesi.
- [x] **1.2. Token Son Kullanma (Expiration) & Refresh:** JWT token ömürlerinin (1d/7d) standartlaştırılması ve geçersiz kılınan token'ların güvenli şekilde reddedilmesi.
- [x] **1.3. Rol Tabanlı Erişim Kontrolü (RBAC):** `ADMIN`, `ORGANIZER`, `CUSTOMER` rollerinin endpoint bazlı yetki matrisine tam uyumunun kontrol edilmesi.

---

### ═══ FAZ 2: Rate Limiting & Brute-Force Koruması ═══
- [x] **2.1. Auth Endpoint Rate Limiters:** `POST /api/auth/google`, `POST /api/telegram/auth` gibi kritik kimlik doğrulama rotalarında IP bazlı rate limiters (`authLimiter: max 5/15dk`) kontrolü.
- [x] **2.2. Mock Token Güvenliği:** `LOCAL_TEST_TOKEN` ve `LOCAL_ADMIN_TOKEN` gibi test token'larının strictly `NODE_ENV !== 'production'` şartına bağlanması.

---

### ═══ FAZ 3: Google & Telegram OAuth Akışları ═══
- [x] **3.1. Google ID Token Verification:** `google-auth-library` ile ID token doğrulaması, audience kontrolü ve token cache güvenliğinin teyidi.
- [x] **3.2. Telegram Auth Signature Check:** Telegram WebApp / Bot auth verilerinin HMAC-SHA256 imzası ile tam doğrulama kontrolü.

---

### ═══ FAZ 4: Otomatik Test ve Güvenlik Doğrulaması ═══
- [x] **4.1. Integration Test Koşumu:** `__tests__/integration/auth.test.js` test paketinin koşturularak 49/49 testin yeşil geçtiğinin doğrulanması.
- [x] **4.2. Build & Tip Güvenliği:** Frontend `npm run build` ile kimlik doğrulama sayfalarının (login, profile, telegram) tam derleme kontrolü.

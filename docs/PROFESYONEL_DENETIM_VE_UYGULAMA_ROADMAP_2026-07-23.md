# APP BİLET — PROFESYONEL KOD DENETİMİ VE UYGULAMA ROADMAP’İ

> **Belge tipi:** Kod tabanlı teknik denetim + ürün mimarisi + güvenlik + sunucuya çıkış + uygulanabilir görev planı  
> **Repo:** `hekizoglu/bilet-app`  
> **İncelenen dal:** `main`  
> **Denetim tarihi:** 23 Temmuz 2026  
> **Ürün kararı:** Her kayıtlı kullanıcı kendi etkinliğinin sahibidir. Etkin kapasitesi 50 ve altındaki etkinlikler doğrudan yayınlanabilir; 51 ve üzerindeki etkinlikler yönetici onayı olmadan yayınlanamaz.  
> **Üretim kararı:** **BLOKE — mevcut kod doğrudan internete açık üretim ortamına çıkarılmamalıdır.**

---

# 0. BELGENİN KULLANIM KURALI

Bu dosya yalnızca fikir listesi değildir. AI veya geliştirici görevleri bu dosya üzerinden işleyecek ve her görevin durumunu aynı dosyada güncelleyecektir.

## 0.1 Durum değerleri

| Durum | Anlamı |
|---|---|
| `BEKLEMEDE` | Henüz başlanmadı |
| `İŞLEME ALINDI` | Kodlama aktif olarak başladı |
| `İNCELEMEDE` | Kod tamamlandı; test, PR veya inceleme bekliyor |
| `BLOKE` | Dış karar, secret, sağlayıcı, veri veya teknik engel var |
| `TAMAMLANDI` | Kod, test, kabul kriteri ve kanıt birlikte tamamlandı |
| `İPTAL` | Bilinçli olarak kapsam dışına çıkarıldı; gerekçe zorunlu |

## 0.2 AI görev güncelleme protokolü

AI bir görevi ele aldığında aşağıdaki kuralları uygulamak zorundadır:

1. Görev başlığındaki `Durum` alanını önce `İŞLEME ALINDI` yapar.
2. `Başlama tarihi`, `çalışılan branch` ve varsa `PR` alanını doldurur.
3. Görevle ilgisiz dosyalara dokunmaz.
4. Kod değişikliğini tamamladıktan sonra görevde yazan testleri çalıştırır.
5. Bütün kabul kriterleri sağlanmıyorsa görev `TAMAMLANDI` yapılamaz.
6. Test geçse bile güvenlik veya veri migrasyonu kanıtı eksikse durum `İNCELEMEDE` kalır.
7. Tamamlandığında aşağıdaki kanıtlar eklenir:
   - Commit SHA
   - PR numarası veya bağlantısı
   - Çalıştırılan test komutları
   - Test sonucu
   - Migration adı
   - Ekran görüntüsü veya log gerekiyorsa konumu
8. Bir görev başka göreve bağlıysa bağımlılık tamamlanmadan başlanmaz; zorunluysa `BLOKE` olarak işaretlenir.
9. Bir görev kısmen yapıldıysa `TAMAMLANDI` yazılmaz; kalan bölüm alt görev olarak açık bırakılır.
10. Her PR yalnızca mantıksal olarak ilişkili küçük bir görev grubunu içermelidir.

## 0.3 Zorunlu görev kayıt şablonu

Her görev tamamlanırken aşağıdaki alanlar korunacaktır:

```text
Durum:
Başlama tarihi:
Tamamlanma tarihi:
Branch:
Commit:
PR:
Test komutları:
Test sonucu:
Migration:
Kanıt / not:
```

---

# 1. YÖNETİCİ ÖZETİ

## 1.1 Net sonuç

Kod tabanında güçlü bir prototip vardır: etkinlik CRUD, salon tasarım aracı, rezervasyon, QR, Google giriş, Redis entegrasyon denemeleri, rate limit, Docker ve CI başlangıcı mevcuttur. Ancak ürün vizyonu ile gerçek kod arasında ciddi fark vardır.

Bugünkü kodun en temel problemi şudur:

- Dokümantasyon “her kullanıcı kendi etkinliğinin organizatörüdür” diyor.
- Kod hâlâ global `CUSTOMER / ORGANIZER / ADMIN` rol modelini kullanıyor.
- Google girişinde üretilen JWT içinde kullanıcı `id` değeri yok.
- Buna rağmen etkinlik, kupon ve sahiplik sorgularında `req.user.id` kullanılıyor.
- Salonlarda sahiplik alanı yok.
- Organizatör rezervasyon ve rapor sorguları etkinlik sahibine göre filtrelenmiyor.

Sonuç: self-servis ürün modeli henüz uygulanmış değildir ve çok kiracılı veri izolasyonu güvenli değildir.

## 1.2 Tahmini hazırlık puanı

Bu puanlar otomatik test sonucu değil, kod incelemesine dayalı risk göstergesidir.

| Alan | Puan / 100 | Karar |
|---|---:|---|
| Ürün vizyonu | 80 | Hedef net |
| Frontend prototipi | 55 | Kullanılabilir fakat tutarsız |
| Backend iş mantığı | 35 | Temel akış var, durum makineleri zayıf |
| Veri izolasyonu | 10 | Üretimi engelleyen açıklar var |
| Ödeme güvenliği | 5 | Gerçek ödeme için kullanılamaz |
| Veritabanı / eşzamanlılık | 25 | SQLite/PostgreSQL çelişkisi var |
| Test kalitesi | 30 | Testler var fakat kritik senaryolar eksik |
| Sunucu / operasyon | 20 | Compose var, üretim topolojisi tamam değil |
| Genel üretim hazırlığı | **25** | **BLOKE** |

## 1.3 Durdurulması gereken yaklaşım

P0 görevleri bitmeden aşağıdaki yeni özelliklere zaman harcanmamalıdır:

- Yeni görsel süslemeler
- Yeni ödeme yöntemi
- Yeni sadakat özelliği
- Yeni kupon özelliği
- Yeni Telegram özelliği
- Dinamik fiyatlandırma geliştirmesi
- Yeni rapor ekranları

Önce veri sahipliği, kimlik, PostgreSQL, rezervasyon bütünlüğü ve üretim güvenliği düzeltilmelidir. Aksi hâlde özellik sayısı artar ama ürün güvenilir hâle gelmez.

---

# 2. UYGULAMANIN DOĞRU ÜRÜN TANIMI

App Bilet iki ürünü aynı anda yapmaya çalışmamalıdır. İlk sürümün hedefi aşağıdaki şekilde sınırlandırılmalıdır:

## 2.1 Beta ürün

- Kullanıcı Google veya desteklenen başka bir kimlik sağlayıcıyla üye olur.
- Her kullanıcı etkinlik oluşturabilir.
- Etkinlik sahibi yalnızca kendi etkinlik alanını yönetir.
- Doğum günü, nişan, toplantı, piknik, mezuniyet ve benzeri küçük organizasyonlar oluşturulabilir.
- 50 kişi ve altı etkinlikler yönetici onayı olmadan yayınlanabilir.
- 51 kişi ve üzeri etkinlikler `PENDING_APPROVAL` olur.
- Özel davet bağlantısı, RSVP ve QR giriş çalışır.
- İlk beta sürümünde ücretsiz etkinlik önceliklidir.

## 2.2 Büyük etkinlik ürünü

Aşağıdakiler beta güvenilir hâle geldikten sonra açılmalıdır:

- Ücretli bilet
- Gerçek ödeme sağlayıcısı
- Organizatör doğrulaması
- Komisyon ve hakediş
- İade ve finansal mutabakat
- Büyük konser ve profesyonel organizasyon akışı

## 2.3 Yetki modeli

Platform rolü:

```text
USER
ADMIN
```

Etkinlik içi yetki:

```text
OWNER
MANAGER
CHECKIN_STAFF
VIEWER
```

`ORGANIZER` global rolü kaldırılmalıdır. Kullanıcının organizatör olup olmadığı, etkinliğin `ownerId` alanı ve `EventMember` kayıtları üzerinden belirlenmelidir.

---

# 3. TESPİT EDİLEN KRİTİK BULGULAR

## 3.1 P0 — Üretimi doğrudan engelleyen bulgular

1. `LOCAL_ADMIN_TOKEN`, `LOCAL_ORGANIZER_TOKEN` ve benzeri test tokenları production kontrolü olmadan kabul ediliyor.
2. Giriş sayfasında test kullanıcı, organizatör ve admin butonları her ortamda gösteriliyor.
3. Google JWT içinde kullanıcı ID yok; kodun birçok yerinde `req.user.id` kullanılıyor.
4. Organizatörün başka organizatörün etkinlik, salon, rezervasyon ve raporlarına erişmesini engelleyen merkezi sahiplik katmanı yok.
5. Salon modelinde `ownerId` bulunmuyor.
6. SMTP kullanıcı adı ve parolası kaynak kod içinde birden fazla dosyada açıkça bulunuyor.
7. Banka webhook endpointi imza doğrulaması yapmıyor.
8. Banka webhook referans regex’i ile rezervasyonun ürettiği referans formatı uyuşmuyor.
9. Kredi kartı endpointi gerçek sağlayıcı olmadan ham kart numarası ve CVV alıp rezervasyonu “ödendi” yapıyor.
10. Prisma şeması SQLite kullanırken README ve Docker Compose PostgreSQL kullandığını söylüyor.
11. Public rezervasyon endpointi müşteri e-postası, ödeme referansı ve ödeme bilgilerini kimlik doğrulaması olmadan döndürüyor.
12. Kullanıcı profil endpointi hassas alanları gereğinden fazla döndürüyor; Telegram bot tokenı dâhil istemciye açılabiliyor.
13. Rezervasyon oluşturma endpointi kimlik doğrulaması olmadan e-posta üzerinden başka kullanıcının sadakat puanını harcayabiliyor.
14. Organizatör rezervasyon onayı, iptali ve check-in işlemlerinde etkinlik sahipliği kontrol edilmiyor.
15. Token JavaScript tarafından okunabilen cookie içinde tutuluyor; `HttpOnly` değil.
16. `/api/debug-sentry` production ortamında açık kalabiliyor ve kasıtlı hata üretiyor.

## 3.2 P1 — Yüksek riskli mantık ve veri hataları

1. `Ödeme Bekleniyor` soft-hold rezervasyonları availability hesabında her yerde dolu kabul edilmiyor.
2. Waitlist rezervasyonu oluşturulurken beklenen özel durum açıkça yazılmadığı için varsayılan durum kullanılabiliyor.
3. Bekleme listesi seçimi ve durum güncellemesi atomik değil.
4. Koltuk kilidi HTTP endpointinde herhangi biri başka kullanıcının kilidini silebiliyor.
5. Redis yokken koltuk kilitleme endpointi gerçekte kilitlemeden başarı döndürüyor.
6. Veritabanında etkinlik-koltuk için kesin benzersiz aktif rezervasyon garantisi yok.
7. Kupon kullanım sayısı ödeme tamamlanmadan artırılıyor ve iptal durumunda geri alınmıyor.
8. Sadakat puanı ödeme tamamlanmadan düşülebiliyor ve başarısız işlemde doğru şekilde geri yüklenmiyor.
9. Rezervasyon iptalinde kazanılmamış puan tekrar düşülebiliyor.
10. Onay endpointinde `amountReceived` zorunlu değil.
11. Webhook gelen tutarı beklenen nihai tutarla karşılaştırmıyor.
12. Webhook mevcut `paymentDetails` içeriğini ezerek kupon ve puan geçmişini kaybedebiliyor.
13. Manuel doğrulama, webhook ve kart akışları sadakat puanını tutarlı biçimde işlemiyor.
14. Check-in “oku sonra güncelle” şeklinde; eşzamanlı iki cihaz teorik olarak aynı bileti kabul edebilir.
15. Partial refund bileti tamamen iptal ediyor ve koltuğu serbest bırakıyor.
16. İade tutarı gerçek ödenen tutar yerine etkinlik liste fiyatıyla karşılaştırılabiliyor.
17. Bilet devri alıcı doğrulaması, kabulü, yeni QR üretimi ve audit kaydı olmadan yapılıyor.
18. In-memory cache ve queue PM2 cluster’da processler arasında tutarlı değil.
19. Her PM2 worker aynı periyodik temizleme işini çalıştırıyor.
20. Ortak Prisma istemcisi bazı request akışlarında `$disconnect()` ediliyor.

## 3.3 Fazla, erken veya beta için gereksiz kapsam

Aşağıdaki özellikler kötü değildir; ancak çekirdek güvenilirlik tamamlanmadan ürünü gereksiz büyütmektedir:

| Özellik | Karar | Gerekçe |
|---|---|---|
| Simüle kredi kartı | KALDIR / PROD’DA KAPAT | Güvenlik ve yanlış güven algısı |
| Dinamik fiyatlandırma | ERTELE | Büyük etkinlik ürününe ait |
| Sadakat puanı | ERTELE | Finansal durum makinesi oturmadan riskli |
| Kupon | ERTELE veya sadeleştir | Ödeme ve tenant modeli tamam değil |
| Telegram Mini App | ERTELE | İkinci kimlik sistemi yaratıyor |
| Merkezi etkinlik aggregator | ERTELE | Önce self-servis özel etkinlik çekirdeği |
| Bilet devri | ERTELE | Sahtekârlık ve kimlik akışı gerektiriyor |
| Self-servis gerçek iade | ERTELE | Ödeme sağlayıcısı olmadan gerçek iade değil |
| PWA gelişmiş akışları | P2 | Çekirdek web akışı önce sağlamlaşmalı |
| PM2 cluster + Docker birlikte | SADELEŞTİR | Tek sunucuda gereksiz çift process yönetimi |

---

# 4. HEDEF TEKNİK MİMARİ

## 4.1 İlk üretim topolojisi

Tek sunucu üzerinde başlangıç için önerilen yapı:

```text
Internet
  |
Reverse Proxy / TLS
  |-- Frontend (Next.js)
  |-- API (Express)
       |-- PostgreSQL
       |-- Redis
       |-- Worker (BullMQ)
       |-- Object Storage veya uyumlu dosya servisi
       |-- E-posta sağlayıcısı
```

Kurallar:

- PostgreSQL ve Redis internete port açmamalıdır.
- API ile worker ayrı process/container olmalıdır.
- İlk sürümde tek API replica kullanılabilir.
- Yatay ölçekleme açılmadan önce DB benzersiz kısıtları, Redis ve idempotency tamamlanmalıdır.
- Container içinde PM2 cluster kullanılmamalıdır; ölçekleme container sayısı üzerinden yapılmalıdır.
- Migration ayrı release adımı olarak çalışmalıdır.

## 4.2 Modüler monolit alanları

```text
src/modules/auth
src/modules/users
src/modules/events
src/modules/venues
src/modules/invitations
src/modules/rsvp
src/modules/reservations
src/modules/tickets
src/modules/checkin
src/modules/payments
src/modules/notifications
src/modules/moderation
src/modules/audit
```

Mikroservise geçmek şu aşamada gereksizdir. Önce iyi sınırları olan modüler monolit kurulmalıdır.

---

# 5. ROADMAP DURUM PANOSU

| Faz | Ad | Öncelik | Başlangıç durumu |
|---:|---|---|---|
| 0 | Acil güvenlik ve secret temizliği | P0 | BEKLEMEDE |
| 1 | Kimlik, oturum ve veri sahipliği | P0 | BEKLEMEDE |
| 2 | PostgreSQL ve üretim veri modeli | P0 | BEKLEMEDE |
| 3 | 50 kişi onay kuralı ve etkinlik yaşam döngüsü | P0 | BEKLEMEDE |
| 4 | Rezervasyon, koltuk ve waitlist bütünlüğü | P0 | BEKLEMEDE |
| 5 | Ödeme stratejisi ve finansal güvenlik | P0/P2 | BEKLEMEDE |
| 6 | Davet, RSVP ve katılımcı yönetimi | P0 | BEKLEMEDE |
| 7 | Salon tasarım aracının sağlamlaştırılması | P1 | BEKLEMEDE |
| 8 | QR check-in ve görevli yetkilendirmesi | P1 | BEKLEMEDE |
| 9 | Kalıcı kuyruk ve bildirim sistemi | P1 | BEKLEMEDE |
| 10 | Frontend sözleşme ve kullanıcı deneyimi düzeltmeleri | P0/P1 | BEKLEMEDE |
| 11 | Docker, sunucu ve dağıtım | P0 | BEKLEMEDE |
| 12 | Test, CI ve güvenlik kapıları | P0 | BEKLEMEDE |
| 13 | Log, metrik, alarm ve operasyon | P1 | BEKLEMEDE |
| 14 | Gizlilik, denetim ve kötüye kullanım | P1 | BEKLEMEDE |
| 15 | Beta yayın ve kontrollü büyüme | P0 | BEKLEMEDE |
| 16 | Beta sonrası özellikler | P2 | BEKLEMEDE |

---

# FAZ 0 — ACİL GÜVENLİK VE SECRET TEMİZLİĞİ

## TASK P0-001 — Kaynak koda gömülü SMTP secretlarını kaldır ve yenile

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Risk:** Kritik
- **Hedef dosyalar:** `backend/routes/reservations.js`, `backend/routes/payments.js`, yeni `backend/services/mailService.js`, `.env.example`

### Nasıl yapılacak

1. Kaynak koddaki bütün SMTP kullanıcı adı ve parola bloklarını kaldır.
2. Kullanılan test hesabının parolasını geçersiz kıl veya hesabı kapat.
3. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` env değişkenlerini zorunlu hâle getir.
4. Tek bir `mailService` oluştur; route dosyalarının doğrudan `nodemailer.createTransport()` çağırmasını engelle.
5. Uygulama başlarken production ortamında eksik SMTP ayarı varsa bildirim workerını hazır olmayan duruma al.
6. Git geçmişinde secret izi olup olmadığını secret scanner ile kontrol et.
7. Mail şablonlarında kullanıcı girdilerini HTML escape et.

### Testler

- Secret taramasında açık parola bulunmamalı.
- Mail service unit testi geçmeli.
- SMTP kapalıyken rezervasyon kaydı başarısız olmamalı; bildirim işi retry/DLQ’ya düşmeli.

### Tamamlanma kriteri

Kaynak kodda SMTP parolası yoktur ve bütün e-postalar tek servis üzerinden gönderilir.

### Görev kaydı

```text
Başlama tarihi:
Tamamlanma tarihi:
Branch:
Commit:
PR:
Test komutları:
Test sonucu:
Kanıt / not:
```

## TASK P0-002 — LOCAL test tokenlarını production’da kesin olarak kapat

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef dosyalar:** `backend/routes/auth.js`, `frontend/src/app/login/page.tsx`

### Nasıl yapılacak

1. `LOCAL_*` token dalını yalnızca `NODE_ENV === 'development' && ENABLE_LOCAL_AUTH === 'true'` koşulunda çalıştır.
2. Production build içinde test giriş butonlarını render etme.
3. Production’da `LOCAL_ADMIN_TOKEN` gönderildiğinde mutlaka `401` dön.
4. CI içinde production auth negatif testi ekle.
5. Test token adlarını loglama ve response içinde gösterme.

### Tamamlanma kriteri

Production konfigürasyonunda bilinen hiçbir sabit token kullanıcı veya admin oturumu oluşturamaz.

## TASK P0-003 — Varsayılan JWT secretlarını ve debug endpointini kaldır

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef dosyalar:** `backend/index.js`, `backend/middlewares/auth.js`, `backend/routes/auth.js`, `backend/routes/telegram.js`, yeni `backend/config/env.js`

### Nasıl yapılacak

1. `super-secret-key`, `supersecret_bilet_key` ve benzeri fallback değerleri kaldır.
2. Zod veya benzeri doğrulamayla env şeması oluştur.
3. Production’da `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `API_URL` eksikse process başlamadan hata ver.
4. `/api/debug-sentry` endpointini kaldır veya yalnızca açıkça etkinleştirilmiş development ortamına taşı.
5. JWT secret uzunluğu ve entropy kontrolü ekle.

### Tamamlanma kriteri

Uygulama eksik veya varsayılan secret ile production modunda başlatılamaz.

## TASK P0-004 — Sahte kredi kartı ve imzasız banka webhook akışlarını kapat

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef dosyalar:** `backend/routes/payments.js`, `frontend/src/app/payment/mobile/page.tsx`

### Nasıl yapılacak

1. `pay-creditcard` endpointini production’da `404` veya kontrollü `501` döndürecek şekilde kapat.
2. Frontend’de kart numarası/CVV formunu production buildinden çıkar.
3. `/bank-webhook` gerçek sağlayıcı seçilene kadar kapalı feature flag arkasına al.
4. Webhook açılacağı zaman sağlayıcı imzası, timestamp toleransı, replay koruması ve event ID idempotency zorunlu olsun.
5. Ham kart verisinin log, Sentry veya DB’ye düşmediğini test et.

### Tamamlanma kriteri

App Bilet sunucusu hiçbir production akışında kart numarası veya CVV kabul etmez; imzasız webhook ödeme onaylayamaz.

## TASK P0-005 — Public rezervasyon ve ödeme verisi sızıntısını durdur

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef dosyalar:** `backend/routes/reservations.js`, `backend/routes/users.js`, ödeme frontend’i

### Nasıl yapılacak

1. `/reservations/public/:id` endpointini kaldır veya rezervasyona özel kısa ömürlü signed access token zorunlu yap.
2. Public response’tan müşteri e-postası, tam IBAN, Telegram bilgisi, ödeme referansı ve iç durum alanlarını kaldır.
3. `/payment-status` için rezervasyon sahibi oturumu veya signed checkout session doğrula.
4. Admin ödeme bilgisini etkinlik organizatörüne göre getir; platform admininin hesabını global ödeme hesabı gibi kullanma.
5. IBAN yalnız ödeme ekranında, yetkili checkout session’a ve maskelenmiş biçimde gösterilsin; kopyalama için kontrollü ayrı alan kullanılabilir.

### Tamamlanma kriteri

Rastgele rezervasyon UUID’sini bilen kişi kişisel veya finansal bilgi okuyamaz.

## TASK P0-006 — Production yayın kilidi ekle

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

1. CI’ye `production-readiness` job’ı ekle.
2. P0 görevleri tamamlanmadan production deploy workflow’u çalışmasın.
3. `ALLOW_PAID_EVENTS=false`, `ENABLE_TELEGRAM_AUTH=false`, `ENABLE_PUBLIC_AGGREGATOR=false` varsayılanları kullan.
4. Feature flag listesi dokümante edilsin.

### Tamamlanma kriteri

Yanlışlıkla `main` push edilmesi kritik deneysel özellikleri internete açamaz.

---

# FAZ 1 — KİMLİK, OTURUM VE VERİ SAHİPLİĞİ

## TASK AUTH-001 — Tek JWT/token servisi oluştur

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef:** `backend/services/tokenService.js`

### Nasıl yapılacak

JWT claimleri tek noktadan üretilmelidir:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "platformRole": "USER",
  "tokenVersion": 1,
  "iss": "app-bilet-api",
  "aud": "app-bilet-web",
  "jti": "random-uuid"
}
```

- Google ve Telegram dâhil bütün auth yolları aynı servisi kullanmalı.
- `sub` zorunlu olmalı.
- Issuer ve audience doğrulanmalı.
- Token süresi kısa tutulmalı; gerekiyorsa refresh session ayrı tasarlanmalı.
- Kullanıcı rolü yalnız tokena güvenilmeden kritik işlemlerde DB’den doğrulanmalı.

### Testler

Eksik `sub`, yanlış `aud`, yanlış `iss`, eski `tokenVersion` ve süresi dolmuş token reddedilmelidir.

## TASK AUTH-002 — HttpOnly güvenli oturum cookie’sine geç

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef dosyalar:** auth route, frontend middleware/BFF, login/logout

### Nasıl yapılacak

1. Tokenı frontend JavaScript ile `document.cookie` içine yazma.
2. Backend veya Next server route üzerinden `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, sınırlı `Path` ile cookie üret.
3. Logout’ta server taraflı cookie silme ve gerekiyorsa session revoke yap.
4. CSRF modeli belirle; state-changing cookie auth isteklerinde Origin kontrolü ve CSRF token kullan.
5. Frontend’in JWT payload decode ederek yetki belirlemesini yalnız görsel optimizasyon olarak kullan; gerçek karar backend’e ait olsun.

### Tamamlanma kriteri

Tarayıcı JavaScript’i oturum tokenını okuyamaz.

## TASK AUTH-003 — Global ORGANIZER rolünü kaldır

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef dosyalar:** Prisma şeması, `users.js`, admin layout, bütün rol kontrolleri

### Nasıl yapılacak

1. Platform rollerini `USER` ve `ADMIN` ile sınırla.
2. `/users/switch-role` endpointini kaldır.
3. Kullanıcı kendi etkinliğinde `ownerId` veya `EventMember` sayesinde yetki kazanmalı.
4. Mevcut `ORGANIZER` kullanıcıları veri migrasyonunda `USER` yapılmalı; sahip oldukları etkinlik ilişkileri korunmalı.
5. Frontend’de “Admin Paneli” ile “Organizasyon Alanım” ayrılmalı.

### Tamamlanma kriteri

Normal kullanıcı global rol yükseltmeden etkinlik oluşturabilir; başka etkinliğin yetkisini kazanamaz.

## TASK AUTH-004 — Merkezi sahiplik middleware ve policy katmanı kur

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef:** `backend/policies/*`

### Nasıl yapılacak

Aşağıdaki policy fonksiyonları oluşturulmalıdır:

```text
requirePlatformAdmin
requireEventOwnerOrAdmin
requireEventMember(permission)
requireHallOwnerOrAdmin
requireReservationOwnerOrEventManager
requireCheckinPermission
```

Her policy önce kaynağı DB’den yüklemeli, sonra `req.auth.userId` ile karşılaştırmalıdır. Route içinde dağınık `if role === ...` blokları azaltılmalıdır.

### Tamamlanma kriteri

Etkinlik, salon, rezervasyon, kupon, rapor, QR ve ödeme endpointlerinin tamamı merkezi policy testlerine sahiptir.

## TASK AUTH-005 — Bütün sorgularda tenant izolasyonu uygula

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Etkinlik listesi normal kullanıcı için `ownerId = currentUser.id` olmalı.
- Salon listesi `isGlobal = true OR ownerId = currentUser.id` olmalı.
- Rezervasyon listesi `event.ownerId = currentUser.id` ile filtrelenmeli.
- Dashboard, rapor ve gelir sorguları yalnız kullanıcının etkinlikleri üzerinden hesaplanmalı.
- Cache key içinde `userId` veya tenant scope bulunmalı.
- Admin global görünüm için açıkça ayrı endpoint kullanmalı.

### Testler

İki kullanıcı oluşturulmalı; kullanıcı A’nın bütün kaynak ID’leri kullanıcı B ile denenmeli ve `403/404` beklenmelidir.

## TASK AUTH-006 — Socket.io kimlik ve oda yetkilendirmesi ekle

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

1. Socket handshake sırasında oturum doğrula.
2. `join_admin` yerine `join_event_management` kullan; event policy kontrolü yap.
3. Public etkinlik koltuk odasına katılım yalnız o etkinliğin public/slug erişim kuralıyla mümkün olsun.
4. Seat lock mesajlarında event ve seat doğrulaması yap.
5. Disconnect olduğunda kullanıcıya ait geçici kilitleri güvenli biçimde bırak.
6. Socket eventleri için rate limit ve payload validation ekle.

### Tamamlanma kriteri

Kullanıcı tahmin ettiği event ID ile yönetim odasına veya başka organizatörün satış bildirimlerine katılamaz.

## TASK AUTH-007 — Kimlik sağlayıcı politikasını netleştir

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

### Nasıl yapılacak

- Gmail uzantısı kısıtlamasının ürün gereği olup olmadığı karara bağlanmalı.
- Google Workspace ve diğer doğrulanmış Google hesaplarını gereksiz engellememek için sadece `email_verified` kontrolü önerilir.
- Telegram auth beta için kapatılabilir.
- Aynı kişinin Google ve Telegram hesabını ileride birleştirebilmek için `Identity` tablosu tasarlanmalı.

### Tamamlanma kriteri

Kimlik sağlayıcıları aynı kullanıcı modeline bağlanır ve sahte e-posta üretimi ana kimlik olarak kullanılmaz.

---

# FAZ 2 — POSTGRESQL VE ÜRETİM VERİ MODELİ

## TASK DB-001 — SQLite’tan PostgreSQL’e kontrollü geçiş

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

1. `schema.prisma` provider değerini `postgresql` yap.
2. `prisma db push` yerine versioned `prisma migrate` kullan.
3. Local, test, staging ve production için ayrı DB bağlantıları tanımla.
4. Mevcut SQLite verisi varsa export-transform-import scripti hazırla.
5. Migration öncesi yedek ve geri dönüş prosedürü yaz.
6. CI’da gerçek PostgreSQL service ile migration ve integration test çalıştır.

### Tamamlanma kriteri

Boş PostgreSQL üzerinde tüm migrationlar sıfırdan uygulanır; örnek veri yüklenir; backend testleri geçer.

## TASK DB-002 — String durumları Prisma enumlarına dönüştür

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

En az aşağıdaki enumlar oluşturulmalıdır:

```text
PlatformRole
EventStatus
ApprovalStatus
ReservationStatus
PaymentStatus
WaitlistStatus
RsvpStatus
EventMemberRole
RefundStatus
```

Türkçe gösterim metinleri frontend çeviri katmanında olmalı; DB içinde makineye uygun sabit değer kullanılmalıdır.

### Tamamlanma kriteri

Route kodunda serbest biçimli `'Beklemede'`, `'Onaylı'`, `'İptal'` karşılaştırmaları kalmaz.

## TASK DB-003 — Para alanlarını Float’tan çıkar

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Para tutarlarını kuruş cinsinden `Int/BigInt` veya kontrollü `Decimal` olarak sakla.
- `Event.price` yalnız liste fiyatı olsun.
- Rezervasyonda `baseAmount`, `discountAmount`, `pointsAmount`, `payableAmount`, `currency` snapshot alanları bulunmalı.
- Finansal raporlar etkinliğin bugünkü fiyatını değil işlem snapshotını kullanmalı.

### Tamamlanma kriteri

0,1 + 0,2 tipi floating-point sapması oluşmaz; geçmiş bilet fiyatı etkinlik fiyatı değişse de değişmez.

## TASK DB-004 — Event sahiplik ve onay alanlarını ekle

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Eklenecek temel alanlar

```text
ownerId
slug
visibility
effectiveCapacity
approvalStatus
approvalReason
submittedForApprovalAt
approvedAt
approvedById
publishedAt
cancelledAt
completedAt
version
```

`ownerId` yeni kayıtlarda zorunlu olmalıdır.

## TASK DB-005 — Hall sahipliği ve layout snapshot modeli

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- `Hall.ownerId` ekle.
- `isGlobal` yalnız admin tarafından değiştirilebilir olsun.
- `calculatedSeatCount` backend tarafından hesaplanmalı.
- Layout için `schemaVersion` alanı ekle.
- Etkinlik yayınlandığında hall layout değişken kaynağa bağlı kalmamalı; `EventLayoutSnapshot` veya event üzerinde immutable snapshot tutulmalı.

### Tamamlanma kriteri

Salon sonradan düzenlense bile satılmış etkinliğin koltuk kimlikleri değişmez.

## TASK DB-006 — Koltuk envanterini tabloya çıkar

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

`EventSeat` tablosu önerilir:

```text
id
eventId
seatKey
label
section
tableKey
status
holdToken
holdExpiresAt
version
```

- `@@unique([eventId, seatKey])` zorunlu olsun.
- Rezervasyon yayın snapshotındaki `EventSeat.id` değerine bağlansın.
- JSON layout yalnız görsel çizim için kullanılsın; satış doğruluğunun tek kaynağı olmasın.

### Tamamlanma kriteri

Aynı etkinlikte aynı koltuk için iki aktif rezervasyon DB seviyesinde oluşturulamaz.

## TASK DB-007 — Invitation, RSVP, EventMember ve AuditLog tablolarını ekle

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0/P1

### Nasıl yapılacak

- `EventMember`: owner dışındaki manager/check-in görevlileri.
- `Invitation`: davet tokenı, hedef kişi, limit ve durum.
- `Rsvp`: katılım cevabı, yetişkin/çocuk/plus-one sayısı, not.
- `AuditLog`: actor, action, targetType, targetId, before/after özeti, IP, user-agent, tarih.
- Kritik admin ve finans işlemleri audit log olmadan tamamlanmamalı.

## TASK DB-008 — Payment ledger ve idempotency tablolarını hazırla

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2; ücretli etkinlik açılmadan P0

### Nasıl yapılacak

`Payment`, `PaymentEvent`, `Refund`, `Settlement` tabloları eklenmelidir. Sağlayıcı webhook event ID’si benzersiz olmalı. Aynı event ikinci kez işlendiğinde no-op dönmelidir.

## TASK DB-009 — Veri migrasyonu ve doğrulama scripti

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

1. Mevcut kullanıcıları normalize et.
2. `ORGANIZER` rolünü `USER` yap.
3. Event `organizerId` değerini `ownerId` alanına taşı.
4. Sahibi olmayan eventleri raporla; körlemesine admin’e bağlama.
5. Hall sahipliği belli değilse `migration_review` listesine al.
6. Seat count ile layouttan hesaplanan seat sayısını karşılaştır.
7. Dry-run ve gerçek çalışma modları oluştur.

### Tamamlanma kriteri

Migrasyon sonunda sahipsiz aktif etkinlik, duplicate seat veya bozuk finans kaydı raporsuz kalmaz.

---

# FAZ 3 — 50 KİŞİ ONAY KURALI VE ETKİNLİK YAŞAM DÖNGÜSÜ

## TASK EVT-001 — Merkezi kapasite hesaplama servisi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0
- **Hedef:** `eventCapacityService`

### Nasıl yapılacak

```text
Koltuklu: effectiveCapacity = backend tarafından doğrulanan benzersiz EventSeat sayısı
Genel giriş: effectiveCapacity = doğrulanmış capacity alanı
```

Frontend `seatCount` değerine güvenilmemelidir. Servis event create, update, publish ve approval işlemlerinde aynı şekilde çağrılmalıdır.

### Test sınırları

- 0 reddedilir.
- 1 kabul edilir.
- 50 => approval `NOT_REQUIRED`.
- 51 => approval `PENDING_APPROVAL`.
- Duplicate seat ID kapasiteyi artırmaz ve validation hatası üretir.

## TASK EVT-002 — Etkinlik durum makinesi oluştur

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Durumlar

```text
DRAFT
PENDING_APPROVAL
PUBLISHED
REJECTED
SUSPENDED
CANCELLED
COMPLETED
ARCHIVED
```

İzin verilen geçişler tek servis içinde tanımlanmalıdır. Route doğrudan keyfi status yazmamalıdır.

## TASK EVT-003 — Her USER için etkinlik oluşturma endpointi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Giriş yapmış her `USER`, draft event oluşturabilmeli.
- `ownerId` request body’den değil oturumdan yazılmalı.
- Kullanıcı `status: PUBLISHED` göndererek policy atlayamamalı.
- Create command önce draft oluşturmalı, sonra publish servisi kapasite/onay kararını vermeli.

## TASK EVT-004 — 50 ve altı otomatik yayın

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Event validasyonu tamamlandıysa ve kapasite <=50 ise `approvalStatus=NOT_REQUIRED`.
- Kullanıcı “Yayınla” dediğinde `PUBLISHED` yapılabilir.
- Admin onayı aranmamalı.
- Bununla birlikte şikâyet ve suspend mekanizması korunmalı.

## TASK EVT-005 — 51 ve üzeri admin onay akışı

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Endpointler

```text
POST /events/:id/submit-approval
GET /admin/event-approvals
POST /admin/event-approvals/:id/approve
POST /admin/event-approvals/:id/reject
POST /admin/events/:id/suspend
```

Ret gerekçesi zorunlu olmalı. Onay ve ret audit loga yazılmalıdır.

## TASK EVT-006 — Kapasite artınca onayı geçersiz kıl

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- 50’den 51’e çıkan published event satış/RSVP kabulünü durdurmalı.
- Durum `PENDING_APPROVAL` olmalı.
- Daha önce onaylı büyük etkinlikte kapasite, tarih, mekân veya içerik maddi biçimde değişirse yeniden onay istenmeli.
- Optimistic version alanıyla eski ekranın yeni veriyi ezmesi engellenmeli.

## TASK EVT-007 — Private slug ve davet erişimini güçlendir

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

### Nasıl yapılacak

- Yeterli entropy’ye sahip slug üret.
- Slug yalnız erişim anahtarıdır; yönetim yetkisi sağlamaz.
- Yenileme eski linki iptal etmeli.
- Private sayfalara `noindex,nofollow` ekle.
- Gerekiyorsa kişi başına signed invitation token kullan.

## TASK EVT-008 — Silme yerine iptal/arşiv politikası

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Etkinlik fiziksel olarak silinmemeli; bilet, audit ve finans geçmişi korunmalıdır. Draft ve hiç ilişkisi olmayan kayıtlar için kontrollü hard delete düşünülebilir.

---

# FAZ 4 — REZERVASYON, KOLTUK VE WAITLIST BÜTÜNLÜĞÜ

## TASK RSV-001 — Rezervasyon kimliğini kullanıcı/guest session ile bağla

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Üye rezervasyonunda `userId` oturumdan alınmalı.
- Kullanıcı e-postası request body ile başka hesaba çevrilememeli.
- Guest bilet gerekiyorsa ayrı signed checkout session ve e-posta doğrulama akışı kullanılmalı.
- Sadakat puanı yalnız authenticated userId üzerinden işlemeli.

## TASK RSV-002 — İdempotent rezervasyon komutu

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Frontend her checkout için idempotency key üretmeli.
- Backend aynı user/event/key için aynı sonucu dönmeli.
- Ağ retry’sı ikinci rezervasyon oluşturmamalı.
- Key DB’de unique saklanmalı.

## TASK RSV-003 — DB seviyesinde çift satış engeli

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- `EventSeat` satırını transaction içinde atomik olarak HOLD/RESERVED yap.
- PostgreSQL row lock veya koşullu update kullan.
- Redis UX kilidi yardımcı olabilir; doğruluğun tek garantisi olmamalı.
- Aynı koltuğa 50 eşzamanlı istek testinde yalnız biri başarılı olmalı.

## TASK RSV-004 — Güvenli Redis koltuk kilidi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Kilit değeri rastgele `holdToken + user/session id` içermeli.
- Unlock Lua script ile yalnız token eşleşirse silmeli.
- Redis yoksa production checkout fail-fast olmalı; “simüle edildi” başarısı dönmemeli.
- Kullanıcı başka koltuğa geçtiğinde eski kilit bırakılmalı.
- Kilit TTL’si server tarafından belirlenmeli.

## TASK RSV-005 — Server-authoritative reservation expiry

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Client URL parametresindeki sayaç yalnız görseldir.
- `expiresAt` DB’de tek gerçek kaynak olmalı.
- BullMQ delayed job veya periyodik idempotent worker süresi dolanı iptal etmeli.
- PM2 worker başına interval kullanılmamalı.
- Worker yeniden başlasa da işler kaybolmamalı.

## TASK RSV-006 — Waitlist’i atomik FIFO yap

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

### Nasıl yapılacak

1. Event + email için aktif waitlist unique constraint ekle.
2. Boş koltuk oluştuğunda transaction içinde ilk `PENDING` kayıt kilitlensin.
3. Kayıt `OFFERED` yapılsın ve hold oluşturulsun.
4. Aynı kişi iki worker tarafından seçilemesin.
5. Süre dolarsa `EXPIRED`; sıradaki kişiye teklif.
6. Koltuksuz etkinlikte açılan kapasite adedi kadar kişiye sırayla teklif ver.

## TASK RSV-007 — Availability cache stratejisini düzelt

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- 5 dakikalık process-local availability cache kaldırılmalı veya çok kısa Redis cache + version kullanılmalı.
- Seat state değiştiğinde event version artırılmalı.
- `Ödeme Bekleniyor/HOLD` durumları dolu sayılmalı.
- Her requestte Redis `SCAN` yapılmamalı; event bazlı set/hash kullanılmalı.

## TASK RSV-008 — Reservation state machine oluştur

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Önerilen durumlar:

```text
HOLD
PENDING_PAYMENT
PENDING_VERIFICATION
CONFIRMED
CANCELLED
EXPIRED
REFUND_PENDING
REFUNDED
CHECKED_IN
```

Her geçiş şartları ve yan etkileriyle tek servis içinde olmalıdır.

## TASK RSV-009 — Kupon ve puan yan etkilerini transaction-safe yap veya beta için kapat

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1/P2

### Nasıl yapılacak

En güvenli beta kararı: sadakat ve kupon feature flag ile kapalı olsun. Açılacaksa:

- Kupon kullanımı CONFIRMED olduğunda kesinleşmeli.
- HOLD/expired/cancel işleminde rezervasyon hakkı geri bırakılmalı.
- Puan rezerv edilir, ödeme başarısızsa geri açılır.
- Puan bakiyesi negatif olamaz.
- Puan hareketleri ayrı ledger tablosunda tutulmalı.

## TASK RSV-010 — Bilet limiti ve anti-hoarding

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Etkinlik sahibi kişi başı bilet/RSVP limiti belirleyebilmeli. Aynı kullanıcı, e-posta, telefon ve risk sinyalleri üzerinden aşırı rezervasyon kontrolü yapılmalıdır; kör IP engeli tek başına kullanılmamalıdır.

---

# FAZ 5 — ÖDEME STRATEJİSİ VE FİNANSAL GÜVENLİK

## TASK PAY-001 — Beta ödeme kararını uygula

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Güçlü öneri

İlk beta yalnız **ücretsiz etkinlik + RSVP + QR giriş** ile yayınlansın. Ücretli etkinlikler feature flag ile kapalı olsun. Bu karar ürünün çekirdek değerini test ederken finansal ve hukuki riski ciddi biçimde azaltır.

### Tamamlanma kriteri

Production beta kullanıcısı sahte kredi kartı veya doğrulanmamış havale akışıyla ücretli bilet açamaz.

## TASK PAY-002 — Gerçek ödeme sağlayıcısını hosted checkout ile entegre et

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2; ücretli sürüm için P0

### Nasıl yapılacak

- Kart verisi App Bilet frontend/backend’ine girmemeli.
- Sağlayıcının hosted checkout/SDK ve gerekli güvenli doğrulama akışı kullanılmalı.
- Checkout session server tarafından gerçek rezervasyon tutarıyla oluşturulmalı.
- Frontend tutarı değiştirememeli.
- Başarı sayfası tek başına ödeme kanıtı sayılmamalı; signed webhook esas olmalı.

## TASK PAY-003 — Signed webhook ve idempotent event işleme

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2/P0

### Nasıl yapılacak

1. Raw request body üzerinden sağlayıcı imzasını doğrula.
2. Timestamp toleransı uygula.
3. Sağlayıcı event ID’sini unique kaydet.
4. Amount, currency, merchant ve reservation eşleşmesini doğrula.
5. Beklenen tutardan düşük ödemeyi otomatik onaylama.
6. Webhook response hızlı dönsün; ağır işler queue’ya aktarılsın.

## TASK PAY-004 — Banka transferini manuel inceleme akışına dönüştür

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2

### Nasıl yapılacak

- Organizasyon sahibi kendi doğrulanmış ödeme hesabını tanımlar.
- “Transfer yaptım” yalnız inceleme talebi oluşturur.
- Onaylayan kişi event owner veya finans yetkilisi olmalı.
- Tutar, referans, gönderen ve tarih audit loga yazılmalı.
- Onay endpointinde tutar zorunlu ve immutable beklenen tutarla karşılaştırılmalı.

## TASK PAY-005 — Gerçek refund durumu ve over-refund engeli

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2

### Nasıl yapılacak

- Refund sağlayıcı API’si üzerinden başlatılmalı.
- Toplam iade, ödenen net tutarı aşamamalı.
- Partial refund bileti otomatik iptal etmemeli; iş kuralı açıkça belirlenmeli.
- Refund webhook sonucu kesin durumu güncellemeli.
- Her hareket ledger ve audit logda olmalı.

## TASK PAY-006 — Organizatör hakediş ve komisyon modelini ayrı tasarla

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2

Platform tahsilatı, organizatör tahsilatı, komisyon, iptal rezervi ve payout aynı `Reservation` alanına sıkıştırılmamalıdır. Gerçek para açılmadan mali ve hukuki uzman incelemesi yapılmalıdır.

---

# FAZ 6 — DAVET, RSVP VE KATILIM YÖNETİMİ

## TASK INV-001 — Invitation token modeli

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Davet linki tahmin edilemez token taşımalı; token hash’i DB’de tutulmalı. Event owner linki iptal/yenileyebilmeli. Genel paylaşım ve kişiye özel davet ayrılmalıdır.

## TASK INV-002 — RSVP durumları ve katılımcı sayısı

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Desteklenecek cevaplar:

```text
GOING
NOT_GOING
MAYBE
NO_RESPONSE
WAITLISTED
```

Yetişkin, çocuk ve plus-one sayıları ayrı alanlar olmalı. Kapasite hesabı toplam kişi sayısı üzerinden atomik yapılmalıdır.

## TASK INV-003 — Kapasite dolunca otomatik waitlist

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

RSVP kabulü kapasiteyi aşmamalı. Doluluk anında kullanıcı açıkça waitlist’e alınmalı; “katılıyorum” görünümü verilmemelidir.

## TASK INV-004 — Adres gizliliği

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Event owner adresi şu seçeneklerle yönetebilmeli:

- Herkese göster
- Sadece davet linki olanlara göster
- Sadece GOING cevabı verenlere göster
- Etkinliğe belirli süre kala göster

## TASK INV-005 — WhatsApp paylaşımı ve QR davetiye

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Paylaşım metni server tarafından event adı, tarih ve signed link ile oluşturulmalı. QR yalnız davet URL’sini taşımalı; yönetim tokenı içermemelidir.

## TASK INV-006 — Katılımcı içe/dışa aktarma

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2

CSV importta kolon doğrulama, preview, duplicate çözümü ve kullanıcı onayı gerekir. CSV export kişisel veri içerdiği için yalnız event owner/authorized manager kullanabilmelidir.

---

# FAZ 7 — SALON TASARIM ARACININ SAĞLAMLAŞTIRILMASI

## TASK HALL-001 — Layout JSON şeması ve boyut limiti

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- Versioned Zod/JSON schema oluştur.
- Element type, ID, koordinat, seat count, ölçü ve label limitleri koy.
- Duplicate element/seat ID reddedilsin.
- 10 MB genel body limiti yerine endpoint bazlı daha düşük limit kullan.
- Aşırı büyük canvas ve element sayısı engellensin.

## TASK HALL-002 — Seat extraction kodunu tek kaynağa indir

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Frontend ve backend farklı koltuk üretim mantığı taşımamalı. Deterministik seat ID üretim kuralı paylaşılan paket veya backend snapshot servisi üzerinden yürütülmelidir.

## TASK HALL-003 — Hall tenant izolasyonu

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Kullanıcı yalnız kendi salonlarını ve global salonları görebilir. Başka kullanıcının özel salonunu ID ile getirme, clone veya update denemesi reddedilmelidir.

## TASK HALL-004 — Büyük HallDesignerCanvas bileşenini böl

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Önerilen parçalar:

```text
CanvasViewport
ElementPalette
SelectionManager
AlignmentTools
AutoLayoutWizard
SeatNumberingService
HistoryUndoRedo
LayoutSerializer
HallSettingsPanel
```

Amaç yalnız satır sayısını azaltmak değil; test edilebilir saf fonksiyonlar yaratmaktır.

## TASK HALL-005 — Autosave, versiyon ve çakışma kontrolü

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Draft layout autosave edilebilir; her kayıt `version` taşır. Eski sekme yeni değişikliği sessizce ezmemelidir. Yayınlanmış event snapshotı değişmemelidir.

## TASK HALL-006 — Görsel dosyaları DB JSON’dan çıkar

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Background image ve kapak görselleri base64 olarak ana DB’ye yazılmamalı. Object storage’a yüklenmeli; DB yalnız key/URL ve metadata tutmalıdır. MIME, boyut ve zararlı dosya kontrolleri eklenmelidir.

---

# FAZ 8 — QR CHECK-IN VE GÖREVLİ YETKİLENDİRMESİ

## TASK QR-001 — EventMember check-in görevlisi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Event owner belirli kullanıcıları veya süreli görevli davetlerini `CHECKIN_STAFF` yapabilmelidir. Görevli yalnız atandığı eventte check-in yapabilir.

## TASK QR-002 — Atomik check-in

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0/P1

Tek sorgu yaklaşımı kullanılmalıdır:

```text
UPDATE ticket
SET usedAt = now()
WHERE ticketCode = ?
  AND eventId = ?
  AND status = CONFIRMED
  AND usedAt IS NULL
```

Etkilenen satır 1 değilse uygun hata dönmelidir. Böylece iki cihaz aynı bileti aynı anda kabul edemez.

## TASK QR-003 — QR token rotasyonu ve bilet devri güvenliği

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

QR tahmin edilemez random token taşımalı. Bilet iptal veya devredildiğinde eski token revoke edilmeli ve yenisi üretilmelidir.

## TASK QR-004 — Offline check-in paketi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2

- Evente özel, süreli ve imzalı paket indir.
- Pakette gereksiz kişisel veri bulunmasın.
- Offline taramalar cihaz ID ve local timestamp ile saklansın.
- Sync çakışmaları audit loga yazılsın.
- Online kontrol mümkünse online akış tercih edilsin.

## TASK QR-005 — Manuel arama ve erişilebilirlik

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

QR çalışmadığında isim, kısa bilet kodu veya doğrulanmış telefon son hanesiyle arama yapılabilmeli. Sonuçlar yetki ve veri minimizasyonu kurallarına uymalıdır.

---

# FAZ 9 — KALICI KUYRUK VE BİLDİRİM SİSTEMİ

## TASK JOB-001 — In-memory queue yerine BullMQ worker

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0/P1

### Nasıl yapılacak

- API yalnız job payload oluşturur.
- Ayrı worker e-posta, Telegram ve hatırlatma işlerini çalıştırır.
- Retry, exponential backoff, timeout ve dead-letter yaklaşımı kullanılır.
- Job ID idempotent olmalı; aynı bilet maili kontrolsüz tekrarlanmamalı.
- Worker restart sonrası işler korunmalı.

## TASK JOB-002 — Notification kayıt tablosu

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Her bildirim için recipient, template, channel, status, attemptCount, providerMessageId ve hata özeti tutulmalıdır. Hassas içerik loga yazılmamalıdır.

## TASK JOB-003 — Template servisi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Route içindeki uzun HTML stringlerini ayrı şablonlara taşı. Kullanıcı girdilerini escape et. Türkçe tarih/saat ve timezone tek helper üzerinden üretilsin.

## TASK JOB-004 — Hatırlatma scheduler

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

24 saat, 2 saat, iptal, adres açılışı ve onay sonucu bildirimleri event değişikliklerinde yeniden planlanmalıdır. Duplicate hatırlatma gönderilmemelidir.

## TASK JOB-005 — Bildirim tercihleri ve bounce yönetimi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P2

Kullanıcı zorunlu işlem bildirimleri ile pazarlama bildirimlerini ayrı yönetebilmelidir. Geçersiz e-posta/bounce tekrar tekrar denenmemelidir.

---

# FAZ 10 — FRONTEND SÖZLEŞME VE KULLANICI DENEYİMİ

## TASK FE-001 — Tek API client ve URL standardı

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Nasıl yapılacak

- `NEXT_PUBLIC_API_URL` tek standarda sahip olsun; örneğin origin, `/api` ekini client helper eklesin.
- Compose defaultunda `/api` iki kez oluşma ihtimali kaldırılmalı.
- Socket için yalnız `NEXT_PUBLIC_SOCKET_URL` kullanılmalı.
- Timeout, JSON parse, auth ve error mapping merkezi fetch clientta olmalı.

## TASK FE-002 — `/users/me` ile `/users/profile` sözleşmesini düzelt

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Frontend’in çağırdığı endpoint ile backend endpointi aynı olmalıdır. Response DTO yalnız güvenli alanları içermelidir. Bot token, password veya şifreli ham alanlar dönmemelidir.

## TASK FE-003 — Production demo event fallbackını kaldır

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0/P1

API kapalıysa gerçek kullanıcıya sahte etkinlik gösterilmemelidir. Development Storybook/demo fixture ayrı kullanılabilir. Production’da açık hata durumu, retry ve destek bilgisi gösterilmelidir.

## TASK FE-004 — Admin panelini iki ürüne ayır

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

```text
/organizer — kullanıcının kendi organizasyon alanı
/admin — platform yöneticisi alanı
```

Normal kullanıcı admin terminolojisi görmemeli. Menü yalnız sahip olduğu kaynakları göstermelidir.

## TASK FE-005 — Beş adımlı etkinlik oluşturma sihirbazı

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

1. Etkinlik türü
2. Temel bilgiler
3. Katılım düzeni ve kapasite
4. Davet/gizlilik
5. Önizleme ve yayın/onaya gönderme

51. kişi/sandalye oluştuğu anda onay uyarısı gösterilmelidir; son ekranda sürpriz olmamalıdır.

## TASK FE-006 — Gerçek status ve approval UX

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Draft, onay bekliyor, reddedildi, yayınlandı, askıya alındı ve iptal durumları ayrı badge ve aksiyonlara sahip olmalı. Ret gerekçesi görünür olmalıdır.

## TASK FE-007 — Form doğrulama ve hata sözleşmesi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Backend Zod hataları standart `code`, `message`, `fieldErrors`, `requestId` biçiminde dönmeli. Frontend alert yerine alan bazlı hata ve toast kullanmalı.

## TASK FE-008 — Erişilebilirlik ve mobil test

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

- Klavye ile salon/koltuk alternatif akışı
- Form label ve hata ilişkisi
- Kontrast
- Focus yönetimi
- 320px genişlik
- Büyük yazı
- Screen reader temel testleri

## TASK FE-009 — Büyük sayfa ve bileşenleri böl

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Event detail, payment page, profile ve admin event sayfaları veri hookları, form bileşenleri ve domain UI parçalarına ayrılmalıdır. İş mantığı JSX içinde çoğalmamalıdır.

---

# FAZ 11 — DOCKER, SUNUCU VE DAĞITIM

## TASK OPS-001 — Docker Compose topolojisini düzelt

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

### Servisler

```text
reverse-proxy
frontend
api
worker
postgres
redis
backup
```

- PostgreSQL host portu production’da yayınlanmamalı.
- Redis service eklenmeli ve host portu açılmamalı.
- API `REDIS_URL` almalı.
- SQLite volume yaklaşımı kaldırılmalı.
- Healthcheck ve dependency readiness eklenmeli.

## TASK OPS-002 — PM2 ve container stratejisini sadeleştir

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0/P1

Docker production seçildiyse container içinde PM2 cluster kullanma. API bir process çalıştırsın. Gerekirse `docker compose up --scale api=N` veya orkestrasyonla ölçeklensin. Scheduler yalnız worker’da çalışsın.

## TASK OPS-003 — Dockerfile standardizasyonu

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

- Backend ve frontend aynı desteklenen Node major sürümünü kullansın.
- `npm ci` kullan.
- Frontend non-root kullanıcıyla çalışsın.
- Dev dosyalarını `.dockerignore` ile dışarıda bırak.
- Build-time public env ile runtime secret ayrımını doğru yap.
- Image healthcheck ve SBOM/vulnerability scan ekle.

## TASK OPS-004 — Migration release adımı

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Deploy sırasında API başlamadan önce tek sefer `prisma migrate deploy` çalışmalıdır. Birden fazla API replica aynı anda migration yarışına girmemelidir. Geriye uyumsuz migrationlar expand-migrate-contract yaklaşımıyla yapılmalıdır.

## TASK OPS-005 — Reverse proxy, TLS ve güvenlik başlıkları

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

- Yalnız 80/443 public.
- HTTPS zorunlu.
- HSTS, CSP, Referrer-Policy ve uygun frame policy.
- WebSocket proxy ayarı.
- Upload/body limitleri endpoint bazlı.
- Gerçek client IP için trusted proxy ayarı kontrollü.

## TASK OPS-006 — CORS ve localhost istisnasını production’dan kaldır

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Production’da regex ile bütün localhost originlerine izin verilmemelidir. Kesin allowlist kullanılmalı. Origin olmayan requestler yalnız webhook/server-to-server endpointlerinde özel policy ile değerlendirilmelidir.

## TASK OPS-007 — Readiness ve liveness healthcheck

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

```text
/health/live  -> process ayakta mı
/health/ready -> DB, Redis, migration ve kritik config hazır mı
```

Response secret veya detaylı altyapı bilgisi açmamalıdır.

## TASK OPS-008 — Backup ve restore tatbikatı

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

- Günlük otomatik PostgreSQL backup.
- Şifreli off-server kopya.
- Saklama politikası.
- Aylık restore denemesi.
- Object storage dosyalarının da yedeği.
- RPO/RTO hedefleri dokümante edilmeli.

### Tamamlanma kriteri

Test sunucusunda yalnız backup kullanılarak uygulama ve örnek eventler geri getirilebilir.

## TASK OPS-009 — Güvenli deploy ve rollback runbook

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Deploy sırası, migration, smoke test, trafik açma, rollback image, DB geri dönüş kararı ve sorumlu kişi açıkça yazılmalıdır.

## TASK OPS-010 — Kaynak limitleri ve disk yönetimi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Container CPU/RAM limitleri, log rotation, PostgreSQL disk alarmı ve image temizliği tanımlanmalıdır. Kontrolsüz base64 görsel yükleme disk/DB’yi dolduramamalıdır.

---

# FAZ 12 — TEST, CI VE GÜVENLİK KAPILARI

## TASK QA-001 — CI’da PostgreSQL ve Redis kullan

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

GitHub Actions service containerlarıyla PostgreSQL ve Redis ayağa kaldırılmalı. Migration uygulanmalı. Integration testleri gerçek production DB motorunda çalışmalıdır.

## TASK QA-002 — Lint, typecheck ve frontend testleri

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0/P1

CI jobları:

```text
backend lint
backend unit
backend integration
frontend lint
frontend typecheck
frontend unit/component
frontend build
E2E
Docker build
```

## TASK QA-003 — Tenant izolasyon test paketi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

A ve B kullanıcıları için event, hall, reservation, coupon, report, check-in ve socket erişimi ayrı ayrı test edilmelidir. Bu paket branch protection için zorunlu olmalıdır.

## TASK QA-004 — Eşzamanlı rezervasyon testleri

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

- 50 paralel istek aynı koltuk.
- Son koltuk için 50 paralel istek.
- Aynı idempotency key ile retry.
- Redis restart.
- Worker restart.
- Payment webhook duplicate.

Beklenti: hiçbir senaryoda kapasite aşımı veya çift satış yok.

## TASK QA-005 — 50/51 approval karar testleri

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Koltuklu ve genel giriş eventleri için 49, 50, 51, kapasite azaltma/artırma, onay sonrası değişiklik ve rejected event senaryoları test edilmelidir.

## TASK QA-006 — Güvenlik negatif testleri

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

- LOCAL admin token production’da reddedilir.
- Yanlış issuer/audience JWT reddedilir.
- Unsigned webhook reddedilir.
- Başka kullanıcının puanı harcanamaz.
- Public reservation ID PII döndürmez.
- Başka organizatör check-in yapamaz.
- Başka socket admin odasına katılamaz.
- Over-refund reddedilir.

## TASK QA-007 — Coverage eşiklerini anlamlı seviyeye çıkar

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Global yüzde tek hedef olmamalı. Auth, policy, payment, reservation state machine ve approval service için branch coverage en az %80 hedeflenmelidir. Genel threshold aşamalı olarak yükseltilmelidir.

## TASK QA-008 — Secret, dependency ve container taraması

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

- Secret scanning
- Dependency audit
- SAST
- Docker image vulnerability scan
- License kontrolü

Kritik bulgu production deploy’u bloklamalıdır.

## TASK QA-009 — E2E beta senaryosu

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

1. Kullanıcı kayıt olur.
2. 20 kişilik doğum günü oluşturur.
3. Özel davet linkini paylaşır.
4. İki davetli RSVP verir.
5. QR üretilir.
6. Owner check-in yapar.
7. Başka kullanıcı yönetim ekranına erişemez.
8. 51 kişilik event onaysız yayınlanamaz.

## TASK QA-010 — Branch protection ve PR şablonu

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Main için doğrudan push sınırlandırılmalı; gerekli CI kontrolleri, en az bir inceleme ve güncel branch şartı kullanılmalıdır. PR şablonu migration, security, test ve rollback sorularını içermelidir.

---

# FAZ 13 — LOG, METRİK, ALARM VE OPERASYON

## TASK OBS-001 — Sentry sampling ve PII temizliği

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Production’da traces/profiles %100 kullanılmamalıdır. Ortama göre sampling ayarlanmalı. E-posta, telefon, IBAN, kart verisi, token ve request body scrub edilmelidir.

## TASK OBS-002 — Yapısal log ve request ID

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Her request `requestId`, userId (güvenli biçimde), route, latency, status ve error code taşımalı. Secret ve PII loglanmamalı. Console ile Winston dağınıklığı tek loggera indirilmeli.

## TASK OBS-003 — Teknik metrikler

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

- API latency/error rate
- DB connection ve slow query
- Redis availability
- Queue depth/failure
- Mail failure
- Reservation conflict
- Check-in error
- Disk/CPU/RAM

## TASK OBS-004 — İş metrikleri

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

- Event create completion
- 50 altı publish oranı
- 51+ approval bekleme süresi
- RSVP conversion
- Capacity fill rate
- Check-in success
- Notification delivery
- Organizer retention

## TASK OBS-005 — Alarm ve incident runbook

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

DB down, Redis down, queue backlog, error spike, disk doluluk, backup failure ve şüpheli auth denemeleri için alarm tanımlanmalıdır. Her alarmın ilk kontrol ve geri dönüş adımı olmalıdır.

---

# FAZ 14 — GİZLİLİK, DENETİM VE KÖTÜYE KULLANIM

## TASK TRUST-001 — Veri envanteri ve minimizasyon

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Hangi kişisel verinin neden toplandığı, nerede tutulduğu, kimlerin eriştiği ve ne zaman silindiği yazılmalıdır. Gereksiz IP, bot token, tam IBAN ve profil alanları azaltılmalıdır.

## TASK TRUST-002 — Hesap silme ve veri dışa aktarma

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Kullanıcı hesap silme talebi verebilmeli. Finansal/audit zorunlulukları ile silinebilen kişisel veri ayrılmalıdır. Anonimleştirme politikası hazırlanmalıdır.

## TASK TRUST-003 — Etkinlik şikâyeti ve moderasyon

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Şikâyet kategorisi, kanıt, status, admin karar, itiraz ve audit kaydı olmalıdır. Mevcut genel feedback modeli etkinlik moderasyonu için yeterli değildir.

## TASK TRUST-004 — Spam ve seri etkinlik sınırları

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Yeni hesapların kısa sürede çok sayıda public event oluşturması, aynı link/telefon kullanımı ve şüpheli içerik risk puanına alınmalıdır. Sadece IP limitine güvenilmemelidir.

## TASK TRUST-005 — Kullanım şartları ve gizlilik metinlerinin ürüne bağlanması

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Metinler gerçek veri akışını yansıtmalı. Ücretli bilet, komisyon, iade ve organizatör sorumluluğu açılmadan önce uzman hukuk ve mali incelemesi yapılmalıdır.

---

# FAZ 15 — BETA YAYIN VE KONTROLLÜ BÜYÜME

## TASK LAUNCH-001 — Staging ortamı

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Staging production ile aynı PostgreSQL, Redis, worker, proxy ve migration yapısını kullanmalı; yalnız secret ve veri farklı olmalıdır. SQLite staging kabul edilmez.

## TASK LAUNCH-002 — Kapalı beta kullanıcı grubu

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

İlk grup önerisi:

- 10 etkinlik sahibi
- 20 kişilik 3 etkinlik
- 50 kişilik 2 etkinlik
- 51 kişilik 2 onay senaryosu
- En az iki farklı telefon ve masaüstü
- Gerçek QR kapı testi

## TASK LAUNCH-003 — Go / No-Go kontrol listesi

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P0

Yayın ancak aşağıdakilerin tümü sağlanırsa yapılır:

- P0 açık yok
- Tenant testleri yeşil
- 50/51 testleri yeşil
- Çift satış testi yeşil
- Backup restore kanıtı var
- Production secret taraması temiz
- Debug ve local auth kapalı
- Ücretli event feature flag kapalı veya gerçek ödeme onaylı
- Alarm ve rollback runbook hazır

## TASK LAUNCH-004 — Feature flag ve kademeli açılış

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

Public listing, paid events, Telegram, coupons, loyalty, transfer ve offline scanner ayrı flag olmalıdır. Sorunlu modül tüm sistemi deploy etmeden kapatılabilmelidir.

## TASK LAUNCH-005 — Beta başarı ölçütleri

- **Durum:** `BEKLEMEDE`
- **Öncelik:** P1

- Event oluşturma medyan süresi < 3 dakika
- 50 altı admin müdahalesi = 0
- 51+ onaysız yayın = 0
- Kullanıcılar arası veri sızıntısı = 0
- Duplicate reservation = 0
- QR ilk okutma başarı oranı > %98
- Kritik bildirim teslim oranı ölçülür
- Organizer beta memnuniyeti ve tekrar kullanım izlenir

---

# FAZ 16 — BETA SONRASI ÖZELLİKLER

Bu görevler çekirdek beta başarı vermeden başlatılmamalıdır.

| Görev | Durum | Öncelik | Açılma şartı |
|---|---|---|---|
| Gerçek ücretli bilet | BEKLEMEDE | P2 | Payment fazı ve hukuki/mali inceleme |
| Dinamik fiyatlandırma | BEKLEMEDE | P2 | Immutable price ve payment ledger |
| Sadakat puanı | BEKLEMEDE | P2 | Points ledger ve refund tutarlılığı |
| Kupon sistemi | BEKLEMEDE | P2 | Tenant-safe coupon ve payment state |
| Telegram Mini App | BEKLEMEDE | P2 | Identity linking ve security review |
| Public aggregator | BEKLEMEDE | P2 | Moderasyon ve içerik güveni |
| Bilet devri | BEKLEMEDE | P2 | Alıcı kabulü, revoke ve audit |
| Offline scanner | BEKLEMEDE | P2 | Online check-in kararlı ve conflict modeli |
| Premium davetiye temaları | BEKLEMEDE | P2 | Core RSVP kullanım kanıtı |
| SMS | BEKLEMEDE | P2 | Consent, maliyet ve notification preferences |

---

# 17. ÖNERİLEN UYGULAMA SIRASI

Aşağıdaki sıra bozulmamalıdır:

1. `P0-001`–`P0-006`: Acil güvenlik kapatma
2. `AUTH-001`–`AUTH-006`: Kimlik ve sahiplik
3. `DB-001`–`DB-006`: PostgreSQL ve rezervasyon temeli
4. `EVT-001`–`EVT-006`: 50/51 kuralı
5. `RSV-001`–`RSV-008`: Rezervasyon doğruluğu
6. `FE-001`–`FE-006`: Kullanıcı akışını yeni modele bağlama
7. `INV-001`–`INV-005`: Davet ve RSVP
8. `QR-001`–`QR-003`: Güvenilir giriş
9. `JOB-001`–`JOB-004`: Kalıcı işler
10. `OPS-001`–`OPS-009`: Sunucu hazırlığı
11. `QA-001`–`QA-010`: Yayın kapıları
12. `LAUNCH-001`–`LAUNCH-005`: Kapalı beta
13. P2 özellikleri

---

# 18. İLK 10 TEKNİK İŞ — AI İÇİN NOKTA ATIŞI BAŞLANGIÇ

AI ilk iterasyonda aşağıdaki işleri sırasıyla almalıdır:

1. SMTP secretlarını kaldır, env mail service oluştur ve secretları yenile.
2. LOCAL auth tokenlarını ve frontend test girişlerini production’da kapat.
3. JWT’ye `sub=user.id` ekle ve bütün token üretimini tek servise taşı.
4. `/switch-role` endpointini kaldır; platform rolünü USER/ADMIN yap.
5. Prisma `Event.ownerId` ve `Hall.ownerId` alanlarını tasarla; migration planı oluştur.
6. Merkezi `requireEventOwnerOrAdmin` policy yaz ve event update/list üzerinde uygula.
7. Rezervasyon approve/cancel/check-in/list sorgularını event owner ile sınırla.
8. Public reservation/payment PII endpointlerini kapat.
9. Simulated card ve unsigned webhook endpointlerini production’da kapat.
10. CI’ya iki kullanıcılı tenant izolasyon testini ekle.

Bu 10 iş bitmeden yeni özellik PR’ı açılmamalıdır.

---

# 19. TAMAMLAMA TANIMI

Bir fazın tamamlanmış sayılması için yalnız kod yazılması yeterli değildir. Aşağıdaki dört kanıt birlikte bulunmalıdır:

```text
1. Kod
2. Migration / config
3. Otomatik test
4. Çalışan ortam kanıtı
```

Örnek:

```text
Durum: TAMAMLANDI
Branch: agent/auth-user-id
Commit: abc1234
PR: #42
Test komutları:
- npm run test:unit
- npm run test:integration
- npm run test:tenant
Sonuç: 132 passed, 0 failed
Migration: 20260723_add_owner_model
Kanıt: staging smoke test /health/ready OK; User B, User A eventine 403 aldı.
```

Kanıt yoksa durum `TAMAMLANDI` değildir.

---

# 20. DENETİMDE TAMAMLANAN ÇALIŞMALAR

## AUDIT-001 — Repo ve ürün vizyonu eşleştirmesi

- **Durum:** `TAMAMLANDI`
- Mevcut kod, README ve self-servis `ROADMAP.md` karşılaştırıldı.

## AUDIT-002 — Backend kritik akış incelemesi

- **Durum:** `TAMAMLANDI`
- Auth, events, halls, reservations, payments, coupons, users, Telegram, cache, queue ve Prisma şeması incelendi.

## AUDIT-003 — Frontend sözleşme ve akış incelemesi

- **Durum:** `TAMAMLANDI`
- Login, ana sayfa, event checkout, payment, profile ve yönetim ekranlarının API kullanımı incelendi.

## AUDIT-004 — Sunucu, Docker ve CI incelemesi

- **Durum:** `TAMAMLANDI`
- Docker Compose, Dockerfile, PM2, Next config, Jest ve GitHub Actions yapıları incelendi.

## AUDIT-005 — Üretim kararı

- **Durum:** `TAMAMLANDI`
- Karar: P0 güvenlik, sahiplik, PostgreSQL ve ödeme kapatma görevleri bitmeden production yayını `BLOKE`.

---

# 21. SON KARAR

App Bilet’in fikri güçlüdür; özellikle “herkes kendi etkinliğinin organizatörüdür, 50 kişiye kadar doğrudan yayınlar” yaklaşımı gerçek bir ihtiyaca oturur. Fakat mevcut kod hâlâ eski bilet satış/admin paneli mantığı ile yeni self-servis ürün mantığının arasında kalmıştır.

Doğru strateji daha fazla özellik eklemek değildir. Doğru strateji:

1. Güvenlik açıklarını kapatmak,
2. Sahiplik modelini baştan doğru kurmak,
3. PostgreSQL ve DB garantilerine geçmek,
4. 50/51 onay kuralını backend’in tek gerçeği yapmak,
5. Ücretsiz RSVP beta ile gerçek kullanıcı davranışını ölçmek,
6. Gerçek ödeme ve büyük etkinliği ikinci ürün aşamasına bırakmaktır.

> **Özet:** Uygulama çöpe atılacak durumda değildir; fakat şu an production ürünü de değildir. Kod tabanı iyi bir prototiptir. Bu roadmap uygulandığında güvenilir bir self-servis etkinlik platformuna dönüşebilir.

# APP BİLET — MODÜLER GELİŞİM VE OTOMATİK ÇÖZÜM ROADMAP

**Tarih:** 23 Temmuz 2026  
**Ana hedef:** Özellik sayısını artırmak yerine sistemi hızlı, güvenli, işlevsel, sade ve bütün cihazlarda uyumlu hâle getirmek.  
**Çalışma modeli:** Her modül bağımsız olarak `DENETLE → ÖLÇ → DÜZELT → TEST ET → KANITLA → KAPAT` döngüsünden geçer.

---

## 1. Değişmez ürün ilkeleri

1. Yeni özellik, ancak mevcut temel akışlarda P0/P1 hata kalmadığında eklenir.
2. Kullanıcı bir işi en az adımla tamamlamalıdır.
3. Güvenlik kontrolü yalnız role değil, veri sahipliğine dayanmalıdır.
4. Sunucu tarafı bütün kritik kararların tek doğruluk kaynağıdır.
5. Mobil uyumluluk, masaüstü ekranını küçültmek değildir.
6. Ölçülmeyen performans işi tamamlanmış sayılmaz.
7. Test, commit ve ölçüm kanıtı olmayan görev `TAMAMLANDI` yapılamaz.
8. Demo veri, simüle ödeme veya geliştirme bypass'ı production davranışına karışamaz.
9. Aynı işi yapan iki ekran, iki servis veya iki kütüphane varsa sadeleştirme değerlendirilir.
10. Kullanıcı değerine hizmet etmeyen özellik ertelenir veya kaldırılır.

---

## 2. Öncelik sistemi

- **P0 — Kritik:** Yetkisiz erişim, veri sızıntısı, ödeme/rezervasyon bütünlüğü, sistem çökmesi, üretim bypass'ı.
- **P1 — Yüksek:** Yavaşlık, yanlış sonuç, mobilde kullanılamayan ana akış, veri kaybı, yarış koşulu.
- **P2 — Orta:** Kullanım sürtünmesi, görsel tutarsızlık, erişilebilirlik eksikleri, operasyon zorluğu.
- **P3 — Düşük:** Kozmetik iyileştirme ve ertelenebilir özellik.

## 3. Durum değerleri

`BEKLEMEDE` · `DENETLENİYOR` · `İŞLEME ALINDI` · `TESTTE` · `BLOKE` · `TAMAMLANDI` · `ERTELENDİ` · `KALDIRILDI`

Bir görev `TAMAMLANDI` yapılırken şu kanıtlar zorunludur:

- Değişen dosyalar
- Branch ve commit SHA
- Test komutu ve sonucu
- Performans görevi ise önce/sonra ölçümü
- Güvenlik görevi ise negatif yetki testleri
- Mobil görev ise ekran boyutu matrisi
- Bilinen kalan risk

---

# 4. Sistem modülleri

## M0 — Ürün çekirdeği ve kapsam kontrolü

**Amaç:** Ürünün ne yaptığını netleştirmek, özellik şişmesini durdurmak.

**Ana işlevler:**
- Kullanıcı etkinlik oluşturur.
- 50 kişiye kadar doğrudan yayınlar.
- 51+ kapasitede yönetici onayı gerekir.
- Davetli/rezervasyon ve giriş yönetilir.
- Salon planı isteğe bağlıdır.

**Roadmap:**
- [ ] **M0-001 / P0:** Kod ile ürün kurallarının uyum denetimi.
- [ ] **M0-002 / P1:** Kullanılmayan, yarım veya yinelenen özellik envanteri.
- [ ] **M0-003 / P1:** Dinamik fiyat, kupon, puan, Telegram, aggregator ve simüle ödeme özelliklerini çekirdek beta dışına taşı.
- [ ] **M0-004 / P2:** Her ana akış için başarı metriği tanımla.

**Kapanış ölçütü:** Beta kapsamı tek sayfada anlatılabilir ve kullanıcı ilk etkinliğini yardım almadan oluşturabilir.

---

## M1 — Kimlik, oturum ve yetkilendirme

**Amaç:** Kullanıcı kimliğinin güvenilir olması ve herkesin yalnız kendi verisine erişmesi.

**Roadmap:**
- [ ] **M1-001 / P0 / TESTTE:** LOCAL test tokenlarını varsayılan kapalı yap; production'da kesin engelle.
- [ ] **M1-002 / P0 / TESTTE:** JWT içine kullanıcı `id` ekle; issuer, audience ve algoritma doğrulaması uygula.
- [ ] **M1-003 / P0 / TESTTE:** Güvensiz sabit JWT fallback secret kullanımını kaldır.
- [ ] **M1-004 / P0:** Tokenı JavaScript cookie yerine HttpOnly + Secure + SameSite cookie ile yönet.
- [ ] **M1-005 / P0:** Etkinlik, salon, rezervasyon, kupon, QR ve rapor endpointlerinde owner kontrol matrisi.
- [ ] **M1-006 / P1:** Rol değiştirme endpointini kaldır; organizatörlüğü etkinlik sahipliği ile belirle.
- [ ] **M1-007 / P1:** Oturum yenileme, çıkış ve token iptal modeli.
- [ ] **M1-008 / P1:** Socket odalarında kimlik ve etkinlik sahipliği kontrolü.

**Negatif testler:**
- Kullanıcı A, Kullanıcı B'nin etkinliğini göremez/değiştiremez.
- Local token production'da çalışmaz.
- Eksik `id`, yanlış issuer/audience ve farklı secret içeren JWT reddedilir.

---

## M2 — Veritabanı ve veri bütünlüğü

**Amaç:** PostgreSQL üzerinde güvenilir, taşınabilir ve yarış koşullarına dayanıklı veri modeli.

**Roadmap:**
- [ ] **M2-001 / P0:** SQLite/PostgreSQL çelişkisini kaldır; production şemasını PostgreSQL'e sabitle.
- [ ] **M2-002 / P0:** Migration geçmişini temiz ortamda doğrula.
- [ ] **M2-003 / P0:** Para değerlerini `Float` yerine Decimal/kuruş integer modeliyle tut.
- [ ] **M2-004 / P1:** String status alanlarını enum/state-machine yapısına taşı.
- [ ] **M2-005 / P1:** Event/Hall/Reservation sahiplik ilişkilerini zorunlu hâle getir.
- [ ] **M2-006 / P1:** Kritik unique constraint ve index denetimi.
- [ ] **M2-007 / P1:** Yedekleme, geri yükleme ve veri saklama testi.

---

## M3 — Public vitrin ve etkinlik keşfi

**Amaç:** Kullanıcının etkinliği hızlı bulması ve güvenle anlaması.

**Roadmap:**
- [ ] **M3-001 / P0:** API hatasında sahte demo etkinlik göstermeyi kaldır.
- [ ] **M3-002 / P1:** Etkinlik kartlarında gerçek kapak, tarih, yer, fiyat ve kapasite.
- [ ] **M3-003 / P1:** Etkinlik detay başlığını salon adı yerine etkinlik adı yap.
- [ ] **M3-004 / P1:** Tek birincil CTA: `Katıl`, `Koltuk Seç` veya `Bilet Al`.
- [ ] **M3-005 / P2:** SEO, Open Graph, paylaşım önizlemesi ve yapılandırılmış veri.
- [ ] **M3-006 / P2:** Filtre ve arama performansı.

**Hız hedefi:** Mobil LCP ≤ 2,5 sn; kullanıcı etkileşimine hazır olma ≤ 3 sn.

---

## M4 — Etkinlik oluşturma ve 50/51 onay akışı

**Amaç:** En kısa ve hatasız etkinlik oluşturma deneyimi.

**Roadmap:**
- [ ] **M4-001 / P0:** `effectiveCapacity` hesabını yalnız backend yapar.
- [ ] **M4-002 / P0:** 50 ve altı doğrudan yayın; 51+ `PENDING_APPROVAL`.
- [ ] **M4-003 / P0:** Kapasite sonradan 51+'a çıkarsa yayın durdurma.
- [ ] **M4-004 / P1:** Tek rehberli etkinlik sihirbazı.
- [ ] **M4-005 / P1:** Otomatik taslak kaydı ve devam etme.
- [ ] **M4-006 / P1:** Yayından önce özet/doğrulama ekranı.
- [ ] **M4-007 / P2:** Doğum günü, toplantı, düğün ve konser şablonları.

---

## M5 — Salon ve oturma planı

**Amaç:** Profesyonel ama hızlı salon oluşturma; katılımcı için sade koltuk seçimi.

**Roadmap:**
- [ ] **M5-001 / P1:** Üç ayrı tasarım rotasını tek akışta birleştir.
- [ ] **M5-002 / P1:** Piksel yerine metre tabanlı veri modeli.
- [ ] **M5-003 / P1:** Canvas'ı katmanlara ve küçük bileşenlere ayır.
- [ ] **M5-004 / P1:** Çakışma, salon sınırı, koridor ve çıkış doğrulaması.
- [ ] **M5-005 / P1:** Masa/sandalye numaralandırma bütünlüğü.
- [ ] **M5-006 / P2:** Öğeleri kategori bazlı kütüphaneye dönüştür.
- [ ] **M5-007 / P2:** PC tam düzenleme, tablet drawer, telefon hızlı düzenleme.
- [ ] **M5-008 / P2:** Şablon, klonlama, geri al/yinele ve otomatik kayıt.

**Performans hedefi:** 2.000 koltukta sürükleme sırasında ≥ 50 FPS; 10.000 koltukta görüntüleme kullanılabilir olmalı.

---

## M6 — Rezervasyon ve koltuk eşzamanlılığı

**Amaç:** Aynı koltuğun iki kişiye verilmemesi ve yoğunlukta sistemin bozulmaması.

**Roadmap:**
- [ ] **M6-001 / P0:** Redis yoksa koltuklu rezervasyonu güvenli şekilde durdur; sessiz fallback yapma.
- [ ] **M6-002 / P0:** Kilit → rezervasyon → ödeme geçişini atomik/idempotent yap.
- [ ] **M6-003 / P0:** Aynı koltuk için eşzamanlı 100 istek testi.
- [ ] **M6-004 / P1:** Kilit süresi ve geri sayımın sunucu zamanı ile yönetimi.
- [ ] **M6-005 / P1:** Bekleme listesi ve iptal sonrası sıradaki kullanıcı akışı.
- [ ] **M6-006 / P1:** Public rezervasyon detaylarını tahmin edilemez, kısa ömürlü erişim anahtarıyla koru.

---

## M7 — Ödeme, iade ve finansal güvenlik

**Amaç:** Gerçek sağlayıcı olmadan kart verisi toplamamak; ödeme durumunu güvenilir tutmak.

**Roadmap:**
- [ ] **M7-001 / P0:** Simüle kredi kartı formunu production'dan kaldır.
- [ ] **M7-002 / P0:** Kart numarası/CVV'nin uygulama sunucusuna gelmesini engelle.
- [ ] **M7-003 / P0:** Webhook imza doğrulaması, replay koruması ve idempotency.
- [ ] **M7-004 / P0:** Ödeme referans üretimi ve webhook parser formatını eşleştir.
- [ ] **M7-005 / P1:** İade, kısmi iade ve iptal state machine'i.
- [ ] **M7-006 / P1:** Beta aşamasında ücretsiz etkinlik önceliği.
- [ ] **M7-007 / P2:** Gerçek PSP entegrasyonu ayrı modül/PR.

---

## M8 — Bilet, QR ve giriş kontrolü

**Amaç:** Hızlı, çevrimdışı toleranslı ve yetkili giriş kontrolü.

**Roadmap:**
- [ ] **M8-001 / P0:** QR tarama endpointinde etkinlik sahipliği/personel yetkisi.
- [ ] **M8-002 / P0:** Tek kullanımlık ve imzalı bilet doğrulaması.
- [ ] **M8-003 / P1:** Tekrar okutma, iptal bilet ve yanlış etkinlik uyarısı.
- [ ] **M8-004 / P1:** Zayıf bağlantıda kontrollü offline kuyruk.
- [ ] **M8-005 / P1:** Giriş ekranında büyük hedefler ve titreşim/ses geri bildirimi.
- [ ] **M8-006 / P2:** Kapı personeli için sınırlı yetki rolü.

---

## M9 — Yönetim ve kullanıcı panelleri

**Amaç:** Karmaşık tablo yerine görev odaklı yönetim.

**Roadmap:**
- [ ] **M9-001 / P1:** Mobilde yatay tabloları kart görünümüne çevir.
- [ ] **M9-002 / P1:** Alt navigasyonu en fazla 5 ana öğeye indir.
- [ ] **M9-003 / P1:** Kullanıcı ve organizasyon paneli ayrımını kaldır; `Etkinliklerim` merkezli yapı.
- [ ] **M9-004 / P1:** Dashboard'da yalnız karar gerektiren metrikler.
- [ ] **M9-005 / P2:** Filtre, toplu işlem, boş durum ve hata standardı.
- [ ] **M9-006 / P2:** WCAG 2.2 AA ve klavye erişimi.

---

## M10 — Frontend ve backend performansı

**Amaç:** Hızın varsayılan kalite kapısı olması.

**Roadmap:**
- [ ] **M10-001 / P0:** Ana API endpointleri için p50/p95 ölçümü.
- [ ] **M10-002 / P1:** N+1 sorgu, gereksiz include ve eksik pagination denetimi.
- [ ] **M10-003 / P1:** Büyük frontend bileşenlerini böl; gereksiz client componentleri azalt.
- [ ] **M10-004 / P1:** Konva layer/cache/listening optimizasyonu.
- [ ] **M10-005 / P1:** Bundle analizi ve yinelenen kütüphane temizliği.
- [ ] **M10-006 / P1:** Görsel optimizasyonu, route-level loading ve cache politikası.
- [ ] **M10-007 / P2:** 100/500/1.000 eşzamanlı kullanıcı yük testi.

**Hedefler:** API p95 okuma ≤ 400 ms; yazma ≤ 800 ms; hata oranı <%1.

---

## M11 — Altyapı, CI/CD ve gözlemlenebilirlik

**Amaç:** Tekrarlanabilir dağıtım ve sorunları kullanıcıdan önce görme.

**Roadmap:**
- [ ] **M11-001 / P0:** Docker Compose içinde PostgreSQL + Redis + backend + frontend tek gerçek topology.
- [ ] **M11-002 / P0:** Migration deploy başlamadan tamamlanmalı.
- [ ] **M11-003 / P0:** Secret taraması ve dependency audit CI kapısı.
- [ ] **M11-004 / P1 / BLOKE:** Backend test, frontend lint/typecheck/build ve E2E CI. PR #3 run `30014022962` job başlamadan `startup_failure` verdi.
- [ ] **M11-005 / P1:** Health/readiness endpointleri ve bağımlılık durumları.
- [ ] **M11-006 / P1:** Structured log, request ID ve PII maskeleme.
- [ ] **M11-007 / P1:** Sentry sample rate ve alarm eşikleri.
- [ ] **M11-008 / P1:** Yedekleme/geri yükleme tatbikatı ve rollback prosedürü.

---

# 5. Otomatik uygulama sırası

## Dalga A — Üretim güvenlik kapısı

1. M1 kimlik ve sahiplik
2. M7 sahte ödeme/kart toplama
3. M6 rezervasyon eşzamanlılığı
4. M2 PostgreSQL ve veri bütünlüğü
5. M11 secret/CI/deploy kapıları

## Dalga B — Ana işlevsellik

1. M4 etkinlik ve 50/51 akışı
2. M3 public etkinlik deneyimi
3. M8 QR giriş
4. M9 yönetim ve mobil kullanım

## Dalga C — Hız ve tasarım

1. M10 performans bütçeleri
2. M5 salon tasarım motoru
3. Erişilebilirlik ve görsel regresyon

## Dalga D — Ertelenmiş özellikler

Kupon, puan, dinamik fiyat, Telegram, aggregator ve ücretli ödeme yalnız çekirdek beta kapıları geçtikten sonra tekrar değerlendirilir.

---

# 6. AI otomatik çalışma protokolü

AI her çalışma döngüsünde:

1. En düşük numaralı açık P0 görevi seçer.
2. İlgili kaynak dosyaları yeniden okur; eski rapora körü körüne güvenmez.
3. Tek modül ve dar kapsamlı branch açar.
4. Önce negatif test veya başarısızlık kanıtını yazar.
5. En küçük güvenli değişikliği uygular.
6. Unit/integration/build testlerini çalıştırır.
7. Performans görevi ise önce/sonra sonuçlarını kaydeder.
8. Roadmap durumunu ve kanıt alanlarını günceller.
9. Ayrı draft PR açar.
10. Bir P0 kapanmadan aynı modüle yeni özellik eklemez.

## Durma kuralları

- Veri kaybı riski olan migration otomatik uygulanmaz; migration dosyası ve geri dönüş planı hazırlanır.
- Gerçek ödeme sağlayıcısı anahtarı yoksa sahte ödeme yapılmaz; özellik kapalı tutulur.
- Test çalıştırılamadıysa görev `TAMAMLANDI` olmaz.
- Güvenlik problemi belgelendi diye kapanmış sayılmaz; kod ve negatif test gerekir.
- İki başarısız düzeltmeden sonra kök neden yeniden analiz edilir; rastgele yamaya devam edilmez.

---

# 7. İlk aktif çalışma

## M1-P0-AUTH — Kimlik temelini güvenli hâle getir

**Durum:** BLOKE — Kod ve test senaryoları hazır; GitHub Actions job başlamadan `startup_failure` verdi.  
**Branch:** `agent/moduler-denetim-p0-auth-2026-07-23`  
**Draft PR:** `#3`

### Uygulanan kapsam

- LOCAL tokenlar environment flag arkasına alındı.
- Production'da LOCAL token reddediliyor.
- JWT sabit fallback secretı kaldırıldı.
- JWT'ye kullanıcı `id` alanı eklendi.
- JWT issuer/audience/algorithm doğrulaması eklendi.
- Login ekranında local giriş varsayılan gizlendi.
- Eksik kimlik ve yanlış token testleri eklendi.

### Kalan doğrulama

- Backend auth testleri GitHub Actions veya doğrulanmış yerel ortamda çalışmalı.
- Frontend production build çalışmalı.
- CI başlangıç hatasının sebebi çözülmeli.

### Tamamlanma kriteri

- Production varsayılanında local giriş görünmez ve backend kabul etmez.
- İmzalı token `id`, `email`, `role`, `iss`, `aud`, `sub` taşır.
- Yanlış issuer/audience/secret ve eksik id reddedilir.
- Auth testleri ve frontend build geçer.

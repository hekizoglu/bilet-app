# APP BİLET — GENİŞLEME ÖZELLİKLERİ ROADMAP

**Tarih:** 23 Temmuz 2026  
**Kapsam:** Kupon, sadakat puanı, dinamik fiyat, Telegram ve gelecekte eklenecek deneysel özellikler.  
**Ana hedef:** Yeni özellikleri çekirdek rezervasyon, ödeme, güvenlik ve performans akışlarını bozmadan bağımsız, ölçülebilir ve gerektiğinde anında kapatılabilir modüller olarak geliştirmek.

---

## 1. Değişmez kurallar

1. Her genişleme özelliği varsayılan olarak kapalı başlar.
2. Her özellik kendi feature flag ve kill-switch değerine sahip olur.
3. Özellik kapatıldığında çekirdek etkinlik ve rezervasyon akışı çalışmaya devam eder.
4. Fiyat, indirim, puan ve ödeme kararı yalnız backend tarafından verilir.
5. Frontend tarafından gönderilen fiyat, puan bakiyesi, indirim veya yetki bilgisine güvenilmez.
6. Finansal bir özellik transaction, idempotency ve audit log olmadan genel kullanıma açılamaz.
7. Kullanıcı veya organizatör sahipliği doğrulanmadan kampanya oluşturulamaz ya da değiştirilemez.
8. Test, ölçüm ve geri alma planı bulunmayan özellik `TAMAMLANDI` sayılmaz.
9. Mobilde ana akışı zorlaştıran özellik varsayılan ekrandan çıkarılır.
10. Bir özellik hata oranını veya yanıt süresini kalite bütçesinin dışına çıkarırsa otomatik ya da manuel olarak kapatılır.

## 2. Yayın aşamaları

`FİKİR → DENETLENİYOR → İŞLEME ALINDI → TESTTE → KAPALI BETA → %10 YAYIN → %50 YAYIN → GENEL YAYIN`

Her aşamada zorunlu kanıtlar:

- Feature flag ve kill-switch
- Unit, integration ve E2E testi
- Negatif yetki testleri
- Performans önce/sonra ölçümü
- Finansal özelliklerde eşzamanlılık ve idempotency testi
- Mobil, tablet ve PC kontrolü
- Audit log
- Geri alma prosedürü

---

# E0 — Feature flag ve genişleme platformu

**Amaç:** Özellikleri çekirdekten ayırmak ve tek ayarla güvenli biçimde kapatmak.

## Görevler

- [x] **E0-001 / P0 / KODLANDI-TEST BEKLİYOR:** Merkezi backend feature flag kataloğu.
- [x] **E0-002 / P0 / KODLANDI-TEST BEKLİYOR:** Kupon API’sini varsayılan kapalı feature flag arkasına al.
- [x] **E0-003 / P0 / KODLANDI-TEST BEKLİYOR:** Telegram giriş API’sini varsayılan kapalı feature flag arkasına al.
- [ ] **E0-004 / P0:** Kupon, puan ve dinamik fiyat hesaplarını rezervasyon rotasından ayrı servislere çıkar.
- [ ] **E0-005 / P1:** Telegram bildirimlerini ayrı notification servisine çıkar ve ayrı flag kullan.
- [ ] **E0-006 / P1:** Admin için salt-okunur özellik durum ekranı.
- [ ] **E0-007 / P1:** Özellik açma/kapatma audit log’u.
- [ ] **E0-008 / P1:** Kullanıcı, organizasyon ve etkinlik bazlı kademeli yayın.
- [ ] **E0-009 / P1:** Hata oranı, p95 gecikme ve finansal tutarsızlık alarmları.
- [ ] **E0-010 / P2:** Özellik kullanım ve dönüşüm analitiği.

## Ortam değişkenleri

```env
FEATURE_COUPONS_ENABLED=false
FEATURE_LOYALTY_POINTS_ENABLED=false
FEATURE_DYNAMIC_PRICING_ENABLED=false
FEATURE_TELEGRAM_AUTH_ENABLED=false
FEATURE_TELEGRAM_NOTIFICATIONS_ENABLED=false
FEATURE_EXPERIMENTS_ENABLED=false
```

## Kapanış ölçütü

Bir özellik flag ile kapatıldığında hiçbir veri veya fiyat değiştiremez; API açık bir `FEATURE_DISABLED` yanıtı verir ve temel rezervasyon işlemi devam eder.

---

# E1 — Kupon sistemi

**Ürün değeri:** Davetli indirimi, organizatör kampanyası, tanıtım ve kurumsal kodlar.  
**Risk seviyesi:** Yüksek; doğrudan fiyatı ve geliri değiştirir.

## Mevcut durum ve riskler

- Kupon oluşturma, listeleme, pasife alma ve doğrulama rotası mevcut.
- Kupon tüketimi rezervasyon transaction’ının içine gömülü.
- Kodlar global unique; etkinlik bazlı kapsam açık biçimde modellenmemiş.
- İptal ve iade durumunda kullanım hakkının geri verilme politikası tanımlı değil.
- Public doğrulama endpointi yalnız bilgi amaçlı olmalı; nihai fiyat backend checkout sırasında yeniden hesaplanmalı.

## E1.1 Veri modeli ve sahiplik

- [ ] **E1-001 / P0:** Kupona zorunlu `ownerId`, opsiyonel `eventId` ve kapsam türü ekle.
- [ ] **E1-002 / P0:** Başlangıç/bitiş zamanı, aktiflik durumu ve kullanım limiti state machine’i.
- [ ] **E1-003 / P0:** Organizer yalnız kendi etkinliği için kupon oluşturabilir.
- [ ] **E1-004 / P0:** Normalize edilmiş kod ve güvenli unique index.
- [ ] **E1-005 / P1:** Kullanıcı başına, e-posta başına ve etkinlik başına kullanım sınırı.

## E1.2 Fiyat ve transaction güvenliği

- [ ] **E1-006 / P0:** Kupon hesabını tek `pricingService` içinde yap.
- [ ] **E1-007 / P0:** Rezervasyon ve kupon tüketimini aynı serializable transaction içinde tut.
- [ ] **E1-008 / P0:** Aynı kupon için 100 eşzamanlı kullanım testi.
- [ ] **E1-009 / P0:** İdempotency key olmadan aynı checkout tekrar kupon tüketemez.
- [ ] **E1-010 / P0:** Sabit indirimin taban fiyatı aşmasını engelle.
- [ ] **E1-011 / P1:** İptal/iade sonrası kupon kullanım hakkı politikası.

## E1.3 Kullanıcı deneyimi

- [ ] **E1-012 / P1:** Kupon alanını yalnız özellik açık ve etkinlik uygun olduğunda göster.
- [ ] **E1-013 / P1:** İndirim öncesi fiyat, indirim ve nihai tutarı açık göster.
- [ ] **E1-014 / P2:** Organizatör panelinde kullanım ve gelir etkisi raporu.

## Başarı ölçütleri

- Yanlış kuponla fiyat değişimi: 0
- Limit aşımı: 0
- Kupon doğrulama p95: ≤250 ms
- Kupon kaynaklı checkout hata oranı: <%0,5

---

# E2 — Sadakat puanı

**Ürün değeri:** Tekrar katılım ve kullanıcı bağlılığı.  
**Risk seviyesi:** Kritik; para benzeri bakiye üretir ve harcar.

## Mevcut kritik tespit

Rezervasyon isteği public olarak e-posta alıyor ve mevcut akış puanı bu e-postaya göre bulup harcayabiliyor. Kullanıcı giriş yapmadan başka bir e-posta yazarak o hesaba ait puanı kullanmaya çalışabilir. Bu nedenle puan özelliği kimlik bağlantısı tamamlanana kadar kapalı kalmalıdır.

## E2.1 Güvenli bakiye modeli

- [ ] **E2-001 / P0:** Puanı e-posta yerine doğrulanmış `userId` ile bağla.
- [ ] **E2-002 / P0:** Giriş yapmayan kullanıcı puan göremez veya harcayamaz.
- [ ] **E2-003 / P0:** Float bakiye yerine integer puan kullan.
- [ ] **E2-004 / P0:** Tek bakiye alanı yerine değiştirilemez `PointsLedger` hareket tablosu.
- [ ] **E2-005 / P0:** Her kazanım/harcama için idempotency key.
- [ ] **E2-006 / P0:** Negatif bakiye ve çift harcamayı database constraint ile engelle.

## E2.2 Kazanım ve harcama kuralları

- [ ] **E2-007 / P1:** Onaylanmış ödeme tamamlanmadan puan verme.
- [ ] **E2-008 / P1:** İade/iptalde ters kayıt oluştur; geçmiş hareketi silme.
- [ ] **E2-009 / P1:** Kazanım oranını sistem ayarı yap ve üst sınır koy.
- [ ] **E2-010 / P1:** Bir siparişte kullanılabilecek azami puan oranı.
- [ ] **E2-011 / P1:** Süre sonu ve bilgilendirme politikası.
- [ ] **E2-012 / P2:** Promosyon puanı ile satın alma puanını ayrı türlerde tut.

## E2.3 Arayüz

- [ ] **E2-013 / P1:** Bakiye ve hareket geçmişi.
- [ ] **E2-014 / P1:** Checkout’ta kullanılacak puanı kullanıcı seçer; backend tekrar doğrular.
- [ ] **E2-015 / P2:** Yaklaşan puan son kullanım bildirimi.

## Başarı ölçütleri

- Negatif bakiye: 0
- Çift puan kazanımı/harcaması: 0
- Ledger ile bakiye farkı: 0
- Puan işlemi p95: ≤300 ms

---

# E3 — Dinamik fiyat

**Ürün değeri:** Talebe göre gelir optimizasyonu ve erken alım teşviki.  
**Risk seviyesi:** Kritik; kullanıcı güveni ve tüketici şeffaflığını etkiler.

## Mevcut kritik tespit

Müsaitlik endpointi dinamik fiyat hesaplayabiliyor; ancak rezervasyon oluşturma akışı ödeme detayını temel etkinlik fiyatından başlatıyor. Kullanıcının gördüğü fiyat ile kaydedilen/tahsil edilen fiyat farklı olabilir. Özellik bu fark giderilene kadar kapalı kalmalıdır.

## E3.1 Tek fiyat motoru

- [ ] **E3-001 / P0:** Fiyat hesabını tek saf `pricingService` fonksiyonuna taşı.
- [ ] **E3-002 / P0:** Müsaitlik, checkout, ödeme, rapor ve iade aynı fiyat sonucunu kullanır.
- [ ] **E3-003 / P0:** Hesap sonucunda `basePrice`, `dynamicAdjustment`, `discount`, `points`, `finalPrice` ayrı tutulur.
- [ ] **E3-004 / P0:** Fiyat snapshot’ı rezervasyona kaydedilir.
- [ ] **E3-005 / P0:** Fiyat belirli süre için imzalı quote token ile kilitlenir.
- [ ] **E3-006 / P0:** Kullanıcı fiyat değişimini onaylamadan checkout tamamlanamaz.

## E3.2 Kural ve şeffaflık

- [ ] **E3-007 / P1:** Taban ve azami fiyat zorunlu.
- [ ] **E3-008 / P1:** Ani artışı sınırlayan maksimum adım yüzdesi.
- [ ] **E3-009 / P1:** Fiyat değişikliği nedeni ve geçerlilik süresi kullanıcıya gösterilir.
- [ ] **E3-010 / P1:** Etkinlik yayınlandıktan sonra kural değişikliği audit log’a yazılır.
- [ ] **E3-011 / P2:** A/B testi yalnız açık kullanıcı onayı ve deney flag’i ile.

## Test matrisi

- %0, eşik altı, eşik noktası, %75 ve %100 doluluk
- Kapasite sıfır veya eksik
- `maxPrice < basePrice`
- Eşzamanlı satışlar
- Kupon + puan + dinamik fiyat birleşimi
- Fiyat quote süresinin dolması

## Başarı ölçütleri

- Görülen ve ödenen fiyat farkı: 0
- Finansal yuvarlama farkı: 0
- Fiyat hesaplama p95: ≤100 ms

---

# E4 — Telegram

**Ürün değeri:** Organizatöre hızlı rezervasyon bildirimi ve isteğe bağlı Telegram Mini App girişi.  
**Risk seviyesi:** Yüksek; kimlik, bot tokenı ve kişisel veri içerir.

## Mevcut kritik tespitler

- Telegram auth rotasında fallback bot tokenı ve fallback JWT secretı bulunuyordu.
- Telegram JWT süresi 30 gündü ve ana web auth sözleşmesinden farklıydı.
- Bildirim kodu rezervasyon rotasına gömülü.
- Mesajlarda müşteri adı, e-posta, telefon ve ödeme referansı yer alabiliyor.

## E4.1 Telegram kimlik doğrulama

- [x] **E4-001 / P0 / KODLANDI-TEST BEKLİYOR:** Telegram auth varsayılan kapalı feature flag arkasında.
- [x] **E4-002 / P0 / KODLANDI-TEST BEKLİYOR:** Fallback JWT secret kaldırıldı; ortak JWT sözleşmesi kullanıldı.
- [x] **E4-003 / P0 / KODLANDI-TEST BEKLİYOR:** Hash karşılaştırmasında timing-safe kontrol ve auth_date süresi.
- [ ] **E4-004 / P0:** Telegram hesabını mevcut kullanıcıya doğrulanmış bağlama akışı.
- [ ] **E4-005 / P0:** Tek Telegram kimliği birden fazla hesaba bağlanamaz.
- [ ] **E4-006 / P1:** Bağlantıyı kaldırma ve oturum iptal etme.

## E4.2 Bildirim servisi

- [ ] **E4-007 / P0:** Telegram bildirimini rezervasyon rotasından çıkar.
- [ ] **E4-008 / P0:** Organizatör yalnız kendi etkinlik bildirimini alır.
- [ ] **E4-009 / P0:** Bot tokenlarını secret store/encryption ile sakla.
- [ ] **E4-010 / P1:** PII minimizasyonu; varsayılan mesajda telefon ve tam e-posta gösterme.
- [ ] **E4-011 / P1:** Retry, dead-letter queue ve rate-limit.
- [ ] **E4-012 / P1:** Bildirim tercihi ve sessiz saatler.
- [ ] **E4-013 / P2:** Telegram üzerinden salt-okunur etkinlik özeti.

## Başarı ölçütleri

- Yetkisiz chat’e bildirim: 0
- Bildirim teslim başarısı: ≥%99
- Rezervasyon yanıt süresine eklenen süre: 0; bildirim asenkron olmalı

---

# E5 — Yeni özellik kabul sistemi

**Amaç:** Yeni fikirleri doğrudan ürüne eklemek yerine değer/risk filtresinden geçirmek.

## Değer puanı

Her fikir 0–5 arasında puanlanır:

- Kullanıcı problemi ne kadar güçlü?
- Ana etkinlik oluşturma/katılım akışına katkısı?
- Gelir veya maliyet etkisi?
- Kullanım sıklığı?
- Rakiplerden farklılaştırma?

## Risk puanı

- Güvenlik ve gizlilik
- Finansal bütünlük
- Teknik karmaşıklık
- Performans maliyeti
- Mobil kullanım sürtünmesi
- Operasyon ve destek yükü

## Karar

```text
Değer yüksek + risk düşük  → Yakın roadmap
Değer yüksek + risk yüksek → Kontrollü prototip
Değer düşük + risk düşük   → Backlog
Değer düşük + risk yüksek  → Reddedilir
```

## Görevler

- [ ] **E5-001 / P1:** Standart özellik öneri şablonu.
- [ ] **E5-002 / P1:** Metrik ve başarı kriteri olmadan geliştirmeye başlamama kapısı.
- [ ] **E5-003 / P1:** Deneysel özellikler için ayrı `FEATURE_EXPERIMENTS_ENABLED` flag’i.
- [ ] **E5-004 / P2:** Kullanıcı geri bildirimi ve kullanım analitiği.
- [ ] **E5-005 / P2:** Kullanılmayan özelliği otomatik kaldırma değerlendirmesi.

---

# 3. Uygulama sırası

## Dalga 1 — İzolasyon ve güvenlik

1. E0 feature flag altyapısı
2. E2 puan özelliğini güvenli kullanıcı kimliğine bağlayana kadar kapatma
3. E3 tek fiyat motoru
4. E1 kupon sahipliği ve transaction güvenliği
5. E4 Telegram auth ve bildirim ayrıştırması

## Dalga 2 — Kapalı beta

1. Kupon: yalnız seçilmiş ücretsiz/test etkinlikleri
2. Telegram bildirim: yalnız seçilmiş organizatörler
3. Puan: küçük kullanıcı grubu, gerçek para karşılığı sınırlı
4. Dinamik fiyat: önce yalnız fiyat önerisi, otomatik uygulama yok

## Dalga 3 — Kademeli yayın

Her özellik sırasıyla `%10 → %25 → %50 → %100` kullanıcı oranıyla açılır. Her adımda en az şu metrikler izlenir:

- Hata oranı
- API p95
- Checkout terk oranı
- Finansal tutarsızlık
- Destek talebi
- Mobil başarı oranı

---

# 4. İlk aktif çalışma

**Durum:** TESTTE  
**Kapsam:** Merkezi feature flag kataloğu, kupon API kill-switch’i, Telegram auth kill-switch’i, ortak JWT güvenliği ve temel unit testleri.  
**Dal:** Kullanıcı talebi doğrultusunda doğrudan `main`.

## Kalan doğrulama

- Backend unit/integration testleri çalışmalı.
- GitHub Actions başlangıç sorunu çözülmeli.
- Özellikler varsayılan environment değerleriyle kapalı doğrulanmalı.
- Kupon ve Telegram endpointleri kapalıyken `FEATURE_DISABLED` dönmeli.

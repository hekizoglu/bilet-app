# APP BİLET — SELF-SERVİS ETKİNLİK ROADMAP

**Durum:** Yeni ürün modeli aktif  
**Son güncelleme:** 2026-07-16  
**Ana ürün kararı:** Her kayıtlı kullanıcı kendi etkinliğini oluşturabilir ve kendi etkinliğinin organizatörüdür. Ayrı bir organizatör onayı gerekmez. Yalnızca etkinliğin doğrulanmış kapasitesi 50 kişiyi/sandalyeyi geçtiğinde etkinlik yönetici onayına düşer.

---

# 1. Ürün vizyonu

App Bilet; kullanıcıların doğum günü, nişan, düğün, piknik, toplantı, mezuniyet, sınıf buluşması, spor etkinliği, konser ve benzeri organizasyonlarını oluşturabildiği; davetlilerini, sandalyelerini, biletlerini ve girişlerini yönetebildiği self-servis etkinlik platformudur.

> Kullanıcı kayıt olur, etkinliğini oluşturur, davet bağlantısını paylaşır ve kendi etkinliğini yönetir. 50 kişiye kadar sistem otomatik çalışır. 50 kişi aşıldığında yalnızca yayın/onay kontrolü devreye girer.

---

# 2. Değişmez ürün kuralları

## 2.1 Her kullanıcı organizatör olabilir

- Kayıtlı her kullanıcı etkinlik oluşturabilir.
- Kullanıcının ayrıca organizatör başvurusu yapmasına gerek yoktur.
- Kullanıcı kendi etkinliklerinde organizatör yetkisine sahiptir.
- Kullanıcı yalnızca kendi etkinliklerini, davetlilerini, rezervasyonlarını, salonlarını ve raporlarını yönetebilir.
- Başka kullanıcının etkinlik verilerine erişemez.
- `CUSTOMER → ORGANIZER` şeklinde genel ve tehlikeli bir rol yükseltme akışı kullanılmaz.
- Organizatörlük bir platform rolünden çok, etkinlik sahipliği üzerinden belirlenen yetkidir.

## 2.2 Onay eşiği

Etkinliğin etkin kapasitesi **50 veya daha azsa**:

- Yönetici onayı gerekmez.
- Kullanıcı etkinliği doğrudan yayınlayabilir.
- Özel veya herkese açık oluşturabilir.
- Davet bağlantısı ve QR kod oluşturabilir.
- Katılımcılarını ve girişlerini yönetebilir.

Etkinliğin etkin kapasitesi **51 veya daha fazlaysa**:

- Etkinlik taslak olarak oluşturulabilir.
- Kullanıcı bütün bilgileri ve salon planını hazırlayabilir.
- Ancak etkinlik yönetici onayı olmadan yayınlanamaz.
- Durum `PENDING_APPROVAL` olur.
- Yönetici onayından sonra yayınlanır.

## 2.3 Etkin kapasite hesabı

Backend aşağıdaki değeri tek kaynak olarak hesaplar:

```text
Koltuklu etkinlik:
effectiveCapacity = salon planındaki gerçek sandalye/koltuk sayısı

Genel giriş etkinliği:
effectiveCapacity = kullanıcının belirlediği kapasite
```

Frontend tarafından gönderilen sandalye sayısına doğrudan güvenilmez. Salon planı backend tarafından ayrıştırılır ve gerçek sandalye sayısı hesaplanır.

## 2.4 Sonradan kapasite artırma

- 50 veya altındaki yayınlanmış etkinlik 51 ve üzerine çıkarılırsa mevcut yayın durdurulur.
- Etkinlik `PENDING_APPROVAL` durumuna alınır.
- Eski davet bağlantısı etkinliği göstermeye devam edebilir ancak yeni rezervasyon kabul etmez.
- Kullanıcıya şu mesaj gösterilir:

> Etkinlik kapasitesi 50 kişiyi geçtiği için yayınlanmadan önce yönetici onayı gerekmektedir.

- Kapasite yeniden 50 veya altına düşürülürse ve etkinlik daha önce güvenlik nedeniyle reddedilmediyse otomatik yayınlanabilir.

---

# 3. Yetki modeli

## USER

Her kayıtlı kullanıcıdır.

- Etkinlik oluşturabilir.
- Kendi etkinliğinin organizatörüdür.
- Kendi salonunu ve sandalye düzenini oluşturabilir.
- Kendi katılımcılarını görebilir.
- Kendi QR giriş ekranını kullanabilir.
- Kendi etkinliğini iptal edebilir.
- Kendi etkinliğini düzenleyebilir.
- Başkasının verisini göremez.

## ADMIN

- 50 kişi üzerindeki etkinlikleri inceler.
- Etkinliği onaylar veya gerekçeli olarak reddeder.
- Şikâyet edilen etkinlikleri inceler.
- Etkinliği askıya alabilir.
- Sistem genel ayarlarını yönetir.
- Denetim kayıtlarına erişebilir.

## Kritik sahiplik kuralı

Bütün korumalı endpointlerde yalnızca rol kontrolü yapılması yeterli değildir.

```text
ADMIN ise erişebilir.
Etkinliğin ownerId değeri req.user.id ile aynıysa erişebilir.
Aksi durumda 403 döner.
```

Bu kontrol etkinlik, salon, rezervasyon, katılımcı, rapor, kupon, QR ve ödeme işlemlerinin tamamında uygulanır.

---

# FAZ 0 — KRİTİK GÜVENLİK VE VERİ İZOLASYONU

**Öncelik:** P0  
**Amaç:** Yeni özellik eklemeden önce mevcut güvenlik açıklarını kapatmak.

- [ ] Production ortamında bütün `LOCAL_*` test tokenlarını devre dışı bırak.
- [ ] Kullanıcının kendisini genel `ORGANIZER` rolüne yükselttiği endpointi kaldır veya yeni sahiplik modeline göre değiştir.
- [ ] JWT içine `userId`, `email`, `role` ve `tokenVersion` ekle.
- [ ] JWT üretimini tek bir auth servisinde birleştir.
- [ ] Bütün etkinlik sorgularına `ownerId` filtresi ekle.
- [ ] Bütün salon sorgularına sahiplik kontrolü ekle.
- [ ] Bütün rezervasyon ve rapor sorgularını etkinlik sahibi ile sınırla.
- [ ] Organizatörün başka kullanıcıların rezervasyonlarını onaylamasını engelle.
- [ ] Organizatörün başka etkinliğe ait QR bileti okutmasını engelle.
- [ ] Production ortamında sahte kredi kartı ödeme endpointini kapat.
- [ ] İmzasız banka webhook endpointini kapat.
- [ ] Kod içine gömülmüş SMTP bilgilerini kaldır ve secretları yenile.
- [ ] Ortak Prisma istemcisini istek içinde kapatan `$disconnect()` çağrılarını kaldır.
- [ ] Prisma production şemasını PostgreSQL üzerinde doğrula.
- [ ] Frontend API URL yapısını tek standarda geçir.
- [ ] Production ortamında debug endpointlerini kapat.

**Tamamlanma kriteri:** Bir kullanıcı başka kullanıcıya ait hiçbir etkinlik, salon, rezervasyon veya rapora erişemez.

---

# FAZ 1 — SAHİPLİK VE ONAY VERİ MODELİ

**Öncelik:** P0

## Event modeline eklenecek/güncellenecek alanlar

```text
ownerId              String
capacity             Int?
effectiveCapacity    Int
approvalStatus       NOT_REQUIRED | PENDING_APPROVAL | APPROVED | REJECTED | SUSPENDED
approvalReason       String?
approvedAt           DateTime?
approvedById         String?
submittedForApprovalAt DateTime?
publishedAt          DateTime?
```

## Hall modeline eklenecek alanlar

```text
ownerId              String?
isGlobal             Boolean
calculatedSeatCount  Int
```

Kurallar:

- Kullanıcının oluşturduğu salon `ownerId` ile kullanıcıya bağlanır.
- Global salonları yalnızca admin oluşturur ve düzenler.
- Kullanıcı kendi salonlarını ve global salonları kullanabilir.
- Kullanıcı başka kullanıcının özel salonunu göremez veya düzenleyemez.
- `effectiveCapacity` her kaydetme ve yayınlama işleminde backend tarafından yeniden hesaplanır.

## Onay karar servisi

Tek bir merkezi fonksiyon oluşturulmalıdır:

```text
evaluateApprovalRequirement(event, hallLayout)
```

Beklenen sonuç:

```text
{
  effectiveCapacity: 48,
  requiresApproval: false,
  approvalStatus: "NOT_REQUIRED"
}
```

veya:

```text
{
  effectiveCapacity: 120,
  requiresApproval: true,
  approvalStatus: "PENDING_APPROVAL"
}
```

**Tamamlanma kriteri:** Kapasite kuralı frontendden bağımsız ve yalnızca backend tarafından uygulanır.

---

# FAZ 2 — ETKİNLİK OLUŞTURMA SİHİRBAZI

**Öncelik:** P0  
**Amaç:** Her kullanıcının birkaç dakika içinde etkinlik oluşturabilmesi.

## Adım 1 — Etkinlik türü

- Doğum günü
- Nişan
- Düğün
- Piknik
- Parti
- Toplantı
- Mezuniyet
- Spor etkinliği
- Konser
- Diğer

## Adım 2 — Temel bilgiler

- Etkinlik adı
- Açıklama
- Kapak görseli
- Tarih
- Başlangıç saati
- Bitiş saati
- Özel veya herkese açık seçimi

## Adım 3 — Katılım düzeni

Kullanıcı iki seçenekten birini seçer:

### Sandalyeli/koltuklu

- Hazır salon seçebilir.
- Kendi salon planını oluşturabilir.
- Masa ve sandalye ekleyebilir.
- Sistem gerçek sandalye sayısını otomatik hesaplar.

### Genel giriş

- Katılımcı kapasitesini manuel girer.

## Adım 4 — Onay durumu gösterimi

Kapasite 50 veya altındaysa:

> Etkinliğiniz yönetici onayı gerektirmiyor. Hemen yayınlayabilirsiniz.

Kapasite 51 veya üzerindeyse:

> Etkinliğiniz 50 kişiyi geçtiği için yayınlanmadan önce yönetici onayına gönderilecektir.

Kullanıcıya onay şartı son adımda sürpriz olarak gösterilmez. Sandalye sayısı 51’e ulaştığı anda salon tasarım ekranında uyarı gösterilir.

## Adım 5 — Önizleme ve yayın

- Davet sayfası önizlemesi
- Kapasite özeti
- Onay durumu
- Davet bağlantısı
- QR davetiye
- WhatsApp paylaşımı

**Tamamlanma kriteri:** Kullanıcı 50 kişilik doğum gününü hiçbir admin işlemi olmadan yayınlayabilir.

---

# FAZ 3 — 50 ÜZERİ ETKİNLİK ONAY AKIŞI

**Öncelik:** P0

## Kullanıcı akışı

1. Kullanıcı etkinliği oluşturur.
2. Sistem kapasiteyi 51 veya üzeri hesaplar.
3. Kullanıcı taslak üzerinde çalışmaya devam eder.
4. “Onaya Gönder” butonuna basar.
5. Etkinlik `PENDING_APPROVAL` olur.
6. Etkinlik bilgileri onay beklerken kilitlenmez; ancak kapasite, tarih, salon veya içerik değişirse başvuru güncellenir.
7. Admin onaylarsa etkinlik yayınlanır.
8. Admin reddederse gerekçe kullanıcıya gösterilir.
9. Kullanıcı düzeltip yeniden onaya gönderebilir.

## Admin inceleme ekranı

- Etkinlik adı
- Etkinlik sahibi
- Tarih ve saat
- Mekân
- Kapasite
- Gerçek sandalye sayısı
- Salon planı önizlemesi
- Etkinlik açıklaması
- İletişim bilgisi
- Önceki etkinlikler
- Şikâyet geçmişi
- Onayla
- Gerekçeli reddet
- Askıya al

## Durumlar

```text
DRAFT
NOT_REQUIRED
PENDING_APPROVAL
APPROVED
REJECTED
SUSPENDED
CANCELLED
COMPLETED
```

**Tamamlanma kriteri:** 51 kişilik etkinlik onaysız yayınlanamaz; 50 kişilik etkinlik onaya düşmez.

---

# FAZ 4 — DAVET VE KATILIM YÖNETİMİ

**Öncelik:** P0

- [x] Özel davet bağlantısı oluştur.
- [x] QR davetiye oluştur.
- [x] WhatsApp paylaşım metni oluştur.
- [x] `Katılıyorum`, `Katılamıyorum`, `Kararsızım` cevaplarını ekle.
- [x] Yanında getirilecek kişi sayısını destekle.
- [x] Çocuk katılım sayısını destekle.
- [x] Katılımcı notlarını destekle.
- [x] Organizatöre toplam katılımcı sayısını göster.
- [x] Onaylanan kişi sayısının kapasiteyi geçmesini engelle.
- [x] Kapasite dolunca bekleme listesi aç.
- [x] Davet bağlantısını yenileme özelliği ekle.
- [x] Adresi yalnızca katılımı kabul edenlere gösterme seçeneği ekle.

**Tamamlanma kriteri:** Kullanıcı doğum gününü WhatsApp yerine App Bilet üzerinden düzenli biçimde yönetebilir.

---

# FAZ 5 — KULLANICI ETKİNLİK PANELİ

**Öncelik:** P1

Her kullanıcının panelinde şunlar bulunmalıdır:

- [x] Etkinliklerim
- [x] Yeni etkinlik oluştur
- [x] Taslaklar
- [x] Onay bekleyenler
- [x] Yayındaki etkinlikler
- [x] Geçmiş etkinlikler
- [x] Katılımcılar
- [x] Davet bağlantıları
- [x] QR giriş
- [x] Duyurular
- [x] Salonlarım
- [x] İstatistikler

Bu panel “admin paneli” olarak adlandırılmamalıdır. Kullanıcının kendi organizasyon alanı olmalıdır.

**Tamamlanma kriteri:** Kullanıcı yalnızca kendi etkinliklerini tek panelden yönetebilir.

---

# FAZ 6 — QR GİRİŞ VE KAPI KONTROLÜ

**Öncelik:** P1

- [ ] Her katılımcıya benzersiz QR kod üret.
- [ ] QR kodu yalnızca etkinlik sahibi veya onun yetkilendirdiği görevli okutabilsin.
- [ ] Görevli yetkilendirme modeli ekle.
- [ ] Aynı QR kodun ikinci kullanımını atomik olarak engelle.
- [ ] Yanlış etkinliğe ait QR kodu reddet.
- [ ] Manuel isim arama ve giriş desteği ekle.
- [ ] Offline giriş listesi ve sonradan eşitleme ekle.
- [ ] Eşitleme çakışmalarını denetim kaydına yaz.

**Tamamlanma kriteri:** Etkinlik sahibi telefonuyla kendi etkinliğinin girişini güvenilir şekilde yönetebilir.

---

# FAZ 7 — BİLDİRİM VE HATIRLATMA

**Öncelik:** P1

- [ ] Davet gönderildi bildirimi
- [ ] Katılım cevabı değişti bildirimi
- [ ] Etkinliğe 24 saat kaldı bildirimi
- [ ] Etkinliğe 2 saat kaldı bildirimi
- [ ] Etkinlik bilgileri değişti bildirimi
- [ ] Etkinlik iptal edildi bildirimi
- [ ] 50 kişi sınırına yaklaşıldı uyarısı
- [ ] 50 kişi aşıldı ve onay gerekiyor bildirimi
- [ ] Onaylandı bildirimi
- [ ] Reddedildi ve gerekçe bildirimi

Bildirimler uygulama içi ve e-posta ile başlamalı; SMS daha sonra ücretli özellik olabilir.

---

# FAZ 8 — ŞİKÂYET, DENETİM VE GÜVEN

**Öncelik:** P1

50 kişi altındaki etkinlikler onaysız olsa da platform denetimsiz değildir.

- [ ] Etkinliği şikâyet et butonu ekle.
- [ ] Şikâyet kategorileri ekle.
- [ ] Etkinliği askıya alma özelliği ekle.
- [ ] Kullanıcıya itiraz hakkı ekle.
- [ ] Yasaklı içerik ve bağlantı kontrolü ekle.
- [ ] Seri etkinlik ve spam sınırları ekle.
- [ ] Bütün admin müdahalelerini audit loga yaz.
- [ ] Özel etkinlikleri arama motorlarından gizle.
- [ ] Davet bağlantısı tahmin edilemez ve yenilenebilir olsun.

---

# FAZ 9 — BETA TESTİ

**Öncelik:** P0

## Test senaryoları

1. Kullanıcı 20 kişilik doğum günü oluşturur ve doğrudan yayınlar.
2. Kullanıcı 50 sandalyeli salon oluşturur ve doğrudan yayınlar.
3. Kullanıcı 51. sandalyeyi eklediğinde anında onay uyarısı görür.
4. 51 kişilik etkinlik yayınlanamaz ve onaya gönderilir.
5. Admin etkinliği onaylar ve yayın açılır.
6. Admin etkinliği gerekçeli reddeder; kullanıcı düzenleyip yeniden gönderir.
7. 40 kişilik yayınlanmış etkinlik 70 kişiye çıkarıldığında satış/davet kabulü durur ve onaya düşer.
8. Kullanıcı başka kullanıcının etkinliğine erişemez.
9. Etkinlik sahibi QR giriş yapabilir; başka kullanıcı yapamaz.
10. Aynı QR kod ikinci kez kullanılamaz.

## Başarı ölçütleri

- Etkinlik oluşturma süresi 3 dakikanın altında
- 50 kişi altındaki etkinliklerde admin müdahalesi sıfır
- 50 üzeri etkinliklerde onaysız yayın oranı sıfır
- Kullanıcılar arası veri sızıntısı sıfır
- Kritik ödeme ve auth açığı sıfır
- Mobil oluşturma tamamlama oranı en az %65

---

# FAZ 10 — GELİR MODELİ

İlk sürümde 50 kişiye kadar etkinlik oluşturma ücretsizdir.

## Ücretsiz

- 50 kişiye kadar etkinlik
- Etkinlik oluşturma
- Davet bağlantısı
- RSVP
- QR davetiye
- Temel giriş kontrolü
- Temel katılımcı raporu

## Plus

- Premium davetiye temaları
- Fotoğraf albümü
- Gelişmiş hatırlatma
- SMS gönderimi
- Masa planı çıktısı
- Gelişmiş rapor
- Özel bağlantı adı
- Reklamsız etkinlik sayfası

## Büyük etkinlik

- 50 kişi üzeri kapasite
- Yönetici onayı
- Profesyonel salon araçları
- Ücretli bilet ve gerçek ödeme altyapısı
- İade ve finansal raporlama
- Platform komisyonu veya etkinlik başına ücret

Not: 50 üzeri etkinliğin onaya tabi olması, mutlaka ücretli olması anlamına gelmez. Onay ve ücretlendirme birbirinden ayrı kavramlardır.

---

# UYGULAMA SIRASI

| Sıra | Faz | Öncelik |
|---:|---|---|
| 1 | Kritik güvenlik ve izolasyon | P0 |
| 2 | Sahiplik ve onay veri modeli | P0 |
| 3 | Etkinlik oluşturma sihirbazı | P0 |
| 4 | 50 üzeri onay akışı | P0 |
| 5 | Davet ve katılım yönetimi | P0 |
| 6 | Kullanıcı etkinlik paneli | P1 |
| 7 | QR giriş | P1 |
| 8 | Bildirimler | P1 |
| 9 | Şikâyet ve denetim | P1 |
| 10 | Beta testi | P0 |
| 11 | Gelir modeli ve büyük etkinlikler | P2 |

---

# İLK BETA YAYIN TANIMI

App Bilet Beta aşağıdakiler tamamlandığında yayınlanabilir:

- Her kullanıcı etkinlik oluşturabiliyor.
- Her kullanıcı kendi etkinliğinin organizatörü olabiliyor.
- 50 kişi ve altındaki etkinlikler otomatik yayınlanabiliyor.
- 51 kişi ve üzerindeki etkinlikler onaya düşüyor.
- Gerçek sandalye sayısı backend tarafından hesaplanıyor.
- Kullanıcı yalnızca kendi etkinlik ve katılımcı verilerini görebiliyor.
- Davet bağlantısı, RSVP ve QR giriş çalışıyor.
- Admin onay ve ret ekranı çalışıyor.
- Sahte ödeme ve test auth açıkları production ortamında kapalı.
- PostgreSQL, CI ve uçtan uca testler gerçek ortamda başarılı.

---

# SON ÜRÜN CÜMLESİ

> App Bilet’te herkes kendi etkinliğinin organizatörüdür. 50 kişiye kadar doğrudan yayınlar; 50 kişiyi aşan etkinlikler güvenlik ve operasyon kontrolü için onaya gönderilir.

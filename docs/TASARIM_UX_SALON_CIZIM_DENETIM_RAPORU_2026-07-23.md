# APP BİLET — TASARIM, UX VE SALON ÇİZİM SİSTEMİ DENETİM RAPORU

> **Belge türü:** Statik kod denetimi + ürün tasarımı + salon çizim standardı + PC/telefon uyumluluk roadmap’i  
> **Repo:** `hekizoglu/bilet-app`  
> **İncelenen dal:** `main`  
> **Tarih:** 23 Temmuz 2026  
> **Kapsam:** Public sayfalar, etkinlik oluşturma, salon çizim aracı, koltuk seçimi, kullanıcı paneli, yönetim paneli, ödeme ekranı, erişilebilirlik ve görsel performans  
> **Not:** Bu denetim kod üzerinden yapılmıştır. Gerçek cihaz ekran görüntüsü, Lighthouse, Playwright görsel karşılaştırması ve kullanıcı testi ayrıca yapılmalıdır.

---

# 0. NET SONUÇ

App Bilet’in görsel altyapısı kullanılabilir bir prototip seviyesindedir; ancak henüz tek ve tutarlı bir tasarım sistemine sahip değildir. Salon tasarımcısında doğru teknik temel olan React Konva kullanılmış, masa, sandalye, sahne, dans pisti, giriş ve acil çıkış gibi ana elemanlar eklenmiştir. Buna rağmen profesyonel etkinlik planlama aracı olabilmesi için aşağıdaki eksikler kapatılmalıdır:

- Tasarım ekranları tek akışta birleştirilmeli.
- PC, tablet ve telefon için aynı ekranı küçültmek yerine üç ayrı etkileşim seviyesi tasarlanmalı.
- Salon planı piksel değil gerçek ölçü üzerinden çalışmalı.
- Öğeler kategori bazlı profesyonel bir kütüphaneye dönüştürülmeli.
- Çakışma, koridor, çıkış, kapasite ve erişilebilirlik kontrolleri çizim sırasında yapılmalı.
- Mobil yönetim ekranları yatay kayan tablolardan kart tabanlı görünüme geçmeli.
- Public etkinlik sayfası “salon adı + form” görünümünden gerçek etkinlik vitrini görünümüne geçmeli.
- Bütün sayfalar ortak buton, form, kart, rozet, modal, hata ve yükleme bileşenlerini kullanmalı.
- Canvas performansı büyük salonlarda katmanlama, önbellekleme ve görünürlük optimizasyonu ile korunmalı.

## Tasarım hazırlık puanı

| Alan | Puan / 100 | Karar |
|---|---:|---|
| Görsel kimlik | 45 | Sayfalar arasında tutarsız |
| Public etkinlik deneyimi | 40 | Temel akış var, vitrin zayıf |
| Etkinlik oluşturma | 50 | Form var, rehberli akış parçalı |
| Salon çizim motoru | 55 | İyi prototip, profesyonel doğrulama eksik |
| Koltuk seçimi | 60 | Liste ve harita var, mobil sadeleştirme gerekli |
| Yönetim paneli masaüstü | 55 | Çalışır, bilgi mimarisi iyileştirilmeli |
| Yönetim paneli mobil | 25 | Tablo ve menü yoğunluğu yüksek |
| Erişilebilirlik | 30 | Sistematik WCAG uygulaması görünmüyor |
| Görsel performans | 45 | Büyük planlarda risk var |
| Genel UI/UX hazırlığı | **45** | Beta öncesi tasarım fazı gerekli |

---

# 1. DEĞİŞMEZ TASARIM KARARLARI

## 1.1 Üç cihaz seviyesi

### Masaüstü — Tam profesyonel düzenleme

- Tüm öğe kütüphanesi gösterilir.
- Hassas sürükleme, ölçülendirme, çoklu seçim ve klavye kısayolları aktiftir.
- Katmanlar, özellik paneli, mini harita ve doğrulama paneli aynı anda görülebilir.
- 1280 px ve üzeri ana hedef olmalıdır.

### Tablet — Tam işlev, sadeleştirilmiş panel

- Canvas tam işlevli olabilir.
- Sol öğe kütüphanesi açılır panel olmalıdır.
- Sağ özellik paneli bottom sheet veya açılır drawer olmalıdır.
- Kalem kullanımına uygun tutamaçlar sunulmalıdır.
- 768–1279 px ana hedef olmalıdır.

### Telefon — Sihirbaz ve hızlı düzenleme

- Telefon üzerinde karmaşık serbest çizim varsayılan akış olmamalıdır.
- Kullanıcı hazır şablon seçmeli, kapasite ve ölçü girmeli, otomatik plan üretmelidir.
- Hızlı düzenlemede öğe taşıma, döndürme, silme, çoğaltma ve kapasite değiştirme sunulmalıdır.
- Duvar çizimi, hassas ölçülendirme ve yoğun çoklu seçim “Gelişmiş düzenleme için tablet veya bilgisayar kullanın” açıklamasıyla sınırlandırılabilir.
- Bilet alan katılımcının koltuk seçimi telefonda eksiksiz çalışmalıdır.

## 1.2 Tasarımcı ve katılımcı ekranı ayrılmalı

- **Organizatör tasarımcısı:** Güçlü, detaylı, araç yoğun.
- **Katılımcı koltuk seçimi:** Sade, hızlı, tek amaçlı.
- Katılımcıya düzenleme tutamaçları, ölçü çizgileri, teknik katmanlar ve gereksiz etiketler gösterilmemelidir.

## 1.3 Tek tasarım akışı

Aşağıdaki üç ayrı yapı tek ürün akışında birleşmelidir:

- Salon Tasarımcısı açılış ekranı
- Sekiz adımlı sihirbaz
- Otomatik üretim sonucu ekranı

Önerilen tek akış:

```text
Salonlarım
  → Yeni salon oluştur
      → Şablonla başla / Boş plandan başla / Görsel yükle
          → Ölçüler ve kapasite
              → Otomatik yerleşim önizleme
                  → Düzenle
                      → Doğrula
                          → Kaydet ve etkinlikte kullan
```

---

# 2. TASARIM SİSTEMİ

## UX-DS-001 — Tasarım token sistemi

**Durum:** BEKLEMEDE  
**Öncelik:** P0  
**Hedef dosyalar:**

- `frontend/src/app/globals.css`
- `frontend/src/styles/tokens.css`
- `frontend/src/components/ui/*`

### Yapılacaklar

1. Renk, tipografi, boşluk, radius, gölge, z-index ve hareket sürelerini CSS değişkenleriyle tanımla.
2. Sayfalardaki rastgele `blue-600`, `indigo-600`, `slate-950`, `rounded-3xl` kullanımını semantik tokenlara taşı.
3. Semantik renk adları kullan:
   - `--color-primary`
   - `--color-success`
   - `--color-warning`
   - `--color-danger`
   - `--color-info`
   - `--color-surface`
   - `--color-border`
   - `--color-muted`
4. Açık ve koyu tema tek token yapısından üretilsin.
5. Etkinlik organizatörü paneli ile ödeme ekranının ayrı ürünler gibi görünmesini engelle.

### Önerilen renk yaklaşımı

- Ana marka: lacivert / mavi
- Birincil aksiyon: mavi
- Başarı: yeşil
- Bekleme: amber
- Hata / iptal: kırmızı
- Seçili koltuk: mavi
- Boş koltuk: yeşil
- Kilitli koltuk: amber
- Dolu koltuk: gri
- VIP: mor veya altın
- Erişilebilir koltuk: mavi + erişilebilirlik ikonu

### Kabul kriteri

- Aynı durum bütün ekranlarda aynı renkle gösterilir.
- Koyu tema kontrastları ayrıca doğrulanır.
- Renk dışında ikon ve metinle de durum anlatılır.

---

## UX-DS-002 — Ortak UI bileşenleri

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Oluşturulacak bileşenler

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Switch`
- `RadioCard`
- `FormField`
- `StatusBadge`
- `Card`
- `DataCard`
- `Modal`
- `Drawer`
- `BottomSheet`
- `Toast`
- `InlineAlert`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `ConfirmDialog`
- `PageHeader`
- `MobileActionBar`
- `ResponsiveTable`

### Kurallar

- `alert`, `confirm` ve `prompt` doğrudan kullanılmamalıdır.
- Başarı/hata mesajları toast veya inline alert ile gösterilmelidir.
- Para, telefon, tarih ve saat alanları standart maskeler kullanmalıdır.
- Silme, iptal ve iade gibi işlemler açıklamalı onay penceresi kullanmalıdır.
- Yükleniyor butonu genişliğini değiştirmemeli; spinner ve sabit metin alanı kullanmalıdır.

---

## UX-DS-003 — Tipografi ve içerik dili

**Durum:** BEKLEMEDE  
**Öncelik:** P1

### Tipografi hiyerarşisi

- Sayfa başlığı: 28–32 px masaüstü, 24 px mobil
- Bölüm başlığı: 20–24 px
- Kart başlığı: 16–18 px
- Gövde: 14–16 px
- Yardım metni: minimum 12 px
- Canvas etiketi: zoom seviyesine göre ölçeklenen minimum okunabilir boyut

### İçerik kuralları

- “Admin” yerine kullanıcıya göre “Organizasyon Paneli” kullanılmalı.
- “Global salon” yerine “Hazır salon şablonu” denmeli.
- “Kartsız ödeme” ifadesinin yanında “Havale/EFT” açıklaması bulunmalı.
- “Bilinmeyen hata” yerine işlem ve çözüm önerisi yazılmalı.
- Teknik hata mesajları kullanıcıya gösterilmemeli.

---

# 3. SALON ÇİZİM ÖĞE KÜTÜPHANESİ

Profesyonel planlama aracında öğeler tek bir karışık liste yerine kategori bazlı olmalıdır.

## 3.1 Yapısal öğeler

### Zorunlu

- Salon sınırı
- Düz duvar
- Açılı duvar
- Bölme duvarı
- Kapı
- Çift kapı
- Servis kapısı
- Acil çıkış
- Pencere
- Kolon / sütun
- Sabit engel
- Merdiven
- Asansör
- Rampa
- Balkon / kat bölümü

### Özellikleri

- En, boy ve gerçek ölçü
- Duvar kalınlığı
- Kapı açılış yönü
- Kilitli / taşınabilir
- Görünür / gizli
- Katman sırası
- Güvenlik tipi

## 3.2 Masa türleri

### Yuvarlak ziyafet masası

- 4, 6, 8, 10, 12 kişilik hızlı seçenekler
- Özel çap
- Sandalyeler arası otomatik açı
- Masa numarası
- VIP işareti

### Dikdörtgen ziyafet masası

- İki uzun kenar sandalye dizilimi
- Baş koltuk ekleme seçeneği
- Birleştirilebilir masa desteği
- 4–20 kişi arası kapasite

### Kare masa

- 2, 4, 8 kişilik seçenek
- Kafe ve küçük toplantı düzenlerinde kullanılmalı

### U masa / toplantı masası

- Kongre ve kurul toplantıları için
- İç boşluk ve başkan koltuğu tanımlanmalı

### Sınıf masası

- Her masada 1–3 sandalye
- Satır ve kolon halinde otomatik üretim

### Bistro masası

- Yüksek, küçük çaplı ayakta masa
- Varsayılan kapasite koltuk sayısı değildir.
- İki kullanım modu olmalıdır:
  - Ayakta kapasite
  - Bar tabureli kapasite
- “Bistro” öğesine otomatik dört standart sandalye eklemek doğru varsayım değildir.

### Bar tezgâhı

- Düz, L veya U şekli
- Bar taburesi sayısı
- Servis tarafı ve misafir tarafı

### Kokteyl / ayakta alan

- Tek tek masa yerine bölge kapasitesi ile çalışabilir.
- Metrekare ve kişi yoğunluğu gösterilmelidir.

## 3.3 Oturma öğeleri

- Tek sandalye
- Bar taburesi
- Tiyatro koltuğu
- Katlanır sandalye
- VIP koltuk
- Koltuk / kanepe
- Puf
- Bank
- Tribün sırası
- Tekerlekli sandalye alanı
- Refakatçi koltuğu
- Görüş kısıtlı koltuk
- Satışa kapalı koltuk
- Personel koltuğu

### Sandalye özellikleri

- Koltuk kodu
- Sıra adı
- Bölüm adı
- Bilet kategorisi
- Fiyat bölgesi
- Erişilebilirlik tipi
- Görüş durumu
- Satış durumu
- Rezerve / hold durumu
- Giriş kapısı önerisi

## 3.4 Sahne ve teknik öğeler

- Ana sahne
- Yan sahne
- Podyum / catwalk
- Kürsü
- Konuşmacı masası
- DJ kabini
- LED ekran
- Projeksiyon perdesi
- Hoparlör
- Işık kulesi
- Kamera alanı
- Teknik kontrol masası
- Jeneratör / teknik alan
- Kablo geçiş koridoru
- Backstage
- Sanatçı odası

## 3.5 Servis ve etkinlik öğeleri

- Dans pisti
- Açık büfe
- Yemek servis noktası
- İçecek noktası
- Bar
- Kayıt masası
- Danışma masası
- Vestiyer
- Hediye masası
- Pasta masası
- Fotoğraf alanı
- Foto kabin
- Çocuk alanı
- Oyun alanı
- Sponsor standı
- Fuar standı
- Ürün sergileme alanı
- Basın alanı
- Sigara alanı
- İbadet alanı
- İlk yardım
- Güvenlik noktası
- Tuvalet
- Engelli tuvaleti
- Mutfak
- Depo
- Çöp / servis alanı

## 3.6 Alan ve bölge öğeleri

- VIP alanı
- Genel alan
- Aile alanı
- Personel alanı
- Basın alanı
- Ayakta alan
- Yasak alan
- Görüş kısıtlı alan
- Fiyat bölgesi
- Giriş kapısına göre bölüm
- Masa grubu
- Bilet kategorisi bölgesi

## 3.7 Çizim yardımcıları

- Metin etiketi
- Ok
- Ölçü çizgisi
- Serbest çizgi
- Dikdörtgen alan
- Daire alan
- Izgara
- Cetvel
- Kılavuz çizgi
- Not / açıklama
- Arka plan görseli
- PDF / PNG plan yükleme
- Kuzey yönü veya yön oku

---

# 4. HER ÖĞENİN ORTAK VERİ MODELİ

## UX-CANVAS-001 — Öğeleri tip güvenli hale getir

**Durum:** BEKLEMEDE  
**Öncelik:** P0  
**Hedef dosyalar:**

- `frontend/src/types/layout.ts`
- `backend/prisma/schema.prisma`
- `backend/services/layoutValidationService.js`
- `frontend/src/components/designer/*`

### Önerilen ortak alanlar

```ts
interface LayoutElementBase {
  id: string;
  type: LayoutElementType;
  label: string;
  xM: number;
  yM: number;
  widthM?: number;
  heightM?: number;
  radiusM?: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  layerId: string;
  zIndex: number;
  notes?: string;
}
```

### Oturma alanları

```ts
interface SeatingProperties {
  capacity: number;
  numberingMode: 'NONE' | 'TABLE' | 'ROW_SEAT' | 'CUSTOM';
  section?: string;
  row?: string;
  ticketTypeId?: string;
  priceZoneId?: string;
  accessible?: boolean;
  restrictedView?: boolean;
  salesState?: 'AVAILABLE' | 'HELD' | 'BLOCKED';
}
```

### Kritik karar

- Canvas koordinatları veritabanında metre cinsinden tutulmalıdır.
- Piksel yalnız görüntüleme katmanında hesaplanmalıdır.
- Ekran çözünürlüğü değişince planın fiziksel anlamı değişmemelidir.

---

# 5. SALON TASARIMCISI MASAÜSTÜ YERLEŞİMİ

## Önerilen ana ekran

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Geri | Salon adı | Kaydedildi 14:32 | Geri Al | Yinele | Önizle | Kaydet │
├───────────────┬───────────────────────────────────────┬──────────────┤
│ ÖĞELER        │                                       │ ÖZELLİKLER   │
│ Ara...        │              CANVAS                   │ Seçili öğe   │
│ Yapı          │                                       │ Ölçü         │
│ Masa          │       Izgara + cetvel + rehberler     │ Kapasite     │
│ Sandalye      │                                       │ Numara       │
│ Sahne         │                                       │ Durum        │
│ Servis        │                                       │ Katman       │
│ Güvenlik      │                                       │              │
├───────────────┴───────────────────────────────────────┴──────────────┤
│ 200 kişi | 18 masa | 4 uyarı | Zoom %75 | Ölçek 1:100 | Mini harita │
└──────────────────────────────────────────────────────────────────────┘
```

## UX-CANVAS-002 — Sol öğe kataloğu

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Yapılacaklar

- Arama alanı ekle.
- Son kullanılanlar bölümü ekle.
- Favoriler bölümü ekle.
- Kategorileri accordion olarak göster.
- Öğeyi canvas’a tıklayarak veya sürükleyerek ekle.
- Öğeyi sürüklerken hayalet önizleme göster.
- Uygun olmayan alanda kırmızı önizleme göster.
- Öğe kartında ikon, ad, varsayılan ölçü ve kapasite göster.

## UX-CANVAS-003 — Sağ özellik paneli

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Bölümler

- Genel
- Ölçü ve konum
- Oturma ve kapasite
- Numaralandırma
- Bilet / fiyat kategorisi
- Erişilebilirlik
- Görünüm
- Katman
- Notlar

### Kurallar

- Piksel girişleri kaldırılmalı.
- Metre ve santimetre kullanılmalı.
- X/Y gibi teknik alanlar “Gelişmiş” bölümünde tutulmalı.
- Birden fazla öğe seçildiğinde ortak özellikler düzenlenebilmeli.
- Geçersiz ölçü anında gösterilmeli.

## UX-CANVAS-004 — Üst araç çubuğu

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Komutlar

- Geri al
- Yinele
- Kes
- Kopyala
- Yapıştır
- Çoğalt
- Sil
- Öne getir
- Arkaya gönder
- Hizala
- Dağıt
- Grupla
- Grubu çöz
- Kilitle
- Gizle
- Izgara aç/kapat
- Izgaraya yapıştır
- Kılavuzlara yapıştır
- Zoom
- Ekrana sığdır
- Gerçek boyut
- Önizle
- Kaydet

### Klavye kısayolları

- `Ctrl/Cmd + Z`: geri al
- `Ctrl/Cmd + Shift + Z`: yinele
- `Ctrl/Cmd + C`: kopyala
- `Ctrl/Cmd + V`: yapıştır
- `Ctrl/Cmd + D`: çoğalt
- `Delete/Backspace`: sil
- Ok tuşları: 1 birim taşı
- `Shift + Ok`: 10 birim taşı
- `Ctrl/Cmd + A`: tümünü seç
- `Esc`: seçimi bırak
- `Space + sürükle`: pan
- `+ / -`: zoom

## UX-CANVAS-005 — Mini harita ve katman paneli

**Durum:** BEKLEMEDE  
**Öncelik:** P1

### Katman örnekleri

- Yapı
- Sabit engeller
- Sahne ve teknik
- Masalar
- Sandalyeler
- Servis alanları
- Güvenlik
- Etiketler
- Arka plan

### İşlevler

- Katmanı gizle
- Katmanı kilitle
- Katman sırasını değiştir
- Yalnız seçili katmanı göster
- Katmandaki tüm öğeleri seç

---

# 6. OTOMATİK YERLEŞİM VE ŞABLONLAR

## UX-TEMPLATE-001 — Profesyonel şablon galerisi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Şablonlar

1. Düğün — yuvarlak masa + dans pisti
2. Nişan — küçük yuvarlak masa + sahne
3. Gala — VIP ön alan + ziyafet masası
4. Konser — düz sıra koltuk
5. Tiyatro — kavisli sıra koltuk
6. Konferans — sınıf düzeni
7. Toplantı — U masa
8. Kokteyl — bistro + ayakta alan
9. Fuar — stant ızgarası
10. Spor — tribün / bölüm bazlı
11. Doğum günü — masa + çocuk alanı
12. Karma düzen — masa + ayakta alan

### Şablon kartı

- Önizleme görseli
- Uygun etkinlik türü
- Önerilen kişi aralığı
- Minimum salon ölçüsü
- Düzenleme zorluğu
- “Bu şablonla başla” butonu

## UX-TEMPLATE-002 — Otomatik üretim sonucu karşılaştırması

**Durum:** BEKLEMEDE  
**Öncelik:** P1

Tek bir sonuç yerine üç seçenek üret:

- Maksimum kapasite
- Rahat dolaşım
- Sahne görünürlüğü öncelikli

Kullanıcı her seçeneğin kapasite, boş alan ve uyarı sayısını karşılaştırabilmelidir.

## UX-TEMPLATE-003 — Tekrar kullanılabilir salonlar

**Durum:** BEKLEMEDE  
**Öncelik:** P1

- Salon planını şablon olarak kaydet.
- Eski etkinlik planını klonla.
- Sadece masa yerleşimini klonla.
- Sadece yapısal katmanı koru.
- Yeni kapasiteye göre yeniden yerleştir.

---

# 7. ÇİZİM DOĞRULAMA VE HATA ÖNLEME

## UX-VALIDATE-001 — Gerçek zamanlı çakışma denetimi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Kontroller

- Masa masa ile çakışıyor.
- Sandalye duvarın dışında.
- Sahne çıkış kapısını kapatıyor.
- Acil çıkış önü kapalı.
- Koridor sürekliliği bozulmuş.
- İki koltuk aynı numarayı taşıyor.
- Bilet kapasitesi çizimdeki koltuk sayısıyla uyuşmuyor.
- Tekerlekli sandalye alanına erişim yok.
- Öğenin bir bölümü salon sınırı dışında.
- Arka plan ölçeği tanımlanmamış.

### Görsel dil

- Hatalı öğede kırmızı dış çizgi
- Uyarıda amber dış çizgi
- Sağ altta doğrulama paneli
- Canvas üzerinde hataya giden odak butonu
- “Otomatik düzelt” yalnız güvenli işlemlerde sunulmalı

## UX-VALIDATE-002 — Yayın öncesi kontrol ekranı

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Kontrol listesi:

- Salon adı ve adres var
- Ölçek tanımlı
- Giriş var
- Acil çıkışlar tanımlı
- Koltuk numaraları benzersiz
- Kapasite hesaplandı
- Erişilebilir alan kontrol edildi
- Satışa kapalı alanlar doğrulandı
- Önizleme onaylandı

### Kabul kriteri

Kritik hata varsa plan etkinlikte kullanılamaz. Uyarılar gerekçeli biçimde geçilebilir.

---

# 8. MOBİL SALON DÜZENLEME

## Önerilen telefon ekranı

```text
┌────────────────────────────┐
│ Geri   Düğün Salonu   Kaydet│
├────────────────────────────┤
│                            │
│       PINCH-ZOOM CANVAS    │
│                            │
│   [seçili masa göstergesi] │
│                            │
├────────────────────────────┤
│ + Ekle | Düzenle | Taşı | ⋯│
└────────────────────────────┘
```

## UX-MOBILE-001 — Dokunma davranışları

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Tek parmak sürükle: seçili öğeyi taşı
- İki parmak sürükle: canvas pan
- Pinch: zoom
- Tek dokunma: seç
- Uzun basma: hızlı menü
- Boş alana dokunma: seçimi kaldır
- İki kez dokunma: seçili öğeye odaklan
- Döndürme için görünür büyük tutamaç
- Resize tutamaçları minimum 44×44 dokunma alanı

## UX-MOBILE-002 — Alt özellik paneli

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Seçilen öğe özellikleri bottom sheet içinde açılmalı.
- İlk seviye: ad, kapasite, döndür, çoğalt, sil.
- Gelişmiş seviye: ölçü, numara, katman, fiyat bölgesi.
- Bottom sheet kapalıyken canvas alanını kapatmamalı.

## UX-MOBILE-003 — Telefon öğe ekleme

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- “+ Ekle” ile tam ekran searchable katalog açılmalı.
- Son kullanılan 6 öğe üstte gösterilmeli.
- Ekleme sonrası öğe ekran ortasına yerleşmeli.
- Hemen kapasite ve ad sorulmamalı; varsayılanla eklenip düzenlenebilir olmalı.

## UX-MOBILE-004 — Mobil güvenlik

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Yanlışlıkla silme için 5 saniyelik geri al sun.
- Kaydedilmemiş değişiklikte sayfadan çıkma uyarısı göster.
- Otomatik kaydetme durumu görünür olmalı.
- Ağ kesilince yerel taslak korunmalı.

---

# 9. KATILIMCI KOLTUK SEÇİMİ

## UX-SEAT-001 — Harita ve liste tek modele bağlanmalı

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Liste ve harita aynı seçili koltuk state’ini kullanmalı.
- Haritada seçilen koltuk listede görünür ve odaklı olmalı.
- Listede seçilen koltuğa harita otomatik odaklanmalı.
- Koltuk adı bölüm, sıra ve numara formatında gösterilmeli:
  - `Salon A · Sıra D · Koltuk 12`
- Renk lejantına kilitli ve erişilebilir durumlar eklenmeli.

## UX-SEAT-002 — Mobil koltuk seçimi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Ekran düzeni

- Üstte etkinlik ve süre
- Ortada harita
- Altta sabit seçim özeti
- Tek ana aksiyon: “Devam Et”
- Seçim yapılmadan buton disabled

### Hızlı seçenekler

- En iyi boş koltuk
- Yan yana 2 koltuk
- Yan yana 3 koltuk
- Erişilebilir koltuk
- Fiyat aralığına göre seç

## UX-SEAT-003 — Büyük planlarda seviye sistemi

**Durum:** BEKLEMEDE  
**Öncelik:** P1

1. İlk görünüm: bölümler
2. Bölüme dokununca: sıralar
3. Yakınlaştırınca: tek koltuklar

Binlerce koltuğu ilk karede tek tek çizme.

## UX-SEAT-004 — Koltuk bilgi kartı

**Durum:** BEKLEMEDE  
**Öncelik:** P1

Gösterilecekler:

- Bölüm
- Sıra
- Koltuk
- Fiyat
- Bilet türü
- Görüş notu
- Erişilebilirlik
- Giriş kapısı
- Geçici kilit süresi

---

# 10. PUBLIC ANA SAYFA VE ETKİNLİK VİTRİNİ

## UX-PUBLIC-001 — API hatasında sahte etkinlik gösterme

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- API çalışmadığında demo etkinlikleri gerçekmiş gibi göstermeyi kaldır.
- Bunun yerine hata durumu ve “Tekrar dene” butonu göster.
- Demo veriler yalnız development ortamında açık etiketle gösterilebilir.

## UX-PUBLIC-002 — Ana sayfa amacı

**Durum:** BEKLEMEDE  
**Öncelik:** P1

Hero metni ürün değerini anlatmalı:

> Etkinliğini oluştur, davetlilerini yönet, salon planını çiz ve girişleri tek ekrandan kontrol et.

Ana aksiyonlar:

- Etkinlik oluştur
- Etkinlikleri keşfet
- Davet koduyla katıl

## UX-PUBLIC-003 — Etkinlik kartları

**Durum:** BEKLEMEDE  
**Öncelik:** P1

Kartta göster:

- Kapak görseli
- Etkinlik adı
- Tarih ve saat
- Yer
- Organizatör adı / doğrulama rozeti
- Ücretsiz / başlangıç fiyatı
- Kalan kapasite veya doluluk
- Özel etkinlik ise kilit ikonu

### Kart kuralları

- Etkinlik adını dev, soluk arka plan yazısı olarak kullanma.
- Görsel yoksa etkinlik türüne göre kaliteli placeholder kullan.
- Kartın tamamı tıklanabilir olabilir; buton etiketi yine görünür kalmalı.

## UX-PUBLIC-004 — Etkinlik detay sayfası

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Şu an ilk başlık salon adı odaklıdır. Yeni sıralama:

1. Etkinlik adı
2. Kapak görseli
3. Tarih ve saat
4. Yer ve harita
5. Organizatör
6. Açıklama
7. Bilet / koltuk seçimi
8. Satın alma özeti
9. İade ve katılım koşulları

Mobilde satın alma özeti ekran altında sabitlenmelidir.

---

# 11. ETKİNLİK OLUŞTURMA SİHİRBAZI

## UX-EVENT-001 — Tek rehberli akış

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Adımlar

1. Etkinlik türü
2. Temel bilgiler
3. Tarih ve yer
4. Katılım biçimi
5. Salon / kapasite
6. Ücret ve bilet türleri
7. Davet ve görünürlük
8. Önizleme ve yayın

### Her adımda

- İlerleme çubuğu
- Otomatik taslak kaydı
- Geri ve devam butonu
- Eksik alanların inline açıklaması
- Mobilde tek kolon
- Özet paneli

## UX-EVENT-002 — 50 kişi eşiği görünürlüğü

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Kapasite 50’ye yaklaşınca nötr bilgi göster.
- 51 olduğunda amber onay uyarısı göster.
- Kullanıcıya son ekranda sürpriz yapılmamalı.
- Salon çizimindeki gerçek sandalye sayısı esas alınmalı.

---

# 12. YÖNETİM PANELİ

## UX-ADMIN-001 — Bilgi mimarisi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Organizatör ana menüsü

- Genel Bakış
- Etkinliklerim
- Katılımcılar
- Salon Planları
- Giriş Kontrolü
- Finans
- Daha Fazla

### Admin ek menüsü

- Onay Bekleyenler
- Şikâyetler
- Kullanıcılar
- Sistem Sağlığı
- Denetim Kayıtları

“Canlı Analitik” ayrı ana menü yerine Genel Bakış içinde sekme olabilir.

## UX-ADMIN-002 — Mobil alt navigasyon

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Alt menüde en fazla 4 ana öğe + “Daha Fazla” bulunmalıdır:

- Özet
- Etkinlikler
- Katılımcılar
- Giriş
- Daha Fazla

Yedi öğeyi tek alt çubuğa sıkıştırma.

## UX-ADMIN-003 — Mobil tabloları kartlaştır

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Aşağıdaki sayfalar mobilde tablo olmamalıdır:

- Etkinlikler
- Salonlar
- Rezervasyonlar
- Kuponlar
- Raporlar

### Rezervasyon mobil kartı örneği

```text
Ayşe Yılmaz             Ödeme bekliyor
Yaz Konseri · A12
ayse@example.com
[Ödemeyi doğrula] [⋯]
```

### Masaüstü

- Tablo korunabilir.
- Sütun seçimi
- Sabit başlık
- Arama
- Filtre
- Sıralama
- Toplu işlem
- Satır detay drawer

## UX-ADMIN-004 — Kritik işlem güvenliği

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Onay, iptal, iade ve ödeme doğrulama farklı renk ve ikon kullanmalı.
- İade penceresinde beklenen tutar görünmeli.
- Buton tıklanınca işlem bitene kadar ikinci tıklama engellenmeli.
- Başarı mesajında test SMTP URL’si kullanıcıya gösterilmemeli.
- Toplu işlemlerde kaç kaydın etkileneceği yazılmalı.

---

# 13. KULLANICI PROFİLİ VE BİLETLER

## UX-PROFILE-001 — Mobil profil navigasyonu

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Sabit 256 px sidebar mobilde kaldırılmalı.
- Mobil üst bar + alt sekme veya drawer kullanılmalı.
- Profil içeriği `p-8` yerine responsive padding kullanmalı.

## UX-PROFILE-002 — Bilet kartı

**Durum:** BEKLEMEDE  
**Öncelik:** P1

Kartta:

- Etkinlik görseli
- Etkinlik adı
- Tarih
- Yer
- Koltuk
- Bilet durumu
- Ödeme durumu
- QR aç
- Cüzdana ekle
- Paylaş
- Devir / iade uygunluğu

## UX-PROFILE-003 — QR ekranı

**Durum:** BEKLEMEDE  
**Öncelik:** P1

- Ekran parlaklığını artırma önerisi
- Tam ekran QR
- Bilet kodu
- Offline gösterim
- Ekran görüntüsü güvenlik uyarısı gerekiyorsa ürün kararına bağla
- QR altında etkinlik ve koltuk adı

---

# 14. ÖDEME EKRANI

## UX-PAY-001 — Tek ödeme özeti

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Ödeme ekranında üstte sabit özet:

- Etkinlik
- Bilet / koltuk
- Tutar
- Süre
- Ödeme durumu

## UX-PAY-002 — Varsayılan sahte bilgiler kaldırılmalı

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Rezervasyon verisi yokken örnek IBAN, alıcı, tutar ve referans gösterme.
- Eksik veride ödeme akışını durdur ve güvenli hata göster.
- Development demo verileri açıkça “DEMO” etiketi taşımalı.

## UX-PAY-003 — Havale/EFT deneyimi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- IBAN kopyala
- Alıcı kopyala
- Referans kopyala
- Tutar kopyala
- Tüm bilgileri paylaş
- “Ödemeyi yaptım” butonu
- Doğrulama bekleniyor durumu
- Durum otomatik yenileme

## UX-PAY-004 — Süre göstergesi

**Durum:** BEKLEMEDE  
**Öncelik:** P1

- Süre yalnız URL parametresine bağlı olmamalı.
- Sunucudaki `expiresAt` esas alınmalı.
- Son 60 saniyede amber, son 15 saniyede kırmızı göster.
- Süre dolunca server durumunu tekrar doğrula.

---

# 15. ERİŞİLEBİLİRLİK

## UX-A11Y-001 — WCAG 2.2 AA hedefi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Gereksinimler

- Bütün işlevler klavye ile kullanılabilir olmalı.
- Focus göstergesi görünür olmalı.
- Icon-only butonlarda erişilebilir ad olmalı.
- Renk tek bilgi taşıyıcısı olmamalı.
- Minimum dokunma hedefi pratikte 44×44 px hedeflenmeli.
- Canvas işlemleri için alternatif liste görünümü bulunmalı.
- Koltuklar ekran okuyucu için bölüm/sıra/numara olarak sunulmalı.
- Modal açılınca focus modal içine taşınmalı.
- Modal kapanınca focus eski öğeye dönmeli.
- Hata mesajları alanla programatik ilişkilendirilmeli.

## UX-A11Y-002 — Canvas erişilebilirliği

**Durum:** BEKLEMEDE  
**Öncelik:** P1

Canvas tek başına erişilebilir değildir. Yanında DOM tabanlı öğe listesi olmalıdır:

```text
Masalar
- Masa T1, 8 kişilik, x 4.2 m, y 3.1 m
- Masa T2, 10 kişilik, x 7.0 m, y 3.1 m

Güvenlik
- Ana Giriş, kuzey duvarı
- Acil Çıkış 1, doğu duvarı
```

Listeden seçim yapıldığında canvas öğesi de seçilmelidir.

---

# 16. GÖRSEL PERFORMANS VE HIZ

## UX-PERF-001 — Konva katman mimarisi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Önerilen katmanlar:

1. Arka plan
2. Izgara ve ölçüler
3. Sabit yapı
4. Masa ve bölgeler
5. Sandalyeler
6. Seçim ve etkileşim
7. Uyarılar

### Kurallar

- Etkileşimsiz şekillerde `listening={false}` kullan.
- Arka plan ve statik grupları cache et.
- Drag sırasında öğeyi geçici üst katmana taşı.
- Canvas’ın gereksiz büyük olmasını engelle.
- Her mouse move’da bütün `elements` dizisini yeniden üretmek yerine seçili öğe state’ini veya reducer kullan.
- Drag update’lerini animation frame ile sınırla.
- İstatistikleri her render’da tekrar hesaplama; memoize et.

## UX-PERF-002 — Büyük koltuk haritaları

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- 500, 2.000 ve 10.000 koltuk test senaryosu oluştur.
- Uzak zoom seviyesinde tek koltuk yazılarını çizme.
- Bölüm seviyesinde koltukları grup olarak render et.
- Görünür viewport dışındaki detayları azalt.
- Hover olaylarını mobilde kapat.
- Binlerce öğede gölge ve karmaşık stroke kullanma.
- Lejant ve UI overlay’lerini Canvas dışında DOM olarak tut.

## UX-PERF-003 — Frontend paket ve animasyon denetimi

**Durum:** BEKLEMEDE  
**Öncelik:** P1

- `motion` ve `framer-motion` kullanımını tek pakette standardize et.
- Birden fazla QR kütüphanesini tek kütüphaneye indir.
- Konva yalnız ihtiyaç olan rotalarda dynamic import edilmelidir.
- Büyük tasarım bileşenleri route-level code splitting kullanmalıdır.
- Kartların sıralı animasyonları yüzlerce etkinlikte kapatılmalı veya sınırlandırılmalı.
- `prefers-reduced-motion` desteklenmelidir.

## UX-PERF-004 — Performans bütçeleri

**Durum:** BEKLEMEDE  
**Öncelik:** P1

### Hedefler

- Public ana sayfa ilk JS: mümkün olduğunca düşük, hedef < 200 KB gzip
- Tasarımcı rotası ayrı yüklenir
- LCP: iyi ağda < 2,5 sn
- INP: < 200 ms
- Canvas drag frame rate: hedef 60 FPS, minimum kabul 45 FPS
- 2.000 koltuk haritası açılışı: < 1,5 sn hedef
- Kaydetme sonrası kullanıcı geri bildirimi: < 100 ms

---

# 17. GÜVENLİK ODAKLI TASARIM

## UX-SEC-001 — Hassas veri görünürlüğü

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Public ekranlarda e-posta ve ödeme bilgisi gereksiz gösterilmemeli.
- IBAN yalnız ödeme yapılması gereken rezervasyonda görünmeli.
- Yönetim listelerinde e-posta kısmen maskelenebilir.
- QR ve bilet detayları yalnız yetkili kullanıcıya gösterilmeli.
- Ekran görüntülerinde secret veya test URL bulunmamalı.

## UX-SEC-002 — Güven veren ödeme dili

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Ödeme yönteminin gerçek sağlayıcı adı gösterilmeli.
- Simülasyon endpointi kullanıcı arayüzünde bulunmamalı.
- “Ödemeniz alındı” mesajı yalnız backend kesin onay verdikten sonra gösterilmeli.
- İade durumunda işlem numarası ve süreç açıklaması sunulmalı.

## UX-SEC-003 — Yetki farklarını arayüzde doğru göster

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Kullanıcının erişemeyeceği menüyü yalnız gizlemek yeterli değildir; backend yetkisi esas olmalıdır.
- UI, admin ve etkinlik sahibi özelliklerini ayrı göstermeli.
- Yetki kaybında açık ekran güvenli şekilde kapanmalı ve yeniden giriş istenmeli.

---

# 18. HATA, BOŞ, OFFLINE VE YÜKLEME DURUMLARI

## UX-STATE-001 — Standart durum matrisi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Her ekran aşağıdaki durumlara sahip olmalıdır:

- İlk yükleme
- Yenileme
- Boş veri
- Ağ hatası
- Yetki hatası
- Kayıt bulunamadı
- Sunucu hatası
- Offline
- Kısmi veri
- Başarılı işlem
- İşlem sürüyor

### Örnek

```text
Etkinlikler yüklenemedi
Bağlantınızı kontrol edin veya tekrar deneyin.
[Tekrar Dene]
```

Demo içerikle hatayı gizleme.

## UX-STATE-002 — Autosave ve kaydedilmemiş değişiklik

**Durum:** BEKLEMEDE  
**Öncelik:** P0

Durum metinleri:

- Kaydediliyor…
- Tüm değişiklikler kaydedildi
- İnternet yok — değişiklikler cihazda saklandı
- Kaydetme başarısız — tekrar dene

---

# 19. TEST VE DENETİM MATRİSİ

## UX-QA-001 — Responsive test matrisi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

### Genişlikler

- 320 px
- 360 px
- 390 px
- 412 px
- 768 px
- 1024 px
- 1280 px
- 1440 px
- 1920 px

### Durumlar

- Dikey telefon
- Yatay telefon
- Dikey tablet
- Yatay tablet
- Masaüstü
- %200 browser zoom
- Büyük yazı

## UX-QA-002 — Tarayıcı ve giriş yöntemi

**Durum:** BEKLEMEDE  
**Öncelik:** P0

- Chrome Android
- Samsung Internet
- Safari iOS
- Chrome desktop
- Edge
- Firefox
- Fare
- Trackpad
- Dokunmatik
- Klavye
- Ekran okuyucu

## UX-QA-003 — Görsel regresyon

**Durum:** BEKLEMEDE  
**Öncelik:** P1

Playwright ekran görüntüsü testleri:

- Ana sayfa
- Etkinlik kartları
- Etkinlik detay
- Koltuk liste görünümü
- Koltuk harita görünümü
- Salon tasarımcısı masaüstü
- Salon tasarımcısı tablet
- Salon sihirbazı mobil
- Yönetim ana sayfa
- Rezervasyon mobil kartları
- Ödeme ekranı
- Bilet QR ekranı

## UX-QA-004 — Canvas hata testleri

**Durum:** BEKLEMEDE  
**Öncelik:** P0

1. 200 masa ekle.
2. 2.000 sandalye ekle.
3. Çoklu seçim ve taşıma yap.
4. Undo/redo 50 işlem çalıştır.
5. Arka plan görseli yükle.
6. Mobil pinch zoom yap.
7. Aynı numaralı iki koltuk oluştur.
8. Çıkış önünü masa ile kapat.
9. Planı kaydet ve tekrar aç.
10. Farklı çözünürlükte fiziksel ölçünün değişmediğini doğrula.

---

# 20. DOSYA VE BİLEŞEN MİMARİSİ

Önerilen yapı:

```text
frontend/src/
  components/
    ui/
      Button.tsx
      FormField.tsx
      Modal.tsx
      BottomSheet.tsx
      StatusBadge.tsx
      EmptyState.tsx
    designer/
      DesignerShell.tsx
      DesignerToolbar.tsx
      ElementLibrary.tsx
      PropertiesPanel.tsx
      LayersPanel.tsx
      ValidationPanel.tsx
      CanvasStage.tsx
      MiniMap.tsx
      MobileDesignerActions.tsx
      MobilePropertiesSheet.tsx
      elements/
        RoundTable.tsx
        RectTable.tsx
        BistroTable.tsx
        Chair.tsx
        Stage.tsx
        Door.tsx
        EmergencyExit.tsx
        Zone.tsx
    seating/
      SeatMap.tsx
      SeatList.tsx
      SeatLegend.tsx
      SeatSummary.tsx
  hooks/
    useDesignerHistory.ts
    useCanvasGestures.ts
    useAutosave.ts
    useResponsiveMode.ts
  services/
    layoutGeometry.ts
    layoutValidation.ts
    layoutTemplates.ts
  types/
    layout.ts
```

### Kritik refactor

`HallDesignerCanvas.tsx` tek dosyada veri çekme, kaydetme, otomatik üretim, çizim, form, özellik paneli ve istatistik işlerini birlikte yapmamalıdır.

---

# 21. UYGULAMA SIRASI

| Sıra | Faz | Öncelik | Durum |
|---:|---|---|---|
| 1 | Tasarım tokenları ve ortak UI bileşenleri | P0 | BEKLEMEDE |
| 2 | Mobil admin navigasyonu ve kart listeleri | P0 | BEKLEMEDE |
| 3 | Public hata/demo veri düzeltmesi | P0 | BEKLEMEDE |
| 4 | Etkinlik detay bilgi mimarisi | P0 | BEKLEMEDE |
| 5 | Salon tasarımcı dosya refactor’u | P0 | BEKLEMEDE |
| 6 | Gerçek ölçü ve öğe veri modeli | P0 | BEKLEMEDE |
| 7 | Profesyonel öğe kütüphanesi | P0 | BEKLEMEDE |
| 8 | Çakışma ve yayın öncesi doğrulama | P0 | BEKLEMEDE |
| 9 | Mobil sihirbaz ve hızlı düzenleme | P0 | BEKLEMEDE |
| 10 | Katılımcı koltuk seçimi iyileştirmesi | P0 | BEKLEMEDE |
| 11 | Canvas performans optimizasyonu | P0 | BEKLEMEDE |
| 12 | Erişilebilirlik | P0 | BEKLEMEDE |
| 13 | Şablon galerisi | P1 | BEKLEMEDE |
| 14 | Katmanlar, mini harita ve gelişmiş araçlar | P1 | BEKLEMEDE |
| 15 | Görsel regresyon ve cihaz testleri | P1 | BEKLEMEDE |

---

# 22. AI GÖREV İŞLEME PROTOKOLÜ

AI her görevde şu alanları doldurmalıdır:

```text
Durum:
Başlama tarihi:
Tamamlanma tarihi:
Branch:
Commit:
PR:
Değişen dosyalar:
Test komutları:
Test sonucu:
Ekran görüntüsü yolları:
Performans ölçümü:
Erişilebilirlik sonucu:
Kanıt / not:
```

## Tamamlandı işaretleme şartı

Bir tasarım görevi yalnız şu koşullarla `TAMAMLANDI` olur:

1. Kod yazıldı.
2. Masaüstü ve mobil görünüm doğrulandı.
3. Klavye ve dokunmatik davranışı test edildi.
4. Loading, empty, error ve success durumları test edildi.
5. Görsel regresyon ekran görüntüsü oluşturuldu.
6. İlgili E2E testleri geçti.
7. Kritik erişilebilirlik hatası yok.
8. Performans bütçesi aşılmadı.
9. PR ve commit kanıtı yazıldı.

Sadece ekranın açılması veya Tailwind sınıfı eklenmesi görevi tamamlamaz.

---

# 23. İLK TASARIM BETA TANIMI

App Bilet tasarım betası aşağıdakiler tamamlandığında hazır kabul edilir:

- Kullanıcı telefondan 50 kişilik etkinliği üç dakika içinde oluşturabilir.
- Masaüstünde salon planı gerçek ölçüyle çizilebilir.
- Telefon üzerinde şablon seçme ve hızlı düzenleme yapılabilir.
- Katılımcı telefondan harita veya listeyle koltuk seçebilir.
- Yönetim listeleri telefonda yatay kaydırma gerektirmez.
- Alt navigasyonda en fazla beş öğe vardır.
- API hatasında sahte etkinlik gösterilmez.
- Bütün kritik işlemlerde güvenli onay ve geri bildirim vardır.
- 2.000 koltuklu harita kabul edilebilir hızda açılır.
- Renk körlüğünde durumlar ayırt edilebilir.
- Klavye ile ana akışlar tamamlanabilir.
- Salon planında çakışma ve çıkış engeli uyarıları çalışır.
- Kaydedilmemiş çizim veri kaybetmez.

---

# 24. SON KARAR

App Bilet’in tasarım tarafında yeni renk veya animasyon eklemek birinci öncelik değildir. Öncelik sırası şudur:

1. Kullanıcı yolculuğunu sadeleştir.
2. Mobil navigasyonu düzelt.
3. Ortak tasarım sistemi kur.
4. Salon tasarımcısını gerçek ölçü ve doğrulama motoruna dönüştür.
5. Büyük planlarda hızı koru.
6. Erişilebilirliği garanti et.
7. Son aşamada marka görselleri ve animasyonları güçlendir.

> En iyi salon tasarım aracı en çok düğmesi olan araç değildir. Kullanıcıya yanlış plan yaptırtmayan, planı hızlı oluşturan ve telefonda hata yaptırmayan araçtır.

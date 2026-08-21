# 🎨 Etkinlik Alanı, UX ve Performans İyileştirme Raporu

> **Tarih:** 2026-08-21
> **Kapsam:** Etkinlik oluşturma sihirbazı, müşteri etkinlik sayfası, ana sayfa, salon tasarımcısı görüntüleyici, dashboard UX, performans
> **Durum:** 20 dosyada +505/−393 satır değişiklik yapıldı, **hepsi doğrulandı** (build ✅, TypeScript ✅, 64/64 test ✅, canlı API smoke testi ✅)

---

## Bölüm 1 — Tespit Edilen Sorunlar (İnceleme Bulguları)

### 🔴 Sihirbaz (Etkinlik Oluşturma) Hataları

| # | Sorun | Etki |
|---|---|---|
| W1 | **Fiyat alanı hiç yoktu** — `price: 0` sabit gönderiliyordu | Sihirbazdan oluşturulan HER etkinlik ücretsizdi; ücretli etkinlik imkânsızdı |
| W2 | **Ödeme türü seçimi yoktu** | `paymentType` hiç gönderilmiyordu → her zaman "free" |
| W3 | **Açıklama kayboluyordu** — backend `eventSchema`'de `description` yok, zod bilinmeyen alanları siliyordu | Sihirbazda yazılan açıklama veritabanına asla yazılmıyordu |
| W4 | **"Kapak Görseli URL" alanı ölü veri topluyordu** — backend'de `coverImage` kolonu yok | Kullanıcı URL girer, özet sayfasında görür ama **kaydedilmezdi** → alan kaldırıldı |
| W5 | **Etkinlik "Taslak" olarak oluşuyordu** — `status` gönderilmiyor, backend varsayılanı "Taslak" | Sihirbaz "Doğrudan Yayınlanacak 🚀" diyordu ama etkinlik ana sayfada **hiç görünmüyordu** |
| W6 | **Saat kayması (timezone) hatası** — `"2026-12-25T19:00:00.000Z"` yerel saatmiş gibi UTC'ye yazılıyordu | Türkiye'de 19:00 seçen kullanıcının etkinliği 22:00 olarak kaydediliyordu |
| W7 | **Etkinlik türü seçimi kayboluyordu** — `eventType` payload'a hiç konmuyordu (backend'de de tür kolonu yok) | 1. adımdaki seçim süs olmaktan öteye geçmiyordu (dokümante edildi) |
| W8 | `alert()` ile hata gösterimi + kayıt başarılıysa kullanıcıya hiçbir dönüt yoktu | Tarayıcı bloklayan pencereler, kayıp bağlam |
| W9 | Tamamlanan adımlara tıklanıp geri dönülemiyordu (stepper sadece görseldi) | Kullanıcı 4. adıma gelince 1. adımı düzeltmek için "Geri"ye 5 kez basmak zorundaydı |
| W10 | Tarih alanında geçmiş gün seçilebiliyordu (backend reddediyordu) | Kullanıcı hatayı en sonda alıyordu |
| W11 | Salon listesi yüklenemezse sessizce boş kalıyordu | "Yeni Tasarla" akışı kilitleniyordu |

### 🔴 Müşteri Etkinlik Sayfası (`/event/[id]`) Hataları

| # | Sorun | Etki |
|---|---|---|
| C1 | **Çoklu koltuk seçimi ölü UI** — kullanıcı 3 koltuk seçebiliyor ama backend **yalnızca son koltuğu** satın alıyordu | "3 koltuk seçtim, 1 bilet aldım" — en sinsi kullanıcı hatası |
| C2 | Seçili koltuk başkası tarafından kilitlenirse seçim durumunda kalıyordu | Checkout'ta "koltuk işlemde" hatası |
| C3 | **Dolu etkinlikte (waitlist) kupon kodu ve fiyat özeti gösteriliyordu** | Satın alınamayan yerde kupon/fiyat görmek kafa karıştırıcı |
| C4 | `GET /api/users/me` backend'de yok → puan/e-posta otodoldurma çalışmıyordu | Kullanıcı bilgileri formu boş geliyordu (backend'e endpoint eklendi ✅) |
| C5 | Socket bağlantısı `NEXT_PUBLIC_API_URL`'e yapılıyordu — env `/api` ile biterse socket kopuyordu | Canlı koltuk güncellemeleri ölüyordu |
| C6 | API hata mesajları ham gösteriliyordu, zaman aşımı yoktu | "Bağlantı hatası" belirsizliği |

### 🟠 Ana Sayfa Hataları

| # | Sorun | Etki |
|---|---|---|
| H1 | **Kategori filtreleri gerçek veriyle çalışmıyordu** — API'deki etkinliklerde `category` alanı yok; "Konser" sekmesine tıklayınca her zaman boş liste | Filtre tamamen işlevsiz |
| H2 | **API çökerse demo etkinlikler yükleniyordu** — demo etkinliklerin linkleri `/event/1` gibi var olmayan sayfalara gidiyordu | Kullanıcı tıklayınca "Bilet Bulunamadı" 404 sayfası görüyordu |
| H3 | Hata durumunda "yeniden dene" butonu yoktu | Sayfa yenilemek zorunda kalınıyordu |
| H4 | `demoEvents` dizisi her render'da yeniden oluşturuluyordu | Gereksiz bellek/allocation |

### 🟠 Genel Sistem / Performans

| # | Sorun | Etki |
|---|---|---|
| P1 | **Tüm dosyalarda tekrar eden `fetch(...)` + token + hata yönetimi** — 30+ yerde `NEXT_PUBLIC_API_URL || 'http://localhost:5000'` kopyası | `NEXT_PUBLIC_API_URL` env'i `/api` ile set edilince **tüm istekler `/api/api/...` (404)**; tek merkezde düzeltildi ✅ |
| P2 | **`framer-motion` + `motion` paketleri aynı anda kurulu** (ikisi de motion v12'nin parçası) | ~50–80 KB gereksiz bundle; tek pakete düşürüldü ✅ |
| P3 | **SeatMapViewer render sırasında `ref.current` okuyordu** — ESLint hatası + container boyutu değişince Stage genişliği güncellenmiyordu | ResizeObserver + state'e geçildi ✅ |
| P4 | **Dashboard'da 8+ yerde `alert()`** — tarayıcıyı bloklayan, bağlam dışı uyarılar | sonner toast'lara çevrildi ✅ |
| P5 | `POST /api/notifications/:id/read` yok (frontend POST atıyor, backend PATCH bekliyor) | Bildirim tek okuma 404 ✅ düzeltildi |
| P6 | `POST /api/users/switch-role` yok (dashboard'daki rol değiştir butonu) | Buton her zaman hata veriyordu ✅ eklendi |

---

## Bölüm 2 — Yapılan Değişiklikler

### Backend (4 dosya)

1. **`backend/routes/events.js`** — `eventSchema`'ye `description` ve `location` alanları eklendi (önceden zod tarafından sessizce siliniyordu)
2. **`backend/routes/users.js`** — 2 yeni endpoint:
   - `GET /api/users/me` → giriş yapan kullanıcının tam profili (puan, e-posta, isim — frontend'in beklediği yanıt)
   - `POST /api/users/switch-role` → CUSTOMER ↔ ORGANIZER geçişi (ADMIN korunur, yeni JWT döner)
3. **`backend/routes/notifications.js`** — `POST /:id/read` eklendi (frontend uyumu)

### Frontend (16 dosya)

4. **`src/lib/api.ts` (YENİ)** — Merkezi API istemcisi:
   - URL normalizasyonu: env sonundaki `/api` kırpılır → `/api/api/...` 404 sorunu kökten çözüldü
   - Token cookie'sinden otomatik `Authorization` header'ı
   - 15 sn zaman aşımı + tutarlı `ApiError` (kullanıcı dostu Türkçe mesajlar)
   - `API_ORIGIN` export'u (socket bağlantıları için)

5. **`src/app/event/create/page.tsx`** — Sihirbaz:
   - Fiyat + ödeme türü payload'a eklendi (W1, W2)
   - Açıklama artık gönderiliyor (W3)
   - Yerel saat → UTC doğru dönüşüm (W6)
   - `status: 'Aktif'` (kapasite ≤50 ise) → etkinlik **gerçekten anında yayınlanıyor** (W5)
   - `alert()` yerine satır içi hata kutusu + kaydırma (W8)
   - Tamamlanan adımlara tıklayarak geri dönüş (W9)
   - Çift gönderim koruması, "giriş gerekli" akışı

6. **`src/components/EventWizard/StepBasicInfo.tsx`** — Bilet fiyatı (₺) ve ödeme türü (Ücretsiz / Kartsız-Havale / Kredi Kartı) alanları; fiyat>0 olunca ödeme türü otomatik "Kartsız"a geçer; geçmiş tarih engeli (min=today); ölü coverImage alanı kaldırıldı

7. **`src/components/EventWizard/StepSummary.tsx`** — Fiyat ve ödeme türü rozetleri, hata kutusu, coverImage bloğu kaldırıldı

8. **`src/components/EventWizard/StepLayout.tsx`** — Salon yükleme hata durumu + "Tekrar Dene" butonu (W11)

9. **`src/app/event/[id]/page.tsx`** — Müşteri akışı:
   - **Tek koltuk seçimi** (backend kapasitesine uygun; çoklu seçim kaldırıldı) (C1)
   - Kilitlenen seçili koltuk otomatik temizlenir + toast bildirimi (C2)
   - Bekleme listesi formundan kupon/fiyat kaldırıldı (C3)
   - Tüm fetch'ler `apiFetch`'e geçti; socket `API_ORIGIN`'e bağlanıyor (C5, C6, P1)
   - Effect temizliği (`cancelled` bayrağı) → gezinme sonrası stale state yok

10. **`src/app/page.tsx`** — Ana sayfa:
    - Kategori filtreleri gerçek veriye dayalı: **Tümü / Ücretsiz / Ücretli** (H1)
    - Demo etkinlik fallback'i kaldırıldı → hata ekranı + "Tekrar Dene" (H2, H3)
    - `motion/react` importu (framer-motion çift paketi temizliği)

11. **`src/components/SeatMapViewer.tsx`** — ResizeObserver + `stageWidth` state (P3), `useMemo` ile layout parse

12. **`src/app/dashboard/layout.tsx`** — `<Toaster>` eklendi; **`events`, `halls`, `coupons` sayfalarındaki `alert()`'ler toast'a çevrildi** (P4) — "link kopyalandı", "salon kopyalandı", "kupon oluşturuldu" vb. artık şık bildirimlerle

13. **`aggregator`, `designer`, `nasil-calisir`** — `framer-motion` → `motion/react`; **`framer-motion` bağımlılığı kaldırıldı** (P2)

---

## Bölüm 3 — Doğrulama Sonuçları

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` (frontend) | ✅ 0 hata |
| `npx next build` (production) | ✅ 27 rota, hata yok |
| Backend Jest (unit + integration) | ✅ 64/64 test PASS |
| Canlı API smoke testi (`/api/users/me`) | ✅ profil + puan dönüyor |
| Canlı API smoke testi (`/api/users/switch-role`) | ✅ CUSTOMER→ORGANIZER, yeni token üretiliyor |
| Canlı API smoke testi (etkinlik oluşturma) | ✅ `price:250, description, paymentType:cardless` kaydediliyor |
| Canlı API smoke testi (anında yayın) | ✅ `status:'Aktif'` → `/api/events/public` listesinde görünüyor |
| `POST /api/notifications/:id/read` | ✅ 200 (eskiden 404) |
| ESLint — SeatMapViewer `refs` hatası | ✅ düzeltildi (render'da ref okuma yok) |
| ESLint — yeni dosyalar | ✅ yalnızca projedeki mevcut `no-explicit-any` stil sorunları kaldı (genel taban: 130 → 83 hata, `any` tiplendirmesi ayrı bir sprint işi) |

---

## Bölüm 4 — Kullanıcı Yolculuğu: Önce → Sonra

### Organizatör: "Etkinlik Oluştur" akışı
**ÖNCE:** Tür seç → bilgileri gir (fiyat sorulmaz!) → düzen seç → özet → **etkinlik sessizce Taslak olarak kaydedilir, ücretsizdir, açıklaması kaybolur, saatleri kayar, kullanıcı hiçbir yerde göremez.**
**SONRA:** Tür → bilgi + **fiyat + ödeme türü** → düzen → özet (fiyat/ödeme görünür) → **etkinlik anında "Aktif" olur, açıklama ve saatler doğru kaydedilir**, hata olursa satır içi mesaj, istediğin adıma tek tıkla dön.

### Müşteri: "Bilet Al" akışı
**ÖNCE:** 3 koltuk seçer ama 1'i alınır; kilitli koltuğu seçili kalır; dolu etkinlikte kupon sorulur; giriş yapmışsa formu boş gelir.
**SONRA:** Tek koltuk seçimi net; kilitlenen koltuk otomatik temizlenir; waitlist formu sade ve temiz; giriş yapınca ad/e-posta/puan otomatik dolar; canlı koltuk güncellemeleri her ortamda çalışır.

### Ziyaretçi: Ana sayfa
**ÖNCE:** "Konser" filtresi her zaman boş; API kapalıysa tıklanınca 404'e götüren sahte etkinlikler.
**SONRA:** Gerçek filtreler (Ücretsiz/Ücretli), hata durumunda "Tekrar Dene", boş durumda net mesaj.

---

## Bölüm 5 — Sıradaki Öneriler (Bu Turda Yapılmadı)

**Sihirbaz / ürün:**
1. **Etkinlik türü alanı veritabanına eklenmeli** (`eventType` kolonu) — şu an seçim kayboluyor (backend şema + migration gerekir)
2. **Kapak görseli için gerçek depolama** (yükleme + CDN) — alan şu an kaldırıldı çünkü kaydedilmiyordu
3. **Çoklu bilet satın alma** (birden fazla koltuk tek checkout'ta) — backend'de `seatIds` şemada var ama işlenmiyor; transaction ile N rezervasyon oluşturulmalı
4. Sihirbazda **konum/adres alanı** (`location` backend'de hazır, şemaya eklendi — frontend formuna eklenebilir)
5. **Salon tasarımcısı içinde "kaydet ve sihirbaza dön"** akışı (şu an yeni sekme + manuel yenileme)

**Performans:**
6. ESLint `no-explicit-any` temizliği (83 hata) — büyük ama mekanik bir iş
7. `react-compiler` etkinleştirme (Next 16) — deneysel, ölçüm sonrası
8. API yanıtlarında gereksiz alan kırpma (`select` ile) — özellikle admin listelerinde
9. `/api/admin/reports` ve `/api/admin/stats`'ın SQL agregasyonuna geçirilmesi (tüm rezervasyonlar belleğe alınıyor)
10. Görsel yüklerinde `next/image` kullanımı

**Güvenlik (önceki rapordan):** P0 maddeleri (webhook imzası, IDOR, secret fallback'leri) bu turun kapsamı dışındaydı — **Sprint 1'de yapılmalı**.

---

*Değişiklikler `git diff` ile incelenebilir; istenirse tek commit olarak paketlenip push edilebilir.*

---

## Bölüm 6 — Ana Sayfa Yeniden Tasarımı (Ek Tur)

**Tarih:** 2026-08-21 · **Kapsam:** `frontend/src/app/page.tsx` sıfırdan yeniden yazıldı + `backend/routes/events.js` zenginleştirildi

### Tasarım kararları (ürünün ne yaptığına dayalı)

Ana sayfa iki kitleye hizmet eder: **etkinlik arayan müşteri** (keşfet → koltuk seç → QR ile gir) ve **etkinlik düzenleyen organizatör**. Yeni tasarım her iki yolculuğu da besler.

| Bölüm | Karar | Neden |
|---|---|---|
| Hero | Koyu gradyan + grid deseni + glow; sol: başlık/arama/CTA, sağ: **gerçek veriden öne çıkan etkinlik kartı** + floating rozetler | Ürünün çekirdek vaadini (haritadan koltuk seç, QR ile gir) anında anlatır; sahte görsel yerine canlı veri güven verir |
| Arama | Büyük arama kutusu (hero'da), isim/açıklama/mekânda anlık client-side filtre | Keşif birincil iş; backend'de arama endpoint'i olmadığından client-side (mevcut veri kümesi küçük) |
| "Nasıl Çalışır" | 3 adım: Keşfet → Koltuğu Seç → QR ile Gir | Yeni kullanıcıyı ürünün gerçek akışına hazırlar |
| İstatistik şeridi | Toplam etkinlik / ücretsiz / açık kontenjan (client-side) | Sosyal kanıt + aciliyet |
| Filtreler | Tümü / Bu Hafta / Bu Ay / Ücretsiz / Koltuklu (gerçek veri alanlarına dayalı) | Önceki tasarımda "kategori" alanı backend'de olmadığı için filtreler hep boştu; artık gerçek alanlar kullanılıyor |
| Kartlar | Tarih bloğu, durum rozetleri (DOLU / SON X BİLET / ÜCRETSİZ / fiyat), **kalan bilet progress bar'ı**, satıldı sayacı | `soldCount/capacity` verisi backend'e eklendi; "Son 2 bilet!" aciliyeti dönüşümü artırır, "DOLU" kartlarda "Bekleme Listesi" CTA'sı dönüşümü korur |
| Organizatör CTA | "Kendi etkinliğini 5 dakikada oluştur" bandı + 4 özellik kartı | İkinci hedef kitle; `/event/create`'e net yönlendirme |
| Footer | Mini footer (Nasıl Çalışır / Keşif / Gizlilik / Oluştur) | Önceki sayfada yoktu |

### Backend değişikliği: zenginleştirilmiş public liste

`GET /api/events/public` artık her etkinlik için **`capacity`, `soldCount`, `availableCount`** döner:
- Koltuklu → kapasite salon planından (`calculatedSeatCount || seatCount`), koltuksuz → `capacity`
- Satış sayısı yalnızca **aktif** rezervasyonlardan sayılır (`Onaylı` + `Beklemede`; iptal edilenler kapasiteyi işgal etmez) — Prisma filtered `_count`
- Cache 5 dk korundu (enrich edilmiş veri cache'lenir)

**Doğrulama (canlı):** 6 etkinlik, 480/500 satılmış fuar → `availableCount:20` (kırmızı "SON 20 BİLET" rozeti), 26/28 satılmış bağış gecesi → `availableCount:2`, 0/200 satılmış gala → `availableCount:200` ✅

### Altyapı (önizleme/proxy)

- `frontend/src/lib/api.ts`: `NEXT_PUBLIC_API_URL` boşsa **relative** `/api` kullanır (dev'de Next rewrites backend'e proxy'ler; production'da env zorunlu kalır)
- `frontend/next.config.ts`: geliştirme modunda `/api/*` ve `/socket.io/*` → `localhost:5000` rewrite'ları (localstack/CORS sorunlarını kökten çözer)
- `backend/seed-preview.js`: yalnızca geliştirme için örnek veri (1 salon + 6 çeşitli etkinlik + satışlar)

### Sıradaki fikirler (istenirse)
- Hero'ya "yaklaşan ilk etkinlik" otomatik dönen slayt
- Kategori/etiket altyapısı backend'e eklenip gerçek kategori filtreleri
- Etkinlik sayfasına geri sayım sayacı (hero kartında)
- Organizatör CTA'sında canlı "son 7 günde X etkinlik oluşturuldu" istatistiği

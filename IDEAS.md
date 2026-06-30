# Raw Ideas Backlog (IDEAS.md)

## Purpose
This document logs raw product features, optimization concepts, refactoring suggestions, and general ideas before they are scored and prioritized.

* **When to read it:** During feature planning phases or when identifying technical debt that requires future improvements.
* **What it controls:** Initial ingestion of ideas and backlog categorization.
* **What it must not contain:** Numerical priority queues or sprint-specific assignments (refer to [HIGH_SCORE_IDEAS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/HIGH_SCORE_IDEAS.md)).
* **Which files it depends on:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md)
* **Which files depend on it:** [HIGH_SCORE_IDEAS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/HIGH_SCORE_IDEAS.md)

---

## Ideas Management Guidelines

### Idea Categories
* **FEAT:** Product features, workflows, and integrations.
* **REFACTOR:** Code cleanups, architecture alignment, technical debt reduction.
* **PERF:** Response time improvements, query optimizations.
* **SEC:** Security audits, policy updates, strict rate limits.

### Required Fields for New Ideas
1. **ID:** `IDEA-YYYY-MM-DD-X` (Unique index)
2. **Category:** `[FEAT/REFACTOR/PERF/SEC]`
3. **Description:** Clear explanation of what is proposed.
4. **Expected Benefit:** Why it should be built.
5. **Status:** `[Raw / Scored / Rejected]`

### Promotion to Scored Ideas
* Any agent or user can add ideas to this file.
* Once an idea has all required fields, it must be evaluated using the scoring matrix in [HIGH_SCORE_IDEAS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/HIGH_SCORE_IDEAS.md) and moved there.
* Weak, duplicate, or out-of-scope ideas (violating [PRODUCT.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PRODUCT.md) non-goals) are marked `Rejected` and preserved at the bottom.

---

# Bilet Uygulaması - Fikir Havuzu

Bu doküman, sistem tarafından üretilen fikirleri barındırır. Fikirler, özellik ekleme, gereksiz kod silme veya refactoring gibi eylemleri kapsayabilir.

## Mevcut Fikirler

### Fikir #1: Gereksiz Wrapper (Sarmalayıcı) Fonksiyonların Silinmesi
- **Tarih:** 22 Haziran 2026
- **Hedef Dosya/Fonksiyon:** `Code.js` -> `clientGetEvents()`, `clientGetLayouts()` vb.
- **Fikir:** `Code.js` içerisinde bulunan 18 adet `client*` ön ekli sarmalayıcı fonksiyonun (örn: `function clientGetEvents() { return getEvents(); }`) silinmesi. Frontend doğrudan `google.script.run.getEvents()` şeklinde çağırmalıdır.
- **Sağlayacağı Fayda:** Kod okumasını sadeleştirir, bakım yükünü azaltır, teknik borcu (technical debt) temizler.
- **Puanlama:**
  - Teknik Etki / Performans: 8/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 5/10
  - Uygulanabilirlik / Maliyet: 10/10
  - **Toplam Puan:** 23/30
- **Durum:** 🟢 Puanı yüksek olduğu için Roadmap'e eklendi.

### Fikir #2: Local Geliştirme İçin SQLite Alternatifi Sağlanması
- **Tarih:** 22 Haziran 2026
- **Hedef Dosya/Fonksiyon:** `prisma/schema.prisma` ve Local Setup
- **Fikir:** Geliştiricinin (veya sizin) bilgisayarında Docker veya MySQL Server kurulu değilse geliştirme sürecinin durmaması için Prisma'nın MySQL yerine **SQLite** ile çalışabileceği esnek bir konfigürasyon yapılması.
- **Sağlayacağı Fayda:** Bilgisayara harici bir sunucu kurmaya gerek kalmadan anında kodlamaya ve test yapmaya olanak sağlar (Sıfır kurulum eforu).
- **Puanlama:**
  - Teknik Etki / Performans: 7/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10 (Sıfır kurulum gerektirir)
  - Uygulanabilirlik / Maliyet: 9/10 (Sadece provider satırı değişir)
  - **Toplam Puan:** 26/30
- **Durum:** 🟢 Puanı yüksek olduğu için Roadmap'e eklendi.

### Fikir #3: Merkezi Zod Validasyon Middleware'i (Clean Code)
- **Tarih:** 22 Haziran 2026
- **Hedef Dosya/Fonksiyon:** `routes/events.js` ve `routes/halls.js`
- **Fikir:** Her API uç noktasında (endpoint) gelen isteği (req.body) doğrulamak için tekrar tekrar `try/catch` blokları ve Zod parse işlemleri yazmak yerine, genel bir `validate(schema)` middleware'i yazmak.
- **Sağlayacağı Fayda:** Kod tekrarını (DRY prensibi) engeller. Rota dosyalarının (routes) sadece iş mantığına odaklanmasını sağlayarak okunabilirliği artırır ve spagetti kodu engeller.
- **Puanlama:**
  - Teknik Etki / Performans: 8/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10
  - Uygulanabilirlik / Maliyet: 9/10
  - **Toplam Puan:** 27/30
- **Durum:** 🟢 Puanı yüksek olduğu için Roadmap'e (Faz 3 altına) eklendi.

### Fikir #4: Next.js Edge Middleware ile Rota Koruması (Route Protection)
- **Tarih:** 22 Haziran 2026
- **Hedef Dosya/Fonksiyon:** `frontend/src/middleware.ts`
- **Fikir:** Admin sayfalarına (`/admin/*`) yetkisiz erişimleri engellemek için her React bileşeninin içine Auth kontrolü yazmak yerine, Next.js'in yerleşik `middleware.ts` dosyasını kullanmak.
- **Sağlayacağı Fayda:** İstemci tarafında yetkisiz bir sayfa render edilmeden önce Edge tarafında istek kesilir ve kullanıcı `/login` sayfasına anında yönlendirilir. İnanılmaz performanslıdır ve bileşenleri temiz tutar.
- **Puanlama:**
  - Teknik Etki / Performans: 10/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 9/10
  - Uygulanabilirlik / Maliyet: 9/10
  - **Toplam Puan:** 28/30
- **Durum:** 🟢 Puanı yüksek olduğu için Roadmap'e (Faz 4 altına) eklendi.

### Fikir #5: Salon Tasarımcısı İçin "Izgaraya Hizalama" (Snap-to-Grid)
- **Tarih:** 22 Haziran 2026
- **Hedef Dosya/Fonksiyon:** `frontend/src/app/admin/designer/page.tsx`
- **Fikir:** Kullanıcıların salon tasarlarken koltukları serbest bırakmak yerine, "Snap to Grid" algoritmasıyla 20px (veya belirli bir grid boyutuna) katlarına yuvarlayarak, koltukların milimetrik değil de matematiksel olarak düzgün sıralar halinde dizilmesini sağlamak.
- **Sağlayacağı Fayda:** Admin'in profesyonel ve hizalı salon planları çizebilmesini sağlar. İleride rezervasyon ekranında müşterinin koltukları yamuk yumuk görmesini engeller. Aksi takdirde tasarım aşırı özensiz duracaktır.
- **Puanlama:**
  - Teknik Etki / Performans: 8/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10 (Tasarımı kurtarır)
  - Uygulanabilirlik / Maliyet: 8/10 (Sürükleme eventinde sadece Math.round() kullanılacak)
  - **Toplam Puan:** 26/30
- **Durum:** 🟢 Puanı yüksek olduğu için Roadmap'e (Faz 5 altına) eklendi.

### Fikir #6: E-Bilet E-postasına Gömülü (Inline Base64) Dinamik QR Kod
- **Tarih:** 22 Haziran 2026
- **Hedef Dosya/Fonksiyon:** `backend/routes/reservations.js` (Onaylama Fonksiyonu)
- **Fikir:** Bilet onaylandığında müşteriye giden e-postaya PDF eki koyup sunucuyu yormak yerine, `qrcode` paketiyle bilet kodunu (`ticketCode`) Base64 formatına çevirip doğrudan HTML E-posta şablonuna gömmek (`<img src="data:image/png;base64,...">`).
- **Sağlayacağı Fayda:** Müşteri, e-postayı açtığı an kapıdaki görevliye doğrudan telefonunu gösterip check-in yapabilir. Ek indirme gerektirmez. Hem performanslıdır hem de UX açısından kusursuzdur.
- **Puanlama:**
  - Teknik Etki / Performans: 10/10 (PDF oluşturma yükünü sıfırlar)
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10 (Anında açılan bilet)
  - Uygulanabilirlik / Maliyet: 9/10
  - **Toplam Puan:** 29/30
- **Durum:** 🟢 Puanı yüksek olduğu için Roadmap'e (Faz 7 altına) eklendi.

---

## Rakip Analizi Kaynaklı Fikirler (29 Haziran 2026)

### Fikir #7: Grup Rezervasyon Paylaşım Linki
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Bir masadan kısmi satın alım yapan kullanıcıya 30 dakika geçerli "Gruba Katıl Linki" oluşturulur. Bu linki alan arkadaşlar masanın kalan koltuklarını rezerve edebilir. Süre dolunca koltuklar genel satışa açılır.
- **Sağlayacağı Fayda:** Toplu katılımlı etkinliklerde arkadaş gruplarının aynı masada buluşmasını sağlar. Virütik büyümeyi tetikler — her kullanıcı potansiyel müşteri çeker.
- **Puanlama:**
  - Teknik Etki / Performans: 7/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10
  - Uygulanabilirlik / Maliyet: 7/10 (JWT tabanlı geçici link + socket)
  - **Toplam Puan:** 24/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

### Fikir #8: Görüş Açısı Analizi + Otomatik Fiyat Önerisi
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Salon tasarımcısındaki metre verisini kullanarak her koltuğun sahneye mesafesi ve önündeki engeller (kolon, büfe, başka masa) hesaplanır. "Kısıtlı Görüş" etiketi otomatik basılır. Admin isteğe bağlı olarak bu koltuklar için indirimli fiyat önerisini tek tıkla onaylar.
- **Sağlayacağı Fayda:** Müşteri şikâyetlerini engeller, kısıtlı görüşlü koltukları "sürpriz" yerine şeffaf bilgi ile satar. Premium koltuklar için dinamik fiyat artışı da uygulanabilir.
- **Puanlama:**
  - Teknik Etki / Performans: 8/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 9/10
  - Uygulanabilirlik / Maliyet: 7/10 (Geometrik hesap, koordinat farkı)
  - **Toplam Puan:** 24/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

### Fikir #9: Telegram Mini App (Tarayıcısız Bilet + QR Check-in)
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Telegram WebApp (Mini App) altyapısıyla kullanıcı uygulamadan çıkmadan koltuk seçip ödeme yapabilir. Görevli modunda uygulama QR tarayıcıya dönüşür ve kapı kontrolü Telegram üzerinden gerçekleşir.
- **Sağlayacağı Fayda:** Türkiye'de 15M+ Telegram kullanıcısına native deneyim. Ayrı uygulama indirme gerektirmez. Telegram Bot'umuza eklenecek basit bir WebApp URL'si yeterli.
- **Puanlama:**
  - Teknik Etki / Performans: 9/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10
  - Uygulanabilirlik / Maliyet: 8/10 (Telegram WebApp API hazır, küçük adaptasyon)
  - **Toplam Puan:** 27/30
- **Durum:** 🟠 Yüksek öncelikli — HIGH_SCORE'a taşınmayı bekliyor.

### Fikir #10: Dinamik Doluluk Bazlı Fiyatlandırma (Dynamic Pricing Engine)
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Salon doluluk oranı admin'in belirlediği eşiği (%70 gibi) aştığında kalan biletlerin fiyatı otomatik olarak belirlenen tavan fiyata doğru kademeli artar. Organizatör max fiyatı ve doluluk eşiğini önceden tanımlar.
- **Sağlayacağı Fayda:** Uçak bileti mantığı — popüler etkinliklerde gelir maksimize edilir. Erken alanlar ödüllendirilir, geç kalanlar daha fazla öder.
- **Puanlama:**
  - Teknik Etki / Performans: 9/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 8/10
  - Uygulanabilirlik / Maliyet: 7/10 (Rezervasyon sayacı + fiyat güncelleme trigger)
  - **Toplam Puan:** 24/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

### Fikir #11: Dijital Garson & Masa Sipariş Entegrasyonu
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Etkinlik esnasında bilet QR kodu aynı zamanda masa siparişi için kullanılır. Müşteri telefondaki biletinden menüyü açar, sipariş verir, ödemeyi tamamlar. Sipariş organizasyonun mutfak/bar paneline düşer.
- **Sağlayacağı Fayda:** Yemekli/içkili organizasyonlarda salon içi ciro büyük artış yaşar. Garson ihtiyacını azaltır, sipariş hızını artırır. Masa sipariş modülü bir add-on olarak ek gelir kapısı.
- **Puanlama:**
  - Teknik Etki / Performans: 8/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10
  - Uygulanabilirlik / Maliyet: 6/10 (Mutfak paneli, menü yönetimi, ödeme akışı gerekli)
  - **Toplam Puan:** 24/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

---

## Orijinal Yeni Fikirler (29 Haziran 2026)

### Fikir #12: Etkinlik Sonrası Otomatik Anket & Yorum Toplama
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Etkinlik bitişinden 2 saat sonra bilet sahibine otomatik e-posta/Telegram mesajı gider: "Etkinliği nasıl buldunuz? (1–5 yıldız + 1 satır yorum)". Yanıtlar admin panelinde etkinliğe ait bir "Değerlendirme" sekmesinde toplanır.
- **Sağlayacağı Fayda:** Organizatör etkinlik kalitesini ölçer. Yüksek puanlı etkinlikler anasayfada öne çıkarılabilir. Müşterinin sisteme bağlılığı artar (engagement).
- **Puanlama:**
  - Teknik Etki / Performans: 6/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 9/10
  - Uygulanabilirlik / Maliyet: 9/10 (Cron job + basit form)
  - **Toplam Puan:** 24/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

### Fikir #13: Rezervasyon Bekleme Listesi (Waitlist)
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Etkinlik dolduğunda müşteri "Bekleme Listesine Gir" butonuna tıklar. Herhangi bir rezervasyon iptal edildiğinde sistem otomatik olarak sıradaki kişiye Telegram/e-posta bildirim gönderir ve 30 dakika içinde satın almak için öncelikli link verir.
- **Sağlayacağı Fayda:** Dolmuş etkinliklerde boşa giden koltuk kalmaz. İptal edilen her koltuk anında yeni bir satışa dönüşür. Müşteri kaybı önlenir.
- **Puanlama:**
  - Teknik Etki / Performans: 9/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 10/10
  - Uygulanabilirlik / Maliyet: 7/10 (Waitlist tablosu + socket + bildirim)
  - **Toplam Puan:** 26/30
- **Durum:** 🟠 Yüksek öncelikli — HIGH_SCORE'a taşınmayı bekliyor.

### Fikir #14: Reseller (Bayi) Paneli & Komisyon Yönetimi
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Ajanslar, etkinlik yönetim şirketleri ve serbest danışmanlar kendi müşterilerini sisteme dahil edebilir ve her müşterinin aylık aboneliğinden %20–30 bayi komisyonu kazanabilir. Bayi panelinde müşteri listesi, tahsilat durumu ve aylık kazanç raporu görünür.
- **Sağlayacağı Fayda:** Sıfır satış personeli ile büyüme. Her bayi bir satış kanalına dönüşür. Pazar penetrasyonu hızlanır.
- **Puanlama:**
  - Teknik Etki / Performans: 7/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 8/10
  - Uygulanabilirlik / Maliyet: 7/10 (Çok kiracılı yapı, komisyon hesabı)
  - **Toplam Puan:** 22/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

### Fikir #15: Etkinlik Paketi & Sezon Bileti (Multi-Event Pass)
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Organizatör birden fazla etkinliği paket olarak satabilir (örn: "3'lü Caz Serisi Paketi — 3 konser 750 TL"). Müşteri paketi satın alır, sistem her etkinlik için ayrı QR bilet oluşturur.
- **Sağlayacağı Fayda:** Organizatör ilk etkinlikte sonraki etkinliklerin parasını peşin alır. Müşteri bağlılığı artar. Toplam sepet değeri yükselir.
- **Puanlama:**
  - Teknik Etki / Performans: 8/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 9/10
  - Uygulanabilirlik / Maliyet: 7/10 (Paket entity + çoklu rezervasyon bağlantısı)
  - **Toplam Puan:** 24/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

### Fikir #16: Sponsor & Reklam Modülü (Etkinlik Sponsoru Ekranı)
- **Tarih:** 29 Haziran 2026
- **Kategori:** FEAT
- **Fikir:** Organizatör etkinliğine sponsor alabilir. Sponsor logosu e-bilette, etkinlik sayfasında ve check-in ekranında görünür. Sistem sponsora "kaç kişi gördü, kaç kişi tıkladı" analitik raporunu verir.
- **Sağlayacağı Fayda:** Organizatör ek gelir kapısı bulur. Sistem bize de premium add-on geliri sağlar. Küçük işletmeler için yerel reklam platformuna dönüşür.
- **Puanlama:**
  - Teknik Etki / Performans: 6/10
  - Kullanıcı / Geliştirici Deneyimi (UX): 7/10
  - Uygulanabilirlik / Maliyet: 8/10 (Sponsor tablosu + logo upload + görüntülenme sayacı)
  - **Toplam Puan:** 21/30
- **Durum:** 🟡 Raw — Değerlendirme bekliyor.

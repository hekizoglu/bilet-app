# 🧪 Bilet Uygulaması — 5 Rol Senaryosu (Adım Adım Kontrol Noktalı)

Her adımın altına, o adımda test edenin **gözlemlemesi/doğrulaması gereken** noktalar (🔍) eklenmiştir. Bunlar hem manuel test hem de otomasyon (Playwright/Cypress) senaryosuna dönüştürülürken checklist olarak kullanılabilir.

---

## Senaryo 1: ORGANİZATÖR — Koltuklu & Kartsız Ödemeli Konser Organizasyonu

### 👤 Rol ve Profili
* **Kullanıcı:** Caner Bey (Organizatör – `@gmail.com` yetkili kullanıcı)
* **Hedef:** Yeni bir konser salonu tasarlamak, koltuklu ve IBAN/Telegram ödemeli canlı konser satışı başlatmak.

### 📜 Hikaye ve Adımlar

**1. Sisteme Giriş ve Yetkilendirme**
* Caner Bey `http://localhost:3005/login` adresinden Google OAuth ile giriş yapar (`@gmail.com` kısıtı doğrulanır).

> 🔍 **Dikkat/Takip:**
> * `@gmail.com` dışında bir domain (örn. `@outlook.com`) ile giriş denendiğinde gerçekten reddediliyor mu?
> * Reddedilme mesajı kullanıcı dostu mu, yoksa çıplak bir hata (500/stack trace) mı dönüyor?
> * Girişten sonra JWT/session süresi ne kadar, "beni hatırla" seçeneği var mı?
> * Organizatör rolü ilk girişte otomatik mi atanıyor, yoksa admin onayı mı gerekiyor? (Yeni bir organizatör hesabı kötüye kullanım riski taşır.)

**2. Salon Tasarım Aracı (Hall Designer – Canvas)**
* Caner Bey **"Salon Tasarımcısı"** (`/dashboard/designer`) ekranına geçer.
* Kanvas üzerinde 4 adet Yuvarlak VIP Masa (`M1`, `M2`...) ve 40 adet Sıralı Koltuk çizer.
* Salon adını *"Harbiye Açıkhava Konser Düzeni"* olarak kaydeder (`layoutJson` Prisma modeline kaydedilir).

> 🔍 **Dikkat/Takip:**
> * Kanvas kaydedilmeden sayfa yenilenirse/tarayıcı kapatılırsa taslak kayboluyor mu? Otomatik taslak kaydı (autosave) var mı?
> * Aynı koltuk numarası (`M1`, `M1`) iki kez verilirse sistem uyarıyor mu, yoksa sessizce üzerine mi yazıyor?
> * 40 koltuk yerine 400 koltuk gibi büyük bir salon çizildiğinde canvas performansı (render, sürükle-bırak) düşüyor mu?
> * `layoutJson` DB'de saklanan format çok büyürse (karmaşık salon) sayfa yükleme süresi nasıl etkileniyor?
> * Salon kaydedildikten sonra başka bir organizatör bu salonu görebiliyor mu (izolasyon/yetki testi — salon sadece kendisine mi ait)?

**3. Kartsız Ödeme Etkinliği Oluşturma**
* **"Etkinlik Oluştur"** ekranına gelir:
  * **Etkinlik Adı:** *"Caz Gecesi Konseri"*
  * **Salon:** *Harbiye Açıkhava Konser Düzeni* (`isSeated = true`)
  * **Ödeme Yöntemi:** `cardless` (Kartsız / EFT-Havale / Telegram Teyitli)
  * **Bilet Fiyatı:** 300 ₺

> 🔍 **Dikkat/Takip:**
> * Etkinlik adı boş bırakılırsa, fiyat negatif/0 girilirse form doğrulaması (validation) çalışıyor mu?
> * `cardless` seçilince IBAN bilgisi organizatör tarafında zorunlu mu, girilmezse müşteri ödeme ekranında ne görüyor?
> * Etkinlik oluşturma anında sistem otomatik "Taslak" mı yapıyor yoksa direkt "Yayında" mı? (Senaryo 3'teki onay mekanizmasıyla çelişmemeli — belirli bir bilet/kapasite eşiğinin altında mı onay istemiyor?)
> * Aynı isimde iki etkinlik oluşturulabiliyor mu (slug/URL çakışması riski)?

**4. Gerçek Zamanlı Koltuk Kilidi (Socket.io & Redlock)**
* Caner Bey istemci gözüyle koltuk haritasını izler. Bir müşteri koltuğa tıkladığında `seat_locked` soket yayını yayılır ve diğer kullanıcılarda koltuk sarı renkte kilitlenir.

> 🔍 **Dikkat/Takip:**
> * Kilit süresi (TTL) doldğunda koltuk otomatik "boş" rengine dönüyor mu, yoksa manuel müdahale mi gerekiyor?
> * Socket bağlantısı koparsa (kullanıcı wifi kesintisi yaşarsa) koltuk sonsuza kadar kilitli mi kalıyor?
> * İki farklı müşteri aynı koltuğa aynı anda tıklarsa hangisi kazanıyor, kaybeden tarafa ne mesajı gösteriliyor? *(bkz. eklenen Senaryo 6 — eşzamanlılık)*
> * Organizatör panelinde koltuk durumları (boş/kilitli/satılmış) gerçek zamanlı mı güncelleniyor yoksa sayfa yenilemesi mi gerekiyor?

**5. Ödeme Onayı ve Biletleşme**
* Müşteri EFT havalesini yapar ve referans kodunu girer.
* Caner Bey **"Rezervasyon Yönetimi"** (`/dashboard/reservations`) paneline girer. *"Beklemede"* statüsündeki rezervasyonu bulur, **"Onayla"** butonuna basar.
* Rezervasyon statüsü `'Onaylı'` olur, otomatik e-posta kuyruğa girer (`sendTicketEmail`).

> 🔍 **Dikkat/Takip:**
> * Referans kodu boş/yanlış formatta girilirse sistem kabul ediyor mu (organizatör manuel kontrol yapmak zorunda kalıyor — bu bir sosyal mühendislik/dolandırıcılık riski taşır)?
> * "Onayla" butonuna arka arkaya iki kez (çift tıklama) basılırsa iki kez e-posta/bilet üretiliyor mu?
> * Onaydan sonra koltuk durumu "satıldı" olarak kilitleniyor mu, yoksa hâlâ başka biri tarafından seçilebilir mi?
> * E-posta kuyruğa girdikten sonra gerçekten gönderiliyor mu (kuyruk işleyici — worker — down olursa e-posta sonsuza kadar bekler mi, retry mekanizması var mı)?
> * Organizatör "Reddet" seçeneğiyle rezervasyonu reddederse müşteriye bilgi gidiyor mu, koltuk serbest kalıyor mu?

---

## Senaryo 2: MÜŞTERİ — Kupon + Sadakat Puanı Kullanımı ve Bilet Transferi

### 👤 Rol ve Profili
* **Kullanıcı:** Zeynep Hanım (Son Kullanıcı / Customer)
* **Hedef:** Tiyatro oyununa indirim kuponu ve kazandığı puanları kullanarak bilet almak, ardından bileti arkadaşına transfer etmek.

### 📜 Hikaye ve Adımlar

**1. Profil ve Puan Kontrolü**
* Zeynep Hanım sisteme giriş yapar. Profilinde geçmiş alışverişlerinden kazandığı **50 TL birikmiş sadakat puanı** (`points`) vardır.

> 🔍 **Dikkat/Takip:**
> * Puan bakiyesi profil sayfasında gerçek zamanlı DB değeriyle uyumlu mu, yoksa cache'lenmiş eski bir değer mi gösteriliyor?
> * Puanların bir son kullanma tarihi var mı, varsa süresi dolan puan otomatik düşüyor mu?

**2. Kupon ve Puan İndirimi İle Bilet Alma**
* Zeynep Hanım 200 TL'lik bir oyun seçer (`/event/[id]`).
* İndirim Kuponu kutusuna `BAHAR20` kodunu yazar ve "Uygula"ya basar (`%20 indirim = -40 TL`).
* "Sadakat Puanlarımı Kullan" kutucuğunu işaretler (`-50 TL`).
* **Ödenecek Tutar:** `200 - 40 - 50 = 110 TL` olarak dinamik güncellenir.

> 🔍 **Dikkat/Takip:**
> * Geçersiz/süresi dolmuş/kullanım limiti dolmuş bir kupon kodu girilirse hata mesajı net mi?
> * Kupon + puan üst üste uygulanabiliyor mu, yoksa bazı kuponlar "puanla birleştirilemez" kısıtına mı sahip — bu kural test ediliyor mu?
> * Toplam indirim bilet fiyatını sıfırın altına düşürüyorsa (örn. yüksek puan + yüksek kupon) sistem 0 TL'de mi duruyor, negatif mi gösteriyor?
> * Kullanılan 50 TL puan, ödeme tamamlanmadan (kullanıcı sayfadan çıkarsa) bakiyeden düşülmüş mü kalıyor yoksa iade mi ediliyor?
> * Aynı kupon kodu aynı kullanıcı tarafından farklı iki sekmede aynı anda iki kez kullanılmaya çalışılırsa kullanım limiti doğru sayılıyor mu?

**3. Bilet Oluşturma**
* "Rezervasyonu Tamamla" butonuna basar. Bilet başarıyla üretilir, Zeynep Hanım'a **5 Sadakat Puanı** daha tanımlanır.

> 🔍 **Dikkat/Takip:**
> * Yeni kazanılan 5 puan, harcanan 50 puanın düşülmesinden **sonraki** bakiyeye mi ekleniyor (sıralama/hesap hatası riski)?
> * Bilet PDF/QR anında üretiliyor mu, üretim gecikirse kullanıcıya "işleniyor" durumu gösteriliyor mu?
> * Ödeme başarısız olursa (kart reddi vb.) rezervasyon ve puan düşümü rollback ediliyor mu (transaction bütünlüğü)?

**4. Bilet Transferi (Ticket Transfer)**
* Zeynep Hanım oyuna gidemeyeceğini anlar. **"Biletlerim"** sayfasına girer.
* Bilet detayındaki **"Bileti Transfer Et"** butonuna tıklar.
* Arkadaşının e-postasını (`arkadas@gmail.com`) yazar. Bilet kodu yenilenir ve arkadaşının hesabına aktarılır.

> 🔍 **Dikkat/Takip:**
> * Transfer sonrası **eski QR kod geçersiz** hale geliyor mu (Zeynep Hanım hâlâ eski görselle giriş yapmaya çalışırsa reddedilmeli)?
> * Etkinliğe çok az kaldığında (örn. son 1 saat) transfer engelleniyor mu, yoksa kapıda karışıklığa yol açacak şekilde her zaman açık mı?
> * Arkadaşın hesabı sistemde yoksa (kayıtsız kullanıcı) e-posta ile davet/kayıt akışı düzgün tetikleniyor mu?
> * Transfer edilen bilet arkadaşın hesabından tekrar Zeynep Hanım'a veya üçüncü bir kişiye transfer edilebiliyor mu (transfer zinciri sınırı var mı)?
> * Zeynep Hanım aynı bileti hem transfer edip hem de organizatörden iade talep ederse (çifte işlem) sistem hangisini önce işliyor?

---

## Senaryo 3: YÖNETİCİ (ADMIN) — Dinamik Fiyatlandırma, Onay Süreçleri ve Raporlama

### 👤 Rol ve Profili
* **Kullanıcı:** Sistem Yöneticisi (ADMIN)
* **Hedef:** Organizatörlerin eklediği yüksek bütçeli etkinlikleri denetlemek, Dinamik Fiyatlandırmayı aktif etmek ve sistem bilançosunu incelemek.

### 📜 Hikaye ve Adımlar

**1. Etkinlik Onay Mekanizması (Approval Queue)**
* Bir organizatör 1000 kişilik ve 500 TL fiyatlı büyük bir festival ekler. Sistem otomatik olarak etkinliği `PENDING_APPROVAL` ve status `'Taslak'` yapar.
* Admin paneline giren Yöneticimiz **"Onay Bekleyen Etkinlikler"** sekmesinde talebi görür. Detayları inceleyip **"Onayla ve Yayınla"** butonuna tıklar.

> 🔍 **Dikkat/Takip:**
> * Hangi eşik değerler (kapasite/fiyat) otomatik onaya, hangileri direkt yayına giriyor — bu kural net tanımlı ve test edilebilir mi?
> * Onay bekleyen etkinlik süresi uzarsa (admin 3 gün bakmazsa) organizatöre hatırlatma bildirimi gidiyor mu?
> * Admin "Reddet" derse ret gerekçesi organizatöre iletiliyor mu, yoksa sessiz bir ret mi oluyor?
> * Aynı anda iki admin aynı etkinliği onaylamaya çalışırsa (çoklu admin ortamı) çakışma oluyor mu?

**2. Dinamik Fiyatlandırma Kurulumu (Dynamic Pricing)**
* Admin etkinlik ayarlarına girer:
  * **Taban Fiyat:** 200 TL
  * **Dinamik Eşik (`dynamicPricingThreshold`):** 50 bilet
  * **Tavan Fiyat (`maxPrice`):** 400 TL
* İlk 50 bilet satıldıktan sonra 51. bilet otomatik olarak kademeli artışla 250 TL'den satışa sunulur.

> 🔍 **Dikkat/Takip:**
> * 49. ve 50. biletin **aynı anda** satılması durumunda hangisi eski fiyattan gidiyor — sayaç atomik mi artıyor (race condition riski)?
> * Fiyat değişimi anlık olarak zaten sepetinde/ödeme ekranında bekleyen başka bir kullanıcıyı etkiliyor mu (kullanıcı 200 TL görüp ödeme ekranına geçtiyse, ödeme sırasında fiyat 250 TL'ye mi dönüyor)?
> * Tavan fiyata (400 TL) ulaşıldığında satış duruyor mu, sabitleniyor mu, yoksa "tükendi" mi gösteriliyor?
> * Fiyat değişikliği geçmişi (hangi bilet kaçıncı sırada, kaç TL'den satıldı) raporlanabiliyor mu?

**3. Kupon Üretimi (Coupon Management)**
* Admin `/dashboard/coupons` ekranından yeni bir genel kupon tanımlar:
  * **Kod:** `YUZDE15` | **Tür:** `PERCENTAGE` | **Değer:** 15 | **Kullanım Limiti:** 100

> 🔍 **Dikkat/Takip:**
> * Kullanım limiti (100) dolduğunda kupon otomatik pasif oluyor mu, yoksa 101. kullanıcı yine de kabul mü ediliyor?
> * Aynı kod (`YUZDE15`) tekrar oluşturulmaya çalışılırsa sistem duplicate kontrolü yapıyor mu?
> * Kupon belirli bir etkinliğe/organizatöre mi özel, yoksa tüm sisteme mi geçerli — bu kapsam net mi tanımlı?
> * Kuponun geriye dönük (zaten tamamlanmış siparişlere) uygulanamayacağı garanti mi?

**4. Finansal Analiz ve Audit Log**
* `/dashboard/analytics` sekmesinde günlük ciro, satılan bilet sayısı, iade oranları grafiklerini inceler.
* Güvenlik sekmesinde `AuditLog` kayıtlarını filtreleyip kimlerin fiyat değiştirdiğini veya iade yaptığını denetler.

> 🔍 **Dikkat/Takip:**
> * Analytics'teki toplam ciro rakamı, gerçek ödeme sağlayıcısı/banka mutabakatıyla bire bir tutuyor mu (kupon/puan indirimleri doğru düşülmüş mü)?
> * `AuditLog` kayıtları **değiştirilemez/silinemez** mi (bir admin kendi işlemini gizleyebiliyor mu)?
> * Raporlar büyük veri setinde (10.000+ bilet) makul sürede yükleniyor mu, sayfalama/filtreleme performanslı mı?
> * İade oranı grafiği hangi zaman dilimine göre hesaplanıyor — iade tarihine mi, satış tarihine mi göre gruplanıyor (yanlış gruplama yanıltıcı rapor üretir)?

---

## Senaryo 4: KAPI GÖREVLİSİ (STAFF) — QR Check-in, Offline Senkronizasyon & Güvenlik

### 👤 Rol ve Profili
* **Kullanıcı:** Mehmet (Kapı Görevlisi / EventStaff Scanner)
* **Hedef:** Kapıdaki 500 kişilik seyirci akışını akıllı telefon kamerasıyla taramak, sahte veya mükerrer biletleri engellemek.

### 📜 Hikaye ve Adımlar

**1. Staff Yetkilendirmesi**
* Organizatör, Mehmet'i etkinlik kadrosuna (`EventStaff` / `role = SCANNER`) ekler.

> 🔍 **Dikkat/Takip:**
> * Mehmet'in SCANNER yetkisi sadece bu etkinliğe mi özel, yoksa organizatörün tüm etkinliklerine mi otomatik yayılıyor?
> * Mehmet, tarayıcı adres çubuğundan doğrudan `/dashboard/analytics` veya `/dashboard/coupons` gibi ADMIN sayfalarına girmeye çalışırsa backend 403 döndürüyor mu (sadece frontend menüden gizlenmiş olması yetersizdir)?
> * Organizatör Mehmet'i kadrodan çıkarırsa, Mehmet'in aktif oturumu anında mı geçersiz oluyor yoksa token süresi dolana kadar erişimi devam mı ediyor?

**2. Kamera İle QR Okutma**
* Mehmet telefonundan `/dashboard/scanner` sayfasını açar. Kamera erişimine izin verir.
* Müşteri QR kodunu gösterir. Kamera kodu okur:
  * 🟢 **BİLET GÜÇLÜ ONAY:** *"Geçerli Bilet — Ahmet Yılmaz (Sıra 2 - Koltuk 5)"*
  * Bilet veritabanında `isUsed = true` ve `usedAt = NOW()` güncellenir.

> 🔍 **Dikkat/Takip:**
> * Düşük ışıkta, ekran parlamasında veya kırışık ekran koruyucuda kamera okuma başarı oranı nasıl (gerçek cihazda test edilmeli, simülatörde değil)?
> * QR kod ekran görüntüsü/fotoğraf olarak (canlı ekran yerine statik resim) okutulduğunda sistem ayrım yapabiliyor mu (canlılık/anti-sahtecilik kontrolü var mı)?
> * `usedAt` zaman damgası sunucu saatine mi yoksa cihaz saatine mi göre yazılıyor (cihaz saati yanlış ayarlıysa tutarsızlık riski)?
> * Yanlış/bozuk/başka bir etkinliğe ait QR kod okutulduğunda hata mesajı Mehmet'e net gösteriliyor mu (🔴 kırmızı ekran, sesli uyarı vb.)?

**3. Mükerrer Okutma (Duplicate Prevention)**
* Aynı bilet 1 dakika sonra tekrar okutulmak istendiğinde:
  * 🔴 **UYARI:** *"Bu bilet 14:32'de zaten kullanılmıştır!"*
  * Sistem arka planda `DUPLICATE_CHECKIN_ATTEMPT` türünde güvenlik logu (`AuditLog`) oluşturur.

> 🔍 **Dikkat/Takip:**
> * Bu uyarı ekranda ne kadar süre kalıyor, Mehmet yanlışlıkla "yine de içeri al" gibi bir override butonuna basabiliyor mu — böyle bir override varsa bu da ayrıca loglanıyor mu?
> * Mükerrer deneme belirli bir eşiği (örn. aynı bilet 5+ kez denenirse) aşarsa otomatik bir güvenlik uyarısı organizatöre/admin'e gidiyor mu (olası bilet kopyalama/sahtecilik sinyali)?
> * İki farklı kapıda (A ve B) aynı bilet neredeyse aynı anda okutulursa (network gecikmesiyle her iki cihaz da "geçerli" görebilir) — bu senaryo ayrıca test edilmeli (bkz. Senaryo 10).

**4. Çevrimdışı (Offline) Mod ve Toplu Eşitleme**
* Konser alanında mobil internet tamamen kesilir. Mehmet'in ekranı **"Offline Mod"**a geçer.
* Mehmet biletleri taramaya devam eder; biletler cihazın `IndexedDB / LocalStorage` hafızasına kaydedilir.
* İnternet geldiğinde **"Çevrimdışı Biletleri Eşitle"** butonuna basar. `/api/reservations/bulk-checkin` endpoint'i üzerinden tüm offline girişler sisteme tek seferde sorunsuz işlenir.

> 🔍 **Dikkat/Takip:**
> * Offline moda geçiş kullanıcıya (Mehmet'e) açıkça bildiriliyor mu, yoksa sessizce mi oluyor (fark etmezse kafası karışabilir)?
> * Offline sırada aynı bilet iki farklı offline cihazda okutulmuşsa, senkronizasyon sırasında hangisi "geçerli" kabul ediliyor — zaman damgasına göre mi, cihaz sırasına göre mi karar veriliyor?
> * `bulk-checkin` isteği yarıda kesilirse (senkronizasyon sırasında tekrar bağlantı giderse) hangi biletlerin işlendiği/işlenmediği Mehmet'e gösteriliyor mu, yoksa tekrar denemede çift kayıt riski var mı?
> * Cihaz hafızasında biriken bilet sayısı çok artarsa (500+ bilet) uygulama performansı/donma sorunu yaşanıyor mu?
> * Offline modda yanlış bir bilet okutulup içeri alınmışsa (gerçekte geçersiz), senkronizasyon sonrası bu durum geri alınabiliyor mu, yoksa geri dönüşü olmayan bir giriş mi kaydediliyor?

---

## Senaryo 5: VIP MİSAFİR / RSVP — Gizli Linkli Etkinlik, Bekleme Listesi & Soft Hold

### 👤 Rol ve Profili
* **Kullanıcı:** Barış Bey (Özel Davetli Misafir)
* **Hedef:** Sadece davetiye bağlantısı ile girilebilen özel kapalı bir gala gecesine RSVP yapmak, kontenjan dolduğunda bekleme listesine girmek.

### 📜 Hikaye ve Adımlar

**1. Özel Davet Linki (`PRIVATE` Visibility)**
* Etkinlik gizlidir (`visibility = PRIVATE`). Ana sayfada listede görünmez.
* Barış Bey'e özel davet linki gönderilir: `http://localhost:3005/event/gala-gecesi-2026-x9z` (`privateSlug`).

> 🔍 **Dikkat/Takip:**
> * `privateSlug` yeterince rastgele/uzun mu (tahmin edilebilir/brute-force edilebilir olmamalı — örn. `x9z` çok kısa, gerçek ortamda daha uzun rastgele değer olmalı)?
> * Etkinlik gerçekten arama motorlarında/sitemap'te indexlenmiyor mu (robots.txt / noindex kontrolü)?
> * Link üçüncü bir kişiyle paylaşılırsa (davetli olmayan biri linke ulaşırsa) sayfa açık mı kalıyor, ekstra bir doğrulama (davetli e-postası/kod girişi) isteniyor mu?

**2. RSVP Katılım Bildirimi**
* Barış Bey linke tıklar. Sayfada bilet fiyatı yerine **RSVP Paneli** çıkar.
* **Katılım Durumu:** *"Katılıyorum"* seçeneğini işaretler.
* *"Yanınızdaki Çocuk Sayısı: 1"*, *"Notunuz: Vejetaryen menü ricası"* bilgilerini yazıp gönderir.

> 🔍 **Dikkat/Takip:**
> * "Notunuz" gibi serbest metin alanı XSS/script injection'a karşı sanitize ediliyor mu (örn. `<script>` içeren bir not girilirse admin panelinde çalıştırılmadan düz metin olarak gösterilmeli)?
> * Çocuk sayısı gibi alanlar negatif veya aşırı büyük bir değer (örn. -5 veya 99999) girildiğinde doğrulanıyor mu?
> * Barış Bey RSVP'sini gönderdikten sonra fikrini değiştirip "Katılmıyorum"a çevirebiliyor mu, bu durumda kontenjan otomatik açılıyor mu?
> * Aynı davet linkinden birden fazla kişi (Barış Bey linki ailesiyle paylaşırsa) ayrı ayrı RSVP gönderebiliyor mu — bu istenen bir davranış mı yoksa link kişiye özel mi kilitlenmeli?

**3. Kapasite Dolumu ve Bekleme Listesi (Waitlist)**
* Etkinlik kapasitesi (50 kişi) dolduğunda form otomatik olarak **"Bekleme Listesine Katıl"** formuna dönüşür.
* Bir başka misafir katılımını iptal eder.

> 🔍 **Dikkat/Takip:**
> * Kapasite tam 50'ye ulaştığı anda **eşzamanlı** iki RSVP gelirse (49. ve 50. kişi aynı anda "Katılıyorum" derse) her ikisi de mi kabul ediliyor, yoksa biri bekleme listesine mi düşüyor (atomik sayaç kontrolü)?
> * Bekleme listesi sırası neye göre belirleniyor (RSVP zamanı mı, başka bir öncelik kriteri mi) ve bu sıra kullanıcıya gösteriliyor mu ("sırada 3. kişisiniz" gibi)?
> * İptal eden misafirin çocuk sayısı bilgisi de kapasiteden düşülüyor mu (örn. 2 kişilik iptal 2 kontenjan mı açıyor)?

**4. Otomatik Bildirim ve Soft Hold (15 Dk Opsiyon Süresi)**
* İptal gerçekleştiği an sistem Bekleme Listesindeki ilk kişi olan Barış Bey'e **"Bilet Açıldı!"** e-postası ve Telegram mesajı atar.
* Barış Bey için bilet 15 dakika boyunca **"Ödeme Bekleniyor / Soft Hold"** statüsünde kilitlenir. Barış Bey 15 dk içinde onaylayıp biletini alır.

> 🔍 **Dikkat/Takip:**
> * Barış Bey 15 dakika içinde yanıt vermezse, sistem otomatik olarak sıradaki bekleme listesi kişisine mi geçiyor, yoksa manuel admin müdahalesi mi gerekiyor?
> * E-posta ve Telegram bildirimlerinden biri başarısız olursa (örn. Telegram bot API'si o an down ise) diğer kanaldan bilgi gitmeye devam ediyor mu, yoksa Barış Bey hiç haberdar olmuyor mu?
> * 15 dakikalık süre sunucu saatine göre mi sayılıyor (kullanıcının kendi cihaz saatinden bağımsız olmalı)?
> * Barış Bey süresi dolmadan hemen önce (örn. 14. dakikada) onaylarsa, tam o anda süre dolup sıradaki kişiye de bildirim gitmiş olabilir mi (yarış durumu) — bu durumda iki kişiye aynı bilet mi açılmış olur?
> * Soft hold süresince Barış Bey'in koltuğu/bileti diğer normal satış akışında (herkese açık satışta) yanlışlıkla görünür/satılabilir durumda mı kalıyor?

---

## 🎯 Kullanım Notu
Her "🔍 Dikkat/Takip" bloğu, o adımın **manuel test checklist maddesi** veya **otomasyon assertion'ı** olarak birebir kullanılabilir. Özellikle eşzamanlılık (aynı anda iki işlem), zaman aşımı sınırları (15 dk, TTL) ve yetki aşımı (frontend'de gizli ama backend'de açık endpoint) noktaları, gerçek kullanıcıların asla bilerek denemeyeceği ama üretim ortamında en sık patlayan noktalardır — bu yüzden ayrıca vurgulanmıştır.
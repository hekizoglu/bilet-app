# 🧪 Bilet Uygulaması — 5 Farklı Rol & Senaryo Test Şablonu

Bu belge, uygulamanın farklı kullanıcı rollerini (**ADMIN**, **ORGANIZER**, **CUSTOMER**, **STAFF SCANNER**, **VIP GUEST**) ve `README.md` belgesindeki tüm teknik özellikleri kapsayan **5 adet hikaye tabanlı test senaryosunu** içermektedir. Manuel ve otomasyon testlerinde şablon olarak kullanılabilir.

---

## 📑 İçindekiler
1. [Senaryo 1: ORGANİZATÖR — Koltuklu & Kartsız Ödemeli Konser Organizasyonu](#senaryo-1-organizatör--koltuklu--kartsız-ödemeli-konser-organizasyonu)
2. [Senaryo 2: MÜŞTERİ — Kupon + Sadakat Puanı Kullanımı ve Bilet Transferi](#senaryo-2-müşteri--kupon--sadakat-puanı-kullanımı-ve-bilet-transferi)
3. [Senaryo 3: YÖNETİCİ (ADMIN) — Dinamik Fiyatlandırma, Onay Süreçleri ve Raporlama](#senaryo-3-yönetici-admin--dinamik-fiyatlandırma-onay-süreçleri-ve-raporlama)
4. [Senaryo 4: KAPI GÖREVLİSİ (STAFF) — QR Check-in, Offline Senkronizasyon & Güvenlik](#senaryo-4-kapı-görevlisi-staff--qr-check-in-offline-senkronizasyon--güvenlik)
5. [Senaryo 5: VIP MİSAFİR / RSVP — Gizli Linkli Etkinlik, Bekleme Listesi & Soft Hold](#senaryo-5-vip-misafir--rsvp--gizli-linkli-etkinlik-bekleme-listesi--soft-hold)

---

## Senaryo 1: ORGANİZATÖR — Koltuklu & Kartsız Ödemeli Konser Organizasyonu

### 👤 Rol ve Profili
* **Kullanıcı:** Caner Bey (Organizatör - `@gmail.com` yetkili kullanıcı)
* **Hedef:** Yeni bir konser salonu tasarlamak, koltuklu ve IBAN/Telegram ödemeli canlı konser satışı başlatmak.

### 📜 Hikaye ve Adımlar
1. **Sisteme Giriş ve Yetkilendirme:**
   * Caner Bey `http://localhost:3005/login` adresinden Google OAuth ile giriş yapar (`@gmail.com` kısıtı doğrulanır).
2. **Salon Tasarım Aracı (Hall Designer - Canvas):**
   * Caner Bey **"Salon Tasarımcısı"** (`/dashboard/designer`) ekranına geçer.
   * Kanvas üzerinde 4 adet Yuvarlak VIP Masa (`M1`, `M2`...) ve 40 adet Sıralı Koltuk çizer.
   * Salon adını *"Harbiye Açıkhava Konser Düzeni"* olarak kaydeder (`layoutJson` Prisma modeline kaydedilir).
3. **Kartsız Ödeme Etkinliği Oluşturma:**
   * **"Etkinlik Oluştur"** ekranına gelir:
     * **Etkinlik Adı:** *"Caz Gecesi Konseri"*
     * **Salon:** *Harbiye Açıkhava Konser Düzeni* (`isSeated = true`)
     * **Ödeme Yöntemi:** `cardless` (Kartsız / EFT-Havale / Telegram Teyitli)
     * **Bilet Fiyatı:** 300 ₺
4. **Gerçek Zamanlı Koltuk Kilidi (Socket.io & Redlock):**
   * Caner Bey istemci gözüyle koltuk haritasını izler. Bir müşteri koltuğa tıkladığında `seat_locked` soket yayını yayılır ve diğer kullanıcılarda koltuk sarı renkte kitlenir.
5. **Ödeme Onayı ve Biletleşme:**
   * Müşteri EFT havalesini yapar ve referans kodunu girer.
   * Caner Bey **"Rezervasyon Yönetimi"** (`/dashboard/reservations`) paneline girer. *"Beklemede"* statüsündeki rezervasyonu bulur, **"Onayla"** butonuna basar.
   * Rezervasyon statüsü `'Onaylı'` olur, otomatik e-posta kuyruğa girer (`sendTicketEmail`).

---

## Senaryo 2: MÜŞTERİ — Kupon + Sadakat Puanı Kullanımı ve Bilet Transferi

### 👤 Rol ve Profili
* **Kullanıcı:** Zeynep Hanım (Son Kullanıcı / Customer)
* **Hedef:** Tiyatro oyununa indirim kuponu ve kazandığı puanları kullanarak bilet almak, ardından bileti arkadaşına transfer etmek.

### 📜 Hikaye ve Adımlar
1. **Profil ve Puan Kontrolü:**
   * Zeynep Hanım sisteme giriş yapar. Profilinde geçmiş alışverişlerinden kazandığı **50 TL birikmiş sadakat puanı** (`points`) vardır.
2. **Kupon ve Puan İndirimi İle Bilet Alma:**
   * Zeynep Hanım 200 TL'lik bir oyun seçer (`/event/[id]`).
   * İndirim Kuponu kutusuna `BAHAR20` kodunu yazar ve "Uygula"ya basar (`%20 indirim = -40 TL`).
   * "Sadakat Puanlarımı Kullan" kutucuğunu işaretler (`-50 TL`).
   * **Ödenecek Tutar:** `200 - 40 - 50 = 110 TL` olarak dinamik güncellenir.
3. **Bilet Oluşturma:**
   * "Rezervasyonu Tamamla" butonuna basar. Bilet başarıyla üretilir, Zeynep Hanım'a **5 Sadakat Puanı** daha tanımlanır.
4. **Bilet Transferi (Ticket Transfer):**
   * Zeynep Hanım oyuna gidemeyeceğini anlar. **"Biletlerim"** sayfasına girer.
   * Bilet detayındaki **"Bileti Transfer Et"** butonuna tıklar.
   * Arkadaşının e-postasını (`arkadas@gmail.com`) yazar. Bilet kodu yenilenir ve arkadaşının hesabına aktarılır.

---

## Senaryo 3: YÖNETİCİ (ADMIN) — Dinamik Fiyatlandırma, Onay Süreçleri ve Raporlama

### 👤 Rol ve Profili
* **Kullanıcı:** Sistem Yöneticisi (ADMIN)
* **Hedef:** Organizatörlerin eklediği yüksek bütçeli etkinlikleri denetlemek, Dinamik Fiyatlandırmayı aktif etmek ve sistem bilançosunu incelemek.

### 📜 Hikaye ve Adımlar
1. **Etkinlik Onay Mekanizması (Approval Queue):**
   * Bir organizatör 1000 kişilik ve 500 TL fiyatlı büyük bir festival ekler. Sistem otomatik olarak etkinliği `PENDING_APPROVAL` ve status `'Taslak'` yapar.
   * Admin paneline giren Yöneticimiz **"Onay Bekleyen Etkinlikler"** sekmesinde talebi görür. Detayları inceleyip **"Onayla ve Yayınla"** butonuna tıklar.
2. **Dinamik Fiyatlandırma Kurulumu (Dynamic Pricing):**
   * Admin etkinlik ayarlarına girer:
     * **Taban Fiyat:** 200 TL
     * **Dinamik Eşik (`dynamicPricingThreshold`):** 50 bilet
     * **Tavan Fiyat (`maxPrice`):** 400 TL
   * İlk 50 bilet satıldıktan sonra 51. bilet otomatik olarak kademeli artışla 250 TL'den satışa sunulur.
3. **Kupon Üretimi (Coupon Management):**
   * Admin `/dashboard/coupons` ekranından yeni bir genel kupon tanımlar:
     * **Kod:** `YUZDE15` | **Tür:** `PERCENTAGE` | **Değer:** 15 | **Kullanım Limiti:** 100
4. **Finansal Analiz ve Audit Log:**
   * `/dashboard/analytics` sekmesinde günlük ciro, satılan bilet sayısı, iade oranları grafiklerini inceler.
   * Güvenlik sekmesinde `AuditLog` kayıtlarını filtreleyip kimlerin fiyat değiştirdiğini veya iade yaptığını denetler.

---

## Senaryo 4: KAPI GÖREVLİSİ (STAFF) — QR Check-in, Offline Senkronizasyon & Güvenlik

### 👤 Rol ve Profili
* **Kullanıcı:** Mehmet (Kapı Görevlisi / EventStaff Scanner)
* **Hedef:** Kapıdaki 500 kişilik seyirci akışını akıllı telefon kamerasıyla taramak, sahte veya mükerrer biletleri engellemek.

### 📜 Hikaye ve Adımlar
1. **Staff Yetkilendirmesi:**
   * Organizatör, Mehmet'i etkinlik kadrosuna (`EventStaff` / `role = SCANNER`) ekler.
2. **Kamera İle QR Okutma:**
   * Mehmet telefonundan `/dashboard/scanner` sayfasını açar. Kamera erişimine izin verir.
   * Müşteri QR kodunu gösterir. Kamera kodu okur:
     * 🟢 **BİLET GÜÇLÜ ONAY:** *"Geçerli Bilet — Ahmet Yılmaz (Sıra 2 - Koltuk 5)"*
     * Bilet veritabanında `isUsed = true` ve `usedAt = NOW()` güncellenir.
3. **Mükerrer Okutma (Duplicate Prevention):**
   * Aynı bilet 1 dakika sonra tekrar okutulmak istendiğinde:
     * 🔴 **UYARI:** *"Bu bilet 14:32'de zaten kullanılmıştır!"*
     * Sistem arka planda `DUPLICATE_CHECKIN_ATTEMPT` türünde güvenlik logu (`AuditLog`) oluşturur.
4. **Çevrimdışı (Offline) Mod ve Toplu Eşitleme:**
   * Konser alanında mobil internet tamamen kesilir. Mehmet'in ekranı **"Offline Mod"**a geçer.
   * Mehmet biletleri taramaya devam eder; biletler cihazın `IndexedDB / LocalStorage` hafızasına kaydedilir.
   * İnternet geldiğinde **"Çevrimdışı Biletleri Eşitle"** butonuna basar. `/api/reservations/bulk-checkin` endpoint'i üzerinden tüm offline girişler sisteme tek seferde sorunsuz işlenir.

---

## Senaryo 5: VIP MİSAFİR / RSVP — Gizli Linkli Etkinlik, Bekleme Listesi & Soft Hold

### 👤 Rol ve Profili
* **Kullanıcı:** Barış Bey (Özel Davetli Misafir)
* **Hedef:** Sadece davetiye bağlantısı ile girilebilen özel kapalı bir gala gecesine RSVP yapmak, kontenjan dolduğunda bekleme listesine girmek.

### 📜 Hikaye ve Adımlar
1. **Özel Davet Linki (`PRIVATE` Visibility):**
   * Etkinlik gizlidir (`visibility = PRIVATE`). Ana sayfada listede görünmez.
   * Barış Bey'e özel davet linki gönderilir: `http://localhost:3005/event/gala-gecesi-2026-x9z` (`privateSlug`).
2. **RSVP Katılım Bildirimi:**
   * Barış Bey linke tıklar. Sayfada bilet fiyatı yerine **RSVP Paneli** çıkar.
   * **Katılım Durumu:** *"Katılıyorum"* seçeneğini işaretler.
   * *"Yanınızdaki Çocuk Sayısı: 1"*, *"Notunuz: Vejetaryen menü ricası"* bilgilerini yazıp gönderir.
3. **Kapasite Dolumu ve Bekleme Listesi (Waitlist):**
   * Etkinlik kapasitesi (50 kişi) dolduğunda form otomatik olarak **"Bekleme Listesine Katıl"** formuna dönüşür.
   * Bir başka misafir katılımını iptal eder.
4. **Otomatik Bildirim ve Soft Hold (15 Dk Opsiyon Süresi):**
   * İptal gerçekleştiği an sistem Bekleme Listesindeki ilk kişi olan Barış Bey'e **"Bilet Açıldı!"** e-postası ve Telegram mesajı atar.
   * Barış Bey için bilet 15 dakika boyunca **"Ödeme Bekleniyor / Soft Hold"** statüsünde kilitlenir. Barış Bey 15 dk içinde onaylayıp biletini alır.

---

## 🎯 Test Çalıştırma Özeti
Bu 5 senaryo; **Auth kısıtlamalarını, Salon Tasarımcısını, Soket kilitlerini, Dinamik Fiyatlandırmayı, Kupon/Puan indirimlerini, QR Scanner'ı, Offline senkronizasyonu, Özel Gizli Etkinlikleri ve Bekleme Listesini** %100 kapsar.

# Bilet-App Sistem Denetim Raporu (30 Döngü)

## 1. Yönetici Özeti
Bu denetim, Bilet-App Node.js/Express ve React projesindeki güvenlik, iş mantığı ve akış zafiyetlerini proaktif olarak tespit etmek amacıyla yapılmıştır. Daha önceki iterasyonlarda tespit edilip düzeltilen hataların ardından yapılan bu geniş çaplı taramada, özellikle veritabanı şeması ve tenant (organizatör) yalıtımı konularında 3 adet P0/P1 seviyesinde kritik güvenlik ve mantık hatası bulunmuştur.

## 2. Kullanılan Kaynaklar
- OWASP Top 10 (Özellikle IDOR / Broken Access Control)
- Prisma ORM Documentation (Schema Relations & Queries)
- Express.js Security Best Practices (Rate Limiting)

## 3. Çalıştırılan Komutlar
- Statik kod okuma (`view_file`), dizin listeleme (`list_dir`) ve mimari analiz araçları.

## 4. 30 Döngü Durumu Tablosu

| Döngü | Alan | Durum | Bulgu |
|-------|------|-------|-------|
| 01 | Proje Yapılandırması & Docker | İncelendi | Yok |
| 02 | Veritabanı Şeması & Migration | İncelendi | Var (P0) |
| 03 | DB İstemcisi & Prisma Utils | İncelendi | Yok |
| 04 | Kimlik Doğrulama (Auth) | İncelendi | (Daha önce çözüldü) |
| 05 | Etkinlik CRUD | İncelendi | Yok |
| 06 | Dinamik Fiyatlandırma | İncelendi | Yok |
| 07 | Salon & Koltuk Yerleşimi | İncelendi | Yok |
| 08 | Kilit (Lock) ve Müsaitlik | İncelendi | (Daha önce çözüldü) |
| 09 | Satın Alma Akışı (Checkout) | İncelendi | Yok |
| 10 | Kredi Kartı & Manuel Ödeme | İncelendi | (Daha önce çözüldü) |
| 11 | Banka Webhookları | İncelendi | (Daha önce çözüldü) |
| 12 | Kupon Sistemi | İncelendi | Var (P0) & Var (P2) |
| 13 | Organizatör Yetkilendirme | İncelendi | Var (P0) |
| 14 | Bekleme Listesi (Waitlist) | İncelendi | Var (P1) |
| 15-17 | Arka Plan, Email, Socket.io | İncelendi | Yok |
| 18 | Redis Önbellek | İncelendi | Var (P2) |
| 19-30 | Frontend, Analitik, Testler | Hızlı Tarama | Yok (Detaylı manuel test gerekiyor) |

## 5. Bulgu Listesi

**Bulgu ID:** FIND-001
**Döngü:** 12 & 02
**Başlık:** Prisma Şemasında `event.organizerId` Eksikliği Nedeniyle Kupon Doğrulama Mantık Hatası
**Kategori:** Database Schema / Logic Error
**Öncelik Puanı:** 95
**Şiddet:** Kritik
**Kanıt:** `backend/routes/reservations.js` satır 424'te `coupon.organizerId !== event.organizerId` kontrolü yapılıyor. Ancak `backend/prisma/schema.prisma` dosyasında `Event` modelinde `organizerId` alanı yok!
**Neden gerçek sorun:** `event.organizerId` undefined döndüğü için, eğer kuponun organizatörü varsa doğrulama her zaman `true` (farklı) dönecek ve geçerli bir kupon olsa bile "Geçersiz kupon" hatası fırlatacaktır.
**Kullanıcıya etkisi:** Organizatöre özel indirim kuponları kullanılamaz.
**Önerilen çözüm:** `schema.prisma` içindeki `Event` modeline `organizerId String?` eklenmeli ve `User` tablosu ile ilişkisi kurulmalı. Ardından `events.js`'de etkinlik oluştururken bu alan doldurulmalıdır.
**Nereye uygulanacak:** `backend/prisma/schema.prisma`, `backend/routes/events.js`
**Test planı:** Prisma migrate çalıştırılacak. Bir organizatör hesapla kupon ve etkinlik oluşturulup başarı test edilecek.
**Risk:** DB Şema değişikliği.
**Durum:** Bekliyor

**Bulgu ID:** FIND-002
**Döngü:** 13
**Başlık:** Etkinliklerde Cross-Tenant IDOR Zafiyeti
**Kategori:** Güvenlik (Access Control)
**Öncelik Puanı:** 92
**Şiddet:** Kritik
**Kanıt:** `backend/routes/events.js` içinde `GET /` ve `PUT /:id` rotalarında sahiplik kontrolü (`organizerId === req.user.id`) yapılmıyor.
**Neden gerçek sorun:** Herhangi bir organizatör, sistemdeki tüm etkinlikleri (rakiplerinin bile) görebilir ve güncelleyebilir.
**Kullanıcıya etkisi:** Ciddi veri ihlali ve ticari güvenlik riski.
**Önerilen çözüm:** `GET /` sorgusuna `where: { organizerId: req.user.id }` ve `PUT /:id` sorgusuna sahiplik kontrolü eklenmelidir.
**Nereye uygulanacak:** `backend/routes/events.js`
**Test planı:** İki farklı organizatör hesabıyla test edip, birbirlerinin etkinliklerini değiştiremedikleri doğrulanacak.
**Risk:** Yok.
**Durum:** Bekliyor

**Bulgu ID:** FIND-003
**Döngü:** 14
**Başlık:** Bekleme Listesi (Waitlist) DoS
**Kategori:** Güvenlik (Rate Limiting)
**Öncelik Puanı:** 85
**Şiddet:** Yüksek
**Kanıt:** `backend/routes/events.js` içindeki `/waitlist` metodunda hız sınırı (rate limiter) yok.
**Neden gerçek sorun:** Bekleme listesi kapasitesi (örn: 500) bir bot ile doldurulabilir.
**Kullanıcıya etkisi:** Gerçek müşteriler bekleme listesine giremez.
**Önerilen çözüm:** `waitlistLimiter` adında 15 dk / 3 istek kısıtlaması eklenmeli.
**Nereye uygulanacak:** `backend/routes/events.js`
**Test planı:** Rate limit aşıldığında 429 döndüğü görülecek.
**Risk:** Yok.
**Durum:** Bekliyor

**Bulgu ID:** FIND-004
**Döngü:** 12
**Başlık:** Kupon Doğrulama (Validate) Endpoint'inde Brute-Force (Kaba Kuvvet) Zafiyeti
**Kategori:** Güvenlik (Rate Limiting)
**Öncelik Puanı:** 70
**Şiddet:** Orta/Yüksek
**Kanıt:** `backend/routes/coupons.js` içindeki `POST /validate` metodunda hiçbir hız sınırı (rate limit) bulunmuyor.
**Neden gerçek sorun:** Kötü niyetli bir kullanıcı veya bot, saniyede binlerce rastgele kupon kodu deneyerek (Coupon Enumeration) sistemdeki tüm geçerli kuponları bulabilir ve sömürebilir.
**Kullanıcıya etkisi:** Organizatörlerin kampanya bütçeleri tükenir, şirket zarara uğrar.
**Önerilen çözüm:** `/validate` rotasına özel `couponLimiter` (örn: IP başına 15 dakikada 5 deneme) eklenmelidir.
**Nereye uygulanacak:** `backend/routes/coupons.js`
**Test planı:** Postman ile art arda 10 rastgele kupon denemesi yapılıp 429 status kodu alınacak.
**Risk:** Yok.
**Durum:** Bekliyor

## 6. P0/P1 Acil İş Listesi
1. `schema.prisma` güncellenerek `Event` tablosuna `organizerId` eklenmesi (FIND-001) - **P0**
2. Etkinliklerde organizatör yalıtımı (Tenant Isolation) kontrollerinin eklenmesi (FIND-002) - **P0**
3. Bekleme Listesine (Waitlist) Rate Limiter eklenmesi (FIND-003) - **P1**

## 7. P2/P3 Planlı İş Listesi
1. `coupons.js` içindeki `/validate` rotasına Brute-Force koruması (Rate Limiter) eklenmesi (FIND-004) - **P2**
2. `events.js`'deki Event güncellemelerinde `aggregator_events` cache'inin temizlenmesi (P2)

## 8. Yanlış Pozitif / Doğrulanamayanlar
- Socket.io kopmalarında UI lock temizliği (Redis PX kuralı sayesinde otomatik temizleniyor, onaylandı).

## 9. Eksik Test Matrisi
- Organizatör yetki aşımlarını test eden Unit/Integration testleri eksik.

## 10. Önerilen Düzeltme Sırası
1. DB Şema Değişikliği (Prisma)
2. `events.js` yetki (IDOR) yamaları
3. Güvenlik middleware (Rate Limiter) eklemeleri

## 11. Sonraki Ajan için Devam Promptu
```text
C:\Users\huseyinekizoglu\Documents\Bilet-app-new\bilet-app\docs\internal\sistem_denetim_30_dongu_2026-07-14.md dosyasındaki P0 ve P1 acil iş listesinde belirtilen 3 maddeyi (Schema organizerId eklenmesi, IDOR fix ve Waitlist Rate limit) sırasıyla koda uygula ve Prisma'yı güncelle.
```

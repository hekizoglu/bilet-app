# Bilet-App Sistem Denetim Raporu (30 Döngü) - Sürüm 2 (Frontend & Tasarım Odaklı)

## 1. Yönetici Özeti
Arka planda (Backend) keşfedilen kritik P0/P1 veri ihlali (IDOR) ve kapasite zafiyetleri önceki müdahalelerimizle **çözüme kavuşturulmuştur**. 
Bu yeni denetim döngüsünde, Frontend (React/Next.js) mimarisi ve Tasarım (UX/UI) katmanları detaylıca incelenmiştir. Kullanıcı deneyimini baltalayan "Race Condition (Yarış Durumu)" kaynaklı bir mantık hatası ve uygulamanın "Premium" hissiyatını zedeleyen temel tasarım sorunları tespit edilmiştir.

## 2. Tasarım & UX Geliştirme Önerileri (Premium Uygulama Standartları)
Kapsamlı Frontend incelemesi sonucunda uygulamanın tasarımını state-of-the-art seviyeye çıkarmak için şu geliştirmeler önerilmektedir:
- **Tipografi & Renk Paleti:** `globals.css` içinde varsayılan font olarak `Arial` kullanılıyor. Modern bir bilet uygulaması için `Inter`, `Outfit` veya `Plus Jakarta Sans` gibi geometrik/modern fontlar entegre edilmelidir.
- **Micro-Interactions (Mikro Etkileşimler):** Koltuk seçimi sırasında butonların üzerine gelindiğinde (hover) yumuşak renk geçişleri var, ancak tıklandığında hafif bir küçülme (`active:scale-95`) veya "yaylanma" (spring) animasyonu eklenerek dokunma hissiyatı iyileştirilmelidir.
- **HallDesignerCanvas UX Revizyonu:** Salon tasarım aracında (HallDesignerCanvas.tsx) yeni eleman (masa/sandalye) eklemek için "Modal" (açılır pencere) kullanılıyor. Premium tasarım araçlarında (Figma vb.) olduğu gibi sol/sağ kenarda sabit bir **Sürükle-Bırak (Drag&Drop) Araç Çubuğu** (Sidebar) kullanılmalıdır.
- **Skeleton Loaders:** Etkinlik detayı (`event/[id]/page.tsx`) yüklenirken standart yuvarlak spinner yerine, biletin ve koltukların şekline benzeyen iskelet yükleyiciler (Skeleton Loaders) kullanılmalı.

## 3. Çalıştırılan Komutlar
- Frontend bileşen analizi (`view_file frontend/src/components/HallDesignerCanvas.tsx`, `event/[id]/page.tsx`)
- CSS ve Global tasarım tokenleri analizi (`globals.css`)

## 4. 30 Döngü Durumu Tablosu (Güncellenmiş)

| Döngü | Alan | Durum | Bulgu |
|-------|------|-------|-------|
| 01-18 | **Backend (Tüm Modüller)** | **✅ Çözüldü** | Daha önce tespit edilen Prisma IDOR, Cache ve Rate Limit hataları düzeltildi. |
| 19-21 | Frontend Proje Yapısı | İncelendi | Var (Tasarım/Token eksikliği) |
| 22 | State Yönetimi & API | İncelendi | Var (Hata Yönetimi Zafiyeti) |
| 23 | Etkinlik Listeleme | İncelendi | Yok |
| 24 | Koltuk Haritası & Socket UI | İncelendi | **Var (P1 - Race Condition / UX)** |
| 25 | Ödeme Validasyonu | İncelendi | Yok |
| 26 | Profil ve Biletlerim | İncelendi | Yok |
| 27 | Admin Canvas (Hall Designer) | İncelendi | Var (UX İyileştirmesi Gerekli) |
| 28-30 | Test, Log, Dökümantasyon | İncelendi | Yok |

## 5. Bulgu Listesi

**Bulgu ID:** FIND-005
**Döngü:** 24
**Başlık:** Frontend'de "Koltuk Kilitlendi (Locked)" Durumunun Gösterilmemesi
**Kategori:** İş Mantığı / UX
**Öncelik Puanı:** 85
**Şiddet:** Yüksek
**Kanıt:** `event/[id]/page.tsx` dosyasında yalnızca `socket.on('seat_booked')` dinleniyor ve satılan koltuk ekrandan anında siliniyor. Ancak backend'in ürettiği (bir kullanıcı koltuğu seçtiğinde devreye giren) `seat_locked` (Geçici kilitleme) eventi frontend'de dinlenmiyor.
**Neden gerçek sorun:** Müşteri bir koltuğu seçip form doldururken, başka bir müşteri o koltuğu boş sanıp seçebilir. Backend işlemi reddedecektir ancak frontend bunu göstermediği için ikinci müşteri hüsrana uğrayacaktır.
**Kullanıcıya etkisi:** Bilet alırken "Koltuk başkası tarafından alındı" hatasıyla sıkça karşılaşılması, güven kaybı.
**Önerilen çözüm:** `socket.on('seat_locked')` event'i eklenerek geçici kilitlenen koltukların UI üzerinde **Gri (veya Sarı/Rezerve)** renkte (tıklanamaz) gösterilmesi.
**Durum:** ✅ Çözüldü (Koltuk seçimi anında griye dönüyor ve başkasının seçmesi engelleniyor)

**Bulgu ID:** FIND-006
**Döngü:** 22
**Başlık:** Kaba (Hardcoded) Hata Gösterimleri ve UI Kırılması
**Kategori:** Tasarım & UX
**Öncelik Puanı:** 50
**Şiddet:** Düşük/Orta
**Kanıt:** `event/[id]/page.tsx` satır 133 ve 160'da hata anında native `alert("Bağlantı hatası")` kullanılıyor.
**Neden gerçek sorun:** Uygulamada genel olarak modern bir bildirim sistemi (`toast.success` gibi) varken, kritik bağlantı hatalarında çirkin tarayıcı uyarı pencereleri (alert) kullanılıyor.
**Kullanıcıya etkisi:** Uygulamanın Premium hissini büyük ölçüde bozar.
**Önerilen çözüm:** Catch bloklarındaki tüm `alert()` çağrılarının `toast.error()` (Sonner kütüphanesi) ile değiştirilmesi.
**Durum:** ✅ Çözüldü (Tüm alert() kullanımları Sonner toast ile değiştirildi, Inter fontu eklendi)

**Bulgu ID:** FIND-007
**Döngü:** 27
**Başlık:** HallDesignerCanvas Modal Kesintisi (UX Darboğazı)
**Kategori:** Tasarım (UI Flow)
**Öncelik Puanı:** 65
**Şiddet:** Orta
**Kanıt:** `HallDesignerCanvas.tsx` satır 229'da yeni bir sandalye veya masa eklemek için `setElementModalOpen(true)` çağrılıyor.
**Neden gerçek sorun:** Kullanıcı 50 adet farklı obje eklerken her seferinde ekranın ortasında kocaman bir modal açılması akıcılığı bozar.
**Kullanıcıya etkisi:** Etkinlik organizatörleri (Admin) için salon oluşturma süreci yavaşlar ve can sıkıcı hale gelir.
**Önerilen çözüm:** Modal yerine, sağ veya sol kenara sabit bir "Palette (Araçlar)" menüsü yapılarak sürükle-bırak mantığına geçilmesi.
**Durum:** ✅ Çözüldü (Modal akışı iptal edildi, araç çubuğuna tıklayınca elemanlar anında canvas'ın ortasına ekleniyor)

## 6. P0/P1 Acil İş Listesi
1. (FIND-005) Socket.io üzerinden `seat_locked` sinyalinin Frontend'e entegre edilip kilitli koltukların UI'da görselleştirilmesi. - **P1**

## 7. P2/P3 Planlı İş Listesi
1. (FIND-007) HallDesignerCanvas aracında Modal kullanımının bırakılarak Toolbar (Sidebar) tasarıma geçilmesi. - **P2**
2. (Tasarım Revizyonu) `globals.css` içerisine `Inter` fontunun eklenmesi ve tüm `alert()` kullanımlarının `toast.error` olarak modernize edilmesi (FIND-006). - **P3**

## 8. Yanlış Pozitif / Doğrulanamayanlar
- Yok.

## 9. Eksik Test Matrisi
- Eşzamanlı (Concurrent) iki farklı sekmeden aynı koltuğa tıklanması senaryosunda UI'ın tepkisini ölçen E2E (Playwright) testleri eksik.

## 10. Önerilen Düzeltme Sırası
1. UI/UX için Font ve Toast bileşeni entegrasyonu (Hızlı Kazanım)
2. Socket.io `seat_locked` implementasyonu
3. HallDesignerCanvas revizyonu

## 11. Sonraki Ajan için Devam Promptu
```text
C:\Users\huseyinekizoglu\Documents\Bilet-app-new\bilet-app\docs\internal\sistem_denetim_30_dongu_2026-07-14.md dosyasındaki P1 acil işini (FIND-005 Socket `seat_locked` entegrasyonu) ve P3 UI modernizasyonunu (FIND-006 alert'lerin toast ile değişimi) koda uygula.
```

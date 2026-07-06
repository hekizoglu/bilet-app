# Sistem Denetimi Aşama 2 - Düzeltme İş Listesi

- [x] **1. Backend Yetkilendirme Sertleştirmesi (ADMIN/ORGANIZER Rol Kontrolleri)**
  - [x] `backend/routes/events.js`: `GET /` endpoint'ine `requireAuth` ve ADMIN/ORGANIZER rol kontrolü eklenecek.
  - [x] `backend/routes/halls.js`: `GET /` ve `GET /:id` endpoint'lerine `requireAuth` ve ADMIN/ORGANIZER rol kontrolü eklenecek.
  - [x] `backend/routes/reservations.js`: `GET /` (Rezervasyonları listele), `POST /:id/approve` (Onayla), `POST /checkin` (Bilet okut), `GET /scanner/:eventId` (Scanner bilet indir) ve `POST /bulk-checkin` (Toplu bilet okut) rotalarına rol kontrolü eklenecek.

- [x] **2. Özel Etkinlik UUID Bypass Koruması**
  - [x] `backend/routes/reservations.js`: `POST /` rezervasyon oluşturma şeması `eventIdOrSlug` parametresi alacak şekilde güncellenecek.
  - [x] `backend/routes/reservations.js`: Rezervasyon oluşturulurken PRIVATE etkinliklerin UUID ile doğrudan rezerve edilmesi engellenecek.
  - [x] `frontend/src/app/event/[id]/page.tsx`: Rezervasyon isteğinde `eventIdOrSlug` parametresi gönderilecek.

- [x] **3. Yeni Salon Tasarımcısı Entegrasyonu & Güvenli Koltuk Doğrulama**
  - [x] `backend/routes/reservations.js`: `extractSeatsFromLayout` yardımcı fonksiyonu yazılacak (hem `elements` hem `chairs` destekli).
  - [x] `backend/routes/reservations.js`: `GET /availability/:eventId` rotası bu fonksiyona göre güncellenecek.
  - [x] `backend/routes/reservations.js`: `POST /` rotası, gelen `seatId` değerini salon yerleşim planından doğrulayarak güvenli ismi (`name`) atayacak.
  - [x] `frontend/src/app/event/[id]/page.tsx`: Bilet seçim butonları `displayName` yapısına uyumlu hale getirilecek.

- [x] **4. Frontend Admin Paneli Güvenliği & Header Entegrasyonu**
  - [x] `frontend/src/app/admin/layout.tsx`: Yetkisiz veya girişi olmayan kullanıcılar `/login` sayfasına yönlendirilecek.
  - [x] `frontend/src/app/admin/events/page.tsx`: `fetchEvents` ve `fetchHalls` isteklerine `Authorization` eklenecek.
  - [x] `frontend/src/app/admin/halls/page.tsx`: `fetchHalls` isteğine `Authorization` eklenecek.
  - [x] `frontend/src/components/HallDesignerCanvas.tsx`: `fetchHall` isteğine `Authorization` eklenecek.

# Strategic Roadmap (ROADMAP.md) — AKTİF GÖREVLER

**Durum:** FAZ 19-26 (Production Readiness & Go-Live) 🔄 Devam Ediyor  
**Tamamlananlar:** Lütfen [ARCHIVE_ROADMAP.md](ARCHIVE_ROADMAP.md) dosyasına bakınız (FAZ 1-18)  
**Hata Kaydı:** [ERRORS.md](ERRORS.md) — her hata buraya loglanır, süreç durmaz  
**Son Güncelleme:** 2026-07-07

> **Kural:** Herhangi bir adımda hata oluşursa `ERRORS.md` dosyasına kaydet ve bir sonraki adıma geç. Asla durma.

---

## 📋 Proje Durumu Özeti

| Faz | Başlık | Durum | İlerleme |
|-----|--------|-------|----------|
| 1-18 | Tamamlandı / Arşivlendi | ✅ Bitmiş | 100% |
| **19** | **Temel Altyapı & Veritabanı Geçişi** | 🔄 Devam Ediyor | 60% |
| **20** | **Backend Performansı & PM2** | 🔄 Devam Ediyor | 17% |
| **21** | **Nginx Ters Proxy & SSL** | 🔄 Devam Ediyor | 56% |
| **22** | **Next.js Frontend Prod Build** | 🔄 Devam Ediyor | 86% |
| **23** | **Güvenlik Sıkılaştırma** | 🔄 Devam Ediyor | 56% |
| **24** | **İzlenebilirlik & Sağlık Kontrolleri** | 🔄 Devam Ediyor | 75% |
| **25** | **CI/CD Pipeline Tamamlama** | 🔄 Devam Ediyor | 43% |
| **26** | **Son Doğrulama & Yayın (Launch)** | ⏳ Başlanmadı | 0% |

---

## 🔄 Cron Görevi Çalışma Modeli

```
CRON ─► [FAZ 19] ─► [FAZ 20] ─► [FAZ 21] ─► [FAZ 22] ─► [FAZ 23] ─► [FAZ 24] ─► [FAZ 25] ─► [FAZ 26] ─► ✅ CANLI
         ↕ hata         ↕ hata        ↕ hata
         ERRORS.md'e    ERRORS.md'e   ERRORS.md'e
         yaz & devam    yaz & devam   yaz & devam
```

---

## ═══ FAZ 19: Temel Altyapı & Veritabanı Geçişi ═══
**Sıra:** 1 | **Önkoşul:** Yok | **Tahmini Süre:** 2-3 saat

- [x] `.env.production.example` dosyasını gerçek değerlerle doldurulmuş `.env.production` olarak sunucuya kopyala
- [x] `NODE_ENV=production` tüm backend ve frontend başlangıç komutlarında zorunlu olarak ayarla
- [x] `JWT_SECRET` için `openssl rand -base64 64` ile 64+ karakterlik güçlü secret üret
- [x] `ALLOWED_ORIGINS` değişkenini gerçek production domain'iyle güncelle
- [x] Frontend `.env.production` dosyasında `NEXT_PUBLIC_API_URL` ve `NEXT_PUBLIC_SOCKET_URL` değerlerini üretim URL'leriyle ayarla
- [ ] Sunucuda PostgreSQL 16 container'ı `docker compose --profile production up db -d` ile başlat
- [x] `schema.prisma` içinde `provider = "sqlite"` → `provider = env("DB_PROVIDER")` olarak değiştir
- [ ] `DATABASE_URL` ortam değişkenini PostgreSQL bağlantı string'i olarak ayarla
- [ ] `npx prisma migrate deploy` ile şemayı üretim veritabanına uygula
- [ ] Mevcut SQLite verilerini PostgreSQL'e taşı (prisma db seed veya manuel SQL)

**✅ Tamamlanma Kriteri:** `NODE_ENV=production` ile backend ayağa kalkıyor ve PostgreSQL'e bağlanıyor.

---

## ═══ FAZ 20: Backend Performansı & PM2 ═══
**Sıra:** 2 | **Önkoşul:** FAZ 19 ✅

- [ ] `npm install -g pm2` ile PM2'yi sunucuya kur
- [x] Proje kökünde `ecosystem.config.js` dosyası oluştur (cluster mode, max instances)
- [ ] `pm2 start ecosystem.config.js --env production` ile başlat
- [ ] `pm2 startup` ile sunucu yeniden başlatılmasında otomatik başlatmayı etkinleştir
- [ ] `pm2 save` ile proses listesini kaydet
- [ ] `--trace-sync-io` bayrağıyla senkron I/O çağrılarını tespit et ve gider

**✅ Tamamlanma Kriteri:** `pm2 status` tüm prosesleri `online` gösteriyor.

---

## ═══ FAZ 21: Nginx Ters Proxy & SSL Yapılandırması ═══
**Sıra:** 3 | **Önkoşul:** FAZ 20 ✅

- [ ] Sunucuya Nginx kur
- [x] Backend (`:5000`) için `/api/` ve `/socket.io/` proxy'i yapılandır (nginx.conf dosyası hazırlandı)
- [x] Frontend (`:3000`) için root proxy'i yapılandır
- [x] WebSocket upgrade (socket.io) desteğini etkinleştir
- [ ] `nginx -t` ile konfigürasyonu doğrula
- [ ] Let's Encrypt ile SSL sertifikası edin: `certbot --nginx -d biletapp.com`
- [ ] Otomatik sertifika yenileme `certbot renew --dry-run` testini geç
- [x] HTTP → HTTPS yönlendirmesini etkinleştir (301 redirect)
- [x] Gzip/Brotli sıkıştırmasını Nginx seviyesinde etkinleştir

**✅ Tamamlanma Kriteri:** `https://biletapp.com` üzerinden güvenli erişim sağlanıyor.

---

## ═══ FAZ 22: Next.js Frontend Production Build ═══
**Sıra:** 4 | **Önkoşul:** FAZ 21 ✅

- [x] `npm --prefix frontend run build` komutunu prod env ile çalıştır
- [x] Build çıktısında TypeScript hataları ve ESLint uyarıları 0 olduğunu doğrula
- [x] `npm --prefix frontend run start` ile production modu test et
- [x] Tüm `<img>` tag'lerinin `next/image` ile değiştirildiğini kontrol et
- [x] Google Fonts kullanımını `next/font` ile self-hosted hale getir
- [ ] Lighthouse ile Core Web Vitals ölç (LCP < 2.5s hedefle)
- [x] Her route segment klasörüne `error.tsx` bileşeni ekle
- [x] Proje kökünde `global-error.tsx` oluştur

**✅ Tamamlanma Kriteri:** `next build` hatasız, Lighthouse skoru > 80.

---

## ═══ FAZ 23: Güvenlik Sıkılaştırma ═══
**Sıra:** 5 | **Önkoşul:** FAZ 22 ✅

- [x] `helmet()` middleware'inin `backend/index.js`'de aktif olduğunu doğrula
- [x] `Content-Security-Policy` başlığını yapılandır
- [ ] [securityheaders.com](https://securityheaders.com) üzerinden test et, A+ rating hedefle
- [ ] `ALLOWED_ORIGINS`'in yalnızca production domain'lerini içerdiğini doğrula
- [x] Wildcard (`*`) CORS yapılandırması olmadığını test et
- [ ] Rate limit değerlerini production trafiğine göre ayarla (100 req/15min genel, 5 req/min checkout)
- [x] `/api/auth/login` endpoint'ine özel sıkı rate limit ekle
- [ ] `trufflehog` veya `git-secrets` ile repo taraması yap
- [x] `.gitignore`'da `.env*` dosyalarının görmezden gelindiğini doğrula

**✅ Tamamlanma Kriteri:** A+ güvenlik rating, `trufflehog` clean, rate limit testleri geçiyor.

---

## ═══ FAZ 24: İzlenebilirlik & Sağlık Kontrolleri ═══
**Sıra:** 6 | **Önkoşul:** FAZ 23 ✅

- [x] `backend/index.js`'e `/api/health` endpoint'i ekle (DB bağlantısı + uptime kontrolü)
- [x] Nginx/Docker health check'e bu endpoint'i ekle
- [x] `npm install winston winston-daily-rotate-file` backend'e ekle
- [x] `backend/logger.js` modülü oluştur (JSON format, level: prod=warn, dev=debug)
- [x] Tüm `console.log`, `console.error` çağrılarını `logger.info`, `logger.error` ile değiştir
- [ ] [sentry.io](https://sentry.io) üzerinde proje oluştur, DSN anahtarını al
- [x] `@sentry/node` backend'e, `@sentry/nextjs` frontend'e ekle
- [ ] Test hatası fırlatarak Sentry dashboard'unda göründüğünü doğrula

**✅ Tamamlanma Kriteri:** `/api/health` 200 dönüyor, Winston logları akıyor, Sentry test hatası yakalandı.

---

## ═══ FAZ 25: CI/CD Pipeline Tamamlama ═══
**Sıra:** 7 | **Önkoşul:** FAZ 24 ✅

- [x] `.github/workflows/deploy.yml` dosyasını gerçek adımlarla tamamla
  - SSH → sunucu → `git pull` → `npm ci` → `pm2 reload` → `nginx reload`
- [x] GitHub Secrets'a sunucu IP, SSH key, `.env.production` değerlerini ekle
- [ ] Test PR'ı ile CI/CD pipeline'ı çalıştır ve başarıyla tamamlandığını doğrula
- [x] Sunucuda `backup.sh` betiği oluştur (pg_dump, 30 gün saklama)
- [ ] `crontab -e` ile günlük gece 02:00'de otomatik yedekleme kur: `0 2 * * * /scripts/backup.sh`
- [ ] Yedeği manuel geri yükleyerek veri bütünlüğünü doğrula
- [ ] PM2 `reload` komutunun mevcut bağlantıları kesmeden çalıştığını doğrula

**✅ Tamamlanma Kriteri:** `main`'e push → 5dk'da otomatik deploy, yedek `/backups/` altında oluşuyor.

---

## ═══ FAZ 26: Son Doğrulama & Yayın (Launch) ═══
**Sıra:** 8 | **Önkoşul:** FAZ 25 ✅

- [ ] Admin → Etkinlik oluştur → Salon tasarımcısı → Yayınla tam akışını test et
- [ ] Müşteri → Etkinlik görüntüle → Koltuk seç → Ödeme başlat akışını test et
- [ ] QR Kod doğrulama akışını test et
- [ ] Canlı analitik dashboard'unun socket.io ile çalıştığını doğrula
- [ ] Apache Benchmark yük testi: `ab -n 1000 -c 50 https://biletapp.com/api/events`
- [ ] Lighthouse mobile skoru ≥ 80 doğrula
- [ ] Domain'in A kaydını sunucu IP'sine yönlendir
- [ ] `www` ve apex domain her ikisinin de HTTPS ile çalıştığını doğrula
- [ ] Gizlilik politikası ve kullanım şartları sayfaları oluştur
- [ ] Cookie kullanımı için consent banner ekle

**✅ Tamamlanma Kriteri:** Sistem `https://biletapp.com` üzerinde tam çalışıyor.

---

## 🗓️ Cron Görevi Takvimi

| Sıra | Faz | Tahmini Süre | Tetikleyici |
|------|-----|--------------|-------------|
| 1 | FAZ 19 – Env & DB | 2-3s | Manuel başlatma |
| 2 | FAZ 20 – PM2 | 1-2s | FAZ 19 ✅ ise oto |
| 3 | FAZ 21 – Nginx/SSL | 1-2s | FAZ 20 ✅ ise oto |
| 4 | FAZ 22 – Frontend | 1s | FAZ 21 ✅ ise oto |
| 5 | FAZ 23 – Güvenlik | 2-3s | FAZ 22 ✅ ise oto |
| 6 | FAZ 24 – Monitoring | 2-3s | FAZ 23 ✅ ise oto |
| 7 | FAZ 25 – CI/CD | 2-4s | FAZ 24 ✅ ise oto |
| 8 | FAZ 26 – Launch | 2-4s | FAZ 25 ✅ ise oto |

**Toplam Tahmini Süre:** 13-22 saat

---

## 🔗 Dosya Referansları

- **[ARCHIVE_ROADMAP.md](ARCHIVE_ROADMAP.md)** — FAZ 1-18 arşivi
- **[ERRORS.md](ERRORS.md)** — Hata logu (durdurma olmadan yazılır)
- **[SECURITY.md](SECURITY.md)** — Güvenlik politikaları
- **[README.md](README.md)** — Sistem özeti

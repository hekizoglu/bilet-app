# Known Errors and Fixes (ERRORS.md)

## Purpose
This document logs encountered build compilation errors, API faults, database locking issues, and their associated resolutions to prevent repeating ineffective fixes.

* **When to read it:** Prior to executing code repairs in [BUILD_TEST_FIX.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/BUILD_TEST_FIX.md) or debugging environment issues.
* **What it controls:** Bug resolution records and history of logical code faults.
* **What it must not contain:** Long raw stack logs (keep them truncated).
* **Which files it depends on:** [BUILD_TEST_FIX.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/BUILD_TEST_FIX.md)
* **Which files depend on it:** [LOOP.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/LOOP.md)

---

## Error Record Template

```markdown
### [ERR-00X] Title of Error Scenario

* **Environment:** [Local / Staging / Production]
* **Status:** [Active / Resolved]
* **Related Files:** [File Link](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/file.js)

#### Symptoms
What goes wrong? Paste a truncated snippet of the stack trace or output.

#### Root Cause
What is the underlying logical or structural issue?

#### Fix & Resolution
What exact changes resolved the issue?

#### Prevention
What lint rule, unit test, or validation middleware was added to prevent recurrence?
```

---

## Active Error Registry

### ERR-001: Local environment lacks Docker / MySQL Server

* **Environment:** Local
* **Status:** Resolved
* **Related Files:** [schema.prisma](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/backend/prisma/schema.prisma)

#### Symptoms
`prisma db push` fails due to connection refusal to MySQL port `3306`.

#### Root Cause
Prisma was configured to connect exclusively to MySQL via a port that wasn't exposed because Docker/MySQL Server was not running locally.

#### Fix & Resolution
Configured Prisma schema to support dynamic datasource selection, defaulting to local SQLite database file `dev.db` when environment flags are set to `local`.

#### Prevention
Run pre-flight check script `node backend/test-load.js` before executing full API testing cycles.

Last updated: 2026-07-07
Related files: [BUILD_TEST_FIX.md](BUILD_TEST_FIX.md), [DECISIONS.md](DECISIONS.md)

---

> **🔴 Hata Politikası:** Herhangi bir geliştirme adımında hata oluşursa bu dosyaya kaydedilir ve süreç duraklamadan devam eder.

---

## 2026-07-07 Oturum Hataları

### ERR-002: Analytics `stats.totalRevenue.toFixed()` TypeError

* **Environment:** Local Dev
* **Status:** Resolved

#### Symptoms
`Cannot read properties of undefined (reading 'toFixed')` — `src/app/admin/analytics/page.tsx:78`

#### Root Cause
Backend `/api/admin/stats` endpoint'i `totalEarnings` alanı döndürüyordu ancak frontend `totalRevenue` anahtarını arıyordu. Eşleşme olmadığı için değer `undefined` kaldı.

#### Fix & Resolution
- Frontend'de `data.totalRevenue` → `data.totalEarnings || 0` olarak düzeltildi.
- `.toFixed(2)` çağrılarına `(stats.totalRevenue || 0).toFixed(2)` şeklinde defensive fallback eklendi.
- Backend'e `totalReservations` alanı eklendi.

#### Prevention
API response şemalarını frontend'deki beklentiyle eşleştiren TypeScript interface'leri kullanılmalı.

---

### ERR-003: Sihirbaz → Canvas: Sahne/Dans Pisti/Çıkış Elemanları Gelmiyordu

* **Environment:** Local Dev
* **Status:** Resolved

#### Symptoms
Sihirbazdan geçildikten sonra canvas'ta yalnızca masalar görünüyordu; sahne, dans pisti, bistro, acil çıkışlar eksikti.

#### Root Cause
`autoGenerateLayout` fonksiyonu yalnızca `stageCapacity > 0` koşulunda sahne ekliyordu. Sihirbaz `stageCount` ve `stagePosition` gönderirken `stageCapacity = 0` olarak iletiyordu. Diğer elemanlar (bistro, dans pisti, çıkışlar) için hiç kod yoktu.

#### Fix & Resolution
- `autoGenerateLayout` tamamen yeniden yazıldı; `stageCount`, `stagePosition`, `hasDanceFloor`, `bistroCount`, `emergencyExitCount`, `mainEntranceCount` alanları artık işleniyor.
- `dance_floor`, `emergency_exit`, `entrance` yeni eleman tipleri eklendi.

---

### ERR-004: Canvas Pan/Zoom Navigasyonu Yoktu

* **Environment:** Local Dev
* **Status:** Resolved

#### Symptoms
Salon tasarımcısında büyük salonlarda canvas sağa sola oynatılamıyor, zoom yapılamıyordu.

#### Root Cause
Konva `<Stage>` bileşenine `scaleX/Y`, `x/y`, `onWheel`, `onMouseMove` event'leri tanımlanmamıştı.

#### Fix & Resolution
- `stageScale`, `stagePos`, `isPanning` state'leri eklendi.
- `handleWheel` (tekerlek zoom), `handleStageMouseDown/Move/Up` (Alt+sürükle pan) fonksiyonları eklendi.
- Sağ üst köşeye +/⊙/− zoom butonları, sol alt köşeye zoom yüzdesi göstergesi eklendi.

---

### ERR-005: Local environment lacks Docker for PostgreSQL 16

* **Environment:** Local Dev
* **Status:** Resolved
* **Related Files:** [docker-compose.yml](file:///C:/Users/huseyinekizoglu/Documents/Bilet-app-new/bilet-app/docker-compose.yml), [.env](file:///C:/Users/huseyinekizoglu/Documents/Bilet-app-new/bilet-app/.env)

#### Symptoms
`docker compose --profile production up db -d` fails because Docker Desktop is not running.

#### Root Cause
Docker engine is not accessible locally. The roadmap requires PostgreSQL for production.

#### Fix & Resolution
Reverted `.env` back to SQLite to continue local testing of production pipeline (PM2, Nginx, Next.js build). Marked FAZ 19 PostgreSQL steps as skipped locally.

#### Prevention
Ensure Docker is running before executing production-like container deployments locally.

---

### ERR-006: Cannot find name 'toast' during Next.js build

* **Environment:** Local Dev (Production Build)
* **Status:** Resolved
* **Related Files:** [page.tsx](file:///C:/Users/huseyinekizoglu/Documents/Bilet-app-new/bilet-app/frontend/src/app/event/[id]/page.tsx)

#### Symptoms
`npm --prefix frontend run build` fails with `Type error: Cannot find name 'toast'.`

#### Root Cause
`toast.success` was used in `CustomerEventPage` without importing `toast` from the notification library (`sonner`).

#### Fix & Resolution
Added `import { toast } from 'sonner';` at the top of the file.

#### Prevention
Run `npm run lint` or check TypeScript compiler errors before building for production.


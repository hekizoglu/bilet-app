# 🤖 AIE Otomatik Döngü Sistemi - Başlangıç Rehberi

## 📊 Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    AIE LOOP ECOSYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 🔍 ANALIZ DÖNGÜSÜ (engine.js)                          │
│     ├─ ROADMAP.md'den görevleri analiz et                  │
│     ├─ Fikirleri otomatik üret                             │
│     ├─ Puanla (impact + security + usability)             │
│     └─ Yüksek puanlıları backlog'a ekle                   │
│                                                              │
│  2. 🔧 ÇÖZÜM DÖNGÜSÜ (solution-engine.js)                 │
│     ├─ Backlog'dan görev al                                │
│     ├─ Çözüm planı oluştur                                 │
│     ├─ Kod yaz → Test et → Git commit                     │
│     └─ ROADMAP'ı güncelle [ ] → [x]                       │
│                                                              │
│  3. ⏰ SCHEDULER (run-loop.js)                             │
│     ├─ Engine + Solution'ı sırayla çalıştır              │
│     ├─ Tek çalıştırma veya sürekli periyodik             │
│     └─ Her 5 dakika (ayarlanabilir)                       │
│                                                              │
│  4. 🚀 BAŞLATICI (start-aie-loop.ps1)                     │
│     └─ Windows PowerShell interface                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Hızlı Başlangıç

### Option 1: Tek Çalıştırma (Test)
```powershell
# PowerShell'de
powershell -ExecutionPolicy Bypass -File .\start-aie-loop.ps1 -Mode once
```

**Çıktı:**
- ✅ Analiz Döngüsü çalışır
- ✅ Çözüm Döngüsü çalışır
- ✅ Git commit yapılır
- ✅ Döngü çıkır

---

### Option 2: Sürekli Çalıştırma (Production)
```powershell
# PowerShell'de
powershell -ExecutionPolicy Bypass -File .\start-aie-loop.ps1 -Mode continuous -Interval 300000
```

**Parametreler:**
- `-Mode continuous` : Sürekli çalıştır (default)
- `-Mode once` : Bir kere çalıştır
- `-Interval 300000` : Her 5 dakikada bir (milisaniye cinsinden)

**Örnekler:**
```powershell
# Her 10 dakikada bir
.\start-aie-loop.ps1 -Mode continuous -Interval 600000

# Her 1 saatte bir
.\start-aie-loop.ps1 -Mode continuous -Interval 3600000

# Her 30 saniyede bir (test)
.\start-aie-loop.ps1 -Mode continuous -Interval 30000
```

---

### Option 3: Doğrudan Node.js (CLI)
```bash
# PowerShell/CMD'de

# Tek çalıştırma
node aie-system/run-loop.js --mode=once

# Sürekli çalıştırma
node aie-system/run-loop.js --mode=continuous --interval=300000

# 2 dakikada bir
node aie-system/run-loop.js --mode=continuous --interval=120000
```

---

## 📋 Her Döngüde Neler Olur?

### 1. Analiz Döngüsü (1-2 saniye)
```
🔍 engine.js çalışır:
   ├─ ROADMAP.md'den FAZ 14-18 görevlerini okur
   ├─ Her görev için metrikleri çıkartır
   ├─ İşlenmemiş görevleri tespit eder
   ├─ Otomatik fikirler üretiyor (kod/ürün)
   ├─ Fikirleri puanlandırıyor
   │  └─ Formül: (Impact×2.5) + (Security×2) + ... - Difficulty
   ├─ Yüksek puanlıları backlog'a ekliyor
   ├─ Faz döndürüyor (security → performance → ux → stabilization)
   └─ Sonuçları aie-system/outputs/ kaydediyor
```

### 2. Çözüm Döngüsü (5-30 saniye / görev)
```
🔧 solution-engine.js çalışır:
   ├─ Backlog'dan sonraki görevi alır
   ├─ 14 adet görev sırası oluşturur
   │  ├─ FAZ 14 (Hata Düzeltme)
   │  ├─ FAZ 16 (Güvenlik)
   │  ├─ FAZ 17 (İş Mantığı)
   │  ├─ FAZ 15 (Performans)
   │  └─ FAZ 18 (UX)
   ├─ Her görev için:
   │  ├─ Çözüm planı oluşturur
   │  ├─ Kod yazıyor
   │  ├─ Testleri çalıştırıyor
   │  ├─ Git commit yapıyor
   │  └─ ROADMAP'ta işaretliyor [ ] → [x]
   └─ Sonuçları aie-system/logs/ kaydediyor
```

---

## 📊 İzleme ve Loglar

### Log Dosyası
```
aie-system/logs/loop-schedule.log
```

**Örnek log:**
```
[2026-07-01T11:45:57.193Z] [INFO] Tek çalıştırma modu
[2026-07-01T11:45:57.239Z] [CYCLE] 🔄 TAM DÖNGÜ BAŞLADI (11:45:57)
[2026-07-01T11:45:57.288Z] [START] 🔍 Analiz Döngüsü başlatıldı...
[2026-07-01T11:45:57.477Z] [SUCCESS] ✅ Analiz Döngüsü tamamlandı
[2026-07-01T11:45:59.555Z] [START] 🔧 Çözüm Döngüsü başlatıldı...
```

### Output Dosyaları
```
aie-system/
├─ fikirler/
│  ├─ backlog.md              (Yüksek puanlı görevler)
│  ├─ kod_iyilestirme.md      (Kod önerileri)
│  └─ urun_iyilestirme.md     (Ürün önerileri)
├─ outputs/
│  ├─ yuksek_puanlilar.md     (28+)
│  ├─ orta_seviye.md          (15-27)
│  ├─ dusuk_oncelik.md        (<15)
│  └─ solution-status.md      (Çözüm durumu)
├─ solutions/
│  ├─ *.patch                 (Git patch dosyaları)
│  ├─ solution-log.json       (Çözüm logu)
│  └─ solution-status.md      (Durum raporu)
└─ logs/
   └─ loop-schedule.log       (Scheduler logu)
```

---

## ⚙️ İleri Konfigürasyon

### 1. Windows Task Scheduler ile Otomatik Başlangıç

```powershell
# PowerShell (Admin olarak)
$ProjectRoot = "C:\Users\huseyinekizoglu\Documents\Bilet-app-new\bilet-app"
$ScriptPath = "$ProjectRoot\start-aie-loop.ps1"

$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$ScriptPath`" -Mode continuous"

$Trigger = New-ScheduledTaskTrigger -AtStartup

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

$Task = New-ScheduledTask -Action $Action -Trigger $Trigger -Settings $Settings -Description "AIE Loop"

Register-ScheduledTask -TaskName "AIE-Loop" -InputObject $Task -Force

Write-Host "✅ Task oluşturuldu: AIE-Loop"
Write-Host "   PC başladığında otomatik çalışacak"
```

### 2. PM2 (Node Process Manager) ile Kalıcı Çalıştırma

```bash
# npm install -g pm2
# (Çalıştırmak için Node.js gerekli)

cd "C:\Users\huseyinekizoglu\Documents\Bilet-app-new\bilet-app"

# AIE Loop'u PM2 ile başlat
pm2 start aie-system/run-loop.js --name "aie-loop" -- --mode=continuous --interval=300000

# Başlangıçta otomatik başlasın
pm2 startup

# Logları izle
pm2 logs aie-loop

# Durmak
pm2 stop aie-loop

# Tamamen kaldırmak
pm2 delete aie-loop
```

---

## 🛑 Durdurmak

### PowerShell'de Çalışıyorsa
```powershell
# CTRL + C tuşunu basın
```

### PM2'de Çalışıyorsa
```bash
pm2 stop aie-loop
```

### Windows Task Scheduler'da Çalışıyorsa
```powershell
Stop-ScheduledTask -TaskName "AIE-Loop"
# Tamamen kaldırmak:
Unregister-ScheduledTask -TaskName "AIE-Loop" -Confirm:$false
```

---

## ✅ Kontrol Listesi

Sistemi başlatmadan önce:

- [ ] Node.js 24+ yüklü mü? (`node --version`)
- [ ] Proje root directory'de `aie-system/` var mı?
- [ ] `aie-system/loop/` klasöründe engine.js ve solution-engine.js var mı?
- [ ] ROADMAP.md dosyası var mı ve yazılabilir mi?
- [ ] Git repository hazır mı? (`git status`)
- [ ] Loopların yazılacağı `logs/` klasörü var mı?

---

## 🔧 Sorun Giderme

### "Node.js bulunamadı" hatası
```powershell
# Node.js yükleme
# https://nodejs.org adresinden v24+ indir ve kur
node --version   # Kontrol et
```

### "Dosya bulunamadı" hatası
```powershell
# Doğru directory'de misin?
cd "C:\Users\huseyinekizoglu\Documents\Bilet-app-new\bilet-app"
Get-ChildItem aie-system/loop/   # Dosyaları kontrol et
```

### "Permission denied" hatası
```powershell
# PowerShell execution policy ayarla
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Git commit hatası
```bash
# Git yapılandır
git config user.email "your@email.com"
git config user.name "Your Name"
git add .
git commit -m "Initial setup"
```

---

## 📈 Döngü Grafikleri

### Haftalık İlerleme (Beklenen)
```
HAFTAnın BAŞI   ╭──────────────────────────────────────╮
                │ Tamamlanan Görevler: 45-50           │
                │ Çözülen Hatalar: 20-25               │
                │ Kod Kalitesi: ↑ +5%                 │
                │ Güvenlik: ↑ +8%                      │
                │ Performans: ↑ +10%                   │
HAFTAnın SONU    ╰──────────────────────────────────────╯
```

### Faz Döngüsü (4 Hafta)
```
Hafta 1: STABILIZATION  (Hata düzeltme)        ✅
Hafta 2: SECURITY       (Güvenlik sıkılaştırma) ✅
Hafta 3: PERFORMANCE    (Performans optimize)   ➡️
Hafta 4: UX             (Kullanıcı deneyimi)    ⏳
```

---

## 📞 Destek

Log dosyalarını ve ROADMAP değişikliklerini kontrol edin:
- 📄 `aie-system/logs/loop-schedule.log` - Scheduler logu
- 📄 `ROADMAP.md` - Güncellenmiş görevler
- 📁 `aie-system/outputs/` - Çözüm sonuçları
- 📁 `aie-system/fikirler/` - Fikir backlog

---

*Last Updated: 2026-07-01 | AIE Loop System v1.0*

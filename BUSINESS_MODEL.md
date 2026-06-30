# 💼 BUSINESS_MODEL.md — Bilet Yönetim Sistemi Gelir Modeli

> Oluşturulma tarihi: 29 Haziran 2026  
> Durum: Taslak — Değerlendirme aşamasında  
> Yazar: Hüseyin Ekizoğlu

---

## 🎯 Temel Strateji: "Araç Sat, Komisyon Alma"

Rakipler (Biletix, Passo, Biletino) **bilet başına %10–18 komisyon** keserken, biz organizatörlere sistemi **aylık sabit ücretle** kiralarız. Organizatör 1.000 bilet satarsa Biletix'e ~15.000 TL verirken, bize yalnızca 1.499 TL öder.

Bu farkı bir kez anlatmak satışı kapatmaya yeter.

---

## 💰 Gelir Kaynakları

### 1. SaaS Abonelik Planları (Temel Gelir)

| Plan | Aylık | Yıllık (2 ay bedava) | Hedef Müşteri |
|:-----|------:|---------------------:|:--------------|
| **Starter** | 499 TL | 4.990 TL | Küçük mekan, atölye, küçük sahne |
| **Pro** | 1.499 TL | 14.990 TL | Düğün salonu, tiyatro, bar, konser |
| **Business** | 3.499 TL | 34.990 TL | Festival, fuar, büyük organizasyon |
| **Enterprise** | Özel teklif | Özel teklif | Zincir mekan, holdinglerle lisans |

#### Plan Kapsamları

| Özellik | Starter | Pro | Business | Enterprise |
|:--------|:-------:|:---:|:--------:|:----------:|
| Etkinlik sayısı | 2/ay | 10/ay | Sınırsız | Sınırsız |
| Salon tasarımcısı | ✅ | ✅ | ✅ | ✅ Özel |
| QR Check-in | ✅ | ✅ | ✅ | ✅ |
| E-posta bildirimleri | ✅ | ✅ | ✅ | ✅ |
| Telegram bot | ❌ | ✅ | ✅ | ✅ |
| Banka webhook | ❌ | ✅ | ✅ | ✅ |
| Finansal raporlar | ❌ | ✅ | ✅ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |
| Öncelikli destek | ❌ | E-posta | 7/24 chat | Özel tam. |
| Masa sipariş modülü | ❌ | Add-on | ✅ | ✅ |

---

### 2. Kurulum & Onboarding Ücreti (Tek Seferlik)

Yeni müşteriyi sisteme dahil etme, salon kurulumu, özelleştirme:

| Hizmet | Ücret |
|:-------|------:|
| Temel kurulum & SMTP ayarı | 1.500 TL |
| Salon tasarımı (1 salon, 250 koltuk'a kadar) | 2.500 TL |
| Logo/renk özelleştirme (marka kiti) | 1.000 TL |
| Banka webhook entegrasyonu & test | 2.000 TL |
| Telegram bot oluşturma & yapılandırma | 1.000 TL |
| **Tam paket kurulum** | **6.500 TL** |

---

### 3. Premium Add-on Modüller (Aylık Ek Ücret)

| Modül | Aylık |
|:------|------:|
| Telegram Bot Entegrasyonu | 299 TL |
| Banka Webhook Otomatik Eşleme | 499 TL |
| Finansal Raporlama & Analitikler | 199 TL |
| Ek Salon Paketi (5+ salon) | 299 TL |
| QR Kapı Kontrol Terminali | 149 TL |
| **Masa Sipariş Modülü** | 399 TL |
| **Dinamik Fiyatlandırma Motoru** | 699 TL |
| **Görüş Açısı Analizi & Koltuk Etiketleme** | 349 TL |
| **Grup Rezervasyon Linki** | 249 TL |
| SMS Bildirim Paketi (1.000 SMS) | 199 TL |

---

### 4. White-label Lisans (En Yüksek Birim Gelir)

Büyük organizatörler veya yazılım şirketleri sistemi kendi markaları altında kullanmak ister:

| Paket | Yıllık Ücret |
|:------|-------------:|
| Standart White-label (tek domain) | 30.000 TL |
| Kurumsal White-label (sınırsız domain) | 75.000 TL |
| Kaynak kod lisansı (tek seferlik) | 150.000 TL |

---

### 5. Danışmanlık & Etkinlik Destek Hizmetleri

Büyük etkinliklerde canlı teknik destek, yerinde kurulum:

| Hizmet | Ücret |
|:-------|------:|
| Etkinlik günü uzak teknik destek (4 saat) | 1.500 TL |
| Etkinlik günü yerinde teknik destek (tam gün) | 4.000 TL |
| Ayda 1 etkinlik danışmanlık paketi | 2.500 TL/ay |

---

## 📈 Finansal Projeksiyon (12 Ay)

### Senaryo A — Muhafazakâr (30 müşteri)

| Kaynak | Hesap | Yıllık Gelir |
|:-------|:------|-------------:|
| Pro abonelik × 20 | 1.499 × 20 × 12 | 359.760 TL |
| Starter abonelik × 10 | 499 × 10 × 12 | 59.880 TL |
| Kurulum ücretleri × 30 | ort. 3.000 TL | 90.000 TL |
| Add-on gelirleri (ort. 400 TL/müşteri) | 400 × 30 × 12 | 144.000 TL |
| **Toplam** | | **~653.640 TL/yıl** |

### Senaryo B — Büyüme (100 müşteri, 18. ay)

| Kaynak | Hesap | Yıllık Gelir |
|:-------|:------|-------------:|
| Business × 10 | 3.499 × 10 × 12 | 419.880 TL |
| Pro × 60 | 1.499 × 60 × 12 | 1.079.280 TL |
| Starter × 30 | 499 × 30 × 12 | 179.640 TL |
| Add-on × 100 ort. 500 TL | 500 × 100 × 12 | 600.000 TL |
| 2 White-label | | 60.000 TL |
| **Toplam** | | **~2.338.800 TL/yıl** |

---

## 🎪 Hedef Müşteri Segmentleri

1. **Düğün & Nişan Salonları** — Koltuk düzeni çok kritik, aylık etkinlik sayısı düşük → Starter/Pro ideal
2. **Küçük/Orta Tiyatrolar** — Numara koltuk zorunlu, e-bilet önemli → Pro
3. **Bar & Konser Mekanları** — Masa düzeni, Telegram ödeme, hızlı satış → Pro + Add-on
4. **Fuar & Kongre Merkezleri** — Çoklu salon, raporlama → Business
5. **Belediye Kültür Merkezleri** — Kartsız ödeme, IBAN kritik → Pro
6. **Festival Organizatörleri** — Dinamik fiyat, grup linki → Business + Add-on

---

## 🚀 Büyüme Stratejisi

### Kısa Vade (0–6 ay)
- [ ] 5 pilot müşteri ücretsiz / indirimli al, referans listesi oluştur
- [ ] Düğün sektörü hedefli LinkedIn + Instagram içerik pazarlaması
- [ ] "Biletix'e komisyon ödemiyorum" odaklı case study hazırla

### Orta Vade (6–18 ay)
- [ ] Reseller (bayi) programı: Başka ajanslar kendi müşterilerine satsın → gelirin %30'u bayiye
- [ ] API Marketplace: Sistemi başka platformlara entegre eden geliştiricilere açık API → aylık kullanım ücreti
- [ ] "Bilet Yönetim SaaS" olarak Product Hunt lansmanı

### Uzun Vade (18+ ay)
- [ ] Türkiye dışında genişleme (KKTC, Almanya Türk diasporası, Balkanlar)
- [ ] Banka entegrasyonları için fintech ortaklıkları
- [ ] Masa Sipariş modülü ile POS sistemi entegrasyonu (Ödeme komisyonu buradan)

---

## ⚠️ Riskler & Önlemler

| Risk | Önlem |
|:-----|:------|
| Rakipler fiyatı düşürür | White-label + add-on çeşitliliği ile kilitlilik artır |
| Müşteri iptali (churn) | Onboarding'i güçlendir, ilk 3 ay destek paketi sun |
| Büyük rakip pazar giriş yapar | Niş segmentlere odaklan (düğün, bar, küçük sahne) |
| Teknik arıza etkinlik günü | SLA teklif et, yerinde destek paketi ile riskten kazan |

---

> 📌 **Not:** Bu doküman taslak niteliğindedir. Fiyatlandırma, pazar araştırması ve maliyet analizi sonrası revize edilecektir.

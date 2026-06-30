# Bilet Uygulaması - Öğrenilmiş Kurallar ve Standartlar

Her bir analiz döngüsünde tespit edilen kodlama hataları, tekrarlar veya yapısal sorunlar sonucunda sistemin kalitesini artırmak için konulan kurallar bütünüdür.

## Kurallar Listesi

1. **Gereksiz Sarmalayıcılardan (Wrapper) Kaçın:** Google Apps Script (`google.script.run`) mimarisinde frontend üzerinden doğrudan `.gs` içindeki fonksiyonlar çağrılabildiği için, sırf frontend için `clientFunction() { return function(); }` gibi içi boş sarmalayıcılar yazmak teknik borç yaratır. Sadece mantık ayrımı gerekiyorsa private fonksiyonlar (`_` ön eki ile) kullanılmalıdır.
2. **"Mini Test" Ön Koşulu:** Yapılan kurumsal, altyapısal veya koda dayalı her değişikliğin (Örn: Veritabanı modelinin değişmesi) ardından, bu fazı tamamlandı işaretlemeden önce mutlaka çalışan bir **mini test betiği (örneğin test.js)** yazılmalı ve denenmelidir. Kod test edilmeden Roadmap adımları bitmiş sayılmaz.
3. **Hata Toleransı (Resilience) ve Kesintisiz Döngü:** Sistem çalışırken kodlama hatası, derleme (build) hatası veya eksik paket hatası alsa dahi otonom döngü **asla durdurulmamalıdır.** Hata tespit edildiğinde sistem hatayı yakalamalı, düzeltmeye çalışmalı veya düzeltilemiyorsa Roadmap/Fikirler dosyasına "Çözülecek Sorun" olarak not edip bir sonraki göreve (veya bir sonraki 10 dakikalık döngüye) kesintisiz devam etmelidir.

# Mesai Takip Uygulaması

Modern ve kullanıcı dostu bir mesai takip uygulaması. React, TypeScript ve Tailwind CSS ile geliştirilmiştir.

## 📱 Özellikler

- **Aylık Mesai Takibi**: Günlük mesai saatlerinizi kolayca kaydedin ve takip edin
- **Akıllı Ücret Hesaplama**: Haftaiçi, cumartesi, pazar ve resmi tatil günleri için farklı katsayılarla otomatik ücret hesaplama
- **Resmi & Dini Tatil Desteği**: 2025-2035 yılları arası tüm resmi ve dini tatiller önceden tanımlı
- **Detaylı Raporlama**: Aylık özet raporları ve mesai türlerine göre ayrıntılı analiz
- **Veri Yedekleme**: Verilerinizi yedekleyin, paylaşın ve geri yükleyin
- **Maaş Ayarları**: Kişiselleştirilebilir maaş ve vergi oranları
- **Mobil Uyumlu**: Android APK desteği ile mobil cihazlarda sorunsuz çalışma
- **Modern Tasarım**: Kullanıcı dostu arayüz ve smooth animasyonlar

## 🚀 Android için Kurulum ve Paketleme

Uygulamayı yerel ortamınızda çalıştırmak için aşağıdaki adımları takip edin:

```bash
$ npm install
$ npm run build
$ rm -rf android
$ npx cap add android
$ cd .\android\
$ .\gradlew.bat assembleDebug
```

## 💰 Mesai Ücret Hesaplama

Uygulama farklı gün türleri için otomatik ücret hesaplama yapar:

- **Haftaiçi Mesailer**: Pazartesi-Cuma (varsayılan 1.5x katsayı)
- **Cumartesi Mesailer**: Cumartesi günleri (varsayılan 1.5x katsayı)  
- **Pazar Mesailer**: Pazar günleri (varsayılan 2.5x katsayı)
- **Resmi & Dini Tatil Mesailer**: Bayram ve resmi tatiller (varsayılan 2.0x katsayı)

Tüm hesaplamalar SGK, gelir vergisi ve damga vergisi kesintileri düşüldükten sonraki net tutarları gösterir.

## 📅 Desteklenen Tatiller

### Resmi Tatiller (Her Yıl)
- Yılbaşı (1 Ocak)
- 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı
- 1 Mayıs Emek ve Dayanışma Günü
- 19 Mayıs Gençlik ve Spor Bayramı
- 15 Temmuz Demokrasi ve Milli Birlik Günü
- 30 Ağustos Zafer Bayramı
- 29 Ekim Cumhuriyet Bayramı

### Dini Tatiller (2025-2035)
- Ramazan Bayramı (3 gün)
- Kurban Bayramı (4 gün)

## 🛠️ Teknoloji Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Mobile**: Capacitor (Android APK desteği)
- **Build Tool**: Vite
- **Data Storage**: LocalStorage (otomatik yedekleme)

## 📊 Veri Yönetimi

- **Otomatik Kaydetme**: Tüm veriler otomatik olarak tarayıcıda saklanır
- **Yedekleme Sistemi**: JSON formatında veri export/import
- **Paylaşma**: Mobil cihazlarda native paylaşma desteği
- **Veri Güvenliği**: Veriler sadece cihazınızda saklanır, hiçbir sunucuya gönderilmez

## 👨‍💻 Geliştirici

- **GitHub**: [efek0349](https://github.com/efek0349)
- **E-posta**: kndmrefe@gmail.com
- **Telegram**: https://t.me/efek0349
- **Proje**: [mesaitakip](https://github.com/efek0349/mesaitakip)

## 📄 Lisans

Bu proje açık kaynak kodludur ve GPL-3.0 lisansı altında dağıtılmaktadır.

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak için:

Repository'yi fork edin

## 📱 APK İndirme

Android APK dosyasını  [burada](https://github.com/efek0349/mesaitakip/releases) bulabilirsiniz.

---

**Not**: Bu uygulama kişisel mesai takibi için geliştirilmiştir. Resmi muhasebe işlemleri için profesyonel danışmanlık alınması önerilir.

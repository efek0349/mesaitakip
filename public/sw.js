// Mesai Takip — minimal service worker
//
// TEK AMACI: Chrome'un PWA "kurulabilirlik" şartlarından biri olan
// "fetch event handler'lı kayıtlı bir service worker" şartını karşılamak.
// Bu olmadan tarayıcı manifest'i (shortcuts dahil) görse bile uygulamayı
// gerçek bir PWA olarak "kurmuyor", sadece düz bir kısayol ekliyor — ki
// bu yüzden ana ekran ikonuna basılı tutunca sadece "Kaldır" çıkıyordu.
//
// BİLİNÇLİ OLARAK HİÇBİR ŞEYİ CACHE'LEMİYOR — sadece isteği ağdan aynen
// geçiriyor. Böylece GitHub Pages'e her yeni deploy anında yansır, eski/
// bayat bir sürüm takılı kalmaz. İleride gerçek offline destek istenirse
// (örn. bağlantı yokken açılabilme) buraya bir cache stratejisi eklenebilir.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

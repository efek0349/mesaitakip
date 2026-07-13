import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
// React95 (Win95 teması) — sıra önemli:
// 1) index.css (Tailwind) — base reset
// 2) GlobalStyle — React95'in font/scrollbar reset'i
// 3) win95.css — React95'in kendi renk/stil teması (:root değişkenleri)
// 4) win95-overrides.css — bizim Win95 açık/kapalı yönetimi + koyu varyant
//    renk override'ları. win95.css'ten SONRA gelmesi kasıtlı: aynı :root
//    seviyesinde tanım yapıldığı için import sırası ve specificity'nin
//    bizim tarafımızda olmasını garanti eder.
import '@react95/core/GlobalStyle';
import '@react95/core/themes/win95.css';
import './win95-overrides.css';
import { initializeViewportHandler } from './utils/androidUtils';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element (#root) bulunamadı. index.html dosyasını kontrol edin.');
}

// Initialize the viewport handler to manage safe areas and capture the cleanup function
const cleanupViewport = initializeViewportHandler();

// Handle Hot Module Replacement (HMR) cleanup in development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupViewport();
  });
}

// Service worker'ı SADECE web'de kaydet — native (Capacitor) uygulamada
// gereksiz/anlamsız, WebView zaten kendi native shell'i üzerinden çalışıyor.
// window.Capacitor global'i, native ortamda Capacitor tarafından otomatik
// enjekte edilir; import gerektirmeyen en hafif tespit yöntemi bu.
if ('serviceWorker' in navigator && !(window as any).Capacitor?.isNativePlatform?.()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker kaydı başarısız:', err);
    });
  });
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

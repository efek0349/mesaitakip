import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeViewportHandler } from './utils/androidUtils';

// Initialize the viewport handler to manage safe areas and capture the cleanup function
const cleanupViewport = initializeViewportHandler();

// Handle Hot Module Replacement (HMR) cleanup in development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupViewport();
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element (#root) bulunamadı. index.html dosyasını kontrol edin.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

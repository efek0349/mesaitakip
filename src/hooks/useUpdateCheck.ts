import { useEffect } from 'react';
import { APP_VERSION } from '../components/AboutModal';
import { showToast } from '../utils/toastUtils';

const API_URL = 'https://api.github.com/repos/efek0349/mesaitakip/releases/latest';
const REPO_URL = 'https://github.com/efek0349/mesaitakip/releases';

export const useUpdateCheck = () => {
  useEffect(() => {
    const checkUpdate = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(API_URL, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');

        // Semantik Versiyon Karşılaştırması
        const compareVersions = (v1: string, v2: string) => {
          const parts1 = v1.split('.').map(Number);
          const parts2 = v2.split('.').map(Number);
          
          for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1; // v1 daha büyük (yeni versiyon)
            if (p1 < p2) return -1; // v2 daha büyük (mevcut versiyon yeni)
          }
          return 0; // Eşit
        };

        if (latestVersion && compareVersions(latestVersion, APP_VERSION) === 1) {
          showToast(
            `Yeni bir güncelleme mevcut: v${latestVersion}`,
            'update',
            10000,
            {
              action: {
                label: 'İndir',
                onClick: () => window.open(REPO_URL, '_blank')
              }
            }
          );
        }
      } catch (error) {
        // Sessizce başarısız ol, kullanıcıyı rahatsız etme
        console.warn('Update check failed (network error)');
      }
    };

    // Uygulama başladıktan 3 saniye sonra kontrol et
    const timer = setTimeout(checkUpdate, 3000);
    return () => clearTimeout(timer);
  }, []);
};

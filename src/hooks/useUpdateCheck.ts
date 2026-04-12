import { useEffect } from 'react';
import { APP_VERSION } from '../components/AboutModal';
import { showToast } from '../utils/toastUtils';

const UPDATE_URL = 'https://raw.githubusercontent.com/efek0349/mesaitakip/main/version.json';
const REPO_URL = 'https://github.com/efek0349/mesaitakip/releases';

export const useUpdateCheck = () => {
  useEffect(() => {
    const checkUpdate = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(UPDATE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.version;

        if (latestVersion && latestVersion !== APP_VERSION) {
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
        console.error('Update check failed:', error);
      }
    };

    // Check on mount (app start)
    const timer = setTimeout(checkUpdate, 3000); // Delay to not interfere with initial load
    return () => clearTimeout(timer);
  }, []);
};

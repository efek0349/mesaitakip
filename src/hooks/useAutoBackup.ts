import { useEffect, useCallback } from 'react';
import { useSalarySettings } from './useSalarySettings';
import { useOvertimeData } from './useOvertimeData';
import { googleDriveService } from '../utils/googleDriveService';
import { Capacitor } from '@capacitor/core';
import { showToast } from '../utils/toastUtils';

export const useAutoBackup = () => {
  const { settings, updateSettings, isLoaded: salaryLoaded } = useSalarySettings();
  const { exportAllData, isLoaded: dataLoaded } = useOvertimeData();

  const performBackup = useCallback(async () => {
    // Ayar kapalıysa veya veriler henüz yüklenmemişse çık
    if (!salaryLoaded || !dataLoaded || !settings.autoBackupEnabled) return;

    // Önce oturumu tazeleme/kontrol etme denemesi yap (Native'de refresh token kullanır)
    await googleDriveService.init();

    // Google Drive kullanıcısı yoksa (Web'de süresi dolmuş olabilir veya hiç giriş yapılmamış) çık
    const user = googleDriveService.getUser();
    if (!user) {
      // Eğer native değilse (Web ise) ve kullanıcı yoksa sessizce çık, kullanıcıyı her seferinde login'e zorlama
      return;
    }

    // Son yedeklemeden bu yana geçen süreyi kontrol et (7 gün)
    const lastBackup = settings.lastBackupDate ? new Date(settings.lastBackupDate) : new Date(0);
    const now = new Date();
    
    // Milisaniye farkını gün sayısına çevir
    const diffTime = now.getTime() - lastBackup.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays >= 7) {
      try {
        const data = exportAllData();
        const success = await googleDriveService.uploadBackup(data);
        if (success) {
          updateSettings({
            ...settings,
            lastBackupDate: new Date().toISOString()
          });

          // TEMİZLİK: En yeni 10 yedeği tut, gerisini sil
          const allBackups = await googleDriveService.listBackups();
          if (allBackups.length > 10) {
            // listBackups zaten 'createdTime desc' (en yeni en üstte) döner
            // İlk 10'dan sonrasını (eskileri) silelim
            const backupsToDelete = allBackups.slice(10);
            for (const file of backupsToDelete) {
              await googleDriveService.deleteBackup(file.id);
            }
          }
          showToast('Bulut yedeklemesi başarıyla tamamlandı', 'success', 4000);
        }
      } catch (error) {
        console.error('Otomatik yedekleme hatası:', error);
      }
    }
  }, [settings, exportAllData, updateSettings, salaryLoaded, dataLoaded]);

  useEffect(() => {
    // Uygulama açıldıktan kısa bir süre sonra kontrol et
    const timer = setTimeout(() => {
      performBackup();
    }, 15000); // 15 saniye bekle (servislerin tam init olması için süreyi biraz artırdım)

    return () => clearTimeout(timer);
  }, [performBackup]);
};

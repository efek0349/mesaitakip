import { useEffect, useCallback, useRef } from 'react';
import { useSalarySettings } from './useSalarySettings';
import { useOvertimeData } from './useOvertimeData';
import { googleDriveService } from '../utils/googleDriveService';
import { showToast } from '../utils/toastUtils';

export const useAutoBackup = () => {
  const { settings, updateSettings, isLoaded: salaryLoaded } = useSalarySettings();
  const { exportAllData, isLoaded: dataLoaded } = useOvertimeData();

  // Değerleri ref ile takip ederek performBackup callback'inin referansını sabit tutuyoruz.
  const settingsRef = useRef(settings);
  const salaryLoadedRef = useRef(salaryLoaded);
  const dataLoadedRef = useRef(dataLoaded);
  const exportAllDataRef = useRef(exportAllData);
  const updateSettingsRef = useRef(updateSettings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { salaryLoadedRef.current = salaryLoaded; }, [salaryLoaded]);
  useEffect(() => { dataLoadedRef.current = dataLoaded; }, [dataLoaded]);
  useEffect(() => { exportAllDataRef.current = exportAllData; }, [exportAllData]);
  useEffect(() => { updateSettingsRef.current = updateSettings; }, [updateSettings]);

  const performBackup = useCallback(async () => {
    const currentSettings = settingsRef.current;

    // Ayar kapalıysa veya veriler henüz yüklenmemişse çık
    if (!salaryLoadedRef.current || !dataLoadedRef.current || !currentSettings.autoBackupEnabled) return;

    try {
      // Önce oturumu tazeleme/kontrol etme denemesi yap
      await googleDriveService.init();

      // Google Drive kullanıcısı yoksa çık
      const user = googleDriveService.getUser();
      if (!user) return;

      // Son yedeklemeden bu yana geçen süreyi kontrol et (7 gün)
      const lastBackup = currentSettings.lastBackupDate 
        ? new Date(currentSettings.lastBackupDate) 
        : new Date(0);
      
      const diffDays = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays >= 7) {
        const data = exportAllDataRef.current();
        if (!data) return;

        const success = await googleDriveService.uploadBackup(data);
        if (success) {
          updateSettingsRef.current(prev => ({
            ...prev,
            lastBackupDate: new Date().toISOString()
          }));

          // En fazla 10 yedek sakla, eskileri temizle
          const allBackups = await googleDriveService.listBackups();
          if (allBackups.length > 10) {
            const backupsToDelete = allBackups.slice(10);
            await Promise.allSettled(
              backupsToDelete.map(file => googleDriveService.deleteBackup(file.id))
            );
          }
          showToast('Otomatik bulut yedeklemesi başarıyla tamamlandı', 'success', 4000);
        }
      }
    } catch (error) {
      console.error('Otomatik yedekleme hatası:', error);
    }
  }, []);

  useEffect(() => {
    // Uygulama açıldıktan kısa bir süre sonra kontrol et
    if (salaryLoaded && dataLoaded) {
      const timer = setTimeout(performBackup, 15000);
      return () => clearTimeout(timer);
    }
  }, [salaryLoaded, dataLoaded, performBackup]);
};

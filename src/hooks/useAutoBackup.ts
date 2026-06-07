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

    // 1. Temel Kontroller: Ayar kapalıysa veya veriler yüklenmemişse hiç başlama
    if (!salaryLoadedRef.current || !dataLoadedRef.current || !currentSettings.autoBackupEnabled) return;

    // 2. Güvenli Tarih Kontrolü:
    const lastBackupStr = currentSettings.lastBackupDate;
    if (lastBackupStr) {
      const lastBackupTime = new Date(lastBackupStr).getTime();
      
      // Geçerli bir tarihse periyot kontrolü yap
      if (!isNaN(lastBackupTime)) {
        const diffMs = Date.now() - lastBackupTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        let dayLimit = 7; // Varsayılan: Haftalık
        if (currentSettings.autoBackupPeriod === 'daily') dayLimit = 1;
        else if (currentSettings.autoBackupPeriod === 'monthly') dayLimit = 30;

        // EĞER periyot henüz dolmadıysa (en az 0.9 gün pay bırakarak) ÇIK
        if (diffDays < (dayLimit - 0.01)) {
          return;
        }
      }
    }

    try {
      // 3. Oturum Kontrolü: Sadece tarih dolmuşsa Google Drive'a bak
      await googleDriveService.init();
      const user = googleDriveService.getUser();
      if (!user) return;

      const data = exportAllDataRef.current();
      if (!data) return;

      const success = await googleDriveService.uploadBackup(data);
      if (success) {
        updateSettingsRef.current(prev => ({
          ...prev,
          lastBackupDate: new Date().toISOString()
        }));

        // Yedek temizliği
        const allBackups = await googleDriveService.listBackups();
        if (allBackups.length > 10) {
          const backupsToDelete = allBackups.slice(10);
          await Promise.allSettled(
            backupsToDelete.map(file => googleDriveService.deleteBackup(file.id))
          );
        }
        showToast('Otomatik bulut yedeklemesi tamamlandı', 'success', 4000);
      }
    } catch (error) {
      console.error('Otomatik yedekleme hatası:', error);
    }
  }, []);

  useEffect(() => {
    // Ayarlar veya yükleme durumu değiştiğinde tetikle
    if (salaryLoaded && dataLoaded && settings.autoBackupEnabled) {
      const timer = setTimeout(performBackup, 15000);
      return () => clearTimeout(timer);
    }
  }, [salaryLoaded, dataLoaded, settings.autoBackupEnabled, settings.autoBackupPeriod, performBackup]);
};

import { useEffect, useCallback, useRef } from 'react';
import { useSalarySettings } from './useSalarySettings';
import { useOvertimeData } from './useOvertimeData';
import { getSavedFolderName, backupNowToFolder, listFolderBackups, deleteFolderBackup } from '../utils/folderBackupUtils';
import { showToast } from '../utils/toastUtils';

/**
 * Otomatik yedekleme artık Google Drive yerine kullanıcının Veri Yönetimi > Dosya
 * bölümünden seçtiği YEREL KLASÖRE yazar. Sebep: Google OAuth, test/onaylanmamış
 * projelerde 7 günde bir refresh token'ı geçersiz kılıyor ve arka planda sessizce
 * yedekleme yapılamamasına yol açıyordu. Yerel klasör hesap/internet gerektirmediği
 * için arka planda kesintisiz çalışır. Google Drive'a manuel yedekleme hâlâ
 * "Bulut" sekmesinden yapılabilir; bu yalnızca OTOMATİK mekanizmayı değiştirir.
 */
export const useAutoBackup = () => {
  const { settings, updateSettings, isLoaded: salaryLoaded } = useSalarySettings();
  const { exportAllData, isLoaded: dataLoaded } = useOvertimeData();

  // Değerleri ref ile takip ederek performBackup callback'inin referansını sabit tutuyoruz.
  const settingsRef = useRef(settings);
  const salaryLoadedRef = useRef(salaryLoaded);
  const dataLoadedRef = useRef(dataLoaded);
  const exportAllDataRef = useRef(exportAllData);
  const updateSettingsRef = useRef(updateSettings);

  useEffect(() => { 
    settingsRef.current = settings; 
    salaryLoadedRef.current = salaryLoaded;
    dataLoadedRef.current = dataLoaded;
    exportAllDataRef.current = exportAllData;
    updateSettingsRef.current = updateSettings;
  }, [settings, salaryLoaded, dataLoaded, exportAllData, updateSettings]);

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
      // 3. Klasör Kontrolü: Kullanıcı bir yedekleme klasörü seçmemişse sessizce çık
      const folderName = await getSavedFolderName();
      if (!folderName) return;

      const data = exportAllDataRef.current();
      if (!data) return;

      const result = await backupNowToFolder(data);
      if (result.success) {
        updateSettingsRef.current(prev => ({
          ...prev,
          lastBackupDate: new Date().toISOString()
        }));

        // Eski yedekleri temizle (Sadece son 10 yedeği tut)
        const allBackups = await listFolderBackups();
        if (allBackups.length > 10) {
          const backupsToDelete = allBackups.slice(10);
          await Promise.allSettled(
            backupsToDelete.map(file => deleteFolderBackup(file.name))
          );
        }
        showToast('Otomatik yerel yedekleme tamamlandı', 'success', 4000);
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

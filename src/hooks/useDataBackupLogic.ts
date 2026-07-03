import React, { useState, useEffect, useCallback } from 'react';
import { useOvertimeData } from './useOvertimeData';
import { useSalarySettings } from './useSalarySettings';
import { useHolidays } from './useHolidays';
import { useFolderBackup } from './useFolderBackup';
import { useCustomHolidays } from './useCustomHolidays';
import { useDiniHolidays } from './useDiniHolidays';
import { useResmiHolidays } from './useResmiHolidays';
import { saveBackupFile, pickAndReadBackupFile, generateCsvContent, shareFile } from '../utils/fileUtils';
import { googleDriveService, GoogleUser, DriveFile } from '../utils/googleDriveService';
import { generateHMAC, verifyHMAC, formatTurkishDate, parseDate } from '../utils/dateUtils';
import { Holiday } from '../types/overtime';
import { Dialog } from '@capacitor/dialog';
import { Capacitor } from '@capacitor/core';

export type BackupTab = 'cloud' | 'backup' | 'file' | 'tools' | 'holidays';

/**
 * useDataBackupLogic — DataBackupModal.tsx'in TÜM state/handler mantığı.
 * Tailwind ve Win95 versiyonları arasında PAYLAŞILAN tek doğruluk kaynağı.
 */
export function useDataBackupLogic(isOpen: boolean, currentDate?: Date) {
  const { exportAllData, importData, clearAllData, monthlyData } = useOvertimeData();
  const { clearSalarySettings, settings, updateSettings } = useSalarySettings();
  const { getHoliday } = useHolidays(currentDate?.getFullYear());

  const {
    supported: folderBackupSupported,
    folderName: backupFolderName,
    backups: folderBackups,
    refreshing: folderBackupsRefreshing,
    pickFolder: pickBackupFolderHandler,
    removeFolder: removeBackupFolder,
    backupNow: backupToFolderNow,
    restoreBackup: restoreFromFolderBackup,
    deleteBackup: deleteFolderBackupHandler,
  } = useFolderBackup();

  const { loading: diniLoading, error: diniError, lastUpdated: diniLastUpdated, refresh: refreshDini } = useDiniHolidays();
  const { loading: resmiLoading, error: resmiError, lastUpdated: resmiLastUpdated, refresh: refreshResmi } = useResmiHolidays();
  const { holidays: customHolidays, addHoliday: addCustomHoliday, updateHoliday: updateCustomHoliday, removeHoliday: removeCustomHoliday } = useCustomHolidays();

  const [activeTab, setActiveTab] = useState<BackupTab>('cloud');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showVerifyArea, setShowVerifyArea] = useState(false);
  const [verifyText, setVerifyText] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayShortName, setNewHolidayShortName] = useState('');
  const [newHolidayType, setNewHolidayType] = useState<'official' | 'religious'>('official');
  const [newHolidayHalfDay, setNewHolidayHalfDay] = useState(false);
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);
  const [editingHolidayDate, setEditingHolidayDate] = useState<string | null>(null);

  const today = React.useMemo(() => new Date(), []);
  const isWeb = Capacitor.getPlatform() === 'web';

  const refreshBackupList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await googleDriveService.listBackups();
      setBackups(list);
      setGoogleUser(googleDriveService.getUser());
    } catch (e) {
      setMessage({ type: 'error', text: 'Yedekler yüklenemedi. Bağlantınızı kontrol edin.' });
      setGoogleUser(googleDriveService.getUser());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const existingUser = googleDriveService.getUser();
      if (existingUser) {
        setGoogleUser(existingUser);
        refreshBackupList();
      } else {
        setLoading(true);
        googleDriveService.init()
          .then(user => {
            setGoogleUser(user);
            if (user) refreshBackupList();
          })
          .catch(() => setGoogleUser(null))
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, refreshBackupList]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleVerifyLog = useCallback(async () => {
    if (!verifyText.trim()) return;

    let cleanText = verifyText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    cleanText = cleanText
      .replace(/^```[^\n]*\n/, '')
      .replace(/\n```\s*$/, '\n')
      .replace(/^```\s*\n?/, '');

    const hashLabel = '[!] KONTROL_KODU: ';
    const lastLineStart = cleanText.lastIndexOf(hashLabel);

    if (lastLineStart === -1) {
      setVerifyResult({ success: false, message: 'Log içerisinde doğrulama kodu bulunamadı!' });
      return;
    }

    const providedHex = cleanText.substring(lastLineStart + hashLabel.length).trim();
    const contentToVerify = cleanText.substring(0, lastLineStart);

    try {
      const isValid = await verifyHMAC(contentToVerify, providedHex);
      if (isValid) {
        setVerifyResult({ success: true, message: 'DOĞRULANDI: Veri orijinal.' });
      } else {
        setVerifyResult({ success: false, message: 'HATA: Veri manipüle edilmiş! İmza geçersiz.' });
      }
    } catch (err) {
      console.error('verifyHMAC exception:', err);
      setVerifyResult({ success: false, message: `HATA: ${err instanceof Error ? err.message : String(err)}` });
    }
  }, [verifyText]);

  const handleGoogleSignIn = useCallback(async () => {
    await googleDriveService.signIn();
    const user = googleDriveService.getUser();
    if (user) {
      setGoogleUser(user);
      refreshBackupList();
    }
  }, [refreshBackupList]);

  const handleGoogleBackup = useCallback(async () => {
    if (!googleUser) { handleGoogleSignIn(); return; }
    setLoading(true);
    try {
      const success = await googleDriveService.uploadBackup(exportAllData());
      if (success) {
        setMessage({ type: 'success', text: 'Buluta yedeklendi!' });
        refreshBackupList();
      } else {
        setMessage({ type: 'error', text: 'Yedekleme başarısız.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bulut yedeği oluşturulurken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  }, [googleUser, handleGoogleSignIn, exportAllData, refreshBackupList]);

  const handleRestore = useCallback(async (file: DriveFile) => {
    if (!googleUser) return;
    const { value } = await Dialog.confirm({
      title: 'Yedekten Geri Yükle',
      message: `${new Date(file.createdTime).toLocaleString('tr-TR')} tarihli yedeği yüklemek istiyor musunuz? Mevcut verileriniz silinecektir.`,
      okButtonTitle: 'Evet, Yükle',
      cancelButtonTitle: 'Vazgeç'
    });
    if (!value) return;
    setLoading(true);
    try {
      const jsonData = await googleDriveService.downloadBackup(file.id);
      if (jsonData && await importData(jsonData)) {
        await Dialog.alert({ title: 'Başarılı', message: 'Veriler geri yüklendi.', buttonTitle: 'Tamam' });
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Veri içe aktarma başarısız.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Geri yükleme hatası.' });
    } finally {
      setLoading(false);
    }
  }, [googleUser, importData]);

  const handleDelete = useCallback(async (file: DriveFile) => {
    if (!googleUser) return;
    const { value } = await Dialog.confirm({
      title: 'Yedeği Sil',
      message: 'Bu yedek buluttan kalıcı olarak silinecek. Emin misiniz?',
      okButtonTitle: 'Sil',
      cancelButtonTitle: 'İptal'
    });
    if (!value) return;
    try {
      const success = await googleDriveService.deleteBackup(file.id);
      if (success) {
        setBackups(prev => prev.filter(b => b.id !== file.id));
        setMessage({ type: 'success', text: 'Yedek silindi.' });
      } else {
        setMessage({ type: 'error', text: 'Yedek silinemedi.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Silme hatası.' });
    }
  }, [googleUser]);

  const handleClear = useCallback(async () => {
    const { value } = await Dialog.confirm({
      title: 'Tüm Verileri Temizle',
      message: 'Dikkat! Tüm mesai kayıtlarınız ve ayarlarınız kalıcı olarak silinecek. Bu işlem geri alınamaz!',
      okButtonTitle: 'HER ŞEYİ SİL',
      cancelButtonTitle: 'VAZGEÇ'
    });
    if (value) {
      await clearAllData();
      await clearSalarySettings();
      window.location.reload();
    }
  }, [clearAllData, clearSalarySettings]);

  const handleShareAsTxt = useCallback(async () => {
    try {
      const data = exportAllData();
      const fileName = `MesaiTakip-Yedek-${today.toLocaleDateString('tr-TR')}.txt`;
      await shareFile(data, fileName, 'Mesai Takip Yedek (TXT)');
    } catch (err) {
      setMessage({ type: 'error', text: 'Paylaşım hatası.' });
    }
  }, [exportAllData, today]);

  const handleExportCsv = useCallback(async () => {
    try {
      const year = currentDate?.getFullYear() || today.getFullYear();
      const month = currentDate?.getMonth() ?? today.getMonth();
      const csv = generateCsvContent(year, month, monthlyData, settings, getHoliday);
      await saveBackupFile(csv, `Mesai-Rapor-${month + 1}.csv`);
      setMessage({ type: 'success', text: 'CSV Raporu oluşturuldu.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'CSV hatası.' });
    }
  }, [currentDate, today, monthlyData, settings, getHoliday]);

  const handleImportFromText = useCallback(async () => {
    if (!pasteText.trim()) return;
    try {
      if (await importData(pasteText)) {
        await Dialog.alert({ title: 'Başarılı', message: 'Yedek metinden yüklendi.', buttonTitle: 'Tamam' });
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Geçersiz veri.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'İçe aktarma hatası.' });
    }
  }, [pasteText, importData]);

  const handleImportFromFile = useCallback(async () => {
    try {
      const data = await pickAndReadBackupFile();
      if (!data) return;
      const success = await importData(data);
      if (success) {
        await Dialog.alert({ title: 'Başarılı', message: 'Yedek dosyadan yüklendi.', buttonTitle: 'Tamam' });
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Geçersiz dosya içeriği.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Dosya okuma hatası.' });
    }
  }, [importData]);

  const handlePickBackupFolder = useCallback(async () => {
    try {
      const result = await pickBackupFolderHandler();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    } catch (err) {
      console.error('Klasör seçme hatası:', err);
      setMessage({ type: 'error', text: 'Klasör seçilirken beklenmeyen bir hata oluştu.' });
    }
  }, [pickBackupFolderHandler]);

  const handleRemoveBackupFolder = useCallback(async () => {
    const { value } = await Dialog.confirm({
      title: 'Klasör Bağlantısını Kaldır',
      message: 'Seçili yedekleme klasörü kaydı kaldırılacak. Klasördeki dosyalar silinmeyecektir.',
      okButtonTitle: 'Kaldır',
      cancelButtonTitle: 'Vazgeç'
    });
    if (!value) return;
    try {
      await removeBackupFolder();
      setMessage({ type: 'success', text: 'Klasör bağlantısı kaldırıldı.' });
    } catch (err) {
      console.error('Klasör kaldırma hatası:', err);
      setMessage({ type: 'error', text: 'Klasör bağlantısı kaldırılırken hata oluştu.' });
    }
  }, [removeBackupFolder]);

  const handleBackupToFolder = useCallback(async () => {
    setLoading(true);
    try {
      const data = exportAllData();
      const result = await backupToFolderNow(data);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    } catch (err) {
      console.error('Klasöre yedekleme hatası:', err);
      setMessage({ type: 'error', text: 'Yedeklenirken beklenmeyen bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  }, [exportAllData, backupToFolderNow]);

  const handleRestoreFromFolder = useCallback(async (name: string) => {
    const { value } = await Dialog.confirm({
      title: 'Yedekten Geri Yükle',
      message: `"${name}" dosyasını yüklemek istiyor musunuz? Mevcut verileriniz bu yedekle değiştirilecektir.`,
      okButtonTitle: 'Evet, Yükle',
      cancelButtonTitle: 'Vazgeç'
    });
    if (!value) return;

    setLoading(true);
    try {
      const jsonData = await restoreFromFolderBackup(name);
      if (jsonData) {
        const success = await importData(jsonData);
        if (success) {
          await Dialog.alert({ title: 'Başarılı', message: 'Veriler klasördeki yedekten geri yüklendi.', buttonTitle: 'Tamam' });
          window.location.reload();
        } else {
          setMessage({ type: 'error', text: 'Geçersiz yedek dosyası içeriği.' });
        }
      } else {
        setMessage({ type: 'error', text: 'Yedek dosyası okunamadı.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Geri yükleme sırasında hata oluştu.' });
    } finally {
      setLoading(false);
    }
  }, [restoreFromFolderBackup, importData]);

  const handleDeleteFolderBackupFile = useCallback(async (name: string) => {
    const { value } = await Dialog.confirm({
      title: 'Yedeği Sil',
      message: `"${name}" dosyası klasörden kalıcı olarak silinecek. Emin misiniz?`,
      okButtonTitle: 'Sil',
      cancelButtonTitle: 'İptal'
    });
    if (!value) return;

    try {
      const ok = await deleteFolderBackupHandler(name);
      setMessage({ type: ok ? 'success' : 'error', text: ok ? 'Yedek silindi.' : 'Yedek silinemedi.' });
    } catch (err) {
      console.error('Yedek silme hatası:', err);
      setMessage({ type: 'error', text: 'Yedek silinirken beklenmeyen bir hata oluştu.' });
    }
  }, [deleteFolderBackupHandler]);

  const handleAddCustomHoliday = useCallback(async () => {
    if (!newHolidayDate || !newHolidayName.trim() || !newHolidayShortName.trim()) {
      setMessage({ type: 'error', text: 'Lütfen tarih, tatil adı ve kısa ad alanlarını doldurun.' });
      return;
    }

    const holidayPayload: Holiday = {
      date: newHolidayDate,
      name: newHolidayName.trim(),
      shortName: newHolidayShortName.trim(),
      type: newHolidayType,
      isHalfDay: newHolidayHalfDay,
      recurring: newHolidayRecurring,
    };

    const result = editingHolidayDate
      ? await updateCustomHoliday(editingHolidayDate, holidayPayload)
      : await addCustomHoliday(holidayPayload);

    setMessage({ type: result.success ? 'success' : 'error', text: result.message });

    if (result.success) {
      setNewHolidayDate('');
      setNewHolidayName('');
      setNewHolidayShortName('');
      setNewHolidayHalfDay(false);
      setNewHolidayRecurring(false);
      setEditingHolidayDate(null);
    }
  }, [newHolidayDate, newHolidayName, newHolidayShortName, newHolidayType, newHolidayHalfDay, newHolidayRecurring, editingHolidayDate, addCustomHoliday, updateCustomHoliday]);

  const handleStartEditCustomHoliday = useCallback((h: Holiday) => {
    setEditingHolidayDate(h.date);
    setNewHolidayDate(h.date);
    setNewHolidayName(h.name);
    setNewHolidayShortName(h.shortName);
    setNewHolidayType(h.type);
    setNewHolidayHalfDay(!!h.isHalfDay);
    setNewHolidayRecurring(!!h.recurring);
  }, []);

  const handleCancelEditCustomHoliday = useCallback(() => {
    setEditingHolidayDate(null);
    setNewHolidayDate('');
    setNewHolidayName('');
    setNewHolidayShortName('');
    setNewHolidayHalfDay(false);
    setNewHolidayRecurring(false);
  }, []);

  const handleRemoveCustomHoliday = useCallback(async (date: string, name: string) => {
    const { value } = await Dialog.confirm({
      title: 'Özel Günü Sil',
      message: `"${name}" özel gününü silmek istediğinize emin misiniz?`,
      okButtonTitle: 'Sil',
      cancelButtonTitle: 'İptal'
    });
    if (!value) return;

    await removeCustomHoliday(date);
    setMessage({ type: 'success', text: 'Özel gün silindi.' });
  }, [removeCustomHoliday]);

  return {
    isWeb, today,
    activeTab, setActiveTab,
    message, setMessage, loading,
    googleUser, setGoogleUser,
    backups,
    showPasteArea, setShowPasteArea,
    pasteText, setPasteText,
    showVerifyArea, setShowVerifyArea,
    verifyText, setVerifyText,
    verifyResult, setVerifyResult,
    settings, updateSettings,
    exportAllData,
    handleVerifyLog,
    handleGoogleSignIn,
    handleGoogleBackup,
    handleRestore,
    handleDelete,
    handleClear,
    handleShareAsTxt,
    handleExportCsv,
    handleImportFromText,
    handleImportFromFile,
    // Yerel klasöre yedekleme (otomatik yedeklemenin artık dayandığı mekanizma)
    folderBackupSupported,
    backupFolderName,
    folderBackups,
    folderBackupsRefreshing,
    handlePickBackupFolder,
    handleRemoveBackupFolder,
    handleBackupToFolder,
    handleRestoreFromFolder,
    handleDeleteFolderBackupFile,
    // Tatiller (VERİ YÖNETİMİ > Tatiller sekmesi)
    diniLoading, diniError, diniLastUpdated, refreshDini,
    resmiLoading, resmiError, resmiLastUpdated, refreshResmi,
    customHolidays,
    newHolidayDate, setNewHolidayDate,
    newHolidayName, setNewHolidayName,
    newHolidayShortName, setNewHolidayShortName,
    newHolidayType, setNewHolidayType,
    newHolidayHalfDay, setNewHolidayHalfDay,
    newHolidayRecurring, setNewHolidayRecurring,
    editingHolidayDate,
    handleAddCustomHoliday,
    handleStartEditCustomHoliday,
    handleCancelEditCustomHoliday,
    handleRemoveCustomHoliday,
    formatTurkishDate,
    parseDate,
  };
}

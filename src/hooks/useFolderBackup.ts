import { useState, useEffect, useCallback } from 'react';
import {
  isFolderBackupSupported,
  pickBackupFolder,
  getSavedFolderName,
  clearBackupFolder,
  backupNowToFolder,
  listFolderBackups,
  readFolderBackup,
  deleteFolderBackup,
  FolderBackupFile,
} from '../utils/folderBackupUtils';

interface UseFolderBackupReturn {
  supported: boolean;
  folderName: string | null;
  loading: boolean;
  backups: FolderBackupFile[];
  refreshing: boolean;
  pickFolder: () => Promise<{ success: boolean; message: string }>;
  removeFolder: () => Promise<void>;
  backupNow: (jsonData: string) => Promise<{ success: boolean; message: string }>;
  refreshList: () => Promise<void>;
  restoreBackup: (name: string) => Promise<string | null>;
  deleteBackup: (name: string) => Promise<boolean>;
}

/**
 * Veri Yönetimi > Dosya bölümündeki "Klasöre Yedekle" özelliğini yönetir.
 * Google Drive'ın aksine internet/hesap gerektirmez; kullanıcının seçtiği
 * yerel/SD kart/bulut-senkron (ör. cihazdaki Drive klasörü) bir klasöre yazar.
 */
export const useFolderBackup = (): UseFolderBackupReturn => {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<FolderBackupFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const supported = isFolderBackupSupported();

  const refreshList = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await listFolderBackups();
      setBackups(list);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const name = await getSavedFolderName();
        setFolderName(name);
        if (name) await refreshList();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshList]);

  const pickFolder = useCallback(async () => {
    const result = await pickBackupFolder();
    if (result.success && result.folderName) {
      setFolderName(result.folderName);
      await refreshList();
    }
    return { success: result.success, message: result.message };
  }, [refreshList]);

  const removeFolder = useCallback(async () => {
    await clearBackupFolder();
    setFolderName(null);
    setBackups([]);
  }, []);

  const backupNow = useCallback(async (jsonData: string) => {
    const result = await backupNowToFolder(jsonData);
    if (result.success) await refreshList();
    return result;
  }, [refreshList]);

  const restoreBackup = useCallback(async (name: string) => {
    return readFolderBackup(name);
  }, []);

  const deleteBackup = useCallback(async (name: string) => {
    const ok = await deleteFolderBackup(name);
    if (ok) await refreshList();
    return ok;
  }, [refreshList]);

  return {
    supported,
    folderName,
    loading,
    backups,
    refreshing,
    pickFolder,
    removeFolder,
    backupNow,
    refreshList,
    restoreBackup,
    deleteBackup,
  };
};

/**
 *  Yerel Klasöre Yedekleme Servisi
 *  Android / iOS : Storage Access Framework (kullanıcı bir klasör seçer, kalıcı izinle o klasöre yazılır)
 *  Web (Desktop) : File System Access API (showDirectoryPicker) — sadece Chrome/Edge masaüstünde desteklenir
 *
 *  Google Drive'dan farkı: internet ve Google hesabı gerektirmez, OAuth/refresh token derdi yoktur.
 *  Telefon değişikliği veya internet sorunlarında bile yedek dosyasına erişilebilir.
 */

import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { SafBackup } from './safBackupPlugin';
import { storage } from './storageUtils';

const IS_NATIVE = Capacitor.isNativePlatform();

const FOLDER_PATH_KEY = 'local_backup_folder_path'; // Native: SAF klasör yolu
const FOLDER_NAME_KEY = 'local_backup_folder_name'; // Her iki platformda da gösterim için

// ─── Web: FileSystemDirectoryHandle'ı IndexedDB'de sakla ──────────────────────
// Handle nesneleri JSON'a çevrilemez, bu yüzden Preferences/localStorage'a değil
// IndexedDB'ye (structured clone destekler) kaydediyoruz.
const IDB_NAME = 'mesai-folder-backup';
const IDB_STORE = 'handles';
const IDB_KEY = 'backup-dir-handle';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getWebDirHandle(): Promise<any | null> {
  try {
    const handle = await idbGet<any>(IDB_KEY);
    return handle ?? null;
  } catch {
    return null;
  }
}

// ─── Ortak yardımcılar ──────────────────────────────────────────────────────

function generateBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  return `backup_${timestamp}.json`;
}

export interface FolderBackupFile {
  name: string;
  date: Date;
}

// ─── Destek kontrolü ────────────────────────────────────────────────────────
export function isFolderBackupSupported(): boolean {
  if (IS_NATIVE) return true; // Android & iOS: SAF her zaman mevcut
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// ─── Klasör seçimi ──────────────────────────────────────────────────────────
export async function pickBackupFolder(): Promise<{ success: boolean; message: string; folderName?: string }> {
  if (IS_NATIVE) {
    try {
      const result = await FilePicker.pickDirectory();
      if (!result?.path) {
        return { success: false, message: 'Klasör seçilmedi.' };
      }

      const decodedPath = decodeURIComponent(result.path);
      const segments = decodedPath.split(/[/:]+/).filter(Boolean);
      const folderName = segments[segments.length - 1] || decodedPath;

      // SAF izninin uygulama yeniden başlatıldığında/telefon rebootunda
      // kaybolmamasını garanti altına al.
      try {
        await SafBackup.persistPermission({ treeUri: result.path });
      } catch {
        // FilePicker zaten kalıcı izin veriyor olabilir; kritik değil.
      }

      await storage.set(FOLDER_PATH_KEY, result.path);
      await storage.set(FOLDER_NAME_KEY, folderName);

      return { success: true, message: `"${folderName}" klasörü seçildi.`, folderName };
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('cancel') || msg.includes('Cancel')) {
        return { success: false, message: 'Klasör seçimi iptal edildi.' };
      }
      return { success: false, message: 'Klasör seçilirken bir hata oluştu.' };
    }
  }

  if (!isFolderBackupSupported()) {
    return { success: false, message: 'Bu tarayıcı klasör seçimini desteklemiyor. Lütfen Chrome veya Edge (masaüstü) kullanın.' };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    await idbSet(IDB_KEY, handle);
    await storage.set(FOLDER_NAME_KEY, handle.name);
    return { success: true, message: `"${handle.name}" klasörü seçildi.`, folderName: handle.name };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { success: false, message: 'Klasör seçimi iptal edildi.' };
    }
    return { success: false, message: 'Klasör seçilirken bir hata oluştu.' };
  }
}

export async function getSavedFolderName(): Promise<string | null> {
  return storage.get(FOLDER_NAME_KEY);
}

export async function clearBackupFolder(): Promise<void> {
  await storage.remove(FOLDER_PATH_KEY);
  await storage.remove(FOLDER_NAME_KEY);
  if (!IS_NATIVE) {
    try { await idbDelete(IDB_KEY); } catch { /* yoksay */ }
  }
}

// ─── Yedekleme ───────────────────────────────────────────────────────────────
export async function backupNowToFolder(jsonData: string): Promise<{ success: boolean; message: string }> {
  const filename = generateBackupFilename();

  if (IS_NATIVE) {
    const folderPath = await storage.get(FOLDER_PATH_KEY);
    if (!folderPath) {
      return { success: false, message: 'Önce bir yedekleme klasörü seçmelisiniz.' };
    }
    try {
      // ÖNEMLİ: @capacitor/filesystem'in writeFile'ı content:// SAF tree
      // URI'lerine YAZAMAZ (Capacitor'ın kendi dokümantasyonu bile content://
      // URI'leri sadece OKUMA için desteklediğini söylüyor). Bu yüzden burada
      // DocumentFile tabanlı native SafBackup eklentisini kullanıyoruz —
      // gerçek SAF alt-belge oluşturma işlemini bu yapıyor.
      await SafBackup.writeFile({
        treeUri: folderPath,
        fileName: filename,
        data: jsonData,
        mimeType: 'application/json',
      });
      return { success: true, message: 'Seçtiğiniz klasöre yedeklendi.' };
    } catch (e) {
      console.error('Klasöre yedekleme hatası:', e);
      return { success: false, message: 'Yedeklenirken hata oluştu. Klasör silinmiş/taşınmış olabilir, lütfen tekrar seçin.' };
    }
  }

  const handle = await getWebDirHandle();
  if (!handle) {
    return { success: false, message: 'Önce bir yedekleme klasörü seçmelisiniz.' };
  }

  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        return { success: false, message: 'Klasöre yazma izni verilmedi.' };
      }
    }

    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(jsonData);
    await writable.close();
    return { success: true, message: 'Seçtiğiniz klasöre yedeklendi.' };
  } catch (e) {
    console.error('Klasöre yedekleme hatası:', e);
    return { success: false, message: 'Yedeklenirken hata oluştu. Klasör silinmiş/taşınmış olabilir, lütfen tekrar seçin.' };
  }
}

// ─── Listeleme ──────────────────────────────────────────────────────────────
export async function listFolderBackups(): Promise<FolderBackupFile[]> {
  if (IS_NATIVE) {
    const folderPath = await storage.get(FOLDER_PATH_KEY);
    if (!folderPath) return [];
    try {
      const { files } = await SafBackup.listFiles({ treeUri: folderPath });
      return files
        .filter(f => f.name.startsWith('backup_') && f.name.endsWith('.json'))
        .map(f => ({ name: f.name, date: new Date(f.lastModified) }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (e) {
      console.error('Klasör listeleme hatası:', e);
      return [];
    }
  }

  const handle = await getWebDirHandle();
  if (!handle) return [];

  try {
    const results: FolderBackupFile[] = [];
    for await (const [name, entryHandle] of handle.entries()) {
      if (entryHandle.kind !== 'file') continue;
      if (!name.startsWith('backup_') || !name.endsWith('.json')) continue;
      const file = await entryHandle.getFile();
      results.push({ name, date: new Date(file.lastModified) });
    }
    return results.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (e) {
    console.error('Klasör listeleme hatası:', e);
    return [];
  }
}

// ─── Okuma (geri yükleme için) ────────────────────────────────────────────────
export async function readFolderBackup(name: string): Promise<string | null> {
  if (IS_NATIVE) {
    const folderPath = await storage.get(FOLDER_PATH_KEY);
    if (!folderPath) return null;
    try {
      const result = await SafBackup.readFile({ treeUri: folderPath, fileName: name });
      return result.data;
    } catch (e) {
      console.error('Klasörden okuma hatası:', e);
      return null;
    }
  }

  const handle = await getWebDirHandle();
  if (!handle) return null;

  try {
    const fileHandle = await handle.getFileHandle(name);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (e) {
    console.error('Klasörden okuma hatası:', e);
    return null;
  }
}

// ─── Silme ──────────────────────────────────────────────────────────────────
export async function deleteFolderBackup(name: string): Promise<boolean> {
  if (IS_NATIVE) {
    const folderPath = await storage.get(FOLDER_PATH_KEY);
    if (!folderPath) return false;
    try {
      const result = await SafBackup.deleteFile({ treeUri: folderPath, fileName: name });
      return result.success;
    } catch (e) {
      console.error('Klasörden silme hatası:', e);
      return false;
    }
  }

  const handle = await getWebDirHandle();
  if (!handle) return false;

  try {
    await handle.removeEntry(name);
    return true;
  } catch (e) {
    console.error('Klasörden silme hatası:', e);
    return false;
  }
}

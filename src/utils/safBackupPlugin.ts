import { registerPlugin } from '@capacitor/core';

/**
 * safBackupPlugin.ts — SafBackupPlugin.kt (native-plugin/ klasöründe) için
 * ince bir TS köprüsü. Android'de SAF (Storage Access Framework) tree
 * URI'sine gerçek dosya yazma/okuma/listeleme/silme burada yapılır.
 *
 * @capacitor/filesystem YERİNE bu kullanılır çünkü Filesystem eklentisi
 * content:// tree URI'lerine yazmayı desteklemiyor (sadece okumayı
 * destekliyor) — bkz. folderBackupUtils.ts'teki açıklama.
 */

export interface SafBackupFile {
  name: string;
  lastModified: number;
  size: number;
}

export interface SafBackupPlugin {
  /** Klasör seçildiğinde bir kez çağrılır, izni kalıcı hale getirir. */
  persistPermission(options: { treeUri: string }): Promise<void>;
  /** jsonData'yı seçili klasöre fileName adıyla yazar (varsa üzerine yazar). */
  writeFile(options: {
    treeUri: string;
    fileName: string;
    data: string;
    mimeType?: string;
  }): Promise<{ uri: string }>;
  /** Klasördeki dosyaları listeler. */
  listFiles(options: { treeUri: string }): Promise<{ files: SafBackupFile[] }>;
  /** Klasördeki belirli bir dosyayı okur. */
  readFile(options: { treeUri: string; fileName: string }): Promise<{ data: string }>;
  /** Klasördeki belirli bir dosyayı siler. */
  deleteFile(options: { treeUri: string; fileName: string }): Promise<{ success: boolean }>;
}

export const SafBackup = registerPlugin<SafBackupPlugin>('SafBackup');

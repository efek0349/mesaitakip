import { registerPlugin } from '@capacitor/core';

// AutoBackupScheduler — native köprü (bkz. android/.../backup/NativeBackupWorker.kt).
//
// "Otomatik Yedekleme" daha önce sadece uygulama AÇIKKEN çalışan bir JS
// efektiydi (useAutoBackup.ts) — kullanıcı haftalarca uygulamayı hiç
// açmazsa (özellikle widget'tan mesai eklemeye devam ederken) yedek hiç
// alınmıyordu. Bu köprü, WorkManager tabanlı native bir periyodik göreve
// bağlanıyor: uygulama kapalıyken de çalışır, hem widget kuyruğunu kalıcı
// veriye işler hem de seçilen klasöre yedek yazar.
//
// useAutoBackup.ts (JS tarafındaki efekt) KALDIRILMADI — uygulama açıkken
// daha hızlı/anlık bir "yakalama" katmanı olarak yine çalışmaya devam
// ediyor; bu native görev ise asıl garantiyi (uygulama kapalıyken de
// çalışması) sağlıyor. İkisi aynı `lastBackupDate` alanını paylaştığı için
// birbirini gereksiz yere tekrarlamazlar.
export interface AutoBackupSchedulerPlugin {
  configure(options: { enabled: boolean; period: string }): Promise<void>;
}

export const AutoBackupScheduler = registerPlugin<AutoBackupSchedulerPlugin>('AutoBackupScheduler');

export async function syncNativeBackupScheduler(settings: {
  autoBackupEnabled?: boolean;
  autoBackupPeriod?: 'daily' | 'weekly' | 'monthly';
}): Promise<void> {
  try {
    const enabled = settings.autoBackupEnabled === true;
    const period = settings.autoBackupPeriod ?? 'weekly';
    await AutoBackupScheduler.configure({ enabled, period });
  } catch (e) {
    // Web önizlemesinde veya plugin bulunamadığında sessizce geç.
  }
}

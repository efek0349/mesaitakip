import { registerPlugin } from '@capacitor/core';

// SalaryReminder — native köprü (bkz. android/.../plugins/SalaryReminderPlugin.kt).
//
// Ayın belirlenen gününde, belirlenen saatte tek seferlik bir bildirim
// göstermek için AlarmManager ile native tarafta tam zamanlı ("exact")
// bir alarm kuruluyor. Alarm tetiklendiğinde native taraf hem bildirimi
// gösteriyor hem de bir sonraki ayın alarmını otomatik olarak yeniden
// kuruyor (bkz. SalaryReminderReceiver.kt) — JS'in her ay tekrar
// configure() çağırmasına gerek yok, sadece ayar DEĞİŞTİĞİNDE (gün/saat/
// açık-kapalı) çağırmak yeterli.
export interface SalaryReminderPlugin {
  configure(options: {
    enabled: boolean;
    day: number;   // 1-31
    hour: number;  // 0-23
    minute: number; // 0-59
  }): Promise<{ scheduled: boolean; nextTrigger?: string }>;
}

export const SalaryReminder = registerPlugin<SalaryReminderPlugin>('SalaryReminder');

/**
 * Ayarlardaki (salaryReminderEnabled/Day/Time) değerleri native tarafa
 * senkronize eder. Web'de (Capacitor native platformu yokken) plugin
 * çağrısı başarısız olabileceğinden sessizce yutuyoruz — sadece
 * cihazda/APK'da anlamlı bir işlem.
 */
export async function syncSalaryReminder(settings: {
  salaryReminderEnabled?: boolean;
  salaryReminderDay?: number;
  salaryReminderTime?: string;
}): Promise<void> {
  try {
    const enabled = settings.salaryReminderEnabled === true;
    const day = Math.min(31, Math.max(1, settings.salaryReminderDay ?? 1));
    const [hourRaw, minuteRaw] = (settings.salaryReminderTime ?? '09:00').split(':');
    const hour = Math.min(23, Math.max(0, parseInt(hourRaw, 10) || 0));
    const minute = Math.min(59, Math.max(0, parseInt(minuteRaw, 10) || 0));

    await SalaryReminder.configure({ enabled, day, hour, minute });
  } catch (e) {
    // Web önizlemesinde veya plugin bulunamadığında sessizce geç.
  }
}

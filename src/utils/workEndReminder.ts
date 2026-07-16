import { registerPlugin } from '@capacitor/core';

// WorkEndReminder — native köprü (bkz. android/.../plugins/WorkEndReminderPlugin.kt).
//
// Maaş günü hatırlatıcısından FARKLI olarak burada JS sadece "açık/kapalı"
// ve "kaç dakika önce" bilgisini gönderiyor — hangi günün hangi vardiya
// olduğunu ve o vardiyanın bitiş saatini native taraf KENDİSİ hesaplıyor
// (bkz. ShiftCalculator.kt, dateUtils.ts'teki getShiftType/getEffectiveShiftTimes
// ile birebir aynı mantığın Kotlin karşılığı). Böylece her gün/hafta
// vardiya değiştiğinde JS'in tekrar tekrar çağrılmasına gerek kalmadan,
// native taraf her tetiklenişte "bugünkü" doğru bitiş saatini okuyup bir
// sonraki günü kendi kendine planlıyor.
export interface WorkEndReminderPlugin {
  configure(options: {
    enabled: boolean;
    minutesBefore: number;
  }): Promise<{ scheduled: boolean; nextTrigger?: string }>;
}

export const WorkEndReminder = registerPlugin<WorkEndReminderPlugin>('WorkEndReminder');

export async function syncWorkEndReminder(settings: {
  workEndReminderEnabled?: boolean;
  workEndReminderMinutesBefore?: number;
}): Promise<void> {
  try {
    const enabled = settings.workEndReminderEnabled === true;
    const minutesBefore = Math.min(60, Math.max(1, settings.workEndReminderMinutesBefore ?? 5));
    await WorkEndReminder.configure({ enabled, minutesBefore });
  } catch (e) {
    // Web önizlemesinde veya plugin bulunamadığında sessizce geç.
  }
}

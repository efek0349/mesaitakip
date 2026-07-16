import { registerPlugin } from '@capacitor/core';

// ReminderExclusions — native köprü (bkz. android/.../plugins/ReminderExclusionsPlugin.kt).
//
// Mesai Bitiş Hatırlatıcısı, hangi günlerin "çalışma günü" olduğunu haftanın
// günü + vardiya döngüsüne bakarak hesaplıyor (bkz. ShiftCalculator.kt) —
// ama resmi/dini tatilleri ve kullanıcının Takvim'de "izin" olarak
// işaretlediği günleri BİLMİYOR, çünkü o veriler (online tatil listeleri,
// kullanıcının özel tatilleri, izin kayıtları) tamamen JS tarafında.
//
// Bu yüzden JS, önümüzdeki ~45 gün için "bu tarihlerde hatırlatma
// gösterme" listesini hesaplayıp native tarafa gönderiyor. Native taraf
// bu listeyi düz bir SharedPreferences kaydı olarak tutuyor ve her alarm
// hesaplamasında basitçe "bu tarih listede mi?" diye kontrol ediyor —
// tatil/izin mantığının kendisini native'e taşımaya gerek kalmıyor.
export interface ReminderExclusionsPlugin {
  configure(options: { dates: string[] }): Promise<void>;
}

export const ReminderExclusions = registerPlugin<ReminderExclusionsPlugin>('ReminderExclusions');

export async function syncReminderExclusions(dates: string[]): Promise<void> {
  try {
    // Yinelenenleri temizle — native tarafta gereksiz büyümesin.
    const unique = Array.from(new Set(dates));
    await ReminderExclusions.configure({ dates: unique });
  } catch (e) {
    // Web önizlemesinde veya plugin bulunamadığında sessizce geç.
  }
}

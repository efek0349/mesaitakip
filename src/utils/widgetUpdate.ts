import { registerPlugin } from '@capacitor/core';

// WidgetUpdate — native köprü (bkz. android/.../plugins/WidgetUpdatePlugin.kt).
//
// "Bu Ay" özeti (saat/net mesai/net maaş) artık BURADAN JS ile
// HESAPLANMIYOR — MesaiWidgetProvider.kt kendi içinde, native olarak
// (bkz. MonthlyStatsCalculator.kt) hesaplayıp widget'a yazıyor. Önceki
// tasarımda JS hesaplayıp updateSummary() ile native'e "hazır metin"
// gönderiyordu (ve bunun için görünmez bir WebView penceresi açılması
// gerekiyordu) — bazı cihazlarda/launcher'larda bu pencere açılışı
// bastırılamayan bir görev-geçiş flaşına sebep oluyordu. Artık JS'in
// TEK işi: veri değiştiğinde (yeni kayıt, tema değişimi vb.) widget'a
// "kendini yeniden çiz" demek — refresh().
export interface WidgetUpdatePlugin {
  refresh(): Promise<{ updated: number }>;
}

export const WidgetUpdate = registerPlugin<WidgetUpdatePlugin>('WidgetUpdate');

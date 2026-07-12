import { registerPlugin } from '@capacitor/core';

// WidgetUpdate — native köprü (bkz. android/.../plugins/WidgetUpdatePlugin.kt).
// Tek bir yerden registerPlugin edilip hem useTheme.ts (tema değişince "Mesai
// Ekle" widget'ını yeniden çizdirmek için refresh()) hem useWidgetSummarySync.ts
// (bu ayki toplam saat/tutarı "özet" widget'ına yazmak için updateSummary())
// tarafından paylaşılıyor — aynı plugin için iki farklı yerde registerPlugin
// çağrısı olmasın diye.
export interface WidgetUpdatePlugin {
  refresh(): Promise<{ updated: number }>;
  updateSummary(options: { hoursText: string; amountText: string; overtimeAmountText: string }): Promise<{ updated: number }>;
}

export const WidgetUpdate = registerPlugin<WidgetUpdatePlugin>('WidgetUpdate');

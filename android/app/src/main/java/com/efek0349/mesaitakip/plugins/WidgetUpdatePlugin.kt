package com.efek0349.mesaitakip.plugins

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import com.efek0349.mesaitakip.widget.MesaiWidgetProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * WidgetUpdatePlugin
 *
 * Sorun: Ana ekrandaki "Mesai Ekle" widget'ı (MesaiWidgetProvider), tema
 * (win95Enabled) gibi görünümü etkileyen ayarları SADECE kendi
 * onUpdate/onReceive döngüsü çalıştığında SharedPreferences'tan okuyor.
 * Kullanıcı uygulama İÇİNDEYKEN tema değiştirdiğinde ya da bir mesai kaydı
 * eklediğinde/düzenlediğinde bu döngü kendiliğinden tetiklenmiyor.
 *
 * Çözüm: JS tarafı (useTheme.ts tema değişince, useOvertimeData.ts veri
 * değişince) refresh()'i çağırıyor; biz de standart ACTION_APPWIDGET_UPDATE
 * broadcast'ini elle gönderip widget'ı hemen yeniden çizdiriyoruz —
 * MesaiWidgetProvider.onUpdate() da bu sırada "Bu Ay" özetini native olarak
 * (bkz. MonthlyStatsCalculator) yeniden hesaplayıp güncelliyor.
 *
 * NOT: "Bu Ay" özetinin kendisi artık BURADAN JS'ten metin olarak
 * ALINMIYOR — MesaiWidgetProvider kendi içinde native hesaplıyor (bkz. o
 * dosyadaki MonthlyStatsCalculator kullanımı). Bu plugin'in tek işi:
 * widget'a "kendini yeniden çiz" demek.
 */
@CapacitorPlugin(name = "WidgetUpdate")
class WidgetUpdatePlugin : Plugin() {

    @PluginMethod
    fun refresh(call: PluginCall) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, MesaiWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        if (appWidgetIds.isNotEmpty()) {
            val updateIntent = Intent(context, MesaiWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
            }
            context.sendBroadcast(updateIntent)
        }

        val result = JSObject()
        result.put("updated", appWidgetIds.size)
        call.resolve(result)
    }
}

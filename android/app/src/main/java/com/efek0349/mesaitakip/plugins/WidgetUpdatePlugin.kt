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
 * Sorun: Ana ekrandaki "Mesai Ekle" widget'ı (MesaiWidgetProvider), win95Enabled
 * gibi görünümü etkileyen ayarları SADECE kendi onUpdate/onReceive döngüsü
 * çalıştığında SharedPreferences'tan ("CapacitorStorage") okuyor. Kullanıcı
 * uygulama İÇİNDEYKEN temayı değiştirdiğinde bu döngü kendiliğinden tetiklenmiyor
 * — widget eski temayla kalıyor, ta ki widget kaldırılıp tekrar eklenene ya da
 * sistem onu bir sonraki periyodik güncellemede yeniden çizene kadar.
 *
 * Çözüm: JS tarafı (useTheme.ts) tema değiştiğinde bu eklentinin refresh()
 * metodunu çağırıyor; biz de standart ACTION_APPWIDGET_UPDATE broadcast'ini
 * elle gönderip MesaiWidgetProvider.onUpdate()'i hemen tetikliyoruz — widget
 * güncel SharedPreferences değeriyle anında yeniden çiziliyor.
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

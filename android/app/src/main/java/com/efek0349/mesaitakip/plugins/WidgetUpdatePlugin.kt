package com.efek0349.mesaitakip.plugins

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
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
 * Sorun: Ana ekrandaki "Mesai Ekle" widget'ı (MesaiWidgetProvider), hem
 * win95Enabled gibi görünümü etkileyen ayarları hem de "Bu Ay" özet
 * satırını SADECE kendi onUpdate/onReceive döngüsü çalıştığında
 * SharedPreferences'tan okuyor. Kullanıcı uygulama İÇİNDEYKEN tema
 * değiştirdiğinde ya da aylık toplam güncellendiğinde bu döngü
 * kendiliğinden tetiklenmiyor.
 *
 * Çözüm: JS tarafı (useTheme.ts, useWidgetSummarySync.ts) ilgili veri
 * değiştiğinde bu eklentiyi çağırıyor; biz de standart
 * ACTION_APPWIDGET_UPDATE broadcast'ini elle gönderip widget'ı hemen
 * yeniden çizdiriyoruz.
 *
 * NOT: "Bu Ay" özeti eskiden AYRI bir widget'ta (MesaiSummaryWidgetProvider)
 * gösteriliyordu; kullanıcı isteğiyle artık "Mesai Ekle" widget'ının alt
 * satırına taşındı — bu yüzden updateSummary() de artık SADECE
 * MesaiWidgetProvider'ı hedefliyor, ayrı bir widget provider'ı yok.
 */
@CapacitorPlugin(name = "WidgetUpdate")
class WidgetUpdatePlugin : Plugin() {

    @PluginMethod
    fun refresh(call: PluginCall) {
        val updated = refreshAddWidget()
        val result = JSObject()
        result.put("updated", updated)
        call.resolve(result)
    }

    @PluginMethod
    fun updateSummary(call: PluginCall) {
        val hoursText = call.getString("hoursText") ?: ""
        val amountText = call.getString("amountText") ?: ""
        val overtimeAmountText = call.getString("overtimeAmountText") ?: ""

        context.getSharedPreferences("MesaiSummaryWidgetState", Context.MODE_PRIVATE)
            .edit()
            .putString("hoursText", hoursText)
            .putString("amountText", amountText)
            .putString("overtimeAmountText", overtimeAmountText)
            .apply()

        val updated = refreshAddWidget()
        val result = JSObject()
        result.put("updated", updated)
        call.resolve(result)
    }

    private fun refreshAddWidget(): Int {
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
        return appWidgetIds.size
    }
}

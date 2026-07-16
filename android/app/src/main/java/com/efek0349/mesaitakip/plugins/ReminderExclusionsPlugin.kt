package com.efek0349.mesaitakip.plugins

import com.efek0349.mesaitakip.reminders.ReminderExclusionsStore
import com.efek0349.mesaitakip.reminders.WorkEndReminderScheduler
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.Plugin
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "ReminderExclusions")
class ReminderExclusionsPlugin : Plugin() {

    @PluginMethod
    fun configure(call: PluginCall) {
        val datesArray = call.getArray("dates")
        val dates = mutableListOf<String>()
        if (datesArray != null) {
            for (i in 0 until datesArray.length()) {
                datesArray.optString(i)?.let { if (it.isNotEmpty()) dates.add(it) }
            }
        }
        ReminderExclusionsStore.save(context, dates)

        // Liste değiştiği an, hâlâ geçerli olan bir alarm varsa (örn. daha
        // önce hesaplanan tetiklenme günü artık tatil/izin oldu) yeniden
        // hesaplayıp güncelliyoruz.
        WorkEndReminderScheduler.scheduleFromPrefs(context)

        call.resolve()
    }
}

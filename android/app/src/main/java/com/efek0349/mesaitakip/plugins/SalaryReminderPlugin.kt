package com.efek0349.mesaitakip.plugins

import com.efek0349.mesaitakip.reminders.SalaryReminderScheduler
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * SalaryReminderPlugin
 *
 * JS tarafı (bkz. src/utils/salaryReminder.ts), ayarlar her kaydedildiğinde
 * ve uygulama her açıldığında configure()'ı çağırıyor. Biz burada sadece
 * ayarları kaydedip AlarmManager'a devrediyoruz — asıl zamanlama mantığı
 * SalaryReminderScheduler'da.
 */
@CapacitorPlugin(name = "SalaryReminder")
class SalaryReminderPlugin : Plugin() {

    @PluginMethod
    fun configure(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        val day = (call.getInt("day", 1) ?: 1).coerceIn(1, 31)
        val hour = (call.getInt("hour", 9) ?: 9).coerceIn(0, 23)
        val minute = (call.getInt("minute", 0) ?: 0).coerceIn(0, 59)
        val skipWeekend = call.getBoolean("skipWeekend", true) ?: true

        val triggerAt = SalaryReminderScheduler.apply(context, enabled, day, hour, minute, skipWeekend)

        val result = JSObject()
        result.put("scheduled", triggerAt != null)
        if (triggerAt != null) {
            val formatted = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date(triggerAt))
            result.put("nextTrigger", formatted)
        }
        call.resolve(result)
    }
}

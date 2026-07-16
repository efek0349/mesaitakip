package com.efek0349.mesaitakip.plugins

import com.efek0349.mesaitakip.reminders.WorkEndReminderScheduler
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@CapacitorPlugin(name = "WorkEndReminder")
class WorkEndReminderPlugin : Plugin() {

    @PluginMethod
    fun configure(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        val minutesBefore = (call.getInt("minutesBefore", 5) ?: 5).coerceIn(1, 60)

        val triggerAt = WorkEndReminderScheduler.apply(context, enabled, minutesBefore)

        val result = JSObject()
        result.put("scheduled", triggerAt != null)
        if (triggerAt != null) {
            val formatted = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date(triggerAt))
            result.put("nextTrigger", formatted)
        }
        call.resolve(result)
    }
}

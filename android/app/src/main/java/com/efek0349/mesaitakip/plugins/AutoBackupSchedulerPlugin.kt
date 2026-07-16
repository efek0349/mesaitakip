package com.efek0349.mesaitakip.plugins

import com.efek0349.mesaitakip.backup.NativeBackupScheduler
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.Plugin
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AutoBackupScheduler")
class AutoBackupSchedulerPlugin : Plugin() {

    @PluginMethod
    fun configure(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        val period = call.getString("period", "weekly") ?: "weekly"
        NativeBackupScheduler.apply(context, enabled, period)
        call.resolve()
    }
}

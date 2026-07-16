package com.efek0349.mesaitakip.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Android'de "exact" alarm'lar cihaz yeniden başladığında (reboot) siliniyor.
 * Kullanıcı maaş günü hatırlatıcısını açık bıraktıysa, cihaz açıldığında
 * kayıtlı ayarlara (SalaryReminderScheduler prefs) bakıp alarmı sessizce
 * yeniden kuruyoruz — kullanıcının uygulamayı açmasına gerek kalmadan.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            SalaryReminderScheduler.scheduleFromPrefs(context)
            WorkEndReminderScheduler.scheduleFromPrefs(context)
        }
    }
}

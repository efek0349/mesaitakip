package com.efek0349.mesaitakip.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import java.util.Calendar

/**
 * SalaryReminderScheduler
 *
 * "Maaş günü hatırlatıcısı" için tek sorumluluk: ayarları SharedPreferences'a
 * yazmak, bir sonraki tetiklenme zamanını hesaplamak ve AlarmManager'a tam
 * zamanlı (exact) bir alarm kurmak/iptal etmek.
 *
 * Üç yerden çağrılıyor:
 * - SalaryReminderPlugin (JS ayar değiştirdiğinde)
 * - SalaryReminderReceiver (alarm tetiklendiğinde, bir sonraki ayı kurmak için)
 * - BootReceiver (cihaz yeniden başladığında — exact alarm'lar reboot'ta silinir)
 */
object SalaryReminderScheduler {
    private const val PREFS_NAME = "SalaryReminderState"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_DAY = "day"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"
    private const val REQUEST_CODE = 5001

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, enabled: Boolean, day: Int, hour: Int, minute: Int) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_DAY, day)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .apply()
    }

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    fun getDay(context: Context): Int = prefs(context).getInt(KEY_DAY, 1)
    fun getHour(context: Context): Int = prefs(context).getInt(KEY_HOUR, 9)
    fun getMinute(context: Context): Int = prefs(context).getInt(KEY_MINUTE, 0)

    /**
     * Verilen gün/saat/dakika için, "şimdi"den sonraki en yakın tetiklenme
     * zamanını hesaplar. Ayın o günü yoksa (örn. 31 çeken bir ayda Şubat),
     * o ayın SON gününe düşürülür.
     */
    fun computeNextTriggerMillis(day: Int, hour: Int, minute: Int): Long {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val maxDayThisMonth = target.getActualMaximum(Calendar.DAY_OF_MONTH)
        target.set(Calendar.DAY_OF_MONTH, minOf(day, maxDayThisMonth))

        if (!target.after(now)) {
            target.add(Calendar.MONTH, 1)
            val maxDayNextMonth = target.getActualMaximum(Calendar.DAY_OF_MONTH)
            target.set(Calendar.DAY_OF_MONTH, minOf(day, maxDayNextMonth))
        }
        return target.timeInMillis
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, SalaryReminderReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
    }

    /** Ayarları kaydeder ve alarmı (aktifse) kurar, (değilse) iptal eder. */
    fun apply(context: Context, enabled: Boolean, day: Int, hour: Int, minute: Int): Long? {
        save(context, enabled, day, hour, minute)
        return if (enabled) scheduleFromPrefs(context) else run { cancel(context); null }
    }

    /** Kayıtlı ayarlara göre bir sonraki alarmı kurar (reboot/receiver akışlarında kullanılır). */
    fun scheduleFromPrefs(context: Context): Long? {
        if (!isEnabled(context)) return null
        val day = getDay(context)
        val hour = getHour(context)
        val minute = getMinute(context)
        val triggerAt = computeNextTriggerMillis(day, hour, minute)

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()

        try {
            if (canExact) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent(context))
            } else {
                // Kullanıcı "Alarmlar ve hatırlatıcılar" iznini kapatmışsa,
                // tam zamanlı değil ama sistemin uygun gördüğü an tetiklenen
                // bir alarm kur — hiç hatırlatmamaktan iyidir.
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent(context))
            }
        } catch (e: SecurityException) {
            // İzin son anda geri alınmış olabilir — sessizce geç, uygulama
            // çökmesin.
        }
        return triggerAt
    }

    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent(context))
    }
}

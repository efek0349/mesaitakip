package com.efek0349.mesaitakip.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * WorkEndReminderScheduler
 *
 * Maaş günü hatırlatıcısından farkı: tetiklenme zamanı SABİT değil, her gün
 * (hatta 2/3 vardiya sisteminde her HAFTA) değişebiliyor. Bu yüzden "bir
 * sonraki ayın aynı günü" gibi basit bir kural yok — her seferinde
 * ShiftCalculator ile bugünden başlayarak en yakın uygun (çalışma günü
 * olan, bitiş saati henüz geçmemiş) günü arıyoruz.
 */
object WorkEndReminderScheduler {
    private const val PREFS_NAME = "WorkEndReminderState"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_MINUTES_BEFORE = "minutesBefore"
    private const val REQUEST_CODE = 5002
    private const val MAX_DAYS_LOOKAHEAD = 14
    private val dayFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, enabled: Boolean, minutesBefore: Int) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_MINUTES_BEFORE, minutesBefore)
            .apply()
    }

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    fun getMinutesBefore(context: Context): Int = prefs(context).getInt(KEY_MINUTES_BEFORE, 5)

    /** Uygulamanın (JS/Capacitor Preferences) kaydettiği ayarları okur. */
    private fun readAppSettings(context: Context): JSONObject? {
        return try {
            val appPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val raw = appPrefs.getString("mesai-salary-settings", null) ?: return null
            JSONObject(raw)
        } catch (e: Exception) {
            null
        }
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, WorkEndReminderReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
    }

    fun apply(context: Context, enabled: Boolean, minutesBefore: Int): Long? {
        save(context, enabled, minutesBefore)
        return if (enabled) scheduleFromPrefs(context) else run { cancel(context); null }
    }

    /**
     * Bugünden başlayarak (en fazla MAX_DAYS_LOOKAHEAD gün ileriye kadar),
     * hâlâ gelecekte olan ilk "hatırlatma anını" bulup alarmı kurar.
     * Bulamazsa (örn. ayarlar eksik/geçersizse) alarmı iptal eder.
     */
    fun scheduleFromPrefs(context: Context): Long? {
        if (!isEnabled(context)) return null
        val minutesBefore = getMinutesBefore(context)
        val settings = readAppSettings(context) ?: run { cancel(context); return null }
        val now = Calendar.getInstance()

        for (offset in 0..MAX_DAYS_LOOKAHEAD) {
            val dayCal = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, offset)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            val dateStr = dayFormat.format(dayCal.time)
            if (ReminderExclusionsStore.isExcluded(context, dateStr)) continue
            val effective = ShiftCalculator.getEffectiveShiftTimes(dateStr, settings)
            if (!effective.isWorkday || effective.end.isEmpty()) continue

            val endParts = effective.end.split(":")
            if (endParts.size != 2) continue
            val endHour = endParts[0].toIntOrNull() ?: continue
            val endMinute = endParts[1].toIntOrNull() ?: continue

            val endCal = (dayCal.clone() as Calendar).apply {
                if (effective.endCrossesMidnight) add(Calendar.DAY_OF_MONTH, 1)
                set(Calendar.HOUR_OF_DAY, endHour)
                set(Calendar.MINUTE, endMinute)
                set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            val triggerCal = (endCal.clone() as Calendar).apply { add(Calendar.MINUTE, -minutesBefore) }

            if (triggerCal.after(now)) {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
                try {
                    if (canExact) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerCal.timeInMillis, pendingIntent(context))
                    } else {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerCal.timeInMillis, pendingIntent(context))
                    }
                } catch (e: SecurityException) {
                    return null
                }
                return triggerCal.timeInMillis
            }
        }
        // Uygun bir gün bulunamadı (örn. vardiya/gün ayarları eksik) — eski alarmı temizle.
        cancel(context)
        return null
    }

    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent(context))
    }
}

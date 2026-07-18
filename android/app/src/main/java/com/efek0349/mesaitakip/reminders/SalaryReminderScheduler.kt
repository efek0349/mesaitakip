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
    private const val KEY_SKIP_WEEKEND = "skipWeekend"
    private const val REQUEST_CODE = 5001

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, enabled: Boolean, day: Int, hour: Int, minute: Int, skipWeekend: Boolean) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_DAY, day)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .putBoolean(KEY_SKIP_WEEKEND, skipWeekend)
            .apply()
    }

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)
    fun getDay(context: Context): Int = prefs(context).getInt(KEY_DAY, 1)
    fun getHour(context: Context): Int = prefs(context).getInt(KEY_HOUR, 9)
    fun getMinute(context: Context): Int = prefs(context).getInt(KEY_MINUTE, 0)
    fun getSkipWeekend(context: Context): Boolean = prefs(context).getBoolean(KEY_SKIP_WEEKEND, true)

    /**
     * Verilen gün/saat/dakika için, "şimdi"den sonraki en yakın tetiklenme
     * zamanını hesaplar. Ayın o günü yoksa (örn. 31 çeken bir ayda Şubat),
     * o ayın SON gününe düşürülür.
     *
     * skipWeekend=true ise: hesaplanan gün Cumartesi'ye denk gelirse bir
     * önceki güne (Cuma), Pazar'a denk gelirse bir sonraki güne
     * (Pazartesi) kaydırılır — "en yakın iş günü" kuralı. Ay sonu/başı
     * sınırını geçse bile (örn. ayın 1'i Pazar ise 2'sine, ayın 31'i
     * Cumartesi ise 30'una kayar) sorun olmaz, tarih hesaplaması
     * Calendar üzerinden doğal şekilde yürür.
     */
    fun computeNextTriggerMillis(day: Int, hour: Int, minute: Int, skipWeekend: Boolean = true): Long {
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val maxDayThisMonth = target.getActualMaximum(Calendar.DAY_OF_MONTH)
        target.set(Calendar.DAY_OF_MONTH, minOf(day, maxDayThisMonth))
        if (skipWeekend) adjustForWeekend(target)

        if (!target.after(now)) {
            target.add(Calendar.MONTH, 1)
            // Ay değiştiği için gün ve hafta sonu kaydırmasını sıfırdan
            // uygula — bir önceki adımda hafta sonu kayması olduysa bile
            // burada tekrar temiz bir hesap yapılır.
            target.set(Calendar.DAY_OF_MONTH, 1)
            val maxDayNextMonth = target.getActualMaximum(Calendar.DAY_OF_MONTH)
            target.set(Calendar.DAY_OF_MONTH, minOf(day, maxDayNextMonth))
            if (skipWeekend) adjustForWeekend(target)
        }
        return target.timeInMillis
    }

    /** Cumartesi ise 1 gün geri (Cuma), Pazar ise 1 gün ileri (Pazartesi) kaydırır. */
    private fun adjustForWeekend(target: Calendar) {
        when (target.get(Calendar.DAY_OF_WEEK)) {
            Calendar.SATURDAY -> target.add(Calendar.DAY_OF_MONTH, -1)
            Calendar.SUNDAY -> target.add(Calendar.DAY_OF_MONTH, 1)
        }
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, SalaryReminderReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
    }

    /** Ayarları kaydeder ve alarmı (aktifse) kurar, (değilse) iptal eder. */
    fun apply(context: Context, enabled: Boolean, day: Int, hour: Int, minute: Int, skipWeekend: Boolean): Long? {
        save(context, enabled, day, hour, minute, skipWeekend)
        return if (enabled) scheduleFromPrefs(context) else run { cancel(context); null }
    }

    /** Kayıtlı ayarlara göre bir sonraki alarmı kurar (reboot/receiver akışlarında kullanılır). */
    fun scheduleFromPrefs(context: Context): Long? {
        if (!isEnabled(context)) return null
        val day = getDay(context)
        val hour = getHour(context)
        val minute = getMinute(context)
        val skipWeekend = getSkipWeekend(context)
        val triggerAt = computeNextTriggerMillis(day, hour, minute, skipWeekend)

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

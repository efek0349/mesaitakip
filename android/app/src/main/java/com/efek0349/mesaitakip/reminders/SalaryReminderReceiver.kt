package com.efek0349.mesaitakip.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.efek0349.mesaitakip.MainActivity
import com.efek0349.mesaitakip.R

/**
 * AlarmManager tarafından, kullanıcının Ayarlar'da seçtiği gün/saatte
 * tetiklenir. İki iş yapar:
 * 1) "Maaş günü" bildirimini gösterir (kalıcı — Toast/kısa bildirim değil,
 *    kullanıcı görene kadar bildirim panelinde kalmalı).
 * 2) Bir sonraki ayın alarmını hemen kurar (AlarmManager tek seferlik
 *    olduğu için kendi kendini "yeniler").
 */
class SalaryReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        showNotification(context)
        // Bu ay için tetiklendi — bir sonraki ayın tarihini hesaplayıp kur.
        SalaryReminderScheduler.scheduleFromPrefs(context)
    }

    private fun showNotification(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                    val channel = NotificationChannel(
                        CHANNEL_ID,
                        context.getString(R.string.salary_reminder_channel_name),
                        NotificationManager.IMPORTANCE_HIGH
                    )
                    manager.createNotificationChannel(channel)
                }
            }

            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val contentIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val contentIntent = PendingIntent.getActivity(context, NOTIFICATION_ID, openAppIntent, contentIntentFlags)

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_widget_add)
                .setContentTitle(context.getString(R.string.salary_reminder_title))
                .setContentText(context.getString(R.string.salary_reminder_text))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setContentIntent(contentIntent)
                .setAutoCancel(true)
                // Kalıcı bildirim — Toast/widget geri bildirimi gibi
                // otomatik kaybolmuyor, kullanıcı görüp kapatana kadar
                // bildirim panelinde kalıyor.
                .build()

            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            // Bildirim izni yok — sessizce geç.
        } catch (e: Exception) {
            // Beklenmeyen hata alarmın yeniden kurulmasını engellemesin.
        }
    }

    companion object {
        private const val CHANNEL_ID = "salary_day_reminder"
        private const val NOTIFICATION_ID = 992200
    }
}

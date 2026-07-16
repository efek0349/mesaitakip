package com.efek0349.mesaitakip.backup

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import java.util.concurrent.TimeUnit

/**
 * NativeBackupScheduler
 *
 * WorkManager, AlarmManager'dan farklı olarak periyodik işleri KENDİSİ
 * kalıcı olarak saklıyor (dahili Room veritabanında) — cihaz yeniden
 * başladığında bizim ayrıca bir BootReceiver ile yeniden kurmamıza gerek
 * yok, WorkManager bunu otomatik yapıyor. Bu yüzden burada sadece kur/iptal
 * et mantığı var, reminders/BootReceiver.kt'ye dokunmuyoruz.
 */
object NativeBackupScheduler {
    private const val UNIQUE_WORK_NAME = "mesai_native_backup"

    private fun intervalDaysFor(period: String): Long = when (period) {
        "daily" -> 1L
        "monthly" -> 30L
        else -> 7L // weekly / bilinmeyen değer
    }

    private fun buildRequest(period: String) =
        PeriodicWorkRequestBuilder<NativeBackupWorker>(intervalDaysFor(period), TimeUnit.DAYS)
            .setConstraints(
                // İnternet gerekmiyor (yerel klasöre yazıyoruz) ama pil çok
                // düşükken çalışmasın diye hafif bir kısıt koyuyoruz.
                Constraints.Builder().setRequiresBatteryNotLow(true).build()
            )
            .setBackoffCriteria(BackoffPolicy.LINEAR, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
            .build()

    /**
     * Ayar her değiştiğinde (enabled/period farketmeksizin) JS tarafından
     * çağrılır. UPDATE politikası kullanıyoruz — periyot değişmişse yeni
     * aralığı hemen uygular, değişmemişse var olan işi gereksiz sıfırlamaz
     * (WorkManager UPDATE zaten idempotent).
     */
    fun apply(context: Context, enabled: Boolean, period: String) {
        if (!enabled) {
            cancel(context)
            return
        }
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            buildRequest(period)
        )
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME)
    }
}

package com.efek0349.mesaitakip.backup

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * NativeBackupWorker
 *
 * "Otomatik Yedekleme" ayarı JS/React tarafında bir efekt olarak çalışıyordu
 * — yani sadece UYGULAMA AÇIKKEN tetikleniyordu. Kullanıcı haftalarca
 * uygulamayı hiç açmazsa (özellikle widget'tan mesai eklemeye devam ederken)
 * hem hiç yedek alınmıyor hem de widget kuyruğundaki veriler kalıcı hale
 * gelmiyordu.
 *
 * Bu worker, WorkManager ile PERİYODİK olarak (uygulama kapalıyken de)
 * çalışır ve iki işi birden yapar:
 * 1) Widget'ın "quick-widget-pending" kuyruğunu gerçek `mesai-data-*`
 *    verisine işler (bkz. useOvertimeData.ts → processPendingWidgetEntries
 *    ile BİREBİR aynı birleştirme mantığı).
 * 2) Tüm mesai verisi + ayarları toplayıp kullanıcının seçtiği SAF
 *    klasörüne JSON yedek dosyası yazar (SafBackupPlugin.writeFile ile
 *    AYNI native DocumentFile mekanizması, ama JS/WebView'e ihtiyaç
 *    duymadan).
 *
 * ÖNEMLİ: JS tarafındaki mantık (useOvertimeData.ts, folderBackupUtils.ts)
 * değişirse bu dosya da GÜNCELLENMELİDİR, aksi halde iki taraf birbirinden
 * sapar — MonthlyStatsCalculator.kt / ShiftCalculator.kt ile aynı ilke.
 */
class NativeBackupWorker(appContext: Context, params: WorkerParameters) : Worker(appContext, params) {

    override fun doWork(): Result {
        return try {
            performBackup(applicationContext)
            Result.success()
        } catch (e: Exception) {
            // Geçici bir hata olabilir (klasör o an erişilemez, disk meşgul
            // vb.) — WorkManager'ın kendi backoff politikasıyla tekrar
            // denemesine izin ver.
            Result.retry()
        }
    }

    companion object {
        private const val PREFS_NAME = "CapacitorStorage"
        private const val SETTINGS_KEY = "mesai-salary-settings"
        private const val FOLDER_PATH_KEY = "local_backup_folder_path"
        private const val PENDING_KEY = "quick-widget-pending"
        private const val DATA_PREFIX = "mesai-data-"
        private const val MAX_BACKUPS_TO_KEEP = 10

        fun performBackup(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val settingsRaw = prefs.getString(SETTINGS_KEY, null) ?: return
            val settings = JSONObject(settingsRaw)

            if (!settings.optBoolean("autoBackupEnabled", false)) return

            val folderPath = prefs.getString(FOLDER_PATH_KEY, null) ?: return

            // Güvenlik payı: JS tarafındaki periyot kontrolüyle aynı mantık
            // (en az %99'u dolmuşsa çalış). WorkManager zaten periyoduna
            // göre tetikliyor ama erken/geç tetiklenme ihtimaline karşı
            // çift kontrol zararsız.
            val period = settings.optString("autoBackupPeriod", "weekly")
            val dayLimit = when (period) {
                "daily" -> 1.0
                "monthly" -> 30.0
                else -> 7.0
            }
            val lastBackupStr = settings.optString("lastBackupDate", "")
            if (lastBackupStr.isNotEmpty()) {
                val lastBackupTime = parseIso(lastBackupStr)
                if (lastBackupTime != null) {
                    val diffDays = (System.currentTimeMillis() - lastBackupTime) / (1000.0 * 60 * 60 * 24)
                    if (diffDays < dayLimit - 0.01) return
                }
            }

            val dir = DocumentFile.fromTreeUri(context, Uri.parse(folderPath))
            if (dir == null || !dir.exists() || !dir.isDirectory) return

            // 1) Widget kuyruğunu gerçek aylık veriye işle (JS açmasa bile).
            mergePendingWidgetQueue(prefs)

            // 2) Tüm mesai verisini topla.
            val overtime = JSONObject()
            val allKeys = prefs.all.keys.filter { it.startsWith(DATA_PREFIX) }
            for (key in allKeys) {
                val monthKey = key.removePrefix(DATA_PREFIX)
                val raw = prefs.getString(key, null) ?: continue
                try {
                    overtime.put(monthKey, JSONArray(raw))
                } catch (e: Exception) {
                    // Bozuk bir ay verisi tüm yedeklemeyi engellemesin, atla.
                }
            }

            val exportJson = JSONObject().apply {
                put("version", 2)
                put("overtime", overtime)
                put("settings", settings)
            }

            // 3) Dosyayı klasöre yaz (SafBackupPlugin.writeFile ile aynı
            // isim formatı: "backup_YYYY-MM-DDTHH-mm.json").
            val fileName = generateBackupFileName()
            dir.findFile(fileName)?.delete()
            val newFile = dir.createFile("application/json", fileName) ?: return
            context.contentResolver.openOutputStream(newFile.uri)?.use { stream ->
                OutputStreamWriter(stream, Charsets.UTF_8).use { it.write(exportJson.toString()) }
            }

            // 4) lastBackupDate'i güncelle.
            settings.put("lastBackupDate", isoNow())
            prefs.edit().putString(SETTINGS_KEY, settings.toString()).apply()

            // 5) Eski yedekleri temizle (son MAX_BACKUPS_TO_KEEP tanesini tut).
            cleanupOldBackups(dir)
        }

        /**
         * useOvertimeData.ts → processPendingWidgetEntries ile BİREBİR aynı
         * birleştirme mantığı: tarih+tür eşleşirse değiştir, yoksa ekle;
         * saat/dakika ikisi de 0 (veya delete bayraklı) ise sil.
         */
        private fun mergePendingWidgetQueue(prefs: android.content.SharedPreferences) {
            val raw = prefs.getString(PENDING_KEY, null) ?: return
            val pending = try { JSONArray(raw) } catch (e: Exception) { return }
            if (pending.length() == 0) {
                prefs.edit().remove(PENDING_KEY).apply()
                return
            }

            val editor = prefs.edit()
            // Aynı ay içinde birden fazla pending kayıt olabileceğinden,
            // her ay için güncel listeyi bellekte tutup en sonda tek
            // seferde yazıyoruz.
            val monthCache = mutableMapOf<String, MutableList<JSONObject>>()

            fun currentMonthList(monthKey: String): MutableList<JSONObject> {
                return monthCache.getOrPut(monthKey) {
                    val existingRaw = prefs.getString("$DATA_PREFIX$monthKey", null)
                    val list = mutableListOf<JSONObject>()
                    if (existingRaw != null) {
                        val arr = JSONArray(existingRaw)
                        for (i in 0 until arr.length()) list.add(arr.getJSONObject(i))
                    }
                    list
                }
            }

            for (i in 0 until pending.length()) {
                val p = pending.optJSONObject(i) ?: continue
                val date = p.optString("date", "")
                if (date.isEmpty() || date.length < 7) continue
                val hours = p.optDouble("hours", 0.0)
                val minutes = p.optDouble("minutes", 0.0)
                val monthKey = date.substring(0, 7)
                val list = currentMonthList(monthKey)

                val isDelete = p.optBoolean("delete", false) || (hours == 0.0 && minutes == 0.0)
                if (isDelete) {
                    list.removeAll { it.optString("date") == date && it.optString("type") == "overtime" }
                    continue
                }

                val newEntry = JSONObject().apply {
                    put("id", "widget-$date-${System.currentTimeMillis()}-${(1000..9999).random()}")
                    put("date", date)
                    put("hours", hours)
                    put("minutes", minutes)
                    put("type", "overtime")
                    put("isFullDay", false)
                    put("isPaid", false)
                    put("deductFromOvertime", false)
                }

                val existingIndex = list.indexOfFirst { it.optString("date") == date && it.optString("type") == "overtime" }
                if (existingIndex >= 0) list[existingIndex] = newEntry else list.add(newEntry)
            }

            monthCache.forEach { (monthKey, list) ->
                list.sortBy { it.optString("date") }
                val arr = JSONArray()
                list.forEach { arr.put(it) }
                editor.putString("$DATA_PREFIX$monthKey", arr.toString())
            }
            editor.remove(PENDING_KEY)
            editor.apply()
        }

        private fun cleanupOldBackups(dir: DocumentFile) {
            val backups = dir.listFiles()
                .filter { it.name?.startsWith("backup_") == true && it.name?.endsWith(".json") == true }
                .sortedByDescending { it.name } // ISO zaman damgalı isimler string olarak da kronolojik sıralanır
            if (backups.size > MAX_BACKUPS_TO_KEEP) {
                backups.drop(MAX_BACKUPS_TO_KEEP).forEach { it.delete() }
            }
        }

        private fun generateBackupFileName(): String {
            // JS: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16) + ".json"
            val iso = isoNow()
            val safe = iso.replace(":", "-").replace(".", "-")
            val sliced = if (safe.length >= 16) safe.substring(0, 16) else safe
            return "backup_$sliced.json"
        }

        private fun isoNow(): String {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
            return sdf.format(Date())
        }

        private fun parseIso(iso: String): Long? {
            return try {
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
                sdf.parse(iso)?.time
            } catch (e: Exception) {
                try {
                    // Milisaniyesiz ISO formatına da tolerans göster.
                    val sdf2 = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                    sdf2.timeZone = java.util.TimeZone.getTimeZone("UTC")
                    sdf2.parse(iso)?.time
                } catch (e2: Exception) {
                    null
                }
            }
        }
    }
}

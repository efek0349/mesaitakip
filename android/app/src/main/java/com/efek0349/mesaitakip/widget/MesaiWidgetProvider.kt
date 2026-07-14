package com.efek0349.mesaitakip.widget

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.efek0349.mesaitakip.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale
import kotlin.math.roundToLong

/**
 * MesaiWidgetProvider — Android ana ekranındaki "Mesai Ekle" widget'ı.
 *
 * TAMAMEN GÖMÜLÜ / ETKİLEŞİMLİ: hiçbir Activity/pencere/popup AÇMIYOR.
 * Saat ve dakika değerleri widget'ın ÜZERİNDEKİ [-]/[+] butonlarıyla,
 * widget kendi içinde anında güncellenerek değiştiriliyor (AppWidgetManager
 * ile aynı widget'ı yerinde yeniden çiziyoruz). "Ekle"ye basınca kayıt
 * kuyruğa yazılıyor ve sayaçlar sıfırlanıyor — kullanıcı hiçbir zaman
 * WebView/React'e dokunmuyor, gerçekten "widget'ın kendisi arayüz".
 *
 * Not: NumberPicker/metin girişi Android'in ana ekran widget sisteminde
 * (RemoteViews) desteklenmiyor — bu yüzden +/- butonlu bir sayaç tasarımı
 * kullanıldı, bu widget yüzeyinde çalışan tek pratik interaktif desen.
 *
 * DURUM SAKLAMA: Her widget örneğinin (appWidgetId) kendi saat/dakika
 * sayacı, AYRI bir SharedPreferences dosyasında ("MesaiWidgetState")
 * tutuluyor — uygulamanın kendi verisiyle ("CapacitorStorage") KARIŞMIYOR.
 *
 * VERİ TESLİMİ: "Ekle" butonu, kaydı "CapacitorStorage" içindeki
 * "quick-widget-pending" kuyruğuna ekliyor (uygulamanın kendi ay bazlı
 * verisine DOĞRUDAN dokunmuyor — uygulama açıkken kendi state'iyle üzerine
 * yazma riskini önlemek için). JS tarafı (useOvertimeData.ts,
 * processPendingWidgetEntries) bu kuyruğu güvenle entegre ediyor.
 *
 * "BU AY" ÖZETİ (saat / net mesai / net maaş): TAMAMEN NATIVE hesaplanıyor
 * (bkz. MonthlyStatsCalculator.kt) — hiçbir Activity/WebView açılmıyor.
 * Eski tasarım (WidgetSyncActivity) JS'in hesabını görünmez bir pencerede
 * çalıştırıyordu, ama Activity açmanın kendisi bazı cihazlarda/launcher'larda
 * bastırılamayan bir görev-geçiş flaşına sebep oluyordu — bu yüzden
 * hesaplama saf Kotlin'e taşındı, artık hiçbir görsel yan etki yok.
 */
class MesaiWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        refreshSummary(context)
        for (appWidgetId in appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, buildRemoteViews(context, appWidgetId))
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val stateEditor = stateStore(context).edit()
        for (appWidgetId in appWidgetIds) {
            stateEditor.remove(hoursKey(appWidgetId))
            stateEditor.remove(minutesIndexKey(appWidgetId))
        }
        stateEditor.apply()
    }

    override fun onReceive(context: Context, intent: Intent) {
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)

        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            when (intent.action) {
                ACTION_INC_HOURS -> { changeHours(context, appWidgetId, +1); return }
                ACTION_DEC_HOURS -> { changeHours(context, appWidgetId, -1); return }
                ACTION_INC_MINUTES -> { changeMinutes(context, appWidgetId, +1); return }
                ACTION_DEC_MINUTES -> { changeMinutes(context, appWidgetId, -1); return }
                ACTION_CONFIRM -> { confirmEntry(context, appWidgetId); return }
            }
        }

        // Standart widget yaşam döngüsü olayları (APPWIDGET_UPDATE, DELETED vb.)
        super.onReceive(context, intent)
    }

    companion object {
        private const val ACTION_INC_HOURS = "com.efek0349.mesaitakip.widget.ACTION_INC_HOURS"
        private const val ACTION_DEC_HOURS = "com.efek0349.mesaitakip.widget.ACTION_DEC_HOURS"
        private const val ACTION_INC_MINUTES = "com.efek0349.mesaitakip.widget.ACTION_INC_MINUTES"
        private const val ACTION_DEC_MINUTES = "com.efek0349.mesaitakip.widget.ACTION_DEC_MINUTES"
        private const val ACTION_CONFIRM = "com.efek0349.mesaitakip.widget.ACTION_CONFIRM"

        private const val MAX_HOURS = 16
        private val MINUTE_STEPS = intArrayOf(0, 15, 30, 45)
        private const val DEFAULT_HOURS = 2
        private const val DEFAULT_MINUTES_INDEX = 0 // -> 0 dakika

        private const val FEEDBACK_CHANNEL_ID = "mesai_widget_feedback_v2"
        private const val FEEDBACK_NOTIFICATION_ID = 991100

        /**
         * "Ekle" işleminden sonra kısa bilgilendirme göstermek için kullanılıyor.
         *
         * Neden Toast DEĞİL: Toast.makeText, widget'ın BroadcastReceiver'ından
         * (uygulama hiç açılmadan, tamamen arka plandan) tetiklendiğinde birçok
         * OEM Android sürümünde (MIUI, ColorOS, EMUI vb.) sessizce bastırılıyor
         * — "arka planda açılır pencere göster" izni kapalıysa toast hiç
         * görünmüyor, ama widget'ın kendi işlevi (veri ekleme/silme) normal
         * şekilde çalışmaya devam ediyor. Bildirimler ise standart bir Android
         * izni (POST_NOTIFICATIONS) üzerinden çalıştığı ve bu OEM'lerin
         * "arka plan pop-up" kısıtlamasına takılmadığı için çok daha güvenilir.
         *
         * setTimeoutAfter(...) ile bildirim birkaç saniye sonra sistem
         * tarafından otomatik kaldırılıyor — Toast'a benzer "kısa süreli bilgi"
         * hissi veriyor, kalıcı bir bildirim gibi durmuyor.
         */
        private fun showFeedback(context: Context, appWidgetId: Int, message: String) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    if (manager.getNotificationChannel(FEEDBACK_CHANNEL_ID) == null) {
                        val channel = NotificationChannel(
                            FEEDBACK_CHANNEL_ID,
                            context.getString(R.string.quick_overtime_feedback_channel_name),
                            // IMPORTANCE_HIGH: bildirim paneli indirilmeden,
                            // ekranın üstünde otomatik açılan bir banner
                            // ("heads-up") olarak belirmesi için gerekli.
                            // IMPORTANCE_LOW ile sadece durum çubuğunda
                            // sessiz bir ikon olarak kalıyordu.
                            NotificationManager.IMPORTANCE_HIGH
                        ).apply {
                            setSound(null, null)
                            enableVibration(false)
                            setShowBadge(false)
                        }
                        manager.createNotificationChannel(channel)
                    }
                }

                if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

                val notification = NotificationCompat.Builder(context, FEEDBACK_CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_widget_add)
                    .setContentText(message)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_STATUS)
                    .setAutoCancel(true)
                    .setOnlyAlertOnce(true)
                    .setTimeoutAfter(4000)
                    .build()

                // Aynı widget örneği için sabit bir bildirim ID'si kullanmak,
                // arka arkaya birkaç ekleme yapılırsa bildirimlerin
                // yığılmayıp birbirinin yerine geçmesini sağlıyor.
                NotificationManagerCompat.from(context)
                    .notify(FEEDBACK_NOTIFICATION_ID + appWidgetId, notification)
            } catch (e: SecurityException) {
                // Bildirim izni verilmemiş — sessizce yut, widget'ın asıl
                // işlevi (veri ekleme/silme) bundan etkilenmiyor.
            } catch (e: Exception) {
                // Beklenmeyen bir bildirim hatası widget'ın çalışmasını
                // engellemesin.
            }
        }

        private fun stateStore(context: Context): SharedPreferences =
            context.getSharedPreferences("MesaiWidgetState", Context.MODE_PRIVATE)

        private fun hoursKey(appWidgetId: Int) = "hours_$appWidgetId"
        private fun minutesIndexKey(appWidgetId: Int) = "minutesIndex_$appWidgetId"

        private fun getHours(context: Context, appWidgetId: Int): Int =
            stateStore(context).getInt(hoursKey(appWidgetId), DEFAULT_HOURS)

        private fun getMinutesIndex(context: Context, appWidgetId: Int): Int =
            stateStore(context).getInt(minutesIndexKey(appWidgetId), DEFAULT_MINUTES_INDEX)

        private fun changeHours(context: Context, appWidgetId: Int, delta: Int) {
            val current = getHours(context, appWidgetId)
            val next = (current + delta).coerceIn(0, MAX_HOURS)
            stateStore(context).edit().putInt(hoursKey(appWidgetId), next).apply()
            refreshWidget(context, appWidgetId)
        }

        private fun changeMinutes(context: Context, appWidgetId: Int, delta: Int) {
            val current = getMinutesIndex(context, appWidgetId)
            val next = (current + delta + MINUTE_STEPS.size) % MINUTE_STEPS.size
            stateStore(context).edit().putInt(minutesIndexKey(appWidgetId), next).apply()
            refreshWidget(context, appWidgetId)
        }

        private fun refreshWidget(context: Context, appWidgetId: Int) {
            AppWidgetManager.getInstance(context).updateAppWidget(appWidgetId, buildRemoteViews(context, appWidgetId))
        }

        private fun confirmEntry(context: Context, appWidgetId: Int) {
            val hours = getHours(context, appWidgetId)
            val minutes = MINUTE_STEPS[getMinutesIndex(context, appWidgetId)]
            val isResetRequest = hours == 0 && minutes == 0

            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date())
            val entry = JSONObject().apply {
                put("date", today)
                put("hours", hours)
                put("minutes", minutes)
                // 0 saat / 0 dakika ile "Ekle"ye basmak artık engellenmiyor —
                // bunun yerine o günün kaydını silmek isteyen kullanıcı için
                // bir "sıfırlama" sinyali olarak kullanılıyor. JS tarafı
                // (processPendingWidgetEntries) bu bayrağı görünce o tarihteki
                // 'overtime' kaydını eklemek yerine SİLİYOR.
                put("delete", isResetRequest)
            }

            // Uygulamanın kendi verisiyle ("CapacitorStorage") ASLA doğrudan
            // ay-verisi anahtarına yazmıyoruz, bkz. dosya başı açıklama.
            val appPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val existingRaw = appPrefs.getString("quick-widget-pending", null)
            val pendingArray = if (existingRaw != null) JSONArray(existingRaw) else JSONArray()
            pendingArray.put(entry)
            appPrefs.edit().putString("quick-widget-pending", pendingArray.toString()).apply()

            // Sayaçları varsayılana sıfırla — bir sonraki hızlı ekleme için hazır.
            stateStore(context).edit()
                .putInt(hoursKey(appWidgetId), DEFAULT_HOURS)
                .putInt(minutesIndexKey(appWidgetId), DEFAULT_MINUTES_INDEX)
                .apply()

            val toastRes = if (isResetRequest) R.string.quick_overtime_toast_zero else R.string.quick_overtime_toast_added
            showFeedback(context, appWidgetId, context.getString(toastRes))
            refreshSummary(context)
            refreshWidget(context, appWidgetId)
        }

        /**
         * "Bu Ay" özetini (saat/net mesai/net maaş) TAMAMEN NATIVE olarak
         * (bkz. MonthlyStatsCalculator) yeniden hesaplayıp "MesaiSummaryWidgetState"
         * içine yazar. Eskiden bu iş, kullanıcıya görünmeyen bir WebView
         * penceresi (WidgetSyncActivity) açıp JS'in aynı hesabını çalıştırarak
         * yapılıyordu — ama bazı cihazlarda/launcher'larda Activity açmanın
         * kendisi (ne kadar "görünmez" yapılırsa yapılsın) bastırılamayan bir
         * görev-geçiş flaşına sebep oluyordu. Artık hiçbir Activity/WebView
         * açılmıyor, hesap doğrudan burada, senkron ve anında tamamlanıyor.
         */
        private fun refreshSummary(context: Context) {
            try {
                val result = MonthlyStatsCalculator.calculate(context)
                val hoursText = formatWidgetHours(result.monthlyTotalHours)
                val amountText = "₺${formatTurkishAmount(result.finalEarnings)}"
                val overtimeAmountText = "₺${formatTurkishAmount(result.netOvertimePayment)}"

                context.getSharedPreferences("MesaiSummaryWidgetState", Context.MODE_PRIVATE)
                    .edit()
                    .putString("hoursText", hoursText)
                    .putString("amountText", amountText)
                    .putString("overtimeAmountText", overtimeAmountText)
                    .apply()
            } catch (e: Exception) {
                // Hesaplama başarısız olsa bile widget'ın +/-/Ekle işlevi
                // etkilenmemeli — özet satırı sadece bir önceki değeriyle kalır.
            }
        }

        // JS: formatWidgetHours (useWidgetSummarySync.ts) ile birebir aynı —
        // dakika yoksa sade saat, varsa "SS:DD dk".
        private fun formatWidgetHours(totalHours: Double): String {
            val hours = totalHours.toInt().coerceAtLeast(0)
            val minutes = ((totalHours - hours) * 60).roundToLong().toInt().coerceAtLeast(0)
            if (minutes == 0) return "$hours"
            return "$hours:${minutes.toString().padStart(2, '0')} dk"
        }

        // JS: Math.round(x).toLocaleString('tr-TR') ile birebir aynı —
        // binlik ayraç nokta ("28.450").
        private fun formatTurkishAmount(value: Double): String {
            val rounded = value.roundToLong()
            return NumberFormat.getIntegerInstance(Locale("tr", "TR")).format(rounded)
        }

        private fun openAppPendingIntent(context: Context): PendingIntent {
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            } ?: Intent(context, com.efek0349.mesaitakip.MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            return PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun actionPendingIntent(context: Context, appWidgetId: Int, action: String): PendingIntent {
            val intent = Intent(context, MesaiWidgetProvider::class.java).apply {
                this.action = action
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                // Her (appWidgetId + action) çifti için PendingIntent'in
                // FLAG_UPDATE_CURRENT ile doğru şekilde ayırt edilebilmesi
                // amacıyla data URI'sini benzersiz yapıyoruz.
                data = android.net.Uri.parse("mesaiwidget://$appWidgetId/$action")
            }
            return PendingIntent.getBroadcast(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun buildRemoteViews(context: Context, appWidgetId: Int): RemoteViews {
            val appPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val win95Enabled = appPrefs.getString("win95Enabled", "false") == "true"

            val layoutRes = if (win95Enabled) R.layout.widget_quick_overtime_win95 else R.layout.widget_quick_overtime
            val views = RemoteViews(context.packageName, layoutRes)

            val hours = getHours(context, appWidgetId)
            val minutes = MINUTE_STEPS[getMinutesIndex(context, appWidgetId)]

            views.setTextViewText(R.id.text_hours_value, hours.toString())
            views.setTextViewText(R.id.text_minutes_value, String.format(Locale.US, "%02d", minutes))

            views.setOnClickPendingIntent(R.id.btn_hours_inc, actionPendingIntent(context, appWidgetId, ACTION_INC_HOURS))
            views.setOnClickPendingIntent(R.id.btn_hours_dec, actionPendingIntent(context, appWidgetId, ACTION_DEC_HOURS))
            views.setOnClickPendingIntent(R.id.btn_minutes_inc, actionPendingIntent(context, appWidgetId, ACTION_INC_MINUTES))
            views.setOnClickPendingIntent(R.id.btn_minutes_dec, actionPendingIntent(context, appWidgetId, ACTION_DEC_MINUTES))
            views.setOnClickPendingIntent(R.id.btn_confirm, actionPendingIntent(context, appWidgetId, ACTION_CONFIRM))

            // Widget'ın kendisine (butonların dışındaki her yere) tıklanınca
            // uygulamayı açar. +/-/Ekle butonları kendi PendingIntent'lerini
            // koruyor; bu sadece boş alan/zemin için geçerli.
            views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent(context))

            // Alt satır — "Bu Ay" özeti: TAMAMEN NATIVE hesaplanıyor (bkz.
            // MonthlyStatsCalculator + refreshSummary()). Burada sadece daha
            // önce hesaplanıp "MesaiSummaryWidgetState"e yazılmış hazır metni
            // okuyoruz — her +/- dokunuşunda yeniden hesaplamamak için
            // (refreshSummary sadece onUpdate() ve "Ekle" sonrası çağrılır).
            val summaryPrefs = context.getSharedPreferences("MesaiSummaryWidgetState", Context.MODE_PRIVATE)
            val summaryHours = summaryPrefs.getString("hoursText", null) ?: "—"
            val summaryAmount = summaryPrefs.getString("amountText", null) ?: "—"
            val summaryOvertimeAmount = summaryPrefs.getString("overtimeAmountText", null) ?: "—"
            views.setTextViewText(R.id.text_widget_summary_hours, summaryHours)
            views.setTextViewText(R.id.text_widget_summary_amount, summaryAmount)
            views.setTextViewText(R.id.text_widget_summary_overtime, summaryOvertimeAmount)

            return views
        }
    }
}

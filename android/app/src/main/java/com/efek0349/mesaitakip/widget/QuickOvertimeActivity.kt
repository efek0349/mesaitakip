package com.efek0349.mesaitakip.widget

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Typeface
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import com.efek0349.mesaitakip.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import kotlin.math.roundToInt

/**
 * QuickOvertimeActivity — WhatsApp'ın "durum" kamerası gibi, WebView'a hiç
 * dokunmadan, tamamen native (Kotlin + standart Android görünümleri) çalışan
 * anlık mesai giriş ekranı.
 *
 * SAAT/DAKİKA SEÇİMİ: NumberPicker DEĞİL — web'deki (`public/quick.html`)
 * kaydırmalı çark (wheel picker) ile BİREBİR AYNI mantık, native View'lara
 * (ScrollView + TextView listesi) port edildi. NumberPicker'ın ok
 * butonları ve "kaydır" ipucu yazısı kaldırıldı — çarkın kendisi zaten
 * "beni kaydırarak çevir" affordance'ını görsel olarak veriyor (buildWheel()).
 *
 * TEMA: Uygulama içindeki "Win95 teması açık mı" tercihini (useTheme.ts'in
 * `storage.set('win95Enabled', ...)` ile yazdığı, Capacitor Preferences'ın
 * kullandığı "CapacitorStorage" adlı SharedPreferences dosyasındaki
 * "win95Enabled" anahtarı) doğrudan okuyup, kullanıcı uygulamada hangi
 * temayı seçtiyse bu native ekranı da AYNI temada gösteriyoruz.
 *
 * VERİ YAZMA: Doğrudan `mesai-data-{ay}` anahtarına YAZMIYORUZ — bunun
 * yerine ayrı bir "quick-widget-pending" kuyruğuna ekliyoruz (bkz.
 * useOvertimeData.ts / processPendingWidgetEntries — uygulama açıkken kendi
 * state'iyle üzerine yazma riskini önlemek için).
 */
class QuickOvertimeActivity : Activity() {

    private lateinit var prefs: SharedPreferences
    private var win95Enabled = false

    private var selectedHours = DEFAULT_HOURS
    private var selectedMinutesIndex = DEFAULT_MINUTES_INDEX

    companion object {
        private const val ITEM_HEIGHT_DP = 44
        private const val MAX_HOURS = 16
        private val MINUTE_STEPS = intArrayOf(0, 15, 30, 45)
        private const val DEFAULT_HOURS = 2
        private const val DEFAULT_MINUTES_INDEX = 0
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        win95Enabled = prefs.getString("win95Enabled", "false") == "true"

        setContentView(
            if (win95Enabled) R.layout.activity_quick_overtime_win95
            else R.layout.activity_quick_overtime
        )

        setupDate()
        setupWheels()
        setupButtons()
    }

    private fun setupDate() {
        val dateView = findViewById<TextView>(R.id.quick_overtime_date)
        val locale = Locale("tr", "TR")
        val formatted = SimpleDateFormat("d MMMM yyyy, EEEE", locale).format(java.util.Date())
        dateView.text = formatted
    }

    private fun setupWheels() {
        val hoursLabels = (0..MAX_HOURS).map { it.toString() }
        val minutesLabels = MINUTE_STEPS.map { String.format(Locale.US, "%02d", it) }

        val activeColor = if (win95Enabled) 0xFF000080.toInt() else 0xFF3B82F6.toInt()
        val inactiveColor = 0xFFC0C5CE.toInt()

        buildWheel(
            scrollView = findViewById(R.id.hours_wheel_scroll),
            itemsContainer = findViewById(R.id.hours_wheel_items),
            labels = hoursLabels,
            initialIndex = selectedHours,
            activeColor = activeColor,
            inactiveColor = inactiveColor
        ) { index -> selectedHours = index }

        buildWheel(
            scrollView = findViewById(R.id.minutes_wheel_scroll),
            itemsContainer = findViewById(R.id.minutes_wheel_items),
            labels = minutesLabels,
            initialIndex = selectedMinutesIndex,
            activeColor = activeColor,
            inactiveColor = inactiveColor
        ) { index -> selectedMinutesIndex = index }
    }

    /**
     * Genel amaçlı kaydırmalı çark (wheel picker) kurucusu — web'deki
     * quick.html'in buildWheel() JS fonksiyonuyla birebir aynı mantık:
     * üstte/altta birer boş "pad" (ilk/son öğenin de ortalanabilmesi için),
     * kaydırma durunca en yakın öğeye "snap" (smoothScrollTo), o öğeyi
     * büyük+renkli, diğerlerini küçük+soluk göster, tıklayınca da direkt
     * o öğeye kaydır.
     */
    private fun buildWheel(
        scrollView: ScrollView,
        itemsContainer: LinearLayout,
        labels: List<String>,
        initialIndex: Int,
        activeColor: Int,
        inactiveColor: Int,
        onSettle: (Int) -> Unit
    ) {
        val density = resources.displayMetrics.density
        val itemHeightPx = (ITEM_HEIGHT_DP * density).roundToInt()

        itemsContainer.removeAllViews()
        itemsContainer.addView(spacerView(itemHeightPx))

        val itemViews = labels.map { label ->
            TextView(this).apply {
                text = label
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, itemHeightPx)
                typeface = if (win95Enabled) Typeface.MONOSPACE else Typeface.DEFAULT_BOLD
            }.also { itemsContainer.addView(it) }
        }

        itemsContainer.addView(spacerView(itemHeightPx))

        fun setActive(index: Int) {
            itemViews.forEachIndexed { i, tv ->
                if (i == index) {
                    tv.setTextColor(activeColor)
                    tv.textSize = 19f
                } else {
                    tv.setTextColor(inactiveColor)
                    tv.textSize = 14f
                }
            }
        }

        setActive(initialIndex)
        scrollView.post { scrollView.scrollTo(0, initialIndex * itemHeightPx) }

        val handler = Handler(Looper.getMainLooper())
        var pendingSettle: Runnable? = null

        scrollView.setOnScrollChangeListener { _, _, scrollY, _, _ ->
            pendingSettle?.let { handler.removeCallbacks(it) }
            val settleRunnable = Runnable {
                val index = (scrollY.toFloat() / itemHeightPx).roundToInt().coerceIn(0, labels.size - 1)
                scrollView.smoothScrollTo(0, index * itemHeightPx)
                setActive(index)
                onSettle(index)
            }
            pendingSettle = settleRunnable
            handler.postDelayed(settleRunnable, 90)
        }

        itemViews.forEachIndexed { index, tv ->
            tv.setOnClickListener {
                scrollView.smoothScrollTo(0, index * itemHeightPx)
                setActive(index)
                onSettle(index)
            }
        }
    }

    private fun spacerView(heightPx: Int): View = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, heightPx)
    }

    private fun setupButtons() {
        findViewById<Button>(R.id.quick_overtime_cancel_button).setOnClickListener { finish() }
        findViewById<Button>(R.id.quick_overtime_add_button).setOnClickListener { saveEntry() }

        if (win95Enabled) {
            findViewById<TextView>(R.id.quick_overtime_cancel_x)?.setOnClickListener { finish() }
        }
    }

    private fun saveEntry() {
        val hours = selectedHours
        val minutes = MINUTE_STEPS[selectedMinutesIndex]

        if (hours == 0 && minutes == 0) {
            Toast.makeText(this, getString(R.string.quick_overtime_toast_zero), Toast.LENGTH_SHORT).show()
            return
        }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date())

        val entry = JSONObject().apply {
            put("date", today)
            put("hours", hours)
            put("minutes", minutes)
        }

        val existingRaw = prefs.getString("quick-widget-pending", null)
        val pendingArray = if (existingRaw != null) JSONArray(existingRaw) else JSONArray()
        pendingArray.put(entry)

        prefs.edit()
            .putString("quick-widget-pending", pendingArray.toString())
            .apply()

        Toast.makeText(this, getString(R.string.quick_overtime_toast_added), Toast.LENGTH_SHORT).show()
        finish()
    }
}

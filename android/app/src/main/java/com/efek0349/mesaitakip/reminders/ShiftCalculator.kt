package com.efek0349.mesaitakip.reminders

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * ShiftCalculator
 *
 * src/utils/dateUtils.ts içindeki getShiftType / getEffectiveShiftTimes /
 * isSaturdayWorkday ve src/hooks/useSalarySettings.ts içindeki
 * getShiftSettingsForDate fonksiyonlarının BİREBİR native karşılığı.
 *
 * Neden burada tekrar yazıldı: Mesai bitiş hatırlatıcısı, uygulama hiç
 * açılmadan (arka planda, AlarmManager ile) her gün kendi kendine
 * yeniden kurulmak zorunda. WebView/JS çalışmadığı için o günün hangi
 * vardiya olduğunu ve bitiş saatini JS'e sormadan native olarak
 * hesaplayabilmemiz gerekiyor — MonthlyStatsCalculator.kt'nin "Bu Ay"
 * özetini native hesaplamasıyla AYNI gerekçe.
 *
 * ÖNEMLİ: JS tarafındaki mantık değişirse bu dosya da GÜNCELLENMELİDİR,
 * aksi halde iki taraf birbirinden sapar.
 */
object ShiftCalculator {
    private val dayFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    private fun parseDateKey(dateStr: String): Calendar {
        val cal = Calendar.getInstance()
        try {
            val parsed = dayFormat.parse(dateStr)
            if (parsed != null) cal.time = parsed
        } catch (e: Exception) { /* bugünü kullan */ }
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
        return cal
    }

    private fun dateKey(cal: Calendar): String = dayFormat.format(cal.time)

    /** getNormalizedShiftStartDate — o haftanın Pazartesi'si (00:00). */
    fun normalizedShiftStartDate(dateStr: String): Calendar {
        val cal = parseDateKey(dateStr)
        // Calendar.DAY_OF_WEEK: Pazar=1 ... Cumartesi=7. JS'teki (day===0?-6:1-day) ile aynı mantık.
        val jsDay = (cal.get(Calendar.DAY_OF_WEEK) - 1) // Pazar=0 ... Cumartesi=6
        val diff = if (jsDay == 0) -6 else 1 - jsDay
        cal.add(Calendar.DAY_OF_MONTH, diff)
        return cal
    }

    /** getShiftType — o hafta hangi vardiya. systemType: "2-shift"|"3-shift". */
    fun getShiftType(dateCal: Calendar, normalizedStart: Calendar, initialType: String, systemType: String): String {
        val diffDays = ((dateCal.timeInMillis - normalizedStart.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()
        if (diffDays < 0) return initialType
        val currentWeek = diffDays / 7

        return if (systemType == "3-shift") {
            val sequence = listOf("morning", "afternoon", "night")
            val startIndex = sequence.indexOf(initialType).let { if (it < 0) 0 else it }
            sequence[(startIndex + currentWeek).mod(3)]
        } else {
            val sequence = listOf("day", "night")
            val startIndex = sequence.indexOf(initialType).let { if (it < 0) 0 else it }
            sequence[(startIndex + currentWeek).mod(2)]
        }
    }

    /**
     * getShiftSettingsForDate — shiftHistory içinde, verilen tarihten önce
     * veya o tarihte başlamış EN YAKIN kaydı bulur; yoksa üst seviye
     * shiftStartDate/systemType/initialType'a düşer.
     */
    private fun shiftSettingsForDate(dateStr: String, settings: JSONObject): Triple<String, String, String>? {
        if (!settings.optBoolean("shiftSystemEnabled", false)) return null

        val history = settings.optJSONArray("shiftHistory")
        if (history != null) {
            var best: Triple<String, String, String>? = null
            for (i in 0 until history.length()) {
                val h = history.optJSONObject(i) ?: continue
                val startDate = h.optString("startDate", "")
                if (startDate.isNotEmpty() && startDate <= dateStr) {
                    // En büyük (en yakın/en yeni) startDate'i istiyoruz
                    if (best == null || startDate > best.third) {
                        best = Triple(h.optString("systemType", "2-shift"), h.optString("initialType", "day"), startDate)
                    }
                }
            }
            if (best != null) return best
        }

        val fallbackStart = settings.optString("shiftStartDate", "")
        if (fallbackStart.isEmpty()) return null
        return Triple(settings.optString("shiftSystemType", "2-shift"), settings.optString("shiftInitialType", "day"), fallbackStart)
    }

    /** addHoursToTime — "HH:mm" + ondalıklı saat -> "HH:mm" (gece yarısını sarar). */
    fun addHoursToTime(startTime: String, hours: Double): String {
        val parts = startTime.split(":")
        if (parts.size != 2) return startTime
        val h = parts[0].toIntOrNull() ?: return startTime
        val m = parts[1].toIntOrNull() ?: return startTime
        var totalMinutes = h * 60 + m + Math.round(hours * 60).toInt()
        totalMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
        val endH = totalMinutes / 60
        val endM = totalMinutes % 60
        return String.format(Locale.US, "%02d:%02d", endH, endM)
    }

    /** isSaturdayWorkday — cumartesi çalışma günü mü. */
    fun isSaturdayWorkday(settings: JSONObject): Boolean {
        if (settings.optBoolean("isSaturdayWorkManual", false)) {
            return settings.optBoolean("isSaturdayWork", false)
        }
        val start = settings.optString("defaultStartTime", "")
        val end = settings.optString("defaultEndTime", "")
        if (start.isEmpty() || end.isEmpty()) return false
        val gross = grossHours(start, end)
        return gross < 9.0
    }

    private fun grossHours(start: String, end: String): Double {
        val sp = start.split(":"); val ep = end.split(":")
        if (sp.size != 2 || ep.size != 2) return 0.0
        val startMin = (sp[0].toIntOrNull() ?: 0) * 60 + (sp[1].toIntOrNull() ?: 0)
        val endMin = (ep[0].toIntOrNull() ?: 0) * 60 + (ep[1].toIntOrNull() ?: 0)
        var diff = endMin - startMin
        if (diff < 0) diff += 24 * 60
        return diff / 60.0
    }

    /**
     * getEffectiveShiftTimes — o gün için geçerli başlangıç/bitiş saati.
     * Ayrıca o günün gerçekten bir ÇALIŞMA GÜNÜ olup olmadığını da
     * (isWorkday) döndürür: Pazartesi-Cuma her zaman, Cumartesi
     * isSaturdayWorkday()'e göre, Pazar asla.
     */
    data class EffectiveShift(val start: String, val end: String, val isWorkday: Boolean, val endCrossesMidnight: Boolean)

    fun getEffectiveShiftTimes(dateStr: String, settings: JSONObject): EffectiveShift {
        val dateCal = parseDateKey(dateStr)
        val dow = dateCal.get(Calendar.DAY_OF_WEEK) // Pazar=1, Cumartesi=7
        val shiftEnabled = settings.optBoolean("shiftSystemEnabled", false)
        // Sürekli/kesintisiz vardiya sistemlerinde (fabrikalar 7/24 çalışabilir)
        // Pazar da çalışma günü olabilir — kullanıcı bunu Ayarlar'da
        // "Pazar günleri de çalışılıyor" ile açıkça belirtmiş olmalı.
        // Varsayılan (false) önceki davranışı korur: Pazar hiç çalışılmaz.
        val shiftIncludesSunday = shiftEnabled && settings.optBoolean("shiftIncludesSunday", false)
        val isWorkday = when (dow) {
            Calendar.SUNDAY -> shiftIncludesSunday
            Calendar.SATURDAY -> isSaturdayWorkday(settings)
            else -> true
        }

        val defaultStart = settings.optString("defaultStartTime", "08:05")
        val defaultEnd = settings.optString("defaultEndTime", "18:05")

        fun crossesMidnight(start: String, hours: Double): Boolean {
            val parts = start.split(":")
            if (parts.size != 2) return false
            val h = parts[0].toIntOrNull() ?: return false
            val m = parts[1].toIntOrNull() ?: return false
            return (h * 60 + m + Math.round(hours * 60).toInt()) >= 24 * 60
        }

        if (!settings.optBoolean("shiftSystemEnabled", false)) {
            val defaultDailyHours = grossHours(defaultStart, defaultEnd)
            return EffectiveShift(defaultStart, defaultEnd, isWorkday, crossesMidnight(defaultStart, defaultDailyHours))
        }

        val shiftInfo = shiftSettingsForDate(dateStr, settings)
            ?: run {
                val defaultDailyHours = grossHours(defaultStart, defaultEnd)
                return EffectiveShift(defaultStart, defaultEnd, isWorkday, crossesMidnight(defaultStart, defaultDailyHours))
            }

        val (systemType, initialType, startDateStr) = shiftInfo
        val normalizedStart = normalizedShiftStartDate(startDateStr)
        val shiftType = getShiftType(dateCal, normalizedStart, initialType, systemType)

        val shiftStartTimes = settings.optJSONObject("shiftStartTimes")
        val customStart = shiftStartTimes?.optString(shiftType, "")?.takeIf { it.isNotEmpty() }
        val start = customStart ?: defaultStart
        // ÖNEMLİ: Bitiş saati BRÜT süreye (mola dahil, gerçek işten çıkış
        // anı) göre hesaplanır — dailyWorkingHours (Günlük Standart) DEĞİL,
        // çünkü o mola düşülmüş NET süre. Kişi molayı da işyerinde geçiriyor,
        // çıkış saati molayla erkene alınmıyor. (bkz. dateUtils.ts
        // getEffectiveShiftTimes ile birebir aynı düzeltme.)
        val shiftGrossHours = grossHours(defaultStart, defaultEnd).let { if (it <= 0.0) 9.0 else it }
        val end = addHoursToTime(start, shiftGrossHours)

        return EffectiveShift(start, end, isWorkday, crossesMidnight(start, shiftGrossHours))
    }
}

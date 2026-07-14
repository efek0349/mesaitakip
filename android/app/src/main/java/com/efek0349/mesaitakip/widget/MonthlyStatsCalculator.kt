package com.efek0349.mesaitakip.widget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

/**
 * MonthlyStatsCalculator — "Bu Ay" widget özetini (toplam mesai saati, net
 * mesai tutarı, net maaş) TAMAMEN NATIVE olarak hesaplar.
 *
 * NEDEN VAR: Önceki tasarım (WidgetSyncActivity), JS'in zaten hesapladığı
 * değeri "tek doğruluk kaynağı" olarak koruyup, görünmez bir WebView
 * penceresi açarak alıyordu. Ama bu, bazı cihazlarda/launcher'larda
 * bastırılamayan bir görev-geçiş flaşına (gri ekran) sebep oluyordu —
 * Activity açmanın kendisi, ne kadar "görünmez" yapılırsa yapılsın, OS
 * seviyesinde bir geçiş tetikliyor. Bu yüzden hesaplamayı BURAYA, saf
 * Kotlin'e taşıdık — artık hiçbir Activity/WebView açılmıyor.
 *
 * KAYNAK: src/hooks/useMonthlyStatsLogic.ts + useOvertimeData.ts +
 * useSalarySettings.ts + dateUtils.ts'in BİREBİR PORTU. JS tarafı
 * değiştiğinde bu dosyanın da güncellenmesi gerekir — aşağıdaki her
 * fonksiyonun yanında karşılık geldiği JS fonksiyonu not edildi.
 *
 * BİLİNÇLİ SADELEŞTİRME: Yol/yemek ücreti (allowance) hesaba KATILMIYOR
 * (JS'te de sadece "showMealInExport" açıksa toplama dahil oluyor, ve o
 * hesap tarih-bazlı history/arife nüanslarıyla çok karmaşık). Bu widget'ı
 * kullanan biri o ayarı açıksa, buradaki "net maaş" gerçek değerden biraz
 * düşük görünebilir — ana uygulamayı açtığında doğru değeri görür, bu
 * sadece hızlı bir widget önizlemesi.
 *
 * Tatil verisi (resmi/dini) için: JS tarafının zaten indirip
 * "CapacitorStorage" içine cache'lediği resmi_holidays_cache /
 * dini_holidays_cache anahtarlarını okuyoruz — ayrıca bir ağ isteği
 * ATMIYORUZ. Cache boşsa (hiç açılmamış taze kurulum gibi aşırı nadir bir
 * durum) tatil bilgisi olmadan hesaplıyoruz — o gün için normal mesai
 * oranı uygulanır, ana uygulama ilk açıldığında kendiliğinden düzelir.
 */
object MonthlyStatsCalculator {

    data class Result(
        val monthlyTotalHours: Double,
        val netOvertimePayment: Double,
        val finalEarnings: Double
    )

    private data class Entry(
        val date: String,
        val hours: Double,
        val minutes: Double,
        val type: String,
        val isFullDay: Boolean,
        val isPaid: Boolean?,
        val deductFromOvertime: Boolean,
        val workedHalfDay: Boolean
    ) {
        val totalHours: Double get() = hours + minutes / 60.0
    }

    private data class HolidayInfo(val isHalfDay: Boolean)

    private data class Settings(
        val monthlyGrossSalary: Double,
        val bonus: Double,
        val monthlyWorkingHours: Double,
        val dailyWorkingHours: Double,
        val weekdayMultiplier: Double,
        val saturdayMultiplier: Double,
        val sundayMultiplier: Double,
        val holidayMultiplier: Double,
        val deductBreakTime: Boolean,
        val isSaturdayWork: Boolean,
        val hasSalaryAttachment: Boolean,
        val salaryAttachmentRate: Double,
        val hasTES: Boolean,
        val tesRate: Double,
        val salaryHistory: JSONObject?
    )

    // ── JS: getMonthKey (dateUtils.ts) ──────────────────────────────────
    private fun monthKey(year: Int, month0: Int): String =
        "$year-${(month0 + 1).toString().padStart(2, '0')}"

    // ── JS: getDateKey (dateUtils.ts) ───────────────────────────────────
    private fun dateKey(cal: Calendar): String {
        val y = cal.get(Calendar.YEAR)
        val m = cal.get(Calendar.MONTH) + 1
        val d = cal.get(Calendar.DAY_OF_MONTH)
        return "$y-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}"
    }

    private fun parseDateKey(dateStr: String): Calendar {
        val parts = dateStr.split("-").map { it.toInt() }
        val cal = Calendar.getInstance()
        cal.clear()
        cal.set(parts[0], parts[1] - 1, parts[2])
        return cal
    }

    // ── JS: calculateEffectiveHours (dateUtils.ts) ──────────────────────
    private fun effectiveHours(totalHours: Double, deductBreakTime: Boolean): Double {
        if (!deductBreakTime) return totalHours
        if (totalHours >= 8) return totalHours - 1
        if (totalHours >= 4.1) return max(3.5, totalHours - 0.5)
        return totalHours
    }

    // ── JS: processPendingWidgetEntries (useOvertimeData.ts) ile AYNI
    // birleştirme mantığı — ama burada SADECE hesaplama için, kalıcı
    // veriye YAZMIYORUZ (kalıcı yazma hâlâ JS'in işi, uygulama bir sonraki
    // açılışında güvenle yapıyor). Tarih+tür eşleşirse mevcut kaydı
    // değiştirir, yoksa ekler. Saat/dakika ikisi de 0 ise (veya "delete"
    // bayrağı varsa) o tarihteki overtime kaydını LİSTEDEN ÇIKARIR — widget
    // üzerinden "günü sıfırlama" yapıldığında özet de (uygulama açılmadan)
    // anında güncellensin diye. ──
    private fun mergePendingWidgetEntries(prefs: android.content.SharedPreferences, monthlyData: MutableMap<String, List<Entry>>) {
        val raw = prefs.getString("quick-widget-pending", null) ?: return
        try {
            val pending = JSONArray(raw)
            for (i in 0 until pending.length()) {
                val p = pending.getJSONObject(i)
                val date = p.optString("date", "")
                if (date.isEmpty()) continue
                val hours = p.optDouble("hours", 0.0)
                val minutes = p.optDouble("minutes", 0.0)
                val mKey = date.substring(0, 7)
                val current = (monthlyData[mKey] ?: emptyList()).toMutableList()

                val isDeleteRequest = p.optBoolean("delete", false) || (hours == 0.0 && minutes == 0.0)
                if (isDeleteRequest) {
                    val filtered = current.filter { !(it.date == date && it.type == "overtime") }
                    monthlyData[mKey] = filtered
                    continue
                }

                val newEntry = Entry(
                    date = date,
                    hours = hours,
                    minutes = minutes,
                    type = "overtime",
                    isFullDay = false,
                    isPaid = null,
                    deductFromOvertime = false,
                    workedHalfDay = false
                )

                val existingIndex = current.indexOfFirst { it.date == newEntry.date && it.type == newEntry.type }
                if (existingIndex >= 0) current[existingIndex] = newEntry else current.add(newEntry)
                monthlyData[mKey] = current
            }
        } catch (e: Exception) {
            // Kuyruk okunamazsa/bozuksa sessizce yok say — mevcut kalıcı
            // veriyle hesaplamaya devam edilir.
        }
    }


    fun calculate(context: Context): Result {
        val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)

        val settings = loadSettings(prefs)

        val today = Calendar.getInstance()
        val year = today.get(Calendar.YEAR)
        val month0 = today.get(Calendar.MONTH)
        val curKey = monthKey(year, month0)

        // Hafta sonu Pazar mesaisi haftalık toplam saat kontrolü ay sınırını
        // aşabildiği için (bkz. calculateWeeklyHoursForSunday), önceki ve
        // sonraki ayın verisini de yüklüyoruz.
        val prevCal = Calendar.getInstance().apply { set(year, month0, 1); add(Calendar.MONTH, -1) }
        val nextCal = Calendar.getInstance().apply { set(year, month0, 1); add(Calendar.MONTH, 1) }
        val monthlyData = mutableMapOf<String, List<Entry>>()
        monthlyData[monthKey(prevCal.get(Calendar.YEAR), prevCal.get(Calendar.MONTH))] =
            loadMonthEntries(prefs, monthKey(prevCal.get(Calendar.YEAR), prevCal.get(Calendar.MONTH)))
        monthlyData[curKey] = loadMonthEntries(prefs, curKey)
        monthlyData[monthKey(nextCal.get(Calendar.YEAR), nextCal.get(Calendar.MONTH))] =
            loadMonthEntries(prefs, monthKey(nextCal.get(Calendar.YEAR), nextCal.get(Calendar.MONTH)))

        // ÖNEMLİ: "Ekle" ile eklenen kayıt bu ANDA henüz "mesai-data-{ay}"
        // içine YAZILMAMIŞ olabilir — güvenlik amacıyla önce ayrı bir
        // "quick-widget-pending" kuyruğuna yazılıyor (JS açılınca güvenle
        // birleştiriyor, bkz. useOvertimeData.ts). Bu yüzden burada da aynı
        // kuyruğu okuyup, henüz kalıcı veriye işlenmemiş kayıtları
        // hesaplama için GEÇİCİ OLARAK monthlyData'ya birleştiriyoruz —
        // yoksa "Ekle" sonrası özet hiç değişmiş gibi görünmezdi (native
        // hesap doğrudan mesai-data-{ay}'ı okuyup kuyruğu hiç görmezdi).
        mergePendingWidgetEntries(prefs, monthlyData)

        val monthEntries = monthlyData[curKey] ?: emptyList()
        val holidays = loadHolidays(prefs, year)

        // ── JS: getMonthlyTotal (useOvertimeData.ts) ────────────────────
        val monthlyTotal = monthEntries
            .filter { it.type != "leave" }
            .sumOf { effectiveHours(it.totalHours, settings.deductBreakTime) }

        // ── Aylık maaş (salaryHistory varsa o ay için geçerli değer) ────
        val monthSalary = salaryForMonth(settings, curKey)

        // ── JS: overtimeStats (useMonthlyStatsLogic.ts) ─────────────────
        var remainingMahsupHours = monthEntries
            .filter { it.type == "leave" && it.isPaid == false && it.deductFromOvertime }
            .sumOf { if (it.isFullDay) settings.dailyWorkingHours else it.totalHours }

        var leaveDeduction = 0.0
        val hourlyRate = hourlyRateForMonth(settings, monthSalary)

        for (e in monthEntries) {
            if (e.type == "leave") {
                val isPaid = e.isPaid ?: true
                if (!isPaid && !e.deductFromOvertime) {
                    val hours = if (e.isFullDay) settings.dailyWorkingHours else e.totalHours
                    leaveDeduction += hours * hourlyRate
                }
            }
        }

        data class OtEntry(val effHours: Double, val rate: Double, val isHoliday: Boolean, val isSunday: Boolean, val isNormal: Boolean)

        val overtimeEntries = monthEntries.filter { it.type == "overtime" }.map { e ->
            val entryCal = parseDateKey(e.date)
            val dow = entryCal.get(Calendar.DAY_OF_WEEK) // Calendar.SUNDAY=1 .. SATURDAY=7
            val holiday = holidays[e.date]
            val isHolidayDate = holiday != null
            val isSunday = dow == Calendar.SUNDAY

            val total = e.totalHours
            val eff = effectiveHours(total, settings.deductBreakTime)

            var weeklyHours: Double? = null
            if (isSunday && !isHolidayDate) {
                weeklyHours = weeklyHoursForSunday(entryCal, monthlyData, settings.isSaturdayWork, settings.dailyWorkingHours)
            }

            val rate = overtimeRate(hourlyRate, settings, isHolidayDate, dow, weeklyHours)

            OtEntry(eff, rate, isHolidayDate, isSunday && !isHolidayDate, !isHolidayDate && !isSunday)
        }

        var totalPayment = 0.0
        var normalHours = 0.0; var normalPayment = 0.0
        var sundayHours = 0.0; var sundayPayment = 0.0
        var holidayHours = 0.0; var holidayPayment = 0.0

        for (e in overtimeEntries) {
            val payment = e.effHours * e.rate
            totalPayment += payment
            if (e.isNormal) { normalHours += e.effHours; normalPayment += payment }
            else if (e.isSunday) { sundayHours += e.effHours; sundayPayment += payment }
            else if (e.isHoliday) { holidayHours += e.effHours; holidayPayment += payment }
        }

        var mahsupPayment = 0.0

        val normalEntries = overtimeEntries.filter { it.isNormal }
        for (e in normalEntries) {
            val deduct = min(e.effHours, remainingMahsupHours)
            if (deduct > 0) {
                mahsupPayment += deduct * e.rate
                remainingMahsupHours -= deduct
            }
        }
        if (remainingMahsupHours > 0) {
            for (e in overtimeEntries.filter { it.isSunday }) {
                val deduct = min(e.effHours, remainingMahsupHours)
                if (deduct > 0) {
                    mahsupPayment += deduct * e.rate
                    remainingMahsupHours -= deduct
                }
            }
        }
        if (remainingMahsupHours > 0) {
            for (e in overtimeEntries.filter { it.isHoliday }) {
                val deduct = min(e.effHours, remainingMahsupHours)
                if (deduct > 0) {
                    mahsupPayment += deduct * e.rate
                    remainingMahsupHours -= deduct
                }
            }
        }
        if (remainingMahsupHours > 0) {
            mahsupPayment += remainingMahsupHours * hourlyRate
        }

        val netOvertimePayment = max(0.0, totalPayment - mahsupPayment)

        // ── JS: finalEarnings (useMonthlyStatsLogic.ts) ─────────────────
        val salaryBase = monthSalary.first - leaveDeduction // monthlyGrossSalary - leave.deduction
        val salarySum = salaryBase + monthSalary.second // + bonus

        val tesRate = if (settings.hasTES) settings.tesRate else 0.0
        val tesDeduction = if (settings.hasTES) salarySum * (tesRate / 100.0) else 0.0

        // Yol/yemek ücreti KASITLI OLARAK dahil edilmiyor — bkz. dosya başı not.
        val effectiveAllowance = 0.0

        val totalBeforeAttachment = (salarySum - tesDeduction) + netOvertimePayment + effectiveAllowance
        val attachmentRate = settings.salaryAttachmentRate
        val attachmentDeduction = if (settings.hasSalaryAttachment) totalBeforeAttachment * (attachmentRate / 100.0) else 0.0
        val finalEarnings = totalBeforeAttachment - attachmentDeduction

        return Result(monthlyTotal, netOvertimePayment, finalEarnings)
    }

    // ── JS: getOvertimeRate (useSalarySettings.ts) ──────────────────────
    private fun overtimeRate(grossHourlyRate: Double, s: Settings, isHoliday: Boolean, dayOfWeek: Int, weeklyHours: Double?): Double {
        if (grossHourlyRate == 0.0) return 0.0
        var multiplier = s.weekdayMultiplier
        if (isHoliday) {
            multiplier = s.holidayMultiplier
        } else if (dayOfWeek == Calendar.SUNDAY) {
            multiplier = if (weeklyHours != null && weeklyHours < 45) 2.0 else s.sundayMultiplier
        } else if (dayOfWeek == Calendar.SATURDAY) {
            multiplier = s.saturdayMultiplier
        }
        return max(0.0, grossHourlyRate * multiplier)
    }

    // ── JS: calculateWeeklyHoursForSunday (dateUtils.ts) ────────────────
    private fun weeklyHoursForSunday(sunday: Calendar, monthlyData: Map<String, List<Entry>>, isSaturdayWork: Boolean, dailyWorkingHours: Double): Double {
        // JS: Pazartesi'den başlayan 6 günlük (Pzt..Cmt) hafta
        val dow = sunday.get(Calendar.DAY_OF_WEEK) // SUNDAY=1
        val diffToMonday = if (dow == Calendar.SUNDAY) -6 else (Calendar.MONDAY - dow)
        val monday = (sunday.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, diffToMonday) }

        var total = 0.0
        for (i in 0 until 6) {
            val day = (monday.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, i) }
            val dKey = dateKey(day)
            val mKey = monthKey(day.get(Calendar.YEAR), day.get(Calendar.MONTH))
            val dayEntries = (monthlyData[mKey] ?: emptyList()).filter { it.date == dKey }

            val overtimeEntry = dayEntries.find { it.type == "overtime" }
            val leaveEntry = dayEntries.find { it.type == "leave" }

            val isSaturday = day.get(Calendar.DAY_OF_WEEK) == Calendar.SATURDAY
            val isStandardWorkDay = if (isSaturdayWork) true else !isSaturday

            var dayWorkedHours = 0.0
            if (isStandardWorkDay) {
                dayWorkedHours = dailyWorkingHours
                if (leaveEntry != null) {
                    dayWorkedHours = if (leaveEntry.isFullDay) 0.0 else max(0.0, dayWorkedHours - leaveEntry.totalHours)
                }
            }
            if (overtimeEntry != null) {
                dayWorkedHours += overtimeEntry.totalHours
            }
            total += dayWorkedHours
        }
        return total
    }

    // ── JS: getHourlyRate (useSalarySettings.ts) — sadece BU AY için ───
    private fun hourlyRateForMonth(s: Settings, monthSalary: Pair<Double, Double>): Double {
        if (s.monthlyWorkingHours <= 0) return 0.0
        return monthSalary.first / s.monthlyWorkingHours
    }

    // ── JS: getSalaryForDate (useSalarySettings.ts) — Pair(gross, bonus) ─
    private fun salaryForMonth(s: Settings, monthKey: String): Pair<Double, Double> {
        val history = s.salaryHistory
        if (history != null && history.has(monthKey)) {
            val entry = history.getJSONObject(monthKey)
            return Pair(entry.optDouble("monthlyGrossSalary", s.monthlyGrossSalary), entry.optDouble("bonus", s.bonus))
        }
        if (history != null) {
            // JS: sortedSalaryKeys (azalan) içinde monthKey'e eşit veya küçük ilk anahtar
            val keys = history.keys().asSequence().toList().sortedDescending()
            val found = keys.find { it <= monthKey }
            if (found != null) {
                val entry = history.getJSONObject(found)
                return Pair(entry.optDouble("monthlyGrossSalary", s.monthlyGrossSalary), entry.optDouble("bonus", s.bonus))
            }
        }
        return Pair(s.monthlyGrossSalary, s.bonus)
    }

    private fun loadSettings(prefs: android.content.SharedPreferences): Settings {
        val raw = prefs.getString("mesai-salary-settings", null)
        val json = if (raw != null) JSONObject(raw) else JSONObject()

        return Settings(
            monthlyGrossSalary = json.optDouble("monthlyGrossSalary", 28075.50),
            bonus = json.optDouble("bonus", 0.0),
            monthlyWorkingHours = json.optDouble("monthlyWorkingHours", 225.0),
            dailyWorkingHours = json.optDouble("dailyWorkingHours", 9.0),
            weekdayMultiplier = json.optDouble("weekdayMultiplier", 1.5),
            saturdayMultiplier = json.optDouble("saturdayMultiplier", 1.5),
            sundayMultiplier = json.optDouble("sundayMultiplier", 2.5),
            holidayMultiplier = json.optDouble("holidayMultiplier", 2.0),
            deductBreakTime = json.optBoolean("deductBreakTime", true),
            isSaturdayWork = resolveIsSaturdayWork(json),
            hasSalaryAttachment = json.optBoolean("hasSalaryAttachment", false),
            salaryAttachmentRate = json.optDouble("salaryAttachmentRate", 25.0),
            hasTES = json.optBoolean("hasTES", false),
            tesRate = json.optDouble("tesRate", 3.0),
            salaryHistory = json.optJSONObject("salaryHistory")
        )
    }

    // ── JS: isSaturdayWorkday (dateUtils.ts) ────────────────────────────
    private fun resolveIsSaturdayWork(json: JSONObject): Boolean {
        if (json.optBoolean("isSaturdayWorkManual", false)) {
            return json.optBoolean("isSaturdayWork", false)
        }
        val start = json.optString("defaultStartTime", "")
        val end = json.optString("defaultEndTime", "")
        if (start.isEmpty() || end.isEmpty()) return false
        val grossHours = grossHoursBetween(start, end)
        return grossHours < 9
    }

    // ── JS: calculateDailyGrossHours (dateUtils.ts) ─────────────────────
    private fun grossHoursBetween(start: String, end: String): Double {
        val (sh, sm) = start.split(":").map { it.toInt() }
        val (eh, em) = end.split(":").map { it.toInt() }
        var diff = (eh * 60 + em) - (sh * 60 + sm)
        if (diff < 0) diff += 24 * 60
        return diff / 60.0
    }

    private fun loadMonthEntries(prefs: android.content.SharedPreferences, key: String): List<Entry> {
        val raw = prefs.getString("mesai-data-$key", null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Entry(
                    date = o.optString("date", ""),
                    hours = o.optDouble("hours", 0.0),
                    minutes = o.optDouble("minutes", 0.0),
                    type = o.optString("type", "overtime"),
                    isFullDay = o.optBoolean("isFullDay", false),
                    isPaid = if (o.has("isPaid") && !o.isNull("isPaid")) o.optBoolean("isPaid") else null,
                    deductFromOvertime = o.optBoolean("deductFromOvertime", false),
                    workedHalfDay = o.optBoolean("workedHalfDay", false)
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    // ── JS: resmi_holidays_cache / dini_holidays_cache — zaten JS'in
    // indirip cache'lediği veriyi okuyoruz, ayrıca ağ isteği ATMIYORUZ. ──
    private fun loadHolidays(prefs: android.content.SharedPreferences, year: Int): Map<String, HolidayInfo> {
        val map = mutableMapOf<String, HolidayInfo>()

        fun mergeFrom(cacheKey: String) {
            val raw = prefs.getString(cacheKey, null) ?: return
            try {
                val parsed = JSONObject(raw)
                val arr = parsed.optJSONArray("holidays") ?: return
                for (i in 0 until arr.length()) {
                    val h = arr.getJSONObject(i)
                    val date = h.optString("date", "")
                    if (date.startsWith("$year-")) {
                        map[date] = HolidayInfo(isHalfDay = h.optBoolean("isHalfDay", false))
                    }
                }
            } catch (e: Exception) {
                // Cache bozuksa/boşsa sessizce yok say — tatilsiz hesaplanır.
            }
        }

        // JS'teki öncelik sırasıyla aynı: resmi tam gün > yarım gün.
        mergeFrom("resmi_holidays_cache")
        mergeFrom("dini_holidays_cache")

        return map
    }
}

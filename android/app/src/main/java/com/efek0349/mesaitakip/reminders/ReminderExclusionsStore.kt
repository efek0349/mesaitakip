package com.efek0349.mesaitakip.reminders

import android.content.Context
import org.json.JSONArray

/**
 * ReminderExclusionsStore
 *
 * JS'in (App.tsx → reminderExclusions.ts) gönderdiği "bu tarihlerde
 * hatırlatma gösterme" listesini düz bir SharedPreferences kaydı olarak
 * tutar. Tatil/izin mantığının kendisi (online tatil listeleri, kullanıcının
 * özel tatilleri, izin kayıtları) tamamen JS tarafında hesaplanıyor — burada
 * sadece sonucu okuyoruz.
 */
object ReminderExclusionsStore {
    private const val PREFS_NAME = "ReminderExclusionsState"
    private const val KEY_DATES = "dates"

    fun save(context: Context, dates: List<String>) {
        val json = JSONArray(dates)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_DATES, json.toString())
            .apply()
    }

    fun isExcluded(context: Context, dateStr: String): Boolean {
        return try {
            val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_DATES, null) ?: return false
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                if (arr.optString(i) == dateStr) return true
            }
            false
        } catch (e: Exception) {
            false
        }
    }
}

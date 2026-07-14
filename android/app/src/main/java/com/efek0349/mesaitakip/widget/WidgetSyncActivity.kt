package com.efek0349.mesaitakip.widget

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.efek0349.mesaitakip.plugins.WidgetUpdatePlugin
import com.getcapacitor.BridgeActivity

/**
 * WidgetSyncActivity — "Bu Ay" widget özetini (saat / net mesai / net
 * maaş), kullanıcı uygulamayı hiç AÇMADAN, hiçbir şey GÖRMEDEN arka planda
 * güncellemek için kullanılan görünmez pencere.
 *
 * NEDEN GEREKLİ: bu özetin hesabı (fazla mesai ücreti, tatil/hafta sonu
 * çarpanları, gelir vergisi dilimi, icra kesintisi vb. — bkz.
 * useMonthlyStatsLogic.ts) native tarafta BİR DAHA YAZILMADI; JS zaten
 * hesapladığı değeri tek doğruluk kaynağı olarak koruyor (bkz.
 * useWidgetSummarySync.ts'deki açıklama). Bu yüzden "anlık" güncelleme
 * için JS'in AYNI kodunu, kullanıcıya görünmeden, kendi bağımsız
 * WebView/Capacitor bridge örneğinde çalıştırıyoruz.
 *
 * NEDEN MainActivity DEĞİL: MainActivity launchMode="singleTask" —
 * kullanıcı uygulamayı o an açıkken bu senkronizasyon için tekrar
 * tetiklenirse mevcut ekranını öne getirip kullanıcıyı bölerdi. Bu yüzden
 * tamamen ayrı, saydam (bkz. WidgetSyncInvisibleTheme), recents/geçmişten
 * hariç tutulan bağımsız bir BridgeActivity kullanıyoruz.
 *
 * AKIŞ:
 * 1) MesaiWidgetProvider.confirmEntry() — "CapacitorStorage" içine
 *    "silent-sync-pending"="true" yazıp bu Activity'yi başlatıyor.
 * 2) main.tsx açılışta bu bayrağı okuyup <SilentSync/> (App yerine)
 *    render ediyor — processPendingWidgetEntries + useWidgetSummarySync
 *    aynı üretim kodu üzerinden çalışıp widget'ı günceller.
 * 3) JS işi bitince WidgetUpdate.silentSyncDone() çağırır →
 *    WidgetUpdatePlugin bu Activity'yi finish() eder.
 *
 * GÜVENLİK AĞI: JS herhangi bir nedenle (hata, beklenmeyen durum, offline
 * vb.) hiç yanıt vermezse SAFETY_TIMEOUT_MS sonunda Activity kendiliğinden
 * kapanır — arka planda sonsuza kadar açık, görünmez bir pencere kalmaz.
 */
class WidgetSyncActivity : BridgeActivity() {

    companion object {
        private const val SAFETY_TIMEOUT_MS = 8000L
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(WidgetUpdatePlugin::class.java)
        super.onCreate(savedInstanceState)

        Handler(Looper.getMainLooper()).postDelayed({
            if (!isFinishing && !isDestroyed) finish()
        }, SAFETY_TIMEOUT_MS)
    }
}

import { useEffect, useRef } from 'react';
import { useOvertimeData } from './hooks/useOvertimeData';
import { useWidgetSummarySync } from './hooks/useWidgetSummarySync';
import { WidgetUpdate } from './utils/widgetUpdate';

/**
 * SilentSync — WidgetSyncActivity'nin görünmez WebView'ında, tam <App/>
 * yerine render edilir. Hiçbir UI göstermez; TEK işi, widget'ın "Ekle"
 * butonuyla eklediği kaydı (quick-widget-pending kuyruğu) normal
 * uygulamayla BİREBİR AYNI kod yoluyla işleyip "Bu Ay" özetini yeniden
 * hesaplatıp native widget'a yazdırmak.
 *
 * NASIL: `useOvertimeData()` mount olur olmaz `loadGlobalData()`'yı
 * tetikler (bu da içinde `processPendingWidgetEntries()`'i çağırıyor —
 * bkz. useOvertimeData.ts), `isLoaded` true olunca veri + bekleyen kayıt
 * işlenmiş demektir. `useWidgetSummarySync()` zaten kendi effect'i içinde
 * `useMonthlyStatsLogic`'ten gelen güncel değerleri native'e
 * (`WidgetUpdate.updateSummary`) yazıyor — burada hesaplama mantığını BİR
 * DAHA YAZMIYORUZ, sadece aynı üretim hook'larını tetikliyoruz.
 *
 * NEDEN KISA GECİKME: `isLoaded` true olduğu anda `useSalarySettings` /
 * `useHolidays` gibi bağımlı hook'lar teorik olarak henüz son (network/
 * fallback sonrası) değerine ulaşmamış olabilir; `useWidgetSummarySync`
 * değerler değiştikçe zaten yeniden çalışıp native'e SON doğru değeri
 * gönderiyor (native her zaman en son yazılanı gösterir), ama görünmez
 * pencereyi çok erken kapatıp o son güncellemeyi kaçırmamak için native'e
 * "bitti" sinyalini göndermeden önce kısa bir tampon süre bırakıyoruz.
 */
export default function SilentSync() {
  const { isLoaded } = useOvertimeData();
  useWidgetSummarySync();

  const doneRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || doneRef.current) return;

    const timer = setTimeout(() => {
      doneRef.current = true;
      WidgetUpdate.silentSyncDone().catch(() => {
        // Native'e ulaşamasak bile WidgetSyncActivity'nin kendi güvenlik
        // zaman aşımı (SAFETY_TIMEOUT_MS) pencereyi kapatacak.
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  return null;
}

import { useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMonthlyStatsLogic } from './useMonthlyStatsLogic';
import { WidgetUpdate } from '../utils/widgetUpdate';

// Widget'a özel saat biçimi: "47s 30dk" yerine "47:30" (klasik saat/kadran
// okuması) — global `formatHours`'a KASITLI OLARAK dokunmuyoruz, o
// uygulamanın başka birçok yerinde ("s"/"dk" harfleriyle) kullanılıyor.
// Widget'ta "s" harfi yerine layout'ta statik bir 🕐 ikonu var (bkz.
// widget_quick_overtime.xml / _win95.xml), o yüzden buradaki metnin ayrı
// bir birim harfine ihtiyacı yok — sadece "saat:dakika" formatı yeterli.
const formatWidgetHours = (totalHours: number): string => {
  const hours = Math.max(0, Math.floor(totalHours));
  const minutes = Math.max(0, Math.round((totalHours - hours) * 60));
  if (minutes === 0) return `${hours}`;
  return `${hours}:${String(minutes).padStart(2, '0')} dk`;
};

/**
 * useWidgetSummarySync — ana ekrandaki salt-okunur "Bu Ay" özet widget'ını
 * (bkz. android/.../widget/MesaiSummaryWidgetProvider.kt) her zaman GÜNCEL
 * tutar.
 *
 * NEDEN NATIVE TARAFTA YENİDEN HESAPLAMIYORUZ: aylık net kazanç hesabı (fazla
 * mesai ücreti, izin/tatil mahsubu, gelir vergisi dilimi, icra kesintisi vb.)
 * `useMonthlyStatsLogic` içinde epey karmaşık — bunu Kotlin'de bir daha
 * yazmak hem bakım yükü hem de iki tarafın senkron kalmama riski demek. Bunun
 * yerine JS zaten hesapladığı değeri (tek doğruluk kaynağı burası) native
 * tarafa BASİT bir metin olarak gönderiyor; native taraf sadece görüntülüyor.
 *
 * NEDEN `currentDate` DEĞİL SABİT `today`: kullanıcı takvimde geçmiş/gelecek
 * aylara gezinirken widget'ın o an ekranda gezinilen ayı değil, HER ZAMAN
 * gerçek "bu ay"ı göstermesi gerekiyor — bu yüzden `useMonthlyStatsLogic`'i
 * bağımsız, sabit `new Date()` ile ayrıca çağırıyoruz (aynı desen
 * MonthlyStats'taki "Yaklaşan Tatiller" bloğunda da kullanılıyor).
 */
export function useWidgetSummarySync() {
  const today = useMemo(() => new Date(), []);
  const { monthlyTotal, finalEarnings, netOvertimePayment } = useMonthlyStatsLogic(today);
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    if (!Number.isFinite(monthlyTotal) || !Number.isFinite(finalEarnings) || !Number.isFinite(netOvertimePayment)) return;

    const hoursText = formatWidgetHours(monthlyTotal);
    const amountText = `₺${Math.round(finalEarnings).toLocaleString('tr-TR')}`;
    const overtimeAmountText = `₺${Math.round(netOvertimePayment).toLocaleString('tr-TR')}`;

    // Aynı değeri art arda göndermeyelim (gereksiz native çağrı/broadcast).
    const signature = `${hoursText}|${amountText}|${overtimeAmountText}`;
    if (lastSentRef.current === signature) return;
    lastSentRef.current = signature;

    WidgetUpdate.updateSummary({ hoursText, amountText, overtimeAmountText }).catch((error) => {
      console.error('Widget özet güncelleme hatası:', error);
    });
  }, [monthlyTotal, finalEarnings, netOvertimePayment]);
}

import React from 'react';
import { Frame, Button } from '@react95/core';
import { formatHours, TURKISH_MONTHS } from '../../utils/dateUtils';
import { YEARLY_LIMIT_HOURS } from '../../constants';
import { useMonthlyStatsLogic } from '../../hooks/useMonthlyStatsLogic';

interface MonthlyStatsWin95Props {
  currentDate: Date;
  onOpenSettings: () => void;
  onOpenDataBackup: () => void;
}

/**
 * MonthlyStatsWin95 — aylık özet panelinin Win95 görünümü.
 *
 * Tasarım kararı: orijinal Tailwind versiyonu gradient kartlar ("Mesai
 * Kartı" mavi, "Net Kazanç Kartı" yeşil gradient) kullanıyordu. Win95'te
 * bunun karşılığı: iki Frame paneli yan yana, boxShadow "out" ile kabarık
 * panel hissi, sayısal değerler net/kalın yazı tipiyle vurgulanmış.
 * Detay bölümleri (Mesai Dökümü / Kıdem Tazminatı) Win95 Button ile
 * açılıp kapanan basit toggle panelleri.
 */
export const MonthlyStatsWin95: React.FC<MonthlyStatsWin95Props> = ({ currentDate }) => {
  const {
    isLoading,
    year, month,
    monthlyTotal, yearlyTotal, isOverLimit,
    overtimeStats, allowanceData, severanceData,
    bonus, salaryBase,
    currentTesRate, tesDeduction,
    netOvertimePayment, netOvertimeHours,
    attachmentRate, attachmentDeduction, finalEarnings,
    settings,
    showLimitInfo, setShowLimitInfo,
    showSeveranceDetails, setShowSeveranceDetails,
    showOvertimeDetails, setShowOvertimeDetails,
  } = useMonthlyStatsLogic(currentDate);

  if (isLoading) {
    return (
      <div style={{ padding: 8 }}>
        <p style={{ fontSize: '0.6875rem', textAlign: 'center', padding: 16, color: '#1a1a1a' }}>Yükleniyor...</p>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    // Kendi pencere çerçevesi YOK — App.tsx'teki tek "Mesai Takip" ana
    // penceresinin doğrudan içeriği olarak render edilir (CalendarWin95 ile
    // aynı gri zeminde, takvimin altında). Tüm metin renkleri burada
    // EXPLICIT olarak belirtiliyor (#1a1a1a) — varsayılan/tema renklerine
    // güvenmek, açık temada "arka planın yazısı gibi" okunmaz beyaz metin
    // sorununa yol açıyordu.
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>
        {TURKISH_MONTHS[month]} {year} Özeti
      </div>

      {/* İki panel: Mesai + Net Kazanç */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <Frame boxShadow="in" style={{ padding: 6, color: '#1a1a1a' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 700, marginBottom: 4 }}>TOPLAM MESAİ</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, textAlign: 'right', marginBottom: 6 }}>{formatHours(monthlyTotal)}</div>

          {overtimeStats.mahsup.hours > 0 && (
            <div style={{ fontSize: '0.5625rem', marginBottom: 4, borderTop: '1px dashed #868a8e', paddingTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mahsup</span>
                <span>-{formatHours(overtimeStats.mahsup.hours)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Kalan</span>
                <span>{formatHours(netOvertimeHours)}</span>
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowLimitInfo(true)}
            style={{ width: '100%', fontSize: '0.5625rem', padding: '4px 2px', marginBottom: 4 }}
          >
            {formatHours(yearlyTotal).replace(' s', 's')} (Yıllık) {isOverLimit ? '⚠' : ''}
          </Button>

          <div style={{ fontSize: '0.5625rem' }}>{allowanceData.netTotalWorkingDays} İş Günü</div>
        </Frame>

        <Frame boxShadow="in" style={{ padding: 6, color: '#1a1a1a' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 700, marginBottom: 4 }}>NET KAZANÇ</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, textAlign: 'right', marginBottom: 6 }}>₺{fmt(finalEarnings)}</div>

          <div style={{ fontSize: '0.5625rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Mesai (Net)</span>
              <span style={{ fontWeight: 700 }}>₺{fmt(netOvertimePayment)}</span>
            </div>
            {allowanceData.total > 0 && settings.showMealInExport && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #868a8e', paddingTop: 2 }}>
                <span>Yol/Yem</span>
                <span style={{ fontWeight: 700 }}>₺{fmt(allowanceData.total)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #868a8e', paddingTop: 2 }}>
              <span>Maaş</span>
              <span style={{ fontWeight: 700 }}>₺{fmt(salaryBase)}</span>
            </div>
            {bonus > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #868a8e', paddingTop: 2 }}>
                <span>Prim</span>
                <span style={{ fontWeight: 700 }}>₺{fmt(bonus)}</span>
              </div>
            )}
            {overtimeStats.leave.hours > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #868a8e', paddingTop: 2 }}>
                <span>İzin</span>
                <span style={{ fontWeight: 700 }}>-₺{fmt(overtimeStats.leave.deduction)}</span>
              </div>
            )}
            {tesDeduction > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #868a8e', paddingTop: 2 }}>
                <span>TES (%{currentTesRate})</span>
                <span style={{ fontWeight: 700 }}>-₺{fmt(tesDeduction)}</span>
              </div>
            )}
            {attachmentDeduction > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #868a8e', paddingTop: 2 }}>
                <span>HACİZ (%{attachmentRate})</span>
                <span style={{ fontWeight: 700 }}>-₺{fmt(attachmentDeduction)}</span>
              </div>
            )}
          </div>
        </Frame>
      </div>

      {/* İlerleme çubuğu */}
      <Frame boxShadow="in" style={{ padding: 6, color: '#1a1a1a', marginBottom: 8 }}>
        <div style={{ position: 'relative', height: 16, border: '1px solid #868a8e', marginBottom: 4 }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, allowanceData.completionPercentage)}%`,
            backgroundColor: '#000e7a',
          }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: '#ffffff', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
            {allowanceData.totalRequiredHours} / {Math.round(allowanceData.workedHoursOnStandardDays)} SAAT
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5625rem', fontWeight: 700 }}>
          <span>ÇALIŞMA GÜNÜ: {allowanceData.workedDays}</span>
          <span>%{Math.round(allowanceData.completionPercentage)}</span>
        </div>
      </Frame>

      {/* Detay sekmeleri */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <Button
          onClick={() => { setShowOvertimeDetails(!showOvertimeDetails); setShowSeveranceDetails(false); }}
          style={{
            flex: 1, fontSize: '0.625rem', padding: '6px 4px',
            backgroundColor: showOvertimeDetails ? '#000e7a' : undefined,
            color: showOvertimeDetails ? '#ffffff' : '#1a1a1a',
          }}
        >
          Mesai Detay {showOvertimeDetails ? '▲' : '▼'}
        </Button>
        {settings.showSeverancePay && severanceData?.eligible && (
          <Button
            onClick={() => { setShowSeveranceDetails(!showSeveranceDetails); setShowOvertimeDetails(false); }}
            style={{
              flex: 1, fontSize: '0.625rem', padding: '6px 4px',
              backgroundColor: showSeveranceDetails ? '#000e7a' : undefined,
              color: showSeveranceDetails ? '#ffffff' : '#1a1a1a',
            }}
          >
            Kıdem Tazm. {showSeveranceDetails ? '▲' : '▼'}
          </Button>
        )}
      </div>

      {/* Mesai dökümü */}
      {showOvertimeDetails && (
        <Frame boxShadow="in" style={{ padding: 6, color: '#1a1a1a', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {overtimeStats.normal.hours > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
              <span>Haftaiçi Mesailer ({settings.weekdayMultiplier}x)</span>
              <span style={{ fontWeight: 700 }}>{formatHours(overtimeStats.normal.hours)} / ₺{fmt(overtimeStats.normal.payment)}</span>
            </div>
          )}
          {overtimeStats.sunday.hours > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
              <span>Pazar Mesaileri ({settings.sundayMultiplier}x)</span>
              <span style={{ fontWeight: 700 }}>{formatHours(overtimeStats.sunday.hours)} / ₺{fmt(overtimeStats.sunday.payment)}</span>
            </div>
          )}
          {overtimeStats.holiday.hours > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
              <span>Dini &amp; Resmi Tatil ({settings.holidayMultiplier}x)</span>
              <span style={{ fontWeight: 700 }}>{formatHours(overtimeStats.holiday.hours)} / ₺{fmt(overtimeStats.holiday.payment)}</span>
            </div>
          )}
          {overtimeStats.mahsup.hours > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
              <span>Mesaiden Mahsup</span>
              <span style={{ fontWeight: 700 }}>{formatHours(overtimeStats.mahsup.hours)} / -₺{fmt(overtimeStats.mahsup.payment)}</span>
            </div>
          )}
          {overtimeStats.leave.hours > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
              <span>Ücretsiz İzin / Kesinti</span>
              <span style={{ fontWeight: 700 }}>{formatHours(overtimeStats.leave.hours)} / -₺{fmt(overtimeStats.leave.deduction)}</span>
            </div>
          )}
          {overtimeStats.normal.hours === 0 && overtimeStats.sunday.hours === 0 && overtimeStats.holiday.hours === 0 && overtimeStats.leave.hours === 0 && (
            <p style={{ fontSize: '0.625rem', textAlign: 'center', padding: 8 }}>Henüz mesai kaydı bulunmuyor</p>
          )}
        </Frame>
      )}

      {/* Kıdem tazminatı detayı */}
      {showSeveranceDetails && severanceData && (
        <Frame boxShadow="in" style={{ padding: 6, color: '#1a1a1a', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
            <span>Kıdem Detayları</span>
            <span style={{ fontWeight: 700 }}>{severanceData.years} YIL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', borderTop: '1px dashed #868a8e', paddingTop: 4 }}>
            <span>Yıllık Tutar</span>
            <span style={{ fontWeight: 700 }}>₺{fmt(severanceData.netSeverance)}</span>
          </div>
          {(severanceData.months > 0 || severanceData.days > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
              <span>
                +{severanceData.months > 0 ? `${severanceData.months} AY ` : ''}{severanceData.days > 0 ? `${severanceData.days} GÜN ` : ''}EKSTRA
              </span>
              <span style={{ fontWeight: 700 }}>₺{fmt(severanceData.monthNetSeverance + severanceData.dayNetSeverance)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5625rem', borderTop: '1px dashed #868a8e', paddingTop: 4 }}>
            <span>Damga Vergisi Kesintisi</span>
            <span>-₺{severanceData.totalStampTax.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', fontWeight: 700, borderTop: '1px solid #868a8e', paddingTop: 4 }}>
            <span>Toplam Net</span>
            <span>₺{fmt(severanceData.totalNetSeverance)}</span>
          </div>
        </Frame>
      )}

      {/* Yasal sınır bilgi modalı — gerçek bir Win95 pencere görünümü:
          TitleBar + beyaz zemin + gri çerçeve, "açılmış bir pencere" hissi
          için. Önceki halinde Frame'in arka planı belirsiz/şeffaf kalıyordu. */}
      {showLimitInfo && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowLimitInfo(false)}
        >
          <div
            style={{ width: 260, border: '2px solid #868a8e', backgroundColor: '#ffffff', boxShadow: '2px 2px 6px rgba(0,0,0,0.4)' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div style={{ backgroundColor: '#000e7a', color: '#ffffff', padding: '4px 8px', fontSize: '0.6875rem', fontWeight: 700 }}>
              Yasal Sınır
            </div>
            <div style={{ padding: 16, textAlign: 'center' }}>
              <p style={{ fontSize: '0.6875rem', marginBottom: 12, color: '#1a1a1a' }}>
                İş Kanunu'nun 41'nci maddesinde, yıllık fazla çalışma süresinin bir yılda <b>{YEARLY_LIMIT_HOURS} saati</b> aşamayacağı belirtilmiştir!
              </p>
              <Button onClick={() => setShowLimitInfo(false)} style={{ width: '100%', color: '#1a1a1a' }}>ANLADIM</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

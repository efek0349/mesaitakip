import React from 'react';
import { Frame, Button } from '@react95/core';
import { TURKISH_MONTHS, TURKISH_DAYS, formatHours, calculateEffectiveHours, getShiftType } from '../../utils/dateUtils';
import { Holiday, OvertimeEntry, calcTotalHours, ShiftSystemType, ShiftType } from '../../types/overtime';
import { useCalendarLogic } from '../../hooks/useCalendarLogic';

interface CalendarWin95Props {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
}

/**
 * CalendarWin95Day — tek bir takvim hücresi, Win95 estetiğinde.
 *
 * Tasarım kararı: Tailwind versiyonu 10+ farklı pastel renk kullanıyordu
 * (orange-100, purple-100, vb. — Cumartesi/Pazar/tatil/bugün için). Win95'in
 * kendi flat renk paleti (gri/mavi/teal) bu kadar rengi doğal olarak
 * desteklemiyor — bu yüzden Win95 versiyonunda günler RENK yerine
 * Win95'in kendi 3D bevel diliyle ("boxShadow: in/out") ve küçük metin
 * etiketleriyle ayırt ediliyor.
 *
 * ÖNEMLİ: Her metin rengi burada EXPLICIT olarak belirtiliyor (varsayılana
 * hiç güvenilmiyor). Sebep: Button/Frame'in varsayılan metin rengi tema
 * bağlamına (canvasText / materialText) göre değişebiliyor — açık temada
 * bazı yerlerde beyaz metin beyaz zemine denk gelip okunmaz hale
 * gelebiliyordu. Gün numarası ve hücre içeriği daima koyu/siyah (#1a1a1a),
 * arka plan rengi (material) ne olursa olsun okunur kalıyor.
 */
const CalendarWin95Day = React.memo(({
  date,
  overtimeEntries,
  isInCurrentMonth,
  isTodayDate,
  holiday,
  isSaturday,
  isSunday,
  onClick,
  deductBreakTime,
  dailyWorkingHours,
  shiftSettings,
}: {
  date: Date;
  overtimeEntries: OvertimeEntry[];
  isInCurrentMonth: boolean;
  isTodayDate: boolean;
  holiday: Holiday | undefined;
  isSaturday: boolean;
  isSunday: boolean;
  onClick: (date: Date) => void;
  deductBreakTime: boolean;
  dailyWorkingHours: number;
  shiftSettings: {
    enabled: boolean;
    systemType: ShiftSystemType;
    normalizedStartDate: Date | null;
    initialType: ShiftType;
  };
}) => {
  const overtimeEntry = overtimeEntries.find(e => e.type === 'overtime');
  const leaveEntry = overtimeEntries.find(e => e.type === 'leave');
  const hasNote = overtimeEntries.some(e => e.note && e.note.trim().length > 0);

  const getDisplayedHours = (entry: OvertimeEntry | undefined) => {
    if (!entry) return 0;
    const totalHours = calcTotalHours(entry);
    if (entry.type === 'leave') {
      if (entry.isFullDay) return dailyWorkingHours;
      return totalHours;
    }
    return calculateEffectiveHours(totalHours, deductBreakTime);
  };

  const shiftType = React.useMemo(() => {
    if (!shiftSettings.enabled || !shiftSettings.normalizedStartDate) return null;
    return getShiftType(date, shiftSettings.normalizedStartDate, shiftSettings.initialType, shiftSettings.systemType);
  }, [date, shiftSettings.enabled, shiftSettings.normalizedStartDate, shiftSettings.initialType, shiftSettings.systemType]);

  if (!isInCurrentMonth) {
    // Ay dışı günler: tıklanamaz ama tarih numarası SOLUK renkte gösteriliyor
    // (Tailwind versiyonundaki text-gray-300 davranışıyla tutarlı —
    // önceki/sonraki ayın günleri tamamen boş kutu olarak
    // kalmamalı, en azından tarih okunabilmeli).
    return (
      <div
        style={{
          aspectRatio: '1',
          minHeight: 44,
          width: '100%',
          boxSizing: 'border-box',
          padding: 2,
          border: '1px solid #d2d2d2',
          backgroundColor: '#f3f3f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '0.8125rem', color: '#b3b3b3' }}>
          {date.getDate()}
        </span>
      </div>
    );
  }

  // Tatil etiketi rengi (bilgi taşıdığı için korunuyor)
  const holidayLabelColor = holiday?.isHalfDay
    ? '#9a6700'
    : holiday?.type === 'religious'
      ? '#0a7a3d'
      : '#b91c1c';

  return (
    <button
      type="button"
      onClick={() => onClick(date)}
      style={{
        aspectRatio: '1',
        minHeight: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: 2,
        cursor: 'pointer',
        width: '100%',
        boxSizing: 'border-box',
        // Mini kart görünümü: ince gri kenarlık + beyaz/açık zemin
        // (Tailwind versiyonundaki "border border-gray-200 rounded-lg"
        // hissinin Win95 karşılığı). Bugün ise mavi kalın çerçeveyle
        // vurgulanıyor (Win95'in "seçili" rengi, başlık çubuğu maviyle aynı).
        border: isTodayDate ? '2px solid #000e7a' : '1px solid #868a8e',
        borderRadius: 2,
        backgroundColor: isTodayDate ? '#dbe4ff' : '#ffffff',
        boxShadow: isTodayDate ? 'inset 0 0 0 1px #000e7a' : '1px 1px 0 #d2d2d2',
        outline: 'none',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: '0.8125rem', fontWeight: isTodayDate ? 700 : 400, color: '#1a1a1a' }}>
        {date.getDate()}
      </span>

      {/* Hafta sonu göstergesi — köşede küçük harf, hücreyi boyamadan */}
      {(isSaturday || isSunday) && (
        <span
          style={{
            position: 'absolute',
            top: 1,
            left: 2,
            fontSize: '0.5rem',
            fontWeight: 700,
            color: isSaturday ? '#b45309' : '#6d28d9',
          }}
        >
          {isSaturday ? 'C' : 'P'}
        </span>
      )}

      {/* Tatil etiketi */}
      {holiday && (
        <span
          style={{
            position: 'absolute',
            top: 1,
            right: 2,
            fontSize: '0.4375rem',
            fontWeight: 700,
            color: holidayLabelColor,
            maxWidth: '70%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
          title={holiday.name}
        >
          {holiday.shortName}
        </span>
      )}

      {/* Vardiya göstergesi */}
      {shiftType && (
        <span style={{ position: 'absolute', bottom: 1, left: 2, fontSize: '0.625rem', lineHeight: 1, color: '#1a1a1a' }}>
          {shiftType === 'day' || shiftType === 'morning' ? '☀' : shiftType === 'afternoon' ? '◐' : '☾'}
        </span>
      )}

      {/* Not işareti */}
      {hasNote && (
        <span style={{ position: 'absolute', top: 1, right: holiday ? 'auto' : 2, fontSize: '0.5rem' }}>
          📝
        </span>
      )}

      {/* Mesai/İzin saatleri */}
      <div style={{ position: 'absolute', bottom: 1, right: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
        {overtimeEntry && (
          <span style={{ fontSize: '0.4375rem', fontWeight: 700, color: '#1d4ed8' }}>
            {formatHours(getDisplayedHours(overtimeEntry))}
          </span>
        )}
        {leaveEntry && (
          <span style={{ fontSize: '0.4375rem', fontWeight: 700, color: '#b45309' }}>
            İ:{formatHours(getDisplayedHours(leaveEntry))}
          </span>
        )}
      </div>
    </button>
  );
}, (prev, next) => {
  return prev.isTodayDate === next.isTodayDate &&
    prev.isInCurrentMonth === next.isInCurrentMonth &&
    prev.isSaturday === next.isSaturday &&
    prev.isSunday === next.isSunday &&
    prev.deductBreakTime === next.deductBreakTime &&
    prev.dailyWorkingHours === next.dailyWorkingHours &&
    prev.date.getTime() === next.date.getTime() &&
    prev.holiday?.name === next.holiday?.name &&
    prev.shiftSettings.enabled === next.shiftSettings.enabled &&
    prev.shiftSettings.systemType === next.shiftSettings.systemType &&
    prev.shiftSettings.initialType === next.shiftSettings.initialType &&
    prev.shiftSettings.normalizedStartDate?.getTime() === next.shiftSettings.normalizedStartDate?.getTime() &&
    prev.overtimeEntries.length === next.overtimeEntries.length &&
    prev.overtimeEntries.every((e, i) => {
      const next_e = next.overtimeEntries[i];
      return next_e !== undefined && e.id === next_e.id && calcTotalHours(e) === calcTotalHours(next_e) && e.note === next_e.note;
    });
});

CalendarWin95Day.displayName = 'CalendarWin95Day';

export const CalendarWin95: React.FC<CalendarWin95Props> = React.memo(({ currentDate, onDateChange, onDateClick }) => {
  const {
    isLoaded,
    settings,
    month,
    filteredCalendarDays,
    handleDateClick,
    goToPreviousMonth,
    goToNextMonth,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useCalendarLogic(currentDate, onDateChange, onDateClick);

  const year = currentDate.getFullYear();

  if (!isLoaded) {
    return (
      <div style={{ padding: 8 }}>
        <p style={{ fontSize: '0.6875rem', textAlign: 'center', padding: 16, color: '#1a1a1a' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    // Takvim artık kendi gri kenarlıklı, BEYAZ zeminli bloğu — Ay Özeti'nden
    // görsel olarak ayrışıyor ama hâlâ aynı ana "Mesai Takip" penceresinin
    // içeriği (kendi TitleBar'ı yok, sadece çerçeve + zemin farkı var).
    <div
      style={{
        border: '2px solid #868a8e',
        backgroundColor: '#ffffff',
        padding: 6,
        marginBottom: 8,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Ay gezinme şeridi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 4 }}>
        <Button onClick={goToPreviousMonth} style={{ fontWeight: 700, padding: '2px 10px', color: '#1a1a1a' }} aria-label="Önceki ay">
          {'<'}
        </Button>
        <Frame boxShadow="in" style={{ flex: 1, padding: '4px 8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
          <span style={{ color: '#1a1a1a', fontSize: '0.8125rem', fontWeight: 700 }}>
            {TURKISH_MONTHS[month]} {year}
          </span>
        </Frame>
        <Button onClick={goToNextMonth} style={{ fontWeight: 700, padding: '2px 10px', color: '#1a1a1a' }} aria-label="Sonraki ay">
          {'>'}
        </Button>
      </div>

      {/* Gün başlıkları — gri header şeridi, Win95 tablo başlığı hissi.
          ÖNEMLİ: `minmax(0, 1fr)` — düz `1fr` kullanılırsa CSS Grid her
          sütuna gizli bir "asgari genişlik" (içeriğin min-content boyutu)
          uyguluyor; sütun (örn. landscape'te %50'lik dar bir alanda)
          bunun altına küçülemediği için tüm grid taşıp sağdaki "Paz"
          sütununun kesilmesine sebep oluyordu. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2, marginBottom: 4 }}>
        {TURKISH_DAYS.map((day, index) => {
          const isWeekend = index === 5 || index === 6;
          return (
            <div
              key={`day-${index}`}
              style={{
                textAlign: 'center',
                fontSize: '0.625rem',
                fontWeight: 700,
                padding: '3px 0',
                backgroundColor: '#c3c7cb',
                border: '1px solid #868a8e',
                color: isWeekend ? (index === 5 ? '#b45309' : '#6d28d9') : '#1a1a1a',
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Takvim grid — her gün kendi mini çerçevesi içinde (Tailwind'deki
          kart hissine yakın, ama Win95'in ince gri kenarlığıyla).
          Aynı `minmax(0, 1fr)` düzeltmesi burada da gerekli (yukarıdaki
          not). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3 }}>
        {filteredCalendarDays.map(({
          date,
          overtimeEntries,
          isInCurrentMonth,
          isTodayDate,
          isSaturday,
          isSunday,
          holiday,
          shiftSettings,
        }) => {
          const uniqueKey = `${date.getTime()}-${overtimeEntries.map(e => e.id).join('-') || 'no-entry'}`;
          return (
            <CalendarWin95Day
              key={uniqueKey}
              date={date}
              overtimeEntries={overtimeEntries}
              isInCurrentMonth={isInCurrentMonth}
              isTodayDate={isTodayDate}
              holiday={holiday}
              isSaturday={isSaturday}
              isSunday={isSunday}
              onClick={handleDateClick}
              deductBreakTime={settings.deductBreakTime}
              dailyWorkingHours={settings.dailyWorkingHours}
              shiftSettings={shiftSettings}
            />
          );
        })}
      </div>
    </div>
  );
});

CalendarWin95.displayName = 'CalendarWin95';

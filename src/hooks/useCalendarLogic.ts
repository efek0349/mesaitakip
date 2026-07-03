import React from 'react';
import { getCalendarDays } from '../utils/dateUtils';
import { useOvertimeData } from './useOvertimeData';
import { useHolidays } from './useHolidays';
import { useSalarySettings } from './useSalarySettings';
import { ShiftSystemType, ShiftType } from '../types/overtime';

/**
 * useCalendarLogic — Calendar.tsx'in Tailwind ve Win95 versiyonları arasında
 * PAYLAŞILAN mantık. Görsel katman (CalendarTailwind.tsx / CalendarWin95.tsx)
 * tamamen ayrı, ama veri hesaplama/state yönetimi burada tek bir yerde —
 * böylece iki tema arasında davranış farkı (bug) oluşma riski sıfırlanır.
 *
 * Bu hook orijinal Calendar.tsx'in component gövdesindeki TÜM state ve
 * useMemo/useCallback mantığını birebir içerir (today-tracking, swipe
 * navigation, memoizedData, filteredCalendarDays, handleDateClick).
 */
export function useCalendarLogic(
  currentDate: Date,
  onDateChange: (date: Date) => void,
  onDateClick: (date: Date) => void
) {
  const { getEntriesForDate, isLoaded } = useOvertimeData();
  const { getHoliday } = useHolidays(currentDate.getFullYear(), true);
  const { settings, getShiftSettingsForDate } = useSalarySettings();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Midnight-aware today state
  const [today, setToday] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  });

  React.useEffect(() => {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

    const timer = setTimeout(() => {
      const d = new Date();
      setToday(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [today]);

  // Swipe navigation state
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  // Min swipe distance (in pixels)
  const minSwipeDistance = 50;

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = React.useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = React.useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      const newDate = new Date(year, month + 1, 1);
      onDateChange(newDate);
    } else if (isRightSwipe) {
      const newDate = new Date(year, month - 1, 1);
      onDateChange(newDate);
    }
  }, [touchStart, touchEnd, year, month, onDateChange]);

  const goToPreviousMonth = React.useCallback(() => {
    const newDate = new Date(year, month - 1, 1);
    onDateChange(newDate);
  }, [year, month, onDateChange]);

  const goToNextMonth = React.useCallback(() => {
    const newDate = new Date(year, month + 1, 1);
    onDateChange(newDate);
  }, [year, month, onDateChange]);

  // Memoize calendar days calculation with proper dependency tracking
  const calendarDays = React.useMemo(() => getCalendarDays(year, month), [year, month]);

  // Memoize holiday and overtime data for better performance
  const memoizedData = React.useMemo(() => {
    return calendarDays.map(date => {
      const shiftForDate = getShiftSettingsForDate(date);
      return {
        date,
        overtimeEntries: getEntriesForDate(date),
        isInCurrentMonth: date.getMonth() === month,
        isTodayDate: date.getTime() === today,
        isSaturday: date.getDay() === 6,
        isSunday: date.getDay() === 0,
        holiday: getHoliday(date),
        shiftSettings: {
          enabled: !!shiftForDate,
          systemType: (shiftForDate?.systemType || '2-shift') as ShiftSystemType,
          normalizedStartDate: shiftForDate?.normalizedStartDate || null,
          initialType: (shiftForDate?.initialType || 'day') as ShiftType,
        },
      };
    });
  }, [calendarDays, month, today, getEntriesForDate, getHoliday, getShiftSettingsForDate]);

  // Unused rows filtering (e.g. 6th row if all days are from next month)
  const filteredCalendarDays = React.useMemo(() => {
    const sixthRow = memoizedData.slice(35, 42);
    const isSixthRowAllNextMonth = sixthRow.length > 0 && sixthRow.every(day => !day.isInCurrentMonth);

    if (isSixthRowAllNextMonth) {
      return memoizedData.slice(0, 35);
    }
    return memoizedData;
  }, [memoizedData]);

  const handleDateClick = React.useCallback((date: Date) => {
    if (date.getMonth() === month) {
      onDateClick(date);
    }
  }, [month, onDateClick]);

  return {
    isLoaded,
    settings,
    year,
    month,
    filteredCalendarDays,
    handleDateClick,
    goToPreviousMonth,
    goToNextMonth,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

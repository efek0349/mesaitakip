import React from 'react';
import { Holiday } from '../types/overtime';
import { getAllHolidays } from '../utils/holidayUtils';
import { getDateKey } from '../utils/dateUtils';
import { useDiniHolidays } from './useDiniHolidays';
import { useResmiHolidays } from './useResmiHolidays';
import { useCustomHolidays } from './useCustomHolidays';

/**
 * Hook for managing and accessing holiday information.
 *
 * @param initialYear Optional initial year. If provided, currentYear will track this value.
 * @param loadAdjacentYears If true, also loads holidays for the previous and next years (useful for calendars).
 */
export const useHolidays = (initialYear?: number, loadAdjacentYears = false) => {
  // Internal state for the year if not controlled from outside
  const [internalYear, setInternalYear] = React.useState(() => new Date().getFullYear());

  // Use initialYear if provided, otherwise fallback to internal state
  const currentYear = initialYear ?? internalYear;

  // Dini bayramları online kaynaktan çek (fallback hardcoded veriler)
  const { holidays: religiousHolidays } = useDiniHolidays();
  // Resmi tatilleri online kaynaktan çek (fallback hardcoded veriler)
  const { holidays: officialHolidays } = useResmiHolidays();
  // Kullanıcının Veri Yönetimi > Tatiller'den manuel eklediği günler
  const { holidays: customHolidays } = useCustomHolidays();

  // Function to update the year (only works if initialYear is not provided)
  const setCurrentYear = React.useCallback((year: number) => {
    if (initialYear !== undefined) {
      if (import.meta.env.DEV) {
        console.warn('useHolidays: initialYear is controlled externally. setCurrentYear will have no effect on currentYear.');
      }
      return;
    }
    setInternalYear(year);
  }, [initialYear]);

  // Calculate holidays - cached at the component level with useMemo
  // religiousHolidays veya officialHolidays değiştiğinde (online veri geldiğinde) otomatik yeniden hesaplanır
  const holidays = React.useMemo(() => {
    const results = getAllHolidays(currentYear, religiousHolidays, officialHolidays, customHolidays);

    // Load adjacent years only if requested (usually for calendar views)
    if (loadAdjacentYears) {
      const prevYearHolidays = getAllHolidays(currentYear - 1, religiousHolidays, officialHolidays, customHolidays);
      const nextYearHolidays = getAllHolidays(currentYear + 1, religiousHolidays, officialHolidays, customHolidays);
      return [...prevYearHolidays, ...results, ...nextYearHolidays];
    }

    return results;
  }, [currentYear, loadAdjacentYears, religiousHolidays, officialHolidays, customHolidays]);

  // Store holidays in a Map for O(1) access
  const holidayMap = React.useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach(h => map.set(h.date, h));
    return map;
  }, [holidays]);

  const isHoliday = React.useCallback((date: Date): boolean => {
    return holidayMap.has(getDateKey(date));
  }, [holidayMap]);

  const getHoliday = React.useCallback((date: Date): Holiday | undefined => {
    return holidayMap.get(getDateKey(date));
  }, [holidayMap]);

  /**
   * Returns holidays for a specific year.
   * Assumes holiday.date is in YYYY-MM-DD format.
   */
  const getHolidaysForYear = React.useCallback((year: number): Holiday[] => {
    const yearStr = `${year}-`;
    return holidays.filter(holiday => holiday.date.startsWith(yearStr));
  }, [holidays]);

  // Memoized current year holidays
  const currentYearHolidays = React.useMemo(() => {
    return getHolidaysForYear(currentYear);
  }, [getHolidaysForYear, currentYear]);

  return {
    holidays: currentYearHolidays,
    allHolidays: holidays,
    currentYear,
    setCurrentYear,
    isHoliday,
    getHoliday,
    getHolidaysForYear,
  };
};

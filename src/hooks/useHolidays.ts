import { useState, useEffect, useMemo } from 'react';
import { Holiday } from '../types/overtime';
import { getAllHolidays } from '../utils/holidayUtils';

// Cache için global değişkenler
let cachedYear: number | null = null;
let cachedHolidays: Holiday[] = [];

export const useHolidays = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Tatilleri hesapla ve cache'le
  const holidays = useMemo(() => {
    if (cachedYear === currentYear && cachedHolidays.length > 0) {
      return cachedHolidays;
    }
    
    const yearHolidays = getAllHolidays(currentYear);
    
    // Önceki ve sonraki yılların tatillerini de hesapla (takvim görünümü için)
    const prevYearHolidays = getAllHolidays(currentYear - 1);
    const nextYearHolidays = getAllHolidays(currentYear + 1);
    
    const allHolidays = [...prevYearHolidays, ...yearHolidays, ...nextYearHolidays];
    
    // Cache'i güncelle
    cachedYear = currentYear;
    cachedHolidays = allHolidays;
    
    return allHolidays;
  }, [currentYear]);

  // Yıl değiştiğinde cache'i güncelle
  useEffect(() => {
    const year = new Date().getFullYear();
    if (year !== currentYear) {
      setCurrentYear(year);
    }
  }, [currentYear]);

  const isHoliday = (date: Date): boolean => {
    const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return holidays.some(holiday => holiday.date === dateKey);
  };

  const getHoliday = (date: Date): Holiday | undefined => {
    const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return holidays.find(holiday => holiday.date === dateKey);
  };

  // Belirli bir yılın tatillerini getir
  const getHolidaysForYear = (year: number): Holiday[] => {
    return holidays.filter(holiday => holiday.date.startsWith(year.toString()));
  };

  // Memoized current year holidays
  const currentYearHolidays = useMemo(() => {
    return holidays.filter(holiday => holiday.date.startsWith(currentYear.toString()));
  }, [holidays, currentYear]);

  return {
    holidays: currentYearHolidays,
    allHolidays: holidays,
    currentYear,
    setCurrentYear,
    isHoliday,
    getHoliday,
    getHolidaysForYear
  };
};
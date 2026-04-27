import React, { useSyncExternalStore } from 'react';
import { OvertimeEntry, MonthlyData } from '../types/overtime';
import { getMonthKey, getDateKey, calculateEffectiveHours, parseDate } from '../utils/dateUtils';
import { useSalarySettings } from './useSalarySettings';
import { useHolidays } from './useHolidays';

import { EventEmitter } from '../utils/EventEmitter';

const dataEmitter = new EventEmitter();

// Global data store
let globalData: MonthlyData = {};
let isDataLoaded = false;

// Store interface for useSyncExternalStore
const overtimeStore = {
  subscribe: (callback: () => void) => dataEmitter.subscribe(callback),
  getSnapshot: () => globalData,
  getServerSnapshot: () => ({})
};

// Performans için cache sistemi
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

// Tüm eski verileri temizle (uygulama ilk açılışında)
const clearAllLegacyData = () => {
  try {
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    allKeys.forEach(key => {
      if (key.includes('mesai') || 
          key.includes('salary') || 
          key.includes('overtime') ||
          key.includes('backup') ||
          key.startsWith('mesai-') ||
          key.includes('data-backup')) {
        localStorage.removeItem(key);
      }
    });
    
    const knownKeys = ['mesai-data', 'mesai-salary-settings', 'overtime-data', 'salary-settings', 'app-data', 'user-settings'];
    knownKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Eski veri temizleme hatası:', error);
  }
};

const validateAndCleanData = (data: any): MonthlyData => {
  if (!data || typeof data !== 'object') return {};
  const cleanData: MonthlyData = {};
  Object.keys(data).forEach(monthKey => {
    if (Array.isArray(data[monthKey])) {
      cleanData[monthKey] = data[monthKey].filter((entry: any) => {
        return entry && typeof entry.id === 'string' && typeof entry.date === 'string' && typeof entry.totalHours === 'number';
      }).map((entry: any) => ({
        ...entry,
        type: entry.type || 'overtime',
        isFullDay: !!entry.isFullDay
      }));
    }
  });
  return cleanData;
};

const loadGlobalData = () => {
  if (isDataLoaded) return;
  try {
    const isFirstRun = !localStorage.getItem('mesai-app-initialized');
    if (isFirstRun) {
      clearAllLegacyData();
      localStorage.setItem('mesai-app-initialized', 'true');
      globalData = {};
    } else {
      const legacyData = localStorage.getItem('mesai-data');
      if (legacyData) {
        const validatedLegacy = validateAndCleanData(JSON.parse(legacyData));
        Object.keys(validatedLegacy).forEach(monthKey => {
          localStorage.setItem(`mesai-data-${monthKey}`, JSON.stringify(validatedLegacy[monthKey]));
        });
        localStorage.removeItem('mesai-data');
        globalData = validatedLegacy;
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mesai-data-')) {
          const monthKey = key.replace('mesai-data-', '');
          const savedMonthData = localStorage.getItem(key);
          if (savedMonthData) {
            globalData[monthKey] = JSON.parse(savedMonthData);
          }
        }
      }
      globalData = validateAndCleanData(globalData);
    }
  } catch (error) {
    globalData = {};
  }
  isDataLoaded = true;
};

const saveGlobalData = (specificMonthKey?: string) => {
  try {
    if (specificMonthKey) {
      const data = globalData[specificMonthKey];
      const storageKey = `mesai-data-${specificMonthKey}`;
      if (data && data.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } else {
        localStorage.removeItem(storageKey);
      }
    } else {
      Object.keys(globalData).forEach(monthKey => {
        const data = globalData[monthKey];
        localStorage.setItem(`mesai-data-${monthKey}`, JSON.stringify(data));
      });
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('mesai-data-')) {
          const monthKey = key.replace('mesai-data-', '');
          if (!globalData[monthKey]) {
            localStorage.removeItem(key);
          }
        }
      }
    }
    dataCache.clear();
    dataEmitter.emit();
  } catch (error) {
    console.error('Kaydetme hatası:', error);
  }
};

const getCachedData = <T>(key: string, fetcher: () => T): T => {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  const data = fetcher();
  dataCache.set(key, { data, timestamp: Date.now() });
  return data;
};

export const useOvertimeData = () => {
  const data = useSyncExternalStore(
    overtimeStore.subscribe,
    overtimeStore.getSnapshot,
    overtimeStore.getServerSnapshot
  );

  const [isLoaded, setIsLoaded] = React.useState(isDataLoaded);
  const { settings, importSettings, getSalaryForDate } = useSalarySettings();

  const monthlyData = data;

  React.useEffect(() => {
    if (!isDataLoaded) {
      loadGlobalData();
      setIsLoaded(true);
      dataEmitter.emit();
    } else if (!isLoaded) {
      setIsLoaded(true);
    }
  }, [isLoaded]);

  const addOvertimeEntry = React.useCallback((date: Date, hours: number, minutes: number, type: 'overtime' | 'leave' = 'overtime', note?: string, isFullDay: boolean = false) => {
    if (!isDataLoaded) return;
    const totalHours = hours + minutes / 60;
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    
    const newEntry: OvertimeEntry = { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      date: dateKey, 
      hours, 
      minutes, 
      totalHours, 
      type, 
      isFullDay, 
      note: note || undefined 
    };

    if (!globalData[monthKey]) {
      globalData = { ...globalData, [monthKey]: [] };
    }
    
    const newMonthData = [...globalData[monthKey]];
    const existingIndex = newMonthData.findIndex(entry => entry.date === dateKey && entry.type === type);
    
    if (existingIndex >= 0) newMonthData[existingIndex] = newEntry;
    else newMonthData.push(newEntry);
    
    newMonthData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    globalData = { ...globalData, [monthKey]: newMonthData };
    saveGlobalData(monthKey);
  }, []);

  const removeOvertimeEntry = React.useCallback((date: Date, type?: 'overtime' | 'leave') => {
    if (!isDataLoaded) return;
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    
    if (globalData[monthKey]) {
      const newMonthData = globalData[monthKey].filter(entry => 
        entry.date !== dateKey || (type && entry.type !== type)
      );
      
      const newGlobalData = { ...globalData };
      if (newMonthData.length === 0) {
        delete newGlobalData[monthKey];
      } else {
        newGlobalData[monthKey] = newMonthData;
      }
      
      globalData = newGlobalData;
    }
    saveGlobalData(monthKey);
  }, []);

  const clearMonthData = React.useCallback((year: number, month: number) => {
    if (!isDataLoaded) return;
    const monthKey = getMonthKey(new Date(year, month));
    const newGlobalData = { ...globalData };
    delete newGlobalData[monthKey];
    globalData = newGlobalData;
    saveGlobalData(monthKey);
  }, []);

  const getOvertimeForDate = React.useCallback((date: Date, type?: 'overtime' | 'leave'): OvertimeEntry | undefined => {
    if (!isDataLoaded) return undefined;
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    return getCachedData(`overtime-${dateKey}-${type || 'any'}`, () => {
      if (!globalData[monthKey]) return undefined;
      return globalData[monthKey].find(entry => entry.date === dateKey && (!type || entry.type === type));
    });
  }, [isLoaded, monthlyData]);

  const getEntriesForDate = React.useCallback((date: Date): OvertimeEntry[] => {
    if (!isDataLoaded) return [];
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    if (!globalData[monthKey]) return [];
    return globalData[monthKey].filter(entry => entry.date === dateKey);
  }, [isLoaded, monthlyData]);

  const { isHoliday } = useHolidays();

  const getMonthlyTotal = React.useCallback((year: number, month: number, deductBreakTime: boolean): number => {
    if (!isDataLoaded) return 0;
    const monthKey = getMonthKey(new Date(year, month));
    if (!globalData[monthKey]) return 0;
    const monthSettings = getSalaryForDate(new Date(year, month));
    const isSaturdayWork = monthSettings.isSaturdayWork ?? settings.isSaturdayWork;
    return globalData[monthKey].reduce((total, entry) => {
      if (entry.type === 'leave') return total;
      const date = parseDate(entry.date);
      return total + calculateEffectiveHours(entry.totalHours, deductBreakTime, date.getDay() === 6, date.getDay() === 0, isHoliday(date), isSaturdayWork);
    }, 0);
  }, [isLoaded, isHoliday, settings.isSaturdayWork, monthlyData, getSalaryForDate]);

  const getMonthlyEntries = React.useCallback((year: number, month: number): OvertimeEntry[] => {
    if (!isDataLoaded) return [];
    const monthKey = getMonthKey(new Date(year, month));
    return globalData[monthKey] || [];
  }, [isLoaded, monthlyData]);

  const hasMonthData = React.useCallback((year: number, month: number): boolean => {
    if (!isDataLoaded) return false;
    const monthKey = getMonthKey(new Date(year, month));
    return !!globalData[monthKey] && globalData[monthKey].length > 0;
  }, [isLoaded, monthlyData]);

  const exportAllData = React.useCallback(() => JSON.stringify({ version: 2, overtime: globalData, settings: settings }, null, 2), [settings]);

  const importData = React.useCallback((dataString: string) => {
    try {
      const importedData = JSON.parse(dataString);
      let overtimeToProcess = (importedData.version === 2 && importedData.overtime) ? importedData.overtime : importedData;
      if (importedData.version === 2 && importedData.settings) importSettings(importedData.settings);
      const validatedData = validateAndCleanData(overtimeToProcess);
      
      const newGlobalData = { ...globalData };
      Object.keys(validatedData).forEach(monthKey => {
        if (!newGlobalData[monthKey]) newGlobalData[monthKey] = [];
        const monthData = [...newGlobalData[monthKey]];
        validatedData[monthKey].forEach(newEntry => {
          const idx = monthData.findIndex(e => e.id === newEntry.id);
          if (idx >= 0) monthData[idx] = newEntry;
          else monthData.push(newEntry);
        });
        monthData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        newGlobalData[monthKey] = monthData;
      });
      globalData = newGlobalData;
      saveGlobalData();
      return true;
    } catch (error) {
      return false;
    }
  }, [importSettings]);

  const getYearlyTotal = React.useCallback((year: number, deductBreakTime: boolean): number => {
    if (!isDataLoaded) return 0;
    let yearlyTotal = 0;
    Object.keys(globalData).forEach(monthKey => {
      if (monthKey.startsWith(year.toString())) {
        const monthDate = new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1);
        const monthSettings = getSalaryForDate(monthDate);
        const isSaturdayWork = monthSettings.isSaturdayWork ?? settings.isSaturdayWork;
        globalData[monthKey].forEach(entry => {
          if (entry.type === 'leave') return;
          const date = parseDate(entry.date);
          yearlyTotal += calculateEffectiveHours(entry.totalHours, deductBreakTime, date.getDay() === 6, date.getDay() === 0, isHoliday(date), isSaturdayWork);
        });
      }
    });
    return yearlyTotal;
  }, [isLoaded, isHoliday, settings.isSaturdayWork, monthlyData, getSalaryForDate]);

  return { monthlyData, isLoaded, addOvertimeEntry, removeOvertimeEntry, clearMonthData, getOvertimeForDate, getEntriesForDate, getMonthlyTotal, hasMonthData, getMonthlyEntries, getYearlyTotal, exportAllData, importData, clearAllData: () => { clearAllLegacyData(); globalData = {}; dataCache.clear(); isDataLoaded = false; localStorage.removeItem('mesai-app-initialized'); dataEmitter.emit(); } };
};
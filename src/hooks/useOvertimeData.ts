import React from 'react';
import { OvertimeEntry, MonthlyData } from '../types/overtime';
import { getMonthKey, getDateKey, calculateEffectiveHours } from '../utils/dateUtils';
import { useSalarySettings } from './useSalarySettings';
import { useHolidays } from './useHolidays';

import { EventEmitter } from '../utils/EventEmitter';

const dataEmitter = new EventEmitter();

// Global data store
let globalData: MonthlyData = {};
let isDataLoaded = false;

// Performans için cache sistemi
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

// Tüm eski verileri temizle (uygulama ilk açılışında)
const clearAllLegacyData = () => {
  try {
    // Tüm localStorage anahtarlarını kontrol et
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    // Mesai ile ilgili tüm anahtarları sil
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
    
    // Bilinen anahtarları kesin olarak sil
    const knownKeys = [
      'mesai-data',
      'mesai-salary-settings',
      'mesai-data-backup-1',
      'mesai-data-backup-2', 
      'mesai-data-backup-3',
      'overtime-data',
      'salary-settings',
      'app-data',
      'user-settings'
    ];
    
    knownKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
  } catch (error) {
    console.error('Eski veri temizleme hatası:', error);
  }
};

// Load data from localStorage (sadece ana anahtar)
const loadGlobalData = () => {
  if (isDataLoaded) return;
  
  try {
    // İlk açılışta tüm eski verileri temizle
    const isFirstRun = !localStorage.getItem('mesai-app-initialized');
    if (isFirstRun) {
      clearAllLegacyData();
      localStorage.setItem('mesai-app-initialized', 'true');
      globalData = {};
    } else {
      // Sadece ana veriyi yükle
      const savedData = localStorage.getItem('mesai-data');
      if (savedData) {
        try {
          const loadedData = JSON.parse(savedData);
          globalData = validateAndCleanData(loadedData);
        } catch (parseError) {
          globalData = {};
        }
      } else {
        globalData = {};
      }
    }
    
  } catch (error) {
    globalData = {};
  }
  
  isDataLoaded = true;
};

// Veri doğrulama ve temizleme
const validateAndCleanData = (data: any): MonthlyData => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const cleanData: MonthlyData = {};
  
  Object.keys(data).forEach(monthKey => {
    if (Array.isArray(data[monthKey])) {
      const validEntries = data[monthKey].filter((entry: any) => {
        return entry && 
               typeof entry.id === 'string' &&
               typeof entry.date === 'string' &&
               typeof entry.hours === 'number' &&
               typeof entry.minutes === 'number' &&
               typeof entry.totalHours === 'number' &&
               (!entry.type || entry.type === 'overtime' || entry.type === 'leave') &&
               entry.hours >= 0 && entry.hours <= 24 &&
               entry.minutes >= 0 && entry.minutes < 60;
      }).map((entry: any) => ({
        ...entry,
        type: entry.type || 'overtime', // Ensure type exists
        isFullDay: !!entry.isFullDay // Ensure isFullDay is boolean
      }));
      
      if (validEntries.length > 0) {
        cleanData[monthKey] = validEntries;
      }
    }
  });
  
  return cleanData;
};

// Basit save (sadece ana veri)
const saveGlobalData = () => {
  try {
    const dataString = JSON.stringify(globalData);
    localStorage.setItem('mesai-data', dataString);
    
    // Cache'i temizle
    dataCache.clear();
    
    dataEmitter.emit();
    
  } catch (error) {
    // Storage dolu ise eski verileri temizle
    if (error.name === 'QuotaExceededError') {
      cleanOldData();
      // Tekrar dene
      try {
        localStorage.setItem('mesai-data', JSON.stringify(globalData));
      } catch (retryError) {
        console.error('Veri kaydetme başarısız:', retryError);
      }
    }
  }
};

// Eski verileri temizleme (2 yıldan eski)
const cleanOldData = () => {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const cutoffKey = getMonthKey(twoYearsAgo);
  
  Object.keys(globalData).forEach(monthKey => {
    if (monthKey < cutoffKey) {
      delete globalData[monthKey];
    }
  });
};

// Cache'li veri getirme
const getCachedData = <T>(key: string, fetcher: () => T): T => {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = fetcher();
  dataCache.set(key, { data, timestamp: Date.now() });
  return data;
};

// Tüm verileri temizle
const clearAllData = () => {
  try {
    // localStorage'ı temizle
    clearAllLegacyData();
    
    // Global state'i sıfırla
    globalData = {};
    dataCache.clear();
    isDataLoaded = false;
    
    // Uygulama başlatma flag'ini sıfırla
    localStorage.removeItem('mesai-app-initialized');
    
    dataEmitter.emit();
  } catch (error) {
    console.error('Veri temizleme hatası:', error);
  }
};

export const useOvertimeData = () => {
  const [updateCounter, setUpdateCounter] = React.useState(0);
  // Başlangıç değerini global state'den al (SSR ve ilk render için önemli)
  const [isLoaded, setIsLoaded] = React.useState(isDataLoaded);
  const { settings, importSettings } = useSalarySettings();

  // Memoized monthly data for performance - Triggered by updateCounter
  const monthlyDataMemo = React.useMemo(() => ({ ...globalData }), [updateCounter, isLoaded]);

  // Force re-render
  const forceUpdate = React.useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  React.useEffect(() => {
    // Veri henüz yüklenmemişse yükle
    if (!isDataLoaded) {
      loadGlobalData();
      setIsLoaded(true);
    } else if (!isLoaded) {
      // Global veri yüklü ama lokal state henüz değilse (nadiren olur)
      setIsLoaded(true);
    }
    
    // Subscribe to data changes
    const unsubscribe = dataEmitter.subscribe(forceUpdate);
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [forceUpdate, isLoaded]);

  const addOvertimeEntry = React.useCallback((date: Date, hours: number, minutes: number, type: 'overtime' | 'leave' = 'overtime', note?: string, isFullDay: boolean = false) => {
    if (!isDataLoaded) {
      return;
    }

    const totalHours = hours + minutes / 60; // Store raw totalHours
    // const effectiveTotalHours = calculateEffectiveHours(rawTotalHours, salarySettings.deductBreakTime); // No longer apply deduction here
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    
    const newEntry: OvertimeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateKey,
      hours,
      minutes,
      totalHours: totalHours, // Store raw totalHours
      type,
      isFullDay,
      note: note || undefined
    };

    // Update global data
    if (!globalData[monthKey]) {
      globalData[monthKey] = [];
    }
    
    // Check if entry already exists for this date and type
    const existingIndex = globalData[monthKey].findIndex(entry => entry.date === dateKey && entry.type === type);
    if (existingIndex >= 0) {
      globalData[monthKey][existingIndex] = newEntry;
    } else {
      globalData[monthKey].push(newEntry);
    }
    
    // Sort entries by date
    globalData[monthKey].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Cache'i temizle
    dataCache.clear();
    
    // Save and notify
    saveGlobalData();
  }, []);

  const removeOvertimeEntry = React.useCallback((date: Date, type?: 'overtime' | 'leave') => {
    if (!isDataLoaded) {
      return;
    }

    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);

    if (globalData[monthKey]) {
      globalData[monthKey] = globalData[monthKey].filter(entry => 
        entry.date !== dateKey || (type && entry.type !== type)
      );
      if (globalData[monthKey].length === 0) {
        delete globalData[monthKey];
      }
    }
    
    // Cache'i temizle
    dataCache.clear();
    
    saveGlobalData();
  }, []);

  const clearMonthData = React.useCallback((year: number, month: number) => {
    if (!isDataLoaded) return;

    const monthKey = getMonthKey(new Date(year, month));
    
    delete globalData[monthKey];
    dataCache.clear();
    saveGlobalData();
  }, []);

  const getOvertimeForDate = React.useCallback((date: Date, type?: 'overtime' | 'leave'): OvertimeEntry | undefined => {
    if (!isDataLoaded) return undefined;

    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    const cacheKey = `overtime-${dateKey}-${type || 'any'}`;
    
    return getCachedData(cacheKey, () => {
      if (!globalData[monthKey]) return undefined;
      return globalData[monthKey].find(entry => entry.date === dateKey && (!type || entry.type === type));
    });
  }, [isLoaded, monthlyDataMemo]);

  const getEntriesForDate = React.useCallback((date: Date): OvertimeEntry[] => {
    if (!isDataLoaded) return [];

    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    
    if (!globalData[monthKey]) return [];
    return globalData[monthKey].filter(entry => entry.date === dateKey);
  }, [isLoaded, monthlyDataMemo]);

  const { isHoliday } = useHolidays();

  const getMonthlyTotal = React.useCallback((year: number, month: number, deductBreakTime: boolean): number => {
    if (!isDataLoaded) return 0;

    const monthKey = getMonthKey(new Date(year, month));
    if (!globalData[monthKey]) return 0;

    return globalData[monthKey].reduce((total, entry) => {
      if (entry.type === 'leave') return total;
      const date = new Date(entry.date);
      const isSaturday = date.getDay() === 6;
      const isSunday = date.getDay() === 0;
      const isEntryHoliday = isHoliday(date);
      return total + calculateEffectiveHours(entry.totalHours, deductBreakTime, isSaturday, isSunday, isEntryHoliday, settings.isSaturdayWork);
    }, 0);
  }, [isLoaded, isHoliday, settings.isSaturdayWork, monthlyDataMemo]);

  const getMonthlyEntries = React.useCallback((year: number, month: number): OvertimeEntry[] => {
    if (!isDataLoaded) return [];

    const monthKey = getMonthKey(new Date(year, month));
    return globalData[monthKey] || [];
  }, [isLoaded, monthlyDataMemo]);

  const hasMonthData = React.useCallback((year: number, month: number): boolean => {
    if (!isDataLoaded) return false;
    const monthKey = getMonthKey(new Date(year, month));
    return !!globalData[monthKey] && globalData[monthKey].length > 0;
  }, [isLoaded, monthlyDataMemo]);

  // Veri export fonksiyonu (yedekleme için)
  const exportAllData = React.useCallback(() => {
    const backup = {
      version: 2,
      overtime: globalData,
      settings: settings
    };
    return JSON.stringify(backup, null, 2);
  }, [settings]);

  // Belirli bir ayın verisini export fonksiyonu
  const exportMonthData = React.useCallback((year: number, month: number) => {
    const monthKey = getMonthKey(new Date(year, month));
    const monthData = globalData[monthKey] || [];
    // Sadece o ayın verisini içeren bir nesne oluştur
    const exportObject = {
      [monthKey]: monthData
    };
    return JSON.stringify(exportObject, null, 2);
  }, []);

  // Veri import fonksiyonu (geri yükleme için)
  const importData = React.useCallback((dataString: string) => {
    try {
      const importedData = JSON.parse(dataString);
      
      let overtimeToProcess = importedData;
      
      // Check for versioned backup format
      if (importedData.version === 2 && importedData.overtime) {
        overtimeToProcess = importedData.overtime;
        if (importedData.settings) {
          importSettings(importedData.settings);
        }
      }
      
      const validatedData = validateAndCleanData(overtimeToProcess);
      
      // Mevcut veri ile birleştir
      Object.keys(validatedData).forEach(monthKey => {
        if (!globalData[monthKey]) {
          globalData[monthKey] = [];
        }
        
        // Duplicate kontrolü
        validatedData[monthKey].forEach(newEntry => {
          const existingIndex = globalData[monthKey].findIndex(
            entry => entry.date === newEntry.date
          );
          
          if (existingIndex >= 0) {
            globalData[monthKey][existingIndex] = newEntry;
          } else {
            globalData[monthKey].push(newEntry);
          }
        });
        
        // Tarihe göre sırala
        globalData[monthKey].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      });
      
      dataCache.clear();
      saveGlobalData();
      
      return true;
    } catch (error) {
      console.error('Veri import hatası:', error);
      return false;
    }
  }, [importSettings]);

  const getYearlyTotal = React.useCallback((year: number, deductBreakTime: boolean): number => {
    if (!isDataLoaded) return 0;

    let yearlyTotal = 0;
    Object.keys(globalData).forEach(monthKey => {
      if (monthKey.startsWith(year.toString())) {
        globalData[monthKey].forEach(entry => {
          if (entry.type === 'leave') return;
          const date = new Date(entry.date);
          const isSaturday = date.getDay() === 6;
          const isSunday = date.getDay() === 0;
          const isEntryHoliday = isHoliday(date);
          yearlyTotal += calculateEffectiveHours(entry.totalHours, deductBreakTime, isSaturday, isSunday, isEntryHoliday, settings.isSaturdayWork);
        });
      }
    });
    return yearlyTotal;
  }, [isLoaded, isHoliday, settings.isSaturdayWork, monthlyDataMemo]);

  return {
    monthlyData: monthlyDataMemo,
    isLoaded,
    addOvertimeEntry,
    removeOvertimeEntry,
    clearMonthData,
    getOvertimeForDate,
    getEntriesForDate,
    getMonthlyTotal,
    hasMonthData,
    getMonthlyEntries,
    getYearlyTotal,
    exportAllData,
    exportMonthData,
    importData,
    clearAllData
  };
};
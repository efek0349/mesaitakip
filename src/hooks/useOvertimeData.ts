import React from 'react';
import { OvertimeEntry, MonthlyData } from '../types/overtime';
import { getMonthKey, getDateKey, calculateEffectiveHours, parseDate } from '../utils/dateUtils';
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

// Load data from localStorage (ay bazlı yeni sistem)
const loadGlobalData = () => {
  if (isDataLoaded) return;
  
  try {
    const isFirstRun = !localStorage.getItem('mesai-app-initialized');
    if (isFirstRun) {
      clearAllLegacyData();
      localStorage.setItem('mesai-app-initialized', 'true');
      globalData = {};
    } else {
      // 1. ESKİ SİSTEMDEN GÖÇ (MIGRATION)
      const legacyData = localStorage.getItem('mesai-data');
      if (legacyData) {
        try {
          const parsedLegacy = JSON.parse(legacyData);
          const validatedLegacy = validateAndCleanData(parsedLegacy);
          
          // Her ayı kendi anahtarına kaydet
          Object.keys(validatedLegacy).forEach(monthKey => {
            localStorage.setItem(`mesai-data-${monthKey}`, JSON.stringify(validatedLegacy[monthKey]));
          });
          
          // Eski anahtarı sil
          localStorage.removeItem('mesai-data');
          globalData = validatedLegacy;
        } catch (e) {
          console.error('Migration hatası:', e);
        }
      }

      // 2. YENİ SİSTEM: Tüm mesai-data- anahtarlarını yükle
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mesai-data-')) {
          allKeys.push(key);
        }
      }

      allKeys.forEach(key => {
        const monthKey = key.replace('mesai-data-', '');
        const savedMonthData = localStorage.getItem(key);
        if (savedMonthData) {
          try {
            const parsedMonthData = JSON.parse(savedMonthData);
            if (Array.isArray(parsedMonthData)) {
              globalData[monthKey] = parsedMonthData;
            }
          } catch (e) {
            console.error(`Veri yükleme hatası (${key}):`, e);
          }
        }
      });
      
      // Veriyi bir kez doğrula
      globalData = validateAndCleanData(globalData);
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

// Basit save (ay bazlı saklama)
const saveGlobalData = (specificMonthKey?: string) => {
  try {
    if (specificMonthKey) {
      // Sadece belirli bir ayı kaydet (Performans için ideal)
      const data = globalData[specificMonthKey];
      if (data && data.length > 0) {
        localStorage.setItem(`mesai-data-${specificMonthKey}`, JSON.stringify(data));
      } else {
        localStorage.removeItem(`mesai-data-${specificMonthKey}`);
      }
    } else {
      // Tüm ayları döngüyle kaydet (Fallback veya toplu işlem)
      Object.keys(globalData).forEach(monthKey => {
        const data = globalData[monthKey];
        if (data && data.length > 0) {
          localStorage.setItem(`mesai-data-${monthKey}`, JSON.stringify(data));
        } else {
          localStorage.removeItem(`mesai-data-${monthKey}`);
        }
      });
    }
    
    dataCache.clear();
    dataEmitter.emit();
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // 1. Önce 2 yıldan eski verileri temizle
      cleanOldData();
      
      // 2. Hala yer yoksa, en eski ayı sil
      const allMonthKeys = Object.keys(globalData).sort();
      if (allMonthKeys.length > 0) {
        const oldestKey = allMonthKeys[0];
        delete globalData[oldestKey];
        localStorage.removeItem(`mesai-data-${oldestKey}`);
        // Tekrar dene
        saveGlobalData(specificMonthKey);
      }
      dataCache.clear();
      dataEmitter.emit();
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
  const { settings, importSettings, getSalaryForDate } = useSalarySettings();

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

    // Update global data with new array reference
    if (!globalData[monthKey]) {
      globalData[monthKey] = [];
    }
    
    const newMonthData = [...globalData[monthKey]];
    const existingIndex = newMonthData.findIndex(entry => entry.date === dateKey && entry.type === type);
    
    if (existingIndex >= 0) {
      newMonthData[existingIndex] = newEntry;
    } else {
      newMonthData.push(newEntry);
    }
    
    // Sort and update
    newMonthData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    globalData[monthKey] = newMonthData;
    
    // Cache'i temizle
    dataCache.clear();
    
    // Save and notify
    saveGlobalData(monthKey);
  }, []);

  const removeOvertimeEntry = React.useCallback((date: Date, type?: 'overtime' | 'leave') => {
    if (!isDataLoaded) {
      return;
    }

    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);

    if (globalData[monthKey]) {
      const newMonthData = globalData[monthKey].filter(entry => 
        entry.date !== dateKey || (type && entry.type !== type)
      );
      
      if (newMonthData.length === 0) {
        delete globalData[monthKey];
      } else {
        globalData[monthKey] = newMonthData;
      }
    }
    
    // Cache'i temizle
    dataCache.clear();
    
    saveGlobalData(monthKey);
  }, []);

  const clearMonthData = React.useCallback((year: number, month: number) => {
    if (!isDataLoaded) return;

    const monthKey = getMonthKey(new Date(year, month));
    
    delete globalData[monthKey];
    dataCache.clear();
    saveGlobalData(monthKey);
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

    // O ay için tarihsel ayarı çek
    const monthSettings = getSalaryForDate(new Date(year, month));
    const isSaturdayWork = monthSettings.isSaturdayWork ?? settings.isSaturdayWork;

    return globalData[monthKey].reduce((total, entry) => {
      if (entry.type === 'leave') return total;
      const date = parseDate(entry.date);
      const isSaturday = date.getDay() === 6;
      const isSunday = date.getDay() === 0;
      const isEntryHoliday = isHoliday(date);
      return total + calculateEffectiveHours(entry.totalHours, deductBreakTime, isSaturday, isSunday, isEntryHoliday, isSaturdayWork);
    }, 0);
  }, [isLoaded, isHoliday, settings.isSaturdayWork, monthlyDataMemo, getSalaryForDate]);

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
        // Her ay için o ayın tarihsel ayarını çek
        const monthDate = new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1);
        const monthSettings = getSalaryForDate(monthDate);
        const isSaturdayWork = monthSettings.isSaturdayWork ?? settings.isSaturdayWork;

        globalData[monthKey].forEach(entry => {
          if (entry.type === 'leave') return;
          const date = parseDate(entry.date);
          const isSaturday = date.getDay() === 6;
          const isSunday = date.getDay() === 0;
          const isEntryHoliday = isHoliday(date);
          yearlyTotal += calculateEffectiveHours(entry.totalHours, deductBreakTime, isSaturday, isSunday, isEntryHoliday, isSaturdayWork);
        });
      }
    });
    return yearlyTotal;
  }, [isLoaded, isHoliday, settings.isSaturdayWork, monthlyDataMemo, getSalaryForDate]);

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
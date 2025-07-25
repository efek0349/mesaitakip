import { useState, useEffect, useCallback } from 'react';
import { OvertimeEntry, MonthlyData } from '../types/overtime';
import { getMonthKey, getDateKey } from '../utils/dateUtils';

// Global state için event emitter
class DataEventEmitter {
  private listeners: (() => void)[] = [];
  
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  emit() {
    this.listeners.forEach(listener => listener());
  }
}

const dataEmitter = new DataEventEmitter();

// Global data store
let globalData: MonthlyData = {};
let isDataLoaded = false;

// Performans için cache sistemi
const dataCache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

// Tüm eski verileri temizle (uygulama ilk açılışında)
const clearAllLegacyData = () => {
  try {
    console.log('🧹 Tüm eski veriler temizleniyor...');
    
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
        console.log(`🗑️ Silinen anahtar: ${key}`);
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
    
    console.log('✅ Tüm eski veriler temizlendi');
    
  } catch (error) {
    console.error('❌ Eski veri temizleme hatası:', error);
  }
};

// Load data from localStorage (sadece ana anahtar)
const loadGlobalData = () => {
  if (isDataLoaded) return;
  
  try {
    // İlk açılışta tüm eski verileri temizle
    const isFirstRun = !localStorage.getItem('mesai-app-initialized');
    if (isFirstRun) {
      console.log('🚀 İlk çalıştırma tespit edildi, tüm veriler temizleniyor...');
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
          console.log('📥 Ana veri yüklendi:', Object.keys(globalData).length, 'ay');
        } catch (parseError) {
          console.warn('⚠️ Ana veri bozuk, temiz başlangıç yapılıyor...');
          globalData = {};
        }
      } else {
        console.log('📝 Veri bulunamadı, temiz başlangıç');
        globalData = {};
      }
    }
    
  } catch (error) {
    console.error('❌ Veri yükleme hatası:', error);
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
               entry.hours >= 0 && entry.hours <= 24 &&
               entry.minutes >= 0 && entry.minutes < 60;
      });
      
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
    
    console.log('💾 Veri kaydedildi');
    dataEmitter.emit();
    
  } catch (error) {
    console.error('❌ Veri kaydetme hatası:', error);
    
    // Storage dolu ise eski verileri temizle
    if (error.name === 'QuotaExceededError') {
      cleanOldData();
      // Tekrar dene
      try {
        localStorage.setItem('mesai-data', JSON.stringify(globalData));
        console.log('💾 Temizlik sonrası veri kaydedildi');
      } catch (retryError) {
        console.error('❌ Temizlik sonrası da kaydetme başarısız:', retryError);
      }
    }
  }
};

// Eski verileri temizleme (2 yıldan eski)
const cleanOldData = () => {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const cutoffKey = getMonthKey(twoYearsAgo);
  let cleanedCount = 0;
  
  Object.keys(globalData).forEach(monthKey => {
    if (monthKey < cutoffKey) {
      delete globalData[monthKey];
      cleanedCount++;
    }
  });
  
  console.log(`🧹 ${cleanedCount} eski ay verisi temizlendi`);
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
    // localStorage'ı tamamen temizle
    clearAllLegacyData();
    
    // Global state'i sıfırla
    globalData = {};
    dataCache.clear();
    isDataLoaded = false;
    
    // Uygulama başlatma flag'ini sıfırla
    localStorage.removeItem('mesai-app-initialized');
    
    console.log('🧹 Tüm veriler temizlendi, uygulama sıfırlandı');
    dataEmitter.emit();
  } catch (error) {
    console.error('❌ Veri temizleme hatası:', error);
  }
};

export const useOvertimeData = () => {
  const [, setUpdateCounter] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Force re-render
  const forceUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    // Load data on mount
    loadGlobalData();
    setIsLoaded(true);
    
    // Subscribe to data changes
    const unsubscribe = dataEmitter.subscribe(forceUpdate);
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [forceUpdate]);

  const addOvertimeEntry = useCallback((date: Date, hours: number, minutes: number) => {
    if (!isDataLoaded) {
      console.warn('⚠️ Data not loaded yet, cannot add entry');
      return;
    }

    const totalHours = hours + minutes / 60;
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    
    const newEntry: OvertimeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateKey,
      hours,
      minutes,
      totalHours
    };

    console.log('➕ Adding overtime entry:', { monthKey, dateKey, newEntry });

    // Update global data
    if (!globalData[monthKey]) {
      globalData[monthKey] = [];
    }
    
    // Check if entry already exists for this date
    const existingIndex = globalData[monthKey].findIndex(entry => entry.date === dateKey);
    if (existingIndex >= 0) {
      console.log('🔄 Updating existing entry');
      globalData[monthKey][existingIndex] = newEntry;
    } else {
      console.log('✅ Adding new entry');
      globalData[monthKey].push(newEntry);
    }
    
    // Sort entries by date
    globalData[monthKey].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Cache'i temizle
    dataCache.clear();
    
    // Save and notify
    saveGlobalData();
  }, []);

  const removeOvertimeEntry = useCallback((date: Date) => {
    if (!isDataLoaded) {
      console.warn('⚠️ Data not loaded yet, cannot remove entry');
      return;
    }

    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    
    console.log('🗑️ Removing overtime entry:', { monthKey, dateKey });

    if (globalData[monthKey]) {
      globalData[monthKey] = globalData[monthKey].filter(entry => entry.date !== dateKey);
      if (globalData[monthKey].length === 0) {
        delete globalData[monthKey];
      }
    }
    
    // Cache'i temizle
    dataCache.clear();
    
    saveGlobalData();
  }, []);

  const clearMonthData = useCallback((year: number, month: number) => {
    if (!isDataLoaded) return;

    const monthKey = getMonthKey(new Date(year, month));
    console.log('🧹 Clearing month data:', monthKey);
    
    delete globalData[monthKey];
    dataCache.clear();
    saveGlobalData();
  }, []);

  const getOvertimeForDate = useCallback((date: Date): OvertimeEntry | undefined => {
    if (!isDataLoaded) return undefined;

    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    const cacheKey = `overtime-${dateKey}`;
    
    return getCachedData(cacheKey, () => {
      if (!globalData[monthKey]) return undefined;
      return globalData[monthKey].find(entry => entry.date === dateKey);
    });
  }, [isLoaded]);

  const getMonthlyTotal = useCallback((year: number, month: number): number => {
    if (!isDataLoaded) return 0;

    const monthKey = getMonthKey(new Date(year, month));
    const cacheKey = `total-${monthKey}`;
    
    return getCachedData(cacheKey, () => {
      if (!globalData[monthKey]) return 0;
      return globalData[monthKey].reduce((total, entry) => total + entry.totalHours, 0);
    });
  }, [isLoaded]);

  const getMonthlyEntries = useCallback((year: number, month: number): OvertimeEntry[] => {
    if (!isDataLoaded) return [];

    const monthKey = getMonthKey(new Date(year, month));
    const cacheKey = `entries-${monthKey}`;
    
    return getCachedData(cacheKey, () => {
      return globalData[monthKey] || [];
    });
  }, [isLoaded]);

  // Veri export fonksiyonu (yedekleme için)
  const exportAllData = useCallback(() => {
    return JSON.stringify(globalData, null, 2);
  }, []);

  // Veri import fonksiyonu (geri yükleme için)
  const importData = useCallback((dataString: string) => {
    try {
      const importedData = JSON.parse(dataString);
      const validatedData = validateAndCleanData(importedData);
      
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
      
      console.log('✅ Veri başarıyla import edildi');
      return true;
    } catch (error) {
      console.error('❌ Veri import hatası:', error);
      return false;
    }
  }, []);

  return {
    monthlyData: globalData,
    isLoaded,
    addOvertimeEntry,
    removeOvertimeEntry,
    clearMonthData,
    getOvertimeForDate,
    getMonthlyTotal,
    getMonthlyEntries,
    exportAllData,
    importData,
    clearAllData,
    forceUpdate: Date.now()
  };
};
import React, { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { OvertimeEntry, MonthlyData, calcTotalHours } from '../types/overtime';
import { getMonthKey, getDateKey, calculateEffectiveHours, parseDate } from '../utils/dateUtils';
import { useSalarySettings } from './useSalarySettings';
import { useHolidays } from './useHolidays';
import { storage } from '../utils/storageUtils';
import { WidgetUpdate } from '../utils/widgetUpdate';

import { EventEmitter } from '../utils/EventEmitter';

const dataEmitter = new EventEmitter();

// Global data store
let globalData: MonthlyData = {};
let isDataLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Store interface for useSyncExternalStore
const overtimeStore = {
  subscribe: (callback: () => void) => dataEmitter.subscribe(callback),
  getSnapshot: () => globalData,
  getServerSnapshot: () => ({})
};

// Tüm eski verileri temizle (uygulama ilk açılışında)
const clearAllLegacyData = async () => {
  try {
    const allKeys = await storage.keys();
    
    // Sadece kesinlikle eski veya geçici olduğu bilinen anahtarları sil
    const LEGACY_PREFIXES = ['mesai-data-old-', 'overtime-v1-'];
    const LEGACY_EXACT = ['mesai-data', 'overtime-data', 'app-data', 'user-settings'];

    const keysToRemove = allKeys.filter(key => 
      LEGACY_EXACT.includes(key) || 
      LEGACY_PREFIXES.some(prefix => key.startsWith(prefix))
    );

    if (keysToRemove.length > 0) {
      await Promise.allSettled(keysToRemove.map(key => storage.remove(key)));
    }
    
    // Clear localStorage too (for migration from web to native)
    localStorage.clear();
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
        return entry && typeof entry.id === 'string' && typeof entry.date === 'string' && 
               (typeof entry.hours === 'number' || typeof entry.totalHours === 'number');
      }).map((entry: any) => {
        const hours = typeof entry.hours === 'number' ? entry.hours : Math.floor(entry.totalHours || 0);
        const minutes = typeof entry.minutes === 'number' ? entry.minutes : Math.round(((entry.totalHours || 0) - hours) * 60);
        
         
        const { totalHours, ...rest } = entry; // totalHours'u çıkar (varsa)
        return {
          ...rest,
          hours,
          minutes,
          type: entry.type || 'overtime',
          isFullDay: !!entry.isFullDay,
          isPaid: entry.isPaid !== undefined ? !!entry.isPaid : false,
          deductFromOvertime: !!entry.deductFromOvertime
        } as OvertimeEntry;
      });
    }
  });
  return cleanData;
};

// Native "Hızlı Mesai Ekle" widget'ı (bkz. android/.../QuickOvertimeActivity.kt),
// uygulamayı hiç açmadan, WebView'a hiç dokunmadan kendi native ekranında
// çalışıyor — asıl "WhatsApp gibi anlık" hissin kaynağı bu (JS/React/CSS
// boot maliyeti sıfır). Ama tam o yüzden, ana uygulamanın kendi
// state'ini/depolama mantığını BİLMİYOR: doğrudan `mesai-data-{ay}` anahtarına
// yazmak, eğer uygulama O SIRADA zaten açıksa ve bellekteki (globalData) eski
// haliyle bir saveGlobalData() tetiklerse, native'in az önce eklediği kaydın
// SESSİZCE ÜZERİNE YAZILIP KAYBOLMASINA yol açabilirdi (klasik "eski state
// üzerine yazma" yarış durumu — tam olarak "uygulamanın çalışmasına engel
// olmasın" isteğinin ihlali).
//
// Bunun yerine native taraf, kaydı AYRI ve SADECE KENDİSİNİN yazdığı bir
// "bekleme kuyruğu" anahtarına (`quick-widget-pending`) ekliyor. JS tarafı
// (burada, veri zaten yüklendikten SONRA, globalData'nın güncel/gerçek
// halinin üzerine) bu kuyruğu okuyup normal addOvertimeEntry mantığıyla
// birebir aynı şekilde (tarih+tür bazlı, var olanı değiştir/yoksa ekle)
// entegre ediyor, sonra kuyruğu temizliyor. Böylece native yazma ile JS'in
// kendi state'i arasında hiçbir çakışma/veri kaybı riski kalmıyor.
export const processPendingWidgetEntries = async () => {
  try {
    const pendingRaw = await storage.get('quick-widget-pending');
    if (!pendingRaw) return;

    const pending = JSON.parse(pendingRaw);
    if (!Array.isArray(pending) || pending.length === 0) {
      await storage.remove('quick-widget-pending');
      return;
    }

    const affectedMonthKeys = new Set<string>();

    for (const raw of pending) {
      if (!raw || typeof raw.date !== 'string') continue;
      const hours = typeof raw.hours === 'number' ? raw.hours : 0;
      const minutes = typeof raw.minutes === 'number' ? raw.minutes : 0;
      if (hours === 0 && minutes === 0) continue;

      const monthKey = raw.date.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
      const newEntry: OvertimeEntry = {
        id: `widget-${raw.date}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: raw.date,
        hours,
        minutes,
        type: 'overtime',
        isFullDay: false,
        isPaid: false,
        deductFromOvertime: false,
      };

      const currentMonthData = globalData[monthKey] ? [...globalData[monthKey]] : [];
      const existingIndex = currentMonthData.findIndex(entry => entry.date === newEntry.date && entry.type === newEntry.type);
      if (existingIndex >= 0) currentMonthData[existingIndex] = newEntry;
      else currentMonthData.push(newEntry);
      currentMonthData.sort((a, b) => a.date.localeCompare(b.date));

      globalData = { ...globalData, [monthKey]: currentMonthData };
      affectedMonthKeys.add(monthKey);
    }

    for (const monthKey of affectedMonthKeys) {
      await saveGlobalData(monthKey);
    }
    await storage.remove('quick-widget-pending');
  } catch (error) {
    console.error('Widget bekleme kuyruğu işlenemedi:', error);
    // Bozuk veri sonsuz döngüye/tekrar denemeye yol açmasın diye temizle.
    await storage.remove('quick-widget-pending').catch(() => {});
  }
};

const loadGlobalData = async () => {
  if (isDataLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await storage.migrateIfNeeded();

      const initialized = await storage.get('mesai-app-initialized');
      if (!initialized) {
        await clearAllLegacyData();
        await storage.set('mesai-app-initialized', 'true');
        globalData = {};
      } else {
        const legacyData = await storage.get('mesai-data');
        if (legacyData) {
          const validatedLegacy = validateAndCleanData(JSON.parse(legacyData));
          await Promise.all(
            Object.keys(validatedLegacy).map(monthKey => 
              storage.set(`mesai-data-${monthKey}`, JSON.stringify(validatedLegacy[monthKey]))
            )
          );
          await storage.remove('mesai-data');
          globalData = validatedLegacy;
        } else {
          const allKeys = await storage.keys();
          const mesaiKeys = allKeys.filter(key => key && key.startsWith('mesai-data-'));
          
          const entries = await Promise.all(
            mesaiKeys.map(async key => {
              const data = await storage.get(key);
              return { key, data };
            })
          );

          entries.forEach(({ key, data }) => {
            if (data) {
              const monthKey = key.replace('mesai-data-', '');
              globalData[monthKey] = JSON.parse(data);
            }
          });
        }

        globalData = validateAndCleanData(globalData);
      }

      await processPendingWidgetEntries();

      isDataLoaded = true;
      dataEmitter.emit();
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      globalData = {};
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

const saveGlobalData = async (specificMonthKey?: string) => {
  try {
    if (specificMonthKey) {
      const data = globalData[specificMonthKey];
      const storageKey = `mesai-data-${specificMonthKey}`;
      if (data && data.length > 0) {
        await storage.set(storageKey, JSON.stringify(data));
      } else {
        await storage.remove(storageKey);
      }
    } else {
      // Tüm ayları paralel kaydet
      const savePromises = Object.keys(globalData).map(monthKey => {
        const data = globalData[monthKey];
        return storage.set(`mesai-data-${monthKey}`, JSON.stringify(data));
      });
      await Promise.all(savePromises);
      
      // Artık storage.keys() çağırıp silme yapmaya gerek yok eğer
      // saveGlobalData sadece full save için kullanılıyorsa.
      // Ancak silinen ayları da temizlemek istiyorsak:
      const allKeys = await storage.keys();
      const keysToRemove = allKeys.filter(key => {
        if (key?.startsWith('mesai-data-')) {
          const monthKey = key.replace('mesai-data-', '');
          return !globalData[monthKey];
        }
        return false;
      });
      
      if (keysToRemove.length > 0) {
        await Promise.allSettled(keysToRemove.map(key => storage.remove(key)));
      }
    }
    dataEmitter.emit();

    // Uygulama İÇİNDEN bir kayıt eklenip/değiştirilip/silindiğinde "Mesai
    // Ekle" widget'ının "Bu Ay" özetini (native tarafta, bkz.
    // MonthlyStatsCalculator.kt) hemen tazelemesi için sinyal gönder —
    // aksi halde widget bir sonraki periyodik sistem güncellemesine kadar
    // eski rakamları göstermeye devam ederdi.
    if (Capacitor.getPlatform() === 'android') {
      WidgetUpdate.refresh().catch(() => {});
    }
  } catch (error) {
    console.error('Kaydetme hatası:', error);
  }
};

export const useOvertimeData = () => {
  const data = useSyncExternalStore(
    overtimeStore.subscribe,
    overtimeStore.getSnapshot,
    overtimeStore.getServerSnapshot
  );

  const [isLoaded, setIsLoaded] = React.useState(isDataLoaded);
  const { settings, getSalaryForDate, importSettings } = useSalarySettings();

  const monthlyData = data;

  React.useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isDataLoaded) {
        await loadGlobalData();
        if (isMounted) setIsLoaded(true);
      } else if (!isLoaded) {
        if (isMounted) setIsLoaded(true);
      }
    };
    init();

    const unsubscribe = dataEmitter.subscribe(() => {
      if (isMounted) setIsLoaded(isDataLoaded);
    });

    return () => { 
      isMounted = false; 
      unsubscribe();
    };
  }, [isLoaded]);

  const addOvertimeEntry = React.useCallback((date: Date, hours: number, minutes: number, type: 'overtime' | 'leave' = 'overtime', note?: string, isFullDay: boolean = false, isPaid: boolean = false, workedHalfDay: boolean = false, deductFromOvertime: boolean = false, noAllowance: boolean = false) => {
    if (!isDataLoaded) return;
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    
    const newEntry: OvertimeEntry = { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      date: dateKey, 
      hours, 
      minutes, 
      type, 
      isFullDay, 
      isPaid,
      deductFromOvertime,
      workedHalfDay,
      noAllowance: noAllowance || undefined,
      note: note || undefined 
    };

    const currentMonthData = globalData[monthKey] ? [...globalData[monthKey]] : [];
    const existingIndex = currentMonthData.findIndex(entry => entry.date === dateKey && entry.type === type);
    
    if (existingIndex >= 0) currentMonthData[existingIndex] = newEntry;
    else currentMonthData.push(newEntry);
    
    currentMonthData.sort((a, b) => a.date.localeCompare(b.date));
    
    globalData = { ...globalData, [monthKey]: currentMonthData };
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
      saveGlobalData(monthKey);
    }
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
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    if (!monthlyData[monthKey]) return undefined;
    return monthlyData[monthKey].find(entry => entry.date === dateKey && (!type || entry.type === type));
  }, [monthlyData]);

  const getEntriesForDate = React.useCallback((date: Date): OvertimeEntry[] => {
    const monthKey = getMonthKey(date);
    const dateKey = getDateKey(date);
    if (!monthlyData[monthKey]) return [];
    return monthlyData[monthKey].filter(entry => entry.date === dateKey);
  }, [monthlyData]);

  const getMonthlyTotal = React.useCallback((year: number, month: number, deductBreakTime: boolean): number => {
    const monthKey = getMonthKey(new Date(year, month));
    if (!monthlyData[monthKey]) return 0;
    
    return monthlyData[monthKey].reduce((total, entry) => {
      if (entry.type === 'leave') return total;
      return total + calculateEffectiveHours(
        calcTotalHours(entry), 
        deductBreakTime
      );
    }, 0);
  }, [monthlyData]);

  const getMonthlyEntries = React.useCallback((year: number, month: number): OvertimeEntry[] => {
    const monthKey = getMonthKey(new Date(year, month));
    return monthlyData[monthKey] || [];
  }, [monthlyData]);

  const hasMonthData = React.useCallback((year: number, month: number): boolean => {
    const monthKey = getMonthKey(new Date(year, month));
    return !!monthlyData[monthKey] && monthlyData[monthKey].length > 0;
  }, [monthlyData]);

  const exportAllData = React.useCallback(() => 
    JSON.stringify({ version: 2, overtime: monthlyData, settings: settings }, null, 2), 
  [monthlyData, settings]);

  const importData = React.useCallback(async (dataString: string) => {
    try {
      const importedData = JSON.parse(dataString);
      const overtimeToProcess = (importedData.version === 2 && importedData.overtime) ? importedData.overtime : importedData;
      
      // Versiyon 2 değilse bile settings varsa import etmeyi dene
      const settingsToImport = importedData.settings;
      if (settingsToImport) {
        importSettings(settingsToImport);
      }
      
      const validatedData = validateAndCleanData(overtimeToProcess);
      
      // Merge yerine üzerine yaz (Full restore)
      globalData = validatedData;
      isDataLoaded = true;
      await saveGlobalData();
      return true;
    } catch (error) {
      return false;
    }
  }, [importSettings]);

  const getYearlyTotal = React.useCallback((year: number, deductBreakTime: boolean, dailyWorkingHours: number = 7.5): number => {
    let yearlyTotal = 0;
    const yearPrefix = `${year}-`;
    
    Object.keys(monthlyData).forEach(monthKey => {
      if (monthKey.startsWith(yearPrefix)) {
        monthlyData[monthKey].forEach(entry => {
          if (entry.type === 'leave') {
            if (entry.deductFromOvertime && (entry.isPaid === false)) {
              const leaveHours = entry.isFullDay ? dailyWorkingHours : calcTotalHours(entry);
              yearlyTotal -= leaveHours;
            }
            return;
          }
          yearlyTotal += calculateEffectiveHours(
            calcTotalHours(entry), 
            deductBreakTime
          );
        });
      }
    });
    return Math.max(0, yearlyTotal);
  }, [monthlyData]);

  const clearAllData = React.useCallback(async () => { 
    await clearAllLegacyData(); 
    globalData = {}; 
    isDataLoaded = false; 
    await storage.remove('mesai-app-initialized'); 
    dataEmitter.emit(); 
  }, []);

  return { 
    monthlyData, 
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
    importData, 
    clearAllData 
  };
};

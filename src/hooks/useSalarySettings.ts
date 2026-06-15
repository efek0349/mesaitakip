import React, { useSyncExternalStore } from 'react';
import { SalarySettings, MonthlySalary } from '../types/overtime';
import { getMonthKey, getNormalizedShiftStartDate, isSaturdayWorkday, getDateKey } from '../utils/dateUtils';
import { storage } from '../utils/storageUtils';

import { EventEmitter } from '../utils/EventEmitter';

const defaultSettings: SalarySettings = {
  firstName: '',
  lastName: '',
  monthlyGrossSalary: 28075.50,
  bonus: 0,
  monthlyWorkingHours: 225,
  weekdayMultiplier: 1.5,
  saturdayMultiplier: 1.5,
  sundayMultiplier: 2.5,
  holidayMultiplier: 2.0,
  deductBreakTime: true,
  isSaturdayWork: false,
  dailyWorkingHours: 9,
  hasSalaryAttachment: false,
  salaryAttachmentRate: 25,
  hasTES: false,
  tesRate: 3,
  defaultStartTime: '08:05',
  defaultEndTime: '18:05',
  shiftSystemEnabled: false,
  shiftSystemType: '2-shift',
  shiftStartDate: '',  // Kullanıcı vardiyayı aktif edince seçer; boş kalırsa bugün kullanılır
  shiftInitialType: 'day',
  salaryHistory: {},
  autoBackupEnabled: false,
  autoBackupPeriod: 'weekly',
  lastBackupDate: '',
  dailyMealAllowance: 0,
  dailyTravelAllowance: 0,
  departureTravelAllowance: 0,
  returnTravelAllowance: 0,
  allowanceHistory: {},
  allowanceStartDate: '',
  employmentStartDate: '',
  severanceCeiling: 64948.77,
  severanceStampTaxRate: 0.759,
  severanceBaseGross: 33030.00,
  showSeverancePay: false,
  shiftHistory: []
};

let globalSettings: SalarySettings = { ...defaultSettings };
let isSalaryLoaded = false;
const salaryEmitter = new EventEmitter();

const salaryStore = {
  subscribe: (callback: () => void) => salaryEmitter.subscribe(callback),
  getSnapshot: () => globalSettings,
  getServerSnapshot: () => globalSettings,
};

// Load settings from storage
const loadGlobalSettings = async () => {
  if (isSalaryLoaded) return;
  try {
    await storage.migrateIfNeeded(); 
    const initialized = await storage.get('mesai-app-initialized');
    if (initialized) {
      const savedSettings = await storage.get('mesai-salary-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // Migration for allowanceHistory: handle split travel
        let allowanceHistory = parsedSettings.allowanceHistory || {};
        if (Array.isArray(allowanceHistory)) {
          const map: { [date: string]: any } = {};
          allowanceHistory.forEach((h: any) => {
            if (h.date) {
              map[h.date] = { 
                meal: h.meal || 0, 
                travel: h.travel || 0,
                departure: h.departure || (h.travel ? h.travel / 2 : 0),
                return: h.return || (h.travel ? h.travel / 2 : 0)
              };
            }
          });
          allowanceHistory = map;
        } else {
          // Object format migration
          Object.keys(allowanceHistory).forEach(key => {
            const entry = allowanceHistory[key];
            if (entry.travel && entry.departure === undefined) {
              entry.departure = entry.travel / 2;
              entry.return = entry.travel / 2;
            }
          });
        }

        globalSettings = { 
          ...defaultSettings, 
          ...parsedSettings,
          salaryHistory: parsedSettings.salaryHistory || {},
          allowanceHistory
        };
        
        if (globalSettings.dailyWorkingHours === undefined) {
          globalSettings.dailyWorkingHours = globalSettings.isSaturdayWork ? 7.5 : 9;
        }

        // Ensure split travel exists (only fill in if truly never set, not when user set it to 0)
        if (globalSettings.departureTravelAllowance === undefined && globalSettings.returnTravelAllowance === undefined) {
          const half = (Number(globalSettings.dailyTravelAllowance) || 0) / 2;
          globalSettings.departureTravelAllowance = half;
          globalSettings.returnTravelAllowance = half;
        } else {
          if (globalSettings.departureTravelAllowance === undefined) globalSettings.departureTravelAllowance = 0;
          if (globalSettings.returnTravelAllowance === undefined) globalSettings.returnTravelAllowance = 0;
        }
      }
    }
  } catch (error) {
    console.error('Ayarlar yüklenirken hata:', error);
    globalSettings = { ...defaultSettings };
  }
  isSalaryLoaded = true;
  salaryEmitter.emit();
};

const saveGlobalSettings = async () => {
  try {
    await storage.set('mesai-salary-settings', JSON.stringify(globalSettings));
    salaryEmitter.emit();
  } catch (error) {
    console.error('Maaş ayarları kaydetme hatası:', error);
  }
};

export const useSalarySettings = () => {
  const settings = useSyncExternalStore(
    salaryStore.subscribe,
    salaryStore.getSnapshot,
    salaryStore.getServerSnapshot
  );

  const [isLoaded, setIsLoaded] = React.useState(isSalaryLoaded);

  const sortedSalaryKeys = React.useMemo(() => {
    return Object.keys(settings.salaryHistory || {}).sort().reverse();
  }, [settings.salaryHistory]);

  const sortedShiftHistory = React.useMemo(() => {
    return [...(settings.shiftHistory || [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [settings.shiftHistory]);

  React.useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!isSalaryLoaded) {
        await loadGlobalSettings();
        if (isMounted) setIsLoaded(true);
      } else if (!isLoaded) {
        if (isMounted) setIsLoaded(true);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [isLoaded]);

  const clearSalarySettings = React.useCallback(async () => {
    try {
      await storage.remove('mesai-salary-settings');
      globalSettings = { ...defaultSettings };
      isSalaryLoaded = false;
      salaryEmitter.emit();
    } catch (error) {
      console.error('Maaş ayarları temizleme hatası:', error);
    }
  }, []);

  const getSalaryForDate = React.useCallback((date: Date): MonthlySalary => {
    const monthKey = getMonthKey(date);
    const { salaryHistory, monthlyGrossSalary, bonus, shiftSystemEnabled, shiftSystemType, isSaturdayWorkManual: globalManual, isSaturdayWork: globalSatWork } = settings;

    let baseSalary = monthlyGrossSalary;
    let baseBonus = bonus;
    
    if (salaryHistory && salaryHistory[monthKey]) {
      const histEntry = salaryHistory[monthKey];
      baseSalary = histEntry.monthlyGrossSalary;
      baseBonus = histEntry.bonus;
    } else if (salaryHistory) {
      const mostRecentKey = sortedSalaryKeys.find(key => key <= monthKey);
      if (mostRecentKey) {
        baseSalary = salaryHistory[mostRecentKey].monthlyGrossSalary;
        baseBonus = salaryHistory[mostRecentKey].bonus;
      }
    }
    
    return {
      monthlyGrossSalary: baseSalary,
      bonus: baseBonus,
      isSaturdayWork: globalSatWork,
      isSaturdayWorkManual: globalManual,
      shiftSystemEnabled,
      shiftSystemType
    };
  }, [settings, sortedSalaryKeys]);

  const getShiftSettingsForDate = React.useCallback((date: Date) => {
    if (!settings.shiftSystemEnabled) return null;

    const dateStr = getDateKey(date);
    const entry = sortedShiftHistory.find(h => h.startDate <= dateStr);
    
    if (entry) {
      return {
        startDate: entry.startDate,
        systemType: entry.systemType,
        initialType: entry.initialType,
        normalizedStartDate: getNormalizedShiftStartDate(entry.startDate)
      };
    }

    if (!settings.shiftStartDate) return null;
    return {
      startDate: settings.shiftStartDate,
      systemType: settings.shiftSystemType || '2-shift',
      initialType: settings.shiftInitialType || 'day',
      normalizedStartDate: getNormalizedShiftStartDate(settings.shiftStartDate)
    };
  }, [settings, sortedShiftHistory]);

  const updateSettings = React.useCallback((newSettingsOrUpdater: SalarySettings | ((prev: SalarySettings) => SalarySettings), monthKey?: string, skipAllowanceHistory?: boolean) => {
    const currentSettings = globalSettings;
    const nextSettings = typeof newSettingsOrUpdater === 'function' 
      ? newSettingsOrUpdater(currentSettings) 
      : { ...newSettingsOrUpdater };

    const todayKey = getDateKey(new Date());

    if (nextSettings.shiftSystemType !== currentSettings.shiftSystemType) {
      if (nextSettings.shiftSystemType === '3-shift') {
        nextSettings.defaultStartTime = '08:05';
        nextSettings.defaultEndTime = '16:05';
      } else {
        nextSettings.defaultStartTime = '08:05';
        nextSettings.defaultEndTime = '18:05';
      }
    }

    nextSettings.isSaturdayWork = isSaturdayWorkday(nextSettings);
    nextSettings.dailyWorkingHours = Number(nextSettings.dailyWorkingHours) || currentSettings.dailyWorkingHours;

    let activeDate = new Date();
    if (monthKey) {
      const [year, month] = monthKey.split('-').map(Number);
      activeDate = new Date(year, month - 1, 1);
    }
    
    const currentShift = getShiftSettingsForDate(activeDate);

    // YOL/YEMEK GÜNCELLEME: global değerler değiştiğinde (Settings ekranından)
    const allowanceChanged = 
      nextSettings.dailyMealAllowance !== currentSettings.dailyMealAllowance || 
      nextSettings.departureTravelAllowance !== currentSettings.departureTravelAllowance ||
      nextSettings.returnTravelAllowance !== currentSettings.returnTravelAllowance;

    if (allowanceChanged) {
      const departure = Number(nextSettings.departureTravelAllowance) || 0;
      const returnVal = Number(nextSettings.returnTravelAllowance) || 0;
      nextSettings.dailyTravelAllowance = departure + returnVal;

      if (skipAllowanceHistory) {
        // Settings ekranından: history'yi temizle, tüm aylar global değeri kullanır
        nextSettings.allowanceHistory = {};
      }
      // Mesai modalından bu blok tetiklenmez (global değerler değişmez)
    }

    const shiftFieldsChanged = 
      nextSettings.shiftSystemEnabled !== currentSettings.shiftSystemEnabled ||
      nextSettings.shiftSystemType !== (currentShift?.systemType || currentSettings.shiftSystemType) ||
      nextSettings.shiftStartDate !== (currentShift?.startDate || currentSettings.shiftStartDate) ||
      nextSettings.shiftInitialType !== (currentShift?.initialType || currentSettings.shiftInitialType);

    if (shiftFieldsChanged && nextSettings.shiftSystemEnabled) {
      const newHistory = [...(currentSettings.shiftHistory || [])];
      // Vardiya yeni aktif ediliyorsa (önceden kapalıydı veya history boştu)
      // startDate'i bugün olarak zorla — geçmiş aylar etkilenmesin
      const isFirstActivation = !currentSettings.shiftSystemEnabled || newHistory.length === 0;
      const startDate = isFirstActivation ? todayKey : (nextSettings.shiftStartDate || todayKey);
      
      const existingIdx = newHistory.findIndex(h => h.startDate === startDate);
      const entry = {
        startDate: startDate,
        systemType: nextSettings.shiftSystemType || '2-shift',
        initialType: nextSettings.shiftInitialType || 'day'
      };

      if (existingIdx >= 0) {
        newHistory[existingIdx] = entry;
      } else {
        newHistory.push(entry);
      }
      
      newHistory.sort((a, b) => b.startDate.localeCompare(a.startDate));
      nextSettings.shiftHistory = newHistory;
    }

    if (monthKey) {
      const nextHistory = { ...(currentSettings.salaryHistory || {}) };
      
      nextHistory[monthKey] = {
        ...nextHistory[monthKey],
        monthlyGrossSalary: Number(nextSettings.monthlyGrossSalary),
        bonus: Number(nextSettings.bonus),
        shiftSystemEnabled: nextSettings.shiftSystemEnabled,
        shiftSystemType: nextSettings.shiftSystemType,
        defaultStartTime: nextSettings.defaultStartTime,
        defaultEndTime: nextSettings.defaultEndTime
      };
      nextSettings.salaryHistory = nextHistory;
    }
    
    globalSettings = nextSettings;
    saveGlobalSettings();
  }, [getShiftSettingsForDate]);

  const importSettings = React.useCallback((newSettings: SalarySettings) => {
    globalSettings = { 
      ...settings, 
      ...newSettings, 
      salaryHistory: { ...(settings.salaryHistory || {}), ...(newSettings.salaryHistory || {}) } 
    };
    saveGlobalSettings();
  }, [settings]);

  const getHourlyRate = React.useCallback((date?: Date) => {
    const workingHours = Number(settings.monthlyWorkingHours) || 225;
    if (workingHours <= 0) return 0;
    const salary = date ? getSalaryForDate(date) : { monthlyGrossSalary: settings.monthlyGrossSalary, bonus: settings.bonus };
    return Number(salary.monthlyGrossSalary) / workingHours;
  }, [settings, getSalaryForDate]);

  const getOvertimeRate = React.useCallback((date: Date, isHoliday: boolean = false, weeklyHours?: number) => {
    const grossHourlyRate = getHourlyRate(date);
    if (grossHourlyRate === 0) return 0;
    
    let multiplier = settings.weekdayMultiplier;
    
    if (isHoliday) {
      multiplier = settings.holidayMultiplier;
    } else if (date.getDay() === 0) {
      if (weeklyHours !== undefined && weeklyHours < 45) {
        multiplier = 2.0;
      } else {
        multiplier = settings.sundayMultiplier;
      }
    } else if (date.getDay() === 6) {
      multiplier = settings.saturdayMultiplier;
    }
    
    return Math.max(0, grossHourlyRate * multiplier);
  }, [getHourlyRate, settings]);

  return { 
    settings, 
    isLoaded, 
    updateSettings, 
    importSettings, 
    getHourlyRate, 
    getOvertimeRate, 
    getSalaryForDate, 
    getShiftSettingsForDate, 
    clearSalarySettings 
  };
};

import React, { useSyncExternalStore } from 'react';
import { SalarySettings, MonthlySalary } from '../types/overtime';
import { getMonthKey, getNormalizedShiftStartDate, isSaturdayWorkday } from '../utils/dateUtils';
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
  shiftStartDate: new Date().toISOString().split('T')[0],
  shiftInitialType: 'day',
  salaryHistory: {},
  autoBackupEnabled: false,
  autoBackupPeriod: 'weekly',
  lastBackupDate: '',
  dailyMealAllowance: 0,
  dailyTravelAllowance: 0,
  allowanceHistory: {},
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
    await storage.migrateIfNeeded(); // Migration'ın tamamlandığından emin ol
    const initialized = await storage.get('mesai-app-initialized');
    if (initialized) {
      const savedSettings = await storage.get('mesai-salary-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // Migration for allowanceHistory: from array to object map
        let allowanceHistory = parsedSettings.allowanceHistory || {};
        if (Array.isArray(allowanceHistory)) {
          const map: { [date: string]: { meal: number; travel: number } } = {};
          allowanceHistory.forEach((h: any) => {
            if (h.date) map[h.date] = { meal: h.meal || 0, travel: h.travel || 0 };
          });
          allowanceHistory = map;
        }

        globalSettings = { 
          ...defaultSettings, 
          ...parsedSettings,
          salaryHistory: parsedSettings.salaryHistory || {},
          allowanceHistory
        };
        
        // Migration: If dailyWorkingHours is missing, set it based on isSaturdayWork
        if (globalSettings.dailyWorkingHours === undefined) {
          globalSettings.dailyWorkingHours = globalSettings.isSaturdayWork ? 7.5 : 9;
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

// Save settings to storage
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
    const { salaryHistory, monthlyGrossSalary, bonus, shiftSystemEnabled, shiftSystemType, isSaturdayWorkManual: globalManual } = settings;

    if (salaryHistory && salaryHistory[monthKey]) {
      const histEntry = salaryHistory[monthKey];
      const manual = histEntry.isSaturdayWorkManual ?? globalManual;
      return {
        ...histEntry,
        isSaturdayWorkManual: manual,
        isSaturdayWork: isSaturdayWorkday({ ...histEntry, isSaturdayWorkManual: manual }),
        shiftSystemEnabled: histEntry.shiftSystemEnabled ?? shiftSystemEnabled,
        shiftSystemType: histEntry.shiftSystemType ?? shiftSystemType
      };
    }
    
    if (salaryHistory) {
      const mostRecentKey = sortedSalaryKeys.find(key => key <= monthKey);
      if (mostRecentKey) {
        const histEntry = salaryHistory[mostRecentKey];
        const manual = histEntry.isSaturdayWorkManual ?? globalManual;
        return {
          ...histEntry,
          isSaturdayWorkManual: manual,
          isSaturdayWork: isSaturdayWorkday({ ...histEntry, isSaturdayWorkManual: manual }),
          shiftSystemEnabled: histEntry.shiftSystemEnabled ?? shiftSystemEnabled,
          shiftSystemType: histEntry.shiftSystemType ?? shiftSystemType
        };
      }
    }
    
    return {
      monthlyGrossSalary,
      bonus,
      isSaturdayWork: isSaturdayWorkday(settings),
      isSaturdayWorkManual: settings.isSaturdayWorkManual,
      shiftSystemEnabled,
      shiftSystemType
    };
  }, [settings, sortedSalaryKeys]);

  const getShiftSettingsForDate = React.useCallback((date: Date) => {
    if (!settings.shiftSystemEnabled) return null;

    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
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

  const updateSettings = React.useCallback((newSettingsOrUpdater: SalarySettings | ((prev: SalarySettings) => SalarySettings), monthKey?: string) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    const currentSettings = globalSettings;
    const nextSettings = typeof newSettingsOrUpdater === 'function' 
      ? newSettingsOrUpdater(currentSettings) 
      : { ...newSettingsOrUpdater };

    // Vardiya sistemi tipi değiştiyse varsayılan saatleri güncelle
    if (nextSettings.shiftSystemType !== currentSettings.shiftSystemType) {
      if (nextSettings.shiftSystemType === '3-shift') {
        nextSettings.defaultStartTime = '08:05';
        nextSettings.defaultEndTime = '16:05';
      } else {
        nextSettings.defaultStartTime = '08:05';
        nextSettings.defaultEndTime = '18:05';
      }
    }

    // Cumartesi çalışma durumunu saatlere göre otomatik belirle
    nextSettings.isSaturdayWork = isSaturdayWorkday(nextSettings);

    // Günlük çalışma saatini UI'dan gelen değer olarak kullan (Artık zorlamıyoruz)
    nextSettings.dailyWorkingHours = Number(nextSettings.dailyWorkingHours) || currentSettings.dailyWorkingHours;

    let activeDate = now;
    if (monthKey) {
      const [year, month] = monthKey.split('-').map(Number);
      activeDate = new Date(year, month - 1, 1);
    }
    
    const currentShift = getShiftSettingsForDate(activeDate);

    // Allowance history tracking
    if (nextSettings.dailyMealAllowance !== currentSettings.dailyMealAllowance || 
        nextSettings.dailyTravelAllowance !== currentSettings.dailyTravelAllowance) {
      const nextAllowanceHistory = { ...(currentSettings.allowanceHistory || {}) };
      nextAllowanceHistory[today] = { 
        meal: Number(nextSettings.dailyMealAllowance) || 0, 
        travel: Number(nextSettings.dailyTravelAllowance) || 0 
      };
      nextSettings.allowanceHistory = nextAllowanceHistory;
    }

    // Vardiya geçmişi takibi
    const shiftFieldsChanged = 
      nextSettings.shiftSystemEnabled !== currentSettings.shiftSystemEnabled ||
      nextSettings.shiftSystemType !== (currentShift?.systemType || currentSettings.shiftSystemType) ||
      nextSettings.shiftStartDate !== (currentShift?.startDate || currentSettings.shiftStartDate) ||
      nextSettings.shiftInitialType !== (currentShift?.initialType || currentSettings.shiftInitialType);

    if (shiftFieldsChanged && nextSettings.shiftSystemEnabled) {
      const newHistory = [...(currentSettings.shiftHistory || [])];
      const startDate = nextSettings.shiftStartDate || today;
      
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
        monthlyGrossSalary: Number(nextSettings.monthlyGrossSalary),
        bonus: Number(nextSettings.bonus),
        isSaturdayWork: nextSettings.isSaturdayWork,
        isSaturdayWorkManual: nextSettings.isSaturdayWorkManual,
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

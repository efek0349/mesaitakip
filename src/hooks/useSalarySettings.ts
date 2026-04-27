import React, { useSyncExternalStore } from 'react';
import { SalarySettings, MonthlySalary } from '../types/overtime';
import { getMonthKey } from '../utils/dateUtils';

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
  showNextMonthDays: false,
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
  lastBackupDate: '',
  dailyMealAllowance: 0,
  dailyTravelAllowance: 0,
  allowanceHistory: []
};

const salaryEmitter = new EventEmitter();

// Global salary settings
let globalSettings: SalarySettings = { ...defaultSettings };
let isSalaryLoaded = false;

// Store interface for useSyncExternalStore
const salaryStore = {
  subscribe: (callback: () => void) => salaryEmitter.subscribe(callback),
  getSnapshot: () => globalSettings,
  getServerSnapshot: () => ({ ...defaultSettings })
};

// Load settings from localStorage
const loadGlobalSettings = () => {
  if (isSalaryLoaded) return;
  try {
    const isFirstRun = !localStorage.getItem('mesai-app-initialized');
    if (!isFirstRun) {
      const savedSettings = localStorage.getItem('mesai-salary-settings');
      if (savedSettings) {
        globalSettings = JSON.parse(savedSettings);
        if (!globalSettings.salaryHistory) globalSettings.salaryHistory = {};
        
        // Migration: If dailyWorkingHours is missing, set it based on isSaturdayWork
        if (globalSettings.dailyWorkingHours === undefined) {
          globalSettings.dailyWorkingHours = globalSettings.isSaturdayWork ? 7.5 : 9;
        }
      }
    }
  } catch (error) {
    globalSettings = { ...defaultSettings };
  }
  isSalaryLoaded = true;
};

// Save settings to localStorage
const saveGlobalSettings = () => {
  try {
    localStorage.setItem('mesai-salary-settings', JSON.stringify(globalSettings));
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

  const settingsMemo = React.useMemo(() => ({ ...settings }), [settings]);

  React.useEffect(() => {
    if (!isSalaryLoaded) {
      loadGlobalSettings();
      setIsLoaded(true);
      salaryEmitter.emit();
    } else if (!isLoaded) {
      setIsLoaded(true);
    }
  }, [isLoaded]);

  const clearSalarySettings = React.useCallback(() => {
    try {
      localStorage.removeItem('mesai-salary-settings');
      globalSettings = { ...defaultSettings };
      isSalaryLoaded = false;
      salaryEmitter.emit();
    } catch (error) {
      console.error('Maaş ayarları temizleme hatası:', error);
    }
  }, []);

  const getSalaryForDate = React.useCallback((date: Date): MonthlySalary => {
    const monthKey = getMonthKey(date);
    if (globalSettings.salaryHistory && globalSettings.salaryHistory[monthKey]) {
      return {
        ...globalSettings.salaryHistory[monthKey],
        isSaturdayWork: globalSettings.salaryHistory[monthKey].isSaturdayWork ?? globalSettings.isSaturdayWork,
        shiftSystemEnabled: globalSettings.salaryHistory[monthKey].shiftSystemEnabled ?? globalSettings.shiftSystemEnabled,
        shiftSystemType: globalSettings.salaryHistory[monthKey].shiftSystemType ?? globalSettings.shiftSystemType
      };
    }
    
    if (globalSettings.salaryHistory) {
      const historyKeys = Object.keys(globalSettings.salaryHistory).sort().reverse();
      const mostRecentKey = historyKeys.find(key => key <= monthKey);
      if (mostRecentKey) {
        return {
          ...globalSettings.salaryHistory[mostRecentKey],
          isSaturdayWork: globalSettings.salaryHistory[mostRecentKey].isSaturdayWork ?? globalSettings.isSaturdayWork,
          shiftSystemEnabled: globalSettings.salaryHistory[mostRecentKey].shiftSystemEnabled ?? globalSettings.shiftSystemEnabled,
          shiftSystemType: globalSettings.salaryHistory[mostRecentKey].shiftSystemType ?? globalSettings.shiftSystemType
        };
      }
    }
    
    return {
      monthlyGrossSalary: globalSettings.monthlyGrossSalary,
      bonus: globalSettings.bonus,
      isSaturdayWork: globalSettings.isSaturdayWork,
      shiftSystemEnabled: globalSettings.shiftSystemEnabled,
      shiftSystemType: globalSettings.shiftSystemType
    };
  }, [settingsMemo]);

  const updateSettings = React.useCallback((newSettings: SalarySettings, monthKey?: string) => {
    if (newSettings.dailyMealAllowance !== globalSettings.dailyMealAllowance || 
        newSettings.dailyTravelAllowance !== globalSettings.dailyTravelAllowance) {
      const today = new Date().toISOString().split('T')[0];
      const newHistory = [...(globalSettings.allowanceHistory || [])];
      const idx = newHistory.findIndex(h => h.date === today);
      const newEntry = { date: today, meal: Number(newSettings.dailyMealAllowance) || 0, travel: Number(newSettings.dailyTravelAllowance) || 0 };
      if (idx >= 0) newHistory[idx] = newEntry;
      else newHistory.push(newEntry);
      newHistory.sort((a, b) => b.date.localeCompare(a.date));
      newSettings.allowanceHistory = newHistory;
    }

    const nextSettings = { ...newSettings };
    if (monthKey) {
      const nextHistory = { ...(globalSettings.salaryHistory || {}) };
      nextHistory[monthKey] = {
        monthlyGrossSalary: Number(newSettings.monthlyGrossSalary),
        bonus: Number(newSettings.bonus),
        isSaturdayWork: newSettings.isSaturdayWork,
        shiftSystemEnabled: newSettings.shiftSystemEnabled,
        shiftSystemType: newSettings.shiftSystemType
      };
      nextSettings.salaryHistory = nextHistory;
    }
    
    globalSettings = nextSettings;
    saveGlobalSettings();
  }, []);

  const importSettings = React.useCallback((newSettings: SalarySettings) => {
    globalSettings = { ...globalSettings, ...newSettings, salaryHistory: { ...(globalSettings.salaryHistory || {}), ...(newSettings.salaryHistory || {}) } };
    saveGlobalSettings();
  }, []);

  const getHourlyRate = React.useCallback((date?: Date) => {
    const workingHours = Number(globalSettings.monthlyWorkingHours) || 225;
    if (workingHours <= 0) return 0;
    const salary = date ? getSalaryForDate(date) : { monthlyGrossSalary: globalSettings.monthlyGrossSalary, bonus: globalSettings.bonus };
    return Number(salary.monthlyGrossSalary) / workingHours;
  }, [settingsMemo, getSalaryForDate]);

  const getOvertimeRate = React.useCallback((date: Date, isHoliday: boolean = false) => {
    const grossHourlyRate = getHourlyRate(date);
    if (grossHourlyRate === 0) return 0;
    let multiplier = globalSettings.weekdayMultiplier;
    if (isHoliday) multiplier = globalSettings.holidayMultiplier;
    else if (date.getDay() === 0) multiplier = globalSettings.sundayMultiplier;
    else if (date.getDay() === 6) multiplier = globalSettings.saturdayMultiplier;
    return Math.max(0, grossHourlyRate * multiplier);
  }, [getHourlyRate, settingsMemo]);

  return { settings: settingsMemo, isLoaded, updateSettings, importSettings, getHourlyRate, getOvertimeRate, getSalaryForDate, clearSalarySettings };
};
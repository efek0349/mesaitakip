import React from 'react';
import { SalarySettings, MonthlySalary } from '../types/overtime';
import { getMonthKey } from '../utils/dateUtils';

import { EventEmitter } from '../utils/EventEmitter';

const defaultSettings: SalarySettings = {
  firstName: '',
  lastName: '',
  monthlyGrossSalary: 28075.50, // 2026 asgari ücret net
  bonus: 0,
  monthlyWorkingHours: 225, // Aylık çalışma saati
  weekdayMultiplier: 1.5,
  saturdayMultiplier: 1.5,
  sundayMultiplier: 2.5,
  holidayMultiplier: 2.0,
  deductBreakTime: true,
  showNextMonthDays: false,
  isSaturdayWork: false,
  hasSalaryAttachment: false,
  hasTES: false,
  tesRate: 3,
  defaultStartTime: '08:05',
  defaultEndTime: '18:05',
  shiftSystemEnabled: false,
  shiftSystemType: '2-shift',
  shiftStartDate: new Date().toISOString().split('T')[0],
  shiftInitialType: 'day',
  salaryHistory: {}
};

const salaryEmitter = new EventEmitter();

// Global salary settings
let globalSettings: SalarySettings = { ...defaultSettings };
let isSalaryLoaded = false;

// Load settings from localStorage
const loadGlobalSettings = () => {
  if (isSalaryLoaded) return;
  
  try {
    // İlk çalıştırma kontrolü
    const isFirstRun = !localStorage.getItem('mesai-app-initialized');
    if (isFirstRun) {
      globalSettings = { ...defaultSettings };
    } else {
      const savedSettings = localStorage.getItem('mesai-salary-settings');
      if (savedSettings) {
        globalSettings = JSON.parse(savedSettings);
        // Ensure salaryHistory exists
        if (!globalSettings.salaryHistory) {
          globalSettings.salaryHistory = {};
        }
      } else {
        globalSettings = { ...defaultSettings };
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
    salaryEmitter.emit(); // Notify all components
  } catch (error) {
    console.error('Maaş ayarları kaydetme hatası:', error);
  }
};

export const useSalarySettings = () => {
  const [updateCounter, setUpdateCounter] = React.useState(0);
  // Başlangıç değerini global state'den al
  const [isLoaded, setIsLoaded] = React.useState(isSalaryLoaded);

  // Memoized settings for performance - Triggered by updateCounter
  const settingsMemo = React.useMemo(() => ({ ...globalSettings }), [updateCounter, isLoaded]);

  // Force re-render
  const forceUpdate = React.useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  // Tüm maaş ayarlarını sıfırla - DOĞRU YER: Hook içinde
  const clearSalarySettings = React.useCallback(() => {
    try {
      localStorage.removeItem('mesai-salary-settings');
      globalSettings = { ...defaultSettings };
      // Force update by resetting isLoaded and triggering emitter
      isSalaryLoaded = false;
      salaryEmitter.emit();
    } catch (error) {
      console.error('Maaş ayarları temizleme hatası:', error);
    }
  }, []);

  React.useEffect(() => {
    // Veri henüz yüklenmemişse yükle
    if (!isSalaryLoaded) {
      loadGlobalSettings();
      setIsLoaded(true);
    } else if (!isLoaded) {
      setIsLoaded(true);
    }
    
    // Subscribe to settings changes
    const unsubscribe = salaryEmitter.subscribe(forceUpdate);
    
    return unsubscribe;
  }, [forceUpdate, isLoaded]);

  const getSalaryForDate = React.useCallback((date: Date): MonthlySalary => {
    if (!isSalaryLoaded) return { monthlyGrossSalary: globalSettings.monthlyGrossSalary, bonus: globalSettings.bonus };
    
    const monthKey = getMonthKey(date);
    if (globalSettings.salaryHistory && globalSettings.salaryHistory[monthKey]) {
      return globalSettings.salaryHistory[monthKey];
    }
    
    return {
      monthlyGrossSalary: globalSettings.monthlyGrossSalary,
      bonus: globalSettings.bonus
    };
  }, [isLoaded, settingsMemo]);

  const updateSettings = React.useCallback((newSettings: SalarySettings, monthKey?: string) => {
    globalSettings = { ...newSettings };
    
    // If monthKey is provided, also update/initialize salaryHistory for that month
    if (monthKey) {
      if (!globalSettings.salaryHistory) {
        globalSettings.salaryHistory = {};
      }
      globalSettings.salaryHistory[monthKey] = {
        monthlyGrossSalary: Number(newSettings.monthlyGrossSalary),
        bonus: Number(newSettings.bonus)
      };
    }
    
    saveGlobalSettings();
  }, []);

  const importSettings = React.useCallback((newSettings: SalarySettings) => {
    globalSettings = {
      ...globalSettings,
      ...newSettings,
      salaryHistory: {
        ...(globalSettings.salaryHistory || {}),
        ...(newSettings.salaryHistory || {})
      }
    };
    saveGlobalSettings();
  }, []);

  const getHourlyRate = React.useCallback((date?: Date) => {
    if (!isSalaryLoaded) return 0;
    
    const salary = date ? getSalaryForDate(date) : { monthlyGrossSalary: globalSettings.monthlyGrossSalary, bonus: globalSettings.bonus };
    return Number(salary.monthlyGrossSalary) / globalSettings.monthlyWorkingHours;
  }, [isLoaded, settingsMemo, getSalaryForDate]);

  const getOvertimeRate = React.useCallback((date: Date, isHoliday: boolean = false) => {
    if (!isSalaryLoaded) return 0;

    const dayOfWeek = date.getDay();
    const grossHourlyRate = getHourlyRate(date);
    
    if (grossHourlyRate === 0) return 0;
    
    let netOvertimeRate = 0;
    
    if (isHoliday) {
      netOvertimeRate = grossHourlyRate * globalSettings.holidayMultiplier;
    } else if (dayOfWeek === 0) { // Sunday
      netOvertimeRate = grossHourlyRate * globalSettings.sundayMultiplier;
    } else if (dayOfWeek === 6) { // Saturday
      netOvertimeRate = grossHourlyRate * globalSettings.saturdayMultiplier;
    } else { // Weekdays
      netOvertimeRate = grossHourlyRate * globalSettings.weekdayMultiplier;
    }
    
    return Math.max(0, netOvertimeRate);
  }, [isLoaded, getHourlyRate, settingsMemo]);

  return {
    settings: settingsMemo,
    isLoaded,
    updateSettings,
    importSettings,
    getHourlyRate,
    getOvertimeRate,
    getSalaryForDate,
    clearSalarySettings
  };
};

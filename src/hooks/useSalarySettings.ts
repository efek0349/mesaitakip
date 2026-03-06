import React from 'react';
import { SalarySettings } from '../types/overtime';

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

// Tüm maaş ayarlarını sıfırla
const clearSalarySettings = () => {
  try {
    localStorage.removeItem('mesai-salary-settings');
    globalSettings = { ...defaultSettings };
    isSalaryLoaded = false;
    salaryEmitter.emit();
  } catch (error) {
    console.error('Maaş ayarları temizleme hatası:', error);
  }
};

export const useSalarySettings = () => {
  const [, setUpdateCounter] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Memoized settings for performance - Move to top to avoid TDZ
  const settingsMemo = React.useMemo(() => globalSettings, [globalSettings]);

  // Force re-render
  const forceUpdate = React.useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  React.useEffect(() => {
    // Load settings on mount
    loadGlobalSettings();
    setIsLoaded(true);
    
    // Subscribe to settings changes
    const unsubscribe = salaryEmitter.subscribe(forceUpdate);
    
    return unsubscribe;
  }, [forceUpdate]);

  const updateSettings = React.useCallback((newSettings: SalarySettings) => {
    globalSettings = { ...newSettings };
    saveGlobalSettings();
  }, []);

  const getHourlyRate = React.useCallback(() => {
    if (!isSalaryLoaded) return 0;
    return globalSettings.monthlyGrossSalary / globalSettings.monthlyWorkingHours;
  }, [isLoaded, settingsMemo]);

  const getOvertimeRate = React.useCallback((date: Date, isHoliday: boolean = false) => {
    if (!isSalaryLoaded) return 0;

    const dayOfWeek = date.getDay();
    const grossHourlyRate = getHourlyRate();
    
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
    getHourlyRate,
    getOvertimeRate,
    clearSalarySettings
  };
};

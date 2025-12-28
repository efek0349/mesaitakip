import React from 'react';
import { SalarySettings } from '../types/overtime';

const defaultSettings: SalarySettings = {
  firstName: '',
  lastName: '',
  monthlyGrossSalary: 33030.00, // 2025 asgari ücret
  monthlyWorkingHours: 225, // 2025 aylık çalışma saati
  sgkRate: 15, // %14 SGK + %1 işsizlik
  incomeTaxRate: 15, // %15 gelir vergisi
  stampTaxRate: 0.759, // %0.759 damga vergisi
  weekdayMultiplier: 1.5,
  saturdayMultiplier: 1.5,
  sundayMultiplier: 2.5,
  holidayMultiplier: 2.0,
  deductBreakTime: true,
  showNextMonthDays: false,
  isSaturdayWork: false,
  defaultStartTime: '08:05',
  defaultEndTime: '18:05',
};

// Global salary event emitter
class SalaryEventEmitter {
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

const salaryEmitter = new SalaryEventEmitter();

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
  }, [isLoaded]);

  const getOvertimeRate = React.useCallback((date: Date, isHoliday: boolean = false) => {
    if (!isSalaryLoaded) return 0;

    const dayOfWeek = date.getDay();
    const grossHourlyRate = getHourlyRate();
    
    if (grossHourlyRate === 0) return 0;
    
    let grossOvertimeRate = 0;
    
    if (isHoliday) {
      grossOvertimeRate = grossHourlyRate * globalSettings.holidayMultiplier;
    } else if (dayOfWeek === 0) { // Sunday
      grossOvertimeRate = grossHourlyRate * globalSettings.sundayMultiplier;
    } else if (dayOfWeek === 6) { // Saturday
      grossOvertimeRate = grossHourlyRate * globalSettings.saturdayMultiplier;
    } else { // Weekdays
      grossOvertimeRate = grossHourlyRate * globalSettings.weekdayMultiplier;
    }
    
    // Sıfır kontrolü
    if (grossOvertimeRate === 0) return 0;
    
    // Net hesaplama (kesintiler)
    const sgkAndUnemployment = grossOvertimeRate * (globalSettings.sgkRate / 100);
    const afterSgk = grossOvertimeRate - sgkAndUnemployment;
    const incomeTax = afterSgk * (globalSettings.incomeTaxRate / 100);
    const stampTax = grossOvertimeRate * (globalSettings.stampTaxRate / 100);
    
    const netOvertimeRate = grossOvertimeRate - sgkAndUnemployment - incomeTax - stampTax;
    
    return Math.max(0, netOvertimeRate);
  }, [isLoaded, getHourlyRate]);

  // Memoized settings for performance
  const settingsMemo = React.useMemo(() => globalSettings, [globalSettings]);

  return {
    settings: settingsMemo,
    isLoaded,
    updateSettings,
    getHourlyRate,
    getOvertimeRate,
    clearSalarySettings
  };
};

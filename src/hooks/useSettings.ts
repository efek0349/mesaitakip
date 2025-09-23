import { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings } from '../types/overtime';

const defaultAppSettings: Settings = {
  firstName: '',
  lastName: '',
  monthlyGrossSalary: 26005.50, // 2025 asgari ücret
  monthlyWorkingHours: 225, // 2025 aylık çalışma saati
  sgkRate: 15, // %14 SGK + %1 işsizlik
  incomeTaxRate: 15, // %15 gelir vergisi
  stampTaxRate: 0.759, // %0.759 damga vergisi
  weekdayMultiplier: 1.5,
  saturdayMultiplier: 1.5,
  sundayMultiplier: 2.5,
  holidayMultiplier: 2.0,
  deductBreakTime: false,
  showNextMonthDays: true
};

// Global salary event emitter
class SettingsEventEmitter {
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

const settingsEmitter = new SettingsEventEmitter();

// Global salary settings
let globalAppSettings: Settings = { ...defaultAppSettings };
let isSettingsLoaded = false;

// Load settings from localStorage
const loadGlobalAppSettings = () => {
  if (isSettingsLoaded) return;
  
  try {
    // İlk çalıştırma kontrolü
    const isFirstRun = !localStorage.getItem('mesai-app-initialized');
    if (isFirstRun) {
      globalAppSettings = { ...defaultAppSettings };
    } else {
      const savedSettings = localStorage.getItem('mesai-app-settings');
      if (savedSettings) {
        globalAppSettings = JSON.parse(savedSettings);
      } else {
        globalAppSettings = { ...defaultAppSettings };
      }
    }
  } finally {
    isSettingsLoaded = true;
  }
};

// Save settings to localStorage
const saveGlobalAppSettings = () => {
  try {
    localStorage.setItem('mesai-app-settings', JSON.stringify(globalAppSettings));
    settingsEmitter.emit(); // Notify all components
  } catch (error) {
    console.error('Maaş ayarları kaydetme hatası:', error);
  }
};

// Tüm maaş ayarlarını sıfırla
const clearAppSettings = () => {
  try {
    localStorage.removeItem('mesai-app-settings');
    globalAppSettings = { ...defaultAppSettings };
    isSettingsLoaded = false;
    settingsEmitter.emit();
  } catch (error) {
    console.error('Maaş ayarları temizleme hatası:', error);
  }
};

export const useSettings = () => {
  const [, setUpdateCounter] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Force re-render
  const forceUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    // Load settings on mount
    loadGlobalAppSettings();
    setIsLoaded(true);
    
    // Subscribe to settings changes
    const unsubscribe = settingsEmitter.subscribe(forceUpdate);
    
    return unsubscribe;
  }, [forceUpdate]);

  const updateSettings = useCallback((newSettings: Settings) => {
    globalAppSettings = { ...newSettings };
    saveGlobalAppSettings();
  }, []);

  const getHourlyRate = useCallback(() => {
    if (!isSettingsLoaded) return 0;
    return globalAppSettings.monthlyGrossSalary / globalAppSettings.monthlyWorkingHours;
  }, [isLoaded]);

  const getOvertimeRate = useCallback((date: Date, isHoliday: boolean = false) => {
    if (!isSettingsLoaded) return 0;

    const dayOfWeek = date.getDay();
    const grossHourlyRate = getHourlyRate();
    
    if (grossHourlyRate === 0) return 0;
    
    let grossOvertimeRate = 0;
    
    if (isHoliday) {
      grossOvertimeRate = grossHourlyRate * globalAppSettings.holidayMultiplier;
    } else if (dayOfWeek === 0) { // Sunday
      grossOvertimeRate = grossHourlyRate * globalAppSettings.sundayMultiplier;
    } else if (dayOfWeek === 6) { // Saturday
      grossOvertimeRate = grossHourlyRate * globalAppSettings.saturdayMultiplier;
    } else { // Weekdays
      grossOvertimeRate = grossHourlyRate * globalAppSettings.weekdayMultiplier;
    }
    
    // Sıfır kontrolü
    if (grossOvertimeRate === 0) return 0;
    
    // Net hesaplama (kesintiler)
    const sgkAndUnemployment = grossOvertimeRate * (globalAppSettings.sgkRate / 100);
    const afterSgk = grossOvertimeRate - sgkAndUnemployment;
    const incomeTax = afterSgk * (globalAppSettings.incomeTaxRate / 100);
    const stampTax = grossOvertimeRate * (globalAppSettings.stampTaxRate / 100);
    
    const netOvertimeRate = grossOvertimeRate - sgkAndUnemployment - incomeTax - stampTax;
    
    return Math.max(0, netOvertimeRate);
  }, [isLoaded, getHourlyRate]);

  // Memoized settings for performance
  const settingsMemo = useMemo(() => globalAppSettings, [globalAppSettings]);

  return {
    settings: settingsMemo,
    isLoaded,
    updateSettings,
    getHourlyRate,
    getOvertimeRate,
    clearAppSettings
  };
};
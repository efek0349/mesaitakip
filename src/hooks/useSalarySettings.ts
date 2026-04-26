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
    if (!isSalaryLoaded) {
      return { 
        monthlyGrossSalary: globalSettings.monthlyGrossSalary, 
        bonus: globalSettings.bonus,
        isSaturdayWork: globalSettings.isSaturdayWork,
        shiftSystemEnabled: globalSettings.shiftSystemEnabled,
        shiftSystemType: globalSettings.shiftSystemType
      };
    }
    
    const monthKey = getMonthKey(date);
    
    // Eğer o ay için tam eşleşme varsa onu döndür
    if (globalSettings.salaryHistory && globalSettings.salaryHistory[monthKey]) {
      return {
        ...globalSettings.salaryHistory[monthKey],
        // Eğer geçmiş kayıtta bu alanlar yoksa (eski kayıtlar), global ayarlardan al
        isSaturdayWork: globalSettings.salaryHistory[monthKey].isSaturdayWork ?? globalSettings.isSaturdayWork,
        shiftSystemEnabled: globalSettings.salaryHistory[monthKey].shiftSystemEnabled ?? globalSettings.shiftSystemEnabled,
        shiftSystemType: globalSettings.salaryHistory[monthKey].shiftSystemType ?? globalSettings.shiftSystemType
      };
    }
    
    // Eğer o ay için kayıt yoksa, geçmişe doğru giderek en yakın kaydı bul (Most Recent Lookup)
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
  }, [isLoaded, settingsMemo]);

  const updateSettings = React.useCallback((newSettings: SalarySettings, monthKey?: string) => {
    // Fiyat değişmişse tarih bazlı geçmişe ekle (Yemek veya Yol değişmişse)
    if (newSettings.dailyMealAllowance !== globalSettings.dailyMealAllowance || 
        newSettings.dailyTravelAllowance !== globalSettings.dailyTravelAllowance) {
      
      const today = new Date().toISOString().split('T')[0];
      const newHistory = [...(globalSettings.allowanceHistory || [])];
      
      // Eğer aynı gün zaten bir değişim yapılmışsa onu güncelle, yoksa yeni ekle
      const existingTodayIndex = newHistory.findIndex(h => h.date === today);
      const newEntry = { 
        date: today, 
        meal: Number(newSettings.dailyMealAllowance) || 0, 
        travel: Number(newSettings.dailyTravelAllowance) || 0 
      };

      if (existingTodayIndex >= 0) {
        newHistory[existingTodayIndex] = newEntry;
      } else {
        newHistory.push(newEntry);
      }
      
      // Tarihe göre sırala
      newHistory.sort((a, b) => b.date.localeCompare(a.date));
      newSettings.allowanceHistory = newHistory;
    }

    globalSettings = { ...newSettings };
    
    // If monthKey is provided, also update/initialize salaryHistory for that month
    if (monthKey) {
      if (!globalSettings.salaryHistory) {
        globalSettings.salaryHistory = {};
      }
      globalSettings.salaryHistory[monthKey] = {
        monthlyGrossSalary: Number(newSettings.monthlyGrossSalary),
        bonus: Number(newSettings.bonus),
        isSaturdayWork: newSettings.isSaturdayWork,
        shiftSystemEnabled: newSettings.shiftSystemEnabled,
        shiftSystemType: newSettings.shiftSystemType
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
    
    const workingHours = Number(globalSettings.monthlyWorkingHours) || 225;
    if (workingHours <= 0) return 0;

    const salary = date ? getSalaryForDate(date) : { monthlyGrossSalary: globalSettings.monthlyGrossSalary, bonus: globalSettings.bonus };
    return Number(salary.monthlyGrossSalary) / workingHours;
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSalarySettings } from './useSalarySettings';
import { SalarySettings as SalarySettingsType } from '../types/overtime';
import { APP_VERSION } from '../constants';
import { getMonthKey, isSaturdayWorkday, calculateDailyGrossHours, calculateEffectiveHours } from '../utils/dateUtils';
import { calculateSeverancePay } from '../utils/salaryUtils';

export type SettingsTab = 'general' | 'salary' | 'severance' | 'system';

/**
 * useSettingsLogic — Settings.tsx'in TÜM state/handler mantığı.
 * Tailwind ve Win95 versiyonları arasında PAYLAŞILAN tek doğruluk kaynağı.
 */
export function useSettingsLogic(isOpen: boolean, onClose: () => void, currentDate: Date) {
  const isWeb = useMemo(() => {
    try {
      return Capacitor.getPlatform() === 'web';
    } catch (e) {
      return true;
    }
  }, []);

  const { settings, updateSettings, getSalaryForDate, getShiftSettingsForDate } = useSalarySettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [formData, setFormData] = useState<SalarySettingsType>(() => ({
    ...settings,
    shiftSystemEnabled: settings.shiftSystemEnabled ?? false,
    shiftSystemType: settings.shiftSystemType ?? '2-shift',
    shiftStartDate: settings.shiftStartDate ?? new Date().toISOString().split('T')[0],
    shiftInitialType: settings.shiftInitialType ?? 'day',
    severanceCeiling: settings.severanceCeiling ?? 64948.77,
    severanceStampTaxRate: settings.severanceStampTaxRate ?? 0.759,
    severanceBaseGross: settings.severanceBaseGross ?? 33030.00,
    departureTravelAllowance: settings.departureTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0),
    returnTravelAllowance: settings.returnTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0)
  }));

  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean;
    version?: string;
    isNew?: boolean;
    error?: string;
  }>({ loading: false });

  useEffect(() => {
    if (isOpen) {
      const monthSalary = getSalaryForDate(currentDate);
      const shiftForDate = getShiftSettingsForDate(currentDate);

      setFormData({
        ...settings,
        monthlyGrossSalary: monthSalary.monthlyGrossSalary,
        bonus: monthSalary.bonus,
        tesRate: settings.tesRate ?? 3,
        shiftSystemEnabled: settings.shiftSystemEnabled ?? false,
        shiftSystemType: shiftForDate?.systemType || settings.shiftSystemType || '2-shift',
        shiftStartDate: shiftForDate?.startDate || settings.shiftStartDate || new Date().toISOString().split('T')[0],
        shiftInitialType: shiftForDate?.initialType || settings.shiftInitialType || 'day',
        severanceCeiling: settings.severanceCeiling ?? 64948.77,
        severanceStampTaxRate: settings.severanceStampTaxRate ?? 0.759,
        severanceBaseGross: settings.severanceBaseGross ?? 33030.00,
        departureTravelAllowance: settings.departureTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0),
        returnTravelAllowance: settings.returnTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0)
      });
    }
  }, [isOpen, settings, currentDate, getSalaryForDate, getShiftSettingsForDate]);

  const handleSave = useCallback(() => {
    const monthKey = getMonthKey(currentDate);
    updateSettings(formData, monthKey, true); // true = settings ekranından, history'ye yazma
    onClose();
  }, [currentDate, updateSettings, formData, onClose]);

  const checkUpdates = useCallback(async () => {
    if (isWeb) return;
    setUpdateStatus({ loading: true, error: undefined, version: undefined });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://api.github.com/repos/efek0349/mesaitakip/releases/latest', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Güncelleme kontrolü başarısız.');

      const data = await response.json();
      const latestVersion = (data.tag_name || '').replace('v', '');

      if (!latestVersion) throw new Error('Versiyon bilgisi alınamadı.');

      const v1Parts = latestVersion.split('.').map(Number);
      const v2Parts = APP_VERSION.split('.').map(Number);
      let isNew = false;

      for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const p1 = v1Parts[i] || 0;
        const p2 = v2Parts[i] || 0;
        if (p1 > p2) { isNew = true; break; }
        if (p1 < p2) { isNew = false; break; }
      }

      setUpdateStatus({
        loading: false,
        version: latestVersion,
        isNew: isNew
      });
    } catch (error: any) {
      setUpdateStatus({
        loading: false,
        error: error.name === 'AbortError' ? 'Bağlantı zaman aşımına uğradı.' : 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'
      });
    }
  }, [isWeb]);

  /**
   * handleInputChange — value parametresi SalarySettingsType[K] | string olarak
   * genişletildi. Sebep: sayısal alanlar (monthlyGrossSalary, bonus, vb.) form
   * tipinde `number`, ama <input> elementlerinden gelen e.target.value her
   * zaman `string`. Fonksiyon gövdesi zaten numericFields.includes(field) ile
   * bunu doğru işliyordu (orijinal kod, runtime'da hatasız) — ama TS strict
   * modda statik olarak bunu çıkaramadığı için gerçek `tsc` derlemesi tip
   * hatası veriyordu. Tipi gerçek kullanımla eşleştirerek düzelttim.
   */
  const handleInputChange = useCallback(<K extends keyof SalarySettingsType>(field: K, value: SalarySettingsType[K] | string) => {
    const numericFields: (keyof SalarySettingsType)[] = [
      'monthlyGrossSalary', 'bonus', 'monthlyWorkingHours', 'dailyWorkingHours',
      'tesRate', 'salaryAttachmentRate', 'dailyMealAllowance', 'dailyTravelAllowance',
      'departureTravelAllowance', 'returnTravelAllowance',
      'severanceCeiling', 'severanceStampTaxRate', 'severanceBaseGross',
      'weekdayMultiplier', 'saturdayMultiplier', 'sundayMultiplier', 'holidayMultiplier'
    ];

    if (numericFields.includes(field)) {
      let stringValue = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
      const parts = stringValue.split('.');
      if (parts.length > 2) {
        stringValue = parts[0] + '.' + parts.slice(1).join('');
      }
      setFormData(prev => ({ ...prev, [field]: stringValue as any }));
      return;
    }

    if (field === 'shiftSystemType') {
      const newType = value as '2-shift' | '3-shift';
      setFormData(prev => {
        const next = { ...prev, shiftSystemType: newType };
        if (newType === '3-shift') {
          next.defaultStartTime = '08:05';
          next.defaultEndTime = '16:05';
        } else {
          next.defaultStartTime = '08:05';
          next.defaultEndTime = '18:05';
        }
        next.isSaturdayWork = isSaturdayWorkday(next);
        const gross = calculateDailyGrossHours(next.defaultStartTime, next.defaultEndTime);
        next.dailyWorkingHours = calculateEffectiveHours(gross, next.deductBreakTime);
        return next;
      });
      return;
    }

    if (field === 'defaultStartTime' || field === 'defaultEndTime' || field === 'shiftInitialType') {
      setFormData(prev => {
        const next = { ...prev, [field]: value };
        next.isSaturdayWork = isSaturdayWorkday(next);
        const gross = calculateDailyGrossHours(next.defaultStartTime, next.defaultEndTime);
        next.dailyWorkingHours = calculateEffectiveHours(gross, next.deductBreakTime);
        return next;
      });
      return;
    }

    if (field === 'hasSalaryAttachment' && value === true) {
      setFormData(prev => {
        const hasRate = prev.salaryAttachmentRate && Number(prev.salaryAttachmentRate) > 0;
        return {
          ...prev,
          hasSalaryAttachment: true,
          salaryAttachmentRate: hasRate ? prev.salaryAttachmentRate : (25 as any)
        };
      });
      return;
    }

    if (field === 'hasTES' && value === true) {
      setFormData(prev => {
        const hasRate = prev.tesRate && Number(prev.tesRate) > 0;
        return {
          ...prev,
          hasTES: true,
          tesRate: hasRate ? prev.tesRate : (3 as any)
        };
      });
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNumericFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '0.0') {
      e.target.value = '';
    }
    requestAnimationFrame(() => e.target.select());
  }, []);

  const handleNumericBlur = useCallback(<K extends keyof SalarySettingsType>(field: K) => (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim() === '') {
      setFormData(prev => ({ ...prev, [field]: '0' as any }));
    }
  }, []);

  const severancePreview = useMemo(() => {
    const monthSalary = getSalaryForDate(currentDate);
    return calculateSeverancePay(formData, monthSalary);
  }, [formData, currentDate, getSalaryForDate]);

  return {
    isWeb,
    activeTab, setActiveTab,
    formData,
    updateStatus,
    handleSave,
    checkUpdates,
    handleInputChange,
    handleNumericFocus,
    handleNumericBlur,
    severancePreview,
  };
}

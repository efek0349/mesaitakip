import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOvertimeData } from './useOvertimeData';
import { useSalarySettings } from './useSalarySettings';
import { useHolidays } from './useHolidays';
import { formatTurkishDate, calculateEffectiveHours, getShiftType, getDateKey, getMonthKey, calculateWeeklyHoursForSunday } from '../utils/dateUtils';

/**
 * useOvertimeModalLogic — OvertimeModal.tsx'in TÜM state/handler mantığı.
 * Tailwind ve Win95 versiyonları arasında PAYLAŞILAN tek doğruluk kaynağı.
 * Görsel katman (OvertimeModalTailwind.tsx / OvertimeModalWin95.tsx) bu
 * hook'un döndürdüğü state ve fonksiyonları kullanır, kendi state'ini tutmaz.
 */
export function useOvertimeModalLogic(isOpen: boolean, selectedDate: Date | null, onClose: () => void) {
  const { addOvertimeEntry, removeOvertimeEntry, getEntriesForDate, monthlyData } = useOvertimeData();
  const { getOvertimeRate, settings, getHourlyRate, getShiftSettingsForDate, updateSettings, getSalaryForDate } = useSalarySettings();
  const { getHoliday } = useHolidays(selectedDate?.getFullYear());

  const [time, setTime] = useState({ hours: 0, minutes: 0 });
  const { hours, minutes } = time;

  const [type, setType] = useState<'overtime' | 'leave'>('overtime');
  const [isFullDay, setIsFullDay] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [deductFromOvertime, setDeductFromOvertime] = useState(false);
  const [workedHalfDay, setWorkedHalfDay] = useState(false);
  const [noAllowance, setNoAllowance] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteSection, setShowNoteSection] = useState(false);
  const [monthlyBonus, setMonthlyBonus] = useState<string | number>(0);
  const [dailyMeal, setDailyMeal] = useState<string | number>(0);
  const [departureTravel, setDepartureTravel] = useState<string | number>(0);
  const [returnTravel, setReturnTravel] = useState<string | number>(0);
  const [departureLocked, setDepartureLocked] = useState(false);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Telefonda alana dokunulduğunda "0" değerini temizler, imleci sağa
  // kaydırmaya gerek kalmadan direkt rakam yazılabilir.
  const handleNumericFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '0.0') {
      e.target.value = '';
    }
    requestAnimationFrame(() => e.target.select());
  }, []);

  const handleNumericBlur = useCallback((setter: React.Dispatch<React.SetStateAction<string | number>>) => (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim() === '') {
      setter(0);
    }
  }, []);

  const monthSalary = React.useMemo(() => {
    if (isOpen && selectedDate) {
      return getSalaryForDate(selectedDate);
    }
    return null;
  }, [isOpen, selectedDate, getSalaryForDate]);

  const existingEntries = React.useMemo(() =>
    selectedDate ? getEntriesForDate(selectedDate) : [],
    [selectedDate, getEntriesForDate]
  );
  const existingEntryForCurrentType = existingEntries.find(e => e.type === type);

  const shiftType = React.useMemo(() => {
    if (!selectedDate || !settings.shiftSystemEnabled) return null;
    const shiftSettings = getShiftSettingsForDate(selectedDate);
    if (!shiftSettings) return null;
    return getShiftType(
      selectedDate,
      shiftSettings.normalizedStartDate,
      shiftSettings.initialType,
      shiftSettings.systemType || '2-shift'
    );
  }, [selectedDate, settings.shiftSystemEnabled, getShiftSettingsForDate]);

  const weeklyHours = React.useMemo(() => {
    if (!selectedDate || selectedDate.getDay() !== 0) return undefined;
    return calculateWeeklyHoursForSunday(selectedDate, monthlyData, settings.isSaturdayWork, settings.dailyWorkingHours);
  }, [selectedDate, monthlyData, settings.isSaturdayWork, settings.dailyWorkingHours]);

  useEffect(() => {
    if (isOpen) {
      setType('overtime');
    }
  }, [isOpen]);

  useEffect(() => {
    if (monthSalary) {
      setMonthlyBonus(monthSalary.bonus);
    }

    if (isOpen && selectedDate) {
      const dateStr = getDateKey(selectedDate);
      const history = settings.allowanceHistory || {};
      const dates = Object.keys(history).sort((a, b) => b.localeCompare(a));

      // Seçilen tarih için history'den en yakın önceki kaydı bul
      const foundDate = dates.find(d => d <= dateStr);

      let meal: number;
      let dep: number;
      let ret: number;

      if (foundDate) {
        const r = history[foundDate];
        meal = Number(r.meal) || 0;
        dep = r.departure !== undefined ? Number(r.departure) || 0 : (Number(r.travel) || 0) / 2;
        ret = r.return !== undefined ? Number(r.return) || 0 : (Number(r.travel) || 0) / 2;
      } else {
        // History yok → global ayar değerlerini göster
        meal = Number(settings.dailyMealAllowance) || 0;
        dep = Number(settings.departureTravelAllowance) || 0;
        ret = Number(settings.returnTravelAllowance) || 0;
      }

      setDailyMeal(meal);
      setDepartureTravel(dep);
      setReturnTravel(ret);

      // Kilitleme sadece BUGÜN için — akşam dönüş zammı senaryosu
      const todayStr = getDateKey(new Date());
      const isToday = dateStr === todayStr;
      setDepartureLocked(isToday && !!history[dateStr]);
    }
  }, [monthSalary, isOpen, selectedDate, settings]);

  useEffect(() => {
    if (isOpen) {
      if (existingEntryForCurrentType) {
        setTime({
          hours: existingEntryForCurrentType.hours,
          minutes: existingEntryForCurrentType.minutes
        });
        setIsFullDay(!!existingEntryForCurrentType.isFullDay);
        setIsPaid(existingEntryForCurrentType.isPaid !== undefined ? !!existingEntryForCurrentType.isPaid : true);
        setDeductFromOvertime(!!existingEntryForCurrentType.deductFromOvertime);
        setWorkedHalfDay(!!existingEntryForCurrentType.workedHalfDay);
        setNoAllowance(!!existingEntryForCurrentType.noAllowance);
        const noteText = existingEntryForCurrentType.note || '';
        setNote(noteText);
        setShowNoteSection(false);
      } else {
        setTime({ hours: 0, minutes: 0 });
        setIsFullDay(false);
        setIsPaid(false);
        setDeductFromOvertime(false);
        setWorkedHalfDay(false);
        setNote('');
        setShowNoteSection(false);
        setNoAllowance(false);
      }
    }
  }, [isOpen, type, existingEntryForCurrentType]);

  // Not açılınca klavye için bekle, sonra textarea'ya odaklan
  useEffect(() => {
    if (showNoteSection) {
      const timer = setTimeout(() => {
        noteInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showNoteSection]);

  // isOpen/selectedDate yokken aşağıdaki türetilmiş değerler hesaplanamaz;
  // ÇAĞIRAN component "ready" alanını kontrol edip null render etmeli
  // (orijinal kod: `if (!isOpen || !selectedDate) return null;`).
  const ready = isOpen && !!selectedDate;

  const holiday = ready ? getHoliday(selectedDate!) : undefined;
  const formattedDate = ready ? formatTurkishDate(selectedDate!) : '';
  const isSaturday = ready ? selectedDate!.getDay() === 6 : false;
  const isSunday = ready ? selectedDate!.getDay() === 0 : false;

  // Bu tarih için gerçekten yol/yemek tanımlı mı?
  const hasAllowanceConfigured = (Number(dailyMeal) || 0) > 0 ||
    (Number(departureTravel) || 0) > 0 ||
    (Number(returnTravel) || 0) > 0;

  const currentTotalHours = (isFullDay && type === 'leave') ? settings.dailyWorkingHours : (hours + minutes / 60);
  const overtimeRate = ready
    ? getOvertimeRate(selectedDate!, !!holiday, weeklyHours ? weeklyHours + (hours + minutes / 60) : undefined)
    : 0;
  const hourlyRate = ready ? getHourlyRate(selectedDate!) : 0;

  const paymentHours = type === 'overtime' ? calculateEffectiveHours(currentTotalHours, settings.deductBreakTime) : currentTotalHours;
  const isDeductedLeave = type === 'leave' && !isPaid;
  const totalPayment = type === 'overtime' ? paymentHours * overtimeRate : (isDeductedLeave ? paymentHours * hourlyRate : 0);

  const handleSave = useCallback(() => {
    if (!selectedDate || !monthSalary) return;

    if (hours > 0 || minutes > 0 || (type === 'leave' && isFullDay) || (type === 'overtime' && workedHalfDay) || noAllowance) {
      addOvertimeEntry(selectedDate, hours, minutes, type, note.trim(), isFullDay, isPaid, workedHalfDay, deductFromOvertime, noAllowance);
    } else if (existingEntryForCurrentType) {
      removeOvertimeEntry(selectedDate, type);
    }

    // Update monthly bonus and daily allowances if changed
    const monthKey = getMonthKey(selectedDate);
    const currentMonthSalary = monthSalary;
    const newBonus = Number(String(monthlyBonus).replace(',', '.')) || 0;

    // Check for allowance changes
    const newMeal = Number(String(dailyMeal).replace(',', '.')) || 0;
    const newDep = Number(String(departureTravel).replace(',', '.')) || 0;
    const newRet = Number(String(returnTravel).replace(',', '.')) || 0;
    const newTravelTotal = newDep + newRet;

    const dateStr = getDateKey(selectedDate);
    const currentHistory = settings.allowanceHistory || {};
    const allowanceChanged = newMeal !== (currentHistory[dateStr]?.meal ?? settings.dailyMealAllowance) ||
                             newDep !== (currentHistory[dateStr]?.departure ?? settings.departureTravelAllowance) ||
                             newRet !== (currentHistory[dateStr]?.return ?? settings.returnTravelAllowance);

    if (newBonus !== currentMonthSalary.bonus || allowanceChanged) {
      const updatedSettings = { ...settings };

      if (newBonus !== currentMonthSalary.bonus) {
        updatedSettings.monthlyGrossSalary = currentMonthSalary.monthlyGrossSalary;
        updatedSettings.bonus = newBonus;
      }

      if (allowanceChanged) {
        const nextAllowanceHistory = { ...currentHistory };
        // Gidiş kilitliyse mevcut departure'ı koru, sadece return ve meal güncelle
        const savedDep = departureLocked
          ? (currentHistory[dateStr]?.departure ?? (Number(settings.departureTravelAllowance) || 0))
          : newDep;
        nextAllowanceHistory[dateStr] = {
          meal: newMeal,
          travel: savedDep + newRet,
          departure: savedDep,
          return: newRet
        };

        updatedSettings.allowanceHistory = nextAllowanceHistory;
      }

      updateSettings(updatedSettings, monthKey);
    }

    onClose();
  }, [
    selectedDate, monthSalary, hours, minutes, type, isFullDay, workedHalfDay, noAllowance,
    addOvertimeEntry, note, isPaid, deductFromOvertime, existingEntryForCurrentType,
    removeOvertimeEntry, monthlyBonus, dailyMeal, departureTravel, returnTravel,
    settings, departureLocked, updateSettings, onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (!selectedDate) return;
    if (existingEntryForCurrentType) {
      removeOvertimeEntry(selectedDate, type);
    }
    onClose();
  }, [selectedDate, existingEntryForCurrentType, removeOvertimeEntry, type, onClose]);

  const adjustHours = useCallback((delta: number) => {
    setTime(prev => ({ ...prev, hours: Math.max(0, Math.min(23, prev.hours + delta)) }));
  }, []);

  const adjustMinutes = useCallback((delta: number) => {
    setTime(prev => {
      let newMinutes = prev.minutes + delta;
      let newHours = prev.hours;
      if (newMinutes >= 60) {
        newHours = Math.min(23, newHours + 1);
        newMinutes -= 60;
      } else if (newMinutes < 0) {
        newHours = Math.max(0, newHours - 1);
        newMinutes += 60;
      }
      return { hours: newHours, minutes: newMinutes };
    });
  }, []);

  const handleFullDayToggle = useCallback((checked: boolean) => {
    setIsFullDay(checked);
    if (checked) {
      const dailyHours = settings.dailyWorkingHours;
      setTime({
        hours: Math.floor(dailyHours),
        minutes: (dailyHours % 1) * 60
      });
    } else {
      setTime({ hours: 0, minutes: 0 });
    }
  }, [settings.dailyWorkingHours]);

  const handleNumericChange = useCallback((setter: React.Dispatch<React.SetStateAction<string | number>>) => (raw: string) => {
    let val = raw.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    setter(val);
  }, []);

  // renderSundayInfo'nun ihtiyaç duyduğu türetilmiş değerler
  const sundayInfo = React.useMemo(() => {
    if (!ready || !isSunday || !!holiday) return null;
    const currentTotal = weeklyHours !== undefined ? weeklyHours + (hours + minutes / 60) : 0;
    const isQualified = currentTotal >= 45;
    const rate = getOvertimeRate(selectedDate!, false, currentTotal);
    const multiplier = (rate / hourlyRate).toFixed(1).replace('.0', '') + 'x';
    return { currentTotal, isQualified, multiplier };
  }, [ready, isSunday, holiday, weeklyHours, hours, minutes, getOvertimeRate, selectedDate, hourlyRate]);

  return {
    ready,
    // veri
    holiday,
    formattedDate,
    isSaturday,
    isSunday,
    shiftType,
    hasAllowanceConfigured,
    currentTotalHours,
    overtimeRate,
    hourlyRate,
    totalPayment,
    existingEntryForCurrentType,
    sundayInfo,
    settings,
    // form state
    type, setType,
    hours, minutes,
    isFullDay,
    isPaid, setIsPaid,
    deductFromOvertime, setDeductFromOvertime,
    workedHalfDay, setWorkedHalfDay,
    noAllowance, setNoAllowance,
    note, setNote,
    showNoteSection, setShowNoteSection,
    monthlyBonus, setMonthlyBonus,
    dailyMeal, setDailyMeal,
    departureTravel, setDepartureTravel,
    returnTravel, setReturnTravel,
    departureLocked, setDepartureLocked,
    noteInputRef,
    // handler'lar
    handleNumericFocus,
    handleNumericBlur,
    handleNumericChange,
    handleSave,
    handleDelete,
    adjustHours,
    adjustMinutes,
    handleFullDayToggle,
  };
}

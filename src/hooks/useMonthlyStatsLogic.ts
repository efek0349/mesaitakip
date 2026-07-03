import React, { useMemo } from 'react';
import { useOvertimeData } from './useOvertimeData';
import { useSalarySettings } from './useSalarySettings';
import { useHolidays } from './useHolidays';
import { formatHours, TURKISH_MONTHS, calculateEffectiveHours, parseDate, calculateMonthlyAllowances, calculateWeeklyHoursForSunday, isSaturdayWorkday } from '../utils/dateUtils';
import { calculateSeverancePay } from '../utils/salaryUtils';
import { calcTotalHours } from '../types/overtime';
import { YEARLY_LIMIT_HOURS } from '../constants';

/**
 * useMonthlyStatsLogic — MonthlyStats.tsx'in TÜM hesaplama mantığı.
 * Tailwind ve Win95 versiyonları arasında PAYLAŞILAN tek doğruluk kaynağı.
 * Görsel katman (MonthlyStatsTailwind.tsx / MonthlyStatsWin95.tsx) bu
 * hook'un döndürdüğü hesaplanmış değerleri kullanır, kendi hesaplama
 * mantığını tutmaz.
 */
export function useMonthlyStatsLogic(currentDate: Date) {
  const [showLimitInfo, setShowLimitInfo] = React.useState(false);
  const [showSeveranceDetails, setShowSeveranceDetails] = React.useState(false);
  const [showOvertimeDetails, setShowOvertimeDetails] = React.useState(false);

  const { getMonthlyTotal, getYearlyTotal, getMonthlyEntries, clearMonthData, monthlyData, isLoaded: dataLoaded } = useOvertimeData();
  const { getOvertimeRate, getHourlyRate, getSalaryForDate, settings, isLoaded: salaryLoaded } = useSalarySettings();
  const { getHoliday } = useHolidays(currentDate.getFullYear(), true);

  // Kıdem tazminatı ayarı kapatıldığında detayı da kapat
  React.useEffect(() => {
    if (!settings.showSeverancePay && showSeveranceDetails) {
      setShowSeveranceDetails(false);
    }
  }, [settings.showSeverancePay, showSeveranceDetails]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthSalary = getSalaryForDate(currentDate);
  const isSaturdayWork = isSaturdayWorkday(settings);

  const monthlyTotal = useMemo(() => getMonthlyTotal(year, month, settings.deductBreakTime), [year, month, settings.deductBreakTime, getMonthlyTotal, monthlyData]);
  const yearlyTotal = useMemo(() => getYearlyTotal(year, settings.deductBreakTime, settings.dailyWorkingHours), [year, settings.deductBreakTime, getYearlyTotal, monthlyData, settings.dailyWorkingHours]);
  const monthlyEntries = useMemo(() => getMonthlyEntries(year, month), [year, month, getMonthlyEntries, monthlyData]);

  const isOverLimit = yearlyTotal > YEARLY_LIMIT_HOURS;
  const isLoading = !dataLoaded || !salaryLoaded;

  const overtimeStats = useMemo(() => {
    const stats = {
      normal: { hours: 0, payment: 0 },
      sunday: { hours: 0, payment: 0 },
      holiday: { hours: 0, payment: 0 },
      leave: { hours: 0, deduction: 0 },
      mahsup: { hours: 0, payment: 0 },
      total: { hours: 0, payment: 0 }
    };

    let remainingMahsupHours = monthlyEntries
      .filter(entry => entry.type === 'leave' && (entry.isPaid === false) && entry.deductFromOvertime)
      .reduce((sum, entry) => sum + (entry.isFullDay ? settings.dailyWorkingHours : calcTotalHours(entry)), 0);

    monthlyEntries.forEach(entry => {
      if (entry.type === 'leave') {
        const entryIsPaid = entry.isPaid !== undefined ? entry.isPaid : true;
        if (!entryIsPaid && !entry.deductFromOvertime) {
          const hours = entry.isFullDay ? settings.dailyWorkingHours : calcTotalHours(entry);
          const hourlyRate = getHourlyRate(parseDate(entry.date));
          stats.leave.hours += hours;
          stats.leave.deduction += hours * hourlyRate;
        }
      }
    });

    const overtimeEntries = monthlyEntries
      .filter(entry => entry.type === 'overtime')
      .map(entry => {
        const entryDate = parseDate(entry.date);
        const holiday = getHoliday(entryDate);
        const isHolidayDate = holiday !== undefined;
        const isSunday = entryDate.getDay() === 0;

        const totalHours = calcTotalHours(entry);
        const effectiveHours = calculateEffectiveHours(totalHours, settings.deductBreakTime);

        let weeklyHours = undefined;
        if (isSunday && !isHolidayDate) {
          weeklyHours = calculateWeeklyHoursForSunday(entryDate, monthlyData, isSaturdayWork, settings.dailyWorkingHours);
        }

        const overtimeRate = getOvertimeRate(entryDate, isHolidayDate, weeklyHours);

        return {
          effectiveHours,
          overtimeRate,
          isHoliday: isHolidayDate,
          isSunday: isSunday && !isHolidayDate,
          isNormal: !isHolidayDate && !isSunday
        };
      });

    overtimeEntries.forEach(e => {
      const payment = e.effectiveHours * (e.overtimeRate || 0);
      stats.total.hours += e.effectiveHours;
      stats.total.payment += payment;

      if (e.isNormal) {
        stats.normal.hours += e.effectiveHours;
        stats.normal.payment += payment;
      } else if (e.isSunday) {
        stats.sunday.hours += e.effectiveHours;
        stats.sunday.payment += payment;
      } else if (e.isHoliday) {
        stats.holiday.hours += e.effectiveHours;
        stats.holiday.payment += payment;
      }
    });

    const normalEntries = overtimeEntries.filter(e => e.isNormal);
    normalEntries.forEach(e => {
      const deduct = Math.min(e.effectiveHours, remainingMahsupHours);
      if (deduct > 0) {
        stats.mahsup.hours += deduct;
        stats.mahsup.payment += deduct * (e.overtimeRate || 0);
        remainingMahsupHours -= deduct;
      }
    });

    if (remainingMahsupHours > 0) {
      const sundayEntries = overtimeEntries.filter(e => e.isSunday);
      sundayEntries.forEach(e => {
        const deduct = Math.min(e.effectiveHours, remainingMahsupHours);
        if (deduct > 0) {
          stats.mahsup.hours += deduct;
          stats.mahsup.payment += deduct * (e.overtimeRate || 0);
          remainingMahsupHours -= deduct;
        }
      });
    }

    if (remainingMahsupHours > 0) {
      const holidayEntries = overtimeEntries.filter(e => e.isHoliday);
      holidayEntries.forEach(e => {
        const deduct = Math.min(e.effectiveHours, remainingMahsupHours);
        if (deduct > 0) {
          stats.mahsup.hours += deduct;
          stats.mahsup.payment += deduct * (e.overtimeRate || 0);
          remainingMahsupHours -= deduct;
        }
      });
    }

    if (remainingMahsupHours > 0) {
      const hourlyRate = getHourlyRate(new Date(year, month));
      stats.mahsup.hours += remainingMahsupHours;
      stats.mahsup.payment += remainingMahsupHours * hourlyRate;
    }

    return stats;
  }, [monthlyEntries, getHoliday, getOvertimeRate, getHourlyRate, settings.deductBreakTime, isSaturdayWork, monthlyData, settings.dailyWorkingHours, year, month]);

  const allowanceData = useMemo(() => {
    return calculateMonthlyAllowances(year, month, monthlyData, settings, getHoliday, isSaturdayWork);
  }, [year, month, monthlyData, settings, getHoliday, isSaturdayWork]);

  const severanceData = useMemo(() => {
    return calculateSeverancePay(settings, monthSalary);
  }, [settings, monthSalary]);

  // isLoading true iken aşağıdaki türetilmiş finansal değerler hesaplanamaz
  // (orijinal kod erken return ile bunu engelliyordu). ready=false ise
  // çağıran component'in loading/skeleton göstermesi gerekiyor.
  const ready = !isLoading;

  const monthlyGrossSalary = Number(monthSalary.monthlyGrossSalary) || 0;
  const bonus = Number(monthSalary.bonus) || 0;
  const salaryBase = monthlyGrossSalary - overtimeStats.leave.deduction;
  const salarySum = salaryBase + bonus;

  const currentTesRate = settings.hasTES ? (Number(settings.tesRate) || 3) : 0;
  const tesDeduction = settings.hasTES ? salarySum * (currentTesRate / 100) : 0;

  const netOvertimePayment = Math.max(0, overtimeStats.total.payment - overtimeStats.mahsup.payment);
  const netOvertimeHours = Math.max(0, monthlyTotal - overtimeStats.mahsup.hours);

  const effectiveAllowance = settings.showMealInExport ? allowanceData.total : 0;
  const totalEarningsBeforeAttachment = (salarySum - tesDeduction) + netOvertimePayment + effectiveAllowance;

  const attachmentRate = settings.salaryAttachmentRate || 25;
  const attachmentDeduction = settings.hasSalaryAttachment ? totalEarningsBeforeAttachment * (attachmentRate / 100) : 0;
  const finalEarnings = totalEarningsBeforeAttachment - attachmentDeduction;

  return {
    ready,
    isLoading,
    year, month,
    monthlyTotal, yearlyTotal, isOverLimit,
    overtimeStats, allowanceData, severanceData,
    monthlyGrossSalary, bonus, salaryBase, salarySum,
    currentTesRate, tesDeduction,
    netOvertimePayment, netOvertimeHours,
    effectiveAllowance, totalEarningsBeforeAttachment,
    attachmentRate, attachmentDeduction, finalEarnings,
    settings,
    showLimitInfo, setShowLimitInfo,
    showSeveranceDetails, setShowSeveranceDetails,
    showOvertimeDetails, setShowOvertimeDetails,
    clearMonthData,
  };
}

import React, { useMemo } from 'react';
import { Clock, Trash2, Settings, Share2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { formatHours, TURKISH_MONTHS, calculateEffectiveHours, getDateKey, parseDate, calculateMonthlyAllowances } from '../utils/dateUtils';
import { downloadTextFile, shareText, generateCsvContent } from '../utils/fileUtils';
import { showToast } from '../utils/toastUtils';

interface MonthlyStatsProps {
  currentDate: Date;
  onOpenSettings: () => void;
  onOpenDataBackup: () => void;
}

export const MonthlyStats: React.FC<MonthlyStatsProps> = ({ currentDate, onOpenSettings, onOpenDataBackup }) => {
  // Tüm hook’lar component’in en üstünde
  const { getMonthlyTotal, getYearlyTotal, getMonthlyEntries, clearMonthData, monthlyData, isLoaded: dataLoaded } = useOvertimeData();
  const { getOvertimeRate, getHourlyRate, getSalaryForDate, settings, isLoaded: salaryLoaded } = useSalarySettings();
  const { getHoliday } = useHolidays();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthSalary = getSalaryForDate(currentDate);
  const isSaturdayWork = monthSalary.isSaturdayWork ?? settings.isSaturdayWork;

  // Veri değişimlerini izlemek için monthlyData'yı (monthlyDataMemo) dependency olarak ekliyoruz
  const monthlyTotal = useMemo(() => getMonthlyTotal(year, month, settings.deductBreakTime), [year, month, settings.deductBreakTime, getMonthlyTotal, monthlyData]);
  const yearlyTotal = useMemo(() => getYearlyTotal(year, settings.deductBreakTime), [year, settings.deductBreakTime, getYearlyTotal, monthlyData]);
  const monthlyEntries = useMemo(() => getMonthlyEntries(year, month), [year, month, getMonthlyEntries, monthlyData]);
  
  const YEARLY_LIMIT = 270;
  const isOverLimit = yearlyTotal > YEARLY_LIMIT;

  // Loading flag
  const isLoading = !dataLoaded || !salaryLoaded;

  // Memoize overtime stats calculation - Veri değişimini (monthlyData) buraya da ekledik
  const overtimeStats = useMemo(() => {
    const stats = {
      normal: { hours: 0, payment: 0 },
      sunday: { hours: 0, payment: 0 },
      holiday: { hours: 0, payment: 0 },
      leave: { hours: 0, deduction: 0 },
      total: { hours: 0, payment: 0 }
    };

    monthlyEntries.forEach(entry => {
      const entryDate = parseDate(entry.date);
      const holiday = getHoliday(entryDate);
      const isHolidayDate = holiday !== undefined;
      const dayOfWeek = entryDate.getDay();
      const isSaturday = dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;

      if (entry.type === 'leave') {
        let deduction = 0;
        if (entry.isFullDay) {
          const dailyHours = settings.dailyWorkingHours;
          const hourlyRate = getHourlyRate(entryDate);
          deduction = dailyHours * hourlyRate;
          stats.leave.hours += dailyHours;
        } else {
          const hours = entry.totalHours || 0;
          const hourlyRate = getHourlyRate(entryDate);
          deduction = hours * hourlyRate;
          stats.leave.hours += hours;
        }
        stats.leave.deduction += deduction;
      } else {
        const effectiveHours = calculateEffectiveHours(entry.totalHours || 0, settings.deductBreakTime, isSaturday, isSunday, isHolidayDate, isSaturdayWork);
        const overtimeRate = getOvertimeRate(entryDate, isHolidayDate);
        const payment = effectiveHours * (overtimeRate || 0);

        if (isHolidayDate) {
          stats.holiday.hours += effectiveHours;
          stats.holiday.payment += payment;
        } else if (isSunday) {
          stats.sunday.hours += effectiveHours;
          stats.sunday.payment += payment;
        } else {
          stats.normal.hours += effectiveHours;
          stats.normal.payment += payment;
        }

        stats.total.hours += effectiveHours;
        stats.total.payment += payment;
      }
    });

    return stats;
  }, [monthlyEntries, getHoliday, getOvertimeRate, getHourlyRate, settings.deductBreakTime, isSaturdayWork, monthlyData]);

  // AKILLI YEMEK/YOL HESAPLAMA - Merkezi fonksiyona taşındı
  const allowanceData = useMemo(() => {
    return calculateMonthlyAllowances(year, month, monthlyData, settings, getHoliday);
  }, [year, month, monthlyData, settings, getHoliday]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>

        {/* Top Summary Skeletons */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="flex-1 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>

        {/* Detail Skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const exportText = generateCsvContent(year, month, monthlyData, settings, getHoliday);
    const fileName = `mesai-${TURKISH_MONTHS[month].toLowerCase()}-${year}.csv`;
    downloadTextFile(exportText, fileName);
  };

  const handleShare = async () => {
    const exportText = generateCsvContent(year, month, monthlyData, settings, getHoliday);
    const title = `${TURKISH_MONTHS[month]} ${year} Mesai Raporu`;
    await shareText(exportText, title);
  };

  const handleClearMonth = () => {
    if (window.confirm(`${TURKISH_MONTHS[month]} ${year} ayındaki tüm mesai kayıtlarını silmek istediğinizden emin misiniz?`)) {
      clearMonthData(year, month);
    }
  };

  const monthlyGrossSalary = Number(monthSalary.monthlyGrossSalary) || 0;
  const bonus = Number(monthSalary.bonus) || 0;
  const salarySum = (monthlyGrossSalary + bonus) - overtimeStats.leave.deduction;
  
  // TES kesintisi sadece maaş toplamı üzerinden
  const currentTesRate = settings.hasTES ? (Number(settings.tesRate) || 3) : 0;
  const tesDeduction = settings.hasTES ? salarySum * (currentTesRate / 100) : 0;
  
  const totalEarnings = (salarySum - tesDeduction) + overtimeStats.total.payment + allowanceData.total;
  const attachmentRate = settings.salaryAttachmentRate || 25;
  const finalEarnings = settings.hasSalaryAttachment ? totalEarnings * (1 - attachmentRate / 100) : totalEarnings;

    return (
      <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          {TURKISH_MONTHS[month]} {year} Özeti
        </h3>
  
        <div className="flex gap-2 sm:gap-3 mb-6 items-stretch">
          {/* Üst Satır: Mesai Saatleri ve Ücret Bilgisi */}
          
          {/* Mesai Saatleri (Aylık & Yıllık) */}
          <div className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-2xl p-3 sm:p-4 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Toplam Mesai</p>
                <Clock className="w-3.5 h-3.5 sm:w-4 h-4 text-blue-200/50" />
              </div>
              
              <div className="flex items-end gap-1 sm:gap-2 mb-3">
                <span className="text-2xl sm:text-3xl font-black leading-none">{formatHours(monthlyTotal)}</span>
                <span className="text-[10px] sm:text-xs text-blue-100 font-bold mb-0.5">saat</span>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <div className={`flex flex-col gap-1 p-2 sm:p-3 rounded-xl border transition-colors ${isOverLimit ? 'bg-red-500/20 border-red-400/40' : 'bg-white/10 border-white/10'}`}>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-3.5 h-3.5 ${isOverLimit ? 'text-red-300 animate-pulse' : 'text-indigo-200'}`} />
                    <div className="flex flex-col">
                      <span className="text-[9px] sm:text-xs text-blue-100 leading-none mb-0.5 sm:mb-1 font-medium">Yıllık Toplam</span>
                      <span className={`text-xs sm:text-sm font-bold leading-none ${isOverLimit ? 'text-red-300' : 'text-white'}`}>
                        {formatHours(yearlyTotal).replace(' s', ' saat')}
                      </span>
                    </div>
                  </div>
                  {isOverLimit && (
                    <div className="mt-1 p-1 bg-red-600/30 rounded-lg border border-red-500/30">
                      <p className="text-[7px] sm:text-[8px] leading-tight text-red-100 font-bold text-center">
                        ⚠️ 270 saat sınırı aşıldı!
                      </p>
                    </div>
                  )}
                </div>

                {/* İş Günü Bilgisi */}
                <div className="flex items-center gap-2 p-2 sm:p-3 rounded-xl border bg-white/10 border-white/10">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-200" />
                  <div className="flex flex-col">
                    <span className="text-[9px] sm:text-xs text-blue-100 leading-none mb-0.5 sm:mb-1 font-medium">İş Günü</span>
                    <span className="text-xs sm:text-sm font-bold leading-none text-white">
                      {allowanceData.days} gün
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aylık Net Kazanç */}
          <div className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 rounded-2xl p-3 sm:p-4 text-white shadow-lg relative overflow-hidden flex flex-col">
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-emerald-100 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Net Kazanç</p>
                <div className="w-4 h-4 sm:w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold">₺</div>
              </div>
              
              <div className="flex items-end gap-1 mb-3">
                <span className="text-xl sm:text-2xl font-black leading-none tracking-tighter">
                  ₺{finalEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <div className="flex flex-col gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-xl border bg-white/10 border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs text-emerald-100 leading-none">Mesai</span>
                    <span className="text-xs sm:text-sm font-bold leading-none text-white">
                      ₺{overtimeStats.total.payment.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {allowanceData.total > 0 && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 sm:pt-2">
                      <span className="text-[10px] sm:text-xs text-emerald-100 leading-none">Yol/Yem</span>
                      <span className="text-xs sm:text-sm font-bold leading-none text-white">
                        ₺{allowanceData.total.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5 sm:pt-2">
                    <span className="text-[10px] sm:text-xs text-emerald-100 leading-none">Maaş</span>
                    <span className="text-xs sm:text-sm font-bold leading-none text-white">
                      ₺{salarySum.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {overtimeStats.leave.hours > 0 && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 sm:pt-2">
                      <span className="text-[10px] sm:text-xs text-orange-200 leading-none font-bold">İzin</span>
                      <span className="text-xs sm:text-sm font-bold leading-none text-orange-100">
                        -₺{overtimeStats.leave.deduction.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                  {settings.hasTES && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 sm:pt-2">
                      <span className="text-[10px] sm:text-xs text-blue-200 leading-none font-bold">TES</span>
                      <span className="text-xs sm:text-sm font-bold leading-none text-blue-100">
                        -₺{tesDeduction.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                  {settings.hasSalaryAttachment && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 sm:pt-2">
                      <span className="text-[10px] sm:text-xs text-red-200 leading-none font-bold">Haciz</span>
                      <span className="text-xs sm:text-sm font-bold leading-none text-red-100">
                        -₺{(totalEarnings * (attachmentRate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
  
        {/* Mesai türlerine göre detaylar */}
        <div className="space-y-3 mb-4">
          {overtimeStats.normal.hours > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 dark:text-blue-200 font-semibold text-sm">Haftaiçi Mesailer</p>
                  <p className="text-blue-600 dark:text-blue-300 text-xs">Haftaiçi mesaileri</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-800 dark:text-blue-200 font-bold">{formatHours(overtimeStats.normal.hours)}</p>
                  <p className="text-blue-600 dark:text-blue-300 text-xs">₺{overtimeStats.normal.payment.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
  
          {overtimeStats.sunday.hours > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-800 dark:text-purple-200 font-semibold text-sm">Pazar Mesaileri</p>
                  <p className="text-purple-600 dark:text-purple-300 text-xs">Pazar günü mesaileri</p>
                </div>
                <div className="text-right">
                  <p className="text-purple-800 dark:text-purple-200 font-bold">{formatHours(overtimeStats.sunday.hours)}</p>
                  <p className="text-purple-600 dark:text-purple-300 text-xs">₺{overtimeStats.sunday.payment.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
  
          {overtimeStats.holiday.hours > 0 && (
            <div className="bg-red-50 dark:bg-red-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-800 dark:text-red-200 font-semibold text-sm">Dini & Resmi Tatil</p>
                  <p className="text-red-600 dark:text-red-300 text-xs">Bayram ve resmi tatil mesaileri</p>
                </div>
                <div className="text-right">
                  <p className="text-red-800 dark:text-red-200 font-bold">{formatHours(overtimeStats.holiday.hours)}</p>
                  <p className="text-red-600 dark:text-red-300 text-xs">₺{overtimeStats.holiday.payment.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
  
          {overtimeStats.leave.hours > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3 border border-orange-200/50 dark:border-orange-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-800 dark:text-orange-200 font-semibold text-sm">Ücretli İzin / Kesinti</p>
                  <p className="text-orange-600 dark:text-orange-300 text-xs">Maaştan düşülen izin saatleri</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-800 dark:text-orange-200 font-bold">{formatHours(overtimeStats.leave.hours)}</p>
                  <p className="text-orange-600 dark:text-orange-300 text-xs">-₺{overtimeStats.leave.deduction.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
};


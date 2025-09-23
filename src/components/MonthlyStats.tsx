import React, { useMemo } from 'react';
import { Clock, Trash2, Settings, Share2, Shield } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { formatHours, TURKISH_MONTHS, generateExportText } from '../utils/dateUtils';
import { downloadTextFile, shareText } from '../utils/fileUtils';

interface MonthlyStatsProps {
  currentDate: Date;
  onOpenSettings: () => void;
  onOpenDataBackup: () => void;
}

export const MonthlyStats: React.FC<MonthlyStatsProps> = React.memo(({ currentDate, onOpenSettings, onOpenDataBackup }) => {
  // Tüm hook’lar component’in en üstünde
  const { getMonthlyTotal, getMonthlyEntries, clearMonthData, monthlyData, isLoaded: dataLoaded } = useOvertimeData();
  const { getOvertimeRate, settings, isLoaded: salaryLoaded } = useSalarySettings();
  const { getHoliday } = useHolidays();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthlyTotal = getMonthlyTotal(year, month);
  const monthlyEntries = getMonthlyEntries(year, month);

  // Loading flag
  const isLoading = !dataLoaded || !salaryLoaded;

  // Memoize overtime stats calculation
  const overtimeStats = useMemo(() => {
    return monthlyEntries.reduce((stats, entry) => {
      const entryDate = new Date(entry.date);
      const holiday = getHoliday(entryDate);
      const isHolidayDate = holiday !== undefined;
      const dayOfWeek = entryDate.getDay();
      const isSunday = dayOfWeek === 0;
      const overtimeRate = getOvertimeRate(entryDate, isHolidayDate);

      let effectiveHours = entry.totalHours || 0;
      if (settings.deductBreakTime && effectiveHours >= 7.5) {
        effectiveHours = Math.max(0, effectiveHours - 1);
      }

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

      return stats;
    }, {
      normal: { hours: 0, payment: 0 },
      sunday: { hours: 0, payment: 0 },
      holiday: { hours: 0, payment: 0 },
      total: { hours: 0, payment: 0 }
    });
  }, [monthlyEntries, getHoliday, getOvertimeRate, settings.deductBreakTime]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-2 mb-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="w-3/4 h-6 bg-gray-200 rounded mb-4"></div>

        {/* Top Summary Skeletons */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 h-20 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 h-20 bg-gray-200 rounded-xl"></div>
        </div>

        {/* Detail Skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const exportText = generateExportText(monthlyData, year, month, settings.firstName, settings.lastName, getHoliday, settings.deductBreakTime);
    const fileName = `mesai-${TURKISH_MONTHS[month].toLowerCase()}-${year}.txt`;
    downloadTextFile(exportText, fileName);
  };

  const handleShare = async () => {
    const exportText = generateExportText(monthlyData, year, month, settings.firstName, settings.lastName, getHoliday, settings.deductBreakTime);
    const title = `${TURKISH_MONTHS[month]} ${year} Mesai Raporu`;
    await shareText(exportText, title);
  };

  const handleClearMonth = () => {
    if (window.confirm(`${TURKISH_MONTHS[month]} ${year} ayındaki tüm mesai kayıtlarını silmek istediğinizden emin misiniz?`)) {
      clearMonthData(year, month);
    }
  };

    return (
      <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          {TURKISH_MONTHS[month]} {year} Özeti
        </h3>
  
        <div className="flex gap-4 mb-4">
          {/* Toplam Mesai */}
          <div className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 dark:text-blue-200 text-xs font-medium">Toplam Mesai</p>
                <p className="text-xl font-bold">
                  {formatHours(monthlyTotal)}
                </p>
              </div>
              <Clock className="w-6 h-6 text-blue-200" />
            </div>
          </div>
  
          {/* Toplam Net Mesai Ücreti */}
          <div className="flex-1 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 dark:text-green-200 text-xs font-medium">Toplam Net Mesai Ücreti</p>
                <p className="text-xl font-bold">
                  ₺{overtimeStats.total.payment.toFixed(2)}
                </p>
              </div>
              <div className="w-6 h-6 text-green-200 flex items-center justify-center text-lg font-bold">₺</div>
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
        </div>
      </div>
    );});


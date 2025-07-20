import React from 'react';
import { Clock, FileText, Trash2, Settings, Share2, Shield } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { formatHours, TURKISH_MONTHS, generateExportText } from '../utils/dateUtils';
import { downloadTextFile, shareText } from '../utils/fileUtils';

interface MonthlyStatsProps {
  currentDate: Date;
  onOpenSalarySettings: () => void;
  onOpenDataBackup: () => void;
}

export const MonthlyStats: React.FC<MonthlyStatsProps> = ({ currentDate, onOpenSalarySettings, onOpenDataBackup }) => {
  const { getMonthlyTotal, getMonthlyEntries, clearMonthData, monthlyData, isLoaded: dataLoaded } = useOvertimeData();
  const { getOvertimeRate, settings, isLoaded: salaryLoaded } = useSalarySettings();
  const { getHoliday } = useHolidays();
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthlyTotal = getMonthlyTotal(year, month);
  const monthlyEntries = getMonthlyEntries(year, month);
  
  // Show loading state if data is not loaded yet
  if (!dataLoaded || !salaryLoaded) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Veriler yükleniyor...</div>
        </div>
      </div>
    );
  }

  // Mesai türlerine göre hesaplama
  const overtimeStats = monthlyEntries.reduce((stats, entry) => {
    const entryDate = new Date(entry.date);
    const holiday = getHoliday(entryDate);
    const isHolidayDate = holiday !== undefined;
    const dayOfWeek = entryDate.getDay();
    const isSunday = dayOfWeek === 0;
    const overtimeRate = getOvertimeRate(entryDate, isHolidayDate);
    const payment = (entry.totalHours || 0) * (overtimeRate || 0);
    
    if (isHolidayDate) {
      stats.holiday.hours += entry.totalHours || 0;
      stats.holiday.payment += payment;
    } else if (isSunday) {
      stats.sunday.hours += entry.totalHours || 0;
      stats.sunday.payment += payment;
    } else {
      stats.normal.hours += entry.totalHours || 0;
      stats.normal.payment += payment;
    }
    
    stats.total.hours += entry.totalHours || 0;
    stats.total.payment += payment;
    
    return stats;
  }, {
    normal: { hours: 0, payment: 0 },
    sunday: { hours: 0, payment: 0 },
    holiday: { hours: 0, payment: 0 },
    total: { hours: 0, payment: 0 }
  });
  
  const handleExport = () => {
    const exportText = generateExportText(monthlyData, year, month, settings.firstName, settings.lastName, getHoliday);
    const fileName = `mesai-${TURKISH_MONTHS[month].toLowerCase()}-${year}.txt`;
    downloadTextFile(exportText, fileName);
  };
  
  const handleShare = async () => {
    const exportText = generateExportText(monthlyData, year, month, settings.firstName, settings.lastName, getHoliday);
    const title = `${TURKISH_MONTHS[month]} ${year} Mesai Raporu`;
    await shareText(exportText, title);
  };
  
  const handleClearMonth = () => {
    if (window.confirm(`${TURKISH_MONTHS[month]} ${year} ayındaki tüm mesai kayıtlarını silmek istediğinizden emin misiniz?`)) {
      clearMonthData(year, month);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {TURKISH_MONTHS[month]} {year} Özeti
      </h3>
      
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-medium">Toplam Mesai</p>
            <p className="text-2xl font-bold">
              {formatHours(monthlyTotal)}
            </p>
          </div>
          <Clock className="w-8 h-8 text-blue-200" />
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-xs font-medium">Toplam Net Mesai Ücreti</p>
            <p className="text-2xl font-bold">
              ₺{overtimeStats.total.payment.toFixed(2)}
            </p>
          </div>
          <div className="w-8 h-8 text-green-200 flex items-center justify-center text-xl font-bold">₺</div>
        </div>
      </div>
      
      {/* Mesai türlerine göre detaylar */}
      <div className="space-y-3 mb-4">
        {/* Normal Mesailer */}
        {overtimeStats.normal.hours > 0 && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-semibold text-sm">Haftaiçi Mesailer</p>
                <p className="text-blue-600 text-xs">Haftaiçi mesaileri</p>
              </div>
              <div className="text-right">
                <p className="text-blue-800 font-bold">{formatHours(overtimeStats.normal.hours)}</p>
                <p className="text-blue-600 text-xs">₺{(overtimeStats.normal.payment || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Pazar Mesaileri */}
        {overtimeStats.sunday.hours > 0 && (
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-800 font-semibold text-sm">Pazar Mesaileri</p>
                <p className="text-purple-600 text-xs">Pazar günü mesaileri</p>
              </div>
              <div className="text-right">
                <p className="text-purple-800 font-bold">{formatHours(overtimeStats.sunday.hours)}</p>
                <p className="text-purple-600 text-xs">₺{(overtimeStats.sunday.payment || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tatil Mesaileri */}
        {overtimeStats.holiday.hours > 0 && (
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-800 font-semibold text-sm">Dini & Resmi Tatil</p>
                <p className="text-red-600 text-xs">Bayram ve resmi tatil mesaileri</p>
              </div>
              <div className="text-right">
                <p className="text-red-800 font-bold">{formatHours(overtimeStats.holiday.hours)}</p>
                <p className="text-red-600 text-xs">₺{(overtimeStats.holiday.payment || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          onClick={onOpenDataBackup}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 text-sm bg-green-500 text-white active:bg-green-600 active:scale-[0.98] touch-manipulation"
        >
          <Shield className="w-4 h-4" />
          Yedekle
        </button>
        
        <button
          onClick={onOpenSalarySettings}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 text-sm bg-purple-500 text-white active:bg-purple-600 active:scale-[0.98] touch-manipulation"
        >
          <Settings className="w-4 h-4" />
          Maaş Ayarları
        </button>
        
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <button
            onClick={handleShare}
            disabled={overtimeStats.total.hours === 0}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium
              transition-all duration-200 text-sm touch-manipulation
              ${overtimeStats.total.hours === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white active:bg-blue-600 active:scale-[0.98]'
              }
            `}
          >
            <Share2 className="w-4 h-4" />
            Paylaş
          </button>
        </div>
        
        <button
          onClick={handleClearMonth}
          disabled={overtimeStats.total.hours === 0}
          className={`
            flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium
            transition-all duration-200 text-sm touch-manipulation
            ${overtimeStats.total.hours === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 text-white active:bg-red-600 active:scale-[0.98]'
            }
          `}
        >
          <Trash2 className="w-4 h-4" />
          Sil
        </button>
      </div>
    </div>
  );
};
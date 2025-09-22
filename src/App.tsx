import React, { useState, useCallback, useMemo } from 'react';
import { Calendar } from './components/Calendar';
import { MonthlyStats } from './components/MonthlyStats';
import { OvertimeModal } from './components/OvertimeModal';
import { SalarySettings } from './components/SalarySettings';
import { FloatingActionButton } from './components/FloatingActionButton';
import { AboutModal } from './components/AboutModal';
import { DataBackupModal } from './components/DataBackupModal';
import { useOvertimeData } from './hooks/useOvertimeData';
import { useSalarySettings } from './hooks/useSalarySettings';
import { useHolidays } from './hooks/useHolidays';
import { useTheme } from './hooks/useTheme';
import { TURKISH_MONTHS } from './utils/dateUtils';
import { Clock, CheckSquare, Square, Settings, Download, Share2, Trash2, Info } from 'lucide-react';
import { ActionIcons } from './components/ActionIcons';
import { generateExportText } from './utils/dateUtils';
import { downloadTextFile, shareText } from './utils/fileUtils';

const App: React.FC = () => {
  // Ana hook'ları burada çağırarak tüm uygulamada state'lerin güncel kalmasını sağlıyoruz
  const { isLoaded: dataLoaded, monthlyData, getMonthlyTotal, clearMonthData } = useOvertimeData();
  const { isLoaded: salaryLoaded, settings, updateSettings, getOvertimeRate } = useSalarySettings();
  const { getHoliday } = useHolidays();
  useTheme(); // Tema yönetimini etkinleştir
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSalarySettingsOpen, setIsSalarySettingsOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  
  // Memoized callbacks for better performance
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);
  
  const handleFabClick = useCallback(() => {
    setSelectedDate(new Date());
    setIsModalOpen(true);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDate(null);
  }, []);
  
  const handleOpenSalarySettings = useCallback(() => {
    setIsSalarySettingsOpen(true);
  }, []);
  
  const handleOpenDataBackup = useCallback(() => {
    setIsDataBackupOpen(true);
  }, []);

  const handleShareMonthlyStats = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const exportText = generateExportText(monthlyData, year, month, settings.firstName, settings.lastName, getHoliday, settings.deductBreakTime);
    const title = `${TURKISH_MONTHS[month]} ${year} Mesai Raporu`;
    await shareText(exportText, title);
  }, [currentDate, monthlyData, settings, getHoliday]);

  const handleClearMonthlyStats = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (window.confirm(`${TURKISH_MONTHS[month]} ${year} ayındaki tüm mesai kayıtlarını silmek istediğinizden emin misiniz?`)) {
      clearMonthData(year, month);
    }
  }, [currentDate, clearMonthData]);
  
  // Memoized current date to prevent unnecessary re-renders
  const memoizedCurrentDate = useMemo(() => new Date(currentDate.getTime()), [currentDate.getTime()]);
  
  // Memoized handlers that depend on currentDate
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);
  
  // Show loading screen while data is being loaded
  if (!dataLoaded || !salaryLoaded) {
    return (
      <div className="
        bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center
        min-h-screen-dynamic
      ">
        <div className="text-center">
          <div className="p-4 bg-blue-500 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
            <Clock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Mesai Takip</h2>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  const monthlyTotal = getMonthlyTotal(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <div className="bg-gray-100 dark:bg-black h-screen-dynamic flex flex-col pb-nav">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="container mx-auto px-2 pt-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsAboutModalOpen(true)}
              className="flex items-center justify-start gap-2 flex-grow p-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-700 transition-colors touch-manipulation cursor-pointer"
              aria-label="Hakkında"
            >
              <div className="p-2 bg-blue-500 rounded-full">
                <Info className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Mesai Takip</h1>
            </button>

            {/* Action Icons (sağ) */}
            <ActionIcons
              onOpenDataBackup={handleOpenDataBackup}
              onOpenSalarySettings={handleOpenSalarySettings}
              onShareMonthlyStats={handleShareMonthlyStats}
              onClearMonthlyStats={handleClearMonthlyStats}
              canShare={monthlyTotal > 0}
              canClear={monthlyTotal > 0}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="container mx-auto px-2 max-w-4xl">
          <Calendar
            currentDate={memoizedCurrentDate}
            onDateChange={handleDateChange}
            onDateClick={handleDateClick}
          />
          <MonthlyStats 
            currentDate={currentDate} 
            onOpenSalarySettings={handleOpenSalarySettings}
            onOpenDataBackup={handleOpenDataBackup}
          />
        </div>
      </div>
      
      {/* Floating Action Button and Modals are outside the main layout flow */}
      <FloatingActionButton onClick={handleFabClick} />
      <OvertimeModal isOpen={isModalOpen} onClose={handleCloseModal} selectedDate={selectedDate} />
      <SalarySettings isOpen={isSalarySettingsOpen} onClose={() => setIsSalarySettingsOpen(false)} />
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
      <DataBackupModal isOpen={isDataBackupOpen} onClose={() => setIsDataBackupOpen(false)} />
    </div>
  );
}

export default App;
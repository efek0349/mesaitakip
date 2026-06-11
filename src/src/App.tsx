import React, { useState, useCallback, useMemo } from 'react';
import { Calendar } from './components/Calendar';
import { MonthlyStats } from './components/MonthlyStats';
import { OvertimeModal } from './components/OvertimeModal';
import { Settings } from './components/Settings';
import { AboutModal } from './components/AboutModal';
import { DataBackupModal } from './components/DataBackupModal';
import { UpdateModal } from './components/UpdateModal';
import { Toast } from './components/Toast';
import { ActionIcons } from './components/ActionIcons';
import { BilgiModal } from './components/BilgiModal';
import { useOvertimeData } from './hooks/useOvertimeData';
import { useSalarySettings } from './hooks/useSalarySettings';
import { useHolidays } from './hooks/useHolidays';
import { useTheme } from './hooks/useTheme';
import { useAutoBackup } from './hooks/useAutoBackup';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import { TURKISH_MONTHS } from './utils/dateUtils';
import { downloadTextFile, shareText, generateCsvContent, generateShareableSummaryText } from './utils/fileUtils';
import { Clock, Info } from 'lucide-react';
import { googleDriveService } from './utils/googleDriveService';
import { Browser } from '@capacitor/browser';
import { Dialog } from '@capacitor/dialog';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { isLoaded: dataLoaded, monthlyData, getMonthlyTotal, clearMonthData, hasMonthData } = useOvertimeData();
  const { isLoaded: salaryLoaded, settings, updateSettings, getOvertimeRate, getSalaryForDate } = useSalarySettings();
  const { getHoliday } = useHolidays(currentDate.getFullYear(), true);
  const updateInfo = useUpdateCheck();
  useTheme();
  useAutoBackup();

  React.useEffect(() => {
    googleDriveService.init().catch(console.error);
  }, []);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isBilgiOpen, setIsBilgiOpen] = useState(false);

  React.useEffect(() => {
    if (updateInfo.hasUpdate) {
      setIsUpdateModalOpen(true);
    }
  }, [updateInfo.hasUpdate]);
  
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDate(null);
  }, []);
  
  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);
  
  const handleOpenDataBackup = useCallback(() => {
    setIsDataBackupOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleCloseAbout = useCallback(() => setIsAboutModalOpen(false), []);
  const handleCloseDataBackup = useCallback(() => setIsDataBackupOpen(false), []);
  const handleCloseUpdate = useCallback(() => setIsUpdateModalOpen(false), []);
  const handleCloseBilgi = useCallback(() => setIsBilgiOpen(false), []);

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      await Browser.open({ url });
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleShareMonthlyStats = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthSalary = getSalaryForDate(currentDate);
    const effectiveSettings = {
      ...settings,
      monthlyGrossSalary: monthSalary.monthlyGrossSalary,
      bonus: monthSalary.bonus,
      isSaturdayWork: monthSalary.isSaturdayWork ?? settings.isSaturdayWork,
      shiftSystemEnabled: monthSalary.shiftSystemEnabled ?? settings.shiftSystemEnabled,
      shiftSystemType: monthSalary.shiftSystemType ?? settings.shiftSystemType
    };
    const exportText = generateShareableSummaryText(year, month, monthlyData, effectiveSettings, getHoliday);
    const title = `${TURKISH_MONTHS[month]} ${year} Mesai Özeti`;
    await shareText(exportText, title);
  }, [currentDate, monthlyData, settings, getHoliday, getSalaryForDate]);

  const handleClearMonthlyStats = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const { value } = await Dialog.confirm({
      title: 'Ayı Temizle',
      message: `${TURKISH_MONTHS[month]} ${year} ayındaki tüm mesai kayıtlarını silmek istediğinizden emin misiniz?`,
      okButtonTitle: 'Sil',
      cancelButtonTitle: 'Vazgeç'
    });
    if (value) {
      clearMonthData(year, month);
    }
  }, [currentDate, clearMonthData]);
  
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);
  
  const hasData = useMemo(
    () => hasMonthData(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate, hasMonthData, monthlyData]
  );
  
  if (!dataLoaded || !salaryLoaded) {
    return (
      <div className="bg-gray-100 dark:bg-black flex items-center justify-center min-h-screen-dynamic">
        <div className="text-center">
          <div className="p-4 bg-blue-500 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
            <Clock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Mesai Takip</h2>
          <p className="text-gray-600 dark:text-gray-400">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-black h-screen-dynamic flex flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">

      {/* Header */}
      <div className="flex-shrink-0">
        <div className="container mx-auto px-2 pt-4 max-w-4xl">
          <div className="flex items-center justify-between gap-2">

            {/* SOL TARAF: Uygulama İkonu + İsim/Soyisim */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAboutModalOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden shadow-md border-b-4 border-gray-300 dark:border-gray-700 active:border-b-0 active:translate-y-1 transition-all flex-shrink-0 bg-white"
                aria-label="Hakkında"
              >
                <img 
                  src={`${import.meta.env.BASE_URL}app_icon.png`} 
                  alt="App Icon" 
                  className="w-full h-full object-cover"
                />
              </button>

              {(settings.firstName || settings.lastName) && (
                <div className="flex flex-col justify-center min-w-0 pr-1">
                  <span className="text-[9px] font-bold text-gray-800 dark:text-gray-200 leading-tight truncate">
                    {settings.firstName}
                  </span>
                  <span className="text-[9px] font-bold text-gray-800 dark:text-gray-200 leading-tight truncate">
                    {settings.lastName}
                  </span>
                </div>
              )}
            </div>

            {/* Action Icons (sağ) */}
            <ActionIcons
              onOpenDataBackup={handleOpenDataBackup}
              onOpenSettings={handleOpenSettings}
              onShareMonthlyStats={handleShareMonthlyStats}
              onClearMonthlyStats={handleClearMonthlyStats}
              onOpenBilgi={() => setIsBilgiOpen(true)}
              canShare={hasData}
              canClear={hasData}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="container mx-auto px-2 max-w-4xl">
          <Calendar
            currentDate={currentDate}
            onDateChange={handleDateChange}
            onDateClick={handleDateClick}
          />
          <MonthlyStats 
            currentDate={currentDate} 
            onOpenSettings={handleOpenSettings}
            onOpenDataBackup={handleOpenDataBackup}
          />
        </div>
      </div>
      
      <OvertimeModal isOpen={isModalOpen} onClose={handleCloseModal} selectedDate={selectedDate} />
      <Settings isOpen={isSettingsOpen} onClose={handleCloseSettings} currentDate={currentDate} />
      <AboutModal isOpen={isAboutModalOpen} onClose={handleCloseAbout} />
      <DataBackupModal isOpen={isDataBackupOpen} onClose={handleCloseDataBackup} currentDate={currentDate} />
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={handleCloseUpdate}
        version={updateInfo.latestVersion}
        onDownload={() => handleOpenLink('https://github.com/efek0349/mesaitakip/releases')}
      />
      <BilgiModal isOpen={isBilgiOpen} onClose={handleCloseBilgi} />
      
      <Toast />
    </div>
  );
}

export default App;

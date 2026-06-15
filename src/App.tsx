import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Calendar } from './components/Calendar';
import { MonthlyStats } from './components/MonthlyStats';
import { Toast } from './components/Toast';
import { ActionIcons } from './components/ActionIcons';
import { useOvertimeData } from './hooks/useOvertimeData';
import { useSalarySettings } from './hooks/useSalarySettings';
import { useHolidays } from './hooks/useHolidays';
import { useTheme } from './hooks/useTheme';
import { useAutoBackup } from './hooks/useAutoBackup';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import { TURKISH_MONTHS } from './utils/dateUtils';
import { downloadTextFile, shareText, generateCsvContent, generateShareableSummaryText } from './utils/fileUtils';
import { Clock } from 'lucide-react';
import { googleDriveService } from './utils/googleDriveService';
import { Browser } from '@capacitor/browser';
import { Dialog } from '@capacitor/dialog';

const OvertimeModal = lazy(() => import('./components/OvertimeModal').then(m => ({ default: m.OvertimeModal })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const AboutModal = lazy(() => import('./components/AboutModal').then(m => ({ default: m.AboutModal })));
const DataBackupModal = lazy(() => import('./components/DataBackupModal').then(m => ({ default: m.DataBackupModal })));
const UpdateModal = lazy(() => import('./components/UpdateModal').then(m => ({ default: m.UpdateModal })));
const BilgiModal = lazy(() => import('./components/BilgiModal').then(m => ({ default: m.BilgiModal })));

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visualProgress, setVisualProgress] = useState(0);
  const [isFullyReady, setIsFullyReady] = useState(false);

  const { isLoaded: dataLoaded, monthlyData, getMonthlyTotal, clearMonthData, hasMonthData } = useOvertimeData();
  const { isLoaded: salaryLoaded, settings, updateSettings, getOvertimeRate, getSalaryForDate } = useSalarySettings();
  
  // Visual Progress Logic
    React.useEffect(() => {
    let timer: number;
    const updateProgress = () => {
      setVisualProgress(prev => {
        if (prev < 90) {
          // Faster progress
          return prev + Math.random() * 15;
        } else if (dataLoaded && salaryLoaded) {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => setIsFullyReady(true), 100); // Shorter pause
            return 100;
          }
          return prev + 20;
        }
        return prev;
      });
    };

    timer = window.setInterval(updateProgress, 30); // Faster interval
    return () => clearInterval(timer);
  }, [dataLoaded, salaryLoaded]);

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
    const exportText = await generateShareableSummaryText(year, month, monthlyData, effectiveSettings, getHoliday);
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
  
  if (!isFullyReady) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-black flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
            <div className="relative w-24 h-24 rounded-[28px] overflow-hidden shadow-2xl border-b-4 border-gray-200 dark:border-gray-800 bg-white p-1">
              <img 
                src={`${import.meta.env.BASE_URL}app_icon.png`} 
                alt="App Icon" 
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 w-48">
            <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tighter uppercase">
              Mesai Takip
            </h2>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-300/20 dark:border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${visualProgress}%` }} 
              />
            </div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">
              {visualProgress >= 100 ? 'Hazır!' : 'Veriler Yükleniyor'}
            </p>
          </div>
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
      
      <Suspense fallback={null}>
        {isModalOpen && (
          <OvertimeModal isOpen={isModalOpen} onClose={handleCloseModal} selectedDate={selectedDate} />
        )}
        {isSettingsOpen && (
          <Settings isOpen={isSettingsOpen} onClose={handleCloseSettings} currentDate={currentDate} />
        )}
        {isAboutModalOpen && (
          <AboutModal isOpen={isAboutModalOpen} onClose={handleCloseAbout} />
        )}
        {isDataBackupOpen && (
          <DataBackupModal isOpen={isDataBackupOpen} onClose={handleCloseDataBackup} currentDate={currentDate} />
        )}
        {isUpdateModalOpen && (
          <UpdateModal
            isOpen={isUpdateModalOpen}
            onClose={handleCloseUpdate}
            version={updateInfo.latestVersion}
            onDownload={() => handleOpenLink('https://github.com/efek0349/mesaitakip/releases')}
          />
        )}
        {isBilgiOpen && (
          <BilgiModal isOpen={isBilgiOpen} onClose={handleCloseBilgi} />
        )}
      </Suspense>
      
      <Toast />
    </div>
  );
}

export default App;

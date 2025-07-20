import React, { useState } from 'react';
import { Calendar } from './components/Calendar';
import { MonthlyStats } from './components/MonthlyStats';
import { OvertimeModal } from './components/OvertimeModal';
import { SalarySettings } from './components/SalarySettings';
import { FloatingActionButton } from './components/FloatingActionButton';
import { AboutModal } from './components/AboutModal';
import { DataBackupModal } from './components/DataBackupModal';
import { useOvertimeData } from './hooks/useOvertimeData';
import { useSalarySettings } from './hooks/useSalarySettings';
import { useAndroidSafeArea } from './hooks/useAndroidSafeArea';
import { Clock } from 'lucide-react';

function App() {
  // Ana hook'ları burada çağırarak tüm uygulamada state'lerin güncel kalmasını sağlıyoruz
  const { isLoaded: dataLoaded } = useOvertimeData();
  const { isLoaded: salaryLoaded } = useSalarySettings();
  const { isAndroid } = useAndroidSafeArea();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSalarySettingsOpen, setIsSalarySettingsOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  
  // Show loading screen while data is being loaded
  if (!dataLoaded || !salaryLoaded) {
    return (
      <div className={`
        bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center
        ${isAndroid ? 'min-h-screen-dynamic' : 'min-h-screen'}
      `}>
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };
  
  const handleFabClick = () => {
    setSelectedDate(new Date());
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  return (
    <div className={`
      bg-gradient-to-br from-blue-50 to-indigo-100 pb-20
      ${isAndroid ? 'min-h-screen-dynamic' : 'min-h-screen'}
    `}>
      <div className="container mx-auto px-3 py-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => setIsAboutModalOpen(true)}
              className="absolute left-3 top-4 p-2 rounded-lg active:bg-white/20 transition-colors touch-manipulation"
            >
              <div className="w-6 h-6 border-2 border-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600">i</span>
              </div>
            </button>
            <div className="p-2 bg-blue-500 rounded-full">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Mesai Takip
            </h1>
          </div>
          <p className="text-sm text-gray-600 px-4">
            Mesai saatlerinizi takip edin ve aylık raporlarınızı alın
          </p>
        </div>
        
        {/* Calendar */}
        <Calendar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onDateClick={handleDateClick}
        />
        
        {/* Monthly Stats */}
        <MonthlyStats 
          currentDate={currentDate} 
          onOpenSalarySettings={() => setIsSalarySettingsOpen(true)}
          onOpenDataBackup={() => setIsDataBackupOpen(true)}
        />
        
        {/* Floating Action Button */}
        <FloatingActionButton onClick={handleFabClick} />
        
        {/* Overtime Modal */}
        <OvertimeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
        />
        
        {/* Salary Settings Modal */}
        <SalarySettings
          isOpen={isSalarySettingsOpen}
          onClose={() => setIsSalarySettingsOpen(false)}
        />
        
        {/* About Modal */}
        <AboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />
        
        {/* Data Backup Modal */}
        <DataBackupModal
          isOpen={isDataBackupOpen}
          onClose={() => setIsDataBackupOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Clock, DollarSign, Calendar, FileText, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';
import { formatTurkishDate, formatHours } from '../utils/dateUtils';
import { getHolidayColorClass } from '../utils/holidayUtils';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
}

export const OvertimeModal: React.FC<OvertimeModalProps> = ({ isOpen, onClose, selectedDate }) => {
  console.log('🔍 OvertimeModal render:', { isOpen, selectedDate: selectedDate?.toISOString() });
  
  const { addOvertimeEntry, removeOvertimeEntry, getOvertimeForDate } = useOvertimeData();
  const { getOvertimeRate, settings } = useSalarySettings();
  const { getHoliday } = useHolidays();
  const { getModalStyle, getButtonContainerStyle, isAndroid } = useAndroidSafeArea();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [note, setNote] = useState('');
  const [showNoteSection, setShowNoteSection] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [modalContentHeight, setModalContentHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const existingEntry = selectedDate ? getOvertimeForDate(selectedDate) : null;
  
  useEffect(() => {
    if (existingEntry) {
      setHours(existingEntry.hours);
      setMinutes(existingEntry.minutes);
      setNote(existingEntry.note || '');
      setShowNoteSection(!!(existingEntry.note && existingEntry.note.trim()));
    } else {
      setHours(0);
      setMinutes(0);
      setNote('');
      setShowNoteSection(false);
    }
  }, [existingEntry, selectedDate]);

  // Mobil cihaz tespiti
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           window.innerWidth <= 768 ||
                           ('ontouchstart' in window);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gelişmiş klavye açılma/kapanma tespiti
  useEffect(() => {
    let initialHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;
      
      // Klavye açıldığında yükseklik farkı 150px'den fazla olur
      const keyboardThreshold = 150;
      const keyboardOpen = heightDiff > keyboardThreshold;
      
      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? heightDiff : 0);
      
      console.log('📱 Keyboard state:', { 
        initialHeight, 
        currentHeight, 
        heightDiff, 
        keyboardOpen,
        keyboardHeight: keyboardOpen ? heightDiff : 0
      });
    };

    // İlk yükleme
    initialHeight = window.innerHeight;
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        initialHeight = window.innerHeight;
        handleResize();
      }, 500);
    });
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Not alanı toggle fonksiyonu
  const handleNoteToggle = () => {
    const newShowState = !showNoteSection;
    console.log('📝 Note toggle:', { current: showNoteSection, new: newShowState });
    setShowNoteSection(newShowState);
    
    // Mobil cihazlarda focus problemi için gecikme
    if (newShowState && !isMobile) {
      setTimeout(() => {
        const textarea = document.querySelector('.overtime-modal-content textarea');
        if (textarea) {
          (textarea as HTMLTextAreaElement).focus();
        }
      }, 200);
    }
    
    // Mobil cihazlarda scroll problemi için
    if (isMobile && newShowState) {
      setTimeout(() => {
        const modal = document.querySelector('.overtime-modal-content');
        if (modal) {
          modal.scrollTop = modal.scrollHeight;
        }
      }, 100);
    }
  };
  
  const handleSave = () => {
    if (selectedDate && (hours > 0 || minutes > 0)) {
      console.log('Saving overtime entry:', { selectedDate, hours, minutes });
      addOvertimeEntry(selectedDate, hours, minutes, note.trim());
      // Wait for data to be saved and state to update
      setTimeout(() => {
        console.log('✅ Modal closing after save');
        onClose();
      }, 200);
    } else {
      onClose();
    }
  };
  
  const handleDelete = () => {
    if (selectedDate && existingEntry) {
      console.log('🗑️ Deleting overtime entry for:', selectedDate);
      removeOvertimeEntry(selectedDate);
      setTimeout(() => {
        console.log('✅ Modal closing after delete');
        onClose();
      }, 200);
    }
  };
  
  const adjustHours = (delta: number) => {
    const newHours = Math.max(0, Math.min(23, hours + delta));
    setHours(newHours);
  };
  
  const adjustMinutes = (delta: number) => {
    const newMinutes = Math.max(0, Math.min(59, minutes + delta));
    setMinutes(newMinutes);
  };
  
  const handleClose = () => {
    console.log('🚪 Modal handleClose called');
    setHours(0);
    setMinutes(0);
    setNote('');
    setShowNoteSection(false);
    onClose();
  };
  
  if (!isOpen || !selectedDate) {
    console.log('❌ Modal not rendering:', { isOpen, hasSelectedDate: !!selectedDate });
    return null;
  }
  
  console.log('✅ Modal rendering with:', { selectedDate: selectedDate.toISOString(), hours, minutes });
  
  const totalHours = hours + minutes / 60;
  const formattedDate = formatTurkishDate(selectedDate);
  const dayOfWeek = selectedDate.getDay();
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const holiday = getHoliday(selectedDate);
  const isHolidayDate = holiday !== undefined;
  const isWeekend = isSaturday || isSunday;
  const overtimeRate = getOvertimeRate(selectedDate, isHolidayDate);
  
  // Mola kesintisi hesaplama
  let effectiveHours = totalHours;
  if (settings.deductBreakTime && totalHours >= 7.5) {
    effectiveHours = Math.max(0, totalHours - 1); // 1 saat mola kesintisi
  }
  
  const totalPayment = effectiveHours * overtimeRate;
  
  console.log('🔍 Modal hesaplama:', {
    selectedDate: selectedDate.toISOString().split('T')[0],
    totalHours,
    isHolidayDate,
    overtimeRate,
    totalPayment
  });

  // Klavye açıkken modal yüksekliğini ayarla
  const getKeyboardAwareStyle = () => {
    if (isMobile && isKeyboardOpen) {
      // Mobil cihazlarda klavye açıkken çok basit stil
      return {
        position: 'fixed' as const,
        top: '10px',
        left: '10px',
        right: '10px',
        bottom: '10px',
        maxHeight: 'calc(100vh - 20px)',
        height: 'auto',
        margin: '0'
      };
    }
    
    if (isMobile && showNoteSection && !isKeyboardOpen) {
      // Mobil cihazlarda not alanı açıkken
      return {
        maxHeight: '90vh',
        height: 'auto',
        marginBottom: '10px'
      };
    }
    
    return isAndroid ? getModalStyle() : undefined;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" style={{ display: 'flex' }}>
      <div 
        className={`
          bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col
          overtime-modal-content
          ${isMobile && isKeyboardOpen
            ? 'overflow-visible'
            : 'overflow-hidden'
          }
          ${isKeyboardOpen && isMobile
            ? 'h-auto max-h-none' 
            : isAndroid 
            ? 'modal-android android-safe-modal' 
            : 'max-h-[85vh] mb-safe'
          }
        `}
        style={getKeyboardAwareStyle()}
      >
        {/* Sabit Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              {existingEntry ? 'Mesai Düzenle' : 'Mesai Ekle'}
            </h2>
            <button
              onClick={handleClose}
              className="p-3 rounded-lg active:bg-gray-100 transition-colors touch-manipulation"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
          
        {/* Ana İçerik - Klavye durumuna göre düzenlendi */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Üst kısım - Tarih ve hesaplamalar */}
          <div className={`
            flex-1 p-4 sm:p-6 pt-2 sm:pt-3 overflow-y-auto
            ${isKeyboardOpen ? 'pb-2' : 'pb-4'}
          `}>
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm sm:text-base text-gray-700 font-medium">{formattedDate}</span>
              
                {/* Tatil etiketi */}
                {holiday && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs flex-shrink-0 ${getHolidayColorClass(holiday)}`}>
                    <Calendar className="w-3 h-3" />
                    <span>{holiday.shortName}</span>
                  </div>
                )}
              
                {/* Hafta sonu etiketi (tatil değilse) */}
                {isWeekend && !holiday && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs flex-shrink-0 ${
                    isSaturday 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    <span>{isSaturday ? 'Cumartesi' : 'Pazar'}</span>
                  </div>
                )}
              </div>
            
              {totalHours > 0 && (
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  {/*settings.deductBreakTime && totalHours >= 7.5 && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-orange-700 font-medium text-center text-xs sm:text-sm">
                        Mola kesintisi: 1 saat (Ücrete dahil: {formatHours(effectiveHours)})
                      </p>
                    </div>
                  )*/}
                
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-green-700 font-semibold text-sm sm:text-base">
                        ₺{totalPayment.toFixed(2)} (net)
                        <span className="text-sm font-normal">
                          ({overtimeRate.toFixed(2)}₺/saat net{isHolidayDate ? ' - tatil' : isWeekend ? (isSaturday ? ' - cumartesi' : ' - pazar') : ''}
                          {settings.deductBreakTime && totalHours >= 7.5 ? ' - mola kesintili' : ''})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          
            <div className={`space-y-4 sm:space-y-6 ${isKeyboardOpen ? 'mb-2' : 'mb-4 sm:mb-6'}`}>
              {/* Hours */}
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base text-gray-700 font-medium">Saat</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustHours(-1)}
                    className="p-3 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xl sm:text-2xl font-bold text-gray-800 w-12 text-center">
                    {hours}
                  </span>
                  <button
                    onClick={() => adjustHours(1)}
                    className="p-3 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            
              {/* Minutes */}
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base text-gray-700 font-medium">Dakika</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustMinutes(-15)}
                    className="p-3 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xl sm:text-2xl font-bold text-gray-800 w-12 text-center">
                    {minutes}
                  </span>
                  <button
                    onClick={() => adjustMinutes(15)}
                    className="p-3 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Not Toggle Butonu - Klavye kapalıyken */}
            {(!isKeyboardOpen || !isMobile) && (
              <div className="border-t border-gray-200 pt-4">
                <div className={`
                  rounded-lg border transition-all duration-300 overflow-hidden
                  ${showNoteSection 
                    ? 'bg-blue-50 border-blue-200' 
                    : note.trim() 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                  }
                `}>
                  {/* Not Ekle Butonu */}
                  <button
                    onClick={handleNoteToggle}
                    className="w-full flex items-center justify-between p-3 active:bg-black/5 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`
                        p-1.5 rounded-full transition-colors duration-200
                        ${showNoteSection 
                          ? 'bg-blue-500' 
                          : note.trim() 
                          ? 'bg-green-500' 
                          : 'bg-gray-400'
                        }
                      `}>
                        <Edit3 className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-left">
                        <span className={`
                          text-sm font-medium transition-colors duration-200
                          ${showNoteSection 
                            ? 'text-blue-700' 
                            : note.trim() 
                            ? 'text-green-700' 
                            : 'text-gray-700'
                          }
                        `}>
                          Not Ekle
                        </span>
                        {note.trim() && !showNoteSection && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-48">
                            {note.length > 30 ? `${note.substring(0, 30)}...` : note}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {note.trim() && !showNoteSection && (
                        <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                          {note.length}/200
                        </span>
                      )}
                      <div className={`transition-transform duration-300 ${showNoteSection ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                  </button>
                  
                  {/* Açılır Not Alanı */}
                  <div className={`
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${showNoteSection ? 'max-h-48 opacity-100 pb-3' : 'max-h-0 opacity-0 pb-0'}
                  `}>
                    <div className="px-3 pt-1">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Bu mesai için açıklama ekleyin (proje, acil durum, vs.)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none h-20 transition-all"
                        maxLength={200}
                        rows={3}
                        style={{ minHeight: '80px' }}
                      />
                      
                      <div className="flex justify-between items-center mt-2">
                        <span className={`
                          text-xs transition-colors
                          ${note.length > 180 ? 'text-red-500' : 'text-gray-500'}
                        `}>
                          {note.length}/200 karakter
                        </span>
                        
                        {note.trim() && (
                          <button
                            onClick={() => setNote('')}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded"
                          >
                            Temizle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Klavye açıkken basit not alanı */}
            {isKeyboardOpen && showNoteSection && isMobile && (
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="bg-blue-50 rounded-lg p-2">
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Not
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Açıklama ekleyin..."
                    className={`
                      w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 
                      focus:border-transparent text-sm resize-none h-20 transition-all
                      ${isMobile ? 'mobile-note-input text-base' : ''}
                    `}
                    maxLength={200}
                    rows={3}
                    autoFocus={false}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {note.length}/200
                    </span>
                    <button
                      onClick={() => setShowNoteSection(false)}
                      className="text-xs text-blue-600 px-2 py-1 rounded active:bg-blue-100"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Sabit Footer Butonları - Klavye durumuna göre ayarlandı */}
        <div 
          className={`
            flex-shrink-0 bg-white border-t border-gray-100 flex flex-col sm:flex-row gap-3
            ${isKeyboardOpen 
              ? 'p-3 pb-4' 
              : isAndroid 
              ? 'p-4 sm:p-6 android-safe-button' 
              : 'p-4 sm:p-6 pb-safe'
            }
          `}
          style={{
            ...(isKeyboardOpen ? undefined : (isAndroid ? getButtonContainerStyle() : undefined)),
            position: isMobile && isKeyboardOpen ? 'sticky' : undefined,
            bottom: isMobile && isKeyboardOpen ? '0' : undefined
          }}
        >
          {existingEntry && (
            <button
              onClick={handleDelete}
              className={`
                flex-1 px-4 bg-red-500 text-white rounded-lg font-medium 
                active:bg-red-600 transition-colors touch-manipulation
                ${isKeyboardOpen 
                  ? 'py-3 min-h-[44px]' 
                  : isAndroid 
                  ? 'android-button' 
                  : 'py-4 min-h-[48px]'
                }
              `}
            >
              Sil
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={hours === 0 && minutes === 0}
            className={`
              flex-1 px-4 rounded-lg font-medium transition-colors touch-manipulation
              ${isKeyboardOpen 
                ? 'py-3 min-h-[44px]' 
                : isAndroid 
                ? 'android-button' 
                : 'py-4 min-h-[48px]'
              }
              ${hours === 0 && minutes === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white active:bg-blue-600'
              }
            `}
          >
            {existingEntry ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};
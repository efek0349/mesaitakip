import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Clock, DollarSign, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
  if (settings.deductBreakTime && totalHours >= 8) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" style={{ display: 'flex' }}>
      <div 
        className={`
          bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto
          ${isAndroid ? 'modal-android android-safe-modal' : 'max-h-[85vh] mb-safe'}
        `}
        style={isAndroid ? getModalStyle() : undefined}
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
          
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 sm:pt-3 pb-24 sm:pb-28">
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
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-blue-700 font-semibold text-center text-sm sm:text-base">
                    Toplam: {formatHours(totalHours)}
                  </p>
                </div>
                
                {settings.deductBreakTime && totalHours >= 8 && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-orange-700 font-medium text-center text-xs sm:text-sm">
                      Mola kesintisi: 1 saat (Ücrete dahil: {formatHours(effectiveHours)})
                    </p>
                  </div>
                )}
                
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 text-green-600 flex items-center justify-center text-xs font-bold">₺</div>
                    <p className="text-green-700 font-semibold text-sm sm:text-base">
                      ₺{totalPayment.toFixed(2)} (net)
                      <span className="text-sm font-normal">
                        ({overtimeRate.toFixed(2)}₺/saat net{isHolidayDate ? ' - tatil' : isWeekend ? (isSaturday ? ' - cumartesi' : ' - pazar') : ''}
                        {settings.deductBreakTime && totalHours >= 8 ? ' - mola kesintili' : ''})
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
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
            
            {/* Note Section Toggle */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <button
                onClick={() => setShowNoteSection(!showNoteSection)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors touch-manipulation"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm sm:text-base font-medium text-gray-700">
                    Not Ekle {note.trim() && `(${note.length} karakter)`}
                  </span>
                </div>
                {showNoteSection ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              
              {showNoteSection && (
                <div className="mt-3 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Bu mesai için bir not ekleyin... (örn: Proje teslimi, acil durum, vs.)"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-none"
                    rows={4}
                    maxLength={200}
                    autoFocus
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {note.length}/200 karakter
                    </span>
                    {note.trim() && (
                      <button
                        onClick={() => setNote('')}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Sabit Footer Butonları */}
        <div 
          className={`
            sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-6 flex-shrink-0
            flex flex-col sm:flex-row gap-3
            ${isAndroid ? 'android-safe-button' : 'pb-safe'}
          `}
          style={isAndroid ? getButtonContainerStyle() : undefined}
        >
          {existingEntry && (
            <button
              onClick={handleDelete}
              className={`
                flex-1 px-4 bg-red-500 text-white rounded-lg font-medium 
                active:bg-red-600 transition-colors touch-manipulation
                ${isAndroid ? 'android-button' : 'py-4 min-h-[48px]'}
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
              ${isAndroid ? 'android-button' : 'py-4 min-h-[48px]'}
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
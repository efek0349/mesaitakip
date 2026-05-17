import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, Clock, Edit3, Info, Sun, Moon } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { formatTurkishDate, calculateEffectiveHours, getShiftType, getNormalizedShiftStartDate, getWeekWorkDays, getDateKey, getMonthKey } from '../utils/dateUtils';
import { getHolidayColorClass } from '../utils/holidayUtils';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
}

export const OvertimeModal: React.FC<OvertimeModalProps> = React.memo(({ isOpen, onClose, selectedDate }) => {
  // 1. Tüm Hook'lar (Her zaman aynı sırada çağrılmalı)
  const { addOvertimeEntry, removeOvertimeEntry, getEntriesForDate, monthlyData } = useOvertimeData();
  const { getOvertimeRate, settings, getHourlyRate } = useSalarySettings();
  const { getHoliday } = useHolidays();
  
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [type, setType] = useState<'overtime' | 'leave'>('overtime');
  const [isFullDay, setIsFullDay] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteSection, setShowNoteSection] = useState(false);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Mevcut kayıtları bul (selectedDate null olsa bile hook kuralları gereği burada)
  const existingEntries = React.useMemo(() => 
    selectedDate ? getEntriesForDate(selectedDate) : [], 
    [selectedDate, getEntriesForDate]
  );
  const existingEntryForCurrentType = existingEntries.find(e => e.type === type);

  // Vardiya Bilgisi
  const shiftType = React.useMemo(() => {
    if (!selectedDate || !settings.shiftSystemEnabled || !settings.shiftStartDate) return null;
    const normalized = getNormalizedShiftStartDate(settings.shiftStartDate);
    return getShiftType(selectedDate, normalized, settings.shiftInitialType, settings.shiftSystemType);
  }, [selectedDate, settings]);

  // Haftalık saat hesaplama (Pazar için katsayı belirlemek üzere)
  const weeklyHours = React.useMemo(() => {
    if (!selectedDate || selectedDate.getDay() !== 0) return undefined;

    const weekDays = getWeekWorkDays(selectedDate);
    let total = 0;

    weekDays.forEach(day => {
      const dayKey = getDateKey(day);
      const dayMonthKey = getMonthKey(day);
      const dayEntries = (monthlyData[dayMonthKey] || []).filter((e: any) => e.date === dayKey);
      
      const overtimeEntry = dayEntries.find((e: any) => e.type === 'overtime');
      const leaveEntry = dayEntries.find((e: any) => e.type === 'leave');

      const dayIsSaturday = day.getDay() === 6;
      const isStandardWorkDay = settings.isSaturdayWork ? true : !dayIsSaturday;

      let dayWorkedHours = 0;
      if (isStandardWorkDay) {
        dayWorkedHours = settings.dailyWorkingHours;
        if (leaveEntry?.isFullDay) {
          dayWorkedHours = 0;
        } else if (leaveEntry) {
          dayWorkedHours = Math.max(0, dayWorkedHours - (leaveEntry.totalHours || 0));
        }
      }

      if (overtimeEntry) {
        dayWorkedHours += (overtimeEntry.totalHours || 0);
      }

      total += dayWorkedHours;
    });

    return total;
  }, [selectedDate, monthlyData, settings.isSaturdayWork, settings.dailyWorkingHours]);

  // Form verilerini senkronize et
  useEffect(() => {
    if (isOpen) {
      if (existingEntryForCurrentType) {
        setHours(existingEntryForCurrentType.hours);
        setMinutes(existingEntryForCurrentType.minutes);
        setIsFullDay(!!existingEntryForCurrentType.isFullDay);
        const noteText = existingEntryForCurrentType.note || '';
        setNote(noteText);
        setShowNoteSection(!!noteText.trim());
      } else {
        setHours(0);
        setMinutes(0);
        setIsFullDay(false);
        setNote('');
        setShowNoteSection(false);
      }
    }
  }, [isOpen, type, existingEntryForCurrentType]);

  // Not bölümü odaklanması
  useEffect(() => {
    if (showNoteSection) {
      const timer = setTimeout(() => {
        noteInputRef.current?.focus();
        noteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showNoteSection]);

  // 2. Erken Return (Tüm hooklardan sonra olmalı!)
  if (!isOpen || !selectedDate) return null;

  // 3. Hesaplamalar ve İşleyiciler
  const holiday = getHoliday(selectedDate);
  const formattedDate = formatTurkishDate(selectedDate);
  const isSaturday = selectedDate.getDay() === 6;
  const isSunday = selectedDate.getDay() === 0;

  const totalHours = (isFullDay && type === 'leave') ? settings.dailyWorkingHours : (hours + minutes / 60);
  const overtimeRate = getOvertimeRate(selectedDate, !!holiday, weeklyHours);
  const hourlyRate = getHourlyRate(selectedDate);
  
  const paymentHours = type === 'overtime' ? calculateEffectiveHours(totalHours, settings.deductBreakTime, isSaturday, isSunday, !!holiday, settings.isSaturdayWork) : totalHours;
  const totalPayment = type === 'overtime' ? paymentHours * overtimeRate : paymentHours * hourlyRate;

  const handleSave = () => {
    if (selectedDate) {
      if (hours > 0 || minutes > 0 || (type === 'leave' && isFullDay)) {
        addOvertimeEntry(selectedDate, hours, minutes, type, note.trim(), isFullDay);
      } else if (existingEntryForCurrentType) {
        removeOvertimeEntry(selectedDate, type);
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (selectedDate && existingEntryForCurrentType) {
      removeOvertimeEntry(selectedDate, type);
    }
    onClose();
  };

  const adjustHours = (delta: number) => setHours(prev => Math.max(0, Math.min(23, prev + delta)));
  const adjustMinutes = (delta: number) => {
    let newMinutes = minutes + delta;
    let newHours = hours;
    if (newMinutes >= 60) {
      newHours += 1;
      newMinutes -= 60;
    } else if (newMinutes < 0) {
      newHours = Math.max(0, newHours - 1);
      newMinutes += 60;
    }
    setHours(newHours);
    setMinutes(newMinutes);
  };

  // Arife Bilgi Paneli İçeriği
  const renderHalfDayInfo = () => {
    if (!holiday?.isHalfDay) return null;

    let message = "Resmi tatil bugün saat 13:00'te başlamaktadır.";
    let subMessage = "Bu saatten sonraki çalışmalar bayram mesaisi sayılır.";
    let icon = <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />;

    if (shiftType) {
      if (shiftType === 'night') {
        message = "Gece vardiyası 13:00'ten sonra başladığı için tamamı bayram sayılır.";
        subMessage = "Bu geceki çalışmanızın tamamı resmi tatil mesaisi (katsayılı) olarak hesaplanmalıdır.";
        icon = <Moon className="w-5 h-5 text-indigo-500" />;
      } else if (shiftType === 'afternoon') {
        message = "Öğle vardiyası 13:00'ten sonra başladığı için tamamı bayram sayılır.";
        subMessage = "Vardiya başlangıcınız tatil saatine denk geldiği için mesainiz bayram statüsündedir.";
        icon = <Sun className="w-5 h-5 text-yellow-500" />;
      } else if (shiftType === 'morning' || shiftType === 'day') {
        message = "Sabah vardiyası için tatil 13:00'te başlar.";
        subMessage = "13:00'e kadar normal, 13:00'ten sonraki saatleriniz bayram mesaisi sayılır.";
        icon = <Sun className="w-5 h-5 text-orange-500" />;
      }
    }

    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{message}</p>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">{subMessage}</p>
        </div>
      </div>
    );
  };

  // Pazar Mesaisi Bilgi Paneli
  const renderSundayInfo = () => {
    if (!isSunday || !!holiday) return null;

    const isQualified = weeklyHours !== undefined && weeklyHours >= 45;
    
    return (
      <div className={`border rounded-xl p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300 ${
        isQualified 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40' 
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40'
      }`}>
        <div className="mt-0.5">
          <Info className={`w-5 h-5 ${isQualified ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-bold ${isQualified ? 'text-green-900 dark:text-green-200' : 'text-blue-900 dark:text-blue-200'}`}>
            Pazar Mesaisi Katsayısı: {isQualified ? '2.5x' : '2.0x'}
          </p>
          <p className={`text-[10px] mt-0.5 ${isQualified ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>
            Haftalık çalışma süreniz: <span className="font-bold">{weeklyHours?.toFixed(1)} sa</span>. 
            {isQualified 
              ? ' 45 saati aştığınız için 2.5 katı uygulanıyor.' 
              : ' 45 saatin altında kaldığınız için 2.0 katı uygulanıyor.'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 h-screen-dynamic hardware-accelerated">
      <div className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            {existingEntryForCurrentType ? (type === 'overtime' ? 'Mesai Düzenle' : 'İzin Düzenle') : (type === 'overtime' ? 'Mesai Ekle' : 'İzin Ekle')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-600">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Bilgi Panelleri */}
          {renderHalfDayInfo()}
          {renderSundayInfo()}

          {/* Type Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setType('overtime')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                type === 'overtime'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Mesai
            </button>
            <button
              onClick={() => setType('leave')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                type === 'leave'
                  ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              İzin
            </button>
          </div>

          {/* Date & Payment Info */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${type === 'overtime' ? 'text-blue-500' : 'text-orange-500'}`} />
              <span className="text-base text-gray-700 dark:text-gray-200 font-medium">{formattedDate}</span>
              {holiday && (
                <div className={`text-xs px-2 py-1 rounded-full ${getHolidayColorClass(holiday)} dark:bg-opacity-30`}>
                  {holiday.shortName}
                </div>
              )}
            </div>
            {(totalHours > 0 || isFullDay) && (
              <p className={`font-semibold ${type === 'overtime' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {type === 'overtime' ? '₺' : '-₺'}
                {totalPayment.toFixed(2)} 
                <span className="font-medium text-sm">net</span>
              </p>
            )}
          </div>

          {/* Tam Gün İzinli Checkbox (Sadece İzin tipinde) */}
          {type === 'leave' && (
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-orange-800 dark:text-orange-200">Tam Gün İzinli</span>
                <span className="text-xs text-orange-600 dark:text-orange-400">1 günlük ({settings.dailyWorkingHours} saat) kesilir</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isFullDay}
                  onChange={(e) => {
                    setIsFullDay(e.target.checked);
                    if (e.target.checked) {
                      const dailyHours = settings.dailyWorkingHours;
                      setHours(Math.floor(dailyHours));
                      setMinutes((dailyHours % 1) * 60);
                    } else {
                      setHours(0);
                      setMinutes(0);
                    }
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
              </label>
            </div>
          )}

          {/* Time Adjusters */}
          <div className={`space-y-3 transition-opacity ${isFullDay ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-700 dark:text-gray-200">Saat</span>
              <div className="flex items-center gap-3">
                <button onClick={() => adjustHours(-1)} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"><Minus className="w-4 h-4 dark:text-white" /></button>
                <span className="text-xl font-bold w-12 text-center dark:text-white">{hours}</span>
                <button onClick={() => adjustHours(1)} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"><Plus className="w-4 h-4 dark:text-white" /></button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-700 dark:text-gray-200">Dakika</span>
              <div className="flex items-center gap-3">
                <button onClick={() => adjustMinutes(-15)} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"><Minus className="w-4 h-4 dark:text-white" /></button>
                <span className="text-xl font-bold w-12 text-center dark:text-white">{minutes}</span>
                <button onClick={() => adjustMinutes(15)} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"><Plus className="w-4 h-4 dark:text-white" /></button>
              </div>
            </div>
          </div>

          {/* Note Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {!showNoteSection ? (
              <button onClick={() => setShowNoteSection(true)} className="w-full flex items-center gap-2 text-blue-600 dark:text-blue-400 p-2 rounded-lg active:bg-blue-50 dark:active:bg-blue-900/50">
                <Edit3 className="w-4 h-4" />
                <span>{note.trim() ? 'Notu Düzenle' : 'Not Ekle'}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  ref={noteInputRef}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Mesai açıklaması (proje, görev, vb.)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none min-h-[100px]"
                  maxLength={200}
                  rows={4}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right">{note.length}/200</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 dark:border-gray-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {existingEntryForCurrentType && (
            <button onClick={handleDelete} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium active:bg-red-600">
              Sil
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-lg font-medium bg-blue-500 text-white active:bg-blue-600 disabled:bg-gray-300"
          >
            {existingEntryForCurrentType ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
});

OvertimeModal.displayName = 'OvertimeModal';
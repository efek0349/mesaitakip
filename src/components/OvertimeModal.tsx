import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, Clock, Edit3 } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { formatTurkishDate, calculateEffectiveHours } from '../utils/dateUtils';
import { getHolidayColorClass } from '../utils/holidayUtils';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
}

export const OvertimeModal: React.FC<OvertimeModalProps> = React.memo(({ isOpen, onClose, selectedDate }) => {
  const { addOvertimeEntry, removeOvertimeEntry, getOvertimeForDate } = useOvertimeData();
  const { getOvertimeRate, settings } = useSalarySettings();
  const { getHoliday } = useHolidays();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [note, setNote] = useState('');
  const [showNoteSection, setShowNoteSection] = useState(false);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const existingEntry = selectedDate ? getOvertimeForDate(selectedDate) : null;

  useEffect(() => {
    if (isOpen) {
      if (existingEntry) {
        setHours(existingEntry.hours);
        setMinutes(existingEntry.minutes);
        const noteText = existingEntry.note || '';
        setNote(noteText);
        setShowNoteSection(!!noteText.trim());
      } else {
        setHours(0);
        setMinutes(0);
        setNote('');
        setShowNoteSection(false);
      }
    }
  }, [isOpen, existingEntry]);

  useEffect(() => {
    if (showNoteSection) {
      const timer = setTimeout(() => {
        noteInputRef.current?.focus();
        noteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showNoteSection]);

  const handleSave = () => {
    if (selectedDate) {
      if (hours > 0 || minutes > 0) {
        addOvertimeEntry(selectedDate, hours, minutes, note.trim());
      } else if (existingEntry) {
        removeOvertimeEntry(selectedDate);
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (selectedDate && existingEntry) {
      removeOvertimeEntry(selectedDate);
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

  if (!isOpen || !selectedDate) {
    return null;
  }

  const totalHours = hours + minutes / 60;
  const formattedDate = formatTurkishDate(selectedDate);
  const holiday = getHoliday(selectedDate);
  const overtimeRate = getOvertimeRate(selectedDate, !!holiday);
  
  const effectiveHours = calculateEffectiveHours(totalHours, settings.deductBreakTime);
  const totalPayment = effectiveHours * overtimeRate;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 h-screen-dynamic hardware-accelerated">
      <div className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            {existingEntry ? 'Mesai Düzenle' : 'Mesai Ekle'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-600">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date & Payment Info */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-base text-gray-700 dark:text-gray-200 font-medium">{formattedDate}</span>
              {holiday && (
                <div className={`text-xs px-2 py-1 rounded-full ${getHolidayColorClass(holiday)} dark:bg-opacity-30`}>
                  {holiday.shortName}
                </div>
              )}
            </div>
            {totalHours > 0 && (
              <p className="font-semibold text-green-600 dark:text-green-400">
                ₺{totalPayment.toFixed(2)} <span className="font-medium text-sm">net</span>
              </p>
            )}
          </div>

          {/* Time Adjusters */}
          <div className="space-y-3">
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
        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 dark:border-gray-700 p-4">
          {existingEntry && (
            <button onClick={handleDelete} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium active:bg-red-600">
              Sil
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-lg font-medium bg-blue-500 text-white active:bg-blue-600 disabled:bg-gray-300"
          >
            {existingEntry ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
});

OvertimeModal.displayName = 'OvertimeModal';
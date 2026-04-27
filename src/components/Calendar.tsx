import React from 'react';
import { ChevronLeft, ChevronRight, FileText, Sun, Moon } from 'lucide-react';
import { TURKISH_MONTHS, TURKISH_DAYS, getCalendarDays, formatHours, calculateEffectiveHours } from '../utils/dateUtils';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useHolidays } from '../hooks/useHolidays';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { getHolidayColorClass } from '../utils/holidayUtils';
import { Holiday } from '../types/overtime';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
}

// Vardiya hesaplama fonksiyonu - Optimize edildi (Parse işlemi dışarıda yapılmalı)
const getShiftType = (date: Date, normalizedStartDate: Date, initialType: 'day' | 'night' | 'morning' | 'afternoon', systemType: '2-shift' | '3-shift' = '2-shift') => {
  const dateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffInTime = dateObj.getTime() - normalizedStartDate.getTime();
  const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24)); // Round daha güvenli
  const diffInWeeks = Math.floor(diffInDays / 7);
  
  if (systemType === '3-shift') {
    const sequence: ('morning' | 'afternoon' | 'night')[] = ['morning', 'afternoon', 'night'];
    let startIndex = 0;
    if (initialType === 'afternoon') startIndex = 1;
    if (initialType === 'night') startIndex = 2;
    
    const currentIndex = (startIndex + (diffInWeeks % 3) + 3) % 3;
    return sequence[currentIndex];
  } else {
    const isOpposite = Math.abs(diffInWeeks) % 2 === 1;
    if (initialType === 'day' || initialType === 'morning') {
      return isOpposite ? 'night' : 'day';
    } else {
      return isOpposite ? 'day' : 'night';
    }
  }
};

// Memoized CalendarDay component for better performance
const CalendarDay = React.memo(({ 
  date, 
  overtimeEntries, 
  isInCurrentMonth, 
  isTodayDate, 
  holiday, 
  isHolidayDate, 
  isSaturday, 
  isSunday,
  onClick,
  deductBreakTime,
  isSaturdayWork,
  dailyWorkingHours,
  shiftSettings
}: { 
  date: Date;
  overtimeEntries: any[];
  isInCurrentMonth: boolean;
  isTodayDate: boolean;
  holiday: Holiday | undefined;
  isHolidayDate: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  onClick: (date: Date) => void;
  deductBreakTime: boolean;
  isSaturdayWork: boolean;
  dailyWorkingHours: number;
  shiftSettings: {
    enabled: boolean;
    systemType: '2-shift' | '3-shift';
    normalizedStartDate: Date | null;
    initialType: 'day' | 'night' | 'morning' | 'afternoon';
  };
}) => {
  const overtimeEntry = overtimeEntries.find(e => e.type === 'overtime');
  const leaveEntry = overtimeEntries.find(e => e.type === 'leave');
  
  const hasNote = overtimeEntries.some(e => e.note && e.note.trim().length > 0);
  
  const getDisplayedHours = (entry: any) => {
    if (!entry) return 0;
    if (entry.type === 'leave') {
      if (entry.isFullDay) {
        return dailyWorkingHours;
      }
      return entry.totalHours;
    }
    return calculateEffectiveHours(entry.totalHours, deductBreakTime, isSaturday, isSunday, isHolidayDate, isSaturdayWork);
  };

  const shiftType = React.useMemo(() => {
    if (!shiftSettings.enabled || !shiftSettings.normalizedStartDate) return null;
    return getShiftType(date, shiftSettings.normalizedStartDate, shiftSettings.initialType, shiftSettings.systemType);
  }, [date, shiftSettings.enabled, shiftSettings.normalizedStartDate, shiftSettings.initialType, shiftSettings.systemType]);

  return (
    <div
      onClick={() => isInCurrentMonth && onClick(date)}
      className={`
        aspect-square flex flex-col items-center justify-center p-1 rounded-lg text-sm relative
        transition-all duration-200 cursor-pointer touch-manipulation min-h-[3rem]
        border hardware-accelerated
        ${isInCurrentMonth 
          ? 'active:bg-blue-50 dark:active:bg-gray-600 active:scale-95 border-gray-200 dark:border-gray-700' 
          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed border-transparent'
        }
        ${!isTodayDate && isHolidayDate && isInCurrentMonth
          ? getHolidayColorClass(holiday!) + ' dark:bg-opacity-30'
          : !isTodayDate && !isHolidayDate && isSaturday && isInCurrentMonth
          ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800/50'
          : !isTodayDate && !isHolidayDate && isSunday && isInCurrentMonth
          ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800/50'
          : !isTodayDate && !isHolidayDate && isInCurrentMonth
          ? 'bg-white text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-200 dark:border-gray-700'
          : ''
        }
        ${isTodayDate 
          ? 'bg-blue-500 text-white font-bold ring-2 ring-blue-300 ring-offset-1 dark:ring-offset-gray-800 border-transparent' 
          : ''
        }
        ${leaveEntry && isInCurrentMonth && !isTodayDate ? 'ring-1 ring-orange-400 dark:ring-orange-500 ring-inset' : ''}
        ${(shiftType === 'day' || shiftType === 'morning') && isInCurrentMonth && !isTodayDate ? 'border-t-2 border-t-orange-400' : ''}
        ${shiftType === 'afternoon' && isInCurrentMonth && !isTodayDate ? 'border-t-2 border-t-yellow-400' : ''}
        ${shiftType === 'night' && isInCurrentMonth && !isTodayDate ? 'border-t-2 border-t-indigo-400' : ''}
      `}
    >
      <span className={`text-sm font-medium ${isTodayDate ? 'text-white' : 'dark:text-gray-200'}`}>
        {date.getDate()}
      </span>
      
      {/* Vardiya İkonu */}
      {shiftType && isInCurrentMonth && (
        <div className={`absolute bottom-0 left-0 p-0.5 ${
          isTodayDate ? 'text-white/70' : (shiftType === 'day' || shiftType === 'morning') ? 'text-orange-500' : shiftType === 'afternoon' ? 'text-yellow-500' : 'text-indigo-500'
        }`}>
          {shiftType === 'day' || shiftType === 'morning' ? (
            <Sun size={10} strokeWidth={3} />
          ) : shiftType === 'afternoon' ? (
            <div className="flex items-center">
              <Sun size={8} strokeWidth={3} />
              <Moon size={8} strokeWidth={3} className="-ml-1" />
            </div>
          ) : (
            <Moon size={10} strokeWidth={3} />
          )}
        </div>
      )}

      {/* Tatil etiketi */}
      {holiday && isInCurrentMonth && (
        <div className={`absolute top-0 left-0 text-xs px-1 rounded-br font-medium ${
          isTodayDate 
            ? 'bg-white/90 text-blue-600' 
            : holiday.type === 'religious'
            ? 'bg-white/90 text-green-700'
            : 'bg-white/90 text-red-700'
        }`}>
          {holiday.shortName}
        </div>
      )}
      
      {/* Not işareti */}
      {hasNote && isInCurrentMonth && (
        <div className={`absolute top-0 right-0 ${
          isTodayDate 
            ? 'text-white/90' 
            : isHolidayDate
            ? 'text-gray-600 dark:text-gray-400'
            : isSaturday
            ? 'text-orange-600 dark:text-orange-400'
            : isSunday
            ? 'text-purple-600 dark:text-purple-400'
            : 'text-blue-600 dark:text-blue-400'
        }`}>
          <FileText className="w-3 h-3" />
        </div>
      )}
      
      {/* Mesai/İzin etiketleri */}
      <div className="absolute bottom-0 right-0 flex flex-col items-end pointer-events-none">
        {overtimeEntry && isInCurrentMonth && (
          <div className={`text-[9px] leading-tight px-1 rounded-tl font-bold shadow-sm ${
            isTodayDate 
              ? 'bg-white/90 text-blue-600' 
              : isHolidayDate
              ? 'bg-white/90 text-gray-800'
              : isSaturday
              ? 'bg-orange-200 text-orange-800 dark:bg-orange-400/30 dark:text-orange-200'
              : isSunday
              ? 'bg-purple-200 text-purple-800 dark:bg-purple-400/30 dark:text-purple-200'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-400/30 dark:text-blue-200'
          }`}>
            {formatHours(getDisplayedHours(overtimeEntry))}
          </div>
        )}
        {leaveEntry && isInCurrentMonth && (
          <div className={`text-[9px] leading-tight px-1 rounded-tl font-bold shadow-sm ${
            isTodayDate 
              ? 'bg-white/90 text-orange-600' 
              : 'bg-orange-500 text-white'
          }`}>
            İ:{formatHours(getDisplayedHours(leaveEntry))}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison to prevent re-renders unless data actually changed
  return prev.isTodayDate === next.isTodayDate &&
         prev.isInCurrentMonth === next.isInCurrentMonth &&
         prev.isHolidayDate === next.isHolidayDate &&
         prev.isSaturday === next.isSaturday &&
         prev.isSunday === next.isSunday &&
         prev.deductBreakTime === next.deductBreakTime &&
         prev.isSaturdayWork === next.isSaturdayWork &&
         prev.dailyWorkingHours === next.dailyWorkingHours &&
         prev.date.getTime() === next.date.getTime() &&
         prev.overtimeEntries.length === next.overtimeEntries.length &&
         prev.holiday?.name === next.holiday?.name &&
         JSON.stringify(prev.shiftSettings) === JSON.stringify(next.shiftSettings) &&
         // Deep check for overtime entries content
         prev.overtimeEntries.every((e, i) => 
           e.id === next.overtimeEntries[i].id && 
           e.totalHours === next.overtimeEntries[i].totalHours &&
           e.note === next.overtimeEntries[i].note
         );
});

CalendarDay.displayName = 'CalendarDay';

export const Calendar: React.FC<CalendarProps> = React.memo(({ currentDate, onDateChange, onDateClick }) => {
  const { getEntriesForDate, isLoaded } = useOvertimeData();
  const { getHoliday } = useHolidays();
  const { settings } = useSalarySettings(); // Get settings
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = React.useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }, []); 
  
  // Swipe navigation state
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  // Min swipe distance (in pixels)
  const minSwipeDistance = 50;

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = React.useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = React.useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      const newDate = new Date(year, month + 1, 1);
      onDateChange(newDate);
    } else if (isRightSwipe) {
      const newDate = new Date(year, month - 1, 1);
      onDateChange(newDate);
    }
  }, [touchStart, touchEnd, year, month, onDateChange]);

  const goToPreviousMonth = React.useCallback(() => {
    const newDate = new Date(year, month - 1, 1);
    onDateChange(newDate);
  }, [year, month, onDateChange]);
  
  const goToNextMonth = React.useCallback(() => {
    const newDate = new Date(year, month + 1, 1);
    onDateChange(newDate);
  }, [year, month, onDateChange]);

  // Vardiya başlangıç tarihini bir kez hesapla (O(1) vs O(42))
  const normalizedShiftStartDate = React.useMemo(() => {
    if (!settings.shiftSystemEnabled || !settings.shiftStartDate) return null;
    const startParts = settings.shiftStartDate.split('-').map(Number);
    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const startDay = startDate.getDay();
    const diffToMonday = startDay === 0 ? -6 : 1 - startDay;
    const normalized = new Date(startDate);
    normalized.setDate(startDate.getDate() + diffToMonday);
    return normalized;
  }, [settings.shiftSystemEnabled, settings.shiftStartDate]);

  // Memoize calendar days calculation with proper dependency tracking
  const calendarDays = React.useMemo(() => getCalendarDays(year, month), [year, month]);
  
  // Memoize holiday and overtime data for better performance
  const memoizedData = React.useMemo(() => {
    return calendarDays.map(date => ({
      date,
      overtimeEntries: getEntriesForDate(date),
      isInCurrentMonth: date.getMonth() === month,
      isTodayDate: date.getTime() === today,
      isSaturday: date.getDay() === 6,
      isSunday: date.getDay() === 0,
      holiday: getHoliday(date),
    }));
  }, [calendarDays, month, today, getEntriesForDate, getHoliday]);
  
  // Conditionally filter calendar days based on showNextMonthDays setting
  const filteredCalendarDays = React.useMemo(() => {
    let baseData = memoizedData;
    if (!settings.showNextMonthDays) {
      const sixthRow = memoizedData.slice(35, 42);
      const isSixthRowAllNextMonth = sixthRow.length > 0 && sixthRow.every(day => !day.isInCurrentMonth);
      if (isSixthRowAllNextMonth) {
        baseData = memoizedData.slice(0, 35);
      }
    }
    return baseData;
  }, [memoizedData, settings.showNextMonthDays]);

  // Show loading state if data is not loaded yet
  if (!isLoaded) {
    return (
      <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        
        {/* Days of Week Skeleton */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded py-1"></div>
          ))}
        </div>

        {/* Calendar Grid Skeleton */}
        <div className="grid grid-cols-7 gap-1 mt-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleDateClick = (date: Date) => {
    if (date.getMonth() === month) {
      onDateClick(date);
    }
  };

  return (
    <div 
      className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4 touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
          aria-label="Önceki ay"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
          {TURKISH_MONTHS[month]} {year}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
          aria-label="Sonraki ay"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      
      {/* Calendar grid with headers */}
      <div className="grid grid-cols-7 gap-1">
        {TURKISH_DAYS.map((day, index) => {
          const isWeekend = index === 5 || index === 6; // Cumartesi (5) ve Pazar (6)
          return (
            <div
              key={`day-${index}`}
              className={`
                text-center text-xs font-semibold py-1 rounded-md
                ${isWeekend 
                  ? (index === 5 
                      ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/50 dark:text-orange-300' 
                      : 'text-purple-600 bg-purple-50 dark:bg-purple-900/50 dark:text-purple-300')
                  : 'text-gray-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-200'
                }
              `}
            >
              {day}
            </div>
          );
        })}

        {filteredCalendarDays.map(({ 
          date, 
          overtimeEntries, 
          isInCurrentMonth, 
          isTodayDate, 
          isSaturday, 
          isSunday, 
          holiday 
        }) => {
          const isHolidayDate = holiday !== undefined;
          const uniqueKey = `${date.getTime()}-${overtimeEntries.map(e => e.id).join('-') || 'no-entry'}`;
          
          return (
            <CalendarDay
              key={uniqueKey}
              date={date}
              overtimeEntries={overtimeEntries}
              isInCurrentMonth={isInCurrentMonth}
              isTodayDate={isTodayDate}
              holiday={holiday}
              isHolidayDate={isHolidayDate}
              isSaturday={isSaturday}
              isSunday={isSunday}
              onClick={handleDateClick}
              deductBreakTime={settings.deductBreakTime}
              isSaturdayWork={settings.isSaturdayWork}
              dailyWorkingHours={settings.dailyWorkingHours}
              shiftSettings={{
                enabled: settings.shiftSystemEnabled,
                systemType: settings.shiftSystemType || '2-shift',
                normalizedStartDate: normalizedShiftStartDate,
                initialType: settings.shiftInitialType
              }}
            />
          );
        })}
      </div>
    </div>
  );
});
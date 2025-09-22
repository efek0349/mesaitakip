import React, { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { TURKISH_MONTHS, TURKISH_DAYS, getCalendarDays, formatHours } from '../utils/dateUtils';
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

// Define types for our data
// interface CalendarDayData {
//   date: Date;
//   overtimeEntry: any; // We'll keep this as any for now since it's from the hook
//   isInCurrentMonth: boolean;
//   isTodayDate: boolean;
//   isSaturday: boolean;
//   isSunday: boolean;
//   holiday: Holiday | undefined;
// }

// Memoized CalendarDay component for better performance
const CalendarDay = memo(({ 
  date, 
  overtimeEntry, 
  isInCurrentMonth, 
  isTodayDate, 
  holiday, 
  isHolidayDate, 
  isSaturday, 
  isSunday,
  onClick 
}: {
  date: Date;
  overtimeEntry: any;
  isInCurrentMonth: boolean;
  isTodayDate: boolean;
  holiday: Holiday | undefined;
  isHolidayDate: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  onClick: (date: Date) => void;
}) => {
  const hasNote = overtimeEntry?.note && overtimeEntry.note.trim().length > 0;
  
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
          ? getHolidayColorClass(holiday) + ' dark:bg-opacity-30' // Holiday colors already have dark mode variants
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
      `}
    >
      <span className={`text-sm font-medium ${isTodayDate ? 'text-white' : 'dark:text-gray-200'}`}>
        {date.getDate()}
      </span>
      
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
      
      {/* Mesai etiketi */}
      {overtimeEntry && isInCurrentMonth && (
        <div className={`absolute bottom-0 right-0 text-xs px-1 rounded-tl font-medium ${
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
          {formatHours(overtimeEntry.totalHours)}
        </div>
      )}
    </div>
  );
});

CalendarDay.displayName = 'CalendarDay';

export const Calendar: React.FC<CalendarProps> = memo(({ currentDate, onDateChange, onDateClick }) => {
  const { getOvertimeForDate, isLoaded } = useOvertimeData();
  const { getHoliday } = useHolidays();
  const { settings } = useSalarySettings(); // Get settings
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = useMemo(() => new Date(), []); // Memoize today to prevent re-creation on every render
  
  // Memoize calendar days calculation with proper dependency tracking
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  
  // Memoize holiday and overtime data for better performance
  const memoizedData = useMemo(() => {
    return calendarDays.map(date => ({
      date,
      overtimeEntry: getOvertimeForDate(date),
      isInCurrentMonth: date.getMonth() === month,
      isTodayDate: date.toDateString() === today.toDateString(),
      isSaturday: date.getDay() === 6,
      isSunday: date.getDay() === 0,
      holiday: getHoliday(date),
    }));
  }, [calendarDays, month, today, getOvertimeForDate, getHoliday]);
  
  // Conditionally filter calendar days based on showNextMonthDays setting
  const filteredCalendarDays = useMemo(() => {
    if (settings.showNextMonthDays) {
      return memoizedData;
    } else {
      // Check if the 6th row (indices 35 to 41) exists and contains only next month's days
      const sixthRow = memoizedData.slice(35, 42);
      const isSixthRowAllNextMonth = sixthRow.length > 0 && sixthRow.every(day => !day.isInCurrentMonth);

      if (isSixthRowAllNextMonth) {
        return memoizedData.slice(0, 35); // Return only the first 5 rows
      } else {
        return memoizedData; // Keep all days if 6th row has current month days or is empty
      }
    }
  }, [memoizedData, settings.showNextMonthDays]);

  // Show loading state if data is not loaded yet
  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-2 mb-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="w-24 h-6 bg-gray-200 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
        
        {/* Days of Week Skeleton */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded py-1"></div>
          ))}
        </div>

        {/* Calendar Grid Skeleton */}
        <div className="grid grid-cols-7 gap-1 mt-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    onDateChange(newDate);
  };
  
  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    onDateChange(newDate);
  };
  
  const handleDateClick = (date: Date) => {
    if (date.getMonth() === month) {
      onDateClick(date);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4">
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
          overtimeEntry, 
          isInCurrentMonth, 
          isTodayDate, 
          isSaturday, 
          isSunday, 
          holiday 
        }) => {
          const isHolidayDate = holiday !== undefined;
          const uniqueKey = `${date.getTime()}-${overtimeEntry?.id || 'no-entry'}`;
          
          return (
            <CalendarDay
              key={uniqueKey}
              date={date}
              overtimeEntry={overtimeEntry}
              isInCurrentMonth={isInCurrentMonth}
              isTodayDate={isTodayDate}
              holiday={holiday}
              isHolidayDate={isHolidayDate}
              isSaturday={isSaturday}
              isSunday={isSunday}
              onClick={handleDateClick}
            />
          );
        })}
      </div>
    </div>
  );
});
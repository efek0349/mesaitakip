import React from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { TURKISH_MONTHS, TURKISH_DAYS, getCalendarDays, formatHours } from '../utils/dateUtils';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useHolidays } from '../hooks/useHolidays';
import { getHolidayColorClass } from '../utils/holidayUtils';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ currentDate, onDateChange, onDateClick }) => {
  const { getOvertimeForDate, isLoaded } = useOvertimeData();
  const { getHoliday } = useHolidays();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  
  const calendarDays = getCalendarDays(year, month);
  
  // Show loading state if data is not loaded yet
  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Veriler yükleniyor...</div>
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
  
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };
  
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };
  
  const handleDateClick = (date: Date) => {
    if (isCurrentMonth(date)) {
      onDateClick(date);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-3 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h2 className="text-xl font-bold text-gray-800">
          {TURKISH_MONTHS[month]} {year}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-3 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {TURKISH_DAYS.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-semibold text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const overtimeEntry = getOvertimeForDate(date);
          const isInCurrentMonth = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          const dayOfWeek = date.getDay();
          const isSaturday = dayOfWeek === 6;
          const isSunday = dayOfWeek === 0;
          const holiday = getHoliday(date);
          const isHolidayDate = holiday !== undefined;
          const hasNote = overtimeEntry?.note && overtimeEntry.note.trim().length > 0;
          
          // Use date timestamp as unique key
          const uniqueKey = `${date.getTime()}-${overtimeEntry?.id || 'no-entry'}`;
          
          return (
            <div
              key={uniqueKey}
              onClick={() => handleDateClick(date)}
              className={`
                aspect-square flex flex-col items-center justify-center p-1 rounded-lg text-sm relative
                transition-all duration-200 cursor-pointer touch-manipulation min-h-[3rem]
                ${isInCurrentMonth 
                  ? 'active:bg-blue-50 active:scale-95' 
                  : 'text-gray-300 cursor-not-allowed'
                }
                ${!isTodayDate && isHolidayDate && isInCurrentMonth
                  ? getHolidayColorClass(holiday)
                  : !isTodayDate && !isHolidayDate && isSaturday && isInCurrentMonth
                  ? 'bg-orange-100 text-orange-700'
                  : !isTodayDate && !isHolidayDate && isSunday && isInCurrentMonth
                  ? 'bg-purple-100 text-purple-700'
                  : ''
                }
                ${isTodayDate 
                  ? 'bg-blue-500 text-white font-bold ring-2 ring-blue-300 ring-offset-1' 
                  : ''
                }
              `}
            >
              <span className={`text-sm font-medium ${isTodayDate ? 'text-white' : ''}`}>
                {date.getDate()}
              </span>
              
              {/* Tatil etiketi */}
              {holiday && isInCurrentMonth && (
                <div className={`absolute top-0 left-0 text-xs px-1 rounded-br font-medium ${
                  isTodayDate 
                    ? 'bg-white/90 text-blue-600' 
                    : holiday.type === 'religious'
                    ? 'bg-white text-green-700'
                    : 'bg-white text-red-700'
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
                    ? 'text-gray-600'
                    : isSaturday
                    ? 'text-orange-600'
                    : isSunday
                    ? 'text-purple-600'
                    : 'text-blue-600'
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
                    ? 'bg-white/95 text-gray-800'
                    : isSaturday
                    ? 'bg-orange-200 text-orange-800'
                    : isSunday
                    ? 'bg-purple-200 text-purple-800'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {formatHours(overtimeEntry.totalHours)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
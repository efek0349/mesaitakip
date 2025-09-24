import { isHoliday } from '../utils/holidayUtils';

export const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const TURKISH_MONTH_ABBR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

export const TURKISH_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const TURKISH_DAY_NAMES = [
  'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar'
];

export const TURKISH_DAY_ABBR = [
  'Pzt', 'Sal', 'Çar', 'Prş', 'Cum', 'Cmt', 'Paz'
];

export const formatTurkishDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = TURKISH_MONTHS[date.getMonth()].toLowerCase();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const formatTurkishDateWithDay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = TURKISH_MONTH_ABBR[date.getMonth()].toLowerCase();
  const year = date.getFullYear();
  const dayName = TURKISH_DAY_ABBR[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Convert Sunday=0 to Saturday=6
  return `${day} ${month} ${year} ${dayName}`;
};

export const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

export const getCalendarDays = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Make Monday = 0
  
  const days: Date[] = [];
  
  // Add empty days at the beginning
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(new Date(year, month, 1 - firstDayOfWeek + i));
  }
  
  // Add days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }
  
  // Add empty days at the end to complete the grid
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
};

export const calculateEffectiveHours = (totalHours: number, deductBreakTime: boolean, isSaturday: boolean, isSunday: boolean, isHoliday: boolean, isSaturdayWork: boolean): number => {
  if (!deductBreakTime) {
    return totalHours;
  }

  const shouldDeduct = isSunday || isHoliday || (!isSaturdayWork && isSaturday);

  if (shouldDeduct) {
    if (totalHours > 7.5) {
      return Math.max(0, totalHours - 1); // 1 saat mola
    } else if (totalHours > 4) {
      return Math.max(0, totalHours - 0.5); // 30 dakika mola
    } else if (totalHours > 0) {
      return Math.max(0, totalHours - 0.25); // 15 dakika mola
    }
  }
  
  return totalHours;
};



export const formatHours = (totalHours: number): string => {
  if (totalHours === 0) return '0 s';
  
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  
  if (hours === 0) {
    return `${minutes} dk`;
  } else if (minutes === 0) {
    return `${hours} s`;
  } else {
    return `${hours}s ${minutes}dk`;
  }
};

export const generateExportText = (monthlyData: any, year: number, month: number, firstName: string = '', lastName: string = '', getHoliday?: (date: Date) => any, deductBreakTime: boolean = false, isSaturdayWork: boolean = false): string => {
  const monthKey = getMonthKey(new Date(year, month));
  const allDaysInMonth = getCalendarDays(year, month); // Get all days for the month
  const entriesMap = new Map(monthlyData[monthKey]?.map((entry: OvertimeEntry) => [entry.date, entry])); // Map entries for easy lookup

  let text = '';
  
  text += '='.repeat(25) + '\n';
  // İsim-soyisim varsa ekle
  if (firstName.trim() || lastName.trim()) {
    text += `${firstName.trim().toUpperCase()} ${lastName.trim().toUpperCase()}\n`;
  }
  
  text += `${TURKISH_MONTHS[month]} ${year} - Mesai Saatleri\n`;
  if (deductBreakTime) {
    text += '(4857 sayılı iş kanunu ara dinlenmesi fazla mesailere dahil degildir)\n';
  }
  text += '\n';
  
  let totalHours = 0;
  let normalHours = 0;
  let sundayHours = 0;
  let saturdayHours = 0; // Keep for potential internal use, but not for summary display
  let officialHolidayHours = 0;
  let religiousHolidayHours = 0;
  let holidayHours = 0;

  allDaysInMonth.forEach(date => {
    const dateKey = getDateKey(date);
    const entry = entriesMap.get(dateKey);
    
    const dayOfWeek = date.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const holiday = getHoliday ? getHoliday(date) : null;
    const isEntryHoliday = !!holiday;

    // Determine if this day should be included in the export
    // Only include if there's an actual overtime entry
    const shouldIncludeDay = (entry !== undefined);

    if (shouldIncludeDay) {
      const formattedDate = formatTurkishDateWithDay(date);
      
      const currentEntry = entry || { totalHours: 0, note: '' };

      // Mola kesintisi hesaplama
      const effectiveHours = calculateEffectiveHours(currentEntry.totalHours, deductBreakTime, isSaturday, isSunday, isEntryHoliday, isSaturdayWork);
      
      // Kesinti yapılıp yapılmadığını metinde göstermek için aynı koşulu burada da kullan
      const shouldDeductForText = isSunday || isEntryHoliday || (!isSaturdayWork && isSaturday);
      const wasDeducted = deductBreakTime && shouldDeductForText && currentEntry.totalHours > 0;

      let deductionText = '';
      if (wasDeducted) {
          if (currentEntry.totalHours > 7.5) {
              deductionText = '1s mola';
          } else if (currentEntry.totalHours > 4) {
              deductionText = '30dk mola';
          } else {
              deductionText = '15dk mola';
          }
      }

      const hoursText = `${formatHours(currentEntry.totalHours)}${wasDeducted ? ` (${deductionText})` : ''}`;
              
      // Gün tipini belirle
      if (holiday) {
        if (holiday.type === 'religious') {
          religiousHolidayHours += effectiveHours;
          holidayHours += effectiveHours;
        } else {
          officialHolidayHours += effectiveHours;
          holidayHours += effectiveHours;
        }
      } else if (isSunday) { // Pazar
        sundayHours += effectiveHours;
      } else if (isSaturday) { // Cumartesi
        if (isSaturdayWork) {
          normalHours += effectiveHours; // If Saturday is a working day, add to normal hours
        } else {
          saturdayHours += effectiveHours; // Otherwise, keep separate (not displayed in summary)
        }
      } else { // Haftaiçi
        normalHours += effectiveHours;
      }
      
      let lineText = `${formattedDate} - ${hoursText} mesai`;
      
      // Not varsa ekle
      if (currentEntry.note && currentEntry.note.trim()) {
        lineText += ` (${currentEntry.note.trim()})`;
      }
      
      text += lineText + '\n';
      totalHours += effectiveHours;
    }
  });
  
  text += '\n';
  text += `Toplam Mesai: ${formatHours(totalHours)}\n`;
  
  // Detaylı mesai dağılımı
  let displayNormalHours = normalHours;
  if (!isSaturdayWork && saturdayHours > 0) {
    displayNormalHours += saturdayHours; // Add Saturday hours to normal hours for display if not a working Saturday
  }

  if (displayNormalHours > 0) {
    text += `${formatHours(displayNormalHours)} haftaiçi mesaisi\n`;
  }
  if (sundayHours > 0) {
    text += `${formatHours(sundayHours)} pazar günü mesaisi\n`;
  }
  if (holidayHours > 0) {
    text += `${formatHours(holidayHours)} resmi & dini tatil mesaisi\n`;
  }
  
  text += '='.repeat(25);
  return text;
};
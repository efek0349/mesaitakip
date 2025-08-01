import { isHoliday } from '../utils/holidayUtils';

export const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const TURKISH_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const TURKISH_DAY_NAMES = [
  'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar'
];

export const formatTurkishDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = TURKISH_MONTHS[date.getMonth()].toLowerCase();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const formatTurkishDateWithDay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = TURKISH_MONTHS[date.getMonth()].toLowerCase();
  const year = date.getFullYear();
  const dayName = TURKISH_DAY_NAMES[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Convert Sunday=0 to Saturday=6
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

export const generateExportText = (monthlyData: any, year: number, month: number, firstName: string = '', lastName: string = '', getHoliday?: (date: Date) => any, deductBreakTime: boolean = false): string => {
  const monthKey = getMonthKey(new Date(year, month));
  const entries = monthlyData[monthKey] || [];
  
  if (entries.length === 0) {
    let text = '';
    text += '='.repeat(25) + '\n';
    if (firstName.trim() || lastName.trim()) {
      text += `${firstName.trim().toUpperCase()} ${lastName.trim().toUpperCase()}\n`;
    }
    text += `${TURKISH_MONTHS[month]} ${year} - Mesai Saatleri\n`;
    text += '\n';
    text += 'Mesai kaydı bulunmamaktadır.';
    text += '\n' + '='.repeat(25);
    return text;
  }
  
  let text = '';
  
  text += '='.repeat(25) + '\n';
  // İsim-soyisim varsa ekle
  if (firstName.trim() || lastName.trim()) {
    text += `${firstName.trim().toUpperCase()} ${lastName.trim().toUpperCase()}\n`;
  }
  
  text += `${TURKISH_MONTHS[month]} ${year} - Mesai Saatleri\n`;
  if (deductBreakTime) {
    text += '(8+ saat mesailerde 1 saat mola kesintisi uygulanmıştır)\n';
  }
  text += '\n';
  
  let totalHours = 0;
  let normalHours = 0;
  let sundayHours = 0;
  let officialHolidayHours = 0;
  let religiousHolidayHours = 0;
  let holidayHours = 0;
  
  entries.forEach((entry: any) => {
    const date = new Date(entry.date);
    const formattedDate = formatTurkishDateWithDay(date);
    
    // Mola kesintisi hesaplama
    let effectiveHours = entry.totalHours;
    if (deductBreakTime && entry.totalHours >= 8) {
      effectiveHours = Math.max(0, entry.totalHours - 1);
    }
    
    const hoursText = deductBreakTime && entry.totalHours >= 8 
      ? `${formatHours(effectiveHours)} (${formatHours(entry.totalHours)} - 1s mola)`
      : formatHours(entry.totalHours);
    
    // Gün tipini belirle
    const dayOfWeek = date.getDay();
    const holiday = getHoliday ? getHoliday(date) : null;
    
    if (holiday) {
      if (holiday.type === 'religious') {
        religiousHolidayHours += effectiveHours;
        holidayHours += effectiveHours;
      } else {
        officialHolidayHours += effectiveHours;
        holidayHours += effectiveHours;
      }
    } else if (dayOfWeek === 0) { // Pazar
      sundayHours += effectiveHours;
    } else if (dayOfWeek === 6) { // Cumartesi
      normalHours += effectiveHours;
    } else {
      normalHours += effectiveHours;
    }
    
    let lineText = `${formattedDate} - ${hoursText} mesai`;
    
    // Not varsa ekle
    if (entry.note && entry.note.trim()) {
      lineText += ` (${entry.note.trim()})`;
    }
    
    text += lineText + '\n';
    totalHours += effectiveHours;
  });
  
  text += '\n';
  text += `Toplam Mesai: ${formatHours(totalHours)}\n`;
  
  // Detaylı mesai dağılımı
  if (normalHours > 0) {
    text += `${formatHours(normalHours)} haftaiçi mesaisi\n`;
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
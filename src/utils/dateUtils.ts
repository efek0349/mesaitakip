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

const dateKeyCache = new Map<number, string>();

export const getDateKey = (date: Date): string => {
  const time = date.getTime();
  const cached = dateKeyCache.get(time);
  if (cached) return cached;

  const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  
  // Cache size limit to prevent memory leaks
  if (dateKeyCache.size > 1000) {
    const firstKey = dateKeyCache.keys().next().value;
    dateKeyCache.delete(firstKey);
  }
  
  dateKeyCache.set(time, key);
  return key;
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
      return Math.max(0, totalHours - 1); // 7.5 saat üzeri: 1 saat mola
    } else if (totalHours >= 4) {
      return Math.max(0, totalHours - 0.5); // 4-7.5 saat arası: 30 dakika mola
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

import { APP_VERSION } from '../components/AboutModal';

// Basit bir hash fonksiyonu (LOG_HASH için)
export const generateDynamicHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).toUpperCase().substring(0, 6);
};

export const generateExportText = (monthlyData: any, year: number, month: number, firstName: string = '', lastName: string = '', getHoliday?: (date: Date) => any, deductBreakTime: boolean = false, isSaturdayWork: boolean = false): string => {
  const monthKey = getMonthKey(new Date(year, month));
  const allDaysInMonth = getCalendarDays(year, month);
  const entriesMap = new Map(monthlyData[monthKey]?.map((entry: OvertimeEntry) => [entry.date, entry]));
  const appVersion = APP_VERSION;

  let text = `>>> MESAI_TAKIP_SYSTEM v${appVersion}\n`;
  const separator = '_'.repeat(40) + '\n';
  
  text += separator;
  text += ' [SYSTEM_LOG]\n';
  
  if (firstName.trim() || lastName.trim()) {
    text += ` [+] TARGET : ${firstName.trim().toUpperCase()} ${lastName.trim().toUpperCase()}\n`;
  }
  
  text += ` [+] PERIOD : ${TURKISH_MONTHS[month]} ${year}\n`;
  if (deductBreakTime) {
    text += ' [!] MODULE : 4857_PROTOCOL (NO_BREAKS)\n';
  }
  text += separator;
  text += ' [DATA_ENTRIES]\n';

  let totalNetHours = 0;
  let totalGrossHours = 0;
  let normalHours = 0;
  let sundayHours = 0;
  let saturdayHours = 0;
  let officialHolidayHours = 0;
  let religiousHolidayHours = 0;
  
  let entryIndex = 0;

  allDaysInMonth.forEach(date => {
    const dateKey = getDateKey(date);
    const entry = entriesMap.get(dateKey);
    
    if (entry?.type === 'leave' || entry === undefined) return;

    entryIndex++;
    const dayOfWeek = date.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const holiday = getHoliday ? getHoliday(date) : null;
    const isEntryHoliday = !!holiday;

    const formattedDate = formatTurkishDateWithDay(date);
    const currentEntry = entry;

    const effectiveHours = calculateEffectiveHours(currentEntry.totalHours, deductBreakTime, isSaturday, isSunday, isEntryHoliday, isSaturdayWork);
    
    const shouldDeductForText = isSunday || isEntryHoliday || (!isSaturdayWork && isSaturday);
    const wasDeducted = deductBreakTime && shouldDeductForText && currentEntry.totalHours >= 4;

    let statusText = 'OK';
    if (wasDeducted) {
        if (currentEntry.totalHours > 7.5) {
            statusText = '1s_MOLA';
        } else if (currentEntry.totalHours >= 4) {
            statusText = '30dk_MOLA';
        }
    }

    const hexIndex = `0x${entryIndex.toString(16).padStart(2, '0').toUpperCase()}`;
    const hoursText = formatHours(currentEntry.totalHours);
            
    if (holiday) {
      if (holiday.type === 'religious') {
        religiousHolidayHours += effectiveHours;
      } else {
        officialHolidayHours += effectiveHours;
      }
    } else if (isSunday) {
      sundayHours += effectiveHours;
    } else if (isSaturday) {
      if (isSaturdayWork) {
        normalHours += effectiveHours;
      } else {
        saturdayHours += effectiveHours;
      }
    } else {
      normalHours += effectiveHours;
    }
    
    let lineText = ` [${hexIndex}] ${formattedDate} | ${hoursText} mesai [${statusText}]`;
    if (currentEntry.note && currentEntry.note.trim()) {
      lineText += ` (${currentEntry.note.trim()})`;
    }
    
    text += lineText + '\n';
    totalNetHours += effectiveHours;
    totalGrossHours += currentEntry.totalHours;
  });
  
  const totalDeductionHours = totalGrossHours - totalNetHours;
  const formatSa = (h: number) => formatHours(h).replace(' s', ' sa');
  const formatSaat = (h: number) => formatHours(h).replace(' s', ' sa');

  text += separator;
  text += ' [STATISTICS_ANALYSIS]\n';
  
  if (deductBreakTime) {
    text += ` [*] TOPLAM_BRUT_MESAI : ${formatSa(totalGrossHours)}\n`;
    text += ` [*] TOPLAM_MOLA       : ${formatSa(totalDeductionHours)}\n`;
    text += ` [*] TOPLAM_NET_MESAI  : ${formatSa(totalNetHours)}\n`;
  } else {
    text += ` [*] TOPLAM_NET_MESAI  : ${formatSa(totalNetHours)}\n`;
  }
  
  text += separator;
  text += ' [LOAD_DISTRIBUTION]\n';
  
  let displayNormalHours = normalHours;
  if (!isSaturdayWork && saturdayHours > 0) {
    displayNormalHours += saturdayHours;
  }

  if (displayNormalHours > 0) {
    text += ` - HAFTAICI_PAYLOAD    : ${formatSaat(displayNormalHours)}\n`;
  }
  if (sundayHours > 0) {
    text += ` - PAZAR_GUNU_PAYLOAD  : ${formatSaat(sundayHours)}\n`;
  }
  if (religiousHolidayHours > 0) {
    text += ` - DINI_BAYRAM_PAYLOAD : ${formatSaat(religiousHolidayHours)}\n`;
  }
  if (officialHolidayHours > 0) {
    text += ` - RESMI_TATIL_PAYLOAD : ${formatSaat(officialHolidayHours)}\n`;
  }
  
  text += separator;
  text += ' [!] STATUS: SUCCESSFUL_ENFILTRATION\n';
  text += ` [!] LOG_HASH: ${generateDynamicHash(text)}`;
  
  return text;
};
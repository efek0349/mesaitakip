import { isHoliday } from '../utils/holidayUtils';
import { OvertimeEntry } from '../types/overtime';

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
  'Paz', 'Pzt', 'Sal', 'Çar', 'Prş', 'Cum', 'Cmt'
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
  const dayName = TURKISH_DAY_ABBR[date.getDay()]; // Direct mapping: 0=Paz, 1=Pzt...
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

export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Ay 0-tabanlı olduğu için month - 1 yapıyoruz. 
  // Bu yöntem tarih nesnesini cihazın yerel saatine göre "gece yarısı" olarak oluşturur.
  return new Date(year, month - 1, day);
};

export const calculateEffectiveHours = (totalHours: number, deductBreakTime: boolean, isSaturday: boolean, isSunday: boolean, isHoliday: boolean, isSaturdayWork: boolean): number => {
  if (!deductBreakTime) {
    return totalHours;
  }

  const shouldDeduct = isSunday || isHoliday || (!isSaturdayWork && isSaturday);

  if (shouldDeduct) {
    if (totalHours > 7.5) {
      // 7.5 saat üzeri: 1 saat mola. 
      // Math.max(7.0, ...) sayesinde 7.6 saat çalışan, 7.5 saat çalışandan (7.0 net) daha az almaz.
      return Math.max(7.0, totalHours - 1);
    } else if (totalHours >= 4) {
      // 4-7.5 saat arası: 30 dakika mola.
      // Math.max(3.5, ...) sayesinde 4.1 saat çalışan, 4.0 saat çalışandan (3.5 net) daha az almaz.
      return Math.max(3.5, totalHours - 0.5);
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

// Vardiya hesaplama fonksiyonu
export const getShiftType = (date: Date, normalizedStartDate: Date, initialType: 'day' | 'night' | 'morning' | 'afternoon', systemType: '2-shift' | '3-shift' = '2-shift') => {
  const dateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffInTime = dateObj.getTime() - normalizedStartDate.getTime();
  const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24));
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

export const getNormalizedShiftStartDate = (shiftStartDate: string) => {
  const startParts = shiftStartDate.split('-').map(Number);
  const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const startDay = startDate.getDay();
  const diffToMonday = startDay === 0 ? -6 : 1 - startDay;
  const normalized = new Date(startDate);
  normalized.setDate(startDate.getDate() + diffToMonday);
  return normalized;
};

// Bir tarihin ait olduğu haftanın günlerini getir (Pazartesi - Cumartesi)
export const getWeekWorkDays = (targetDate: Date): Date[] => {
  const date = new Date(targetDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  
  const weekDays: Date[] = [];
  for (let i = 0; i < 6; i++) { // Pazartesi'den Cumartesi'ye (6 gün)
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d);
  }
  return weekDays;
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

export const calculateMonthlyAllowances = (
  year: number,
  month: number,
  monthlyData: any,
  settings: any,
  getHoliday?: (date: Date) => any
) => {
  let totalAllowance = 0;
  let earnedDays = 0;
  const monthKey = getMonthKey(new Date(year, month));
  const isSaturdayWork = settings?.isSaturdayWork || false;

  const getRateForDate = (dateStr: string) => {
    const history = [...(settings?.allowanceHistory || [])].sort((a, b) => b.date.localeCompare(a.date));
    const found = history.find(h => h.date <= dateStr);
    return found || { meal: settings?.dailyMealAllowance || 0, travel: settings?.dailyTravelAllowance || 0 };
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = getDateKey(date);
    const dayOfWeek = date.getDay();
    const isDateHoliday = !!getHoliday?.(date);
    const dayEntries = (monthlyData[monthKey] || []).filter((e: OvertimeEntry) => e.date === dateStr);
    
    const hasOvertime = dayEntries.some((e: OvertimeEntry) => e.type === 'overtime' && (e.totalHours || 0) > 0);
    const isFullDayLeave = dayEntries.some((e: OvertimeEntry) => e.type === 'leave' && e.isFullDay);
    
    const isStandardWorkDay = isSaturdayWork 
      ? (dayOfWeek !== 0) 
      : (dayOfWeek !== 0 && dayOfWeek !== 6);

    const shouldGetAllowance = hasOvertime || (isStandardWorkDay && !isDateHoliday && !isFullDayLeave);

    if (shouldGetAllowance) {
      const rate = getRateForDate(dateStr);
      totalAllowance += (Number(rate.meal) + Number(rate.travel));
      earnedDays++;
    }
  }

  return { total: totalAllowance, days: earnedDays };
};

export const generateExportText = (monthlyData: any, year: number, month: number, settings: any, getHoliday?: (date: Date) => any): string => {
  const firstName = settings?.firstName || '';
  const lastName = settings?.lastName || '';
  const deductBreakTime = settings?.deductBreakTime || false;
  const isSaturdayWork = settings?.isSaturdayWork || false;
  
  const monthKey = getMonthKey(new Date(year, month));
  const allDaysInMonth = getCalendarDays(year, month);
  const entriesByDate = new Map<string, OvertimeEntry[]>();
  
  (monthlyData[monthKey] || []).forEach((entry: OvertimeEntry) => {
    if (!entriesByDate.has(entry.date)) {
      entriesByDate.set(entry.date, []);
    }
    entriesByDate.get(entry.date)?.push(entry);
  });

  const appVersion = APP_VERSION;

  let text = `>>> MESAI_TAKIP_SISTEMI v${appVersion}\n`;
  const separator = '_'.repeat(31) + '\n';
  
  text += separator;
  text += '[KULLANICI_BILGILERI]\n';
  
  if (firstName.trim() || lastName.trim()) {
    text += `[+] ISIM      : ${firstName.trim().toUpperCase()} ${lastName.trim().toUpperCase()}\n`;
  }
  
  text += `[+] TARIH     : ${TURKISH_MONTHS[month]} ${year}\n`;
  if (deductBreakTime) {
    text += '[!] IS_KANUNU : 4857_PROTOCOL\n';
  }
  text += separator;
  text += '[MESAILER]\n';

  let totalNetHours = 0;
  let totalGrossHours = 0;
  let normalHours = 0;
  let sundayHours = 0;
  let saturdayHours = 0;
  let officialHolidayHours = 0;
  let religiousHolidayHours = 0;
  
  allDaysInMonth.forEach(date => {
    if (date.getMonth() !== month) return;
    
    const dateKey = getDateKey(date);
    const dayEntries = entriesByDate.get(dateKey) || [];
    const overtimeEntries = dayEntries.filter(e => e.type === 'overtime');
    
    if (overtimeEntries.length === 0) return;

    const dayOfWeek = date.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const holiday = getHoliday ? getHoliday(date) : null;
    const isEntryHoliday = !!holiday;

    const formattedDate = formatTurkishDateWithDay(date);
    
    // Toplam mesai süresini ve kesintiyi hesapla
    const dayTotalGross = overtimeEntries.reduce((sum, e) => sum + e.totalHours, 0);
    const dayTotalNet = calculateEffectiveHours(dayTotalGross, deductBreakTime, isSaturday, isSunday, isEntryHoliday, isSaturdayWork);
    
    const wasDeducted = deductBreakTime && (isSunday || isEntryHoliday || (!isSaturdayWork && isSaturday)) && dayTotalGross >= 4;

    let statusText = 'OK';
    if (wasDeducted) {
        if (dayTotalGross > 7.5) {
            statusText = '1s_MOLA';
        } else if (dayTotalGross >= 4) {
            statusText = '30dk_MOLA';
        }
    }

    const hoursText = formatHours(dayTotalGross).replace(' ', '');
    
    if (holiday) {
      if (holiday.type === 'religious') {
        religiousHolidayHours += dayTotalNet;
      } else {
        officialHolidayHours += dayTotalNet;
      }
    } else if (isSunday) {
      sundayHours += dayTotalNet;
    } else if (isSaturday) {
      if (isSaturdayWork) {
        normalHours += dayTotalNet;
      } else {
        saturdayHours += dayTotalNet;
      }
    } else {
      normalHours += dayTotalNet;
    }
    
    let lineText = `${formattedDate} | ${hoursText} [${statusText}]`;
    const notes = dayEntries.map(e => e.note?.trim()).filter(Boolean);
    if (notes.length > 0) {
      lineText += ` (${notes.join(', ')})`;
    }
    
    text += lineText + '\n';
    totalNetHours += dayTotalNet;
    totalGrossHours += dayTotalGross;
  });
  
  const totalDeductionHours = totalGrossHours - totalNetHours;
  const formatSaat = (h: number) => formatHours(h).replace(' s', ' sa');

  const allowanceData = calculateMonthlyAllowances(year, month, monthlyData, settings, getHoliday);

  text += separator;
  text += '[MESAI_SAATLERI]\n';
  
  if (deductBreakTime) {
    text += `[*] TOPLAM_BRUT_MESAI : ${formatSaat(totalGrossHours)}\n`;
    text += `[*] TOPLAM_MOLA       : ${formatSaat(totalDeductionHours)}\n`;
    text += `[*] TOPLAM_NET_MESAI  : ${formatSaat(totalNetHours)}\n`;
  } else {
    text += `[*] TOPLAM_NET_MESAI  : ${formatSaat(totalNetHours)}\n`;
  }

  const hasAllowanceSystem = (Number(settings?.dailyMealAllowance) || 0) > 0 || (Number(settings?.dailyTravelAllowance) || 0) > 0;

  if (hasAllowanceSystem) {
    text += `[*] TOPLAM_YOL_YEMEK  : ${allowanceData.days} gün\n`;
    text += `[*] YOL_YEMEK_TOPLAMI : ${allowanceData.total} tl\n`;
  }
  
  text += separator;
  text += '[MESAI_KATSAYILARI]\n';
  
  let displayNormalHours = normalHours;
  if (!isSaturdayWork && saturdayHours > 0) {
    displayNormalHours += saturdayHours;
  }

  if (displayNormalHours > 0) {
    text += `- HAFTAICI    : ${formatSaat(displayNormalHours)}\n`;
  }
  if (sundayHours > 0) {
    text += `- PAZAR_GUNU  : ${formatSaat(sundayHours)}\n`;
  }
  if (religiousHolidayHours > 0) {
    text += `- DINI_BAYRAM : ${formatSaat(religiousHolidayHours)}\n`;
  }
  if (officialHolidayHours > 0) {
    text += `- RESMI_TATIL : ${formatSaat(officialHolidayHours)}\n`;
  }
  
  text += separator;
  text += '[!] STATUS: COMPLETED\n';
  const contentToHash = text;
  const hash = generateDynamicHash(contentToHash);
  
  return '```\n' + contentToHash + `[!] LOG_HASH: ${hash}\n` + '```';
};

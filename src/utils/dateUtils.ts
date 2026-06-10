import { OvertimeEntry, SalarySettings, Holiday, calcTotalHours, ShiftType, ShiftSystemType, MonthlyData } from '../types/overtime';
import { isHoliday } from '../utils/holidayUtils';
import { APP_VERSION } from '../constants';

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

const dateKeyCache = new Map<string, string>();

export const getDateKey = (date: Date): string => {
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const cached = dateKeyCache.get(dayKey);
  if (cached) return cached;

  const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  
  // Cache size limit to prevent memory leaks
  if (dateKeyCache.size > 1000) {
    const firstKey = dateKeyCache.keys().next().value;
    if (firstKey) dateKeyCache.delete(firstKey);
  }
  
  dateKeyCache.set(dayKey, key);
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
  
  // Dynamic grid size: 35 or 42
  const currentCount = days.length;
  const targetCount = currentCount > 35 ? 42 : 35;
  const remainingDays = targetCount - currentCount;

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

export const calculateDailyGrossHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  if (diff < 0) diff += 24 * 60; // Handle overnight shifts
  
  return diff / 60;
};

export const isSaturdayWorkday = (settings: any): boolean => {
  // Manuel müdahale açıksa, doğrudan isSaturdayWork değerini döndür
  if (settings.isSaturdayWorkManual) {
    return !!settings.isSaturdayWork;
  }

  if (!settings.defaultStartTime || !settings.defaultEndTime) return false;
  const grossHours = calculateDailyGrossHours(settings.defaultStartTime, settings.defaultEndTime);
  // Kullanıcı kuralı: 10 saat (veya üzeri) ise Cumartesi yok, 8 saat (veya altı) ise Cumartesi var.
  // Eşik değer olarak 9 saati kullanıyoruz.
  return grossHours < 9;
};

export const calculateEffectiveHours = (totalHours: number, deductBreakTime: boolean): number => {
  if (!deductBreakTime) {
    return totalHours;
  }

  // İş Kanunu'na göre ara dinlenmesi süreleri:
  // Günlük 7.5 saatlik çalışma süresini aşan işlerde 1 saat mola verilir.
  // Brüt süre (toplam süre) üzerinden hesaplama yaparken:
  // 8.0 saatten fazla olan toplam süreler için 1 saat (Örn: 8.5s brüt - 1s mola = 7.5s net)
  // 4 saat-8.0 saat arası toplam süreler için 30 dk
  
  if (totalHours > 8.0) {
    return Math.max(7.5, totalHours - 1);
  } else if (totalHours >= 4) {
    return Math.max(3.5, totalHours - 0.5);
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
export const getShiftType = (date: Date, normalizedStartDate: Date, initialType: ShiftType, systemType: ShiftSystemType = '2-shift') => {
  const dateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffInTime = dateObj.getTime() - normalizedStartDate.getTime();
  const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  
  if (systemType === '3-shift') {
    const sequence: ShiftType[] = ['morning', 'afternoon', 'night'];
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

// Geliştirilmiş Hash fonksiyonu (FNV-1a benzeri)
export const generateDynamicHash = (content: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  // 32-bit unsigned hex string
  return '0x' + (hash >>> 0).toString(16).toUpperCase();
};

// Haftalık çalışma saatlerini hesapla (Pazartesi-Cumartesi arası standart çalışma + mesailer)
export const calculateWeeklyHoursForSunday = (
  sundayDate: Date, 
  monthlyData: MonthlyData, 
  isSaturdayWork: boolean, 
  dailyWorkingHours: number
): number => {
  const weekDays = getWeekWorkDays(sundayDate);
  let totalWeeklyHours = 0;

  weekDays.forEach(day => {
    const dayKey = getDateKey(day);
    const dayMonthKey = getMonthKey(day);
    const dayEntries = (monthlyData[dayMonthKey] || []).filter((e: OvertimeEntry) => e.date === dayKey);

    const overtimeEntry = dayEntries.find((e: OvertimeEntry) => e.type === 'overtime');
    const leaveEntry = dayEntries.find((e: OvertimeEntry) => e.type === 'leave');

    const isSaturday = day.getDay() === 6;
    const isStandardWorkDay = isSaturdayWork ? true : !isSaturday;

    let dayWorkedHours = 0;
    if (isStandardWorkDay) {
      dayWorkedHours = dailyWorkingHours;
      if (leaveEntry?.isFullDay) {
        dayWorkedHours = 0;
      } else if (leaveEntry) {
        dayWorkedHours = Math.max(0, dayWorkedHours - calcTotalHours(leaveEntry));
      }
    }

    if (overtimeEntry) {
      dayWorkedHours += calcTotalHours(overtimeEntry);
    }

    totalWeeklyHours += dayWorkedHours;
  });

  return totalWeeklyHours;
};

export const calculateMonthlyAllowances = (
  year: number,
  month: number,
  monthlyData: MonthlyData,
  settings: SalarySettings,
  getHoliday?: (date: Date) => Holiday | undefined,
  isSaturdayWorkOverride?: boolean
) => {
  let totalAllowance = 0;
  let earnedDays = 0;
  let totalWorkingDays = 0;
  let totalRequiredHours = 0;
  let workedHoursOnStandardDays = 0;
  let totalLeaveHours = 0;
  let fullDayLeavesCount = 0;

  const monthKey = getMonthKey(new Date(year, month));
  const isSaturdayWork = isSaturdayWorkOverride !== undefined ? isSaturdayWorkOverride : (settings?.isSaturdayWork || false);
  const dailyWorkingHours = Number(settings?.dailyWorkingHours) || 9;

  const getRateForDate = (dateStr: string) => {
    if (settings?.allowanceHistory && typeof settings.allowanceHistory === 'object' && !Array.isArray(settings.allowanceHistory)) {
      const history = settings.allowanceHistory;
      // En güncel tarihi bulmak için tersten sırala (descending)
      const dates = Object.keys(history).sort((a, b) => b.localeCompare(a));
      const foundDate = dates.find(d => d <= dateStr);
      if (foundDate) return history[foundDate];
    } else if (Array.isArray(settings?.allowanceHistory)) {
      // Fallback for old array format
      const history = [...(settings.allowanceHistory as any)].sort((a, b) => b.date.localeCompare(a.date));
      const found = history.find(h => h.date <= dateStr);
      if (found) return found;
    }
    return { meal: settings?.dailyMealAllowance || 0, travel: settings?.dailyTravelAllowance || 0 };
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    const dateStr = getDateKey(date);
    const dayOfWeek = date.getDay();
    const holiday = getHoliday?.(date);
    const isArife = holiday?.isHalfDay;
    const isFullHoliday = !!holiday && !isArife;
    const dayEntries = (monthlyData[monthKey] || []).filter((e: OvertimeEntry) => e.date === dateStr);
    
    const hasOvertime = dayEntries.some((e: OvertimeEntry) => e.type === 'overtime' && calcTotalHours(e) > 0);
    const leaveEntry = dayEntries.find((e: OvertimeEntry) => e.type === 'leave');
    const isFullDayLeave = leaveEntry?.isFullDay;
    const workedHalfDay = dayEntries.some((e: OvertimeEntry) => e.workedHalfDay);
    
    const isStandardWorkDay = isSaturdayWork 
      ? (dayOfWeek !== 0) 
      : (dayOfWeek !== 0 && dayOfWeek !== 6);

    const isPastOrToday = date <= today;

    // Toplam iş günü ve saat sayacı (Full Tatil olmayan ve standart çalışma günü olan günler)
    if (isStandardWorkDay && !isFullHoliday) {
      const requiredHoursForThisDay = isArife ? (dailyWorkingHours / 2) : dailyWorkingHours;
      
      totalWorkingDays++;
      totalRequiredHours += requiredHoursForThisDay;

      if (leaveEntry) {
        if (leaveEntry.isFullDay) {
          totalLeaveHours += requiredHoursForThisDay;
          fullDayLeavesCount++;
        } else {
          const leaveH = calcTotalHours(leaveEntry);
          totalLeaveHours += leaveH;
          if (isPastOrToday) {
            workedHoursOnStandardDays += Math.max(0, requiredHoursForThisDay - leaveH);
          }
        }
      } else {
        if (isPastOrToday) {
          workedHoursOnStandardDays += requiredHoursForThisDay;
        }
      }
    } else if (leaveEntry) {
      const leaveH = leaveEntry.isFullDay ? dailyWorkingHours : calcTotalHours(leaveEntry);
      totalLeaveHours += leaveH;
    }

    const isDateHoliday = !!holiday;
    // Arife günleri artık standart iş günü sayıldığı için mola/yol ücreti varsayılan olarak verilmeli.
    // workedHalfDay artık "Yarım Gün Çalışma Yok" (istisna) olarak kullanılıyor.
    const isStandardWorkDayForAllowance = isStandardWorkDay && !isFullHoliday && !isFullDayLeave;
    const shouldGetAllowance = (hasOvertime || (isStandardWorkDayForAllowance && (isArife ? !workedHalfDay : true)));

    if (shouldGetAllowance) {
      const rate = getRateForDate(dateStr);
      totalAllowance += (Number(rate.meal) + Number(rate.travel));
      earnedDays++;
    }
  }

  // Format leave string strictly in hours and minutes
  let leaveInfo = "";
  if (totalLeaveHours > 0) {
    const h = Math.floor(totalLeaveHours);
    const m = Math.round((totalLeaveHours - h) * 60);
    
    const parts = [];
    if (h > 0) parts.push(`${h} saat`);
    if (m > 0) parts.push(`${m} dk`);
    
    leaveInfo = parts.join(' ') + ' izin';
  }

  const completionPercentage = totalRequiredHours > 0 
    ? (workedHoursOnStandardDays / totalRequiredHours) * 100 
    : 0;

  const netWorkedDays = totalRequiredHours > 0
    ? (workedHoursOnStandardDays / totalRequiredHours) * totalWorkingDays
    : 0;

  return { 
    total: totalAllowance, 
    days: earnedDays, 
    totalWorkingDays,
    netTotalWorkingDays: totalWorkingDays - fullDayLeavesCount,
    completionPercentage,
    netWorkedDays,
    leaveInfo,
    totalRequiredHours,
    workedHoursOnStandardDays
  };
};

export const generateExportText = (monthlyData: MonthlyData, year: number, month: number, settings: SalarySettings, getHoliday?: (date: Date) => Holiday | undefined): string => {
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
    text += '[!] IS_KANUNU : 4857_PROTOKOL\n';
  }
  text += '[!] * : Tatil/Pazar Mesaisi\n';
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
    const isSpecialDay = isSunday || isEntryHoliday;

    const formattedDate = formatTurkishDateWithDay(date);
    
    // Toplam mesai süresini ve kesintiyi hesapla
    const dayTotalGross = overtimeEntries.reduce((sum, e) => sum + calcTotalHours(e), 0);
    const dayTotalNet = calculateEffectiveHours(dayTotalGross, deductBreakTime);
    
    const wasDeducted = deductBreakTime && dayTotalGross >= 4;

    let statusText = '✓';
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
    if (isSpecialDay) {
      lineText += ' *';
    }
    
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
  text += '[!] RAPOR: HAZIRLANDI\n';
  
  // Hash hesaplamadan önce satır sonlarını normalize et (Platform bağımsız tutarlılık için)
  const contentToHash = text.replace(/\r\n/g, '\n');
  const hash = generateDynamicHash(contentToHash);
  
  return '```\n' + contentToHash + `[!] KONTROL_KODU: ${hash}\n` + '```';
};

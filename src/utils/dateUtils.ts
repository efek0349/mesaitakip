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
  
  if (dateKeyCache.size > 200) {
    const keys = Array.from(dateKeyCache.keys());
    const toDelete = keys.slice(0, 50); 
    toDelete.forEach(k => dateKeyCache.delete(k));
  }
  
  dateKeyCache.set(dayKey, key);
  return key;
};

export const getCalendarDays = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; 
  
  const days: Date[] = [];
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(new Date(year, month, 1 - firstDayOfWeek + i));
  }
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }
  
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
  return new Date(year, month - 1, day);
};

export const calculateDailyGrossHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  if (diff < 0) diff += 24 * 60; 
  
  return diff / 60;
};

export const isSaturdayWorkday = (settings: any): boolean => {
  if (settings.isSaturdayWorkManual) {
    return !!settings.isSaturdayWork;
  }

  if (!settings.defaultStartTime || !settings.defaultEndTime) return false;
  const grossHours = calculateDailyGrossHours(settings.defaultStartTime, settings.defaultEndTime);
  return grossHours < 9;
};

export const calculateEffectiveHours = (totalHours: number, deductBreakTime: boolean): number => {
  if (!deductBreakTime) {
    return totalHours;
  }

  if (totalHours >= 8) {
    return totalHours - 1;
  } else if (totalHours >= 4.1) {
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
  }
  if (minutes === 0) {
    return `${hours} s`;
  }
  return `${hours}s ${minutes}dk`;
};

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

// ─── HMAC-SHA256 İmza ─────────────────────────────────────────────────────────
// Web Crypto API kullanılarak üretilen kriptografik imza.
// HMAC anahtarı uygulama versiyonundan türetilir; böylece farklı sürümler arasında
// üretilen imzalar kasıtlı olarak birbirine karışmaz.
const HMAC_SALT = 'MesaiTakip-v1-integrity';

// Verilen sürüm numarasına göre HMAC anahtarı üret
const getHmacKeyForVersion = async (version: string): Promise<CryptoKey> => {
  const rawKey = new TextEncoder().encode(`${HMAC_SALT}::${version}`);
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

// İmzalama: her zaman güncel sürümü kullan
export const generateHMAC = async (content: string): Promise<string> => {
  const key = await getHmacKeyForVersion(APP_VERSION);
  const data = new TextEncoder().encode(content);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

// Log içindeki sürüm satırını oku: ">>> MESAI_TAKIP_SISTEMI v1.2.3"
const extractVersionFromLog = (content: string): string | null => {
  const match = content.match(/^>>>\s*MESAI_TAKIP_SISTEMI\s+v([^\s\n]+)/m);
  return match ? match[1] : null;
};

// Doğrulama: log içindeki sürümü oku, o sürümün anahtarıyla dene
export const verifyHMAC = async (content: string, providedHex: string): Promise<boolean> => {
  // Hex string temizle: sadece geçerli hex karakterleri kalsın
  const cleanHex = providedHex.replace(/[^0-9a-fA-F]/g, '');

  // HMAC-SHA256 = 64 hex karakter (32 byte). Farklıysa geçersiz.
  if (cleanHex.length !== 64) {
    console.warn('verifyHMAC: geçersiz hex uzunluğu:', cleanHex.length, 'raw:', JSON.stringify(providedHex));
    return false;
  }

  const pairs = cleanHex.match(/.{2}/g);
  if (!pairs) return false;
  const signatureBytes = new Uint8Array(pairs.map(byte => parseInt(byte, 16)));
  const data = new TextEncoder().encode(content);

  // 1. Önce log içindeki sürümle dene (eski loglar için)
  const logVersion = extractVersionFromLog(content);
  if (logVersion) {
    const keyForLogVersion = await getHmacKeyForVersion(logVersion);
    const isValid = await crypto.subtle.verify('HMAC', keyForLogVersion, signatureBytes, data);
    if (isValid) return true;
  }

  // 2. Log sürümü yoksa veya eşleşmediyse güncel sürümle dene
  if (!logVersion || logVersion !== APP_VERSION) {
    const keyForCurrent = await getHmacKeyForVersion(APP_VERSION);
    const isValid = await crypto.subtle.verify('HMAC', keyForCurrent, signatureBytes, data);
    if (isValid) return true;
  }

  return false;
};

/** @deprecated Geriye dönük uyumluluk için tutuldu. generateHMAC kullanın. */
export const generateDynamicHash = (content: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return '0x' + (hash >>> 0).toString(16).toUpperCase();
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
  let workedDays = 0;   // İşe gidilen gün sayısı (izinli günler düşülmüş, cumartesi mesaisi dahil)
  let totalWorkingDays = 0;
  let totalRequiredHours = 0;
  let workedHoursOnStandardDays = 0;
  let totalLeaveHours = 0;
  let fullDayLeavesCount = 0;

  const monthKey = getMonthKey(new Date(year, month));
  const isSaturdayWork = isSaturdayWorkOverride !== undefined ? isSaturdayWorkOverride : (settings?.isSaturdayWork || false);
  const dailyWorkingHours = Number(settings?.dailyWorkingHours) || 9;

  // allowanceHistory: tarihe göre sıralı (artan) kayıt anahtarları
  const hasHistory = settings?.allowanceHistory && typeof settings.allowanceHistory === 'object' && !Array.isArray(settings.allowanceHistory);
  const historyDatesAsc = hasHistory ? Object.keys(settings.allowanceHistory!).sort((a, b) => a.localeCompare(b)) : [];

  const firstDayOfMonthStr = getDateKey(new Date(year, month, 1));

  // Kullanıcının belirlediği başlangıç tarihi — bu tarihten önce yol/yemek hesaplanmaz
  const userAllowanceStartDate = settings.allowanceStartDate || '';

  const getRateForDate = (dateStr: string) => {
    const hasDeparture = settings?.departureTravelAllowance !== undefined;
    const hasReturn = settings?.returnTravelAllowance !== undefined;
    const dailyTravel = Number(settings?.dailyTravelAllowance) || 0;
    const dep = hasDeparture ? Number(settings.departureTravelAllowance) || 0 : dailyTravel / 2;
    const ret = hasReturn ? Number(settings.returnTravelAllowance) || 0 : dailyTravel / 2;
    const settingsRate = {
      meal: settings?.dailyMealAllowance || 0,
      travel: dep + ret,
      departure: dep,
      return: ret
    };
    const zeroRate = { meal: 0, travel: 0, departure: 0, return: 0 };

    // allowanceStartDate varsa: o tarihten itibaren hesapla, öncesi sıfır
    if (userAllowanceStartDate) {
      if (dateStr < userAllowanceStartDate) return zeroRate;

      if (hasHistory) {
        const history = settings.allowanceHistory!;
        const dates = Object.keys(history).sort((a, b) => b.localeCompare(a));

        // Bu güne ait veya öncesindeki en yakın history kaydı
        const foundDate = dates.find(d => d <= dateStr);

        if (foundDate) {
          // History kaydı bulundu → kullan (allowanceStartDate öncesi anchor dahil)
          return history[foundDate];
        }

        // Bu tarihten önce hiç history kaydı yok → settingsRate (henüz anchor yazılmamış)
      }

      return settingsRate;
    }

    // allowanceStartDate yok: history'ye bak, yoksa direkt settingsRate kullan
    if (hasHistory) {
      const history = settings.allowanceHistory!;
      const dates = Object.keys(history).sort((a, b) => b.localeCompare(a));
      const foundDate = dates.find(d => d <= dateStr);
      if (foundDate) return history[foundDate];
      // History var ama bu tarihten önce kayıt yok → settingsRate (ilk fiyat)
    }

    return settingsRate;
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
    const overtimeEntry = dayEntries.find((e: OvertimeEntry) => e.type === 'overtime');

    // noAllowance: hem mesai hem izin girişinden gelebilir
    const hasNoAllowance = dayEntries.some((e: OvertimeEntry) => e.noAllowance === true);

    const requiredHoursForThisDay = isArife ? (dailyWorkingHours / 2) : dailyWorkingHours;
    const isFullDayLeave = leaveEntry?.isFullDay || (leaveEntry && calcTotalHours(leaveEntry) >= requiredHoursForThisDay);
    const workedHalfDay = dayEntries.some((e: OvertimeEntry) => e.workedHalfDay);
    
    const isStandardWorkDay = isSaturdayWork 
      ? (dayOfWeek !== 0) 
      : (dayOfWeek !== 0 && dayOfWeek !== 6);

    const isPastOrToday = date <= today;

    if (isStandardWorkDay && !isFullHoliday) {
      totalWorkingDays++;
      totalRequiredHours += requiredHoursForThisDay;

      if (leaveEntry) {
        if (isFullDayLeave) {
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
      const leaveH = isFullDayLeave ? dailyWorkingHours : calcTotalHours(leaveEntry);
      totalLeaveHours += leaveH;
    }

    const isStandardWorkDayForAllowance = isStandardWorkDay && !isFullHoliday && !isFullDayLeave;
    
    // ÖNEMLİ: Eğer o gün mesai (overtime) yapılmışsa, o gün işe gelinmiş demektir.
    // Dolayısıyla standart iş günü olmasa bile (Cumartesi/Pazar/Tatil) yol/yemek ücreti hak edilir.
    // noAllowance işaretliyse o gün yol/yemek verilmez.
    const shouldGetAllowance = !hasNoAllowance && (hasOvertime || (isStandardWorkDayForAllowance && (isArife ? !workedHalfDay : true)));

    if (shouldGetAllowance) {
      const rate = getRateForDate(dateStr);
      const dailyMealRate = Number(rate.meal) || 0;

      // Gidiş/Dönüş ayrımı varsa topla, yoksa düz 'travel' değerini kullan (Geriye dönük uyumluluk)
      let dailyTravelRate = 0;
      if (rate.departure !== undefined || rate.return !== undefined) {
        dailyTravelRate = (Number(rate.departure) || 0) + (Number(rate.return) || 0);
      } else {
        dailyTravelRate = Number(rate.travel) || 0;
      }

      const dailyTotal = dailyMealRate + dailyTravelRate;
      totalAllowance += dailyTotal;

      // İşe gidilen gün: shouldGetAllowance = true demek o gün işyerinde bulunuldu demek
      workedDays++;

      // NET_YOL_YEMEK: sadece gerçekten ücret alınan günleri say (sıfır oranlı günler dahil değil)
      if (dailyTotal > 0) {
        earnedDays++;
      }
    }
  }

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

  // --- YOL/YEMEK GEÇMİŞİ ---
  // Bu ay için geçerli olan kayıtları (ay başından önceki SON kayıt + ay içindeki tüm kayıtlar) sırala.
  let allowanceStartDate: string | null = null; // Kısmi ay ise YYYY-MM-DD
  let isFullMonthAllowance = true;
  const allowanceHistoryEntries: { date: string; meal: number; departure: number; return: number }[] = [];

  if (hasHistory) {
    const history = settings.allowanceHistory!;
    const lastDayOfMonthStr = getDateKey(new Date(year, month, new Date(year, month + 1, 0).getDate()));

    // Kullanıcının ayarlarda girdiği başlangıç tarihi
    const userStartDate = settings.allowanceStartDate || '';
    // Ay başı (1'i) veya öncesi → tam ay
    const userStartIsFirstDayOrBefore = userStartDate && userStartDate <= firstDayOfMonthStr;
    // Ay ortasında (2'si ve sonrası) → kısmi ay
    const userStartInMonthMiddle = userStartDate > firstDayOfMonthStr && userStartDate <= lastDayOfMonthStr;

    // Ay başından önceki (veya eşit) en son history kaydı
    const lastBeforeMonth = historyDatesAsc.filter(d => d <= firstDayOfMonthStr).pop();

    // Ay içindeki history kayıtları
    const inMonthDates = historyDatesAsc.filter(d => d > firstDayOfMonthStr && d <= lastDayOfMonthStr);

    if (userStartIsFirstDayOrBefore || lastBeforeMonth) {
      // Tam ay: kullanıcı 1'ini veya öncesini seçti, ya da önceki aydan history var
      isFullMonthAllowance = true;
      // History'den referans al; yoksa inMonthDates'in ilk kaydını kullan
      const refEntry = lastBeforeMonth ? history[lastBeforeMonth] : null;
      if (refEntry) {
        allowanceHistoryEntries.push({
          date: firstDayOfMonthStr,
          meal: Number(refEntry.meal) || 0,
          departure: refEntry.departure !== undefined ? Number(refEntry.departure) || 0 : (Number(refEntry.travel) || 0) / 2,
          return: refEntry.return !== undefined ? Number(refEntry.return) || 0 : (Number(refEntry.travel) || 0) / 2,
        });
      } else if (inMonthDates.length > 0) {
        // Önceki ay kaydı yok ama kullanıcı 1'ini seçti → inMonth'un ilk kaydını ay başından itibaren uygula
        const firstInMonth = history[inMonthDates[0]];
        allowanceHistoryEntries.push({
          date: firstDayOfMonthStr,
          meal: Number(firstInMonth.meal) || 0,
          departure: firstInMonth.departure !== undefined ? Number(firstInMonth.departure) || 0 : (Number(firstInMonth.travel) || 0) / 2,
          return: firstInMonth.return !== undefined ? Number(firstInMonth.return) || 0 : (Number(firstInMonth.travel) || 0) / 2,
        });
      }
    } else if (userStartInMonthMiddle) {
      // Kısmi ay: kullanıcı ayın 2'si veya sonrasını seçti
      isFullMonthAllowance = false;
      allowanceStartDate = userStartDate;
    } else if (inMonthDates.length > 0) {
      // Kullanıcı tarih girmedi → history'deki ilk kayıt baz alınır
      isFullMonthAllowance = false;
      allowanceStartDate = inMonthDates[0];
    } else {
      isFullMonthAllowance = true;
    }

    inMonthDates.forEach(d => {
      const entry = history[d];
      allowanceHistoryEntries.push({
        date: d,
        meal: Number(entry.meal) || 0,
        departure: entry.departure !== undefined ? Number(entry.departure) || 0 : (Number(entry.travel) || 0) / 2,
        return: entry.return !== undefined ? Number(entry.return) || 0 : (Number(entry.travel) || 0) / 2,
      });
    });
  }

  return {
    total: totalAllowance,
    days: earnedDays,
    workedDays,
    totalWorkingDays,
    netTotalWorkingDays: totalWorkingDays - fullDayLeavesCount,
    completionPercentage,
    netWorkedDays,
    leaveInfo,
    totalRequiredHours,
    workedHoursOnStandardDays,
    totalLeaveHours,
    fullDayLeavesCount,
    isFullMonthAllowance,
    allowanceStartDate,
    allowanceHistoryEntries
  };
};

export const getWeekWorkDays = (targetDate: Date): Date[] => {
  const date = new Date(targetDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const weekDays: Date[] = [];
  for (let i = 0; i < 6; i++) { 
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d);
  }
  return weekDays;
};

export const getShiftType = (date: Date, startDate: Date, initialType: ShiftType, systemType: ShiftSystemType): ShiftType => {
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return initialType;

  const cycleDays = 7;
  const currentWeek = Math.floor(diffDays / cycleDays);

  if (systemType === '3-shift') {
    const sequence: ShiftType[] = ['morning', 'afternoon', 'night'];
    const startIndex = sequence.indexOf(initialType);
    return sequence[(startIndex + currentWeek) % 3];
  } else {
    const sequence: ShiftType[] = ['day', 'night'];
    const startIndex = sequence.indexOf(initialType);
    return sequence[(startIndex + currentWeek) % 2];
  }
};

export const getNormalizedShiftStartDate = (dateStr: string): Date => {
  // Boş string veya geçersiz tarihte bugünü kullan
  const date = dateStr ? parseDate(dateStr) : new Date();
  if (isNaN(date.getTime())) return new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export const generateExportText = async (monthlyData: MonthlyData, year: number, month: number, settings: SalarySettings, getHoliday?: (date: Date) => Holiday | undefined): Promise<string> => {
  const firstName = settings?.firstName || '';
  const lastName = settings?.lastName || '';
  const deductBreakTime = settings?.deductBreakTime || false;
  const isSaturdayWork = isSaturdayWorkday(settings);

  const monthKey = getMonthKey(new Date(year, month));
  const allDaysInMonth = getCalendarDays(year, month);
  const entriesByDate = new Map<string, OvertimeEntry[]>();

  (monthlyData[monthKey] || []).forEach((entry: OvertimeEntry) => {
    if (!entriesByDate.has(entry.date)) {
      entriesByDate.set(entry.date, []);
    }
    entriesByDate.get(entry.date)?.push(entry);
  });

  let text = `>>> MESAI_TAKIP_SISTEMI v${APP_VERSION}\n`;
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
    const dayTotalGross = overtimeEntries.reduce((sum, e) => sum + calcTotalHours(e), 0);
    const dayTotalNet = calculateEffectiveHours(dayTotalGross, deductBreakTime);

    // calculateEffectiveHours ile aynı sınırları kullan, aksi halde etiket
    // gerçekte düşülen süreyle uyuşmaz (örn. 7.6 saatte "1s_MOLA" yazıp
    // aslında 30 dk düşülmesi gibi).
    const wasDeducted = deductBreakTime && dayTotalGross >= 4.1;

    let statusText = '✓';
    if (wasDeducted) {
        if (dayTotalGross >= 8) {
            statusText = '1s_MOLA';
        } else {
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

    const notes = dayEntries.filter(e => e.type === 'overtime').map(e => e.note?.trim()).filter(Boolean);
    if (notes.length > 0) {
      lineText += ` (${notes.join(', ')})`;
    }

    text += lineText + '\n';
    totalNetHours += dayTotalNet;
    totalGrossHours += dayTotalGross;
  });

  const totalDeductionHours = totalGrossHours - totalNetHours;
  const formatSaat = (h: number) => formatHours(h).replace(' s', ' sa');
  const allowanceData = calculateMonthlyAllowances(year, month, monthlyData, settings, getHoliday, isSaturdayWork);

  text += separator;
  text += '[MESAI_SAATLERI]\n';

  if (deductBreakTime) {
    text += `[*] TOPLAM_BRUT_MESAI: ${formatSaat(totalGrossHours)}\n`;
    text += `[*] TOPLAM_MOLA      : ${formatSaat(totalDeductionHours)}\n`;
    text += `[*] TOPLAM_NET_MESAI : ${formatSaat(totalNetHours)}\n`;
  } else {
    text += `[*] TOPLAM_NET_MESAI : ${formatSaat(totalNetHours)}\n`;
  }

  const formatDateShort = (dateStr: string) => {
    const [, m, dd] = dateStr.split('-');
    return `${dd}.${m}`;
  };

  // Sıfır ücretli kayıtları filtrele — gerçek ücret içeren dönemler
  const activeEntries = allowanceData.allowanceHistoryEntries.filter(
    e => e.departure > 0 || e.return > 0 || e.meal > 0
  );

  // Yol/yemek sistemi aktif mi?
  // Kriter: ya gerçek ücretli history kaydı var, ya da bu ay toplam > 0
  const hasAllowanceSystem = (activeEntries.length > 0 || allowanceData.total > 0) && (settings?.showMealInExport === true);

if (hasAllowanceSystem) {
  // Tüm ay hesaplandıysa toplam iş günü satırını göster
  if (allowanceData.isFullMonthAllowance) {
    text += `[*] TOPLAM_YOL_YEMEK : ${allowanceData.workedDays} gün\n`;
  }

  // Her durumda gerçek hesaplanan (net) gün sayısını göster
  text += `[*] NET_YOL_YEMEK    : ${allowanceData.days} gün\n`;

  text += `[*] YOL_YEMEK_TUTARI : ${allowanceData.total} tl\n`;

  if (activeEntries.length > 0) {
    text += separator;
    text += '[YOL_YEMEK_GECMISI] (TL)\n';
    text += '[!] G=Geliş, D=Dönüş, Y=Yemek\n';

    // BASLANGIC_TARIH: ilk gerçek ücretin tarihi
    text += `[*] BASLANGIC_TARIH : ${formatDateShort(activeEntries[0].date)}\n`;

    activeEntries.forEach(entry => {
      text += `[*] ${formatDateShort(entry.date)} G:${entry.departure} D:${entry.return} Y:${entry.meal}\n`;
    });
  }
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

  const contentToHash = text.replace(/\r\n/g, '\n');
  const hash = await generateHMAC(contentToHash);

  return '```\n' + contentToHash + `[!] KONTROL_KODU: ${hash}\n` + '```';
};

export const generateVerificationSummary = async (
  text: string,
): Promise<string> => {
  const contentToHash = text.replace(/\r\n/g, '\n');
  const hash = await generateHMAC(contentToHash);
  return '```\n' + contentToHash + `[!] KONTROL_KODU: ${hash}\n` + '```';
};

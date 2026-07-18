// --- Temel tipler ---
export type ShiftSystemType = '2-shift' | '3-shift';
export type ShiftType = 'day' | 'night' | 'morning' | 'afternoon';
export type EntryType = 'overtime' | 'leave';
export type HolidayType = 'religious' | 'official';

// --- OvertimeEntry ---
export interface OvertimeEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  hours: number;
  minutes: number;
  type: EntryType;
  isFullDay?: boolean; // Tam gün izinli mi?
  isPaid?: boolean; // Ücretli mi? (Varsayılan: true)
  deductFromOvertime?: boolean; // Mesai alacağından mı düşülsün?
  workedHalfDay?: boolean; // Arife günü yarım gün çalışıldı mı?
  noAllowance?: boolean; // O gün için yol/yemek verilmedi mi?
  note?: string; // Opsiyonel not alanı
}

// Derived field helper
export const calcTotalHours = (entry: OvertimeEntry): number => 
  entry.hours + (entry.minutes / 60);

// --- Ayrıştırılmış Ayar Parçaları ---
export interface PersonalInfo {
  firstName: string;
  lastName: string;
  employmentStartDate?: string;
}

export interface PaySettings {
  monthlyGrossSalary: number;
  bonus: number;
  monthlyWorkingHours: number;
  dailyWorkingHours: number;
  weekdayMultiplier: number;
  saturdayMultiplier: number;
  sundayMultiplier: number;
  holidayMultiplier: number;
  deductBreakTime: boolean;
  isSaturdayWork: boolean;
  isSaturdayWorkManual?: boolean; // Cumartesi çalışma durumuna manuel müdahale
  hasSalaryAttachment: boolean;
  salaryAttachmentRate: number;
  hasTES: boolean;
  tesRate: number;
  dailyMealAllowance?: number;
  dailyTravelAllowance?: number;
  departureTravelAllowance?: number; // Gidiş ücreti
  returnTravelAllowance?: number;    // Dönüş ücreti
}

export interface ShiftSettings {
  defaultStartTime: string;
  defaultEndTime: string;
  shiftSystemEnabled: boolean;
  shiftSystemType?: ShiftSystemType;
  shiftStartDate: string;
  shiftInitialType: ShiftType;
  shiftHistory?: {
    startDate: string;
    systemType: ShiftSystemType;
    initialType: ShiftType;
  }[];
  /**
   * Vardiya sistemi aktifken, her vardiya tipi için AYRI başlangıç saati.
   * Bitiş saati burada tutulmuyor — dailyWorkingHours'a göre otomatik
   * hesaplanıyor (bkz. addHoursToTime / getEffectiveShiftTimes). Bir tip
   * için özel saat girilmemişse defaultStartTime'a düşer.
   */
  shiftStartTimes?: Partial<Record<ShiftType, string>>;
  /**
   * Sürekli/kesintisiz vardiya sistemlerinde (7/24 üretim) Pazar günü de
   * çalışılabilir. Varsayılan false — önceki davranış korunur (Pazar hiç
   * çalışılmaz). Şu an sadece Mesai Bitiş Hatırlatıcısı'nın "bugün çalışma
   * günü mü" hesabında kullanılıyor; takvim/aylık hesaplamalar etkilenmez.
   */
  shiftIncludesSunday?: boolean;
}

export interface SeveranceSettings {
  severanceCeiling?: number;
  severanceStampTaxRate?: number;
  severanceBaseGross?: number;
  showSeverancePay?: boolean;
  showMealInExport?: boolean;
  allowanceStartDate?: string; // YYYY-MM-DD — yol/yemek başlangıç tarihi
  usedAnnualLeaveDays?: number; // Mevcut izin döneminde kullanılan yıllık izin günü
  noticePayCumulativeBase?: number; // İhbar tazminatı gelir vergisi hesabı için opsiyonel yıl içi matrah
}

export interface BackupSettings {
  autoBackupEnabled?: boolean;
  autoBackupPeriod?: 'daily' | 'weekly' | 'monthly';
  lastBackupDate?: string;
}

/**
 * Maaş günü hatırlatıcısı. Vardiya/mesai bitiş hatırlatıcısı (mesai
 * saatlerinin vardiyaya göre otomatik değişmesini gerektiriyor) henüz
 * eklenmedi — bu sadece ayın belirli bir gününde, belirli bir saatte
 * tetiklenen basit, tek amaçlı bir hatırlatıcı.
 */
export interface ReminderSettings {
  salaryReminderEnabled?: boolean;
  salaryReminderDay?: number;   // 1-31 (ayın günü; kısa aylarda o ayın son gününe düşer)
  salaryReminderTime?: string;  // "HH:mm"
  /**
   * true (varsayılan): hesaplanan gün Cumartesi'ye denk gelirse bir önceki
   * güne (Cuma), Pazar'a denk gelirse bir sonraki güne (Pazartesi) kaydırılır
   * — "en yakın iş günü" kuralı. Maaşlar genelde hafta sonu yatmadığı için
   * varsayılan olarak açık.
   */
  salaryReminderSkipWeekend?: boolean;
  /**
   * O günkü vardiyanın bitişine (getEffectiveShiftTimes ile hesaplanan
   * bitiş saatine) belirli bir süre kala bildirim gönderir. Vardiya
   * sistemi kapalıysa defaultStartTime/defaultEndTime baz alınır.
   */
  workEndReminderEnabled?: boolean;
  workEndReminderMinutesBefore?: number; // örn. 5
}

/**
 * Brüt/Net maaş hesaplayıcısında kullanılan, kullanıcı tarafından
 * değiştirilebilen gelir vergisi dilimleri ve asgari ücret. Varsayılan
 * değerler 2026 yılı tarifesidir (src/utils/incomeTaxUtils.ts içindeki
 * DEFAULT_* sabitleriyle aynı). Dilim sınırları her yıl yeniden değerleme
 * oranına göre değiştiği için kullanıcı burada güncelleyebilir.
 */
export interface TaxSettings {
  minimumWageGross?: number;
  taxBracket1Limit?: number; taxBracket1Rate?: number;
  taxBracket2Limit?: number; taxBracket2Rate?: number;
  taxBracket3Limit?: number; taxBracket3Rate?: number;
  taxBracket4Limit?: number; taxBracket4Rate?: number;
  taxBracket5Rate?: number; // Son dilim sınırsızdır, üst sınırı yoktur
}

// Ana Ayarlar Interface'i
export interface SalarySettings extends 
  PersonalInfo, PaySettings, ShiftSettings, SeveranceSettings, BackupSettings, TaxSettings, ReminderSettings {
  salaryHistory?: { [monthKey: string]: MonthlySalary };
  allowanceHistory?: { [date: string]: { meal: number; travel: number; departure?: number; return?: number } };
}

// MonthlySalary — SalarySettings'ten türetildi, senkron kalır
export type MonthlySalary = Pick<SalarySettings,
  'monthlyGrossSalary' | 'bonus' | 'isSaturdayWork' | 'isSaturdayWorkManual' |
  'shiftSystemEnabled' | 'shiftSystemType' |
  'defaultStartTime' | 'defaultEndTime'
>;

export interface MonthlyData {
  [key: string]: OvertimeEntry[];
}

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: HolidayType;
  shortName: string;
  isHalfDay?: boolean; // Yarım gün (Arife) mi?
  recurring?: boolean; // true ise her yıl aynı ay/gün'de tekrarlanır (yalnızca manuel özel günler için anlamlı)
}

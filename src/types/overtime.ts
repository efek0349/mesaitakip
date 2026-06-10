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
}

export interface SeveranceSettings {
  severanceCeiling?: number;
  severanceStampTaxRate?: number;
  severanceBaseGross?: number;
  showSeverancePay?: boolean;
}

export interface BackupSettings {
  autoBackupEnabled?: boolean;
  autoBackupPeriod?: 'daily' | 'weekly' | 'monthly';
  lastBackupDate?: string;
}

// Ana Ayarlar Interface'i
export interface SalarySettings extends 
  PersonalInfo, PaySettings, ShiftSettings, SeveranceSettings, BackupSettings {
  salaryHistory?: { [monthKey: string]: MonthlySalary };
  allowanceHistory?: { [date: string]: { meal: number; travel: number } };
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
}

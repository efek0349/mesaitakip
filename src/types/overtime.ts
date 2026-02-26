export interface OvertimeEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  hours: number;
  minutes: number;
  totalHours: number;
  note?: string; // Opsiyonel not alanı
}

export interface MonthlyData {
  [key: string]: OvertimeEntry[];
}

export interface SalarySettings {
  firstName: string;
  lastName: string;
  monthlyGrossSalary: number;
  bonus: number;
  monthlyWorkingHours: number;
  weekdayMultiplier: number;
  saturdayMultiplier: number;
  sundayMultiplier: number;
  holidayMultiplier: number;
  deductBreakTime: boolean;
  showNextMonthDays: boolean;
  isSaturdayWork: boolean;
  hasSalaryAttachment: boolean;
  defaultStartTime: string;
  defaultEndTime:string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: 'religious' | 'official';
  shortName: string;
}
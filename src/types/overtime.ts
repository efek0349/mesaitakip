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
  monthlyWorkingHours: number;
  sgkRate: number;
  incomeTaxRate: number;
  stampTaxRate: number;
  weekdayMultiplier: number;
  saturdayMultiplier: number;
  sundayMultiplier: number;
  holidayMultiplier: number;
  deductBreakTime: boolean;
}

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: 'religious' | 'official';
  shortName: string;
}
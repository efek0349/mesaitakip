import { SalarySettings, MonthlySalary } from '../types/overtime';
import { parseDate } from './dateUtils';

export interface SeveranceResult {
  eligible: boolean;
  years: number;
  months: number;
  days: number;
  totalDays: number;
  netSeverance: number;
  grossSeverance: number;
  extraNetSeverance: number;
  extraGrossSeverance: number;
  monthNetSeverance: number;
  dayNetSeverance: number;
  totalNetSeverance: number;
  totalGrossSeverance: number;
  totalStampTax: number;
  effectiveBase: number;
}

export const calculateSeverancePay = (settings: SalarySettings, monthSalary: MonthlySalary): SeveranceResult | null => {
  if (!settings.employmentStartDate || !settings.severanceBaseGross) return null;

  const start = parseDate(settings.employmentStartDate);
  const end = new Date();
  
  if (isNaN(start.getTime())) return null;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(totalDays / 365.25);
  const remainingDaysAfterYears = totalDays % 365.25;
  const months = Math.floor(remainingDaysAfterYears / 30.44);
  const days = Math.floor(remainingDaysAfterYears % 30.44);

  const eligible = totalDays >= 365;

  const baseGross = Number(settings.severanceBaseGross) || 0;
  
  // Ek ödemeler (Yemek + Yol) - Ayrıştırılmış yol ücretlerini topla
  const meal = Number(settings.dailyMealAllowance) || 0;
  const departure = Number(settings.departureTravelAllowance) || 0;
  const returnVal = Number(settings.returnTravelAllowance) || 0;
  const travel = departure + returnVal;
  
  const monthlyMeal = meal * 26;
  const monthlyTravel = travel * 26;
  const totalExtraGross = monthlyMeal + monthlyTravel;

  const effectiveBase = Math.min(baseGross + totalExtraGross, settings.severanceCeiling || 64948.77);
  
  const grossSeverance = (effectiveBase / 365.25) * totalDays;
  const stampTax = grossSeverance * ((settings.severanceStampTaxRate || 0.759) / 100);
  const netSeverance = grossSeverance - stampTax;

  return {
    eligible,
    years,
    months,
    days,
    totalDays,
    netSeverance,
    grossSeverance,
    extraNetSeverance: totalExtraGross * (1 - (settings.severanceStampTaxRate || 0.759) / 100),
    extraGrossSeverance: totalExtraGross,
    monthNetSeverance: netSeverance / (totalDays / 30.44),
    dayNetSeverance: netSeverance / totalDays,
    totalNetSeverance: netSeverance,
    totalGrossSeverance: grossSeverance,
    totalStampTax: stampTax,
    effectiveBase
  };
};

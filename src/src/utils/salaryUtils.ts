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

export const calculateSeverancePay = (
  settings: SalarySettings,
  monthSalary: MonthlySalary
): SeveranceResult | null => {
  if (!settings.employmentStartDate) return null;

  const start = parseDate(settings.employmentStartDate);
  const end = new Date();
  
  if (end < start) return null;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Toplam gün hesabı
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // 1 yıl dolmadan kıdem tazminatı ödenmez
  // Artık yılları ve tam yılları kapsamak için hem yıl hem gün kontrolü yapıyoruz
  if (years < 1 && totalDays < 365) {
    return { 
      eligible: false, 
      years, 
      months, 
      days, 
      totalDays, 
      netSeverance: 0, 
      grossSeverance: 0, 
      extraNetSeverance: 0, 
      extraGrossSeverance: 0, 
      monthNetSeverance: 0,
      dayNetSeverance: 0,
      totalNetSeverance: 0,
      totalGrossSeverance: 0,
      totalStampTax: 0,
      effectiveBase: 0 
    };
  }

  // Brüt esas ücret (Maaş + Prim + Yol/Yemek ortalaması)
  // Eğer kullanıcı özel bir Kıdem Esas Brüt girdiyse onu kullanıyoruz, 
  // girmediyse mevcut maaş ve primi topluyoruz.
  const baseGross = Number(settings.severanceBaseGross) || 
    (Number(monthSalary.monthlyGrossSalary) + (Number(monthSalary.bonus) || 0));

  const dailyMeal = Number(settings.dailyMealAllowance) || 0;
  const dailyTravel = Number(settings.dailyTravelAllowance) || 0;
  
  // Çalışma gün sayısına göre yol/yemek hesabı (Cumartesi varsa 26, yoksa 22 gün)
  const workDaysPerMonth = settings.isSaturdayWork ? 26 : 22;
  const monthlyAllowances = (dailyMeal + dailyTravel) * workDaysPerMonth;
  
  const totalBaseForSeverance = baseGross + monthlyAllowances;
  const effectiveBase = Math.min(totalBaseForSeverance, Number(settings.severanceCeiling) || 64948.77);
  
  // Kıdem Tazminatı = (Son Brüt Ücret) × (Çalışılan Yıl) − Damga Vergisi
  const grossSeverance = years * effectiveBase;
  
  // Damga vergisi binde 7.59 (%0.759). Değer 0.759 olarak geliyorsa direkt oran olarak kullanıyoruz.
  const stampTaxRateValue = Number(settings.severanceStampTaxRate) || 0.759;
  // Eğer kullanıcı binde değer (7.59) yerine yüzde değer (0.759) girdiyse veya tam tersi, 
  // standart binde 7.59 (0.00759) çarpanını hedefliyoruz.
  const stampTaxMultiplier = stampTaxRateValue > 1 ? (stampTaxRateValue / 1000) : (stampTaxRateValue / 100);
  
  const netSeverance = grossSeverance * (1 - stampTaxMultiplier);

  // Ekstra günler hesabı (Aylar ve Günler)
  const monthGrossSeverance = (months / 12 * effectiveBase);
  const dayGrossSeverance = (days / 365 * effectiveBase);
  const monthNetSeverance = monthGrossSeverance * (1 - stampTaxMultiplier);
  const dayNetSeverance = dayGrossSeverance * (1 - stampTaxMultiplier);

  const extraGrossSeverance = monthGrossSeverance + dayGrossSeverance;
  const extraNetSeverance = extraGrossSeverance * (1 - stampTaxMultiplier);
  
  const totalGrossSeverance = grossSeverance + extraGrossSeverance;
  const totalNetSeverance = netSeverance + extraNetSeverance;
  const totalStampTax = totalGrossSeverance - totalNetSeverance;

  return {
    eligible: true,
    years,
    months,
    days,
    totalDays,
    netSeverance,
    grossSeverance,
    extraNetSeverance,
    extraGrossSeverance,
    monthNetSeverance,
    dayNetSeverance,
    totalNetSeverance,
    totalGrossSeverance,
    totalStampTax,
    effectiveBase
  };
};

import { SalarySettings, MonthlySalary } from '../types/overtime';
import { parseDate } from './dateUtils';
import { IncomeTaxBracket, DEFAULT_INCOME_TAX_BRACKETS, STAMP_TAX_RATE, calculateCumulativeTax } from './incomeTaxUtils';

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

/**
 * İhbar (Bildirim) Tazminatı — 4857 sayılı İş Kanunu Madde 17.
 *
 * Kıdem tazminatından farklı olarak:
 *  - Yasal tavan UYGULANMAZ (tavan sadece kıdem tazminatına özgüdür).
 *  - SGK/işsizlik primi kesilmez.
 *  - Sadece damga vergisi değil, AYRICA gelir vergisi de kesilir (gelir
 *    vergisi istisnası yoktur; kümülatif matrah dilimine göre hesaplanır).
 *
 * Bildirim süreleri (kıdeme göre, her hafta 7 gün sayılır):
 *   6 aydan az   -> 2 hafta (14 gün)
 *   6 ay - 1,5 yıl -> 4 hafta (28 gün)
 *   1,5 yıl - 3 yıl -> 6 hafta (42 gün)
 *   3 yıldan fazla -> 8 hafta (56 gün)
 */
export interface NoticePayResult {
  eligible: boolean;
  totalDays: number;
  noticeWeeks: number;
  noticeDays: number;
  dailyGrossWage: number;
  dressedGrossWage: number;
  grossNoticePay: number;
  incomeTax: number;
  stampTax: number;
  netNoticePay: number;
}

/** Kıdeme (toplam gün) göre İş Kanunu Md.17 bildirim süresini (hafta) döner. */
export const getNoticePeriodWeeks = (totalDays: number): number => {
  if (totalDays < 182) return 2;   // 6 aydan az
  if (totalDays < 547) return 4;   // 6 ay - 1,5 yıl (1,5 yıl ~ 547 gün)
  if (totalDays < 1095) return 6;  // 1,5 yıl - 3 yıl (3 yıl ~ 1095 gün)
  return 8;                        // 3 yıldan fazla
};

export const calculateNoticePay = (
  settings: SalarySettings,
  priorCumulativeTaxBase: number = 0,
  brackets: IncomeTaxBracket[] = DEFAULT_INCOME_TAX_BRACKETS
): NoticePayResult | null => {
  if (!settings.employmentStartDate || !settings.severanceBaseGross) return null;

  const start = parseDate(settings.employmentStartDate);
  const end = new Date();

  if (isNaN(start.getTime())) return null;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const baseGross = Number(settings.severanceBaseGross) || 0;

  // Giydirilmiş brüt ücret: Esas Brüt Maaş + düzenli yan haklar (Yemek + Yol).
  // Kıdem tazminatındaki tavan burada UYGULANMAZ.
  const meal = Number(settings.dailyMealAllowance) || 0;
  const departure = Number(settings.departureTravelAllowance) || 0;
  const returnVal = Number(settings.returnTravelAllowance) || 0;
  const travel = departure + returnVal;

  const monthlyMeal = meal * 26;
  const monthlyTravel = travel * 26;
  const dressedGrossWage = baseGross + monthlyMeal + monthlyTravel;

  const noticeWeeks = getNoticePeriodWeeks(totalDays);
  const noticeDays = noticeWeeks * 7;
  const dailyGrossWage = dressedGrossWage / 30;
  const grossNoticePay = dailyGrossWage * noticeDays;

  const priorBase = Math.max(0, Number(priorCumulativeTaxBase) || 0);
  const incomeTax = calculateCumulativeTax(priorBase + grossNoticePay, brackets) - calculateCumulativeTax(priorBase, brackets);
  const stampTax = grossNoticePay * STAMP_TAX_RATE;
  const netNoticePay = grossNoticePay - incomeTax - stampTax;

  return {
    eligible: true,
    totalDays,
    noticeWeeks,
    noticeDays,
    dailyGrossWage,
    dressedGrossWage,
    grossNoticePay,
    incomeTax,
    stampTax,
    netNoticePay,
  };
};

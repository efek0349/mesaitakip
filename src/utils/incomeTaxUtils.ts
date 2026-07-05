import { SalarySettings } from '../types/overtime';

export interface IncomeTaxBracket {
  upTo: number; // Bu dilimin üst sınırı; son dilim için Infinity kullanılır
  rate: number; // 0-1 arası oran (0.15 = %15)
}

/**
 * 2026 yılı ücret gelirleri için VARSAYILAN gelir vergisi tarifesi (193 sayılı
 * Kanun Md. 103, 332 Seri No'lu Gelir Vergisi Genel Tebliği). Dilim sınırları
 * her yıl yeniden değerleme oranına göre güncellenir. Kullanıcı Ayarlar
 * ekranından bu değerleri değiştirebilir; burada sadece ilk açılışta
 * kullanılacak varsayılanlar tutulur.
 */
export const DEFAULT_INCOME_TAX_BRACKETS: IncomeTaxBracket[] = [
  { upTo: 190000, rate: 0.15 },
  { upTo: 400000, rate: 0.20 },
  { upTo: 1500000, rate: 0.27 },
  { upTo: 5300000, rate: 0.35 },
  { upTo: Infinity, rate: 0.40 },
];

// 2026 brüt asgari ücret (varsayılan)
export const DEFAULT_MINIMUM_WAGE_GROSS = 33030;

export const SGK_EMPLOYEE_RATE = 0.14;
export const UNEMPLOYMENT_EMPLOYEE_RATE = 0.01;
export const STAMP_TAX_RATE = 0.00759; // Binde 7,59

/** Ayarlarda saklanan dilim alanlarını (taxBracket1Limit vb.) hesaplama dizisine çevirir. */
export const getIncomeTaxBrackets = (settings?: Partial<SalarySettings>): IncomeTaxBracket[] => {
  if (!settings) return DEFAULT_INCOME_TAX_BRACKETS;

  const limit1 = Number(settings.taxBracket1Limit);
  const rate1 = Number(settings.taxBracket1Rate);
  const limit2 = Number(settings.taxBracket2Limit);
  const rate2 = Number(settings.taxBracket2Rate);
  const limit3 = Number(settings.taxBracket3Limit);
  const rate3 = Number(settings.taxBracket3Rate);
  const limit4 = Number(settings.taxBracket4Limit);
  const rate4 = Number(settings.taxBracket4Rate);
  const rate5 = Number(settings.taxBracket5Rate);

  const hasAllValues =
    limit1 > 0 && rate1 > 0 && limit2 > 0 && rate2 > 0 &&
    limit3 > 0 && rate3 > 0 && limit4 > 0 && rate4 > 0 && rate5 > 0;

  if (!hasAllValues) return DEFAULT_INCOME_TAX_BRACKETS;

  return [
    { upTo: limit1, rate: rate1 / 100 },
    { upTo: limit2, rate: rate2 / 100 },
    { upTo: limit3, rate: rate3 / 100 },
    { upTo: limit4, rate: rate4 / 100 },
    { upTo: Infinity, rate: rate5 / 100 },
  ];
};

/** Ayarlarda saklanan asgari ücreti okur, girilmemişse varsayılanı döner. */
export const getMinimumWageGross = (settings?: Partial<SalarySettings>): number => {
  const value = Number(settings?.minimumWageGross);
  return value > 0 ? value : DEFAULT_MINIMUM_WAGE_GROSS;
};

/** Kümülatif matraha kadar birikmiş toplam gelir vergisini (dilimli) hesaplar. */
export const calculateCumulativeTax = (
  cumulativeBase: number,
  brackets: IncomeTaxBracket[] = DEFAULT_INCOME_TAX_BRACKETS
): number => {
  if (cumulativeBase <= 0) return 0;
  let tax = 0;
  let previousLimit = 0;
  for (const bracket of brackets) {
    if (cumulativeBase > bracket.upTo) {
      tax += (bracket.upTo - previousLimit) * bracket.rate;
      previousLimit = bracket.upTo;
    } else {
      tax += (cumulativeBase - previousLimit) * bracket.rate;
      return tax;
    }
  }
  return tax;
};

/** Kümülatif matrahın hangi dilime denk geldiğini (o anki marjinal oranı) döner. */
export const getMarginalTaxRate = (
  cumulativeBase: number,
  brackets: IncomeTaxBracket[] = DEFAULT_INCOME_TAX_BRACKETS
): number => {
  for (const bracket of brackets) {
    if (cumulativeBase <= bracket.upTo) return bracket.rate;
  }
  return brackets[brackets.length - 1].rate;
};

export interface GrossToNetResult {
  grossSalary: number;
  sgkAndUnemployment: number;
  monthlyTaxBase: number;      // Bu ayın gelir vergisi matrahı
  cumulativeBaseAfter: number; // Bu ay dahil yılın toplam matrahı
  bracketRate: number;         // Bu aya uygulanan gelir vergisi dilimi (görüntüleme amaçlı)
  grossIncomeTax: number;      // İstisna öncesi hesaplanan gelir vergisi
  incomeTaxExemption: number;  // Asgari ücret gelir vergisi istisnası
  netIncomeTax: number;        // İstisna sonrası ödenecek gelir vergisi
  grossStampTax: number;
  stampTaxExemption: number;   // Asgari ücret damga vergisi istisnası
  netStampTax: number;
  netSalary: number;
}

export interface GrossToNetOptions {
  brackets?: IncomeTaxBracket[];
  minimumWageGross?: number;
}

/**
 * Brüt maaştan net maaşa: SGK/işsizlik primi, kümülatif matraha göre dilimli
 * gelir vergisi ve damga vergisi düşülür; 2022'den beri yürürlükte olan asgari
 * ücret gelir/damga vergisi istisnası uygulanır.
 *
 * @param grossSalary Bu ayki brüt maaş
 * @param priorCumulativeBase Bu aydan önce yıl içinde birikmiş gelir vergisi matrahı (0'dan başlanabilir)
 * @param options Kullanıcının Ayarlar'dan değiştirebileceği dilimler/asgari ücret; verilmezse 2026 varsayılanları kullanılır
 */
export const calculateGrossToNet = (
  grossSalary: number,
  priorCumulativeBase: number = 0,
  options?: GrossToNetOptions
): GrossToNetResult => {
  const brackets = options?.brackets && options.brackets.length > 0 ? options.brackets : DEFAULT_INCOME_TAX_BRACKETS;
  const minimumWageGross = options?.minimumWageGross && options.minimumWageGross > 0
    ? options.minimumWageGross
    : DEFAULT_MINIMUM_WAGE_GROSS;
  const minimumWageMonthlyBase = minimumWageGross * (1 - SGK_EMPLOYEE_RATE - UNEMPLOYMENT_EMPLOYEE_RATE);

  const gross = Number(grossSalary) || 0;
  const priorBase = Math.max(0, Number(priorCumulativeBase) || 0);

  const sgkAndUnemployment = gross * (SGK_EMPLOYEE_RATE + UNEMPLOYMENT_EMPLOYEE_RATE);
  const monthlyTaxBase = Math.max(0, gross - sgkAndUnemployment);
  const cumulativeBaseAfter = priorBase + monthlyTaxBase;

  const grossIncomeTax = calculateCumulativeTax(cumulativeBaseAfter, brackets) - calculateCumulativeTax(priorBase, brackets);
  const bracketRate = getMarginalTaxRate(cumulativeBaseAfter, brackets);

  // Asgari ücret istisnası: ilgili ayda uygulanan dilim oranı ile asgari ücretin
  // matrahının çarpımı kadar gelir vergisinden mahsup edilir.
  const incomeTaxExemption = minimumWageMonthlyBase * bracketRate;
  const netIncomeTax = Math.max(0, grossIncomeTax - incomeTaxExemption);

  const grossStampTax = gross * STAMP_TAX_RATE;
  const stampTaxExemption = minimumWageGross * STAMP_TAX_RATE;
  const netStampTax = Math.max(0, grossStampTax - stampTaxExemption);

  const netSalary = gross - sgkAndUnemployment - netIncomeTax - netStampTax;

  return {
    grossSalary: gross,
    sgkAndUnemployment,
    monthlyTaxBase,
    cumulativeBaseAfter,
    bracketRate,
    grossIncomeTax,
    incomeTaxExemption,
    netIncomeTax,
    grossStampTax,
    stampTaxExemption,
    netStampTax,
    netSalary,
  };
};

import { SalarySettings } from '../types/overtime';
import { parseDate } from './dateUtils';

export interface AnnualLeaveResult {
  yearsOfService: number;       // Tam yıl olarak kıdem
  entitledDays: number;         // 4857 sayılı Kanuna göre hak edilen izin günü
  usedDays: number;             // Kullanılan izin günü (kullanıcı girişi)
  remainingDays: number;        // Kalan izin günü
  periodStart: string;          // İçinde bulunulan izin döneminin başlangıcı (YYYY-MM-DD)
  periodEnd: string;            // İçinde bulunulan izin döneminin bitişi (YYYY-MM-DD)
  periodStartLabel: string;     // DD.MM.YYYY görüntüleme metni
  periodEndLabel: string;       // DD.MM.YYYY görüntüleme metni
}

/**
 * 4857 sayılı İş Kanunu Madde 53'e göre kıdeme bağlı yıllık ücretli izin süreleri:
 * - 1 yıldan 5 yıla kadar (5 dahil): 14 gün
 * - 5 yıldan fazla, 15 yıldan az: 20 gün
 * - 15 yıl ve daha fazla: 26 gün
 * Not: 18 yaşından küçük ve 50 yaşından büyük işçiler için kanun en az 20 gün
 * öngörür; yaş bilgisi tutulmadığından bu istisna hesaba dahil edilmemiştir.
 */
export const getEntitledAnnualLeaveDays = (yearsOfService: number): number => {
  if (yearsOfService < 1) return 0;
  if (yearsOfService <= 5) return 14;
  if (yearsOfService < 15) return 20;
  return 26;
};

export const calculateAnnualLeave = (settings: SalarySettings): AnnualLeaveResult | null => {
  if (!settings.employmentStartDate) return null;

  const start = parseDate(settings.employmentStartDate);
  if (isNaN(start.getTime())) return null;

  const today = new Date();
  if (start.getTime() > today.getTime()) return null;

  // Tam olarak tamamlanan kıdem yılı sayısı
  let yearsOfService = today.getFullYear() - start.getFullYear();
  const anniversaryThisYear = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (today.getTime() < anniversaryThisYear.getTime()) {
    yearsOfService -= 1;
  }
  yearsOfService = Math.max(0, yearsOfService);

  // İçinde bulunulan izin döneminin başlangıcı: en son geçilen iş yılı dönümü
  const periodStartDate = new Date(start.getFullYear() + yearsOfService, start.getMonth(), start.getDate());
  const periodEndDate = new Date(start.getFullYear() + yearsOfService + 1, start.getMonth(), start.getDate());
  periodEndDate.setDate(periodEndDate.getDate() - 1);

  const entitledDays = getEntitledAnnualLeaveDays(yearsOfService);
  const usedDays = Number(settings.usedAnnualLeaveDays) || 0;
  const remainingDays = entitledDays - usedDays;

  const toIso = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  const toLabel = (d: Date) =>
    `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;

  return {
    yearsOfService,
    entitledDays,
    usedDays,
    remainingDays,
    periodStart: toIso(periodStartDate),
    periodEnd: toIso(periodEndDate),
    periodStartLabel: toLabel(periodStartDate),
    periodEndLabel: toLabel(periodEndDate),
  };
};

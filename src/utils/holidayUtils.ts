// Tatil sistemi
// Dini bayramlar: useDiniHolidays hook'u ile online kaynaktan güncellenir
// Resmi tatiller: yıl parametresinden hesaplanır

import { Holiday } from '../types/overtime';

// ─── Fallback: Hardcoded dini tatiller ────────────────────────────────────────
// İnternet yokken veya ilk yüklemede kullanılır.
// useDiniHolidays başarılı olduğunda bunların yerini online veri alır.
// NOT: 2030 sonrası tarihler tahminidir, resmi ilan sonrası dini.json'dan güncellenir.
export const FALLBACK_RELIGIOUS_HOLIDAYS: Holiday[] = [
  // 2025
  { date: '2025-03-29', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2025-03-30', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2025-03-31', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2025-04-01', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2025-06-05', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2025-06-06', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2025-06-07', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2025-06-08', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2025-06-09', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2026
  { date: '2026-03-19', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2026-03-20', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2026-03-21', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2026-03-22', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2026-05-26', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2026-05-27', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2026-05-28', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2026-05-29', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2026-05-30', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2027
  { date: '2027-03-08', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2027-03-09', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2027-03-10', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2027-03-11', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2027-05-15', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2027-05-16', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2027-05-17', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2027-05-18', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2027-05-19', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2028
  { date: '2028-02-25', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2028-02-26', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2028-02-27', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2028-02-28', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2028-05-04', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2028-05-05', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2028-05-06', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2028-05-07', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2028-05-08', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2029
  { date: '2029-02-13', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2029-02-14', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2029-02-15', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2029-02-16', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2029-04-23', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2029-04-24', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2029-04-25', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2029-04-26', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2029-04-27', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2030
  { date: '2030-02-03', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2030-02-04', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2030-02-05', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2030-02-06', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2030-04-12', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2030-04-13', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2030-04-14', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2030-04-15', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2030-04-16', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2031
  { date: '2031-01-23', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2031-01-24', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2031-01-25', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2031-01-26', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2031-04-01', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2031-04-02', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2031-04-03', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2031-04-04', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2031-04-05', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2032
  { date: '2032-01-13', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2032-01-14', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2032-01-15', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2032-01-16', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2032-03-21', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2032-03-22', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2032-03-23', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2032-03-24', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2032-03-25', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2033
  { date: '2033-01-01', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2033-01-02', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2033-01-03', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2033-01-04', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2033-03-10', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2033-03-11', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2033-03-12', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2033-03-13', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2033-03-14', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  // 2034 — kronolojik sıra: Kurban (Mart) önce, Ramazan (Aralık) sonra
  { date: '2034-02-28', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2034-03-01', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2034-03-02', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2034-03-03', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2034-03-04', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2034-12-11', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2034-12-12', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2034-12-13', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2034-12-14', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
  // 2035 — kronolojik sıra: Kurban (Şubat) önce, Ramazan (Kasım) sonra
  { date: '2035-02-17', name: 'Kurban Bayramı Arifesi',  type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2035-02-18', name: 'Kurban Bayramı 1. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2035-02-19', name: 'Kurban Bayramı 2. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2035-02-20', name: 'Kurban Bayramı 3. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2035-02-21', name: 'Kurban Bayramı 4. Gün',   type: 'religious', shortName: 'Kurban' },
  { date: '2035-11-30', name: 'Ramazan Bayramı Arifesi', type: 'religious', shortName: 'Arife', isHalfDay: true },
  { date: '2035-12-01', name: 'Ramazan Bayramı 1. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2035-12-02', name: 'Ramazan Bayramı 2. Gün',  type: 'religious', shortName: 'Ramazn' },
  { date: '2035-12-03', name: 'Ramazan Bayramı 3. Gün',  type: 'religious', shortName: 'Ramazn' },
];

// ─── Resmi tatiller ────────────────────────────────────────────────────────────
export function getOfficialHolidays(year: number): Holiday[] {
  return [
    { date: `${year}-01-01`, name: 'Yılbaşı',                                            type: 'official', shortName: 'Yılbaşı'    },
    { date: `${year}-03-21`, name: 'Nevruz Bayramı',                                     type: 'official', shortName: 'Nevruz'     },
    { date: `${year}-04-23`, name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',         type: 'official', shortName: '23 Nisan'   },
    { date: `${year}-05-01`, name: '1 Mayıs Emek ve Dayanışma Günü',                     type: 'official', shortName: '1 Mayıs'    },
    { date: `${year}-05-19`, name: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı",  type: 'official', shortName: '19 Mayıs'   },
    { date: `${year}-07-15`, name: '15 Temmuz Demokrasi ve Milli Birlik Günü',           type: 'official', shortName: '15 Temmuz'  },
    { date: `${year}-08-30`, name: '30 Ağustos Zafer Bayramı',                           type: 'official', shortName: '30 Ağustos' },
    { date: `${year}-10-28`, name: 'Cumhuriyet Bayramı Arifesi',                         type: 'official', shortName: '28 Eki',    isHalfDay: true },
    { date: `${year}-10-29`, name: '29 Ekim Cumhuriyet Bayramı',                         type: 'official', shortName: '29 Ekim'   },
  ];
}

// ─── Tüm tatilleri getir ───────────────────────────────────────────────────────
// religiousHolidays: useDiniHolidays hook'undan gelir.
// Verilmezse FALLBACK_RELIGIOUS_HOLIDAYS kullanılır (offline/ilk yükleme).
//
// Cache key: yıl + religious verinin ilk tarihi (fingerprint)
// Online veri geldiğinde fingerprint değişir → cache invalidate olur.

const holidayCache = new Map<string, Holiday[]>();

export function getAllHolidays(
  year: number,
  religiousHolidays: Holiday[] = FALLBACK_RELIGIOUS_HOLIDAYS
): Holiday[] {
  const fingerprint = religiousHolidays[0]?.date ?? 'fallback';
  const cacheKey = `${year}-${fingerprint}`;

  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)!;
  }

  const official = getOfficialHolidays(year);
  const religious = religiousHolidays.filter(h => h.date.startsWith(`${year}-`));

  // Çakışma çözümü: aynı tarihte birden fazla tatil varsa
  // tam gün > yarım gün, resmi > dini önceliği
  // Örnek: 2033-01-01 → Yılbaşı (resmi, tam gün) + Ramazan Arifesi (dini, yarım gün)
  //        → Yılbaşı kazanır
  const byDate = new Map<string, Holiday>();
  for (const h of [...official, ...religious]) {
    const existing = byDate.get(h.date);
    if (!existing) {
      byDate.set(h.date, h);
      continue;
    }
    // Mevcut yarım gün, yeni tam günse → yeniyi al
    if (existing.isHalfDay && !h.isHalfDay) {
      byDate.set(h.date, h);
      continue;
    }
    // İkisi de tam gün ve yeni resmi tatilse → yeniyi al
    if (!existing.isHalfDay && !h.isHalfDay && h.type === 'official') {
      byDate.set(h.date, h);
    }
  }

  const result = Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  holidayCache.set(cacheKey, result);
  return result;
}

// ─── Standalone tatil kontrolü ────────────────────────────────────────────────
// Hook dışı doğrudan kullanım için.
// Hook içinde kullanılıyorsa useHolidays → getHoliday tercih edilmeli.
export function isHoliday(
  date: Date,
  religiousHolidays: Holiday[] = FALLBACK_RELIGIOUS_HOLIDAYS
): Holiday | null {
  const year = date.getFullYear();
  const dateKey = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  const holidays = getAllHolidays(year, religiousHolidays);
  return holidays.find(h => h.date === dateKey) ?? null;
}

// ─── Tatil renk sınıfı ────────────────────────────────────────────────────────
export function getHolidayColorClass(holiday: Holiday): string {
  if (holiday.isHalfDay) {
    return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/50';
  }
  if (holiday.type === 'religious') {
    return 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/50';
  }
  return 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/50';
}
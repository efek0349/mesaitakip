// Sabit dini tatil tarihleri ve tatil sistemi

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: 'religious' | 'official';
  shortName: string;
}

// Sabit dini tatil tarihleri (2025-2035)
const RELIGIOUS_HOLIDAYS_DATA: Holiday[] = [
  // 2025
  { date: '2025-03-30', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2025-03-31', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2025-04-01', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2025-06-06', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2025-06-07', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2025-06-08', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2025-06-09', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2026
  { date: '2026-03-20', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2026-03-21', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2026-03-22', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2026-05-27', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2026-05-28', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2026-05-29', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2026-05-30', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2027
  { date: '2027-03-09', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2027-03-10', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2027-03-11', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2027-05-16', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2027-05-17', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2027-05-18', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2027-05-19', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2028
  { date: '2028-02-26', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2028-02-27', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2028-02-28', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2028-05-05', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2028-05-06', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2028-05-07', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2028-05-08', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2029
  { date: '2029-02-14', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2029-02-15', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2029-02-16', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2029-04-24', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2029-04-25', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2029-04-26', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2029-04-27', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2030
  { date: '2030-02-04', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2030-02-05', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2030-02-06', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2030-04-13', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2030-04-14', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2030-04-15', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2030-04-16', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2031
  { date: '2031-01-24', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2031-01-25', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2031-01-26', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2031-04-02', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2031-04-03', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2031-04-04', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2031-04-05', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2032
  { date: '2032-01-14', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2032-01-15', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2032-01-16', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2032-03-22', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2032-03-23', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2032-03-24', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2032-03-25', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2033
  { date: '2033-01-02', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2033-01-03', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2033-01-04', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2033-03-11', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2033-03-12', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2033-03-13', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2033-03-14', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2034
  { date: '2034-12-12', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2034-12-13', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2034-12-14', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2034-03-01', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2034-03-02', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2034-03-03', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2034-03-04', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },

  // 2035
  { date: '2035-12-01', name: 'Ramazan Bayramı 1. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2035-12-02', name: 'Ramazan Bayramı 2. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2035-12-03', name: 'Ramazan Bayramı 3. Gün', type: 'religious', shortName: 'Ramazan' },
  { date: '2035-02-18', name: 'Kurban Bayramı 1. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2035-02-19', name: 'Kurban Bayramı 2. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2035-02-20', name: 'Kurban Bayramı 3. Gün', type: 'religious', shortName: 'Kurban' },
  { date: '2035-02-21', name: 'Kurban Bayramı 4. Gün', type: 'religious', shortName: 'Kurban' },
];

// Resmi tatilleri hesapla
export function getOfficialHolidays(year: number): Holiday[] {
  return [
    {
      date: `${year}-01-01`,
      name: "Yılbaşı",
      type: "official",
      shortName: "Yılbaşı"
    },
    {
      date: `${year}-04-23`,
      name: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
      type: "official",
      shortName: "23 Nisan"
    },
    {
      date: `${year}-05-01`,
      name: "1 Mayıs Emek ve Dayanışma Günü",
      type: "official",
      shortName: "1 Mayıs"
    },
    {
      date: `${year}-05-19`,
      name: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı",
      type: "official",
      shortName: "19 Mayıs"
    },
    {
      date: `${year}-07-15`,
      name: "15 Temmuz Demokrasi ve Milli Birlik Günü",
      type: "official",
      shortName: "15 Temmuz"
    },
    {
      date: `${year}-08-30`,
      name: "30 Ağustos Zafer Bayramı",
      type: "official",
      shortName: "30 Ağustos"
    },
    {
      date: `${year}-10-29`,
      name: "29 Ekim Cumhuriyet Bayramı",
      type: "official",
      shortName: "29 Ekim"
    }
  ];
}

// Dini tatilleri sabit tarihlerden getir
export function getReligiousHolidays(gregorianYear: number): Holiday[] {
  console.log(`📅 ${gregorianYear} yılı için sabit dini tatiller getiriliyor...`);
  
  const yearHolidays = RELIGIOUS_HOLIDAYS_DATA.filter(holiday => 
    holiday.date.startsWith(gregorianYear.toString())
  );
  
  console.log(`✅ ${gregorianYear} yılı için ${yearHolidays.length} dini tatil bulundu:`, yearHolidays);
  return yearHolidays;
}

// Tüm tatilleri getir
export function getAllHolidays(year: number): Holiday[] {
  const official = getOfficialHolidays(year);
  const religious = getReligiousHolidays(year);
  
  return [...official, ...religious].sort((a, b) => a.date.localeCompare(b.date));
}

// Belirli bir tarihin tatil olup olmadığını kontrol et
export function isHoliday(date: Date): Holiday | null {
  const year = date.getFullYear();
  const dateKey = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  
  const holidays = getAllHolidays(year);
  return holidays.find(holiday => holiday.date === dateKey) || null;
}

// Tatil tipine göre renk sınıfı döndür
export function getHolidayColorClass(holiday: Holiday): string {
  if (holiday.type === 'religious') {
    return 'bg-green-100 text-green-700'; // Dini tatiller yeşil
  } else {
    return 'bg-red-100 text-red-700'; // Resmi tatiller kırmızı
  }
}
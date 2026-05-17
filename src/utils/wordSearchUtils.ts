
export interface WordLocation {
  word: string;
  start: [number, number];
  end: [number, number];
  found: boolean;
}

export const generateWordSearch = (size: number, words: string[]): { grid: string[][], locations: WordLocation[] } => {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const locations: WordLocation[] = [];

  const directions: [number, number][] = [
    [0, 1],   // Horizontal
    [1, 0],   // Vertical
    [1, 1],   // Diagonal Down-Right
    [-1, 1],  // Diagonal Up-Right
    [0, -1],  // Horizontal Reverse
    [-1, 0],  // Vertical Reverse
    [-1, -1], // Diagonal Up-Left
    [1, -1],  // Diagonal Down-Left
  ];

  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);

      if (canPlace(grid, word, startR, startC, dir)) {
        const endR = startR + dir[0] * (word.length - 1);
        const endC = startC + dir[1] * (word.length - 1);
        
        for (let i = 0; i < word.length; i++) {
          grid[startR + dir[0] * i][startC + dir[1] * i] = word[i].toUpperCase();
        }
        
        locations.push({
          word: word.toUpperCase(),
          start: [startR, startC],
          end: [endR, endC],
          found: false
        });
        placed = true;
      }
      attempts++;
    }
  }

  // Fill remaining spots with random letters or decoys
  const letters = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        // %15 ihtimalle mevcut kelimelerden birinin ilk 2-3 harfini koy (şaşırtma için)
        if (Math.random() < 0.15 && locations.length > 0) {
          const randomLoc = locations[Math.floor(Math.random() * locations.length)];
          grid[r][c] = randomLoc.word[Math.floor(Math.random() * Math.min(3, randomLoc.word.length))];
        } else {
          grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
  }

  return { grid, locations };
};

const canPlace = (grid: string[][], word: string, r: number, c: number, dir: [number, number]): boolean => {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const nextR = r + dir[0] * i;
    const nextC = c + dir[1] * i;
    if (nextR < 0 || nextR >= size || nextC < 0 || nextC >= size) return false;
    if (grid[nextR][nextC] !== '' && grid[nextR][nextC] !== word[i].toUpperCase()) return false;
  }
  return true;
};

// Kelime Fabrikası: Kökler ve Ekler
const ROOTS = {
  science: ['BİLİM', 'DENEY', 'GÖZLEM', 'HİPOTEZ', 'ATOM', 'HÜCRE', 'UZAY', 'EVREN', 'TEKNİK', 'BİLGİ'],
  philosophy: ['VARLIK', 'AKIL', 'BİLGİ', 'ERDEM', 'DOĞRU', 'İNSAN', 'EVREN', 'DÜŞÜNCE', 'MANTIK', 'TÖRE'],
  nature: ['DOĞA', 'CANLI', 'ÇEVRE', 'DENİZ', 'ORMAN', 'TOPRAK', 'HAVA', 'GÜNEŞ', 'YAŞAM', 'DÜNYA'],
  social: ['TOPLUM', 'BİREY', 'HUKUK', 'SİYASET', 'KÜLTÜR', 'SANAT', 'TARİH', 'DİL', 'YAPI', 'DÜZEN']
};

const SUFFIXES = ['SEL', 'CİL', 'LİK', 'SİZ', 'DAŞ', 'LEŞ', 'GEL', 'Gİ', 'SEL', 'ER'];

/**
 * Algoritmik Kelime Üretici
 * Belirli kökleri ve ekleri Türkçe dil bilgisi kurallarına (basitleştirilmiş) göre birleştirir.
 */
export const generateRandomWords = (count: number): string[] => {
  const generatedWords = new Set<string>();
  const categories = Object.keys(ROOTS) as (keyof typeof ROOTS)[];

  while (generatedWords.size < count) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const roots = ROOTS[category];
    const root = roots[Math.floor(Math.random() * roots.length)];
    
    // %50 ihtimalle ek ekle
    if (Math.random() > 0.5) {
      const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
      let combined = root + suffix;
      
      // Bazı basit Türkçe uyum kuralları
      if (root.endsWith('İ') && suffix.startsWith('S')) combined = root + 'SEL';
      if (root.endsWith('M')) combined = root + 'SEL';
      
      generatedWords.add(combined);
    } else {
      generatedWords.add(root);
    }
  }

  return Array.from(generatedWords);
};

// Eski listeyi yedek olarak tut ama jeneratörü kullanacağız
export const ADULT_TURKISH_WORDS = [
  'TEKNOLOJİ', 'FELSEFE', 'EDEBİYAT', 'PSİKOLOJİ', 'STRATEJİ',
  'EKONOMİ', 'SİYASET', 'BİYOLOJİ', 'ARKEOLOJİ', 'MİMARİ',
  'ESTETİK', 'DİYALEKTİK', 'METAFİZİK', 'SOSYOLOJİ', 'ANTROPOLOJİ'
];


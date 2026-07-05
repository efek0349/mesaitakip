import React, { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storageUtils';

type Theme = 'light' | 'dark';
export type Win95Font = 'pixel' | 'system';
export type FontScale = 'small' | 'medium' | 'large' | 'xlarge';

// Yazı boyutu ölçekleri: <html> kök font-size'ını değiştirir. Uygulama genelinde
// yazı tipi boyutları rem birimiyle tanımlandığı için (bkz. text-[0.625rem] gibi
// px'ten rem'e çevrilmiş sınıflar) kök boyut değiştiğinde TÜM metinler orantılı
// olarak büyür/küçülür — Android'in kendi "yazı tipi boyutu" ayarından bağımsız,
// uygulamanın kendi iç ölçeği.
export const FONT_SCALE_PERCENT: Record<FontScale, number> = {
  small: 87.5,
  medium: 100,
  large: 112.5,
  xlarge: 125,
};

/**
 * Win95 modu: Tailwind tasarımının üzerine binen, açılıp kapanabilen
 * alternatif görünüm. Win95 açıkken her zaman klasik/açık renklerle görünür —
 * Koyu varyant kaldırıldı (yeterince iyi görünmüyordu). Win95 kapalıyken
 * theme, normal Tailwind dark/light tasarımını kontrol etmeye devam eder.
 *
 * win95Font: Win95'in orijinal piksel fontu (ms_sans_serif, React95
 * GlobalStyle ile gelir) bazı sembolleri düzgün render etmiyor ve herkesin
 * zevkine uygun olmayabilir. 'system' seçeneği bunu cihazın normal arayüz
 * fontuna (-apple-system/Segoe UI/Roboto) çevirir — Win95'in pencere/buton/
 * bevel görünümü olduğu gibi kalır, sadece yazı tipi değişir.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Hızlı boot için önce localStorage'dan al
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    // Sistem tercihini kontrol et
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [win95Enabled, setWin95Enabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('win95Enabled');
    // Kayıt yoksa (ilk yükleme) varsayılan olarak Win95 teması açık gelsin
    return saved === null ? true : saved === 'true';
  });

  const [win95Font, setWin95FontState] = useState<Win95Font>(() => {
    const saved = localStorage.getItem('win95Font');
    return saved === 'system' ? 'system' : 'pixel';
  });

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    const saved = localStorage.getItem('fontScale');
    return (saved === 'small' || saved === 'medium' || saved === 'large' || saved === 'xlarge') ? saved : 'medium';
  });

  // Preferences'tan yükle (Kalıcı depolama)
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await storage.get('theme') as Theme;
        if (savedTheme && savedTheme !== theme) {
          setTheme(savedTheme);
        }
        const savedWin95 = await storage.get('win95Enabled');
        if (savedWin95 !== null) {
          setWin95Enabled(savedWin95 === 'true');
        }
        const savedFont = await storage.get('win95Font');
        if (savedFont === 'system' || savedFont === 'pixel') {
          setWin95FontState(savedFont);
        }
        const savedFontScale = await storage.get('fontScale');
        if (savedFontScale === 'small' || savedFontScale === 'medium' || savedFontScale === 'large' || savedFontScale === 'xlarge') {
          setFontScaleState(savedFontScale);
        }
      } catch (error) {
        console.error('Tema yükleme hatası:', error);
      }
    };
    loadTheme();
  }, []);

  // Tema değişikliğini uygula ve kaydet
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#000000');
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'dark');
    } else {
      root.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#3B82F6');
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'light');
    }

    const saveTheme = async () => {
      try {
        await storage.set('theme', theme);
        localStorage.setItem('theme', theme);
      } catch (error) {
        console.error('Tema kaydetme hatası:', error);
      }
    };
    saveTheme();
  }, [theme]);

  // Win95 modu değişikliğini uygula ve kaydet
  useEffect(() => {
    const root = window.document.documentElement;

    if (win95Enabled) {
      root.classList.add('win95-mode');
    } else {
      root.classList.remove('win95-mode');
    }

    const saveWin95 = async () => {
      try {
        await storage.set('win95Enabled', String(win95Enabled));
        localStorage.setItem('win95Enabled', String(win95Enabled));
      } catch (error) {
        console.error('Win95 modu kaydetme hatası:', error);
      }
    };
    saveWin95();
  }, [win95Enabled]);

  // Win95 font tercihini uygula ve kaydet
  useEffect(() => {
    const root = window.document.documentElement;

    if (win95Font === 'system') {
      root.classList.add('win95-font-system');
    } else {
      root.classList.remove('win95-font-system');
    }

    const saveFont = async () => {
      try {
        await storage.set('win95Font', win95Font);
        localStorage.setItem('win95Font', win95Font);
      } catch (error) {
        console.error('Font tercihi kaydetme hatası:', error);
      }
    };
    saveFont();
  }, [win95Font]);

  // Yazı boyutu ölçeğini uygula ve kaydet.
  //
  // EK: Yatay (landscape) + dar genişlik (örn. telefon döndürülünce) durumunda
  // Takvim/Özet artık 2 sütun yan yana diziliyor (bkz. App.tsx `landscape:grid`).
  // Sütun genişliği yarıya indiği halde butonlar/ikonlar/paddingler hâlâ TAM
  // genişlik için tasarlanmış rem boyutlarında kaldığı için orantısız/"çok
  // büyük" görünüyorlardı. Uygulamadaki neredeyse tüm boyutlar (Tailwind
  // sınıfları VE Win95'teki `fontSize: '0.625rem'` gibi inline stiller) rem
  // birimiyle tanımlı olduğundan, kök font-size'ı bu durumda ek bir çarpanla
  // biraz küçültmek — kullanıcının FontScale tercihine dokunmadan — TÜM
  // boyutları orantılı şekilde küçültüp sütuna sığdırıyor. Sadece dar
  // (telefon) landscape'te devreye giriyor; geniş masaüstü/tablet
  // landscape'inde sütun zaten yeterince geniş olduğu için çarpan 1 kalıyor.
  useEffect(() => {
    const root = window.document.documentElement;

    const NARROW_VW = 700;   // bu genişlikte/altında en dar telefonlar (örn. iPhone SE landscape)
    const WIDE_VW = 1000;    // bu genişlikte/üstünde küçültme uygulanmaz (tablet/masaüstü)
    const MIN_LANDSCAPE_SCALE = 0.85;

    const getLandscapeScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isLandscape = vw > vh;
      if (!isLandscape || vw >= WIDE_VW) return 1;
      if (vw <= NARROW_VW) return MIN_LANDSCAPE_SCALE;
      const t = (vw - NARROW_VW) / (WIDE_VW - NARROW_VW);
      return MIN_LANDSCAPE_SCALE + t * (1 - MIN_LANDSCAPE_SCALE);
    };

    const applyFontSize = () => {
      const combined = FONT_SCALE_PERCENT[fontScale] * getLandscapeScale();
      root.style.fontSize = `${combined}%`;
    };

    applyFontSize();
    window.addEventListener('resize', applyFontSize);
    window.addEventListener('orientationchange', applyFontSize);

    const saveFontScale = async () => {
      try {
        await storage.set('fontScale', fontScale);
        localStorage.setItem('fontScale', fontScale);
      } catch (error) {
        console.error('Yazı boyutu kaydetme hatası:', error);
      }
    };
    saveFontScale();

    return () => {
      window.removeEventListener('resize', applyFontSize);
      window.removeEventListener('orientationchange', applyFontSize);
    };
  }, [fontScale]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const setThemeDirectly = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  const toggleWin95 = useCallback(() => {
    setWin95Enabled(prev => !prev);
  }, []);

  const setWin95 = useCallback((enabled: boolean) => {
    setWin95Enabled(enabled);
  }, []);

  const setWin95Font = useCallback((font: Win95Font) => {
    setWin95FontState(font);
  }, []);

  const setFontScale = useCallback((scale: FontScale) => {
    setFontScaleState(scale);
  }, []);

  return {
    theme,
    setTheme: setThemeDirectly,
    toggleTheme,
    win95Enabled,
    toggleWin95,
    setWin95,
    win95Font,
    setWin95Font,
    fontScale,
    setFontScale,
  };
};

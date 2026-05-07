import React from 'react';

type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = React.useState<Theme>(() => {
    // Başlangıç temasını localStorage'dan veya sistem tercihinden al
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

  React.useEffect(() => {
    const root = window.document.documentElement;
    
    // Mevcut temaya göre <html> elementine class ekle/kaldır
    if (theme === 'dark') {
      root.classList.add('dark');
      // Meta etiketlerini güncelle
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#000000');
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'dark');
    } else {
      root.classList.remove('dark');
      // Meta etiketlerini güncelle
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#3B82F6');
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'light');
    }

    // Tema değişikliğini localStorage'a kaydet
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
};

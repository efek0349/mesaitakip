import React, { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storageUtils';

type Theme = 'light' | 'dark';

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

  // Preferences'tan yükle (Kalıcı depolama)
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await storage.get('theme') as Theme;
        if (savedTheme && savedTheme !== theme) {
          setTheme(savedTheme);
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

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, toggleTheme };
};

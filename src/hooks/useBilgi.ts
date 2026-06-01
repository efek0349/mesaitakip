import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storageUtils';

const BILGI_URL = 'https://efek0349.github.io/mesaitakip/bilgi.md';
const CACHE_KEY = 'bilgi_md_cache';
const CACHE_TIME_KEY = 'bilgi_md_cache_time';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 saat

interface UseBilgiReturn {
  content: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

export const useBilgi = (): UseBilgiReturn => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBilgi = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    // Cache kontrolü
    if (!forceRefresh) {
      try {
        const cached = await storage.get(CACHE_KEY);
        const cachedTime = await storage.get(CACHE_TIME_KEY);
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          if (age < CACHE_TTL_MS) {
            setContent(cached);
            setLastUpdated(new Date(parseInt(cachedTime)));
            setLoading(false);
            return;
          }
        }
      } catch {
        // Cache okunamazsa devam et, fetch yap
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${BILGI_URL}?t=${Date.now()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();

      await storage.set(CACHE_KEY, text);
      await storage.set(CACHE_TIME_KEY, String(Date.now()));

      setContent(text);
      setLastUpdated(new Date());
    } catch (err) {
      clearTimeout(timeout);

      // Hata durumunda cache'den göster
      try {
        const cached = await storage.get(CACHE_KEY);
        if (cached) {
          setContent(cached);
          const cachedTime = await storage.get(CACHE_TIME_KEY);
          if (cachedTime) setLastUpdated(new Date(parseInt(cachedTime)));
          setLoading(false);
          return;
        }
      } catch {
        // Cache de yoksa hata göster
      }

      setError('İçerik yüklenemedi. İnternet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilgi();
  }, [fetchBilgi]);

  return {
    content,
    loading,
    error,
    refresh: () => fetchBilgi(true),
    lastUpdated,
  };
};

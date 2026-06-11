import { useState, useEffect, useCallback } from 'react';
import { Holiday } from '../types/overtime';
import { storage } from '../utils/storageUtils';
import { FALLBACK_RELIGIOUS_HOLIDAYS } from '../utils/holidayUtils';
import { EventEmitter } from '../utils/EventEmitter';

const DINI_URL = 'https://efek0349.github.io/mesaitakip/dini.json';
const CACHE_KEY = 'dini_holidays_cache';
const CACHE_TIME_KEY = 'dini_holidays_cache_time';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün — bayramlar sık değişmez

interface DiniJsonData {
  version: number;
  updated: string;
  holidays: Holiday[];
}

interface UseDiniHolidaysReturn {
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

// Global state for sharing across hook instances
let sharedHolidays: Holiday[] = FALLBACK_RELIGIOUS_HOLIDAYS;
let sharedLoading = false;
let sharedError: string | null = null;
let sharedLastUpdated: Date | null = null;
let isInitialized = false;
let fetchPromise: Promise<void> | null = null;

const diniEmitter = new EventEmitter();

const validateHoliday = (h: unknown): h is Holiday => {
  if (!h || typeof h !== 'object') return false;
  const obj = h as Record<string, unknown>;
  return (
    typeof obj.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.date) &&
    typeof obj.name === 'string' &&
    (obj.type === 'religious' || obj.type === 'official') &&
    typeof obj.shortName === 'string'
  );
};

const fetchDiniData = async (forceRefresh = false) => {
  if (fetchPromise && !forceRefresh) return fetchPromise;
  
  fetchPromise = (async () => {
    sharedLoading = true;
    sharedError = null;
    diniEmitter.emit();

    // Cache kontrolü
    if (!forceRefresh) {
      try {
        const cached = await storage.get(CACHE_KEY);
        const cachedTime = await storage.get(CACHE_TIME_KEY);
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          if (age < CACHE_TTL_MS) {
            const parsed: DiniJsonData = JSON.parse(cached);
            const valid = parsed.holidays.filter(validateHoliday);
            if (valid.length > 0) {
              sharedHolidays = valid;
              sharedLastUpdated = new Date(parseInt(cachedTime));
              sharedLoading = false;
              diniEmitter.emit();
              return;
            }
          }
        }
      } catch {
        // Cache okunamazsa devam et, fetch yap
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${DINI_URL}?t=${Date.now()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: DiniJsonData = await res.json();

      if (!Array.isArray(data.holidays)) {
        throw new Error('Geçersiz veri formatı');
      }

      const valid = data.holidays.filter(validateHoliday);
      if (valid.length === 0) throw new Error('Geçerli tatil verisi bulunamadı');

      await storage.set(CACHE_KEY, JSON.stringify(data));
      await storage.set(CACHE_TIME_KEY, String(Date.now()));

      sharedHolidays = valid;
      sharedLastUpdated = new Date();
    } catch (err) {
      clearTimeout(timeout);

      try {
        const cached = await storage.get(CACHE_KEY);
        if (cached) {
          const parsed: DiniJsonData = JSON.parse(cached);
          const valid = parsed.holidays.filter(validateHoliday);
          if (valid.length > 0) {
            sharedHolidays = valid;
            const cachedTime = await storage.get(CACHE_TIME_KEY);
            if (cachedTime) sharedLastUpdated = new Date(parseInt(cachedTime));
            sharedLoading = false;
            diniEmitter.emit();
            return;
          }
        }
      } catch {
        // Fallback
      }

      sharedError = 'Dini bayram verileri güncellenemedi. Yerleşik veriler kullanılıyor.';
    } finally {
      sharedLoading = false;
      fetchPromise = null;
      isInitialized = true;
      diniEmitter.emit();
    }
  })();

  return fetchPromise;
};

export const useDiniHolidays = (): UseDiniHolidaysReturn => {
  const [state, setState] = useState({
    holidays: sharedHolidays,
    loading: sharedLoading,
    error: sharedError,
    lastUpdated: sharedLastUpdated
  });

  useEffect(() => {
    const unsubscribe = diniEmitter.subscribe(() => {
      setState({
        holidays: sharedHolidays,
        loading: sharedLoading,
        error: sharedError,
        lastUpdated: sharedLastUpdated
      });
    });

    if (!isInitialized && !sharedLoading) {
      fetchDiniData();
    }

    return unsubscribe;
  }, []);

  const refresh = useCallback(() => {
    fetchDiniData(true);
  }, []);

  return {
    ...state,
    refresh
  };
};

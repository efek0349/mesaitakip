import { useState, useEffect, useCallback } from 'react';
import { Holiday } from '../types/overtime';
import { storage } from '../utils/storageUtils';
import { FALLBACK_OFFICIAL_HOLIDAYS } from '../utils/holidayUtils';
import { EventEmitter } from '../utils/EventEmitter';

const RESMI_URL = 'https://mesaitakip.github.io/resmi.json';
const CACHE_KEY = 'resmi_holidays_cache';
const CACHE_TIME_KEY = 'resmi_holidays_cache_time';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün — resmi tatiller sık değişmez

interface ResmiJsonData {
  version: number;
  updated: string;
  holidays: Holiday[];
}

interface UseResmiHolidaysReturn {
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

// Global state for sharing across hook instances
let sharedHolidays: Holiday[] = FALLBACK_OFFICIAL_HOLIDAYS;
let sharedLoading = false;
let sharedError: string | null = null;
let sharedLastUpdated: Date | null = null;
let isInitialized = false;
let fetchPromise: Promise<void> | null = null;

const resmiEmitter = new EventEmitter();

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

const fetchResmiData = async (forceRefresh = false) => {
  if (fetchPromise && !forceRefresh) return fetchPromise;

  fetchPromise = (async () => {
    sharedLoading = true;
    sharedError = null;
    resmiEmitter.emit();

    // Cache kontrolü
    if (!forceRefresh) {
      try {
        const cached = await storage.get(CACHE_KEY);
        const cachedTime = await storage.get(CACHE_TIME_KEY);
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          if (age < CACHE_TTL_MS) {
            const parsed: ResmiJsonData = JSON.parse(cached);
            const valid = parsed.holidays.filter(validateHoliday);
            if (valid.length > 0) {
              sharedHolidays = valid;
              sharedLastUpdated = new Date(parseInt(cachedTime));
              sharedLoading = false;
              resmiEmitter.emit();
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
      const res = await fetch(`${RESMI_URL}?t=${Date.now()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ResmiJsonData = await res.json();

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
          const parsed: ResmiJsonData = JSON.parse(cached);
          const valid = parsed.holidays.filter(validateHoliday);
          if (valid.length > 0) {
            sharedHolidays = valid;
            const cachedTime = await storage.get(CACHE_TIME_KEY);
            if (cachedTime) sharedLastUpdated = new Date(parseInt(cachedTime));
            sharedLoading = false;
            resmiEmitter.emit();
            return;
          }
        }
      } catch {
        // Fallback
      }

      sharedError = 'Resmi tatil verileri güncellenemedi. Yerleşik veriler kullanılıyor.';
    } finally {
      sharedLoading = false;
      fetchPromise = null;
      isInitialized = true;
      resmiEmitter.emit();
    }
  })();

  return fetchPromise;
};

export const useResmiHolidays = (): UseResmiHolidaysReturn => {
  const [state, setState] = useState({
    holidays: sharedHolidays,
    loading: sharedLoading,
    error: sharedError,
    lastUpdated: sharedLastUpdated
  });

  useEffect(() => {
    const unsubscribe = resmiEmitter.subscribe(() => {
      setState({
        holidays: sharedHolidays,
        loading: sharedLoading,
        error: sharedError,
        lastUpdated: sharedLastUpdated
      });
    });

    if (!isInitialized && !sharedLoading) {
      fetchResmiData();
    }

    return unsubscribe;
  }, []);

  const refresh = useCallback(() => {
    fetchResmiData(true);
  }, []);

  return {
    ...state,
    refresh
  };
};

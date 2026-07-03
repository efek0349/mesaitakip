import { useState, useEffect, useCallback } from 'react';
import { Holiday } from '../types/overtime';
import { storage } from '../utils/storageUtils';
import { EventEmitter } from '../utils/EventEmitter';

const CUSTOM_KEY = 'custom_holidays';

interface UseCustomHolidaysReturn {
  holidays: Holiday[];
  loading: boolean;
  addHoliday: (holiday: Holiday) => Promise<{ success: boolean; message: string }>;
  updateHoliday: (oldDate: string, holiday: Holiday) => Promise<{ success: boolean; message: string }>;
  removeHoliday: (date: string) => Promise<void>;
}

// Global state for sharing across hook instances (Calendar, MonthlyStats, modals vb.)
let sharedHolidays: Holiday[] = [];
let sharedLoading = true;
let isInitialized = false;

const customEmitter = new EventEmitter();

const validateHoliday = (h: unknown): h is Holiday => {
  if (!h || typeof h !== 'object') return false;
  const obj = h as Record<string, unknown>;
  return (
    typeof obj.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.date) &&
    typeof obj.name === 'string' &&
    obj.name.trim().length > 0 &&
    (obj.type === 'religious' || obj.type === 'official') &&
    typeof obj.shortName === 'string' &&
    obj.shortName.trim().length > 0
  );
};

const persist = async (holidays: Holiday[]) => {
  await storage.set(CUSTOM_KEY, JSON.stringify(holidays));
};

const loadCustomHolidays = async () => {
  sharedLoading = true;
  customEmitter.emit();
  try {
    const cached = await storage.get(CUSTOM_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        sharedHolidays = parsed.filter(validateHoliday);
      }
    }
  } catch {
    // Bozuk veri varsa boş listeyle devam et
    sharedHolidays = [];
  } finally {
    sharedLoading = false;
    isInitialized = true;
    customEmitter.emit();
  }
};

/**
 * Kullanıcının ayarlar > Veri Yönetimi > Özel Günler bölümünden
 * manuel olarak eklediği dini/resmi tatilleri yönetir.
 * Bu liste, online kaynaklardan (dini.json / resmi.json) gelen veriyle
 * birlikte getAllHolidays() içinde birleştirilir; aynı tarihte çakışma
 * olursa kullanıcının manuel girdiği gün önceliklidir.
 */
export const useCustomHolidays = (): UseCustomHolidaysReturn => {
  const [state, setState] = useState({
    holidays: sharedHolidays,
    loading: sharedLoading,
  });

  useEffect(() => {
    const unsubscribe = customEmitter.subscribe(() => {
      setState({ holidays: sharedHolidays, loading: sharedLoading });
    });

    if (!isInitialized) {
      loadCustomHolidays();
    }

    return unsubscribe;
  }, []);

  const addHoliday = useCallback(async (holiday: Holiday): Promise<{ success: boolean; message: string }> => {
    if (!validateHoliday(holiday)) {
      return { success: false, message: 'Lütfen tüm alanları geçerli şekilde doldurun.' };
    }

    const withoutSameDate = sharedHolidays.filter(h => h.date !== holiday.date);
    const updated = [...withoutSameDate, holiday].sort((a, b) => a.date.localeCompare(b.date));

    sharedHolidays = updated;
    customEmitter.emit();

    try {
      await persist(updated);
      return { success: true, message: 'Özel gün eklendi.' };
    } catch {
      return { success: false, message: 'Kaydedilirken bir hata oluştu.' };
    }
  }, []);

  const updateHoliday = useCallback(async (oldDate: string, holiday: Holiday): Promise<{ success: boolean; message: string }> => {
    if (!validateHoliday(holiday)) {
      return { success: false, message: 'Lütfen tüm alanları geçerli şekilde doldurun.' };
    }

    // Eski kaydı çıkar; tarih değişmiş olabileceği için yeni tarihte zaten
    // bir kayıt varsa onu da çıkarıp yerine güncelleneni koyuyoruz.
    const withoutOldAndNewDate = sharedHolidays.filter(h => h.date !== oldDate && h.date !== holiday.date);
    const updated = [...withoutOldAndNewDate, holiday].sort((a, b) => a.date.localeCompare(b.date));

    sharedHolidays = updated;
    customEmitter.emit();

    try {
      await persist(updated);
      return { success: true, message: 'Özel gün güncellendi.' };
    } catch {
      return { success: false, message: 'Güncellenirken bir hata oluştu.' };
    }
  }, []);

  const removeHoliday = useCallback(async (date: string) => {
    const updated = sharedHolidays.filter(h => h.date !== date);
    sharedHolidays = updated;
    customEmitter.emit();
    try {
      await persist(updated);
    } catch {
      // sessizce geç — bir sonraki yüklemede eski hali tekrar gelebilir
    }
  }, []);

  return {
    ...state,
    addHoliday,
    updateHoliday,
    removeHoliday,
  };
};

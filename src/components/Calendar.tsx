import React from 'react';
import { CalendarTailwind } from './CalendarTailwind';
import { CalendarWin95 } from './win95/CalendarWin95';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
  win95Enabled: boolean;
}

/**
 * Calendar — router component.
 *
 * win95Enabled PROP'una göre CalendarTailwind veya CalendarWin95'i render eder.
 * Tüm veri/hesaplama mantığı useCalendarLogic.ts'te PAYLAŞILIYOR — burada
 * sadece görsel katman seçimi yapılıyor.
 *
 * win95Enabled bilgisi App.tsx'ten PROP olarak geliyor — burada tekrar
 * useTheme() ÇAĞRILMIYOR. Sebep: useTheme kendi useState'lerini barındıran
 * bir hook; App.tsx ve Calendar.tsx'te ayrı ayrı çağrılırsa iki bağımsız
 * state kopyası oluşur (ikisi de localStorage'dan okur ama birbirinden
 * senkron olmayabilir) — bu React'te klasik bir "duplicate state" hatasıdır.
 * Tek doğruluk kaynağı App.tsx'teki useTheme() çağrısı olmalı.
 */
export const Calendar: React.FC<CalendarProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <CalendarWin95 {...props} />;
  }

  return <CalendarTailwind {...props} />;
};

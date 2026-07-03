import React from 'react';
import { MonthlyStatsTailwind } from './MonthlyStatsTailwind';
import { MonthlyStatsWin95 } from './win95/MonthlyStatsWin95';

interface MonthlyStatsProps {
  currentDate: Date;
  onOpenSettings: () => void;
  onOpenDataBackup: () => void;
  win95Enabled: boolean;
}

/**
 * MonthlyStats — router component.
 * win95Enabled PROP'una göre MonthlyStatsTailwind veya MonthlyStatsWin95'i
 * render eder. Tüm hesaplama mantığı useMonthlyStatsLogic.ts'te PAYLAŞILIYOR.
 */
export const MonthlyStats: React.FC<MonthlyStatsProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <MonthlyStatsWin95 {...props} />;
  }
  return <MonthlyStatsTailwind {...props} />;
};

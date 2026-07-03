import React from 'react';
import { SettingsTailwind } from './SettingsTailwind';
import { SettingsWin95 } from './win95/SettingsWin95';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  win95Enabled: boolean;
}

/**
 * Settings — router component.
 * win95Enabled PROP'una göre SettingsTailwind veya SettingsWin95'i render
 * eder. Tüm form mantığı useSettingsLogic.ts'te PAYLAŞILIYOR.
 */
export const Settings: React.FC<SettingsProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <SettingsWin95 {...props} />;
  }
  return <SettingsTailwind {...props} />;
};

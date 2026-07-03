import React from 'react';
import { OvertimeModalTailwind } from './OvertimeModalTailwind';
import { OvertimeModalWin95 } from './win95/OvertimeModalWin95';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  win95Enabled: boolean;
}

/**
 * OvertimeModal — router component.
 * win95Enabled PROP'una göre OvertimeModalTailwind veya OvertimeModalWin95'i
 * render eder. Tüm form mantığı useOvertimeModalLogic.ts'te PAYLAŞILIYOR.
 * useTheme() burada TEKRAR ÇAĞRILMIYOR (bkz. Calendar.tsx'teki aynı not) —
 * win95Enabled App.tsx'ten prop olarak geliyor, tek doğruluk kaynağı korunur.
 */
export const OvertimeModal: React.FC<OvertimeModalProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <OvertimeModalWin95 {...props} />;
  }
  return <OvertimeModalTailwind {...props} />;
};

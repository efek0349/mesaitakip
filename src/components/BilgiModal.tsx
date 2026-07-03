import React from 'react';
import { BilgiModalTailwind } from './BilgiModalTailwind';
import { BilgiModalWin95 } from './win95/BilgiModalWin95';

interface BilgiModalProps {
  isOpen: boolean;
  onClose: () => void;
  win95Enabled: boolean;
}

export const BilgiModal: React.FC<BilgiModalProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <BilgiModalWin95 {...props} />;
  }
  return <BilgiModalTailwind {...props} />;
};

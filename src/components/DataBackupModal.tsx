import React from 'react';
import { DataBackupModalTailwind } from './DataBackupModalTailwind';
import { DataBackupModalWin95 } from './win95/DataBackupModalWin95';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
  win95Enabled: boolean;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <DataBackupModalWin95 {...props} />;
  }
  return <DataBackupModalTailwind {...props} />;
};

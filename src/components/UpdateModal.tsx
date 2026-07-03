import React from 'react';
import { UpdateModalTailwind } from './UpdateModalTailwind';
import { UpdateModalWin95 } from './win95/UpdateModalWin95';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onDownload: () => void;
  win95Enabled: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <UpdateModalWin95 {...props} />;
  }
  return <UpdateModalTailwind {...props} />;
};

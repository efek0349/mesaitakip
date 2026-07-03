import React from 'react';
import { AboutModalTailwind } from './AboutModalTailwind';
import { AboutModalWin95 } from './win95/AboutModalWin95';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  win95Enabled: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({ win95Enabled, ...props }) => {
  if (win95Enabled) {
    return <AboutModalWin95 {...props} />;
  }
  return <AboutModalTailwind {...props} />;
};

import React from 'react';
import { BilgiPanelTailwind } from './BilgiPanelTailwind';
import { BilgiPanelWin95 } from './win95/BilgiPanelWin95';

interface BilgiPanelProps {
  win95Enabled: boolean;
}

export const BilgiPanel: React.FC<BilgiPanelProps> = ({ win95Enabled }) => {
  if (win95Enabled) {
    return <BilgiPanelWin95 />;
  }
  return <BilgiPanelTailwind />;
};

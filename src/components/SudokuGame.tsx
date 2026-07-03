import React from 'react';
import SudokuGameTailwind from './SudokuGameTailwind';
import SudokuGameWin95 from './win95/SudokuGameWin95';

interface SudokuGameProps {
  win95Enabled?: boolean;
}

const SudokuGame: React.FC<SudokuGameProps> = ({ win95Enabled = false }) => {
  if (win95Enabled) {
    return <SudokuGameWin95 />;
  }
  return <SudokuGameTailwind />;
};

export default SudokuGame;

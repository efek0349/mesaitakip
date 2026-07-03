import React from 'react';
import WordSearchGameTailwind from './WordSearchGameTailwind';
import WordSearchGameWin95 from './win95/WordSearchGameWin95';

interface WordSearchGameProps {
  win95Enabled?: boolean;
}

const WordSearchGame: React.FC<WordSearchGameProps> = ({ win95Enabled = false }) => {
  if (win95Enabled) {
    return <WordSearchGameWin95 />;
  }
  return <WordSearchGameTailwind />;
};

export default WordSearchGame;

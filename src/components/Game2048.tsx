import React from 'react';
import Game2048Tailwind from './Game2048Tailwind';
import Game2048Win95 from './win95/Game2048Win95';

interface Game2048Props {
  win95Enabled?: boolean;
}

const Game2048: React.FC<Game2048Props> = ({ win95Enabled = false }) => {
  if (win95Enabled) {
    return <Game2048Win95 />;
  }
  return <Game2048Tailwind />;
};

export default Game2048;

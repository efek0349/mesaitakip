import React from 'react';
import { ArrowUp, ArrowLeft, ArrowDown, ArrowRight, RotateCcw } from 'lucide-react';
import { useGame2048Logic } from '../hooks/useGame2048Logic';

const Tile: React.FC<{ value: number }> = ({ value }) => {
  const getColor = (val: number) => {
    switch (val) {
      case 2: return 'bg-gray-200 text-gray-800';
      case 4: return 'bg-gray-300 text-gray-800';
      case 8: return 'bg-orange-300 text-white';
      case 16: return 'bg-orange-400 text-white';
      case 32: return 'bg-orange-500 text-white';
      case 64: return 'bg-red-500 text-white';
      case 128: return 'bg-yellow-400 text-white';
      case 256: return 'bg-yellow-500 text-white';
      case 512: return 'bg-yellow-600 text-white';
      case 1024: return 'bg-indigo-400 text-white';
      case 2048: return 'bg-indigo-600 text-white';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className={`w-12 h-12 flex items-center justify-center rounded-md text-xl font-bold ${getColor(value)}`}>
      {value > 0 ? value : ''}
    </div>
  );
};

const Game2048Tailwind: React.FC = () => {
  const { grid, score, gameOver, hint, move, restartGame, handleTouchStart } = useGame2048Logic();

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between w-full mb-4">
        <div className="text-white">
          <span className="font-bold">SKOR:</span> {score}
        </div>
        <button
          onClick={restartGame}
          className="p-1.5 bg-orange-500 text-white rounded-lg transition-colors active:bg-orange-600 shadow-sm"
          title="Yeniden Başlat"
        >
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 bg-gray-600 p-2 rounded-md" onTouchStart={handleTouchStart}>
        {grid.map((value, index) => (
          <Tile key={index} value={value} />
        ))}
      </div>

      <div className="flex flex-col items-center mt-4">
        <button onClick={() => move('up')} className="p-4 bg-gray-600 text-white rounded-md mb-2"><ArrowUp size={20} /></button>
        <div className="flex space-x-2">
          <button onClick={() => move('left')} className="p-4 bg-gray-600 text-white rounded-md"><ArrowLeft size={20} /></button>
          <button onClick={() => move('down')} className="p-4 bg-gray-600 text-white rounded-md"><ArrowDown size={20} /></button>
          <button onClick={() => move('right')} className="p-4 bg-gray-600 text-white rounded-md"><ArrowRight size={20} /></button>
        </div>
      </div>

      {hint && (
        <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center pointer-events-none">
          <div className="text-white text-4xl font-bold">
            {hint === 'up' && '↑'}
            {hint === 'down' && '↓'}
            {hint === 'left' && '←'}
            {hint === 'right' && '→'}
          </div>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
          <div className="text-white text-4xl font-bold">Oyun Bitti!</div>
          <button
            onClick={restartGame}
            className="mt-4 p-1.5 bg-orange-500 text-white rounded-lg transition-colors active:bg-orange-600 shadow-sm"
            title="Yeniden Oyna"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Game2048Tailwind;

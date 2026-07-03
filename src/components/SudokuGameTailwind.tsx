import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useSudokuGameLogic } from '../hooks/useSudokuGameLogic';

const SudokuGameTailwind: React.FC = () => {
  const {
    initialGrid, grid, solution,
    selectedCell, hintCell, gameOver,
    startNewGame, handleCellClick, handleNumberInput, handleErase,
    handleTouchStart,
  } = useSudokuGameLogic();

  if (grid.length === 0) return null;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg w-full max-w-sm mx-auto" onTouchStart={handleTouchStart}>
      <div className="flex justify-between items-center w-full mb-2">
        <h3 className="text-white font-bold text-sm">SUDOKU</h3>
        <div className="flex gap-1">
          <button
            onClick={startNewGame}
            className="p-1.5 bg-orange-500 text-white rounded-lg transition-colors active:bg-orange-600 shadow-sm"
            title="Yeni Oyun"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-9 border-4 border-white bg-gray-900 shadow-2xl rounded-sm overflow-hidden">
        {grid.map((row, rIndex) => (
          row.map((cell, cIndex) => {
            const isInitial = initialGrid[rIndex][cIndex] !== null;
            const isSelected = selectedCell?.[0] === rIndex && selectedCell?.[1] === cIndex;
            const isHint = hintCell?.[0] === rIndex && hintCell?.[1] === cIndex;
            const isWrong = cell !== null && !isInitial && cell !== solution[rIndex][cIndex];

            const isInSameRow = selectedCell?.[0] === rIndex;
            const isInSameCol = selectedCell?.[1] === cIndex;
            const isInSameBox = selectedCell &&
              Math.floor(selectedCell[0] / 3) === Math.floor(rIndex / 3) &&
              Math.floor(selectedCell[1] / 3) === Math.floor(cIndex / 3);

            const isSameNumber = selectedCell && cell !== null && grid[selectedCell[0]][selectedCell[1]] === cell;

            const borderClasses = `
              ${cIndex % 3 === 2 && cIndex !== 8 ? 'border-r-[3px] border-r-white' : (cIndex !== 8 ? 'border-r border-r-gray-600' : '')}
              ${rIndex % 3 === 2 && rIndex !== 8 ? 'border-b-[3px] border-b-white' : (rIndex !== 8 ? 'border-b border-b-gray-600' : '')}
            `;

            return (
              <div
                key={`${rIndex}-${cIndex}`}
                onClick={() => handleCellClick(rIndex, cIndex)}
                className={`
                  w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-lg font-bold cursor-pointer
                  ${borderClasses}
                  ${isInitial ? 'text-gray-200 bg-gray-800' : 'text-white bg-gray-700'}
                  ${(isInSameRow || isInSameCol || isInSameBox) && !isInitial ? 'bg-gray-600/50' : ''}
                  ${isSameNumber && !isSelected ? 'bg-blue-900/40 text-blue-300' : ''}
                  ${isSelected ? '!bg-blue-500 !text-white z-10 scale-105 shadow-lg' : ''}
                  ${isHint ? 'bg-green-600 !text-white' : ''}
                  ${isWrong ? 'text-red-400 font-black' : ''}
                  active:bg-blue-400 transition-all duration-150
                `}
              >
                {cell || ''}
              </div>
            );
          })
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 mt-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            className="py-2 bg-gray-600 text-white rounded-md font-bold active:bg-gray-500 transition-colors"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleErase}
          className="py-2 bg-gray-600 text-white rounded-md font-bold active:bg-gray-500"
        >
          Sil
        </button>
      </div>

      {gameOver && (
        <div className="mt-4 p-2 bg-green-600 text-white rounded-md font-bold animate-bounce">
          Tebrikler! Çözüldü!
        </div>
      )}
    </div>
  );
};

export default SudokuGameTailwind;

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useWordSearchGameLogic, WORD_SEARCH_GRID_SIZE } from '../hooks/useWordSearchGameLogic';

const WordSearchGameTailwind: React.FC = () => {
  const {
    grid, locations, selectedCells, isSelecting, foundWords,
    gridRef, containerSize,
    foundCellKeys, selectedCellKeys,
    startNewGame, handleMouseDown, handleTouchStart, getCellCenter,
  } = useWordSearchGameLogic();

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg w-full max-w-sm mx-auto select-none">
      <div className="flex justify-between items-center w-full mb-2">
        <h3 className="text-white font-bold text-sm">KELİME BULMACA</h3>
        <button onClick={startNewGame} className="p-1.5 bg-orange-500 text-white rounded-lg active:bg-orange-600 shadow-sm">
          <RotateCcw size={14} />
        </button>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-12 gap-0 border-2 border-white bg-gray-900 shadow-xl overflow-hidden rounded-sm touch-none relative"
      >
        {isSelecting && selectedCells.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full">
            {(() => {
              const startPos = getCellCenter(selectedCells[0][0], selectedCells[0][1]);
              const endPos = getCellCenter(selectedCells[selectedCells.length - 1][0], selectedCells[selectedCells.length - 1][1]);
              return (
                <g>
                  <line
                    x1={startPos.x}
                    y1={startPos.y}
                    x2={endPos.x}
                    y2={endPos.y}
                    stroke="rgba(59, 130, 246, 0.6)"
                    strokeWidth={containerSize.width / WORD_SEARCH_GRID_SIZE * 0.8}
                    strokeLinecap="round"
                  />
                  {selectedCells.length > 1 && (
                    <circle
                      cx={endPos.x}
                      cy={endPos.y}
                      r={containerSize.width / WORD_SEARCH_GRID_SIZE * 0.4}
                      fill="rgba(59, 130, 246, 0.9)"
                    />
                  )}
                </g>
              );
            })()}
          </svg>
        )}

        {grid.map((row, rIndex) => (
          row.map((letter, cIndex) => {
            const cellKey = `${rIndex}-${cIndex}`;
            const isSelected = selectedCellKeys.has(cellKey);
            const isFound = foundCellKeys.has(cellKey);

            return (
              <div
                key={cellKey}
                onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleTouchStart(rIndex, cIndex);
                }}
                className={`
                  w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 flex items-center justify-center text-[0.5625rem] xs:text-[0.625rem] sm:text-xs font-bold cursor-pointer
                  transition-colors duration-100
                  ${isSelected ? 'bg-blue-500/50 text-white' : ''}
                  ${isFound ? 'bg-green-700 text-white' : 'text-gray-300'}
                  ${!isSelected && !isFound ? 'hover:bg-gray-700' : ''}
                  border-[0.5px] border-gray-700
                `}
              >
                {letter}
              </div>
            );
          })
        ))}
      </div>

      <div className="mt-4 w-full">
        <div className="text-white text-xs font-bold mb-2">BULUNACAK KELİMELER:</div>
        <div className="grid grid-cols-2 gap-2">
          {locations.map((loc, index) => (
            <div
              key={index}
              className={`text-[0.625rem] sm:text-xs px-2 py-1 rounded-md border ${foundWords.includes(loc.word) ? 'bg-green-800 border-green-600 text-white line-through opacity-50' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
            >
              {loc.word}
            </div>
          ))}
        </div>
      </div>

      {foundWords.length === locations.length && locations.length > 0 && (
        <div className="mt-4 p-2 bg-green-600 text-white rounded-md font-bold animate-bounce text-center w-full">
          Harika! Tüm kelimeleri buldun!
        </div>
      )}
    </div>
  );
};

export default WordSearchGameTailwind;

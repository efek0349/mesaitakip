import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateWordSearch, generateRandomWords, WordLocation } from '../utils/wordSearchUtils';
import { RotateCcw, Lightbulb } from 'lucide-react';

const GRID_SIZE = 12;
const WORD_COUNT = 10;

const WordSearchGame: React.FC = () => {
  const [grid, setGrid] = useState<string[][]>([]);
  const [locations, setLocations] = useState<WordLocation[]>([]);
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (gridRef.current) {
      setContainerSize({
        width: gridRef.current.offsetWidth,
        height: gridRef.current.offsetHeight
      });
    }
  }, [grid]);

  const startNewGame = useCallback(() => {
    // Prosedürel olarak yeni kelimeler üret
    const selectedWords = generateRandomWords(WORD_COUNT);
    const { grid, locations } = generateWordSearch(GRID_SIZE, selectedWords);
    setGrid(grid);
    setLocations(locations);
    setFoundWords([]);
    setSelectedCells([]);
    setStartCell(null);
    setIsSelecting(false);
    setHintWord(null);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const getCellFromCoords = (clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;
    
    const r = Math.floor((y / rect.height) * GRID_SIZE);
    const c = Math.floor((x / rect.width) * GRID_SIZE);
    
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      return [r, c] as [number, number];
    }
    return null;
  };

  const handleMouseDown = (r: number, c: number) => {
    setIsSelecting(true);
    setStartCell([r, c]);
    setSelectedCells([[r, c]]);
  };

  const handleMouseMove = (clientX: number, clientY: number) => {
    if (!isSelecting || !startCell) return;

    const currentCell = getCellFromCoords(clientX, clientY);
    if (!currentCell) return;

    const [r, c] = currentCell;
    const [sr, sc] = startCell;
    const dr = r - sr;
    const dc = c - sc;

    // Must be horizontal, vertical or diagonal
    if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = dr === 0 ? 0 : dr / steps;
      const stepC = dc === 0 ? 0 : dc / steps;

      const newCells: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        newCells.push([sr + stepR * i, sc + stepC * i]);
      }
      setSelectedCells(newCells);
    }
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const selectedWord = selectedCells.map(([r, c]) => grid[r][c]).join('');
    const reversedWord = [...selectedWord].reverse().join('');

    const match = locations.find(loc => 
      (loc.word === selectedWord || loc.word === reversedWord) && !foundWords.includes(loc.word)
    );

    if (match) {
      setFoundWords(prev => [...prev, match.word]);
    }
    setSelectedCells([]);
    setStartCell(null);
  };

  const showHint = useCallback(() => {
    if (isSelecting) return;
    
    const remaining = locations.filter(loc => !foundWords.includes(loc.word));
    if (remaining.length > 0) {
      const hint = remaining[Math.floor(Math.random() * remaining.length)];
      setHintWord(hint.word);
      
      // Briefly highlight the word
      const cells: [number, number][] = [];
      const dr = hint.end[0] - hint.start[0];
      const dc = hint.end[1] - hint.start[1];
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = dr === 0 ? 0 : dr / steps;
      const stepC = dc === 0 ? 0 : dc / steps;

      for (let i = 0; i <= steps; i++) {
        cells.push([hint.start[0] + stepR * i, hint.start[1] + stepC * i]);
      }
      
      setSelectedCells(cells);
      setTimeout(() => {
        setSelectedCells([]);
        setHintWord(null);
      }, 1500);
    }
  }, [locations, foundWords, isSelecting]);

  const handleTouchStart = (r: number, c: number, e: React.TouchEvent) => {
    const now = new Date().getTime();
    let newCount = 1;
    
    if (now - lastTap < 400) {
      newCount = tapCount + 1;
    }
    
    setTapCount(newCount);
    setLastTap(now);

    if (newCount === 3) {
      showHint();
      setTapCount(0);
      return;
    }

    handleMouseDown(r, c);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSelecting) {
        handleMouseMove(e.clientX, e.clientY);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isSelecting) {
        const touch = e.touches[0];
        handleMouseMove(touch.clientX, touch.clientY);
      }
    };

    const handleGlobalEnd = () => {
      handleMouseUp();
    };

    if (isSelecting) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('mouseup', handleGlobalEnd);
      window.addEventListener('touchend', handleGlobalEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isSelecting, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        showHint();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showHint]);

  const isCellInFoundWord = (r: number, c: number) => {
    return locations.some(loc => {
      if (!foundWords.includes(loc.word)) return false;
      
      const dr = loc.end[0] - loc.start[0];
      const dc = loc.end[1] - loc.start[1];
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = dr === 0 ? 0 : dr / steps;
      const stepC = dc === 0 ? 0 : dc / steps;

      for (let i = 0; i <= steps; i++) {
        if (loc.start[0] + stepR * i === r && loc.start[1] + stepC * i === c) return true;
      }
      return false;
    });
  };

  const getCellCenter = (r: number, c: number) => {
    const cellWidth = containerSize.width / GRID_SIZE;
    const cellHeight = containerSize.height / GRID_SIZE;
    return {
      x: c * cellWidth + cellWidth / 2,
      y: r * cellHeight + cellHeight / 2
    };
  };

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
        {/* Selection Line SVG Overlay */}
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
                    strokeWidth={containerSize.width / GRID_SIZE * 0.8}
                    strokeLinecap="round"
                  />
                  {/* Directional Arrow Head */}
                  {selectedCells.length > 1 && (
                    <circle 
                      cx={endPos.x} 
                      cy={endPos.y} 
                      r={containerSize.width / GRID_SIZE * 0.4} 
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
            const isSelected = selectedCells.some(([r, c]) => r === rIndex && c === cIndex);
            const isFound = isCellInFoundWord(rIndex, cIndex);

            return (
              <div
                key={`${rIndex}-${cIndex}`}
                onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                onTouchStart={(e) => {
                    e.preventDefault();
                    handleTouchStart(rIndex, cIndex, e);
                }}
                className={`
                  w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 flex items-center justify-center text-[9px] xs:text-[10px] sm:text-xs font-bold cursor-pointer
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
              className={`text-[10px] sm:text-xs px-2 py-1 rounded-md border ${foundWords.includes(loc.word) ? 'bg-green-800 border-green-600 text-white line-through opacity-50' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
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

export default WordSearchGame;

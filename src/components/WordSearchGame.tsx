import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateWordSearch, generateRandomWords, WordLocation } from '../utils/wordSearchUtils';
import { RotateCcw } from 'lucide-react';

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

  const handleMouseDown = (r: number, c: number) => {
    setIsSelecting(true);
    setStartCell([r, c]);
    setSelectedCells([[r, c]]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isSelecting || !startCell) return;

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
  }, [locations, foundWords]);

  const handleTouchStart = (r: number, c: number) => {
    const now = new Date().getTime();
    if (now - lastTap < 300 && tapCount === 2) {
      showHint();
      setTapCount(0);
      return;
    }
    
    if (now - lastTap > 300) setTapCount(1);
    else setTapCount(prev => prev + 1);
    setLastTap(now);

    handleMouseDown(r, c);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        showHint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg w-full max-w-sm mx-auto select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="flex justify-between w-full mb-4">
        <h3 className="text-white font-bold text-lg">KELİME BULMACA</h3>
        <button onClick={startNewGame} className="p-2 bg-orange-500 text-white rounded-md active:bg-orange-600 shadow-md">
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-12 gap-0 border-2 border-white bg-gray-900 shadow-xl overflow-hidden rounded-sm touch-none">
        {grid.map((row, rIndex) => (
          row.map((letter, cIndex) => {
            const isSelected = selectedCells.some(([r, c]) => r === rIndex && c === cIndex);
            const isFound = isCellInFoundWord(rIndex, cIndex);

            return (
              <div
                key={`${rIndex}-${cIndex}`}
                onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                onTouchStart={(e) => {
                    e.preventDefault();
                    handleTouchStart(rIndex, cIndex);
                }}
                onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    const r = element?.getAttribute('data-row');
                    const c = element?.getAttribute('data-col');
                    if (r !== null && c !== null) {
                        handleMouseEnter(parseInt(r!), parseInt(c!));
                    }
                }}
                onTouchEnd={handleMouseUp}
                data-row={rIndex}
                data-col={cIndex}
                className={`
                  w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 flex items-center justify-center text-[9px] xs:text-[10px] sm:text-xs font-bold cursor-pointer
                  transition-colors duration-100
                  ${isSelected ? 'bg-blue-500 text-white' : ''}
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

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateWordSearch, generateRandomWords, WordLocation } from '../utils/wordSearchUtils';
import { RotateCcw } from 'lucide-react';

const GRID_SIZE = 12;
const WORD_COUNT = 10;

const cellsAreEqual = (a: [number, number][], b: [number, number][]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
};

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

  // --- Refs mirroring state, used only inside the drag handlers below.
  // These let the global mousemove/touchmove listeners stay referentially
  // stable across a drag instead of being torn down and rebuilt on every
  // single pointer event (this was the main cause of the lag/"tepkime"
  // problem: the listener-management effect re-ran on every move because
  // handleMouseMove/handleMouseUp were brand new functions each render).
  const selectedCellsRef = useRef<[number, number][]>([]);
  const startCellRef = useRef<[number, number] | null>(null);
  const isSelectingRef = useRef(false);
  const gridDataRef = useRef<string[][]>([]);
  const locationsRef = useRef<WordLocation[]>([]);
  const foundWordsRef = useRef<string[]>([]);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => { selectedCellsRef.current = selectedCells; }, [selectedCells]);
  useEffect(() => { startCellRef.current = startCell; }, [startCell]);
  useEffect(() => { isSelectingRef.current = isSelecting; }, [isSelecting]);
  useEffect(() => { gridDataRef.current = grid; }, [grid]);
  useEffect(() => { locationsRef.current = locations; }, [locations]);
  useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);

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

  const getCellFromCoords = useCallback((clientX: number, clientY: number) => {
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
  }, []);

  const handleMouseDown = useCallback((r: number, c: number) => {
    setIsSelecting(true);
    setStartCell([r, c]);
    setSelectedCells([[r, c]]);
  }, []);

  // The actual selection-path calculation. Reads everything through refs
  // so its identity never changes mid-drag, and skips the state update
  // entirely when the computed path hasn't actually changed (the cursor
  // can fire dozens of mousemove events while still inside the same
  // cell) - this is what was forcing a full 144-cell re-render, including
  // the found-word scan below, far more often than necessary.
  const processPoint = useCallback((clientX: number, clientY: number) => {
    if (!isSelectingRef.current || !startCellRef.current) return;

    const currentCell = getCellFromCoords(clientX, clientY);
    if (!currentCell) return;

    const [r, c] = currentCell;
    const [sr, sc] = startCellRef.current;
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

      if (!cellsAreEqual(newCells, selectedCellsRef.current)) {
        setSelectedCells(newCells);
      }
    }
  }, [getCellFromCoords]);

  // rAF throttle: native pointer/touch events can fire much faster than
  // the screen repaints. We just remember the latest coordinates and let
  // the browser's own animation frame decide when to actually process
  // them - capping updates at one per frame instead of one per event.
  const scheduleProcessPoint = useCallback((x: number, y: number) => {
    pendingPointRef.current = { x, y };
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const point = pendingPointRef.current;
      if (point) processPoint(point.x, point.y);
    });
  }, [processPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isSelectingRef.current) return;
    setIsSelecting(false);

    const cells = selectedCellsRef.current;
    const grid = gridDataRef.current;
    const selectedWord = cells.map(([r, c]) => grid[r][c]).join('');
    const reversedWord = [...selectedWord].reverse().join('');

    const match = locationsRef.current.find(loc =>
      (loc.word === selectedWord || loc.word === reversedWord) && !foundWordsRef.current.includes(loc.word)
    );

    if (match) {
      setFoundWords(prev => [...prev, match.word]);
    }
    setSelectedCells([]);
    setStartCell(null);
  }, []);

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
      scheduleProcessPoint(e.clientX, e.clientY);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      scheduleProcessPoint(touch.clientX, touch.clientY);
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
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isSelecting, scheduleProcessPoint, handleMouseUp]);

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

  // Pre-compute the set of cells that belong to an already-found word once
  // whenever locations/foundWords change, instead of re-walking the full
  // locations list (with its own inner loop) for every one of the 144
  // cells on every single render - which is what was happening before,
  // including on every mousemove-triggered render while dragging.
  const foundCellKeys = useMemo(() => {
    const keys = new Set<string>();
    locations.forEach(loc => {
      if (!foundWords.includes(loc.word)) return;

      const dr = loc.end[0] - loc.start[0];
      const dc = loc.end[1] - loc.start[1];
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = dr === 0 ? 0 : dr / steps;
      const stepC = dc === 0 ? 0 : dc / steps;

      for (let i = 0; i <= steps; i++) {
        keys.add(`${loc.start[0] + stepR * i}-${loc.start[1] + stepC * i}`);
      }
    });
    return keys;
  }, [locations, foundWords]);

  const selectedCellKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedCells.forEach(([r, c]) => keys.add(`${r}-${c}`));
    return keys;
  }, [selectedCells]);

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
            const cellKey = `${rIndex}-${cIndex}`;
            const isSelected = selectedCellKeys.has(cellKey);
            const isFound = foundCellKeys.has(cellKey);

            return (
              <div
                key={cellKey}
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

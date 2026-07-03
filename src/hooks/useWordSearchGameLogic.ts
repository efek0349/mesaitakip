import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateWordSearch, generateRandomWords, WordLocation } from '../utils/wordSearchUtils';

export const WORD_SEARCH_GRID_SIZE = 12;
const WORD_COUNT = 10;

const cellsAreEqual = (a: [number, number][], b: [number, number][]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
};

/**
 * useWordSearchGameLogic — WordSearchGame.tsx'in TÜM oyun mantığı
 * (drag-select, refs ile performans optimizasyonu, RAF throttling, klavye
 * ipucu). Tailwind ve Win95 görsel versiyonları arasında PAYLAŞILAN tek
 * doğruluk kaynağı. gridRef'i çağıran component'in kendi DOM elementine
 * bağlaması gerekiyor (containerSize hesaplaması için).
 */
export function useWordSearchGameLogic() {
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
    const selectedWords = generateRandomWords(WORD_COUNT);
    const { grid, locations } = generateWordSearch(WORD_SEARCH_GRID_SIZE, selectedWords);
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

    const r = Math.floor((y / rect.height) * WORD_SEARCH_GRID_SIZE);
    const c = Math.floor((x / rect.width) * WORD_SEARCH_GRID_SIZE);

    if (r >= 0 && r < WORD_SEARCH_GRID_SIZE && c >= 0 && c < WORD_SEARCH_GRID_SIZE) {
      return [r, c] as [number, number];
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((r: number, c: number) => {
    setIsSelecting(true);
    setStartCell([r, c]);
    setSelectedCells([[r, c]]);
  }, []);

  const processPoint = useCallback((clientX: number, clientY: number) => {
    if (!isSelectingRef.current || !startCellRef.current) return;

    const currentCell = getCellFromCoords(clientX, clientY);
    if (!currentCell) return;

    const [r, c] = currentCell;
    const [sr, sc] = startCellRef.current;
    const dr = r - sr;
    const dc = c - sc;

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

  const handleTouchStart = useCallback((r: number, c: number) => {
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
  }, [lastTap, tapCount, showHint, handleMouseDown]);

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

  const getCellCenter = useCallback((r: number, c: number) => {
    const cellWidth = containerSize.width / WORD_SEARCH_GRID_SIZE;
    const cellHeight = containerSize.height / WORD_SEARCH_GRID_SIZE;
    return {
      x: c * cellWidth + cellWidth / 2,
      y: r * cellHeight + cellHeight / 2
    };
  }, [containerSize]);

  return {
    grid, locations, selectedCells, isSelecting, foundWords,
    gridRef, containerSize,
    foundCellKeys, selectedCellKeys,
    startNewGame, handleMouseDown, handleTouchStart, getCellCenter,
  };
}

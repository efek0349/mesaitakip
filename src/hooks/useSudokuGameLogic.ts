import React, { useState, useEffect, useCallback } from 'react';
import { generateSudoku, SudokuGrid } from '../utils/sudokuUtils';

/**
 * useSudokuGameLogic — SudokuGame.tsx'in TÜM oyun mantığı.
 * Tailwind ve Win95 görsel versiyonları arasında PAYLAŞILAN tek doğruluk
 * kaynağı.
 */
export function useSudokuGameLogic() {
  const [initialGrid, setInitialGrid] = useState<SudokuGrid>([]);
  const [grid, setGrid] = useState<SudokuGrid>([]);
  const [solution, setSolution] = useState<SudokuGrid>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const startNewGame = useCallback(() => {
    const { puzzle, solution } = generateSudoku('medium');
    setInitialGrid(puzzle.map(row => [...row]));
    setGrid(puzzle.map(row => [...row]));
    setSolution(solution);
    setSelectedCell(null);
    setHintCell(null);
    setGameOver(false);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (initialGrid[row][col] !== null) return;
    setSelectedCell([row, col]);
  }, [initialGrid]);

  const isComplete = (currentGrid: SudokuGrid) => {
    return currentGrid.every(row => row.every(cell => cell !== null));
  };

  const isCorrect = (currentGrid: SudokuGrid, sol: SudokuGrid) => {
    return currentGrid.every((row, r) => row.every((cell, c) => cell === sol[r][c]));
  };

  const handleNumberInput = useCallback((num: number) => {
    if (!selectedCell || gameOver) return;
    const [row, col] = selectedCell;

    setGrid(prevGrid => {
      const newGrid = prevGrid.map(r => [...r]);
      newGrid[row][col] = num;

      if (isComplete(newGrid) && isCorrect(newGrid, solution)) {
        setGameOver(true);
      }
      return newGrid;
    });
  }, [selectedCell, gameOver, solution]);

  const handleErase = useCallback(() => {
    if (selectedCell) {
      const [r, c] = selectedCell;
      const newGrid = grid.map(row => [...row]);
      newGrid[r][c] = null;
      setGrid(newGrid);
    }
  }, [selectedCell, grid]);

  const showHint = useCallback(() => {
    if (gameOver) return;

    let emptyCells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === null || grid[r][c] !== solution[r][c]) {
          emptyCells.push([r, c]);
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const [r, c] = emptyCells[randomIndex];

      const newGrid = grid.map(row => [...row]);
      newGrid[r][c] = solution[r][c];
      setGrid(newGrid);
      setHintCell([r, c]);
      setTimeout(() => setHintCell(null), 1500);

      if (isComplete(newGrid) && isCorrect(newGrid, solution)) {
        setGameOver(true);
      }
    }
  }, [grid, solution, gameOver]);

  const handleTouchStart = useCallback(() => {
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
    }
  }, [lastTap, tapCount, showHint]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toLowerCase();

      if (key === 'h') {
        if (!gameOver) {
          e.preventDefault();
          showHint();
        }
        return;
      }

      if (gameOver) return;

      if (key >= '1' && key <= '9') {
        handleNumberInput(parseInt(key));
      } else if (key === 'backspace' || key === 'delete') {
        handleErase();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [grid, selectedCell, gameOver, showHint, handleNumberInput, handleErase]);

  return {
    initialGrid, grid, solution,
    selectedCell, hintCell, gameOver,
    startNewGame, handleCellClick, handleNumberInput, handleErase,
    handleTouchStart,
  };
}

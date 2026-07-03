import React, { useState, useEffect, useCallback } from 'react';
import { AI } from '../utils/AI';
import { Grid } from '../utils/Grid';
import { Tile as TileClass } from '../utils/Tile';

const GRID_SIZE = 4;

const generateInitialGrid = () => {
  const grid = Array(GRID_SIZE * GRID_SIZE).fill(0);
  addRandomTile(grid);
  addRandomTile(grid);
  return grid;
};

const addRandomTile = (grid: number[]) => {
  const emptyTiles = grid.map((val, index) => (val === 0 ? index : -1)).filter(index => index !== -1);
  if (emptyTiles.length > 0) {
    const randomIndex = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    grid[randomIndex] = Math.random() < 0.9 ? 2 : 4;
  }
};

/**
 * useGame2048Logic — Game2048.tsx'in TÜM oyun mantığı (grid, skor, hamle,
 * AI ipucu, klavye/dokunma kontrolleri). Tailwind ve Win95 görsel
 * versiyonları arasında PAYLAŞILAN tek doğruluk kaynağı.
 */
export function useGame2048Logic() {
  const [grid, setGrid] = useState(generateInitialGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hint, setHint] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  const moveRowLeft = (row: number[]): { newRow: number[], score: number } => {
    let score = 0;
    const newRow = row.filter(val => val !== 0);
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        score += newRow[i];
        newRow.splice(i + 1, 1);
      }
    }
    while (newRow.length < GRID_SIZE) {
      newRow.push(0);
    }
    return { newRow, score };
  };

  const showHint = useCallback(() => {
    if (gameOver) return;
    const gridInstance = new Grid(GRID_SIZE);

    for (let i = 0; i < grid.length; i++) {
      const value = grid[i];
      if (value > 0) {
        const x = i % GRID_SIZE;
        const y = Math.floor(i / GRID_SIZE);
        const tile = new TileClass({ x, y }, value);
        gridInstance.insertTile(tile);
      }
    }

    const ai = new AI(gridInstance);
    const bestMove = ai.getBest();

    if (bestMove && bestMove.move !== -1) {
      const direction = ai.translate(bestMove.move);
      if (direction) {
        setHint(direction);
        setTimeout(() => setHint(''), 1000);
      }
    }
  }, [grid, gameOver]);

  const checkGameOver = (currentGrid: number[]) => {
    if (currentGrid.includes(0)) return;

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const val = currentGrid[i * GRID_SIZE + j];
        if (j < GRID_SIZE - 1 && val === currentGrid[i * GRID_SIZE + j + 1]) return;
        if (i < GRID_SIZE - 1 && val === currentGrid[(i + 1) * GRID_SIZE + j]) return;
      }
    }
    setGameOver(true);
  };

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const newGrid = [...grid];
    let moved = false;
    let currentScore = score;

    const rotateGrid = (g: number[], count: number) => {
      let rotated = [...g];
      for (let i = 0; i < count; i++) {
        const newRotated = Array(GRID_SIZE * GRID_SIZE).fill(0);
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            newRotated[c * GRID_SIZE + (GRID_SIZE - 1 - r)] = rotated[r * GRID_SIZE + c];
          }
        }
        rotated = newRotated;
      }
      return rotated;
    };

    const getIndex = (row: number, col: number) => row * GRID_SIZE + col;

    let tempGrid = [...newGrid];
    let rotationCount = 0;

    if (direction === 'up') {
      tempGrid = rotateGrid(tempGrid, 3);
      rotationCount = 1;
    } else if (direction === 'right') {
      tempGrid = rotateGrid(tempGrid, 2);
      rotationCount = 2;
    } else if (direction === 'down') {
      tempGrid = rotateGrid(tempGrid, 1);
      rotationCount = 3;
    }

    for (let i = 0; i < GRID_SIZE; i++) {
      const row = tempGrid.slice(i * GRID_SIZE, i * GRID_SIZE + GRID_SIZE);
      const { newRow, score: rowScore } = moveRowLeft(row);
      currentScore += rowScore;
      for (let j = 0; j < GRID_SIZE; j++) {
        const newIndex = getIndex(i, j);
        if (tempGrid[newIndex] !== newRow[j]) moved = true;
        tempGrid[newIndex] = newRow[j];
      }
    }

    tempGrid = rotateGrid(tempGrid, rotationCount);

    if (moved) {
      addRandomTile(tempGrid);
      setGrid(tempGrid);
      setScore(currentScore);
      checkGameOver(tempGrid);
    }
  }, [grid, score]);

  const restartGame = useCallback(() => {
    setGrid(generateInitialGrid());
    setScore(0);
    setGameOver(false);
  }, []);

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

      switch (key) {
        case 'arrowup':
          e.preventDefault();
          move('up');
          break;
        case 'arrowdown':
          e.preventDefault();
          move('down');
          break;
        case 'arrowleft':
          e.preventDefault();
          move('left');
          break;
        case 'arrowright':
          e.preventDefault();
          move('right');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [move, showHint, gameOver]);

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

  return {
    grid, score, gameOver, hint,
    move, restartGame, handleTouchStart,
  };
}

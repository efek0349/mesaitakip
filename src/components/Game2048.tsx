
import React, { useState, useEffect } from 'react';
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
    <div className={`w-16 h-16 flex items-center justify-center rounded-md text-2xl font-bold ${getColor(value)}`}>
      {value > 0 ? value : ''}
    </div>
  );
};

const Game2048: React.FC = () => {
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
  }

  const showHint = () => {
    const gridInstance = new Grid(GRID_SIZE);

    // Populate the gridInstance from the component's grid state
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
  };

  const simulateMove = (currentGrid: number[], direction: 'up' | 'down' | 'left' | 'right') => {
    let tempGrid = [...currentGrid];
    let score = 0;
    let moved = false;

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
        score += rowScore;
        for (let j = 0; j < GRID_SIZE; j++) {
            const newIndex = getIndex(i, j);
            if (tempGrid[newIndex] !== newRow[j]) moved = true;
            tempGrid[newIndex] = newRow[j];
        }
    }
    
    tempGrid = rotateGrid(tempGrid, rotationCount);

    return { grid: tempGrid, score, moved };
  };

  const move = (direction: 'up' | 'down' | 'left' | 'right') => {
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
  };

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

  const restartGame = () => {
    setGrid(generateInitialGrid());
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      switch (e.key) {
        case 'ArrowUp': move('up'); break;
        case 'ArrowDown': move('down'); break;
        case 'ArrowLeft': move('left'); break;
        case 'ArrowRight': move('right'); break;
        case 'h':
        case 'H':
          showHint();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, gameOver]);

  // Touch controls
  const [touchStart, setTouchStart] = useState<React.Touch | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!gameOver) e.preventDefault();

    const now = new Date().getTime();
    if (now - lastTap > 300) {
      setTapCount(1);
    } else {
      setTapCount(tapCount + 1);
    }
    setLastTap(now);

    if (tapCount === 3) {
      showHint();
      setTapCount(0);
    } else {
      setTouchStart(e.touches[0]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!gameOver) e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!gameOver) e.preventDefault();
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0];
    const dx = touchEnd.clientX - touchStart.clientX;
    const dy = touchEnd.clientY - touchStart.clientY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) move('right');
      else if (dx < -30) move('left');
    } else {
      if (dy > 30) move('down');
      else if (dy < -30) move('up');
    }
    setTouchStart(null);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg touch-action-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove}>
      <div className="flex justify-between w-full mb-4">
        <div className="text-white">
          <span className="font-bold">SKOR:</span> {score}
        </div>
        <button onClick={restartGame} className="px-3 py-1 bg-orange-500 text-white rounded-md">Yeniden Başlat</button>
      </div>
      <div className="grid grid-cols-4 gap-2 bg-gray-600 p-2 rounded-md">
        {grid.map((value, index) => (
          <Tile key={index} value={value} />
        ))}
      </div>
      {hint && (
        <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
          <div className="text-white text-6xl font-bold">
            {hint === 'up' && '↑'}
            {hint === 'down' && '↓'}
            {hint === 'left' && '←'}
            {hint === 'right' && '→'}
          </div>
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
          <div className="text-white text-4xl font-bold">Oyun Bitti!</div>
          <button onClick={restartGame} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md">Yeniden Oyna</button>
        </div>
      )}
    </div>
  );
};

export default Game2048;

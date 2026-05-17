import React, { useState, useEffect, useCallback } from 'react';
import { generateSudoku, SudokuGrid } from '../utils/sudokuUtils';
import { RotateCcw } from 'lucide-react';

const SudokuGame: React.FC = () => {
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

  const showHint = useCallback(() => {
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
  }, [grid, solution]);

  const handleTouchStart = () => {
    const now = new Date().getTime();
    if (now - lastTap > 300) {
      setTapCount(1);
    } else {
      setTapCount(tapCount + 1);
    }
    setLastTap(now);

    if (tapCount === 2) {
      showHint();
      setTapCount(0);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      }
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedCell) {
          const [r, c] = selectedCell;
          const newGrid = grid.map(row => [...row]);
          newGrid[r][c] = null;
          setGrid(newGrid);
        }
      }
      else if (e.key.toLowerCase() === 'h') {
        showHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, selectedCell, gameOver, showHint, handleNumberInput]);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg w-full max-w-sm mx-auto" onTouchStart={handleTouchStart}>
      <div className="flex justify-between w-full mb-4">
        <h3 className="text-white font-bold text-lg">SUDOKU</h3>
        <div className="flex gap-2">
          <button 
            onClick={startNewGame} 
            className="p-2 bg-orange-500 text-white rounded-md transition-colors active:bg-orange-600 shadow-md"
            title="Yeni Oyun"
          >
            <RotateCcw size={20} />
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

            // Her 3 hücrede bir kalın beyaz çizgi, diğerleri ince gri
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
                  ${isInitial ? 'text-gray-300 bg-gray-800' : 'text-white bg-gray-700'}
                  ${isSelected ? 'bg-blue-600 !text-white' : ''}
                  ${isHint ? 'bg-green-600 !text-white' : ''}
                  ${isWrong ? 'text-red-500 font-black' : ''}
                  active:bg-gray-600 transition-colors
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
          onClick={() => {
            if (selectedCell) {
                const [r, c] = selectedCell;
                const newGrid = grid.map(row => [...row]);
                newGrid[r][c] = null;
                setGrid(newGrid);
            }
          }}
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

export default SudokuGame;

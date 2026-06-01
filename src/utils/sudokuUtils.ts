
export type SudokuGrid = (number | null)[][];

export const isValid = (grid: SudokuGrid, row: number, col: number, num: number): boolean => {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) return false;
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (grid[x][col] === num) return false;
  }

  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[i + startRow][j + startCol] === num) return false;
    }
  }

  return true;
};

export const solveSudoku = (grid: SudokuGrid): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === null) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveSudoku(grid)) return true;
            grid[row][col] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
};

export const generateSudoku = (difficulty: 'easy' | 'medium' | 'hard' = 'medium'): { puzzle: SudokuGrid, solution: SudokuGrid } => {
  const solution: SudokuGrid = Array.from({ length: 9 }, () => Array(9).fill(null));
  
  // Fill diagonal 3x3 boxes first
  for (let i = 0; i < 9; i += 3) {
    fillBox(solution, i, i);
  }
  
  solveSudoku(solution);
  
  const puzzle: SudokuGrid = solution.map(row => [...row]);
  
  let attempts = 0;
  let cellsToRemove = 40; // Default for medium
  if (difficulty === 'easy') cellsToRemove = 30;
  if (difficulty === 'hard') cellsToRemove = 50;

  while (attempts < cellsToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      attempts++;
    }
  }
  
  return { puzzle, solution };
};

const fillBox = (grid: SudokuGrid, row: number, col: number) => {
  let num;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      do {
        num = Math.floor(Math.random() * 9) + 1;
      } while (!isUnusedInBox(grid, row, col, num));
      grid[row + i][col + j] = num;
    }
  }
};

const isUnusedInBox = (grid: SudokuGrid, rowStart: number, colStart: number, num: number) => {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[rowStart + i][colStart + j] === num) return false;
    }
  }
  return true;
};

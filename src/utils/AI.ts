import { Grid } from './Grid';
import { Tile } from './Tile';

const minSearchTime = 100;

export class AI {
  grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  eval() {
    const emptyCells = this.grid.availableCells().length;

    const smoothWeight = 0.1;
    const mono2Weight = 1.0;
    const emptyWeight = 2.7;
    const maxWeight = 1.0;

    return this.grid.smoothness() * smoothWeight
      + this.grid.monotonicity2() * mono2Weight
      + Math.log(emptyCells) * emptyWeight
      + this.grid.maxValue() * maxWeight;
  }

  search(depth: number, alpha: number, beta: number, positions: number, cutoffs: number): { move: number, score: number, positions: number, cutoffs: number } {
    let bestScore: number;
    let bestMove = -1;
    let result;

    if (this.grid.playerTurn) {
      bestScore = alpha;
      for (let direction = 0; direction < 4; direction++) {
        const newGrid = this.grid.clone();
        if (newGrid.move(direction).moved) {
          positions++;
          if (newGrid.isWin()) {
            return { move: direction, score: 10000, positions: positions, cutoffs: cutoffs };
          }
          const newAI = new AI(newGrid);

          if (depth === 0) {
            result = { move: direction, score: newAI.eval() };
          } else {
            result = newAI.search(depth - 1, bestScore, beta, positions, cutoffs);
            if (result.score > 9900) {
              result.score--;
            }
            positions = result.positions;
            cutoffs = result.cutoffs;
          }

          if (result.score > bestScore) {
            bestScore = result.score;
            bestMove = direction;
          }
          if (bestScore > beta) {
            cutoffs++
            return { move: bestMove, score: beta, positions: positions, cutoffs: cutoffs };
          }
        }
      }
    } else {
      bestScore = beta;

      const candidates: { position: { x: number, y: number }, value: number }[] = [];
      const cells = this.grid.availableCells();
      const scores: { [key: number]: number[] } = { 2: [], 4: [] };

      for (const value in scores) {
        for (let i in cells) {
          scores[value].push(0);
          const cell = cells[i];
          const tile = new Tile(cell, parseInt(value, 10));
          this.grid.insertTile(tile);
          scores[value][i] = -this.grid.smoothness() + this.grid.islands();
          this.grid.removeTile(cell);
        }
      }

      const maxScore = Math.max.apply(null, scores[2].concat(scores[4]));
      for (const value in scores) {
        for (let i = 0; i < scores[value].length; i++) {
          if (scores[value][i] === maxScore) {
            candidates.push({ position: cells[i], value: parseInt(value, 10) });
          }
        }
      }

      for (let i = 0; i < candidates.length; i++) {
        const position = candidates[i].position;
        const value = candidates[i].value;
        const newGrid = this.grid.clone();
        const tile = new Tile(position, value);
        newGrid.insertTile(tile);
        newGrid.playerTurn = true;
        positions++;
        const newAI = new AI(newGrid);
        result = newAI.search(depth, alpha, bestScore, positions, cutoffs);
        positions = result.positions;
        cutoffs = result.cutoffs;

        if (result.score < bestScore) {
          bestScore = result.score;
        }
        if (bestScore < alpha) {
          cutoffs++;
          return { move: -1, score: alpha, positions: positions, cutoffs: cutoffs };
        }
      }
    }

    return { move: bestMove, score: bestScore, positions: positions, cutoffs: cutoffs };
  }

  getBest() {
    return this.iterativeDeep();
  }

  iterativeDeep() {
    const start = (new Date()).getTime();
    let depth = 0;
    let best: { move: number, score: number, positions: number, cutoffs: number } | undefined = undefined;
    do {
      const newBest = this.search(depth, -10000, 10000, 0, 0);
      if (newBest.move === -1) {
        break;
      } else {
        best = newBest;
      }
      depth++;
    } while ((new Date()).getTime() - start < minSearchTime);
    return best;
  }

  translate(move: number) {
    return {
      0: 'up',
      1: 'right',
      2: 'down',
      3: 'left'
    }[move];
  }
}

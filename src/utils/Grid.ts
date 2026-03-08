import { Tile } from './Tile';

export class Grid {
  size: number;
  cells: (Tile | null)[][];
  playerTurn = true;
  indexes: { x: number; y: number; }[][] = [];

  constructor(size: number) {
    this.size = size;
    this.cells = [];
    this.build();

    for (let x = 0; x < 4; x++) {
      this.indexes.push([]);
      for (let y = 0; y < 4; y++) {
        this.indexes[x].push({ x: x, y: y });
      }
    }
  }

  build() {
    for (let x = 0; x < this.size; x++) {
      const row: (Tile | null)[] = this.cells[x] = [];
      for (let y = 0; y < this.size; y++) {
        row.push(null);
      }
    }
  }

  randomAvailableCell() {
    const cells = this.availableCells();
    if (cells.length) {
      return cells[Math.floor(Math.random() * cells.length)];
    }
  }

  availableCells() {
    const cells: { x: number; y: number; }[] = [];
    this.eachCell((x, y, tile) => {
      if (!tile) {
        cells.push({ x: x, y: y });
      }
    });
    return cells;
  }

  eachCell(callback: (x: number, y: number, tile: Tile | null) => void) {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        callback(x, y, this.cells[x][y]);
      }
    }
  }

  cellsAvailable() {
    return !!this.availableCells().length;
  }

  cellAvailable(cell: { x: number; y: number; }) {
    return !this.cellOccupied(cell);
  }

  cellOccupied(cell: { x: number; y: number; }) {
    return !!this.cellContent(cell);
  }

  cellContent(cell: { x: number; y: number; }) {
    if (this.withinBounds(cell)) {
      return this.cells[cell.x][cell.y];
    } else {
      return null;
    }
  }

  insertTile(tile: Tile) {
    this.cells[tile.x][tile.y] = tile;
  }

  removeTile(tile: { x: number; y: number; }) {
    this.cells[tile.x][tile.y] = null;
  }

  withinBounds(position: { x: number; y: number; }) {
    return position.x >= 0 && position.x < this.size &&
      position.y >= 0 && position.y < this.size;
  }

  clone() {
    const newGrid = new Grid(this.size);
    newGrid.playerTurn = this.playerTurn;
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.cells[x][y]) {
          newGrid.insertTile(this.cells[x][y]!.clone());
        }
      }
    }
    return newGrid;
  }

  prepareTiles() {
    this.eachCell((x, y, tile) => {
      if (tile) {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    });
  }

  moveTile(tile: Tile, cell: { x: number; y: number; }) {
    this.cells[tile.x][tile.y] = null;
    this.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  }

  vectors = {
    0: { x: 0, y: -1 }, // up
    1: { x: 1, y: 0 },  // right
    2: { x: 0, y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  }

  getVector(direction: number) {
    return this.vectors[direction as keyof typeof this.vectors];
  }

  move(direction: number) {
    const self = this;
    const cell: { x: number; y: number; } = { x: 0, y: 0 };
    let tile: Tile | null;

    const vector = this.getVector(direction);
    const traversals = this.buildTraversals(vector);
    let moved = false;
    let score = 0;
    let won = false;

    this.prepareTiles();

    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        cell.x = x;
        cell.y = y;
        tile = self.cellContent(cell);

        if (tile) {
          const positions = self.findFarthestPosition(cell, vector);
          const next = self.cellContent(positions.next);

          if (next && next.value === tile.value && !next.mergedFrom) {
            const merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];

            self.insertTile(merged);
            self.removeTile(tile);

            tile.updatePosition(positions.next);

            score += merged.value;

            if (merged.value === 2048) {
              won = true;
            }
          } else {
            self.moveTile(tile, positions.farthest);
          }

          if (!self.positionsEqual(cell, tile)) {
            self.playerTurn = false;
            moved = true;
          }
        }
      });
    });

    return { moved: moved, score: score, won: won };
  }

  buildTraversals(vector: { x: number; y: number; }) {
    const traversals: { x: number[], y: number[] } = { x: [], y: [] };

    for (let pos = 0; pos < this.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
  }

  findFarthestPosition(cell: { x: number; y: number; }, vector: { x: number; y: number; }) {
    let previous;
    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.withinBounds(cell) && this.cellAvailable(cell));

    return {
      farthest: previous,
      next: cell
    };
  }

  movesAvailable() {
    return this.cellsAvailable() || this.tileMatchesAvailable();
  }

  tileMatchesAvailable() {
    const self = this;
    let tile;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        tile = this.cellContent({ x: x, y: y });

        if (tile) {
          for (let direction = 0; direction < 4; direction++) {
            const vector = self.getVector(direction);
            const cell = { x: x + vector.x, y: y + vector.y };
            const other = self.cellContent(cell);

            if (other && other.value === tile.value) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  positionsEqual(first: { x: number; y: number; }, second: { x: number; y: number; }) {
    return first.x === second.x && first.y === second.y;
  }

  isWin() {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.cellOccupied({ x, y })) {
          if (this.cellContent({ x, y })!.value === 2048) {
            return true;
          }
        }
      }
    }
    return false;
  }

  smoothness() {
    let smoothness = 0;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (this.cellOccupied(this.indexes[x][y])) {
          const value = Math.log(this.cellContent(this.indexes[x][y])!.value) / Math.log(2);
          for (let direction = 1; direction <= 2; direction++) {
            const vector = this.getVector(direction);
            const targetCell = this.findFarthestPosition(this.indexes[x][y], vector).next;

            if (this.cellOccupied(targetCell)) {
              const target = this.cellContent(targetCell)!;
              const targetValue = Math.log(target.value) / Math.log(2);
              smoothness -= Math.abs(value - targetValue);
            }
          }
        }
      }
    }
    return smoothness;
  }

  monotonicity2() {
    const totals = [0, 0, 0, 0];

    for (let x = 0; x < 4; x++) {
      let current = 0;
      let next = current + 1;
      while (next < 4) {
        while (next < 4 && !this.cellOccupied(this.indexes[x][next])) {
          next++;
        }
        if (next >= 4) { next--; }
        const currentValue = this.cellOccupied({ x: x, y: current }) ?
          Math.log(this.cellContent(this.indexes[x][current])!.value) / Math.log(2) :
          0;
        const nextValue = this.cellOccupied({ x: x, y: next }) ?
          Math.log(this.cellContent(this.indexes[x][next])!.value) / Math.log(2) :
          0;
        if (currentValue > nextValue) {
          totals[0] += nextValue - currentValue;
        } else if (nextValue > currentValue) {
          totals[1] += currentValue - nextValue;
        }
        current = next;
        next++;
      }
    }

    for (let y = 0; y < 4; y++) {
      let current = 0;
      let next = current + 1;
      while (next < 4) {
        while (next < 4 && !this.cellOccupied(this.indexes[next][y])) {
          next++;
        }
        if (next >= 4) { next--; }
        const currentValue = this.cellOccupied({ x: current, y: y }) ?
          Math.log(this.cellContent(this.indexes[current][y])!.value) / Math.log(2) :
          0;
        const nextValue = this.cellOccupied({ x: next, y: y }) ?
          Math.log(this.cellContent(this.indexes[next][y])!.value) / Math.log(2) :
          0;
        if (currentValue > nextValue) {
          totals[2] += nextValue - currentValue;
        } else if (nextValue > currentValue) {
          totals[3] += currentValue - nextValue;
        }
        current = next;
        next++;
      }
    }

    return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
  }

  maxValue() {
    let max = 0;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (this.cellOccupied(this.indexes[x][y])) {
          const value = this.cellContent(this.indexes[x][y])!.value;
          if (value > max) {
            max = value;
          }
        }
      }
    }
    return Math.log(max) / Math.log(2);
  }

  islands() {
    const self = this;
    const mark = (x: number, y: number, value: number) => {
      if (x >= 0 && x <= 3 && y >= 0 && y <= 3 &&
        self.cells[x][y] &&
        self.cells[x][y]!.value == value &&
        !self.cells[x][y]!.marked) {
        self.cells[x][y]!.marked = true;

        for (const direction in [0, 1, 2, 3]) {
          const vector = self.getVector(parseInt(direction, 10));
          mark(x + vector.x, y + vector.y, value);
        }
      }
    }

    let islands = 0;

    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (this.cells[x][y]) {
          this.cells[x][y]!.marked = false
        }
      }
    }
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (this.cells[x][y] &&
          !this.cells[x][y]!.marked) {
          islands++;
          mark(x, y, this.cells[x][y]!.value);
        }
      }
    }

    return islands;
  }
}

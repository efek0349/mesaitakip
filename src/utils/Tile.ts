export class Tile {
  x: number;
  y: number;
  value: number;
  previousPosition: { x: number; y: number } | null;
  mergedFrom: Tile[] | null;
  marked: boolean = false;

  constructor(position: { x: number; y: number }, value: number) {
    this.x = position.x;
    this.y = position.y;
    this.value = value || 2;

    this.previousPosition = null;
    this.mergedFrom = null; // Tracks tiles that merged together
  }

  savePosition() {
    this.previousPosition = { x: this.x, y: this.y };
  }

  updatePosition(position: { x: number; y: number }) {
    this.x = position.x;
    this.y = position.y;
  }

  clone() {
    const newTile = new Tile({ x: this.x, y: this.y }, this.value);
    // newTile.previousPosition = { x: this.previousPosition.x, y: this.previousPosition.y };
    // newTile.mergedFrom = { x: this.previousPosition.x, y: this.previousPosition.y };
    return newTile;
  }
}

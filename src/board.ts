import leaflet from "leaflet";

interface Cell {
  readonly y: number; // y first because latitude = up/down
  readonly x: number; // x second because longitude = left/right
}

// a flyweight factory for grid cells
export class Board {
  // readonly = value cannot be changed after it's set
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    // Set attributes
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  // this is the factory method
  private getCanonicalCell(cell: Cell): Cell {
    const { y, x } = cell;
    const key = [y, x].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    // ! tells the TS compiler that the variable will never be null or undefined
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      y: Math.trunc(point.lat / this.tileWidth),
      x: Math.trunc(point.lng / this.tileWidth),
    });
  }

  // note that a cell's position is the same as its bottom left corner
  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.y * this.tileWidth, cell.x * this.tileWidth], // bottom left corner
      [(cell.y + 1) * this.tileWidth, (cell.x + 1) * this.tileWidth], // top right corner
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    const radius = this.tileVisibilityRadius;

    // note that we use <= instead of < for our loop
    // this is necessary so the detection treats the left/right and top/bottom sides the same
    // if (y, x) was (0, 0) and radius was 2, then we'd only check -2 through 1 for y and x if we were using <
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        resultCells.push(this.getCanonicalCell({
          y: originCell.y + y,
          x: originCell.x + x,
        }));
      }
    }
    return resultCells;
  }
}

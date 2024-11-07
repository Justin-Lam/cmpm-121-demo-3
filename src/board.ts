import leaflet from "leaflet";

interface Cell {
  readonly x: number;
  readonly y: number;
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
    const { x, y } = cell;
    const key = [x, y].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    // ! tells the TS compiler that the variable will never be null or undefined
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      x: point.lat / this.tileWidth,
      y: point.lng / this.tileWidth,
    });
  }

  // note that a cell's position is the same as its bottom left corner
  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.x * this.tileWidth, cell.y * this.tileWidth], // bottom left corner
      [(cell.x + 1) * this.tileWidth, (cell.y + 1) * this.tileWidth], // top right corner
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    // note that we use <= instead of < for our loop
    // this is necessary so the detection treats the left/right and top/bottom sides the same
    // if (x, y) was (0, 0) and radius was 2, then we'd only check -2 through 1 for x and y if we were using <
    for (
      let x = -this.tileVisibilityRadius;
      x <= this.tileVisibilityRadius;
      x++
    ) {
      for (
        let y = -this.tileVisibilityRadius;
        y <= this.tileVisibilityRadius;
        y++
      ) {
        resultCells.push(this.getCanonicalCell({
          x: originCell.x + x,
          y: originCell.y + y,
        }));
      }
    }
    return resultCells;
  }
}

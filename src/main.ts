// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Grid cell flyweight factory
import "./board.ts";
import { Board } from "./board.ts";

// Interfaces
interface Cell {
  readonly y: number; // y first because latitude = up/down
  readonly x: number; // x second because longitude = left/right
}

// App Name
const APP_NAME: string = "Geocoin GO";

// Locations
//const NULL_ISLAND: leaflet.LatLng = leaflet.latLng(0, 0);
const OAKES_CLASSROOM: leaflet.LatLng = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);

// Parameters
const ZOOM: number = 19;
const TILE_WIDTH: number = 1e-4; // 0.0001
const TILE_VISIBILITY_RADIUS: number = 8; // we don't find nearby cells using a circle however, we use a square that's 2r x 2r
const CACHE_SPAWN_PROBABILITY: number = 0.1;
const CACHE_MAX_INITIAL_COINS: number = 10; // pretty sure this is exclusive

// Variables
let playerCoins: number = 0;

// Set app title
const appTitle: HTMLHeadingElement = document.querySelector<HTMLHeadingElement>(
  "#appTitle",
)!;
appTitle.innerHTML = APP_NAME;
document.title = APP_NAME;

// Create map
const map: leaflet.Map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: ZOOM,
  maxZoom: ZOOM, // for zooming in
});

// Give map tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: ZOOM,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Create player marker
const playerMarker: leaflet.Marker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Show player inventory
const inventoryPanel: HTMLDivElement = document.querySelector<HTMLDivElement>(
  "#inventoryPanel",
)!;
updateInventoryPanelText();
function updateInventoryPanelText() {
  inventoryPanel.innerHTML = `${playerCoins} coins in inventory`;
}

// Create board
const board = new Board(TILE_WIDTH, TILE_VISIBILITY_RADIUS);

// Spawn neighborhood caches
board.getCellsNearPoint(OAKES_CLASSROOM).forEach((cell) => {
  if (luck([cell.y, cell.x].toString()) < CACHE_SPAWN_PROBABILITY) {
    spawnCache(cell);
  }
});

/** Adds a cache to the map at a cell's position. */
function spawnCache(cell: Cell) {
  // Add cache (a rectangle) to the map where the cell is
  const cache: leaflet.Rectangle = leaflet.rectangle(board.getCellBounds(cell));
  cache.addTo(map);

  // Add cache to map
  cache.bindPopup(() => {
    // Set num coins
    let numCoins: number = Math.floor(
      luck([cell.y, cell.x, "initialValue"].toString()) *
        CACHE_MAX_INITIAL_COINS,
    );

    // Set popup description and button
    const popup: HTMLDivElement = document.createElement("div");
    popup.innerHTML = `
			<div>This is cache (${cell.y},${cell.x}). It has <span id="coins">${numCoins}</span> coin(s).</div>
			<button id="collectButton">Collect</button>
			<button id="depositButton">Deposit</button>
		`;

    // Collect button on click event
    popup.querySelector<HTMLButtonElement>("#collectButton")!
      .addEventListener("click", () => {
        if (numCoins > 0) {
          numCoins--;
          popup.querySelector<HTMLSpanElement>("#coins")!.innerHTML = numCoins
            .toString();
          playerCoins++;
          updateInventoryPanelText();
        }
      });

    // Deposit button on click event
    popup.querySelector<HTMLButtonElement>("#depositButton")!
      .addEventListener("click", () => {
        if (playerCoins > 0) {
          numCoins++;
          popup.querySelector<HTMLSpanElement>("#coins")!.innerHTML = numCoins
            .toString();
          playerCoins--;
          updateInventoryPanelText();
        }
      });

    return popup;
  });
}

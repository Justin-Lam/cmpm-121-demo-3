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
interface Coin {
  readonly y: number;
  readonly x: number;
  readonly serial: number;
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
const playerCoins: Coin[] = [];

// App
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
updatePlayerInventoryPanel();

function updatePlayerInventoryPanel() {
  inventoryPanel.innerHTML = "Inventory:";
  playerCoins.forEach((coin) => {
    inventoryPanel.innerHTML += `<br>🪙${coin.y}:${coin.x}#${coin.serial}`;
  });
}
function addCoinToPlayerInventory(coin: Coin) {
  playerCoins.push(coin);
  updatePlayerInventoryPanel();
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
  const cache: leaflet.Rectangle = leaflet.rectangle(
    board.getCellBounds(cell),
  );
  cache.addTo(map);

  // Set num initial coins
  const numInitialCoins: number = Math.floor(
    luck([cell.y, cell.x, "initialValue"].toString()) *
      CACHE_MAX_INITIAL_COINS,
  );

  // Create coin array
  const coins: Coin[] = [];
  for (let i = 0; i < numInitialCoins; i++) {
    coins[i] = {
      y: cell.y,
      x: cell.x,
      serial: i,
    };
  }

  // Create popup
  const popup: HTMLDivElement = document.createElement("div");

  const header: HTMLHeadingElement = document.createElement("h3");
  header.innerHTML = `<h4>Cache ${cell.y}:${cell.x}</h4>`;
  popup.append(header);

  const inventoryPanel: HTMLDivElement = document.createElement("div");
  popup.append(inventoryPanel);
  updateCacheInventoryPanel();

  // Show coins and their collect buttons
  function updateCacheInventoryPanel() {
    inventoryPanel.innerHTML = "Inventory:";
    coins.forEach((coin, index) => {
      const coinElem = document.createElement("span");
      coinElem.innerHTML = `<br>🪙${coin.y}:${coin.x}#${coin.serial}`;
      inventoryPanel.append(coinElem);

      const collectButton = document.createElement("button");
      collectButton.innerHTML = "Collect";
      collectButton.addEventListener("click", () => {
        coins.splice(index, 1);
        addCoinToPlayerInventory(coin);
        updateCacheInventoryPanel();
      });
      coinElem.append(collectButton);
    });
  }

  const depositButton: HTMLButtonElement = document.createElement("button");
  depositButton.innerHTML = "Deposit";
  popup.append(depositButton);

  /*
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

	*/

  // Make popup appear when cache is clicked
  cache.bindPopup(() => {
    return popup;
  });
}

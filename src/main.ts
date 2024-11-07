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
const CACHE_SPAWN_PROBABILITY: number = 0.1; // 10%
const CACHE_MIN_INITIAL_COINS: number = 1;
const CACHE_MAX_INITIAL_COINS: number = 10; // pretty sure this is exclusive

// Variables
const playerCoins: Coin[] = [];

// Set app name
const appTitle: HTMLHeadingElement = document.querySelector<HTMLHeadingElement>(
  "#appTitle",
)!;
appTitle.innerHTML = APP_NAME;
document.title = APP_NAME;

// Create map
const map: leaflet.Map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: ZOOM,
  maxZoom: ZOOM, // max amount can zoom in
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
const playerInventoryPanel: HTMLDivElement = document.querySelector<
  HTMLDivElement
>(
  "#inventoryPanel",
)!;
updatePlayerInventoryPanel();

/** Makes the player inventory panel display the player's current coins. */
function updatePlayerInventoryPanel() {
  playerInventoryPanel.innerHTML = "Inventory:";
  playerCoins.forEach((coin) => {
    playerInventoryPanel.innerHTML +=
      `<br>🪙${coin.y}:${coin.x}#${coin.serial}`;
  });
}
/** Adds a coin to the player's inventory and updates the player inventory panel. */
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
        CACHE_MAX_INITIAL_COINS + CACHE_MIN_INITIAL_COINS,
  );

  // Create coin array
  const cacheCoins: Coin[] = [];
  for (let i = 0; i < numInitialCoins; i++) {
    cacheCoins[i] = {
      y: cell.y,
      x: cell.x,
      serial: i,
    };
  }

  // Initialize mode
  let collectMode = true;

  // Create popup
  const popup: HTMLDivElement = document.createElement("div");

  const header: HTMLHeadingElement = document.createElement("h3");
  header.innerHTML = `<h4>Cache ${cell.y}:${cell.x}</h4>`;
  popup.append(header);

  const collectModeButton: HTMLButtonElement = document.createElement(
    "button",
  );
  collectModeButton.innerHTML = "Collect";
  collectModeButton.disabled = true; // collect mode enabled initially
  collectModeButton.addEventListener("click", () => {
    collectMode = true;
    collectModeButton.disabled = true;
    depositModeButton.disabled = false;
    updateCacheInventoryPanel();
  });
  const depositModeButton: HTMLButtonElement = document.createElement(
    "button",
  );
  depositModeButton.innerHTML = "Deposit";
  depositModeButton.addEventListener("click", () => {
    collectMode = false;
    collectModeButton.disabled = false;
    depositModeButton.disabled = true;
    updateCacheInventoryPanel();
  });
  const cacheInventoryPanel: HTMLDivElement = document.createElement("div");
  popup.append(cacheInventoryPanel);
  updateCacheInventoryPanel();

  /** Makes the cache's inventory panel display either the cache's or the player's coins, depending on cache's mode. */
  function updateCacheInventoryPanel() {
    // Reset the inventory pannel elem
    cacheInventoryPanel.innerHTML = "Inventory:";

    // Re add the mode buttons
    cacheInventoryPanel.append(collectModeButton);
    cacheInventoryPanel.append(depositModeButton);

    if (collectMode) {
      // Show the cache's coins
      cacheCoins.forEach((coin, index) => {
        // Coin
        const coinElem = document.createElement("span");
        coinElem.innerHTML = `<br>🪙${coin.y}:${coin.x}#${coin.serial}`;
        cacheInventoryPanel.append(coinElem);

        // Collect Button
        const collectButton = document.createElement("button");
        collectButton.innerHTML = "Collect";
        collectButton.addEventListener("click", () => {
          cacheCoins.splice(index, 1);
          addCoinToPlayerInventory(coin);
          updateCacheInventoryPanel();
        });
        coinElem.append(collectButton);
      });
    } else {
      // Show the player's coins
      playerCoins.forEach((coin, index) => {
        // Coin
        const coinElem = document.createElement("span");
        coinElem.innerHTML = `<br>🪙${coin.y}:${coin.x}#${coin.serial}`;
        cacheInventoryPanel.append(coinElem);

        // Deposit Button
        const depositButton = document.createElement("button");
        depositButton.innerHTML = "Deposit";
        depositButton.addEventListener("click", () => {
          const playerCoin = playerCoins.splice(index, 1)[0];
          updatePlayerInventoryPanel();
          cacheCoins.push(playerCoin);
          updateCacheInventoryPanel();
        });
        coinElem.append(depositButton);
      });
    }
  }

  // Make popup appear when cache is clicked
  cache.bindPopup(() => {
    return popup;
  });
}

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
interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
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
const CACHE_MIN_INIT_COINS: number = 1;
const CACHE_MAX_INIT_COINS: number = 10; // pretty sure this is exclusive

// Variables
const cacheMementos: Map<string, string> = new Map<string, string>();
let playerPosition: leaflet.LatLng = OAKES_CLASSROOM;
let autoPositioningEnabled: boolean = false;
let geoLocWatchPosHandlerID: number = 0;
let nearbyCaches: Cache[] = [];
const playerCoins: Coin[] = [];

// Classes
class Cache implements Memento<string> {
  private cell: Cell;
  private coins: Coin[]; // only thing that's mutable
  private rect: leaflet.Rectangle;

  constructor(cell: Cell) {
    // Initialize attributes
    this.cell = cell;
    this.coins = [];
    this.rect = leaflet.rectangle(leaflet.latLngBounds(
      leaflet.latLng(0, 0),
      leaflet.latLng(0, 0),
    ));
  }

  public createAsNew() {
    // Determine num initial coins
    const numInitCoins = Math.floor(
      luck([this.cell.y, this.cell.x, "initialValue"].toString()) *
          CACHE_MAX_INIT_COINS +
        CACHE_MIN_INIT_COINS,
    );

    // Create initial coins
    for (let i = 0; i < numInitCoins; i++) {
      this.coins.push({
        y: this.cell.y,
        x: this.cell.x,
        serial: i,
      });
    }

    // Create rect
    this.rect = this.createRect();
  }

  public toMemento() {
    return JSON.stringify(this.coins);
  }
  public fromMemento(memento: string) {
    this.coins = JSON.parse(memento);
    this.rect = this.createRect();
  }
  public getPos(): string {
    return `${this.cell.y}:${this.cell.x}`;
  }

  public createRect(): leaflet.Rectangle {
    // Remove current rect
    this.removeRect();

    // Create rect and add it to map
    const rect = leaflet.rectangle(board.getCellBounds(this.cell));
    rect.addTo(map);

    // Create popup
    const popup = document.createElement("div");

    // Create header
    const header: HTMLHeadingElement = document.createElement("h3");
    header.innerHTML = `<h4>Cache ${this.getPos()}</h4>`;
    popup.append(header);

    // Create inventory panel
    const cacheInventoryPanel: HTMLDivElement = document.createElement("div");
    cacheInventoryPanel.innerHTML = "Inventory:";
    popup.append(cacheInventoryPanel);

    // Create mode buttons
    let collectMode = true;

    const collectModeButton: HTMLButtonElement = document.createElement(
      "button",
    );
    collectModeButton.innerHTML = "Collect";
    collectModeButton.addEventListener("click", () => {
      collectMode = true;
      updateModeButtons();
      updateCoinsPanel();
    });
    cacheInventoryPanel.append(collectModeButton);

    const depositModeButton: HTMLButtonElement = document.createElement(
      "button",
    );
    depositModeButton.innerHTML = "Deposit";
    depositModeButton.addEventListener("click", () => {
      collectMode = false;
      updateModeButtons();
      updateCoinsPanel();
    });
    cacheInventoryPanel.append(depositModeButton);

    updateModeButtons();

    function updateModeButtons(): void {
      collectModeButton.disabled = collectMode;
      depositModeButton.disabled = !collectMode;
    }

    // Define function
    const updateCoinsPanel = (): void => {
      // Define functions
      const showCacheCoins = (): void => {
        this.coins.forEach((coin, index) => {
          // Coin
          const coinSpan = document.createElement("span");
          coinSpan.innerHTML = `<br>${getCoinInfo(coin)}`;
          coinPanel.append(coinSpan);

          // Collect Button
          const collectButton = document.createElement("button");
          collectButton.innerHTML = "Collect";
          collectButton.addEventListener("click", () => {
            this.coins.splice(index, 1); // remove coin
            updateCoinsPanel();
            addCoinToPlayerInventory(coin);
            cacheMementos.set(this.getPos(), this.toMemento());
          });
          coinSpan.append(collectButton);
        });
      };
      const showPlayerCoins = (): void => {
        playerCoins.forEach((coin, index) => {
          // Coin
          const coinSpan = document.createElement("span");
          coinSpan.innerHTML = `<br>${getCoinInfo(coin)}`;
          coinPanel.append(coinSpan);

          // Deposit Button
          const depositButton = document.createElement("button");
          depositButton.innerHTML = "Deposit";
          depositButton.addEventListener("click", () => {
            const playerCoin = removeCoinFromPlayerInventory(index);
            this.coins.push(playerCoin);
            updateCoinsPanel();
            cacheMementos.set(this.getPos(), this.toMemento());
          });
          coinSpan.append(depositButton);
        });
      };
      function getCoinInfo(coin: Coin): string {
        return `🪙${coin.y}:${coin.x}#${coin.serial}`;
      }

      // Reset coins panel
      coinPanel.innerHTML = "";

      // Show coins based on mode
      if (collectMode) {
        showCacheCoins();
      } else {
        showPlayerCoins();
      }
    };

    // Create coins panel
    const coinPanel: HTMLDivElement = document.createElement("div");
    cacheInventoryPanel.append(coinPanel);
    updateCoinsPanel();

    // Bind popup to rect and return
    rect.bindPopup(() => popup);
    return rect;
  }
  public removeRect() {
    this.rect.remove();
  }
}

// Set app name
const appTitle: HTMLHeadingElement = document.querySelector<HTMLHeadingElement>(
  "#appTitle",
)!;
appTitle.innerHTML = APP_NAME;
document.title = APP_NAME;

// Create map
const map: leaflet.Map = leaflet.map(document.getElementById("map")!, {
  center: playerPosition,
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
const playerMarker = leaflet.marker(playerPosition);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Set control panel button click behaviors
const toggleAutoPosButton = document.querySelector<HTMLButtonElement>(
  "#toggleAutoPosButton",
)!;
toggleAutoPosButton.addEventListener("click", () => toggleAutoPositioning());
const moveNorthButton = document.querySelector<HTMLButtonElement>(
  "#moveNorthButton",
)!;
moveNorthButton.addEventListener("click", () => movePlayer(1, 0));
const moveSouthButton = document.querySelector<HTMLButtonElement>(
  "#moveSouthButton",
)!;
moveSouthButton.addEventListener("click", () => movePlayer(-1, 0));
const moveWestButton = document.querySelector<HTMLButtonElement>(
  "#moveWestButton",
)!;
moveWestButton.addEventListener("click", () => movePlayer(0, -1));
const moveEastButton = document.querySelector<HTMLButtonElement>(
  "#moveEastButton",
)!;
moveEastButton.addEventListener("click", () => movePlayer(0, 1));
document.querySelector<HTMLButtonElement>("#resetPositionButton")!
  .addEventListener(
    "click",
    () => resetPlayerPosition(),
  );

function toggleAutoPositioning(): void {
  autoPositioningEnabled = !autoPositioningEnabled;
  if (autoPositioningEnabled) {
    // start watching position
    geoLocWatchPosHandlerID = navigator.geolocation.watchPosition(
      (geoLocPos) => {
        playerPosition = leaflet.latLng({
          lat: geoLocPos.coords.latitude,
          lng: geoLocPos.coords.longitude,
        });
        onPlayerMove();
      },
      undefined, // skipping the optional error callback parameter
      { enableHighAccuracy: true },
    );
    // indicate that button is enabled
    toggleAutoPosButton.classList.add("enabled");
    // disable all movement buttons
    toggleMovementButtons();
  } else {
    // stop watching position
    navigator.geolocation.clearWatch(geoLocWatchPosHandlerID);
    // indicate that button is disabled
    toggleAutoPosButton.classList.remove("enabled");
    // enable all movement buttons
    toggleMovementButtons();
  }
}
function toggleMovementButtons() {
  moveNorthButton.disabled = !moveNorthButton.disabled;
  moveSouthButton.disabled = !moveSouthButton.disabled;
  moveWestButton.disabled = !moveWestButton.disabled;
  moveEastButton.disabled = !moveEastButton.disabled;
}
function movePlayer(up: number, down: number): void {
  playerPosition = leaflet.latLng({
    lat: playerPosition.lat + up * TILE_WIDTH,
    lng: playerPosition.lng + down * TILE_WIDTH,
  });
  onPlayerMove();
}
function resetPlayerPosition(): void {
  playerPosition = OAKES_CLASSROOM;
  onPlayerMove();
}
function onPlayerMove(): void {
  playerMarker.setLatLng(playerPosition);
  map.panTo(playerPosition);
  updateNearbyCaches();
}

// Show player inventory
const playerInventoryPanel: HTMLDivElement = document.querySelector<
  HTMLDivElement
>(
  "#inventoryPanel",
)!;
updatePlayerInventoryPanel();

/** Makes the player inventory panel display the player's current coins. */
function updatePlayerInventoryPanel(): void {
  playerInventoryPanel.innerHTML = "Inventory:";
  playerCoins.forEach((coin) => {
    playerInventoryPanel.innerHTML +=
      `<br>🪙${coin.y}:${coin.x}#${coin.serial}`;
  });
}
/** Adds a coin to the player's inventory and updates the player inventory panel. */
function addCoinToPlayerInventory(coin: Coin): void {
  playerCoins.push(coin);
  updatePlayerInventoryPanel();
}
function removeCoinFromPlayerInventory(index: number): Coin {
  const coin = playerCoins.splice(index, 1)[0];
  updatePlayerInventoryPanel();
  return coin;
}

// Create board
const board = new Board(TILE_WIDTH, TILE_VISIBILITY_RADIUS);

// Spawn neighborhood caches
updateNearbyCaches();

function updateNearbyCaches(): void {
  // Remove previous nearby caches
  nearbyCaches.forEach((cache) => {
    cache.removeRect();
  });
  nearbyCaches = [];

  // Get new nearby caches
  board.getCellsNearPoint(playerPosition).forEach((cell) => {
    if (luck([cell.y, cell.x].toString()) < CACHE_SPAWN_PROBABILITY) {
      nearbyCaches.push(spawnCache(cell));
    }
  });
}

/** Adds a cache to the map at a cell's position. */
function spawnCache(cell: Cell): Cache {
  // Create cache
  const cache = new Cache(cell);

  // Set cache state
  if (cacheMementos.has(cache.getPos())) {
    // State of cache is stored in memory, so load it in
    cache.fromMemento(cacheMementos.get(cache.getPos())!);
  } else {
    // State of cache is not stored in memory, so create new state
    cache.createAsNew();
  }

  // Return
  return cache;
}

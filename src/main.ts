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

// App
const APP_NAME: string = "Geocoin GO";

// Locations
//const NULL_ISLAND: leaflet.LatLng = leaflet.latLng(0, 0);
const ORIGIN: leaflet.LatLng = leaflet.latLng( // aka Oakes classroom
  36.98949379578401,
  -122.06277128548504,
);

// Parameters
const ZOOM: number = 19;
const TILE_WIDTH: number = 1e-4; // 0.0001
const NEIGHBORHOOD_RADIUS: number = 8; // we don't find neighbors using a circle however, we use a square that's 2r x 2r
const CACHE_SPAWN_PROBABILITY: number = 0.1;
const CACHE_MAX_INITIAL_COINS: number = 10; // pretty sure this is exclusive

// Variables
let playerCoins: number = 0;

// App
const appTitle: HTMLHeadingElement = document.querySelector<HTMLHeadingElement>(
  "#appTitle",
)!;
appTitle.innerHTML = APP_NAME;
document.title = APP_NAME;

// Create map
const map: leaflet.Map = leaflet.map(document.getElementById("map")!, {
  center: ORIGIN,
  zoom: ZOOM,
  minZoom: ZOOM,
  maxZoom: ZOOM,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Give map tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: ZOOM,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Create player marker
const playerMarker: leaflet.Marker = leaflet.marker(ORIGIN);
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

// Spawn neighborhood caches
for (let i = -NEIGHBORHOOD_RADIUS; i < NEIGHBORHOOD_RADIUS; i++) {
  for (let j = -NEIGHBORHOOD_RADIUS; j < NEIGHBORHOOD_RADIUS; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
/** Adds a cache to the map given its cell number. */
function spawnCache(i: number, j: number) {
  // Convert cell numbers to lat/lng bounds
  const bounds: leaflet.LatLngBounds = leaflet.latLngBounds([
    [
      ORIGIN.lat + i * TILE_WIDTH,
      ORIGIN.lng + j * TILE_WIDTH,
    ],
    [
      ORIGIN.lat + (i + 1) * TILE_WIDTH,
      ORIGIN.lng + (j + 1) * TILE_WIDTH,
    ],
  ]);

  // Add cache (a rectangle) to map
  const cache: leaflet.Rectangle = leaflet.rectangle(bounds);
  cache.addTo(map);

  // Add cache to map
  cache.bindPopup(() => {
    // Set coins
    let coins: number = Math.floor(
      luck([i, j, "initialValue"].toString()) * CACHE_MAX_INITIAL_COINS,
    );

    // Set popup description and button
    const popup: HTMLDivElement = document.createElement("div");
    popup.innerHTML = `
			<div>This is cache (${i},${j}). It has <span id="coins">${coins}</span> coin(s).</div>
			<button id="collectButton">Collect</button>
			<button id="depositButton">Deposit</button>
		`;

    // Collect button on click event
    popup.querySelector<HTMLButtonElement>("#collectButton")!
      .addEventListener("click", () => {
        if (coins > 0) {
          coins--;
          popup.querySelector<HTMLSpanElement>("#coins")!.innerHTML = coins
            .toString();
          playerCoins++;
          updateInventoryPanelText();
        }
      });

    // Deposit button on click event
    popup.querySelector<HTMLButtonElement>("#depositButton")!
      .addEventListener("click", () => {
        if (playerCoins > 0) {
          coins++;
          popup.querySelector<HTMLSpanElement>("#coins")!.innerHTML = coins
            .toString();
          playerCoins--;
          updateInventoryPanelText();
        }
      });

    return popup;
  });
}

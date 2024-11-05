// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// App
const APP_NAME: string = "Geocoin GO";

// Locations
const ORIGIN: leaflet.LatLng = leaflet.latLng( // aka Oakes classroom
  36.98949379578401,
  -122.06277128548504,
);

// Gameplay Parameters
const ZOOM: number = 19;
const TILE_DEGREES: number = 1e-4; // 0.0001
const NEIGHBORHOOD_SIZE: number = 8;
const CACHE_SPAWN_PROBABILITY: number = 0.1;
const CACHE_MAX_INITIAL_COINS: number = 10; // pretty sure this is exclusive

// Coins
let playerCoins: number = 0;

// App
//const app: HTMLDivElement = document.querySelector<HTMLDivElement>("#app")!;
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
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
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
      ORIGIN.lat + i * TILE_DEGREES,
      ORIGIN.lng + j * TILE_DEGREES,
    ],
    [
      ORIGIN.lat + (i + 1) * TILE_DEGREES,
      ORIGIN.lng + (j + 1) * TILE_DEGREES,
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
		`;

    // Set collect button on click event
    popup.querySelector<HTMLButtonElement>("#collectButton")!
      .addEventListener("click", () => {
        coins--;
        popup.querySelector<HTMLSpanElement>("#coins")!.innerHTML = coins
          .toString();
        playerCoins++;
        updateInventoryPanelText();
      });

    return popup;
  });
}

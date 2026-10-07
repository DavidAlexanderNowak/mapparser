import * as maplibregl from "../../assets/vendor/maplibre-gl.mjs";
import {
    updateTownsToggleButton
} from "../ui/viewportControls.js";
import {
    getMinimumZoom,
    getMaximumZoom,
} from "../util/calculationUtil.js";
import {
    updateViewportStatus,
    applyZoomLimits
} from "./mapControls.js";

export let map;

const PRIMARY_STYLE = "https://tiles.stadiamaps.com/styles/stamen_terrain.json";
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const FATAL_STATUS = new Set([401, 403, 429]);
const TILE_ERROR_THRESHOLD = 5;

const MAP_VIEW_STORAGE_KEY = "town-map-parser-view";

export function initializeMap() {
    const initialMapView = getInitialMapView();
    removeMapHashFromUrl();
    map = new maplibregl.Map({
        container: "map",
        zoom: initialMapView.zoom,
        center: initialMapView.center,
        pitch: initialMapView.pitch,
        bearing: initialMapView.bearing,
        maxPitch: 0,
        hash: false,
        style: PRIMARY_STYLE,
        minZoom: getMinimumZoom(),
        maxZoom: getMaximumZoom()
    });

    attachStyleFallback(map);

    map.on("resize", applyZoomLimits);
    map.on("zoom", updateViewportStatus);
    map.on("move", updateViewportStatus);
    map.on("resize", updateViewportStatus);
    map.on("zoom", updateTownsToggleButton);
    map.on("move", updateTownsToggleButton);
    map.on("moveend", saveCurrentMapView);
    map.on("load", saveCurrentMapView);

}

export function applyMapHash() {
    const mapView = getMapViewFromHash();
    if (mapView === null) {
        removeMapHashFromUrl();
        return;
    }

    map.jumpTo({
        center: mapView.center,
        zoom: mapView.zoom,
        bearing: mapView.bearing,
        pitch: mapView.pitch
    });
    saveCurrentMapView();
    removeMapHashFromUrl();
}

function getInitialMapView() {
    const defaultMapView = {
        zoom: 12,
        center: [8.4, 48.99],
        pitch: 0,
        bearing: 0
    };
    return getMapViewFromHash() || getStoredMapView() || defaultMapView;
}

function getMapViewFromHash() {
    const hashValues = window.location.hash.substring(1).split("/").map(Number);
    if (hashValues.length < 3 || hashValues.some(value => !Number.isFinite(value))) {
        return null;
    }

    return {
        zoom: hashValues[0],
        center: [hashValues[2], hashValues[1]],
        pitch: hashValues[4] || 0,
        bearing: hashValues[3] || 0
    };
}

function getStoredMapView() {
    const storedMapView = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (storedMapView === null) {
        return null;
    }

    try {
        const mapView = JSON.parse(storedMapView);
        if (!Number.isFinite(mapView.zoom) || !Array.isArray(mapView.center)
            || mapView.center.length !== 2
            || mapView.center.some(coordinate => !Number.isFinite(coordinate))) {
            return null;
        }
        return mapView;
    } catch (exception) {
        return null;
    }
}

function removeMapHashFromUrl() {
    const baseUrl = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, document.title, baseUrl);
}

function attachStyleFallback(targetMap) {
    let usingFallback = false;
    let styleLoadedOnce = false;
    let consecutiveTileErrors = 0;

    const switchToFallback = (reason) => {
        if (usingFallback) return;
        usingFallback = true;
        console.info(`Map: switching to fallback style (${reason}).`);
        targetMap.setStyle(FALLBACK_STYLE, { diff: false });
    };

    targetMap.on("style.load", () => {
        styleLoadedOnce = true;
        if (usingFallback) hideMaritimeBorders(targetMap);
    });

    targetMap.on("sourcedata", (event) => {
        if (event.tile) consecutiveTileErrors = 0;
    });

    targetMap.on("error", (event) => {
        if (usingFallback) return;

        const status = event?.error?.status;

        if (!styleLoadedOnce) {
            switchToFallback(status ? `style not loadable, HTTP ${status}` : "style not loadable");
            return;
        }

        if (FATAL_STATUS.has(status)) {
            switchToFallback(`HTTP ${status}`);
            return;
        }

        if (event.sourceId || event.tile) {
            consecutiveTileErrors += 1;
            if (consecutiveTileErrors >= TILE_ERROR_THRESHOLD) {
                switchToFallback("repeated tile errors");
            }
        }
    });
}

function hideMaritimeBorders(targetMap) {
    for (const layer of targetMap.getStyle().layers) {
        if (layer["source-layer"] !== "boundary") continue;
        const existing = targetMap.getFilter(layer.id);
        const noMaritime = ["!=", ["get", "maritime"], 1];
        targetMap.setFilter(layer.id, existing ? ["all", existing, noMaritime] : noMaritime);
    }
}

function saveCurrentMapView() {
    const centre = map.getCenter();
    const mapView = {
        zoom: map.getZoom(),
        center: [centre.lng, centre.lat],
        pitch: map.getPitch(),
        bearing: map.getBearing()
    };
    window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(mapView));
}

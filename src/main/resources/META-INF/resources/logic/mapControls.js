const MAP_VIEW_STORAGE_KEY = "town-map-parser-view";

const BASE_MINIMUM_ZOOM = 2.5;
const BASE_MAXIMUM_ZOOM = 14;
const ZOOM_WARNING_MARGIN = 0.2;
const MINIMUM_HEIGHTMAP_ZOOM = 2;

const REFERENCE_LAYOUT_WIDTH = 1920;
const SELECTION_SQUARE_LAYOUT_FRACTION = 0.25;
const REFERENCE_SQUARE_PIXEL_WIDTH = REFERENCE_LAYOUT_WIDTH
    * SELECTION_SQUARE_LAYOUT_FRACTION * SELECTION_SQUARE_WIDTH_RATIO;
const DATA_RESOLUTION_BY_ZOOM = new Map([
    [1, "1km"],
    [2, "1km"],
    [3, "1km"],
    [4, "1km"],
    [5, "1km"],
    [6, "1km"],
    [7, "250m"],
    [8, "250m"],
    [9, "250m"],
    [10, "90m"],
    [11, "90m"],
    [12, "30m"],
    [13, "30m"],
    [14, "30m"],
    [15, "30m"],
    [16, "30m"],
    [17, "30m"]
]);

function initializeMap() {
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
        style: {
            version: 8,
            sources: {
                osm: {
                    type: "raster",
                    tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
                    tileSize: 256,
                    attribution: "&copy; OpenStreetMap Contributors",
                }
            },
            layers: [
                {
                    id: "osm",
                    type: "raster",
                    source: "osm"
                }
            ],
            sky: {}
        },
        minZoom: getMinimumZoom(),
        maxZoom: getMaximumZoom()
    });

    map.on("resize", applyZoomLimits);
    map.on("zoom", updateViewportStatus);
    map.on("move", updateViewportStatus);
    map.on("resize", updateViewportStatus);
    map.on("zoom", updateTownsToggleButton);
    map.on("move", updateTownsToggleButton);
    map.on("moveend", saveCurrentMapView);
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

function removeMapHashFromUrl() {
    const baseUrl = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, document.title, baseUrl);
}

function applyMapHash() {
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

function updateViewportStatus() {
    const square = createCentreSquareFeature();
    const spanWidthLine = createSpanWidthLine(square);
    const maxCoordinateWidth = parseFloat(formatCoordinateWidth(spanWidthLine));
    const heightMapZoom = calculateHeightMapZoom(maxCoordinateWidth);
    const mapZoom = map.getZoom();
    const resolutionElement = document.getElementById("viewport-heightmap-resolution");
    const generateButton = document.getElementById("viewport-button-generate");

    if (!isMapZoomAllowed(mapZoom)) {
        resolutionElement.textContent = mapZoom <= getMinimumAllowedZoom()
            ? "Too zoomed out"
            : "Too zoomed in";
        resolutionElement.classList.add("warning");
        generateButton.disabled = true;
        return;
    }

    const sourceTileZoom = heightMapZoom + 2;
    const dataResolution = DATA_RESOLUTION_BY_ZOOM.get(sourceTileZoom);
    resolutionElement.textContent =
        `Data resolution ${dataResolution} x ${dataResolution}`;
    resolutionElement.classList.remove("warning");
    if (!generateRequestInProgress) {
        generateButton.disabled = false;
    }
}

function calculateHeightMapZoom(coordinateWidth) {
    let zoom = 15;

    do {
        zoom--;
    } while (calculateZoomLevelCoordinateWidth(zoom) < coordinateWidth
        && zoom > MINIMUM_HEIGHTMAP_ZOOM);

    return zoom;
}

function calculateZoomLevelCoordinateWidth(zoom) {
    return 360 / Math.pow(2, zoom);
}

function isMapZoomAllowed(mapZoom) {
    return mapZoom >= getMinimumAllowedZoom() && mapZoom <= getMaximumAllowedZoom();
}

function getZoomOffset() {
    const squarePixelWidth = getSquarePixelWidth();
    if (squarePixelWidth <= 0) {
        return 0;
    }

    return Math.log2(squarePixelWidth / REFERENCE_SQUARE_PIXEL_WIDTH);
}

function toReferenceZoom(mapZoom) {
    return mapZoom - getZoomOffset();
}

function getMinimumZoom() {
    return BASE_MINIMUM_ZOOM + getZoomOffset();
}

function getMaximumZoom() {
    return BASE_MAXIMUM_ZOOM + getZoomOffset();
}

function getMinimumAllowedZoom() {
    return getMinimumZoom() + ZOOM_WARNING_MARGIN;
}

function getMaximumAllowedZoom() {
    return getMaximumZoom() - ZOOM_WARNING_MARGIN;
}

function applyZoomLimits() {
    map.setMinZoom(getMinimumZoom());
    map.setMaxZoom(getMaximumZoom());
}
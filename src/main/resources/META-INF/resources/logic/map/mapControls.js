import {generateRequestInProgress, updateTitle} from "/logic/ui/viewportLogic.js";
import {
    calculateHeightMapZoom,
    createCentreSquareFeature,
    createSpanWidthLine,
    formatCoordinateWidth,
    getMaximumAllowedZoom,
    getMaximumZoom,
    getMinimumAllowedZoom,
    getMinimumZoom,
    isMapZoomAllowed
} from "/logic/util/calculationUtil.js";

import {map} from "./mapHandler.js";

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

const MAP_CONTROLS_DIMMER_CLASS = "map-controls-dimmer";

let mapInteractionsEnabled = true;

export function updateViewportStatus() {
    if(!map) {
        return;
    }
    const square = createCentreSquareFeature(map);
    const spanWidthLine = createSpanWidthLine(square, map);
    const maxCoordinateWidth = parseFloat(formatCoordinateWidth(spanWidthLine));
    const heightMapZoom = calculateHeightMapZoom(maxCoordinateWidth);
    const mapZoom = map.getZoom();
    const generateButton = document.getElementById("viewport-button-generate");

    if (!isMapZoomAllowed(mapZoom)) {
        const viewportTitle = mapZoom <= getMinimumAllowedZoom()
            ? "Too zoomed out"
            : "Too zoomed in";
        updateTitle(viewportTitle, true);
        generateButton.disabled = true;
        return;
    }

    const sourceTileZoom = heightMapZoom + 2;
    const dataResolution = DATA_RESOLUTION_BY_ZOOM.get(sourceTileZoom);
    updateTitle(`Data resolution ${dataResolution} x ${dataResolution}`);
    if (!generateRequestInProgress) {
        generateButton.disabled = false;
    }
}

export function zoomIn() {
    _moveMapToZoom(_getZoomInTarget());
}

export function zoomOut() {
    _moveMapToZoom(_getZoomOutTarget());
}

export function disableMapInteractions() {
    if (!map) {
        return;
    }

    mapInteractionsEnabled = false;
    map.stop();
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.keyboard.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
    map.touchPitch.disable();
}

export function showMapControlsDimmer() {
    if (!map) {
        return;
    }

    if (document.body.querySelector("." + MAP_CONTROLS_DIMMER_CLASS)) {
        return;
    }

    const dimmer = document.createElement("div");
    dimmer.classList.add("component-overlay-dimmer", MAP_CONTROLS_DIMMER_CLASS);
    document.body.appendChild(dimmer);
}

export function enableMapInteractions() {
    if (!map) {
        return;
    }

    mapInteractionsEnabled = true;
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.boxZoom.enable();
    map.dragRotate.enable();
    map.keyboard.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
    map.touchPitch.enable();
    _removeMapControlsDimmer();
}

function _removeMapControlsDimmer() {
    const dimmer = document.body.querySelector("." + MAP_CONTROLS_DIMMER_CLASS);
    if (dimmer) {
        dimmer.remove();
    }
}

function _moveMapToZoom(zoom) {
    if (!mapInteractionsEnabled) {
        return;
    }

    map.easeTo({zoom: zoom, duration: 200, essential: true});
}

function _getZoomInTarget() {
    const currentZoom = map.getZoom();
    const minimumAllowedZoom = getMinimumAllowedZoom();
    return currentZoom < minimumAllowedZoom
        ? minimumAllowedZoom
        : currentZoom + 0.1;
}

function _getZoomOutTarget() {
    const currentZoom = map.getZoom();
    const maximumAllowedZoom = getMaximumAllowedZoom();
    return currentZoom > maximumAllowedZoom
        ? maximumAllowedZoom
        : currentZoom - 0.1;
}

export function trueBearing() {
    if (!mapInteractionsEnabled) {
        return;
    }

    map.easeTo({bearing: 0, duration: 1000, essential: true});
}

export function applyZoomLimits() {
    map.setMinZoom(getMinimumZoom());
    map.setMaxZoom(getMaximumZoom());
}

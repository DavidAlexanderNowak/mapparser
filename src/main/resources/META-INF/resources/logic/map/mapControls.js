import {
    generateRequestInProgress
} from "../ui/viewportControls.js";
import {
    createCentreSquareFeature,
    createSpanWidthLine,
    formatCoordinateWidth,
    getMinimumZoom,
    getMaximumZoom,
    calculateHeightMapZoom,
    isMapZoomAllowed,
    getMinimumAllowedZoom
} from "../util/calculationUtil.js";

import { map } from "./mapHandler.js";

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

export function updateViewportStatus() {
    const square = createCentreSquareFeature(map);
    const spanWidthLine = createSpanWidthLine(square, map);
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

export function applyZoomLimits() {
    map.setMinZoom(getMinimumZoom());
    map.setMaxZoom(getMaximumZoom());
}
export const SELECTION_SQUARE_WIDTH_RATIO = 921 / 937;

const BASE_MINIMUM_ZOOM = 2.5;
const BASE_MAXIMUM_ZOOM = 14;
const ZOOM_WARNING_MARGIN = 0.2;
const MINIMUM_HEIGHTMAP_ZOOM = 2;

const REFERENCE_LAYOUT_WIDTH = 1920;
const SELECTION_SQUARE_LAYOUT_FRACTION = 0.25;
const REFERENCE_SQUARE_PIXEL_WIDTH = REFERENCE_LAYOUT_WIDTH
    * SELECTION_SQUARE_LAYOUT_FRACTION * SELECTION_SQUARE_WIDTH_RATIO;

export function getViewportCentre() {
    const viewportBox = document.getElementById("viewport-box");
    const viewportBoxRect = viewportBox.getBoundingClientRect();
    const centreX = viewportBoxRect.left + viewportBoxRect.width / 2;

    var squareHeight = viewportBox.getBoundingClientRect().height * 921 / 1217;
    var squareTopOffset = viewportBox.getBoundingClientRect().height * 64 / 1217;
    const centreY = (viewportBoxRect.top + squareTopOffset) + squareHeight / 2;

    return { x: centreX, y: centreY };
}

export function createCentreSquareFeature(map) {
    var halfSize = getSquarePixelWidth() / 2;
    var viewportCentre = getViewportCentre();

    var topLeft = map.unproject([viewportCentre.x - halfSize, viewportCentre.y - halfSize]);
    var topRight = map.unproject([viewportCentre.x + halfSize, viewportCentre.y - halfSize]);
    var bottomRight = map.unproject([viewportCentre.x + halfSize, viewportCentre.y + halfSize]);
    var bottomLeft = map.unproject([viewportCentre.x - halfSize, viewportCentre.y + halfSize]);

    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [[
                [topLeft.lng, topLeft.lat],
                [topRight.lng, topRight.lat],
                [bottomRight.lng, bottomRight.lat],
                [bottomLeft.lng, bottomLeft.lat],
                [topLeft.lng, topLeft.lat]
            ]]
        },
        properties: {}
    };
}

export function getSquarePixelWidth() {
    const viewportBox = document.getElementById("viewport-box");
    return viewportBox.getBoundingClientRect().width * SELECTION_SQUARE_WIDTH_RATIO;
}

export function createSquareWidthLine(map) {
    let halfSize = getSquarePixelWidth() / 2;
    let viewportCentre = getViewportCentre();
    let bearing = map.getBearing();
    let radians = -bearing * Math.PI / 180;

    let leftScreenPoint = [
        viewportCentre.x - halfSize * Math.cos(radians),
        viewportCentre.y - halfSize * Math.sin(radians)
    ];
    let rightScreenPoint = [
        viewportCentre.x + halfSize * Math.cos(radians),
        viewportCentre.y + halfSize * Math.sin(radians)
    ];

    let leftPoint = map.unproject(leftScreenPoint);
    let rightPoint = map.unproject(rightScreenPoint);

    return {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: [
                [leftPoint.lng, leftPoint.lat],
                [rightPoint.lng, rightPoint.lat]
            ]
        },
        properties: {}
    };
}

export function createSpanWidthLine(squareFeature, map) {
    let bearing = map.getBearing();
    let ring = squareFeature.geometry.coordinates[0];
    let westernMostEdge;
    let easternMostEdge;
    if (Math.abs(bearing) <= 90) {
        westernMostEdge = ring[0][0] < ring[3][0] ? ring[0] : ring[3];
        easternMostEdge = ring[1][0] > ring[2][0] ? ring[1] : ring[2];
    } else {
        westernMostEdge = ring[1][0] < ring[2][0] ? ring[1] : ring[2];
        easternMostEdge = ring[0][0] > ring[3][0] ? ring[0] : ring[3];
    }
    let bottomLatitude = Math.min(ring[2][1], ring[3][1]);

    return {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: [
                [westernMostEdge[0], bottomLatitude],
                [easternMostEdge[0], bottomLatitude]
            ]
        },
        properties: {}
    };
}

export function createSpanHeightLine(squareFeature, map) {
    let bearing = map.getBearing();
    let ring = squareFeature.geometry.coordinates[0];
    let northernMostEdge;
    let southernMostEdge;
    if (Math.abs(bearing) <= 90) {
        northernMostEdge = ring[0][1] > ring[1][1] ? ring[0] : ring[1];
        southernMostEdge = ring[2][1] < ring[3][1] ? ring[2] : ring[3];
    } else {
        northernMostEdge = ring[2][1] < ring[3][1] ? ring[3] : ring[2];
        southernMostEdge = ring[0][1] > ring[1][1] ? ring[1] : ring[0];
    }
    let rightLongitude = Math.max(ring[0][0], ring[2][0]);

    return {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: [
                [rightLongitude, northernMostEdge[1]],
                [rightLongitude, southernMostEdge[1]]
            ]
        },
        properties: {}
    };
}

export function formatCoordinateWidth(lineFeature) {
    var coordinates = lineFeature.geometry.coordinates;
    var start = coordinates[0];
    var end = coordinates[1];
    var widthInCoordinates = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));

    return widthInCoordinates.toFixed(3);
}

export function formatCoordinateHeight(lineFeature) {
    var coordinates = lineFeature.geometry.coordinates;
    var start = coordinates[0];
    var end = coordinates[1];
    var heightInCoordinates = Math.abs(end[1] - start[1]);

    return heightInCoordinates.toFixed(3);
}

export function calculateHeightMapZoom(coordinateWidth) {
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

export function isMapZoomAllowed(mapZoom) {
    return mapZoom >= getMinimumAllowedZoom() && mapZoom <= getMaximumAllowedZoom();
}

function getZoomOffset() {
    const squarePixelWidth = getSquarePixelWidth();
    if (squarePixelWidth <= 0) {
        return 0;
    }

    return Math.log2(squarePixelWidth / REFERENCE_SQUARE_PIXEL_WIDTH);
}

export function toReferenceZoom(mapZoom) {
    return mapZoom - getZoomOffset();
}

export function getMinimumZoom() {
    return BASE_MINIMUM_ZOOM + getZoomOffset();
}

export function getMaximumZoom() {
    return BASE_MAXIMUM_ZOOM + getZoomOffset();
}

export function getMinimumAllowedZoom() {
    return getMinimumZoom() + ZOOM_WARNING_MARGIN;
}

export function getMaximumAllowedZoom() {
    return getMaximumZoom() - ZOOM_WARNING_MARGIN;
}
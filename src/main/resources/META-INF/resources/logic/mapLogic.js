var map;

var seaLevelPercentileMode = false;
var seaLevelAutoMode = false;
var townGranularity = 0;

const SELECTION_SQUARE_WIDTH_RATIO = 921 / 937;

function updateAndGenerateMap() {
    let viewportCentre = getViewportCentre();
    let centreCoordinates = map.unproject([viewportCentre.x, viewportCentre.y]);
    let rotationDegrees = map.getBearing();
    let square = createCentreSquareFeature();
    let squareWidthLine = createSquareWidthLine(square);
    let spanWidthLine = createSpanWidthLine(square);
    let spanHeightLine = createSpanHeightLine(square);

    const positionData = {
        x: parseFloat(centreCoordinates.lng.toFixed(3)),
        y: parseFloat(centreCoordinates.lat.toFixed(3))
    };

    let seaLevelValue = document.getElementById("viewport-input-seaLevel").value;

    // TODO auto mode currently just sets the sea level to 0
    // later pass a new parameter to tell backend to do auto mode.
    // Something like, if nothing is under 0, then use percentile mode with 0.1% or something like that
    // if there are values under 0, the use absolute mode with 0

    if (seaLevelAutoMode) {
        seaLevelValue = 0;
        seaLevelPercentileMode = false;
    }

    const requestData = {
        centre: positionData,
        rotationDegrees: parseInt(rotationDegrees.toFixed(2)),
        coordinateWidth: parseFloat(formatCoordinateWidth(squareWidthLine)),
        maxCoordinateWidth: parseFloat(formatCoordinateWidth(spanWidthLine)),
        maxCoordinateHeight: parseFloat(formatCoordinateHeight(spanHeightLine)),
        isSeaLevelPercentile: seaLevelPercentileMode,
        seaLevel: seaLevelValue,
        townGranularity: townGranularity,
        includeTownData: townGranularity > 0
    };

    sendGenerateRequest(requestData);
}

function getViewportCentre() {
    const viewportBox = document.getElementById("viewport-box");
    const viewportBoxRect = viewportBox.getBoundingClientRect();
    const centreX = viewportBoxRect.left + viewportBoxRect.width / 2;

    var squareHeight = viewportBox.getBoundingClientRect().height * 921 / 1217;
    var squareTopOffset = viewportBox.getBoundingClientRect().height * 64 / 1217;
    const centreY = (viewportBoxRect.top + squareTopOffset) + squareHeight / 2;

    return { x: centreX, y: centreY };
}

function createCentreSquareFeature() {
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

function getSquarePixelWidth() {
    const viewportBox = document.getElementById("viewport-box");
    return viewportBox.getBoundingClientRect().width * SELECTION_SQUARE_WIDTH_RATIO;
}

function createSquareWidthLine() {
    var halfSize = getSquarePixelWidth() / 2;
    var viewportCentre = getViewportCentre();
    var bearing = map.getBearing();
    var radians = -bearing * Math.PI / 180;

    var leftScreenPoint = [
        viewportCentre.x - halfSize * Math.cos(radians),
        viewportCentre.y - halfSize * Math.sin(radians)
    ];
    var rightScreenPoint = [
        viewportCentre.x + halfSize * Math.cos(radians),
        viewportCentre.y + halfSize * Math.sin(radians)
    ];

    var leftPoint = map.unproject(leftScreenPoint);
    var rightPoint = map.unproject(rightScreenPoint);

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

function createSpanWidthLine(squareFeature) {
    var bearing = map.getBearing();
    var ring = squareFeature.geometry.coordinates[0];
    if (Math.abs(bearing) <= 90) {
        var westernMostEdge = ring[0][0] < ring[3][0] ? ring[0] : ring[3];
        var easternMostEdge = ring[1][0] > ring[2][0] ? ring[1] : ring[2];
    } else {
        var westernMostEdge = ring[1][0] < ring[2][0] ? ring[1] : ring[2];
        var easternMostEdge = ring[0][0] > ring[3][0] ? ring[0] : ring[3];
    }
    var bottomLatitude = Math.min(ring[2][1], ring[3][1]);

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

function createSpanHeightLine(squareFeature) {
    var bearing = map.getBearing();
    var ring = squareFeature.geometry.coordinates[0];
    if (Math.abs(bearing) <= 90) {
        var northernMostEdge = ring[0][1] > ring[1][1] ? ring[0] : ring[1];
        var southernMostEdge = ring[2][1] < ring[3][1] ? ring[2] : ring[3];
    } else {
        var northernMostEdge = ring[2][1] < ring[3][1] ? ring[3] : ring[2];
        var southernMostEdge = ring[0][1] > ring[1][1] ? ring[1] : ring[0];
    }
    var rightLongitude = Math.max(ring[0][0], ring[2][0]);

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

function formatCoordinateWidth(lineFeature) {
    var coordinates = lineFeature.geometry.coordinates;
    var start = coordinates[0];
    var end = coordinates[1];
    var widthInCoordinates = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));

    return widthInCoordinates.toFixed(3);
}

function formatCoordinateHeight(lineFeature) {
    var coordinates = lineFeature.geometry.coordinates;
    var start = coordinates[0];
    var end = coordinates[1];
    var heightInCoordinates = Math.abs(end[1] - start[1]);

    return heightInCoordinates.toFixed(3);
}

import {seaLevelAutoMode, seaLevelRelativeMode, townGranularity} from "/logic/ui/viewportControls.js";
import {
    createCentreSquareFeature,
    createSpanHeightLine,
    createSpanWidthLine,
    createSquareWidthLine,
    formatCoordinateHeight,
    formatCoordinateWidth,
    getViewportCentre
} from "/logic/util/calculationUtil.js";
import {sendDownloadRequest, sendGenerateRequest} from "/logic/util/requestHandler.js";

import {map} from "./mapHandler.js";

export function updateAndGenerateMap(isPreview) {
    let viewportCentre = getViewportCentre();
    let centreCoordinates = map.unproject([viewportCentre.x, viewportCentre.y]);
    let rotationDegrees = map.getBearing();
    let square = createCentreSquareFeature(map);
    let squareWidthLine = createSquareWidthLine(map);
    let spanWidthLine = createSpanWidthLine(square, map);
    let spanHeightLine = createSpanHeightLine(square, map);

    const positionData = {
        x: parseFloat(centreCoordinates.lng.toFixed(3)),
        y: parseFloat(centreCoordinates.lat.toFixed(3))
    };

    let seaLevelValue = document.getElementById("viewport-input-seaLevel").value;

    let effectiveSeaLevelRelativeMode = seaLevelRelativeMode;
    if (seaLevelAutoMode) {
        seaLevelValue = 0;
        effectiveSeaLevelRelativeMode = false;
    }

    const requestData = {
        centre: positionData,
        rotationDegrees: parseInt(rotationDegrees.toFixed(2)),
        coordinateWidth: parseFloat(formatCoordinateWidth(squareWidthLine)),
        maxCoordinateWidth: parseFloat(formatCoordinateWidth(spanWidthLine)),
        maxCoordinateHeight: parseFloat(formatCoordinateHeight(spanHeightLine)),
        seaLevelRelativeMode: effectiveSeaLevelRelativeMode,
        seaLevel: seaLevelValue,
        townGranularity: townGranularity,
        includeTownData: townGranularity > 0 && !isPreview,
        preview: isPreview
    };
    if (isPreview) {
        sendGenerateRequest(requestData);
    } else {
        sendDownloadRequest(requestData);
    }
}

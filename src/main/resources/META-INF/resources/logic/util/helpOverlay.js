const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const HELP_CONTROLS_SELECTOR = "button[title], input[title], button[data-help-text], input[data-help-text]";
const HELP_COLUMN_WIDTH_UNITS = 22;
const HELP_SCREEN_MARGIN_UNITS = 1.5;
const ROTATION_HINT_TEXT = "Rotate the map with<br>[ctrl-click + drag] or [right-click + drag]";
const HELP_LINE_GAP_UNITS = 0.4;
const HELP_SIDE_ENTRY_TOLERANCE_UNITS = 0.5;
const HELP_ARROW_LENGTH_UNITS = 0.7;
const HELP_ARROW_WIDTH_UNITS = 0.5;

const HELP_LABEL_POSITIONS = {
    "viewport-button-close": {side: "left", offset: 0},
    "viewport-button-help": {side: "right", offset: 0},
    "viewport-button-reset": {side: "right", offset: 5},
    "viewport-button-info": {side: "right", offset: 10},
    "viewport-button-seaLevelMode": {side: "left", offset: 0},
    "viewport-input-seaLevel": {side: "left", offset: -5},
    "viewport-button-seaLevelAuto": {side: "right", offset: -5},
    "viewport-button-zoomIn": {side: "left", offset: 0},
    "viewport-button-zoomOut": {side: "left", offset: 5},
    "viewport-button-trueBearing": {side: "left", offset: 10},
    "viewport-button-toggleTowns": {side: "right", offset: 0},
    "viewport-button-clearPreview": {side: "right", offset: 2},
    "viewport-button-generate": {side: "right", offset: 10}
};

let helpOverlayOpen = false;
let responsiveUnitPixels;
let helpOverlayRenderScheduled = false;
let viewportResizeObserver;

export function initializeHelpOverlay() {
    window.addEventListener("resize", scheduleHelpOverlayRender);
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", scheduleHelpOverlayRender);
        window.visualViewport.addEventListener("scroll", scheduleHelpOverlayRender);
    }

    viewportResizeObserver = new ResizeObserver(scheduleHelpOverlayRender);
    viewportResizeObserver.observe(document.getElementById("viewport-dialogue"));

    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeHelpOverlay();
        }
    });
}

function scheduleHelpOverlayRender() {
    if (!helpOverlayOpen || helpOverlayRenderScheduled) {
        return;
    }

    helpOverlayRenderScheduled = true;
    window.requestAnimationFrame(function () {
        helpOverlayRenderScheduled = false;
        if (helpOverlayOpen) {
            renderHelpOverlay();
        }
    });
}

export function toggleHelpOverlay() {
    if (helpOverlayOpen) {
        closeHelpOverlay();
    } else {
        openHelpOverlay();
    }
}

function openHelpOverlay() {
    helpOverlayOpen = true;
    $("body").append(createHelpOverlayElement());
    renderHelpOverlay();
}

function closeHelpOverlay() {
    if (!helpOverlayOpen) {
        return;
    }
    helpOverlayOpen = false;
    helpOverlayOpen = false;
    $("#help-overlay").remove();
    $("#viewport-button-help").removeClass("is-toggled");
}

function createHelpOverlayElement() {
    const overlay = document.createElement("div");
    overlay.id = "help-overlay";
    overlay.className = "help-overlay";

    const dimmer = document.createElement("div");
    dimmer.className = "help-overlay-dimmer";
    dimmer.addEventListener("click", closeHelpOverlay);
    overlay.appendChild(dimmer);
    overlay.appendChild(createRotationHint());

    return overlay;
}

function createRotationHint() {
    const hint = document.createElement("div");
    hint.className = "help-overlay-rotation-hint";

    const label = document.createElement("span");
    label.innerHTML = ROTATION_HINT_TEXT;
    hint.appendChild(label);

    return hint;
}

function renderHelpOverlay() {
    const overlay = document.getElementById("help-overlay");
    clearHelpOverlayContent(overlay);
    responsiveUnitPixels = measureResponsiveUnitPixels();
    layoutHelpLabels(overlay, collectHelpEntries());
}

function clearHelpOverlayContent(overlay) {
    $(overlay).find(".help-overlay-label, .help-overlay-lines").remove();
}

function collectHelpEntries() {
    const entries = [];

    $("#viewport-dialogue").find(HELP_CONTROLS_SELECTOR).each(function () {
        const helpText = $(this).attr("data-help-text") || $(this).attr("title");
        const position = HELP_LABEL_POSITIONS[this.id];

        if (!helpText || position === undefined) {
            return;
        }

        entries.push({control: this, helpText: helpText, position: position});
    });

    return entries;
}

function layoutHelpLabels(overlay, entries) {
    const columnWidth = toWidthPixels(HELP_COLUMN_WIDTH_UNITS);

    entries.forEach(function (entry) {
        const columnLeft = getHelpColumnLeft(entry.position.side);
        const label = appendHelpLabel(
            overlay,
            entry.helpText,
            entry.position.side,
            columnLeft,
            columnWidth
        );

        entry.label = label;
        label.style.top = getHelpLabelTop(entry) + "px";
    });

    drawHelpLeaderLines(overlay, entries);
}

function getHelpLabelTop(entry) {
    const controlBounds = entry.control.getBoundingClientRect();
    const labelHeight = entry.label.getBoundingClientRect().height;
    const controlCentre = controlBounds.top + controlBounds.height / 2;
    const offset = toHeightPixels(entry.position.offset);

    return controlCentre + offset - labelHeight / 2;
}

function drawHelpLeaderLines(overlay, entries) {
    const lineLayer = createHelpLineLayer();

    entries.forEach(function (entry) {
        lineLayer.appendChild(createHelpLeaderLine(entry));
    });

    overlay.appendChild(lineLayer);
}

function createHelpLineLayer() {
    const lineLayer = document.createElementNS(SVG_NAMESPACE, "svg");
    lineLayer.setAttribute("class", "help-overlay-lines");
    lineLayer.appendChild(createHelpArrowheadDefinition());
    return lineLayer;
}

function createHelpArrowheadDefinition() {
    const arrowLength = toWidthPixels(HELP_ARROW_LENGTH_UNITS);
    const arrowWidth = toWidthPixels(HELP_ARROW_WIDTH_UNITS);
    const arrowhead = document.createElementNS(SVG_NAMESPACE, "path");
    arrowhead.setAttribute("class", "help-overlay-arrowhead");
    arrowhead.setAttribute("d", "M 0 0 L " + arrowLength + " " + arrowWidth / 2
        + " L 0 " + arrowWidth + " z");

    const marker = document.createElementNS(SVG_NAMESPACE, "marker");
    marker.setAttribute("id", "help-overlay-arrowhead");
    marker.setAttribute("markerUnits", "userSpaceOnUse");
    marker.setAttribute("markerWidth", arrowLength);
    marker.setAttribute("markerHeight", arrowWidth);
    marker.setAttribute("refX", arrowLength);
    marker.setAttribute("refY", arrowWidth / 2);
    marker.setAttribute("orient", "auto");
    marker.appendChild(arrowhead);

    const definitions = document.createElementNS(SVG_NAMESPACE, "defs");
    definitions.appendChild(marker);
    return definitions;
}

function createHelpLeaderLine(entry) {
    const labelBounds = entry.label.getBoundingClientRect();
    const controlBounds = entry.control.getBoundingClientRect();
    const lineGap = toWidthPixels(HELP_LINE_GAP_UNITS);
    const labelIsLeft = entry.position.side === "left";
    const startX = labelIsLeft ? labelBounds.right + lineGap : labelBounds.left - lineGap;
    const startY = labelBounds.top + labelBounds.height / 2;
    const entryPoint = getControlEntryPoint(controlBounds, entry.position.offset, labelIsLeft);
    const points = getHelpLeaderPoints(startX, startY, entryPoint);
    const line = document.createElementNS(SVG_NAMESPACE, "polyline");

    line.setAttribute("class", "help-overlay-line");
    line.setAttribute("points", points.map(point => point.x + "," + point.y).join(" "));
    line.setAttribute("marker-end", "url(#help-overlay-arrowhead)");

    return line;
}

function getControlEntryPoint(controlBounds, offset, labelIsLeft) {
    if (offset < 0) {
        return {
            x: controlBounds.left + controlBounds.width / 2,
            y: controlBounds.top
        };
    }

    if (offset > 0) {
        return {
            x: controlBounds.left + controlBounds.width / 2,
            y: controlBounds.bottom
        };
    }

    return {
        x: labelIsLeft ? controlBounds.left : controlBounds.right,
        y: controlBounds.top + controlBounds.height / 2,
        isSide: true
    };
}

function getHelpLeaderPoints(startX, startY, entryPoint) {
    const finalEntryPoint = flattenNearHorizontalEntry(startY, entryPoint);

    return withoutRepeatedPoints([
        {x: startX, y: startY},
        {x: finalEntryPoint.x, y: startY},
        finalEntryPoint
    ]);
}

function flattenNearHorizontalEntry(startY, entryPoint) {
    const tolerance = toHeightPixels(HELP_SIDE_ENTRY_TOLERANCE_UNITS);

    if (!entryPoint.isSide || Math.abs(entryPoint.y - startY) > tolerance) {
        return entryPoint;
    }

    return {
        x: entryPoint.x,
        y: startY
    };
}

function withoutRepeatedPoints(points) {
    return points.filter(function (point, index) {
        return index === 0
            || point.x !== points[index - 1].x
            || point.y !== points[index - 1].y;
    });
}

function getHelpColumnLeft(side) {
    const margin = toWidthPixels(HELP_SCREEN_MARGIN_UNITS);

    return side === "left"
        ? margin
        : window.innerWidth - margin - toWidthPixels(HELP_COLUMN_WIDTH_UNITS);
}

function appendHelpLabel(overlay, helpText, side, columnLeft, columnWidth) {
    const label = document.createElement("span");
    label.className = "help-overlay-label help-overlay-label-" + side;
    label.textContent = helpText;
    label.style.left = columnLeft + "px";
    label.style.width = columnWidth + "px";
    overlay.appendChild(label);

    return label;
}

function toWidthPixels(unitCount) {
    return unitCount * responsiveUnitPixels["--unit-width"];
}

function toHeightPixels(unitCount) {
    return unitCount * responsiveUnitPixels["--unit-height"];
}

function measureResponsiveUnitPixels() {
    const measurementElement = document.createElement("div");
    measurementElement.style.position = "absolute";
    measurementElement.style.width = "var(--unit-width)";
    measurementElement.style.height = "var(--unit-height)";
    document.body.appendChild(measurementElement);

    const measurement = {
        "--unit-width": measurementElement.getBoundingClientRect().width,
        "--unit-height": measurementElement.getBoundingClientRect().height
    };
    measurementElement.remove();

    return measurement;
}

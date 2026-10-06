const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const HELP_CONTROLS_SELECTOR = "button[title], input[title], button[data-help-text], input[data-help-text]";
const HELP_COLUMN_WIDTH_VW = 22;
const HELP_SCREEN_MARGIN_VW = 1.5;
const HELP_LABEL_GAP_VW = 0.6;
const HELP_ROW_CLEARANCE_VW = 1.2;
const HELP_LINE_GAP_VW = 0.4;
const HELP_ARROW_STANDOFF_VW = 0.2;
const HELP_ARROW_LENGTH_VW = 0.7;
const HELP_ARROW_WIDTH_VW = 0.5;
const ROTATION_HINT_TEXT = "Rotate the map with<br>[ctrl-click + drag] or [right-click + drag]";

// A label counts as level with its control while it is centred on it
const HELP_LEVEL_TOLERANCE_PX = 0.5;

var helpOverlayOpen = false;

function initializeHelpOverlay() {
    $(window).on("resize", function () {
        if (helpOverlayOpen) {
            renderHelpOverlay();
        }
    });

    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeHelpOverlay();
        }
    });
}

function toggleHelpOverlay() {
    if (helpOverlayOpen) {
        closeHelpOverlay();
    } else {
        openHelpOverlay();
    }
}

function openHelpOverlay() {
    helpOverlayOpen = true;

    $("body").append(createHelpOverlayElement());
    $("#viewport-button-help").addClass("is-toggled");

    renderHelpOverlay();
}

function closeHelpOverlay() {
    if (!helpOverlayOpen) {
        return;
    }

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

/* * * * * * * * * *
 * Overlay content *
 * * * * * * * * * */

/* Rebuilt from scratch on every render, so a resized window simply lays the
   same entries out again against the new control positions */
function renderHelpOverlay() {
    const overlay = document.getElementById("help-overlay");
    clearHelpOverlayContent(overlay);

    const entries = collectHelpEntries();
    const rows = groupEntriesIntoRows(entries);
    rows.forEach(function (row) {
        setRowApproach(row, rows);
    });

    layoutHelpColumn(overlay, rows, "left");
    layoutHelpColumn(overlay, rows, "right");
    drawHelpLeaderLines(overlay, entries);
}

function clearHelpOverlayContent(overlay) {
    $(overlay).find(".help-overlay-label, .help-overlay-lines").remove();
}

/* Only the viewport is explained, and only the parts of it that can be used.
   The side text boxes carry their own written contents, and a reading such as
   the heightmap resolution answers itself. The help text is read from the
   control itself, so the entries pick up the texts that are rewritten while
   the tool is used. A data-help-text attribute says what the overlay should
   read where the tooltip is too short to explain the control */
function collectHelpEntries() {
    const entries = [];

    $("#viewport-container").find(HELP_CONTROLS_SELECTOR).each(function () {
        const helpText = $(this).attr("data-help-text") || $(this).attr("title");
        if (!helpText) {
            return;
        }

        entries.push({bounds: this.getBoundingClientRect(), helpText: helpText});
    });

    return entries;
}

/* * * * * * * * * * * *
 * Rows of controls    *
 * * * * * * * * * * * */

/* The controls stand in rows across the viewport. A line that ran straight at
   the height of its own row would pass over the controls beside it, so the
   rows are what the placement works with rather than single controls */
function groupEntriesIntoRows(entries) {
    const rows = [];

    entries.forEach(function (entry) {
        const row = rows.find(candidate => overlapsRow(candidate, entry.bounds));

        if (row === undefined) {
            entry.row = {top: entry.bounds.top, bottom: entry.bounds.bottom, entries: [entry]};
            rows.push(entry.row);
            return;
        }

        row.top = Math.min(row.top, entry.bounds.top);
        row.bottom = Math.max(row.bottom, entry.bounds.bottom);
        row.entries.push(entry);
        entry.row = row;
    });

    return rows.sort((first, second) => first.top - second.top);
}

function overlapsRow(row, bounds) {
    return bounds.top < row.bottom && bounds.bottom > row.top;
}

/* A row is approached from whichever side has more room before the next row
   or the screen edge. That free side is where the lanes and the arrowheads
   go, which is what keeps a line off the controls standing beside its own */
function setRowApproach(row, rows) {
    row.approachesFromBelow = getFreeSpaceBelow(row, rows) >= getFreeSpaceAbove(row, rows);
}

function getFreeSpaceAbove(row, rows) {
    const bottomsAbove = rows.filter(other => other.bottom <= row.top).map(other => other.bottom);

    return row.top - (bottomsAbove.length === 0 ? 0 : Math.max(...bottomsAbove));
}

function getFreeSpaceBelow(row, rows) {
    const topsBelow = rows.filter(other => other.top >= row.bottom).map(other => other.top);

    return (topsBelow.length === 0 ? window.innerHeight : Math.min(...topsBelow)) - row.bottom;
}

/* * * * * * * * * *
 * Label placement *
 * * * * * * * * * */
function layoutHelpColumn(overlay, rows, side) {
    const columnLeft = getHelpColumnLeft(side);
    const columnWidth = toPixels(HELP_COLUMN_WIDTH_VW);
    const columnEntries = [];

    /* The rows are worked through from the bottom upwards, so a row deciding
       whether it can take a straight run already knows what stands below it */
    rows.slice().reverse().forEach(function (row) {
        const rowEntries = row.entries.filter(entry => getEntrySide(entry) === side);

        sortByDistanceFromColumn(rowEntries, side);
        rowEntries.forEach(function (entry) {
            entry.left = columnLeft;
            entry.width = columnWidth;
            entry.label = appendHelpLabel(overlay, entry.helpText, side, columnLeft, columnWidth);
            entry.height = entry.label.offsetHeight;
        });

        placeRowLabels(rowEntries, row, columnEntries);
        columnEntries.push(...rowEntries);
    });

    keepHelpLabelsApart(columnEntries);
    columnEntries.forEach(function (entry) {
        entry.label.style.top = entry.top + "px";
    });
}

function getEntrySide(entry) {
    return entry.bounds.left + entry.bounds.width / 2 < window.innerWidth / 2 ? "left" : "right";
}

function sortByDistanceFromColumn(rowEntries, side) {
    rowEntries.sort(function (first, second) {
        return side === "left"
            ? first.bounds.left - second.bounds.left
            : second.bounds.right - first.bounds.right;
    });
}

/* The control nearest the column has nothing standing between it and its own
   label, so its line runs straight in from the side at the height of its row
   and spends no vertical space at all. It keeps that run only while the label
   stays clear of the labels already placed below it, which is what working
   upwards is for: the crowded rows at the bottom take the straight runs
   first, and a row with room beside it gives way and takes a lane instead.

   The lanes step away from the row in the order the controls stand from the
   column outwards, so the control nearest the row takes the lane nearest it.
   The lines then nest inside one another instead of crossing: a line only
   ever turns beyond the controls whose lanes lie closer to the row */
function placeRowLabels(rowEntries, row, placedEntries) {
    const gap = toPixels(HELP_LABEL_GAP_VW);
    const clearance = toPixels(HELP_ROW_CLEARANCE_VW);
    let laneEdge = row.approachesFromBelow ? row.bottom + clearance : row.top - clearance;

    rowEntries.forEach(function (entry, index) {
        entry.connectsFromSide = index === 0 && fitsLevelWithControl(entry, placedEntries);

        if (entry.connectsFromSide) {
            entry.top = getLevelTop(entry);
            return;
        }

        entry.top = row.approachesFromBelow ? laneEdge : laneEdge - entry.height;
        laneEdge += (row.approachesFromBelow ? 1 : -1) * (entry.height + gap);
    });
}

function getLevelTop(entry) {
    return entry.bounds.top + (entry.bounds.height - entry.height) / 2;
}

/* Only the rows already placed below can be in the way. The row's own lanes
   begin a full row clearance beyond the row, which is more than a label can
   ever overhang its own control by, so they need no checking */
function fitsLevelWithControl(entry, placedEntries) {
    const gap = toPixels(HELP_LABEL_GAP_VW);
    const levelTop = getLevelTop(entry);

    return placedEntries.every(placed => levelTop >= placed.top + placed.height + gap
        || levelTop + entry.height + gap <= placed.top);
}

/* The lanes are placed in the free space beside their own row, which normally
   leaves the labels of the different rows clear of one another. A short window
   can still bring two of those groups together, so a final pass pushes
   overlapping labels apart. A label level with its own control is what earns
   that control a straight run, so it stays put and the rest flow past it. The
   pass only moves labels along the column and never reorders them, so the
   lines stay free of crossings */
function keepHelpLabelsApart(columnEntries) {
    const gap = toPixels(HELP_LABEL_GAP_VW);
    let nextFreeTop = toPixels(HELP_SCREEN_MARGIN_VW);

    columnEntries.sort((first, second) => first.top - second.top);
    columnEntries.forEach(function (entry) {
        if (!entry.connectsFromSide) {
            entry.top = Math.max(entry.top, nextFreeTop);
        }
        nextFreeTop = entry.top + entry.height + gap;
    });

    pushHelpLabelsBackIntoView(columnEntries, gap);
}

function pushHelpLabelsBackIntoView(columnEntries, gap) {
    let lowestAllowedBottom = window.innerHeight - toPixels(HELP_SCREEN_MARGIN_VW);

    for (let index = columnEntries.length - 1; index >= 0; index--) {
        const entry = columnEntries[index];
        if (!entry.connectsFromSide) {
            entry.top = Math.min(entry.top, lowestAllowedBottom - entry.height);
        }
        lowestAllowedBottom = entry.top - gap;
    }
}

function getHelpColumnLeft(side) {
    const margin = toPixels(HELP_SCREEN_MARGIN_VW);

    return side === "left"
        ? margin
        : window.innerWidth - margin - toPixels(HELP_COLUMN_WIDTH_VW);
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

/* * * * * * * * *
 * Leader lines  *
 * * * * * * * * */
function drawHelpLeaderLines(overlay, entries) {
    const lineLayer = createHelpLineLayer();
    entries.forEach(function (entry) {
        const leaderLine = createHelpLeaderLine(entry);
        if (leaderLine !== null) {
            lineLayer.appendChild(leaderLine);
        }
    });
    overlay.appendChild(lineLayer);
}

function createHelpLineLayer() {
    const lineLayer = document.createElementNS(SVG_NAMESPACE, "svg");
    lineLayer.setAttribute("class", "help-overlay-lines");
    lineLayer.appendChild(createHelpArrowheadDefinition());

    return lineLayer;
}

/* The arrowhead is sized in pixels on every render, so it keeps the same
   proportion to the labels at any window width */
function createHelpArrowheadDefinition() {
    const arrowLength = toPixels(HELP_ARROW_LENGTH_VW);
    const arrowWidth = toPixels(HELP_ARROW_WIDTH_VW);

    const arrowhead = document.createElementNS(SVG_NAMESPACE, "path");
    arrowhead.setAttribute("class", "help-overlay-arrowhead");
    arrowhead.setAttribute("d", "M 0 0 L " + arrowLength + " " + arrowWidth / 2 + " L 0 " + arrowWidth + " z");

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
    const leaderPoints = getHelpLeaderPoints(entry);

    // A lane that ends up level with its own control leaves no room for an arrow
    if (getPathLength(leaderPoints) < toPixels(HELP_ARROW_LENGTH_VW)) {
        return null;
    }

    const leaderLine = document.createElementNS(SVG_NAMESPACE, "polyline");
    leaderLine.setAttribute("class", "help-overlay-line");
    leaderLine.setAttribute("points", leaderPoints.map(point => point.x + "," + point.y).join(" "));
    leaderLine.setAttribute("marker-end", "url(#help-overlay-arrowhead)");

    return leaderLine;
}

/* A line always leaves its label in the middle of the edge facing the
   viewport. The control nearest the column is then reached by a single run
   straight into the middle of its near side. Every other control is reached
   by running along the lane to the centre of the control and turning once at
   a right angle into the middle of its top or bottom edge, which keeps the
   line off the controls standing beside it. Either way both segments lie
   along the screen axes */
function getHelpLeaderPoints(entry) {
    const label = getHelpLabelBounds(entry);
    const standoff = toPixels(HELP_ARROW_STANDOFF_VW);

    const runsRight = entry.bounds.left >= label.right;
    const laneY = label.top + (label.bottom - label.top) / 2;
    const startX = runsRight
        ? label.right + toPixels(HELP_LINE_GAP_VW)
        : label.left - toPixels(HELP_LINE_GAP_VW);

    // Crowding can push a label off its row, which costs it the straight run
    if (entry.connectsFromSide && isLevelWithControl(laneY, entry.bounds)) {
        return [
            {x: startX, y: laneY},
            {x: runsRight ? entry.bounds.left - standoff : entry.bounds.right + standoff, y: laneY}
        ];
    }

    const turnX = entry.bounds.left + entry.bounds.width / 2;
    const endY = entry.row.approachesFromBelow
        ? entry.bounds.bottom + standoff
        : entry.bounds.top - standoff;

    return withoutRepeatedPoints([
        {x: startX, y: laneY},
        {x: turnX, y: laneY},
        {x: turnX, y: endY}
    ]);
}

function isLevelWithControl(laneY, bounds) {
    return Math.abs(laneY - (bounds.top + bounds.height / 2)) < HELP_LEVEL_TOLERANCE_PX;
}

function withoutRepeatedPoints(points) {
    return points.filter(function (point, index) {
        return index === 0
            || Math.abs(point.x - points[index - 1].x) > 0.01
            || Math.abs(point.y - points[index - 1].y) > 0.01;
    });
}

function getPathLength(points) {
    let length = 0;

    for (let index = 1; index < points.length; index++) {
        length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    }

    return length;
}

function getHelpLabelBounds(entry) {
    return {
        left: entry.left,
        right: entry.left + entry.width,
        top: entry.top,
        bottom: entry.top + entry.height
    };
}

/* The whole layout follows the viewport-relative sizing of the panels, so all
   overlay measurements are expressed in viewport widths as well */
function toPixels(viewportWidths) {
    return window.innerWidth * viewportWidths / 100;
}

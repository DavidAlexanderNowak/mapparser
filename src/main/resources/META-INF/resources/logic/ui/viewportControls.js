import { revealTextBox, closeTextBox } from "./textboxControls.js";
import { updateAndGenerateMap } from "../map/mapService.js";
import { toggleHelpOverlay } from "../util/helpOverlay.js";
import { map } from "../map/mapHandler.js";
import { updateViewportStatus } from "../map/mapControls.js";
import { toReferenceZoom, getMinimumAllowedZoom, getMaximumAllowedZoom } from "../util/calculationUtil.js";

export let generateRequestInProgress = false;
export let townGranularity = 0;
export let seaLevelRelativeMode = false;
export let seaLevelAutoMode = false;

let processingIndicatorInterval;

const CLOSE_BUTTON_SELECTOR = "#viewport-button-close";
const INFO_BUTTON_SELECTOR = "#viewport-button-info";
const RESET_BUTTON_SELECTOR = "#viewport-button-reset";
const HELP_BUTTON_SELECTOR = "#viewport-button-help";

const ZOOM_IN_BUTTON_SELECTOR = "#viewport-button-zoomIn";
const ZOOM_OUT_BUTTON_SELECTOR = "#viewport-button-zoomOut";
const TRUE_BEARING_BUTTON_SELECTOR = "#viewport-button-trueBearing";

const SEA_LEVEL_MODE_BUTTON_SELECTOR = "#viewport-button-seaLevelMode";
const SEA_LEVEL_AUTO_BUTTON_SELECTOR = "#viewport-button-seaLevelAuto";
const TOWNS_TOGGLE_BUTTON_SELECTOR = "#viewport-button-toggleTowns";

const SEA_LEVEL_INPUT_SELECTOR = "#viewport-input-seaLevel";
const TOWNS_GRANULARITY_SELECTOR = "#viewport-town-granularity";

const GENERATE_BUTTON_SELECTOR = "#viewport-button-generate";

const ALL_TEXT_BOX_CONTAINERS_SELECTOR = ".component-text-box";


export function initializeViewportControls() {
    initializeHeaderButtons();
    initializeMapControlButtons();
    initializeConfigButtons();
    initializeGenerateButton();
}

function initializeHeaderButtons() {
    initializeCloseButton();
    initializeInfoButton();
    initializeResetButton();
    initializeHelpButton();
}

function initializeCloseButton() {
    $(CLOSE_BUTTON_SELECTOR).click(function () {
        window.close();
        window.history.back();
    });
}

function initializeInfoButton() {
    $(INFO_BUTTON_SELECTOR).click(function () {
        revealTextBox($(ALL_TEXT_BOX_CONTAINERS_SELECTOR));
    });
}

function initializeResetButton() {
    $(RESET_BUTTON_SELECTOR).click(function () {
        closeTextBox($(ALL_TEXT_BOX_CONTAINERS_SELECTOR).not(".is-pinned"));
    });
}

function initializeHelpButton() {
    $(HELP_BUTTON_SELECTOR).click(function () {
        toggleHelpOverlay();
    });
}

function initializeMapControlButtons() {
    $(ZOOM_IN_BUTTON_SELECTOR).click(function () {
        moveMapToZoom(getZoomInTarget());
    });
    $(ZOOM_OUT_BUTTON_SELECTOR).click(function () {
        moveMapToZoom(getZoomOutTarget());
    });
    $(TRUE_BEARING_BUTTON_SELECTOR).click(function () {
        map.easeTo({bearing: 0, duration: 1000, essential: true});
    });

}

function moveMapToZoom(zoom) {
    map.easeTo({zoom: zoom, duration: 200, essential: true});
}

function getZoomInTarget() {
    const currentZoom = map.getZoom();
    const minimumAllowedZoom = getMinimumAllowedZoom();
    return currentZoom < minimumAllowedZoom
        ? minimumAllowedZoom
        : currentZoom + 0.1;
}

function getZoomOutTarget() {
    const currentZoom = map.getZoom();
    const maximumAllowedZoom = getMaximumAllowedZoom();
    return currentZoom > maximumAllowedZoom
        ? maximumAllowedZoom
        : currentZoom - 0.1;
}

function initializeConfigButtons() {
    initializeSeaLevelModeButton();
    initializeSeaLevelAutoButton();
    initializeTownsToggleButton();
}

function initializeSeaLevelModeButton() {
    $(SEA_LEVEL_MODE_BUTTON_SELECTOR).click(function () {
        seaLevelRelativeMode = !seaLevelRelativeMode;
        updateSeaLevelModeButton();
    });
    updateSeaLevelModeButton();
}

function updateSeaLevelModeButton() {
    if (seaLevelRelativeMode) {
        $(SEA_LEVEL_MODE_BUTTON_SELECTOR).text("Relative");
        $(SEA_LEVEL_INPUT_SELECTOR).attr("title", "Enter percentile to be used as sea level for normalization");
        $(SEA_LEVEL_INPUT_SELECTOR).attr("placeholder", "Sea level (%)");
    } else {
        $(SEA_LEVEL_MODE_BUTTON_SELECTOR).text("Absolute");
        $(SEA_LEVEL_INPUT_SELECTOR).attr("title", "Enter sea level (m) for normalization");
        $(SEA_LEVEL_INPUT_SELECTOR).attr("placeholder", "Sea level (m)");
    }
}

function initializeSeaLevelAutoButton() {
    $(SEA_LEVEL_AUTO_BUTTON_SELECTOR).click(function () {
        seaLevelAutoMode = !seaLevelAutoMode;
        updateSeaLevelAutoButton();
    });
    updateSeaLevelAutoButton();
}

function updateSeaLevelAutoButton() {
    if (seaLevelAutoMode) {
        $(SEA_LEVEL_AUTO_BUTTON_SELECTOR).addClass("is-toggled");

        $(SEA_LEVEL_INPUT_SELECTOR).prop("disabled", true);
        $(SEA_LEVEL_INPUT_SELECTOR).addClass("is-disabled");
        $(SEA_LEVEL_MODE_BUTTON_SELECTOR).prop("disabled", true);
        $(SEA_LEVEL_MODE_BUTTON_SELECTOR).addClass("is-disabled");
    } else {
        $(SEA_LEVEL_AUTO_BUTTON_SELECTOR).removeClass("is-toggled");

        $(SEA_LEVEL_INPUT_SELECTOR).prop("disabled", false);
        $(SEA_LEVEL_INPUT_SELECTOR).removeClass("is-disabled");
        $(SEA_LEVEL_MODE_BUTTON_SELECTOR).prop("disabled", false);
        $(SEA_LEVEL_MODE_BUTTON_SELECTOR).removeClass("is-disabled");
    }
}

function initializeTownsToggleButton() {
    $(TOWNS_TOGGLE_BUTTON_SELECTOR).click(function () {
        townGranularity = findNextTownGranularity();
        updateTownsToggleButton();
    });
    updateTownsToggleButton();
}

export function updateTownsToggleButton() {
    const maximumAllowedGranularity = getMaximumAllowedTownGranularity();
    if (townGranularity > maximumAllowedGranularity) {
        townGranularity = maximumAllowedGranularity;
    }

    const forbiddenGranularities = getForbiddenTownGranularities();
    const currentDescription = getTownGranularityDescription(townGranularity);
    const forbiddenDescription = forbiddenGranularities.length === 0
        ? ""
        : ` (Current zoom forbids levels ${forbiddenGranularities.join(" and ")})`;

    $(TOWNS_GRANULARITY_SELECTOR)
        .text(townGranularity === 0 ? "x" : townGranularity)
        .toggleClass("element-town-granularity-disabled", townGranularity === 0);
    $(TOWNS_TOGGLE_BUTTON_SELECTOR).attr("title", currentDescription + forbiddenDescription);

    if (townGranularity === 0) {
        $(GENERATE_BUTTON_SELECTOR).attr("title", "Generate heightmap.png");
    } else {
        $(GENERATE_BUTTON_SELECTOR).attr("title", "Generate heightmap.png and towns.json");
    }
}

function findNextTownGranularity() {
    const maximumAllowedGranularity = getMaximumAllowedTownGranularity();
    let nextGranularity = townGranularity;

    do {
        nextGranularity = (nextGranularity + 1) % 4;
    } while (nextGranularity > maximumAllowedGranularity);

    return nextGranularity;
}

function getMaximumAllowedTownGranularity() {
    const zoom = toReferenceZoom(map.getZoom());
    if (zoom < 4) {
        return 1;
    }
    if (zoom < 7) {
        return 2;
    }
    return 3;
}

function getForbiddenTownGranularities() {
    const maximumAllowedGranularity = getMaximumAllowedTownGranularity();
    const forbiddenGranularities = [];

    for (let level = maximumAllowedGranularity + 1; level <= 3; level++) {
        forbiddenGranularities.push(level);
    }

    return forbiddenGranularities;
}

function getTownGranularityDescription(granularity) {
    const descriptions = [
        "Current: towns generation off",
        "Current: cities",
        "Current: cities and towns",
        "Current: cities, towns, villages and suburbs"
    ];

    return descriptions[granularity];
}

function initializeGenerateButton() {
    $(GENERATE_BUTTON_SELECTOR).click(function () {
        if (document.getElementById("viewport-button-generate").disabled) {
            return;
        }

        disableGenerateButton();
        updateAndGenerateMap();
    });

    updateViewportStatus();
}

function disableGenerateButton() {
    generateRequestInProgress = true;
    $(GENERATE_BUTTON_SELECTOR).prop("disabled", true);
    startProcessingIndicatorCycle();
}

export function enableGenerateButton() {
    generateRequestInProgress = false;
    $(GENERATE_BUTTON_SELECTOR).text("Generate map");
    stopProcessingIndicatorCycle();
    updateViewportStatus();
}

function startProcessingIndicatorCycle() {
    const states = ["Processing", "Processing\u00A0.", "Processing\u00A0.\u00A0.", "Processing\u00A0.\u00A0.\u00A0."];
    let i = 3;

    $(GENERATE_BUTTON_SELECTOR).text(states[i]);
    $(GENERATE_BUTTON_SELECTOR).addClass("element-processing-indicator");
    processingIndicatorInterval = setInterval(() => {
        i = (i + 1) % states.length;
        $(GENERATE_BUTTON_SELECTOR).text(states[i]);
    }, 500);
}

function stopProcessingIndicatorCycle() {
    clearInterval(processingIndicatorInterval);
    processingIndicatorInterval = null;
    $(GENERATE_BUTTON_SELECTOR).removeClass("element-processing-indicator");
}

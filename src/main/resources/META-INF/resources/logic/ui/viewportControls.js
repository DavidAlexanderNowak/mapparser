import {closeTextBoxLeft, closeTextBoxRight, displayTextBoxLeft, displayTextBoxRight} from "/logic/ui/textBox.js";
import {toggleHelpOverlay} from "/logic/util/helpOverlay.js";
import {updateAndGenerateMap} from "/logic/map/mapService.js";
import {toReferenceZoom} from "/logic/util/calculationUtil.js";

import {map} from "/logic/map/mapHandler.js";

import {
    SEA_LEVEL_MODE_BUTTON_ID,
    SEA_LEVEL_INPUT_ID,
    SEA_LEVEL_AUTO_BUTTON_ID,
    TOWNS_TOGGLE_BUTTON_ID,
    TOWNS_GRANULARITY_SPAN_ID,
    GENERATE_BUTTON_ID
} from "./viewport.js";
import {
    startProcessingIndicatorCycle,
    disableGenerateButton,
    disableSeaLevelInputFields,
    disableMapControls
} from "./viewportLogic.js";

export let seaLevelRelativeMode = false;
export let seaLevelAutoMode = false;

export let townGranularity = 0;

export function closePage() {
    window.close();
    window.history.back();
}

export function displayTextBoxes() {
    displayTextBoxLeft();
    displayTextBoxRight();
}

export function closeTextBoxes() {
    closeTextBoxLeft();
    closeTextBoxRight();
}

export function displayHelpOverlay() {
    toggleHelpOverlay();
}

export function toggleSeaLevelMode() {
    seaLevelRelativeMode = !seaLevelRelativeMode;
    updateSeaLevelModeButton();
}

export function updateSeaLevelModeButton() {
    if (seaLevelRelativeMode) {
        $("#" + SEA_LEVEL_MODE_BUTTON_ID).text("Relative");
        $("#" + SEA_LEVEL_INPUT_ID).attr("title", "Enter percentile to be used as sea level for normalization");
        $("#" + SEA_LEVEL_INPUT_ID).attr("placeholder", "Sea level (%)");
    } else {
        $("#" + SEA_LEVEL_MODE_BUTTON_ID).text("Absolute");
        $("#" + SEA_LEVEL_INPUT_ID).attr("title", "Enter sea level (m) for normalization");
        $("#" + SEA_LEVEL_INPUT_ID).attr("placeholder", "Sea level (m)");
    }
}

export function toggleSeaLevelAutoMode() {
    seaLevelAutoMode = !seaLevelAutoMode;
    _updateSeaLevelAutoButton();
}

function _updateSeaLevelAutoButton() {
    if (seaLevelAutoMode) {
        $("#" + SEA_LEVEL_AUTO_BUTTON_ID).addClass("is-toggled");

        $("#" + SEA_LEVEL_INPUT_ID).prop("disabled", true);
        $("#" + SEA_LEVEL_MODE_BUTTON_ID).prop("disabled", true);
    } else {
        $("#" + SEA_LEVEL_AUTO_BUTTON_ID).removeClass("is-toggled");

        $("#" + SEA_LEVEL_INPUT_ID).prop("disabled", false);
        $("#" + SEA_LEVEL_MODE_BUTTON_ID).prop("disabled", false);
    }
}

export function handleGenerateClick() {
    if (document.getElementById(GENERATE_BUTTON_ID).disabled) {
        return;
    }
    disableGenerateButton();
    disableSeaLevelInputFields();
    disableMapControls();
    startProcessingIndicatorCycle();
    updateAndGenerateMap(true);
}

export function handleDownloadClick() {
    if (document.getElementById(GENERATE_BUTTON_ID).disabled) {
        return;
    }
    disableGenerateButton();
    disableMapControls();
    startProcessingIndicatorCycle();
    updateAndGenerateMap(false);
}

export function toggleTownsGranularity() {
    townGranularity = _findNextTownGranularity();
    updateTownsToggleButton();
}

export function updateTownsToggleButton() {
    if(!map) {
        return;
    }
    const maximumAllowedGranularity = _getMaximumAllowedTownGranularity();
    if (townGranularity > maximumAllowedGranularity) {
        townGranularity = maximumAllowedGranularity;
    }

    const forbiddenGranularities = _getForbiddenTownGranularities();
    const currentDescription = _getTownGranularityDescription(townGranularity);
    const forbiddenDescription = forbiddenGranularities.length === 0
        ? ""
        : ` (Current zoom forbids levels ${forbiddenGranularities.join(" and ")})`;

    $("#" + TOWNS_GRANULARITY_SPAN_ID)
        .text(townGranularity === 0 ? "x" : townGranularity)
        .toggleClass("element-town-granularity-disabled", townGranularity === 0);
    $("#" + TOWNS_TOGGLE_BUTTON_ID).attr("title", currentDescription + forbiddenDescription);

    if (townGranularity === 0) {
        $("#" + GENERATE_BUTTON_ID).attr("title", "Generate heightmap.png");
    } else {
        $("#" + GENERATE_BUTTON_ID).attr("title", "Generate heightmap.png and towns.json");
    }
}

function _findNextTownGranularity() {
    const maximumAllowedGranularity = _getMaximumAllowedTownGranularity();
    let nextGranularity = townGranularity;

    do {
        nextGranularity = (nextGranularity + 1) % 4;
    } while (nextGranularity > maximumAllowedGranularity);

    return nextGranularity;
}

function _getMaximumAllowedTownGranularity() {
    const zoom = toReferenceZoom(map.getZoom());
    if (zoom < 4) {
        return 1;
    }
    if (zoom < 7) {
        return 2;
    }
    return 3;
}

function _getForbiddenTownGranularities() {
    const maximumAllowedGranularity = _getMaximumAllowedTownGranularity();
    const forbiddenGranularities = [];

    for (let level = maximumAllowedGranularity + 1; level <= 3; level++) {
        forbiddenGranularities.push(level);
    }

    return forbiddenGranularities;
}

function _getTownGranularityDescription(granularity) {
    const descriptions = [
        "Current: towns generation off",
        "Current: cities",
        "Current: cities and towns",
        "Current: cities, towns, villages and suburbs"
    ];

    return descriptions[granularity];
}

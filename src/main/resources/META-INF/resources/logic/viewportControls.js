var processingIndicatorInterval;
var generateRequestInProgress = false;

const ALL_TEXT_BOX_CONTAINERS_SELECTOR = "#text-box-left-container, #text-box-right-container";

function initializeViewportControls() {
    initializeHeaderButtons();
    initializeMapControlButtons();
    initializeConfigButtons();
    initializeGenerateButton();
}

function initializeHeaderButtons() {
    $("#viewport-button-close").click(function () {
        window.close();
        window.history.back();
    });

    initializeInfoButton();
    initializeResetButton();
    initializeHelpButton();
}

function initializeInfoButton() {
    $("#viewport-button-info").click(function () {
        revealTextBox($(ALL_TEXT_BOX_CONTAINERS_SELECTOR));
    });
}

function initializeResetButton() {
    $("#viewport-button-reset").click(function () {
        closeTextBox($(ALL_TEXT_BOX_CONTAINERS_SELECTOR).not(".is-pinned"));
    });
}

function initializeHelpButton() {
    $("#viewport-button-help").click(function () {
        toggleHelpOverlay();
    });
}

function initializeMapControlButtons() {

    $("#viewport-button-zoomIn").click(function () {
        moveMapToZoom(getZoomInTarget());
    });
    $("#viewport-button-zoomOut").click(function () {
        moveMapToZoom(getZoomOutTarget());
    });
    $("#viewport-button-trueBearing").click(function () {
        map.easeTo({bearing: 0, duration: 1000, essential: true});
    });

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

function moveMapToZoom(zoom) {
    map.easeTo({zoom: zoom, duration: 200, essential: true});
}

function initializeConfigButtons() {
    initializeSeaLevelModeButton();
    initializeSeaLevelAutoButton();
    initializeTownsToggleButton();
}

function initializeSeaLevelModeButton() {
    $("#viewport-button-seaLevelMode").click(function () {
        seaLevelPercentileMode = !seaLevelPercentileMode;
        updateSeaLevelModeButton();
    });
    updateSeaLevelModeButton();
}

function updateSeaLevelModeButton() {
    if (seaLevelPercentileMode) {
        $("#viewport-button-seaLevelMode").text("Relative");
        $("#viewport-input-seaLevel").attr("title", "Enter percentile to be used as sea level for normalization");
        $("#viewport-input-seaLevel").attr("placeholder", "Sea level (%)");
    } else {
        $("#viewport-button-seaLevelMode").text("Absolute");
        $("#viewport-input-seaLevel").attr("title", "Enter sea level (m) for normalization");
        $("#viewport-input-seaLevel").attr("placeholder", "Sea level (m)");
    }
}

function initializeSeaLevelAutoButton() {
    $("#viewport-button-seaLevelAuto").click(function () {
        seaLevelAutoMode = !seaLevelAutoMode;
        updateSeaLevelAutoButton();
    });
    updateSeaLevelAutoButton();
}

function updateSeaLevelAutoButton() {
    if (seaLevelAutoMode) {
        $("#viewport-button-seaLevelAuto").addClass("is-toggled");

        $("#viewport-input-seaLevel").prop("disabled", true);
        $("#viewport-input-seaLevel").addClass("is-disabled");
        $("#viewport-button-seaLevelMode").prop("disabled", true);
        $("#viewport-button-seaLevelMode").addClass("is-disabled");
    } else {
        $("#viewport-button-seaLevelAuto").removeClass("is-toggled");

        $("#viewport-input-seaLevel").prop("disabled", false);
        $("#viewport-input-seaLevel").removeClass("is-disabled");
        $("#viewport-button-seaLevelMode").prop("disabled", false);
        $("#viewport-button-seaLevelMode").removeClass("is-disabled");
    }
}

function initializeTownsToggleButton() {
    $("#viewport-button-toggleTowns").click(function () {
        townGranularity = findNextTownGranularity();
        updateTownsToggleButton();
    });
    updateTownsToggleButton();
}

function updateTownsToggleButton() {
    const maximumAllowedGranularity = getMaximumAllowedTownGranularity();
    if (townGranularity > maximumAllowedGranularity) {
        townGranularity = maximumAllowedGranularity;
    }

    const forbiddenGranularities = getForbiddenTownGranularities();
    const currentDescription = getTownGranularityDescription(townGranularity);
    const forbiddenDescription = forbiddenGranularities.length === 0
        ? ""
        : ` (Current zoom forbids levels ${forbiddenGranularities.join(" and ")})`;

    $("#viewport-town-granularity")
        .text(townGranularity === 0 ? "x" : townGranularity)
        .toggleClass("element-town-granularity-disabled", townGranularity === 0);
    $("#viewport-button-toggleTowns").attr("title", currentDescription + forbiddenDescription);

    if (townGranularity === 0) {
        $("#viewport-button-generate").attr("title", "Generate heightmap.png");
    } else {
        $("#viewport-button-generate").attr("title", "Generate heightmap.png and towns.json");
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
    $("#viewport-button-generate").click(function () {
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
    $("#viewport-button-generate").prop("disabled", true);
    startProcessingIndicatorCycle();
}

function enableGenerateButton() {
    generateRequestInProgress = false;
    $("#viewport-button-generate").text("Generate map");
    stopProcessingIndicatorCycle();
    updateViewportStatus();
}

function startProcessingIndicatorCycle() {
    const states = ["Processing", "Processing\u00A0.", "Processing\u00A0.\u00A0.", "Processing\u00A0.\u00A0.\u00A0."];
    let i = 3;

    $("#viewport-button-generate").text(states[i]);
    $("#viewport-button-generate").addClass("element-processing-indicator");
    processingIndicatorInterval = setInterval(() => {
        i = (i + 1) % states.length;
        $("#viewport-button-generate").text(states[i]);
    }, 500);
}

function stopProcessingIndicatorCycle() {
    clearInterval(processingIndicatorInterval);
    processingIndicatorInterval = null;
    $("#viewport-button-generate").removeClass("element-processing-indicator");
}

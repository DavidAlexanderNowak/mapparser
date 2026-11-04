import {addOnClickListenerToButton, removeOnClickListenerToButton} from "/logic/util/htmlElementsUtil.js";
import {
    disableMapInteractions,
    enableMapInteractions,
    updateViewportStatus
} from "/logic/map/mapControls.js";

import {handleGenerateClick, handleDownloadClick} from "/logic/ui/viewportControls.js";
import {
    VIEWPORT_ID,
    GENERATE_BUTTON_ID,
    PROCESSING_DOTS_ID,
    PROCESSING_LABEL_ID,
    CLEAR_PREVIEW_BUTTON_ID,
    SEA_LEVEL_INPUT_ID,
    SEA_LEVEL_MODE_BUTTON_ID,
    SEA_LEVEL_AUTO_BUTTON_ID
} from "./viewport.js";

export let generateRequestInProgress = false;

let _processingIndicatorInterval;

const GENERATE_PREVIEW_TITLE = "Generate preview";
const GENERATE_PREVIEW_HELP_TEXT =
    "Generate the heightmap allowing a download afterwards";
const DOWNLOAD_MAP_TITLE = "Download map data";
const DOWNLOAD_MAP_HELP_TEXT =
    "Download map data (heightmap.png and towns.json)";

export function updateTitle(title, warning) {
    const label = document.getElementById(VIEWPORT_ID).querySelector(".component-dialogue-header-centre > label");
    label.textContent = title;
    if (warning) {
        label.classList.add("warning");
    } else {
        label.classList.remove("warning");
    }
}

export function disableGenerateButton() {
    generateRequestInProgress = true;
    $("#" + GENERATE_BUTTON_ID).prop("disabled", true);
    $("#" + CLEAR_PREVIEW_BUTTON_ID).prop("disabled", true);
}

export function disableSeaLevelInputFields() {
    $("#" + SEA_LEVEL_INPUT_ID).prop("disabled", true);
    $("#" + SEA_LEVEL_MODE_BUTTON_ID).prop("disabled", true);
    $("#" + SEA_LEVEL_AUTO_BUTTON_ID).prop("disabled", true);
}

function _enableSeaLevelInputFields() {
    $("#" + SEA_LEVEL_INPUT_ID).prop("disabled", false);
    $("#" + SEA_LEVEL_MODE_BUTTON_ID).prop("disabled", false);
    $("#" + SEA_LEVEL_AUTO_BUTTON_ID).prop("disabled", false);
}

export function disableMapControls() {
    disableMapInteractions();
}

export function enableGenerateButton() {
    generateRequestInProgress = false;
    $("#" + GENERATE_BUTTON_ID).text("Generate map");
    $("#" + CLEAR_PREVIEW_BUTTON_ID).prop("disabled", true);
    _setGenerateButtonDescription(GENERATE_PREVIEW_TITLE, GENERATE_PREVIEW_HELP_TEXT);
    _stopProcessingIndicatorCycle();
    _enableSeaLevelInputFields();
    enableMapInteractions();
    updateViewportStatus();
    removeOnClickListenerToButton(VIEWPORT_ID, GENERATE_BUTTON_ID, handleDownloadClick);
    addOnClickListenerToButton(VIEWPORT_ID, GENERATE_BUTTON_ID, handleGenerateClick);
}

export function enableDownloadButton() {
    generateRequestInProgress = false;
    $("#" + GENERATE_BUTTON_ID).text("Download");
    $("#" + GENERATE_BUTTON_ID).prop("disabled", false);
    $("#" + CLEAR_PREVIEW_BUTTON_ID).prop("disabled", false);
    _setGenerateButtonDescription(DOWNLOAD_MAP_TITLE, DOWNLOAD_MAP_HELP_TEXT);
    _stopProcessingIndicatorCycle();
    updateViewportStatus();
    removeOnClickListenerToButton(VIEWPORT_ID, GENERATE_BUTTON_ID, handleGenerateClick);
    addOnClickListenerToButton(VIEWPORT_ID, GENERATE_BUTTON_ID, handleDownloadClick);
}

function _setGenerateButtonDescription(title, helpText) {
    const generateButton = document.getElementById(GENERATE_BUTTON_ID);
    generateButton.title = title;
    if(helpText) {
        generateButton.dataset.helpText = helpText;
    }
}

export function clearPreview() {
    const preview = document.getElementById(VIEWPORT_ID)
        .querySelector(".component-viewport-content-selector > div > img");
    if (preview) {
        preview.remove();
    }

    enableGenerateButton();
}

export function startProcessingIndicatorCycle() {
    $("#" + GENERATE_BUTTON_ID).text("");

    const processingLabel = $("<label>", { id: PROCESSING_LABEL_ID, class: "element-processing-label", text: "Processing"});
    const dots = $("<label>", { id: PROCESSING_DOTS_ID, class: "element-processing-label" });
    $("#" + GENERATE_BUTTON_ID).append(processingLabel);
    $("#" + GENERATE_BUTTON_ID).append(dots);

    const states = ["", "\u00A0.", "\u00A0.\u00A0.", "\u00A0.\u00A0.\u00A0."];
    let i = 3;

    $("#" + PROCESSING_DOTS_ID).text(states[i]);
    _processingIndicatorInterval = setInterval(() => {
        i = (i + 1) % states.length;
        $("#" + PROCESSING_DOTS_ID).text(states[i]);
    }, 500);
}

function _stopProcessingIndicatorCycle() {
    clearInterval(_processingIndicatorInterval);
    _processingIndicatorInterval = null;
    $("#" + PROCESSING_DOTS_ID).remove();
    $("#" + PROCESSING_LABEL_ID).remove();
}

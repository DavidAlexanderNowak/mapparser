import {fetchFragment} from "/logic/util/componentLoader.js";
import {
    buildFooter,
    buildHeader,
    buildIconButton,
    buildLabelButton,
    displayDialogue
} from "/logic/fragments/dialogue/factory.js";
import {updateViewportStatus, zoomIn, zoomOut, trueBearing} from "/logic/map/mapControls.js";
import {updateAndGenerateMap} from "/logic/map/mapService.js";
import {addOnClickListenerToButton, addTooltipToButton} from "/logic/util/htmlElementsUtil.js";

import {map} from "/logic/map/mapHandler.js";

import {
    closePage,
    displayTextBoxes,
    closeTextBoxes,
    displayHelpOverlay,
    toggleSeaLevelMode,
    toggleSeaLevelAutoMode,
    handleGenerateClick,
    handleDownloadClick,
    toggleTownsGranularity,
    updateTownsToggleButton,
    updateSeaLevelModeButton
} from "./viewportControls.js";
import {clearPreview} from "./viewportLogic.js";

const CLOSE_BUTTON_ID = "viewport-button-close";
const INFO_BUTTON_ID = "viewport-button-info";
const RESET_BUTTON_ID = "viewport-button-reset";
const HELP_BUTTON_ID = "viewport-button-help";

export const SEA_LEVEL_MODE_BUTTON_ID = "viewport-button-seaLevelMode";
export const SEA_LEVEL_INPUT_ID = "viewport-input-seaLevel";
export const SEA_LEVEL_AUTO_BUTTON_ID = "viewport-button-seaLevelAuto";

const ZOOM_IN_BUTTON_ID = "viewport-button-zoomIn";
const ZOOM_OUT_BUTTON_ID = "viewport-button-zoomOut";
const TRUE_BEARING_BUTTON_ID = "viewport-button-trueBearing";

export const GENERATE_BUTTON_ID = "viewport-button-generate";
export const CLEAR_PREVIEW_BUTTON_ID = "viewport-button-clearPreview";
export const PROCESSING_LABEL_ID = "processing-label";
export const PROCESSING_DOTS_ID = "processing-dots";
export const TOWNS_TOGGLE_BUTTON_ID = "viewport-button-toggleTowns";
export const TOWNS_GRANULARITY_SPAN_ID = "viewport-town-granularity";

export const VIEWPORT_ID = "viewport-dialogue";
const VIEWPORT_CONTENT_FRAGMENT_URL = "/fragments/content/viewport.html";


export async function displayViewport() {
    await _initDialogue();
    initializeViewport();
}

export function initializeViewport() {
    updateViewportStatus();
    updateTownsToggleButton();
}

async function _initDialogue() {
    const header = await _buildHeader();
    const content = await fetchFragment(VIEWPORT_CONTENT_FRAGMENT_URL);
    const clearPreviewButton = buildLabelButton(null, "Clear preview", CLEAR_PREVIEW_BUTTON_ID);
    const footer = await buildFooter(null, clearPreviewButton);
    const clearPreviewElement = footer.querySelector("#" + CLEAR_PREVIEW_BUTTON_ID);
    clearPreviewElement.disabled = true;
    clearPreviewElement.title = "Clear preview";

    await displayDialogue(header, content, footer, "layout-viewport", VIEWPORT_ID);

    _initializeHeaderButtonTooltips();
    _initializeViewportControls();
}

async function _buildHeader() {
    const closeButton = buildIconButton("/images/close-button.svg", null, CLOSE_BUTTON_ID);
    const infoButton = buildIconButton("/images/info-button.svg", null, INFO_BUTTON_ID);
    const resetButton = buildIconButton("/images/reset-button.svg", null, RESET_BUTTON_ID);
    const helpButton = buildLabelButton("?", null, HELP_BUTTON_ID);

    const header = await buildHeader(closeButton, "", [infoButton, resetButton, helpButton]);
    header.querySelector("#" + CLOSE_BUTTON_ID).addEventListener("click", closePage);
    header.querySelector("#" + INFO_BUTTON_ID).addEventListener("click", displayTextBoxes);
    header.querySelector("#" + RESET_BUTTON_ID).addEventListener("click", closeTextBoxes);
    header.querySelector("#" + HELP_BUTTON_ID).addEventListener("click", displayHelpOverlay);

    return header;
}

function _initializeHeaderButtonTooltips() {
    addTooltipToButton(CLOSE_BUTTON_ID, "Close the page");
    addTooltipToButton(INFO_BUTTON_ID, "Show additional information");
    addTooltipToButton(RESET_BUTTON_ID, "Reset UI to default state");
    addTooltipToButton(HELP_BUTTON_ID, "Show help for the viewport controls");
}

function _initializeViewportControls() {
    updateSeaLevelModeButton();
    addOnClickListenerToButton(VIEWPORT_ID, SEA_LEVEL_MODE_BUTTON_ID, toggleSeaLevelMode);
    addOnClickListenerToButton(VIEWPORT_ID, SEA_LEVEL_AUTO_BUTTON_ID, toggleSeaLevelAutoMode);
    addOnClickListenerToButton(VIEWPORT_ID, ZOOM_IN_BUTTON_ID, zoomIn);
    addOnClickListenerToButton(VIEWPORT_ID, ZOOM_OUT_BUTTON_ID, zoomOut);
    addOnClickListenerToButton(VIEWPORT_ID, TRUE_BEARING_BUTTON_ID, trueBearing);
    addOnClickListenerToButton(VIEWPORT_ID, GENERATE_BUTTON_ID, handleGenerateClick);
    addOnClickListenerToButton(VIEWPORT_ID, CLEAR_PREVIEW_BUTTON_ID, clearPreview);
    addOnClickListenerToButton(VIEWPORT_ID, TOWNS_TOGGLE_BUTTON_ID, toggleTownsGranularity);
}

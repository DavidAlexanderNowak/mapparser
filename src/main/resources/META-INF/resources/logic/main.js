import { isMobileBrowser, showMobileBrowserMessage } from "./util/mobileHandler.js";
import { initializeMap, applyMapHash } from "./map/mapHandler.js";
import { initializeViewportControls } from "./ui/viewportControls.js";
import { initializeTextBoxControls } from "./ui/textboxControls.js";
import { initializeHelpOverlay } from "./util/helpOverlay.js";

$(document).ready(function () {
    initialize();
});

function initialize() {
    if (isMobileBrowser()) {
        showMobileBrowserMessage();
        return;
    }

    initializeMap();
    window.addEventListener("hashchange", applyMapHash);

    initializeControls();
    initializeHelpOverlay();
}

function initializeControls() {
    initializeViewportControls();
    document.querySelectorAll(".component-text-box").forEach(initializeTextBoxControls);
}

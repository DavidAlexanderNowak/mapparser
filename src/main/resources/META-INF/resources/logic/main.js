import { isMobileBrowser, showMobileBrowserMessage } from "/logic/util/mobileHandler.js";
import { initializeMap, applyMapHash } from "/logic/map/mapHandler.js";
import { displayViewport, initializeViewport } from "/logic/ui/viewport.js";
import { initializeHelpOverlay } from "/logic/util/helpOverlay.js";

$(document).ready(function () {
    _initialize();
});

async function _initialize() {
    if (isMobileBrowser()) {
        showMobileBrowserMessage();
        return;
    }

    window.addEventListener("hashchange", applyMapHash);

    await displayViewport();

    initializeMap();
    initializeViewport();
    initializeHelpOverlay();

    _initializeDragPrevention();
}

function _initializeDragPrevention() {
    document.addEventListener("dragstart", (event) => {
        if (event.target instanceof HTMLImageElement || event.target instanceof HTMLAnchorElement) {
            event.preventDefault();
        }
    });
}

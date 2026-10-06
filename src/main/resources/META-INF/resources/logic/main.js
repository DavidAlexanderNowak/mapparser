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
    initializeTextBoxControls();
}
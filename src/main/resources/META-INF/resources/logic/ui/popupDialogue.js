import {
    buildFooter,
    buildHeader,
    buildIconButton,
    buildIconLink,
    buildLabelButton,
    buildTextBlock,
    displayDialogue
} from "/logic/fragments/dialogue/factory.js";

const CLOSE_BUTTON_ID = "popup-dialogue-close-button";
const OK_BUTTON_ID = "popup-dialogue-ok-button";

export async function displaySimpleDialogue(title, message) {
    _displayDimmerOverlay();

    const closeButton = buildIconButton("/images/close-button.svg", null, CLOSE_BUTTON_ID);
    const header = await buildHeader(closeButton, title, null);
    header.querySelector("#" + CLOSE_BUTTON_ID).addEventListener("click", _closeDialogue);

    const contentHtml = buildTextBlock(message);
    const content = document.createRange().createContextualFragment(contentHtml)

    const okButton = buildLabelButton(null, "OK", OK_BUTTON_ID);
    const footer = await buildFooter(null, okButton);
    footer.querySelector("#" + OK_BUTTON_ID).addEventListener("click", _closeDialogue);

    await displayDialogue(header, content, footer, "layout-popup-dialogue-centred");
}

function _displayDimmerOverlay() {
    const dimmerOverlay = document.createElement("div");
    dimmerOverlay.classList.add("component-overlay-dimmer");
    document.body.appendChild(dimmerOverlay);
}

function _closeDialogue(event) {
    event.target.closest(".component-dialogue").remove();
    document.querySelector(".component-overlay-dimmer").remove();
}

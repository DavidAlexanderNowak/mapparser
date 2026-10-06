function initializeTextBoxControls() {
    initializeTextBoxButtons({
        container: "#text-box-left-container",
        foldButton: "#text-box-left-fold-button",
        closeButton: "#text-box-left-close-button",
        resetButton: "#text-box-left-reset-button",
        pinButton: "#text-box-left-pin-button"
    });
    initializeTextBoxButtons({
        container: "#text-box-right-container",
        foldButton: "#text-box-right-fold-button",
        closeButton: "#text-box-right-close-button",
        resetButton: "#text-box-right-reset-button",
        pinButton: "#text-box-right-pin-button"
    });
}

function initializeTextBoxButtons(selectors) {
    const textBox = $(selectors.container);
    const pinButton = $(selectors.pinButton);

    $(selectors.foldButton).click(function () {
        textBox.toggleClass("is-folded");
    });

    $(selectors.closeButton).click(function () {
        closeTextBox(textBox);
    });

    $(selectors.resetButton).click(function () {
        revealTextBox(textBox);
    });

    pinButton.click(function () {
        setTextBoxPinned(textBox, !textBox.hasClass("is-pinned"));
    });
}

function setTextBoxPinned(textBox, pinned) {
    textBox.toggleClass("is-pinned", pinned);
    textBox.find(".element-pin-button").toggleClass("is-toggled", pinned);
}

function closeTextBox(textBox) {
    setTextBoxPinned(textBox, false);
    textBox.addClass("is-closed").removeClass("is-folded");
}

function revealTextBox(textBox) {
    textBox.removeClass("is-closed is-folded");
}

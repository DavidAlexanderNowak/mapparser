export function initializeTextBoxControls(root) {
    const textBox = $(root);
    const pinButton = $(root).find(".element-pin-button");
    initializeDonateDropdown(root);

    textBox.find(".element-fold-button").click(function () {
        textBox.toggleClass("is-folded");
    });

    $(root).find(".element-close-button").click(function () {
        closeTextBox(textBox);
    });

    $(root).find(".element-reset-button").click(function () {
        revealTextBox(textBox);
    });

    $(root).find(".element-pin-button").click(function () {
        setTextBoxPinned(textBox, !textBox.hasClass("is-pinned"));
    });
}

function initializeDonateDropdown(root) {
    const donateButton = root.querySelector(".element-donate-button");
    const donateDropdown = root.querySelector(".component-donate-dropdown");

    if (!donateButton || !donateDropdown) {
        return;
    }

    donateButton.addEventListener("click", function () {
        const isOpen = donateDropdown.classList.toggle("is-open");
        donateButton.classList.toggle("is-toggled", isOpen);
    });

    document.addEventListener("click", function (event) {
        if (!donateDropdown.contains(event.target) && event.target !== donateButton) {
            closeDonateDropdown(donateButton, donateDropdown);
        }
    });
}

function closeDonateDropdown(donateButton, donateDropdown) {
    donateDropdown.classList.remove("is-open");
    donateButton.classList.remove("is-toggled");
}

export function closeTextBox(textBox) {
    setTextBoxPinned(textBox, false);
    textBox.addClass("is-closed").removeClass("is-folded");
}

export function revealTextBox(textBox) {
    textBox.removeClass("is-closed is-folded");
}

function setTextBoxPinned(textBox, pinned) {
    textBox.toggleClass("is-pinned", pinned);
    textBox.find(".element-pin-button").toggleClass("is-toggled", pinned);
}

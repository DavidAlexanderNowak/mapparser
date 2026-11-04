import { fetchFragment } from "/logic/util/componentLoader.js";
import { VERSION } from "/logic/util/version.js";
import {
    buildFooter,
    buildHeader,
    buildIconButton,
    buildLabelButton,
    buildIconLink,
    buildSpanTextBlock,
    displayDialogue
} from "/logic/fragments/dialogue/factory.js";


const CLOSE_BUTTON_ID = "close-button";
const FOLD_BUTTON_ID = "fold-button";
const RESET_BUTTON_ID = "reset-button";
const PIN_BUTTON_ID = "pin-button";

const DIALOGUE_LEFT_ID = "text-box-left-dialogue";
const DIALOGUE_RIGHT_ID = "text-box-right-dialogue";
const CONTENT_LEFT_FRAGMENT_URL = "/fragments/content/text-box-left.html";
const CONTENT_RIGHT_FRAGMENT_URL = "/fragments/content/text-box-right.html";
const TITLE_LEFT = "User manual";
const TITLE_RIGHT = "Project information";

const DONATE_BUTTON_ID = "donate-button";
const DONATE_DROPDOWN_FRAGMENT_URL = "/fragments/content/donate-dropdown.html";
const DONATE_DROPDOWN_ID = "donate-dropdown";

export async function displayTextBoxLeft() {
    if(document.getElementById(DIALOGUE_LEFT_ID)) {
        _unfoldById(DIALOGUE_LEFT_ID);
        return;
    }

    const header = await _buildHeader(TITLE_LEFT);

    const content = await fetchFragment(CONTENT_LEFT_FRAGMENT_URL);

    const openttdLink = buildIconLink("https://openttd.org", "/images/link-icon.svg", "OpenTTD.org");
    const footer = await buildFooter(openttdLink, null);

    await displayDialogue(header, content, footer, "layout-text-box-left", DIALOGUE_LEFT_ID);
}

export function closeTextBoxLeft() {
    _closeDialogueById(DIALOGUE_LEFT_ID);
}

export async function displayTextBoxRight() {
    if(document.getElementById(DIALOGUE_RIGHT_ID)) {
        _unfoldById(DIALOGUE_RIGHT_ID);
        return;
    }

    const header = await _buildHeader(TITLE_RIGHT);

    const content = await fetchFragment(CONTENT_RIGHT_FRAGMENT_URL);

    const versionLabel = buildSpanTextBlock(`v${VERSION}`);
    const githubLink = buildIconLink("https://github.com/DavidAlexanderNowak/mapparser", "/images/link-icon.svg", "GitHub");
    const donateButton = buildLabelButton("$", "Donate", DONATE_BUTTON_ID);
    const footer = await buildFooter(versionLabel, [githubLink, donateButton]);

    await displayDialogue(header, content, footer, "layout-text-box-right", DIALOGUE_RIGHT_ID);
    await _initializeDonateDropdown();
}

export function closeTextBoxRight() {
    _closeDialogueById(DIALOGUE_RIGHT_ID);
}

function _unfoldById(dialogueId) {
    document.getElementById(dialogueId).classList.remove("is-folded");
    document.getElementById(dialogueId).querySelector("#" + FOLD_BUTTON_ID).querySelector("img").src = "/images/fold-up-button.svg";
}

async function _buildHeader(title) {
    const closeButton = buildIconButton("/images/close-button.svg", null, CLOSE_BUTTON_ID);
    const foldButton = buildIconButton("/images/fold-up-button.svg", null, FOLD_BUTTON_ID);
    const resetButton = buildIconButton("/images/reset-button.svg", null, RESET_BUTTON_ID);
    const pinButton = buildIconButton("/images/pin-button.svg", null, PIN_BUTTON_ID);

    const header = await buildHeader(closeButton, title, [foldButton, resetButton, pinButton]);
    header.querySelector("#" + CLOSE_BUTTON_ID).addEventListener("click", _closeDialogue);
    header.querySelector("#" + FOLD_BUTTON_ID).addEventListener("click", _toggleFold);
    header.querySelector("#" + RESET_BUTTON_ID).addEventListener("click", _reset);
    header.querySelector("#" + PIN_BUTTON_ID).addEventListener("click", _togglePin);

    return header;
}

function _closeDialogueById(dialogueId) {
    if(!document.getElementById(dialogueId)) {
        return;
    }
    if(!document.getElementById(dialogueId).classList.contains("is-pinned")) {
        document.getElementById(dialogueId).remove();
    }
}

function _closeDialogue(event) {
    event.target.closest(".component-dialogue").remove();
}

function _toggleFold(event) {
    const isFolded = event.target.closest(".component-dialogue").classList.toggle("is-folded");
    event.target.closest("button").querySelector("img").src = isFolded ? "/images/fold-out-button.svg" : "/images/fold-up-button.svg";
}

function _reset(event) {
    event.target.closest(".component-dialogue").classList.remove("is-folded");
    const foldButton = event.target.closest(".component-dialogue-header").querySelector("#" + FOLD_BUTTON_ID);;
    foldButton.querySelector("img").src = "/images/fold-up-button.svg";
}

function _togglePin(event) {
    const isPinned = event.target.closest(".component-dialogue").classList.toggle("is-pinned");
    event.target.closest("button").querySelector("img").src = isPinned ? "/images/pinned-button.svg" : "/images/pin-button.svg";
}

async function _initializeDonateDropdown() {
    const donateButton = document.getElementById(DIALOGUE_RIGHT_ID).querySelector("#" + DONATE_BUTTON_ID);

    function _closeDonateDropdown() {
        document.removeEventListener("click", _closeDonateDropdown);
        document.getElementById(DONATE_DROPDOWN_ID)?.remove();
    }

    donateButton.addEventListener("click", async function () {
        if(document.getElementById(DONATE_DROPDOWN_ID)) {
            _closeDonateDropdown();
        } else {
            const donateDropdown = await fetchFragment(DONATE_DROPDOWN_FRAGMENT_URL);
            document.getElementById(DIALOGUE_RIGHT_ID).querySelector(".component-dialogue-footer").append(donateDropdown.cloneNode(true));
            document.addEventListener("click", _closeDonateDropdown);
        }
    });

}

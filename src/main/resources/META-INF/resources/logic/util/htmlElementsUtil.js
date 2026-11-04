export function appendAllElements(rootElement, elements) {
    if (elements === null || elements === undefined) {
        return;
    }

    const elementsArray = Array.isArray(elements) ? elements : [elements];
    for (const element of elementsArray) {
        rootElement.insertAdjacentHTML("beforeend", element);
    }
}

export function addOnClickListenerToButton(parentId, buttonId, callback) {
    document.getElementById(parentId).querySelector("#" + buttonId).addEventListener("click", callback);
}

export function removeOnClickListenerToButton(parentId, buttonId, callback) {
    document.getElementById(parentId).querySelector("#" + buttonId).removeEventListener("click", callback);
}

export function addTooltipToButton(buttonId, tooltipText) {
    $("#" + buttonId).attr("title", tooltipText);
}

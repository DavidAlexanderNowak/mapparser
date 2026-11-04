import {enableDownloadButton, enableGenerateButton} from "/logic/ui/viewportLogic.js";
import {displaySimpleDialogue} from "/logic/ui/popupDialogue.js";
import {showMapControlsDimmer} from "/logic/map/mapControls.js";

export function sendGenerateRequest(requestData) {
    fetch("/download", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
    }).then(response => {
        if (!response.ok) {
            displaySimpleDialogue("Request Error", "The map generation request for preview failed. Please try again.");
            enableGenerateButton();
            return;
        }

        return response.blob().then(blob => {
            const url = window.URL.createObjectURL(blob);
            const preview = document.createElement("img");
            preview.src = url;
            document.getElementById("viewport-dialogue").querySelector(".component-viewport-content-selector > div").appendChild(preview);

            showMapControlsDimmer();
            enableDownloadButton();
        });
    }).catch(error => {
        console.error('Error:', error);
        alert('Request failed: ' + error.message);

        enableGenerateButton();
    });
}

export function sendDownloadRequest(requestData) {
    fetch("/download", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
    }).then(response => {
        if (!response.ok) {
            displaySimpleDialogue("Request Error", "The map generation request failed. Please try again.");
            document.getElementById("viewport-dialogue").querySelector(".component-viewport-content-selector > div > img").remove();
            enableGenerateButton();
            return;
        }

        const contentDisposition = response.headers.get("Content-Disposition");
        const fileNameMatch = contentDisposition && contentDisposition.match(/filename="([^"]+)"/);
        const fileName = fileNameMatch ? fileNameMatch[1] : "mapdata";

        document.getElementById("viewport-dialogue").querySelector(".component-viewport-content-selector > div > img").remove();

        return response.blob().then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            enableGenerateButton();
        });
    }).catch(error => {
        console.error("Error:", error);
        alert("Request failed: " + error.message);

        enableGenerateButton();
    });
}

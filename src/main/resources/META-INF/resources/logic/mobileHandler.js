function isMobileBrowser() {
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i;
    const isTouchscreenIPad = navigator.maxTouchPoints > 1
        && navigator.platform === "MacIntel";

    return mobileUserAgent.test(navigator.userAgent) || isTouchscreenIPad;
}

function showMobileBrowserMessage() {
    document.body.classList.add("mobile-browser");
}

export async function fetchFragment(fragmentUrl) {
    const response = await fetch(fragmentUrl);
    if (!response.ok) {
        throw new Error(`Failed to load fragment from ${fragmentUrl}: ${response.statusText}`);
    }

    const fragmentHtml = await response.text();
    return document.createRange().createContextualFragment(fragmentHtml);
}

export async function fetchFragmentHtml(fragmentUrl) {
    const response = await fetch(fragmentUrl);
    if (!response.ok) {
        throw new Error(`Failed to load fragment from ${fragmentUrl}: ${response.statusText}`);
    }

    return await response.text();
}
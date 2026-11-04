import {fetchFragment} from "/logic/util/componentLoader.js";
import {appendAllElements} from "/logic/util/htmlElementsUtil.js";

const FRAGMENT_URL = "/fragments/dialogue/footer.html";
const EMPTY_LABEL_TEMPLATE = "<label/>";

const LEFT_SEGMENT_SELECTOR = ".component-dialogue-footer-left";
const RIGHT_SEGMENT_SELECTOR = ".component-dialogue-footer-right";

export async function buildFooterFragment(left, right) {
    const footer = await fetchFragment(FRAGMENT_URL);

    const leftSegment = footer.querySelector(LEFT_SEGMENT_SELECTOR);
    const rightSegment = footer.querySelector(RIGHT_SEGMENT_SELECTOR);

    appendAllElements(leftSegment, left);
    appendAllElements(rightSegment, right);

    return footer;
}
import {fetchFragment} from "/logic/util/componentLoader.js";
import {appendAllElements} from "/logic/util/htmlElementsUtil.js";

const FRAGMENT_URL = "/fragments/dialogue/header.html";

const LEFT_SEGMENT_SELECTOR = ".component-dialogue-header-left";
const CENTRE_SEGMENT_SELECTOR = ".component-dialogue-header-centre";
const RIGHT_SEGMENT_SELECTOR = ".component-dialogue-header-right";

export async function buildHeaderFragment(left, centre, right) {
    const header = await fetchFragment(FRAGMENT_URL);

    appendAllElements(header.querySelector(LEFT_SEGMENT_SELECTOR), left);
    appendAllElements(header.querySelector(CENTRE_SEGMENT_SELECTOR), centre);
    appendAllElements(header.querySelector(RIGHT_SEGMENT_SELECTOR), right);

    return header;
}

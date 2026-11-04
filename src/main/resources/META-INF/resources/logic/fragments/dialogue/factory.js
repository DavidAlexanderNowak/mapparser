import {fetchFragment} from "/logic/util/componentLoader.js";

import {buildHeaderFragment} from "./header.js";
import {buildFooterFragment} from "./footer.js";


const FRAGMENT_URL = "/fragments/dialogue/container.html";

const HEADER_SEGMENT_SELECTOR = ".component-dialogue-header";
const CONTENT_SEGMENT_SELECTOR = ".component-dialogue-content";
const FOOTER_SEGMENT_SELECTOR = ".component-dialogue-footer";

const LINK_TEMPLATE = "<a href='{linkUrl}' target='_blank'>{linkContent}</a>"
const LINK_TEMPLATE_URL_STRING = "{linkUrl}"
const LINK_TEMPLATE_CONTENT_STRING = "{linkContent}"

const BUTTON_TEMPLATE = "<button{buttonId}>{buttonContent}</button>";
const BUTTON_TEMPLATE_STRING = "{buttonContent}";
const BUTTON_ID_TEMPLATE_STRING = "{buttonId}";

const LABEL_TEMPLATE = "<label>{labelText}</label>";
const LABEL_TEMPLATE_STRING = "{labelText}";

const IMAGE_TEMPLATE = "<img src='{imageUrl}'/>";
const IMAGE_URL_TEMPLATE_STRING = "{imageUrl}";

const LABEL_ICON_TEMPLATE = "<label class='icon-label'>{iconLabelCharacter}</label>";
const LABEL_ICON_TEMPLATE_STRING = "{iconLabelCharacter}";

const TEXT_BLOCK_TEMPLATE = "<p>{textBlockString}</p>"
const TEXT_BLOCK_TEMPLATE_STRING = "{textBlockString}"

const SPAN_TEXT_BLOCK_TEMPLATE = "<span>{spanTextBlockString}</span>"
const SPAN_TEXT_BLOCK_TEMPLATE_STRING = "{spanTextBlockString}"

export async function displayDialogue(header, content, footer, layoutClass, dialogueId) {
    let dialogueRootElement = await fetchFragment(FRAGMENT_URL);
    if(dialogueId) {
        dialogueRootElement.firstElementChild.id = dialogueId;
    }
    dialogueRootElement.querySelector(HEADER_SEGMENT_SELECTOR).append(header);
    dialogueRootElement.querySelector(CONTENT_SEGMENT_SELECTOR).append(content);
    dialogueRootElement.querySelector(FOOTER_SEGMENT_SELECTOR).append(footer);
    if (layoutClass) {
        dialogueRootElement.firstElementChild.classList.add(layoutClass);
    }
    document.body.append(dialogueRootElement);
}

export async function buildHeader(buttonsLeft, title, buttonsRight) {
    return await buildHeaderFragment(buttonsLeft, buildTitleFragment(title), buttonsRight);
}

export async function buildFooter(left, right) {
    return await buildFooterFragment(left, right);
}

export function buildIconButton(iconUrl, labelString, elementId) {
    const content = replaceOrReturnEmpty(IMAGE_TEMPLATE, IMAGE_URL_TEMPLATE_STRING, iconUrl) +
        replaceOrReturnEmpty(LABEL_TEMPLATE, LABEL_TEMPLATE_STRING, labelString);
    return buildButton(content, elementId);
}

export function buildLabelButton(iconLabelString, labelString, elementId) {
    const content = replaceOrReturnEmpty(LABEL_ICON_TEMPLATE, LABEL_ICON_TEMPLATE_STRING, iconLabelString) +
        replaceOrReturnEmpty(LABEL_TEMPLATE, LABEL_TEMPLATE_STRING, labelString);
    return buildButton(content, elementId);
}

export function buildIconLink(linkUrl, iconUrl, labelString) {
    let content = replaceOrReturnEmpty(IMAGE_TEMPLATE, IMAGE_URL_TEMPLATE_STRING, iconUrl) +
        replaceOrReturnEmpty(LABEL_TEMPLATE, LABEL_TEMPLATE_STRING, labelString);
    return LINK_TEMPLATE.replace(LINK_TEMPLATE_URL_STRING, linkUrl).replace(LINK_TEMPLATE_CONTENT_STRING, content);
}

export function buildLabelLink(linkUrl, iconLabelString, labelString) {
    let content = replaceOrReturnEmpty(LABEL_ICON_TEMPLATE, LABEL_ICON_TEMPLATE_STRING, iconLabelString) +
        replaceOrReturnEmpty(LABEL_TEMPLATE, LABEL_TEMPLATE_STRING, labelString);
    return LINK_TEMPLATE.replace(LINK_TEMPLATE_URL_STRING, linkUrl).replace(LINK_TEMPLATE_CONTENT_STRING, content);
}

export function buildTitleFragment(title) {
    return replaceOrReturnEmpty(LABEL_TEMPLATE, LABEL_TEMPLATE_STRING, title);
}

export function buildTextBlock(text) {
    return replaceOrReturnEmpty(TEXT_BLOCK_TEMPLATE, TEXT_BLOCK_TEMPLATE_STRING, text);
}

export function buildSpanTextBlock(text) {
    return replaceOrReturnEmpty(SPAN_TEXT_BLOCK_TEMPLATE, SPAN_TEXT_BLOCK_TEMPLATE_STRING, text);
}

function buildButton(content, elementId) {
    const buttonTemplateWithContent = BUTTON_TEMPLATE.replace(BUTTON_TEMPLATE_STRING, content);
    return buttonTemplateWithContent.replace(BUTTON_ID_TEMPLATE_STRING, elementId ? ` id='${elementId}'` : "");
}

function replaceOrReturnEmpty(template, templateString, value) {
    return value != null ? template.replace(templateString, value) : "";
}

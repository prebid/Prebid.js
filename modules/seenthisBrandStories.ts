import { getBoundingClientRect } from "../libraries/boundingClientRect/boundingClientRect.js";
import { getWinDimensions } from "../src/utils.js";

export const DEFAULT_MARGINS = "16px";

export const EVENTS = [
  "@seenthis_storylines/ready",
  "@seenthis_enabled",
  "@seenthis_disabled",
  "@seenthis_metric",
  "@seenthis_detach",
  "@seenthis_modal/opened",
  "@seenthis_modal/closed",
  "@seenthis_modal/beforeopen",
  "@seenthis_modal/beforeclose",
];

const frameElements: Record<string, HTMLIFrameElement> = {};
const containerElements: Record<string, HTMLDivElement> = {};
const isInitialized: Record<string, boolean> = {};
let classNames: Record<string, string> = {};

export function calculateMargins(element: HTMLElement) {
  const boundingClientRect = getBoundingClientRect(element);
  const wrapperLeftMargin = window.getComputedStyle(element).marginLeft;
  const marginLeft = boundingClientRect.left - parseInt(wrapperLeftMargin, 10);

  if (boundingClientRect.width === 0 || marginLeft === 0) {
    element.style.setProperty("--storylines-margins", DEFAULT_MARGINS);
    element.style.setProperty("--storylines-margin-left", DEFAULT_MARGINS);
    return;
  }

  element.style.setProperty("--storylines-margin-left", `-${marginLeft}px`);
  element.style.setProperty("--storylines-margins", `${marginLeft * 2}px`);
}

export function getFrameByEvent(event: MessageEvent) {
  return Array.from(document.getElementsByTagName("iframe")).filter(
    (iframe) => {
      return iframe.contentWindow === event.source;
    }
  )[0];
}

export function addStyleToSingleChildAncestors(
  element: HTMLElement,
  { key, value }: { key: string; value: string }
) {
  const windowWidth = getWinDimensions().width;
  const elementWidth = element.offsetWidth;

  if (key in element.style && elementWidth < windowWidth) {
    element.style.setProperty(key, value);
  }
  if (!element.parentElement || element.parentElement?.children.length > 1) {
    return;
  }
  addStyleToSingleChildAncestors(element.parentElement, { key, value });
}

export function findAdWrapper(target: HTMLDivElement) {
  if (
    window?.frameElement &&
    /^google_ads_iframe_/.test((window?.frameElement as HTMLIFrameElement).name)
  ) {
    return window.frameElement as HTMLIFrameElement;
  } else {
    return target?.parentElement?.parentElement;
  }
}

export function applyFullWidth(target: HTMLDivElement) {
  const adWrapper = findAdWrapper(target);
  if (adWrapper) {
    addStyleToSingleChildAncestors(adWrapper, { key: "width", value: "100%" });
  }
}

export function applyAutoHeight(target: HTMLDivElement) {
  const adWrapper = findAdWrapper(target);
  if (adWrapper) {
    addStyleToSingleChildAncestors(adWrapper, { key: "height", value: "auto" });
    addStyleToSingleChildAncestors(adWrapper, {
      key: "min-height",
      value: "auto",
    });
  }
}

// listen to messages from iframes
window.addEventListener("message", (event) => {
  const data = event?.data;
  if (!data) return;

  switch (data.type) {
    case "storylines:init": {
      const storyKey = data.storyKey;
      if (!storyKey || isInitialized[storyKey]) return;

      isInitialized[storyKey] = true;

      frameElements[storyKey] = getFrameByEvent(event);
      containerElements[storyKey] = frameElements[storyKey]
        ?.parentElement as HTMLDivElement;
      event.source?.postMessage(
        "storylines:init-ok",
        "*" as WindowPostMessageOptions
      );

      const styleEl = document.createElement("style");
      styleEl.textContent = data.css;
      document.head.appendChild(styleEl);
      if (data.fixes.includes("full-width")) {
        applyFullWidth(containerElements[storyKey]);
      }
      if (data.fixes.includes("auto-height")) {
        applyAutoHeight(containerElements[storyKey]);
      }

      classNames = data.classNames;
      containerElements[storyKey]?.classList.add(classNames.container);
      calculateMargins(containerElements[storyKey]);
      break;
    }
    case "@seenthis_modal/beforeopen": {
      const storyKey = data.detail.storyKey;
      document.body.classList.add(classNames.expandedBody);
      containerElements[storyKey]?.classList.add("expanded");
      break;
    }
    case "@seenthis_modal/beforeclose": {
      const storyKey = data.detail.storyKey;
      document.body.classList.remove(classNames.expandedBody);
      containerElements[storyKey]?.classList.remove("expanded");
      break;
    }
  }

  // dispatch events to parent window
  if (EVENTS.includes(data.type)) {
    window.dispatchEvent(new CustomEvent(data.type, { detail: data }));
  }
});

Array.from(window.frames).forEach((frame) => {
  frame.postMessage("storylines:bridge-ready", "*");
});

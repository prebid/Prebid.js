import { canAccessWindowTop, getWindowSelf, getWindowTop } from "../../src/utils.js";
import { getBoundingClientRect } from "../boundingClientRect/boundingClientRect.js";
import { getGptSlotInfoForAdUnitCode } from "../gptUtils/gptUtils.js";

export const getElementForAdUnitCode = (adUnitCode: string): HTMLElement | undefined => {
  if (!adUnitCode) return;
  const win = canAccessWindowTop() ? getWindowTop() : getWindowSelf();
  const doc = win.document;
  let element = doc?.getElementById(adUnitCode);
  if (element) return element;
  const divId = getGptSlotInfoForAdUnitCode(adUnitCode)?.divId;
  element = doc?.getElementById(divId);
  if (element) return element;
};

export const getViewportDistance = (adUnitCode?: string): number | undefined => {
  try {
    const round = (value: number) => Number(value.toFixed(2));
    const element = getElementForAdUnitCode(adUnitCode);
    if (!element) return;
    const rect = getBoundingClientRect(element);
    if (!rect) return;

    const win = canAccessWindowTop() ? getWindowTop() : getWindowSelf();
    const doc = win.document;

    const viewportHeight = win.innerHeight ||
      doc?.documentElement?.clientHeight ||
      doc?.body?.clientHeight ||
      0;

    if (!viewportHeight) return;

    if (rect.top > viewportHeight) {
      return round((rect.top - viewportHeight) / viewportHeight);
    }
    if (rect.bottom < 0) {
      return round(rect.bottom / viewportHeight);
    }
    if (rect.top < 0) {
      return round(rect.top / viewportHeight);
    }
    if (rect.bottom > viewportHeight) {
      return round((rect.bottom - viewportHeight) / viewportHeight);
    }
    return 0;
  } catch (_) {}
};

export const isPageVisible = (): boolean => document.visibilityState === "visible"

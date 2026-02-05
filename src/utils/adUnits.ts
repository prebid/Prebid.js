import type {AdUnitDefinition} from "../adUnits.ts";
import type {BidRequest} from "../adapterManager.ts";
import type {Bid} from "../bidfactory.ts";

// TODO: for 11, this should be merged with the GPT/AST logic in secureCreatives
// (after customSlotMatching becomes config - https://github.com/prebid/Prebid.js/issues/14408)
export function getAdUnitElement(bidRequest: BidRequest<any>): HTMLElement
export function getAdUnitElement(bidResponse: Bid): HTMLElement
export function getAdUnitElement(adUnit: AdUnitDefinition): HTMLElement
export function getAdUnitElement(target: {
  code?: string,
  adUnitCode?: string,
  elementSelector?: string
}): HTMLElement {
  let selector = target.elementSelector;
  if (selector == null) {
    const elementId = target.adUnitCode ?? target.code;
    if (elementId) {
      selector = `#${elementId}`;
    }
  }
  return selector == null ? null : document.querySelector(selector);
}

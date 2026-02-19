import type {AdUnitDefinition} from "../adUnits.ts";
import type {BidRequest} from "../adapterManager.ts";
import type {Bid} from "../bidfactory.ts";

export function getAdUnitElement(bidRequest: BidRequest<any>): HTMLElement
export function getAdUnitElement(bidResponse: Bid): HTMLElement
export function getAdUnitElement(adUnit: AdUnitDefinition): HTMLElement
export function getAdUnitElement(target: {
  code?: string,
  adUnitCode?: string,
  element?: HTMLElement
}): HTMLElement | null {
  if (target.element != null) {
    return target.element;
  }
  const id = target.adUnitCode ?? target.code;
  if (id) {
    return document.getElementById(id);
  }
  return null;
}

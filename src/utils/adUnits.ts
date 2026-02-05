import type {AdUnitDefinition} from "../adUnits.ts";

/**
 * @param adUnit
 * @returns the HTML element corresponding to `adUnit`.
 */
export function getAdUnitElement(adUnit: AdUnitDefinition): HTMLElement {
  return document.querySelector(adUnit.elementSelector ?? `#${adUnit.code}`);
}

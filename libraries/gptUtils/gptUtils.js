import { CLIENT_SECTIONS } from '../../src/fpd/oneClient.js';
import {find} from '../../src/polyfill.js';
import {compareCodeAndSlot, deepAccess, isGptPubadsDefined, uniques} from '../../src/utils.js';

/**
 * Returns filter function to match adUnitCode in slot
 * @param {string} adUnitCode AdUnit code
 * @return {function} filter function
 */
export function isSlotMatchingAdUnitCode(adUnitCode) {
  return (slot) => compareCodeAndSlot(slot, adUnitCode);
}

/**
 * @summary Uses the adUnit's code in order to find a matching gpt slot object on the page
 */
export function getGptSlotForAdUnitCode(adUnitCode) {
  let matchingSlot;
  if (isGptPubadsDefined()) {
    // find the first matching gpt slot on the page
    matchingSlot = find(window.googletag.pubads().getSlots(), isSlotMatchingAdUnitCode(adUnitCode));
  }
  return matchingSlot;
}

/**
 * @summary Uses the adUnit's code in order to find a matching gptSlot on the page
 */
export function getGptSlotInfoForAdUnitCode(adUnitCode) {
  const matchingSlot = getGptSlotForAdUnitCode(adUnitCode);
  if (matchingSlot) {
    return {
      gptSlot: matchingSlot.getAdUnitPath(),
      divId: matchingSlot.getSlotElementId()
    };
  }
  return {};
}

export const taxonomies = ['IAB_AUDIENCE_1_1', 'IAB_CONTENT_2_2'];

export function getSignals(fpd) {
  const signals = Object.entries({
    [taxonomies[0]]: getSegments(fpd, ['user.data'], 4),
    [taxonomies[1]]: getSegments(fpd, CLIENT_SECTIONS.map(section => `${section}.content.data`), 6)
  }).map(([taxonomy, values]) => values.length ? {taxonomy, values} : null)
    .filter(ob => ob);

  return signals;
}

export function getSegments(fpd, sections, segtax) {
  return sections
    .flatMap(section => deepAccess(fpd, section) || [])
    .filter(datum => datum.ext?.segtax === segtax)
    .flatMap(datum => datum.segment?.map(seg => seg.id))
    .filter(ob => ob)
    .filter(uniques)
}

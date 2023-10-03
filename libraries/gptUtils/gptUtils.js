import {find} from '../../src/polyfill.js';
import {compareCodeAndSlot, isGptPubadsDefined} from '../../src/utils.js';

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

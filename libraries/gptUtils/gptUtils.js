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
 * @summary Export a k-v pair to GAM
 */
export function setKeyValue(key, value) {
  if (!key || typeof key !== 'string') return false;
  window.googletag = window.googletag || {cmd: []};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(() => {
    window.googletag.pubads().setTargeting(key, value);
  });
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

/**
 * Add an event listener on the given GAM event.
 * If GPT Pubads isn't defined, window.googletag is set to a new object.
 * @param {String} event
 * @param {Function} callback
 */
export function subscribeToGamEvent(event, callback) {
  const register = () => window.googletag.pubads().addEventListener(event, callback);
  if (isGptPubadsDefined()) {
    register();
    return;
  }
  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(register);
}

/**
 * @typedef {Object} Slot
 * @property {function(String): (String|null)} get
 * @property {function(): String} getAdUnitPath
 * @property {function(): String[]} getAttributeKeys
 * @property {function(): String[]} getCategoryExclusions
 * @property {function(String): String} getSlotElementId
 * @property {function(): String[]} getTargeting
 * @property {function(): String[]} getTargetingKeys
 * @see {@link https://developers.google.com/publisher-tag/reference#googletag.Slot GPT official docs}
 */

/**
 * @typedef {Object} SlotRenderEndedEvent
 * @property {(String|null)} advertiserId
 * @property {(String|null)} campaignId
 * @property {(String[]|null)} companyIds
 * @property {(Number|null)} creativeId
 * @property {(Number|null)} creativeTemplateId
 * @property {(Boolean)} isBackfill
 * @property {(Boolean)} isEmpty
 * @property {(Number[]|null)} labelIds
 * @property {(Number|null)} lineItemId
 * @property {(String)} serviceName
 * @property {(string|Number[]|null)} size
 * @property {(Slot)} slot
 * @property {(Boolean)} slotContentChanged
 * @property {(Number|null)} sourceAgnosticCreativeId
 * @property {(Number|null)} sourceAgnosticLineItemId
 * @property {(Number[]|null)} yieldGroupIds
 * @see {@link https://developers.google.com/publisher-tag/reference#googletag.events.SlotRenderEndedEvent GPT official docs}
 */

/**
 * @callback SlotRenderEndedEventCallback
 * @param {SlotRenderEndedEvent} event
 * @returns {void}
 */

/**
 * Add an event listener on the GAM event 'slotRenderEnded'.
 * @param {SlotRenderEndedEventCallback} callback
 */
export function subscribeToGamSlotRenderEndedEvent(callback) {
  subscribeToGamEvent('slotRenderEnded', callback)
}

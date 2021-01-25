// This module, when included, will trigger a BID_VIEWABLE event which can be consumed by Bidders and Analytics adapters
// GPT API is used to find when a bid is viewable, https://developers.google.com/publisher-tag/reference#googletag.events.impressionviewableevent
// Does not work with other than GPT integration

import { config } from '../src/config.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.json';
import { logWarn, isFn, triggerPixel } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

const MODULE_NAME = 'bidViewability';
const CONFIG_FIRE_PIXELS = 'firePixels';
const CONFIG_CUSTOM_MATCH = 'customMatchFunction';
const BID_VURL_ARRAY = 'vurls';
const GPT_IMPRESSION_VIEWABLE_EVENT = 'impressionViewable';

export let isBidAdUnitCodeMatchingSlot = (bid, slot) => {
  return (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode);
}

export let getMatchingWinnigBidForGPTSlot = (globalModuleConfig, slot) => {
  return getGlobal().getAllWinningBids().find(
    bid => isFn(globalModuleConfig[CONFIG_CUSTOM_MATCH])
      ? globalModuleConfig[CONFIG_CUSTOM_MATCH](bid, slot)
      : isBidAdUnitCodeMatchingSlot(bid, slot)
  ) || null;
};

export let fireViewabilityPixels = (globalModuleConfig, bid) => {
  if (globalModuleConfig[CONFIG_FIRE_PIXELS] === true && bid.hasOwnProperty(BID_VURL_ARRAY)) {
    bid[BID_VURL_ARRAY].forEach(url => triggerPixel(url));
  }
};

export let logWinningBidNotFound = (slot) => {
  logWarn(`bid details could not be found for ${slot.getSlotElementId()}, probable reasons: a non-prebid bid is served OR check the prebid.AdUnit.code to GPT.AdSlot relation.`);
};

export let gptImpressionViewableListener = (event) => {
  let slot = event.slot;
  // read the config for the module
  const globalModuleConfig = config.getConfig(MODULE_NAME) || {};
  // supports custom match function from config
  let respectiveBid = getMatchingWinnigBidForGPTSlot(globalModuleConfig, slot)
  if (respectiveBid === null) {
    logWinningBidNotFound(slot);
  } else {
    // if config is enabled AND VURL array is present then execute each pixel
    fireViewabilityPixels(globalModuleConfig, respectiveBid);
    // emit the BID_VIEWABLE event with bid details, this event can be consumed by bidders and analytics pixels
    events.emit(EVENTS.BID_VIEWABLE, respectiveBid);
  }
};

export let init = () => {
  events.on(EVENTS.AUCTION_INIT, () => {
    // add the GPT event listener
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(() => {
      window.googletag.pubads().addEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, gptImpressionViewableListener);
    });
  });
}

init()

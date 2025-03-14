// This module, when included, will trigger a BID_VIEWABLE event which can be consumed by Bidders and Analytics adapters
// GPT API is used to find when a bid is viewable, https://developers.google.com/publisher-tag/reference#googletag.events.impressionviewableevent
// Does not work with other than GPT integration

import {config} from '../src/config.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';
import {isFn, logWarn, triggerPixel} from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.ts';
import adapterManager, {gppDataHandler, uspDataHandler} from '../src/adapterManager.js';
import {find} from '../src/polyfill.js';
import {gdprParams} from '../libraries/dfpUtils/dfpUtils.js';

const MODULE_NAME = 'bidViewability';
const CONFIG_ENABLED = 'enabled';
const CONFIG_FIRE_PIXELS = 'firePixels';
const CONFIG_CUSTOM_MATCH = 'customMatchFunction';
const BID_VURL_ARRAY = 'vurls';
const GPT_IMPRESSION_VIEWABLE_EVENT = 'impressionViewable';

export let isBidAdUnitCodeMatchingSlot = (bid, slot) => {
  return (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode);
}

export let getMatchingWinningBidForGPTSlot = (globalModuleConfig, slot) => {
  return find(getGlobal().getAllWinningBids(),
    // supports custom match function from config
    bid => isFn(globalModuleConfig[CONFIG_CUSTOM_MATCH])
      ? globalModuleConfig[CONFIG_CUSTOM_MATCH](bid, slot)
      : isBidAdUnitCodeMatchingSlot(bid, slot)
  ) || null;
};

export let fireViewabilityPixels = (globalModuleConfig, bid) => {
  if (globalModuleConfig[CONFIG_FIRE_PIXELS] === true && bid.hasOwnProperty(BID_VURL_ARRAY)) {
    let queryParams = gdprParams();

    const uspConsent = uspDataHandler.getConsentData();
    if (uspConsent) { queryParams.us_privacy = uspConsent; }

    const gppConsent = gppDataHandler.getConsentData();
    if (gppConsent) {
      // TODO - need to know what to set here for queryParams...
    }

    bid[BID_VURL_ARRAY].forEach(url => {
      // add '?' if not present in URL
      if (Object.keys(queryParams).length > 0 && url.indexOf('?') === -1) {
        url += '?';
      }
      // append all query params, `&key=urlEncoded(value)`
      url += Object.keys(queryParams).reduce((prev, key) => prev += `&${key}=${encodeURIComponent(queryParams[key])}`, '');
      triggerPixel(url)
    });
  }
};

export let logWinningBidNotFound = (slot) => {
  logWarn(`bid details could not be found for ${slot.getSlotElementId()}, probable reasons: a non-prebid bid is served OR check the prebid.AdUnit.code to GPT.AdSlot relation.`);
};

export let impressionViewableHandler = (globalModuleConfig, slot, event) => {
  let respectiveBid = getMatchingWinningBidForGPTSlot(globalModuleConfig, slot);

  if (respectiveBid === null) {
    logWinningBidNotFound(slot);
  } else {
    // if config is enabled AND VURL array is present then execute each pixel
    fireViewabilityPixels(globalModuleConfig, respectiveBid);
    // trigger respective bidder's onBidViewable handler
    adapterManager.callBidViewableBidder(respectiveBid.adapterCode || respectiveBid.bidder, respectiveBid);

    if (respectiveBid.deferBilling) {
      adapterManager.triggerBilling(respectiveBid);
    }

    // emit the BID_VIEWABLE event with bid details, this event can be consumed by bidders and analytics pixels
    events.emit(EVENTS.BID_VIEWABLE, respectiveBid);
  }
};

export let init = () => {
  events.on(EVENTS.AUCTION_INIT, () => {
    // read the config for the module
    const globalModuleConfig = config.getConfig(MODULE_NAME) || {};
    // do nothing if module-config.enabled is not set to true
    // this way we are adding a way for bidders to know (using pbjs.getConfig('bidViewability').enabled === true) whether this module is added in build and is enabled
    if (globalModuleConfig[CONFIG_ENABLED] !== true) {
      return;
    }
    // add the GPT event listener
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(() => {
      window.googletag.pubads().addEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, function(event) {
        impressionViewableHandler(globalModuleConfig, event.slot, event);
      });
    });
  });
}

init()

// This module, when included, will trigger a BID_VIEWABLE event which can be consumed by Bidders and Analytics adapters
// GPT API is used to find when a bid is viewable, https://developers.google.com/publisher-tag/reference#googletag.events.impressionviewableevent
// Does not work with other than GPT integration

import {config} from '../src/config.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';
import {isFn, logWarn, triggerPixel} from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.js';
import adapterManager, {gppDataHandler, uspDataHandler} from '../src/adapterManager.js';
import {gdprParams} from '../libraries/dfpUtils/dfpUtils.js';

const MODULE_NAME = 'bidViewability';
const CONFIG_ENABLED = 'enabled';
const CONFIG_FIRE_PIXELS = 'firePixels';
const CONFIG_CUSTOM_MATCH = 'customMatchFunction';
const BID_VURL_ARRAY = 'vurls';
const GPT_IMPRESSION_VIEWABLE_EVENT = 'impressionViewable';

export const isBidAdUnitCodeMatchingSlot = (bid, slot) => {
  return (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode);
}

export const getMatchingWinningBidForGPTSlot = (globalModuleConfig, slot) => {
  return getGlobal().getAllWinningBids().find(
    // supports custom match function from config
    bid => isFn(globalModuleConfig[CONFIG_CUSTOM_MATCH])
      ? globalModuleConfig[CONFIG_CUSTOM_MATCH](bid, slot)
      : isBidAdUnitCodeMatchingSlot(bid, slot)
  ) || null;
};

export const fireViewabilityPixels = (globalModuleConfig, bid) => {
  if (globalModuleConfig[CONFIG_FIRE_PIXELS] === true && bid.hasOwnProperty(BID_VURL_ARRAY)) {
    const queryParams = gdprParams();

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
      url += Object.keys(queryParams).reduce((prev, key) => {
        prev += `&${key}=${encodeURIComponent(queryParams[key])}`;
        return prev;
      }, '');
      triggerPixel(url)
    });
  }
};

export const logWinningBidNotFound = (slot) => {
  logWarn(`bid details could not be found for ${slot.getSlotElementId()}, probable reasons: a non-prebid bid is served OR check the prebid.AdUnit.code to GPT.AdSlot relation.`);
};

export const impressionViewableHandler = (globalModuleConfig, event) => {
  const slot = event.slot;
  const respectiveBid = getMatchingWinningBidForGPTSlot(globalModuleConfig, slot);

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

const handleSetConfig = (config) => {
  const globalModuleConfig = config || {};
  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];

  // do nothing if module-config.enabled is not set to true
  // this way we are adding a way for bidders to know (using pbjs.getConfig('bidViewability').enabled === true) whether this module is added in build and is enabled
  const impressionViewableHandlerWrapper = (event) => {
    window.googletag.pubads().removeEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, impressionViewableHandlerWrapper);
    impressionViewableHandler(globalModuleConfig, event);
  };

  if (globalModuleConfig[CONFIG_ENABLED] !== true) {
    window.googletag.cmd.push(() => {
      window.googletag.pubads().removeEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, impressionViewableHandlerWrapper);
    });
    return;
  }
  // add the GPT event listener
  window.googletag.cmd.push(() => {
    window.googletag.pubads().addEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, impressionViewableHandlerWrapper);
  });
}

config.getConfig(MODULE_NAME, config => handleSetConfig(config[MODULE_NAME]));

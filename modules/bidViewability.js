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

export function init() {
  let isBidAdUnitCodeMatchingSlot = (bid, slot) => (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode);

  events.on(EVENTS.AUCTION_INIT, function() {
    // add the GPT event listener
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(function() {
      window.googletag.pubads().addEventListener('impressionViewable', function(event) {
        let slot = event.slot;

        // read the config for the module
        const globalModuleConfig = config.getConfig(MODULE_NAME) || {};

        // supports custom match function from config
        let respectiveBid = getGlobal().getAllWinningBids().find(
          bid => isFn(globalModuleConfig[CONFIG_CUSTOM_MATCH]) ? globalModuleConfig[CONFIG_CUSTOM_MATCH](bid, slot) : isBidAdUnitCodeMatchingSlot(bid, slot)
        );

        if (respectiveBid === undefined) {
          logWarn(`bid details could not be found for ${slot.getSlotElementId()}, probable reasons: a non-prebid bid is served OR check the prebid.AdUnit.code to GPT.AdSlot relation.`);
          return;
        }

        // if config is enabled AND VURL array is present then execute each pixel
        if (globalModuleConfig[CONFIG_FIRE_PIXELS] === true && respectiveBid.hasOwnProperty(BID_VURL_ARRAY)) {
          respectiveBid[BID_VURL_ARRAY].forEach(url => triggerPixel(url));
        }

        // emit the BID_VIEWABLE event with bid details, this event can be consumed by bidders and analytics pixels
        events.emit(EVENTS.BID_VIEWABLE, respectiveBid);
      });
    });
  });
}

init()

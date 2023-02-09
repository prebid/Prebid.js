import {config} from '../src/config.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';
import { isFn } from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.js';
import { find } from '../src/polyfill.js';

const MODULE_NAME = 'interstitialVisibilityForBilling';
const ENABLED = 'enabled';
const GPT_IMPRESSION_VIEWABLE_EVENT = 'impressionViewable';
// const GPT_SLOT_ON_LOAD_EVENT = 'slotOnload';
const CONFIG_CUSTOM_MATCH = 'customMatchFunction';

export let getMatchingWinningBidForGPTSlot = (globalModuleConfig, slot) => {
  return find(
    getGlobal().getAllWinningBids(),
    // supports custom match function from config
    bid => isFn(globalModuleConfig[CONFIG_CUSTOM_MATCH]) ? globalModuleConfig[CONFIG_CUSTOM_MATCH](bid, slot) : isBidAdUnitCodeMatchingSlot(bid, slot)
  ) || null;
};

export let isBidAdUnitCodeMatchingSlot = (bid, slot) => {
  return (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode);
}

let checkIfInterstitialAd = bid => {
  const adUnits = getGlobal().adUnits;
  const adUnit = adUnits.find(adUnit => adUnit.code === bid.adUnitCode) || null;
  return adUnit && adUnit.ortb2Imp.instl;
};

export const gptImpressionViewableHandler = (currentSlot, globalModuleConfig) => {
  // eslint-disable-next-line no-console
  console.log('gptImpressionViewableHandler func invoked: ', { currentSlot });
  const winningBid = getMatchingWinningBidForGPTSlot(globalModuleConfig, currentSlot);

  if (winningBid && checkIfInterstitialAd(winningBid)) {
    // eslint-disable-next-line no-console
    console.log('billable ready');
    events.emit(CONSTANTS.EVENTS.BILLABLE_EVENT, winningBid);
  }
};

// export const gptSlotOnLoadHandler = adSlotElementId => {
//   // eslint-disable-next-line no-console
//   console.log('gptSlotOnLoadHandler func invoked: ', { adSlotElementId });
//   document.getElementById('link').style.display = 'block';
//   document.getElementById('status').innerText = 'Interstitial is loaded.';
// };

export const setGptEventHandlers = () => {
  events.on(CONSTANTS.EVENTS.AUCTION_INIT, () => {
    // read the config for the module
    const globalModuleConfig = config.getConfig(MODULE_NAME) || {};

    // add the GPT event listeners
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(() => {
      // window.googletag.pubads().addEventListener(GPT_SLOT_ON_LOAD_EVENT, (event) => {
      //   const currentAdSlotElement = event.slot.getSlotElementId();
      //   gptSlotOnLoadHandler(currentAdSlotElement);
      // });

      window.googletag.pubads().addEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, (event) => {
        const currentSlot = event.slot;
        gptImpressionViewableHandler(currentSlot, globalModuleConfig);
      });
    });
  });
};

export let init = () => {
  config.getConfig(MODULE_NAME, (globalConfig) => {
    if (globalConfig[MODULE_NAME][ENABLED] !== true) {
      return;
    }

    setGptEventHandlers();
  });
}

init();

import {config} from '../src/config.js';
import adapterManager from '../src/adapterManager.js';
import { targeting } from '../src/targeting.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';
import { isAdUnitCodeMatchingSlot } from '../src/utils.js';

const MODULE_NAME = 'viewabilityScoreGeneration';
const ENABLED = 'enabled';
const TARGETING = 'targeting';
const GPT_SLOT_RENDER_ENDED_EVENT = 'slotRenderEnded';
const GPT_IMPRESSION_VIEWABLE_EVENT = 'impressionViewable';
const GPT_SLOT_VISIBILITY_CHANGED_EVENT = 'slotVisibilityChanged';

export const getAndParseFromLocalStorage = key => JSON.parse(window.localStorage.getItem(key));
export const setAndStringifyToLocalStorage = (key, object) => { window.localStorage.setItem(key, JSON.stringify(object)); };

let vsgObj = getAndParseFromLocalStorage('viewability-data');

export const makeBidRequestsHook = (fn, bidderRequests) => {
  if (vsgObj) {
    bidderRequests.forEach(bidderRequest => {
      bidderRequest.bids.forEach(bid => {
        if (vsgObj[bid.adUnitCode]) bid.bidViewability = vsgObj[bid.adUnitCode];
      });
    });
  }

  fn(bidderRequests);
}

export const gptSlotRenderEndedHandler = (adSlotElementId, setToLocalStorageCb) => {
  if (vsgObj) {
    if (vsgObj[adSlotElementId]) {
      if (vsgObj[adSlotElementId].lastViewed) delete vsgObj[adSlotElementId].lastViewed;

      vsgObj[adSlotElementId].rendered = vsgObj[adSlotElementId].rendered + 1;
      vsgObj[adSlotElementId].updatedAt = Date.now();
    } else {
      vsgObj[adSlotElementId] = {
        rendered: 1,
        viewed: 0,
        createdAt: Date.now()
      }
    }
  } else {
    vsgObj = {
      [adSlotElementId]: {
        rendered: 1,
        viewed: 0,
        createdAt: Date.now()
      }
    }
  }

  setToLocalStorageCb('viewability-data', vsgObj);
};

export const gptImpressionViewableHandler = (adSlotElementId, setToLocalStorageCb) => {
  if (vsgObj) {
    if (vsgObj[adSlotElementId]) {
      vsgObj[adSlotElementId].viewed = vsgObj[adSlotElementId].viewed + 1;
      vsgObj[adSlotElementId].updatedAt = Date.now();
    } else {
      vsgObj[adSlotElementId] = {
        rendered: 0,
        viewed: 1,
        createdAt: Date.now()
      }
    }
  } else {
    vsgObj = {
      [adSlotElementId]: {
        rendered: 0,
        viewed: 1,
        createdAt: Date.now()
      }
    }
  }

  setToLocalStorageCb('viewability-data', vsgObj);
};

export const gptSlotVisibilityChangedHandler = (adSlotElementId, inViewPercentage, setToLocalStorageCb) => {
  if (inViewPercentage > 50) {
    const lastStarted = vsgObj[adSlotElementId].lastViewed;
    const currentTime = performance.now();

    if (lastStarted) {
      const diff = currentTime - lastStarted;
      vsgObj[adSlotElementId].totalViewTime = Math.round((vsgObj[adSlotElementId].totalViewTime || 0) + (diff / 1000));
    }

    vsgObj[adSlotElementId].lastViewed = currentTime;
    setToLocalStorageCb('viewability-data', vsgObj);
  }
}

export let init = () => {
  config.getConfig(MODULE_NAME, (vsgConfig) => {
    if (vsgConfig[MODULE_NAME][ENABLED] !== true) {
      return;
    }

    events.on(CONSTANTS.EVENTS.AUCTION_INIT, () => {
      // add the GPT event listeners
      window.googletag = window.googletag || {};
      window.googletag.cmd = window.googletag.cmd || [];
      window.googletag.cmd.push(() => {
        window.googletag.pubads().addEventListener(GPT_SLOT_RENDER_ENDED_EVENT, function(event) {
          const currentAdSlotElement = event.slot.getSlotElementId();
          gptSlotRenderEndedHandler(currentAdSlotElement, setAndStringifyToLocalStorage);
        });

        window.googletag.pubads().addEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, function(event) {
          const currentAdSlotElement = event.slot.getSlotElementId();
          gptImpressionViewableHandler(currentAdSlotElement, setAndStringifyToLocalStorage);
        });

        window.googletag.pubads().addEventListener(GPT_SLOT_VISIBILITY_CHANGED_EVENT, function(event) {
          const currentAdSlotElement = event.slot.getSlotElementId();
          gptSlotVisibilityChangedHandler(currentAdSlotElement, event.inViewPercentage, setAndStringifyToLocalStorage);
        });
      });
    });

    if (vsgConfig.viewabilityScoreGeneration?.targeting?.enabled) {
      events.on(CONSTANTS.EVENTS.SET_TARGETING, () => {
        let targetingSet = targeting.getAllTargeting();

        if (localStorage.getItem('viewability-data')) {
          Object.keys(targetingSet).forEach(targetKey => {
            if (
              vsgObj[targetKey] &&
              Object.keys(targetingSet[targetKey]).length !== 0 &&
              vsgObj[targetKey].hasOwnProperty('viewed') &&
              vsgObj[targetKey].hasOwnProperty('rendered')
            ) {
              const bvs = Math.round((vsgObj[targetKey].viewed / vsgObj[targetKey].rendered) * 10) / 10;
              const bvb = bvs > 0.7 ? 'HIGH' : bvs < 0.5 ? 'LOW' : 'MEDIUM';
              const targetingScoreKey = vsgConfig[MODULE_NAME][TARGETING].scoreKey ? vsgConfig[MODULE_NAME][TARGETING].scoreKey : 'bidViewabilityScore';
              const targetingBucketKey = vsgConfig[MODULE_NAME][TARGETING].bucketKey ? vsgConfig[MODULE_NAME][TARGETING].bucketKey : 'bidViewabilityBucket';

              targetingSet[targetKey][targetingScoreKey] = bvs;
              targetingSet[targetKey][targetingBucketKey] = bvb;
            }
          });
        }

        window.googletag.pubads().getSlots().forEach(slot => {
          Object.keys(targetingSet).filter(isAdUnitCodeMatchingSlot(slot)).forEach(targetId => {
            slot.updateTargetingFromMap(targetingSet[targetId])
          })
        });
      });
    }

    adapterManager.makeBidRequests.after(makeBidRequestsHook);
  });
}

init();

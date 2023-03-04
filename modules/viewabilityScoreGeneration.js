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
const TOTAL_VIEW_TIME_LIMIT = 1000000000;
const domain = window.location.hostname;

export const getAndParseFromLocalStorage = key => JSON.parse(window.localStorage.getItem(key));
export const setAndStringifyToLocalStorage = (key, object) => { window.localStorage.setItem(key, JSON.stringify(object)); };

let vsgObj = getAndParseFromLocalStorage('viewability-data');

export const makeBidRequestsHook = (fn, bidderRequests) => {
  if (vsgObj) {
    bidderRequests.forEach(bidderRequest => {
      bidderRequest.bids.forEach(bid => {
        const bidViewabilityFields = {};
        const adSizes = {};
        const adUnit = vsgObj[bid.adUnitCode];

        if (bid.sizes.length) {
          bid.sizes.forEach(bidSize => {
            const key = bidSize.toString().replace(',', 'x');

            if (vsgObj[key]) {
              removeUnwantedKeys(vsgObj[key]);
              adSizes[key] = vsgObj[key];
            }
          });
        }

        if (Object.keys(adSizes).length) bidViewabilityFields.adSizes = adSizes;

        if (adUnit) {
          removeUnwantedKeys(adUnit);
          bidViewabilityFields.adUnit = adUnit;
        }

        if (Object.keys(bidViewabilityFields).length) bid.bidViewability = bidViewabilityFields;
      });
    });
  }

  fn(bidderRequests);
};

const removeUnwantedKeys = obj => {
  // Deleteing this field as it is only required to calculate totalViewtime and no need to send it to translator.
  delete obj.lastViewStarted;
  // Deleteing totalTimeView incase value is less than 1 sec.
  if (obj.totalViewTime == 0) {
    delete obj.totalViewTime;
  }
};

// once the TOTAL_VIEW_TIME_LIMIT for totalViewTime is reached, divide totalViewTime, rendered & viewed all by the same factor of "x" in order to preserve the same averages but not let counts in localstorage get too high
const reduceAndPreserveCounts = (key, lsObj = vsgObj) => {
  const divideBy = 2;
  lsObj[key].totalViewTime = Math.round(lsObj[key].totalViewTime / divideBy);
  lsObj[key].rendered = Math.round(lsObj[key].rendered / divideBy);
  lsObj[key].viewed = Math.round(lsObj[key].viewed / divideBy);
};

export const updateTotalViewTime = (diff, currentTime, lastViewStarted, key, lsObj = vsgObj) => {
  diff = currentTime - lastViewStarted;
  const newValue = Math.round((lsObj[key].totalViewTime || 0) + diff / 1000);

  if (newValue >= TOTAL_VIEW_TIME_LIMIT) {
    reduceAndPreserveCounts(key, lsObj);
  } else {
    lsObj[key].totalViewTime = newValue;
  }
};

const incrementRenderCount = keyArr => {
  keyArr.forEach(key => {
    if (vsgObj) {
      if (vsgObj[key]) {
        vsgObj[key].rendered = vsgObj[key].rendered + 1;
      } else {
        vsgObj[key] = {
          rendered: 1,
          viewed: 0
        }
      }
    } else {
      vsgObj = {
        [key]: {
          rendered: 1,
          viewed: 0
        }
      }
    }
  });
};

const incrementViewCount = keyArr => {
  keyArr.forEach(key => {
    if (vsgObj[key]) {
      vsgObj[key].viewed = vsgObj[key].viewed + 1;
    }
  });
};

const incrementTotalViewTime = (keyArr, inViewPercentage, setToLocalStorageCb) => {
  keyArr.forEach(key => {
    if (vsgObj[key]) {
      const currentTime = Date.now();
      const lastViewStarted = vsgObj[key].lastViewStarted;
      let diff;
      if (inViewPercentage < 50) {
        if (lastViewStarted) {
          updateTotalViewTime(diff, currentTime, lastViewStarted, key);
          delete vsgObj[key].lastViewStarted;
        }
      } else {
        if (lastViewStarted) {
          updateTotalViewTime(diff, currentTime, lastViewStarted, key);
        }
        vsgObj[key].lastViewStarted = currentTime;
        setToLocalStorageCb('viewability-data', vsgObj);
      }
    }
  });
};

export const gptSlotRenderEndedHandler = (adSlotElementId, adSlotSize, adDomain, setToLocalStorageCb) => {
  incrementRenderCount([adDomain, adSlotElementId, adSlotSize]);
  setToLocalStorageCb('viewability-data', vsgObj);
};

export const gptImpressionViewableHandler = (adSlotElementId, adSlotSizes, adDomain, setToLocalStorageCb) => {
  const keyArr = [adDomain, adSlotElementId];
  if (adSlotSizes) {
    adSlotSizes.forEach(adSlotSize => {
      const adSlotKey = `${adSlotSize.width}x${adSlotSize.height}`;
      keyArr.push(adSlotKey);
    });
  }
  incrementViewCount(keyArr);
  setToLocalStorageCb('viewability-data', vsgObj);
};

export const gptSlotVisibilityChangedHandler = (adSlotElementId, adSlotSizes, adDomain, inViewPercentage, setToLocalStorageCb) => {
  const keyArr = [adDomain, adSlotElementId];

  if (adSlotSizes) {
    adSlotSizes.forEach(adSlotSize => {
      const adSlotKey = `${adSlotSize.width}x${adSlotSize.height}`;
      keyArr.push(adSlotKey);
    });
  }
  incrementTotalViewTime(keyArr, inViewPercentage, setToLocalStorageCb);
};

export const calculateBucket = (bucketCategories, score) => {
  let bucketCategoriesObject = {};
  let result;

  bucketCategories.forEach((category, index) => {
    bucketCategoriesObject[category] = Math.round(((index + 1) / bucketCategories.length) * 10) / 10;
  });

  for (let i = 0; i < bucketCategories.length; i++) {
    if (score <= bucketCategoriesObject[bucketCategories[i]]) {
      result = bucketCategories[i];
      break;
    }
  }

  return result;
};

export const addViewabilityTargeting = (globalConfig, targetingSet, vsgLocalStorageObj, cb) => {
  Object.keys(targetingSet).forEach(targetKey => {
    if (Object.keys(targetingSet[targetKey]).length !== 0) {
      // Will add only required targetting keys by this module.
      targetingSet[targetKey] = {};
      if (
        vsgLocalStorageObj[targetKey] &&
        vsgLocalStorageObj[targetKey].hasOwnProperty('viewed') &&
        vsgLocalStorageObj[targetKey].hasOwnProperty('rendered')
      ) {
        const viewabilityScore = Math.round((vsgLocalStorageObj[targetKey].viewed / vsgLocalStorageObj[targetKey].rendered) * 10) / 10;
        const viewabilityBucket = calculateBucket(globalConfig[MODULE_NAME][TARGETING].bucketCategories, viewabilityScore);

        if (globalConfig[MODULE_NAME][TARGETING].score) {
          const targetingScoreKey = globalConfig[MODULE_NAME][TARGETING].scoreKey ? globalConfig[MODULE_NAME][TARGETING].scoreKey : 'bidViewabilityScore';
          targetingSet[targetKey][targetingScoreKey] = viewabilityScore;
        }

        if (globalConfig[MODULE_NAME][TARGETING].bucket) {
          const targetingBucketKey = globalConfig[MODULE_NAME][TARGETING].bucketKey ? globalConfig[MODULE_NAME][TARGETING].bucketKey : 'bidViewabilityBucket';
          targetingSet[targetKey][targetingBucketKey] = viewabilityBucket;
        }
      }
    }
  });
  cb(targetingSet);
};

export const setViewabilityTargetingKeys = globalConfig => {
  events.on(CONSTANTS.EVENTS.AUCTION_END, () => {
    if (vsgObj) {
      const targetingSet = targeting.getAllTargeting();
      addViewabilityTargeting(globalConfig, targetingSet, vsgObj, updateGptWithViewabilityTargeting);
    }
  });
};

export const updateGptWithViewabilityTargeting = targetingSet => {
  window.googletag.pubads().getSlots().forEach(slot => {
    Object.keys(targetingSet).filter(isAdUnitCodeMatchingSlot(slot)).forEach(targetId => {
      slot.updateTargetingFromMap(targetingSet[targetId])
    })
  });
}

export const setGptEventHandlers = () => {
  events.on(CONSTANTS.EVENTS.AUCTION_INIT, () => {
    // add the GPT event listeners
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(() => {
      window.googletag.pubads().addEventListener(GPT_SLOT_RENDER_ENDED_EVENT, function(event) {
        const currentAdSlotElement = event.slot.getSlotElementId();
        const currentAdSlotSize = event.size.toString().replace(',', 'x');
        gptSlotRenderEndedHandler(currentAdSlotElement, currentAdSlotSize, domain, setAndStringifyToLocalStorage);
      });

      window.googletag.pubads().addEventListener(GPT_IMPRESSION_VIEWABLE_EVENT, function(event) {
        const currentAdSlotElement = event.slot.getSlotElementId();
        const currentAdSlotSizes = event.slot.getSizes();
        gptImpressionViewableHandler(currentAdSlotElement, currentAdSlotSizes, domain, setAndStringifyToLocalStorage);
      });

      window.googletag.pubads().addEventListener(GPT_SLOT_VISIBILITY_CHANGED_EVENT, function(event) {
        const currentAdSlotElement = event.slot.getSlotElementId();
        const currentAdSlotSizes = event.slot.getSizes();
        gptSlotVisibilityChangedHandler(currentAdSlotElement, currentAdSlotSizes, domain, event.inViewPercentage, setAndStringifyToLocalStorage);
      });
    });
  });
};

const initConfigDefaults = config => {
  if (!config[MODULE_NAME][TARGETING]) { config[MODULE_NAME][TARGETING] = {} };

  config[MODULE_NAME][TARGETING].enabled =
    typeof config.viewabilityScoreGeneration?.targeting?.enabled === 'boolean'
      ? config.viewabilityScoreGeneration?.targeting?.enabled
      : false;

  config[MODULE_NAME][TARGETING].bucketCategories =
    config.viewabilityScoreGeneration?.targeting?.bucketCategories && config.viewabilityScoreGeneration?.targeting?.bucketCategories.every(i => typeof i === 'string')
      ? config.viewabilityScoreGeneration?.targeting?.bucketCategories
      : ['LOW', 'MEDIUM', 'HIGH'];

  config[MODULE_NAME][TARGETING].score =
    typeof config.viewabilityScoreGeneration?.targeting?.score === 'boolean'
      ? config.viewabilityScoreGeneration?.targeting?.score
      : true;

  config[MODULE_NAME][TARGETING].bucket =
    typeof config.viewabilityScoreGeneration?.targeting?.bucket === 'boolean'
      ? config.viewabilityScoreGeneration?.targeting?.bucket
      : true;
};

export let init = (setGptCb, setTargetingCb) => {
  config.getConfig(MODULE_NAME, (globalConfig) => {
    if (globalConfig[MODULE_NAME][ENABLED] !== true) {
      return;
    }

    initConfigDefaults(globalConfig);
    setGptCb();

    if (
      globalConfig.viewabilityScoreGeneration?.targeting?.enabled &&
      (globalConfig.viewabilityScoreGeneration?.targeting?.score || globalConfig.viewabilityScoreGeneration?.targeting?.bucket)
    ) {
      setTargetingCb(globalConfig);
    }

    adapterManager.makeBidRequests.after(makeBidRequestsHook);
  });
}

init(setGptEventHandlers, setViewabilityTargetingKeys);

/**
 * This module adds Freewheel support for Video to Prebid.
 */

import { registerVideoSupport } from '../src/adServerManager';
import { auctionManager } from '../src/auctionManager';
import { groupBy, deepAccess } from '../src/utils';
import { config } from '../src/config';
// TODO import { ADPOD, initAdpodHooks, TARGETING_KEY_PB_CAT_DUR, TARGETING_KEY_CACHE_ID } from './adpod';

// TODO Remove these constants later when adpod module is merged; use above commented import instead
const ADPOD = 'adpod';
const TARGETING_KEY_PB_CAT_DUR = 'hb_pb_cat_dur';
const TARGETING_KEY_CACHE_ID = 'hb_cache_id';

/**
 * This function returns targeting keyvalue pairs for freewheel adserver module
 * @param {Object} options
 * @param {Array[string]} codes
 * @returns targeting kvs for adUnitCodes
 */
export default function getTargeting({codes} = {}) {
  codes = codes || [];
  const adPodAdUnits = getAdPodAdUnits(codes);
  const bidsReceived = auctionManager.getBidsReceived();
  const competiveExclusionEnabled = config.getConfig('adpod.brandCategoryExclusion');

  let bids = getBidsForAdpod(bidsReceived, adPodAdUnits);
  bids = (competiveExclusionEnabled) ? getExclusiveBids(bids) : bids;
  bids.sort(compare);

  let targeting = {};
  adPodAdUnits.forEach((adUnit) => {
    let adPodTargeting = [];
    let adPodDurationSeconds = deepAccess(adUnit, 'mediaTypes.video.adPodDurationSec');

    bids
      .filter((bid) => bid.adUnitCode === adUnit.code)
      .forEach((bid, index, arr) => {
        if (bid.video.durationBucket <= adPodDurationSeconds) {
          adPodTargeting.push({
            [TARGETING_KEY_PB_CAT_DUR]: bid.adserverTargeting[TARGETING_KEY_PB_CAT_DUR]
          });
          adPodDurationSeconds -= bid.video.durationBucket;
        }
        if (index === arr.length - 1 && adPodTargeting.length > 0) {
          adPodTargeting.push({
            [TARGETING_KEY_CACHE_ID]: bid.adserverTargeting[TARGETING_KEY_CACHE_ID]
          });
        }
      });
    targeting[adUnit.code] = adPodTargeting;
  });
  return targeting;
}

/**
 * This function returns the adunit of mediaType adpod
 * @param {Array} codes adUnitCodes
 * @returns {Array[Object]} adunits of mediaType adpod
 */
function getAdPodAdUnits(codes) {
  return auctionManager.getAdUnits()
    .filter((adUnit) => deepAccess(adUnit, 'mediaTypes.video.context') === ADPOD)
    .filter((adUnit) => (codes.length > 0) ? codes.indexOf(adUnit.code) != -1 : true);
}

function compare(a, b) {
  if (a.cpm < b.cpm) {
    return 1;
  }
  if (a.cpm > b.cpm) {
    return -1;
  }
  return 0;
}

/**
 * This function removes bids of same freewheel category. It will be used when competitive exclusion is enabled.
 * @param {Array[Object]} bidsReceived
 * @returns {Array[Object]} unique freewheel category bids
 */
function getExclusiveBids(bidsReceived) {
  let bids = bidsReceived
    .map((bid) => Object.assign({}, bid, {adServerCatId: bid.meta.adServerCatId}));
  bids = groupBy(bids, 'adServerCatId');
  let filteredBids = [];
  Object.keys(bids).forEach((adServerCatId) => {
    bids[adServerCatId].sort(compare);
    filteredBids.push(bids[adServerCatId][0]);
  });
  return filteredBids;
}

/**
 * This function returns bids for adpod adunits
 * @param {Array[Object]} bidsReceived
 * @param {Array[Object]} adPodAdUnits
 * @returns {Array[Object]} bids of mediaType adpod
 */
function getBidsForAdpod(bidsReceived, adPodAdUnits) {
  let adUnitCodes = adPodAdUnits.map((adUnit) => adUnit.code);
  return bidsReceived
    .filter((bid) => adUnitCodes.indexOf(bid.adUnitCode) != -1 && (bid.video && bid.video.context === ADPOD))
}

// initAdpodHooks();
registerVideoSupport('freewheel', {
  getTargeting: getTargeting
});

/**
 * This module adds Freewheel support for Video to Prebid.
 */

import { auctionManager } from '../../src/auctionManager';
import { groupBy, deepAccess, logError, compareOn } from '../../src/utils';
import { config } from '../../src/config';
import { ADPOD } from '../../src/mediaTypes';
import { TARGETING_KEY_PB_CAT_DUR, TARGETING_KEY_CACHE_ID, callPrebidCacheAfterAuction, sortByPricePerSecond } from '../adpod';

/**
 * This function returns targeting keyvalue pairs for freewheel adserver module
 * @param {Object} options
 * @param {Array[string]} codes
 * @param {function} callback
 * @returns targeting kvs for adUnitCodes
 */
export function getTargeting({codes, callback} = {}) {
  if (!callback) {
    logError('No callback function was defined in the getTargeting call.  Aborting getTargeting().');
    return;
  }
  codes = codes || [];
  const adPodAdUnits = getAdPodAdUnits(codes);
  const bidsReceived = auctionManager.getBidsReceived();
  const competiveExclusionEnabled = config.getConfig('adpod.brandCategoryExclusion');
  const deferCachingSetting = config.getConfig('adpod.deferCaching');
  const deferCachingEnabled = (typeof deferCachingSetting === 'boolean') ? deferCachingSetting : true;

  let bids = getBidsForAdpod(bidsReceived, adPodAdUnits);
  bids = (competiveExclusionEnabled || deferCachingEnabled) ? getExclusiveBids(bids) : bids;
  bids.sort(sortByPricePerSecond);

  let targeting = {};
  if (deferCachingEnabled === false) {
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

    callback(null, targeting);
  } else {
    let bidsToCache = [];
    adPodAdUnits.forEach((adUnit) => {
      let adPodDurationSeconds = deepAccess(adUnit, 'mediaTypes.video.adPodDurationSec');

      bids
        .filter((bid) => bid.adUnitCode === adUnit.code)
        .forEach((bid) => {
          if (bid.video.durationBucket <= adPodDurationSeconds) {
            bidsToCache.push(bid);
            adPodDurationSeconds -= bid.video.durationBucket;
          }
        });
    });

    callPrebidCacheAfterAuction(bidsToCache, function(error, bidsSuccessfullyCached) {
      if (error) {
        callback(error, null);
      } else {
        let groupedBids = groupBy(bidsSuccessfullyCached, 'adUnitCode');
        Object.keys(groupedBids).forEach((adUnitCode) => {
          let adPodTargeting = [];

          groupedBids[adUnitCode].forEach((bid, index, arr) => {
            adPodTargeting.push({
              [TARGETING_KEY_PB_CAT_DUR]: bid.adserverTargeting[TARGETING_KEY_PB_CAT_DUR]
            });

            if (index === arr.length - 1 && adPodTargeting.length > 0) {
              adPodTargeting.push({
                [TARGETING_KEY_CACHE_ID]: bid.adserverTargeting[TARGETING_KEY_CACHE_ID]
              });
            }
          });
          targeting[adUnitCode] = adPodTargeting;
        });

        callback(null, targeting);
      }
    });
  }
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

/**
 * This function removes bids of same freewheel category. It will be used when competitive exclusion is enabled.
 * @param {Array[Object]} bidsReceived
 * @returns {Array[Object]} unique freewheel category bids
 */
function getExclusiveBids(bidsReceived) {
  let bids = bidsReceived
    .map((bid) => Object.assign({}, bid, {[TARGETING_KEY_PB_CAT_DUR]: bid.adserverTargeting[TARGETING_KEY_PB_CAT_DUR]}));
  bids = groupBy(bids, TARGETING_KEY_PB_CAT_DUR);
  let filteredBids = [];
  Object.keys(bids).forEach((targetingKey) => {
    bids[targetingKey].sort(compareOn('responseTimestamp'));
    filteredBids.push(bids[targetingKey][0]);
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

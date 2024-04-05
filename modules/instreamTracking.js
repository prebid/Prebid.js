import { deepClone, getBidRequest, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { auctionManager } from '../src/auctionManager.js';
import { INSTREAM } from '../src/video.js';
import * as events from '../src/events.js';
import { EVENTS, TARGETING_KEYS, BID_STATUS } from '../src/constants.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').AdUnit} AdUnit
 */

const { CACHE_ID, UUID } = TARGETING_KEYS;
const { BID_WON, AUCTION_END } = EVENTS;
const { RENDERED } = BID_STATUS;

const INSTREAM_TRACKING_DEFAULT_CONFIG = {
  enabled: false,
  maxWindow: 1000 * 60, // the time in ms after which polling for instream delivery stops
  pollingFreq: 500 // the frequency of polling
};

// Set instreamTracking default values
config.setDefaults({
  'instreamTracking': deepClone(INSTREAM_TRACKING_DEFAULT_CONFIG)
});

const whitelistedResources = /video|fetch|xmlhttprequest|other/;

/**
 * Here the idea is
 * find all network entries via performance.getEntriesByType()
 * filter it by video cache key in the url
 * and exclude the ad server urls so that we dont match twice
 * eg:
 * dfp ads call: https://securepubads.g.doubleclick.net/gampad/ads?...hb_cache_id%3D55e85cd3-6ea4-4469-b890-84241816b131%26...
 * prebid cache url: https://prebid.adnxs.com/pbc/v1/cache?uuid=55e85cd3-6ea4-4469-b890-84241816b131
 *
 * if the entry exists, emit the BID_WON
 *
 * Note: this is a workaround till a better approach is engineered.
 *
 * @param {Array<AdUnit>} adUnits
 * @param {Array<Bid>} bidsReceived
 * @param {Array<BidRequest>} bidderRequests
 *
 * @return {boolean} returns TRUE if tracking started
 */
export function trackInstreamDeliveredImpressions({adUnits, bidsReceived, bidderRequests}) {
  const instreamTrackingConfig = config.getConfig('instreamTracking') || {};
  // check if instreamTracking is enabled and performance api is available
  if (!instreamTrackingConfig.enabled || !window.performance || !window.performance.getEntriesByType) {
    return false;
  }

  // filter for video bids
  const instreamBids = bidsReceived.filter(bid => {
    const bidderRequest = getBidRequest(bid.requestId, bidderRequests);
    return bidderRequest && deepAccess(bidderRequest, 'mediaTypes.video.context') === INSTREAM && bid.videoCacheKey;
  });
  if (!instreamBids.length) {
    return false;
  }

  // find unique instream ad units
  const instreamAdUnitMap = {};
  adUnits.forEach(adUnit => {
    if (!instreamAdUnitMap[adUnit.code] && deepAccess(adUnit, 'mediaTypes.video.context') === INSTREAM) {
      instreamAdUnitMap[adUnit.code] = true;
    }
  });
  const instreamAdUnitsCount = Object.keys(instreamAdUnitMap).length;

  const start = Date.now();
  const {maxWindow, pollingFreq, urlPattern} = instreamTrackingConfig;

  let instreamWinningBidsCount = 0;
  let lastRead = 0; // offset for performance.getEntriesByType

  function poll() {
    // get network entries using the last read offset
    const entries = window.performance.getEntriesByType('resource').splice(lastRead);
    for (const resource of entries) {
      const url = resource.name;
      // check if the resource is of whitelisted resource to avoid checking img or css or script urls
      if (!whitelistedResources.test(resource.initiatorType)) {
        continue;
      }

      instreamBids.forEach((bid) => {
        // match the video cache key excluding ad server call
        const matches = !(url.indexOf(CACHE_ID) !== -1 || url.indexOf(UUID) !== -1) && url.indexOf(bid.videoCacheKey) !== -1;
        if (urlPattern && urlPattern instanceof RegExp && !urlPattern.test(url)) {
          return;
        }
        if (matches && bid.status !== RENDERED) {
          // video found
          instreamWinningBidsCount++;
          auctionManager.addWinningBid(bid);
          events.emit(BID_WON, bid);
        }
      });
    }
    // update offset
    lastRead += entries.length;

    const timeElapsed = Date.now() - start;
    if (timeElapsed < maxWindow && instreamWinningBidsCount < instreamAdUnitsCount) {
      setTimeout(poll, pollingFreq);
    }
  }

  // start polling for network entries
  setTimeout(poll, pollingFreq);

  return true;
}

events.on(AUCTION_END, trackInstreamDeliveredImpressions)

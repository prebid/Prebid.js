import { deepClone, getBidRequest, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { auctionManager } from '../src/auctionManager.js';
import { INSTREAM } from '../src/video.js';
import * as events from '../src/events.js';
import { getGlobal } from '../src/prebidGlobal.js';
import CONSTANTS from '../src/constants.json'

const {BID_WON, AUCTION_END} = CONSTANTS.EVENTS;
const {RENDERED} = CONSTANTS.BID_STATUS;

const IMASDK_TRACKING_DEFAULT_CONFIG = {
  enabled: false,
  maxWindow: 1000 * 10, // the time in ms after which polling for instream delivery stops
  pollingFreq: 500 // the frequency of polling
};

// Set imasdkTracking default values
config.setDefaults({
  'imasdkTracking': deepClone(IMASDK_TRACKING_DEFAULT_CONFIG)
});

export function trackIMASDKDeliveredImpressions({adUnits, bidsReceived, bidderRequests}) {
  const imasdkTracking = config.getConfig('imasdkTracking') || {};

  if (!imasdkTracking.enabled || !window.google || !window.google.ima) {
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

  const start = Date.now();
  const {maxWindow, pollingFreq} = imasdkTracking;

  function poll() {
    const adIds = window.google.ima.__lads;
    if (adIds && adIds.length) {
      for (var i = 0; i < adIds.length; i++) {
        var adId = adIds[i];
        var bid = instreamBids.filter(e => e.creativeId === adId && e.status !== RENDERED);

        if (bid && bid.length) {
          bid[0].status = RENDERED;
          auctionManager.addWinningBid(bid[0]);
          events.emit(BID_WON, bid[0]);
          getGlobal().markWinningBidAsUsed(bid[0]);
          adIds.splice(i, 1);
        }
      }
    }

    const timeElapsed = Date.now() - start;
    if (timeElapsed < maxWindow) {
      setTimeout(poll, pollingFreq);
    }
  }

  setTimeout(poll, pollingFreq);

  return true;
}

events.on(AUCTION_END, trackIMASDKDeliveredImpressions)

import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepSetValue, logError, replaceAuctionPrice } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const GVLID = 30;
export const BIDDER_CODE = 'bidtheatre';
export const ENDPOINT_URL = 'https://client-bids.adsby.bidtheatre.com/prebidjsbid';
const METHOD = 'POST';
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
export const DEFAULT_CURRENCY = 'USD';
const BIDTHEATRE_COOKIE_NAME = '__kuid';
const storage = getStorageManager({bidderCode: BIDDER_CODE});

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 120,
    currency: DEFAULT_CURRENCY
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,
  isBidRequestValid: function (bidRequest) {
    const isValid = bidRequest &&
                    bidRequest.params &&
                    typeof bidRequest.params.publisherId === 'string' &&
                    bidRequest.params.publisherId.trim().length === 36

    if (!isValid) {
      logError('Bidtheatre Header Bidding Publisher ID not provided or in incorrect format');
    }

    return isValid;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const seenUrls = new Set();
    const syncs = [];

    if (syncOptions.pixelEnabled && serverResponses) {
      serverResponses.forEach(response => {
        if (response.body && response.body.seatbid) {
          response.body.seatbid.forEach(seatbid => {
            if (seatbid.bid) {
              seatbid.bid.forEach(bid => {
                const urls = bid.ext && bid.ext.usersync_urls;
                if (Array.isArray(urls)) {
                  urls.forEach(url => {
                    if (!seenUrls.has(url)) {
                      seenUrls.add(url);
                      syncs.push({
                        type: 'image',
                        url: url
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
    return syncs;
  },
  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({bidRequests, bidderRequest});

    const cookieValue = storage.getCookie(BIDTHEATRE_COOKIE_NAME);
    if (cookieValue) {
      deepSetValue(data, 'user.buyeruid', cookieValue);
    }

    data.imp.forEach((impObj, index) => {
      const publisherId = bidRequests[index].params.publisherId;

      if (publisherId) {
        deepSetValue(impObj, 'ext.bidder.publisherId', publisherId);
      }
    });

    return [{
      method: METHOD,
      url: ENDPOINT_URL,
      data
    }]
  },
  interpretResponse(response, request) {
    if (!response || !response.body || !response.body.seatbid) {
      return [];
    }

    const macroReplacedSeatbid = response.body.seatbid.map(seatbidItem => {
      const macroReplacedBid = seatbidItem.bid.map((bidItem) => ({
        ...bidItem,
        adm: replaceAuctionPrice(bidItem.adm, bidItem.price),
        nurl: replaceAuctionPrice(bidItem.nurl, bidItem.price)
      }));
      return { ...seatbidItem, bid: macroReplacedBid };
    });

    const macroReplacedResponseBody = { ...response.body, seatbid: macroReplacedSeatbid };
    const bids = converter.fromORTB({response: macroReplacedResponseBody, request: request.data}).bids;
    return bids;
  },
  onTimeout: function(timeoutData) {},
  onBidWon: function(bid) {},
  onSetTargeting: function(bid) {},
  // onBidderError: function({ error, bidderRequest }) {},
  onAdRenderSucceeded: function(bid) {}
}

registerBidder(spec);

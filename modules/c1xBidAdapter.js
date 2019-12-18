import { registerBidder } from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';
import { userSync } from '../src/userSync';

const BIDDER_CODE = 'c1x';
const URL = 'https://ht.c1exchange.com/ht';
const PIXEL_ENDPOINT = 'https://px.c1exchange.com/pubpixel/';
const LOG_MSG = {
  invalidBid: 'C1X: [ERROR] bidder returns an invalid bid',
  noSite: 'C1X: [ERROR] no site id supplied',
  noBid: 'C1X: [INFO] creating a NO bid for Adunit: ',
  bidWin: 'C1X: [INFO] creating a bid for Adunit: '
};

/**
 * Adapter for requesting bids from C1X header tag server.
 * v3.1 (c) C1X Inc., 2018
 */

export const c1xAdapter = {
  code: BIDDER_CODE,

  // check the bids sent to c1x bidder
  isBidRequestValid: function(bid) {
    const siteId = bid.params.siteId || '';
    if (!siteId) {
      utils.logError(LOG_MSG.noSite);
    }
    return !!(bid.adUnitCode && siteId);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    let payload = {};
    let tagObj = {};
    let pixelUrl = '';
    const adunits = bidRequests.length;
    const rnd = new Date().getTime();
    const c1xTags = bidRequests.map(bidToTag);
    const bidIdTags = bidRequests.map(bidToShortTag); // include only adUnitCode and bidId from request obj

    // flattened tags in a tag object
    tagObj = c1xTags.reduce((current, next) => Object.assign(current, next));
    const pixelId = tagObj.pixelId;

    payload = {
      adunits: adunits.toString(),
      rnd: rnd.toString(),
      response: 'json',
      compress: 'gzip'
    }

    // for GDPR support
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload['consent_string'] = bidderRequest.gdprConsent.consentString;
      payload['consent_required'] = (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies.toString() : 'true'
      ;
    }

    if (pixelId) {
      pixelUrl = PIXEL_ENDPOINT + pixelId;
      if (payload.consent_required) {
        pixelUrl += '&gdpr=' + (bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
        pixelUrl += '&consent=' + encodeURIComponent(bidderRequest.gdprConsent.consentString || '');
      }
      userSync.registerSync('image', BIDDER_CODE, pixelUrl);
    }

    Object.assign(payload, tagObj);

    let payloadString = stringifyPayload(payload);
    // ServerRequest object
    return {
      method: 'GET',
      url: URL,
      data: payloadString,
      bids: bidIdTags
    };
  },

  interpretResponse: function(serverResponse, requests) {
    serverResponse = serverResponse.body;
    requests = requests.bids || [];
    const currency = 'USD';
    const bidResponses = [];
    let netRevenue = false;

    if (!serverResponse || serverResponse.error) {
      let errorMessage = serverResponse.error;
      utils.logError(LOG_MSG.invalidBid + errorMessage);
      return bidResponses;
    } else {
      serverResponse.forEach(bid => {
        if (bid.bid) {
          if (bid.bidType === 'NET_BID') {
            netRevenue = !netRevenue;
          }
          const curBid = {
            width: bid.width,
            height: bid.height,
            cpm: bid.cpm,
            ad: bid.ad,
            creativeId: bid.crid,
            currency: currency,
            ttl: 300,
            netRevenue: netRevenue
          };

          for (let i = 0; i < requests.length; i++) {
            if (bid.adId === requests[i].adUnitCode) {
              curBid.requestId = requests[i].bidId;
            }
          }
          utils.logInfo(LOG_MSG.bidWin + bid.adId + ' size: ' + curBid.width + 'x' + curBid.height);
          bidResponses.push(curBid);
        } else {
          // no bid
          utils.logInfo(LOG_MSG.noBid + bid.adId);
        }
      });
    }

    return bidResponses;
  }
}

function bidToTag(bid, index) {
  const tag = {};
  const adIndex = 'a' + (index + 1).toString(); // ad unit id for c1x
  const sizeKey = adIndex + 's';
  const priceKey = adIndex + 'p';
  // TODO: Multiple Floor Prices

  const sizesArr = bid.sizes;
  const floorPriceMap = bid.params.floorPriceMap || '';
  tag['site'] = bid.params.siteId || '';

  // prevent pixelId becoming undefined when publishers don't fill this param in ad units they have on the same page
  if (bid.params.pixelId) {
    tag['pixelId'] = bid.params.pixelId
  }

  tag[adIndex] = bid.adUnitCode;
  tag[sizeKey] = sizesArr.reduce((prev, current) => prev + (prev === '' ? '' : ',') + current.join('x'), '');

  const newSizeArr = tag[sizeKey].split(',');
  if (floorPriceMap) {
    newSizeArr.forEach(size => {
      if (size in floorPriceMap) {
        tag[priceKey] = floorPriceMap[size].toString();
      } // we only accept one cpm price in floorPriceMap
    });
  }
  if (bid.params.pageurl) {
    tag['pageurl'] = bid.params.pageurl;
  }

  return tag;
}

function bidToShortTag(bid) {
  const tag = {};
  tag.adUnitCode = bid.adUnitCode;
  tag.bidId = bid.bidId;

  return tag;
}

function stringifyPayload(payload) {
  let payloadString = '';
  payloadString = JSON.stringify(payload).replace(/":"|","|{"|"}/g, (foundChar) => {
    if (foundChar == '":"') return '=';
    else if (foundChar == '","') return '&';
    else return '';
  });
  return payloadString;
}

registerBidder(c1xAdapter);

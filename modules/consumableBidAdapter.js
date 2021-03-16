import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'consumable';

const BASE_URI = 'https://e.serverbid.com/api/v2'

let siteId = 0;
let bidder = 'consumable';

export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.networkId && bid.params.siteId && bid.params.unitId && bid.params.unitName);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */

  buildRequests: function(validBidRequests, bidderRequest) {
    let ret = {
      method: 'POST',
      url: '',
      data: '',
      bidRequest: []
    };

    if (validBidRequests.length < 1) {
      return ret;
    }

    // These variables are used in creating the user sync URL.
    siteId = validBidRequests[0].params.siteId;
    bidder = validBidRequests[0].bidder;

    const data = Object.assign({
      placements: [],
      time: Date.now(),
      url: bidderRequest.refererInfo.referer,
      referrer: document.referrer,
      source: [{
        'name': 'prebidjs',
        'version': '$prebid.version$'
      }]
    }, validBidRequests[0].params);

    if (bidderRequest && bidderRequest.gdprConsent) {
      data.gdpr = {
        consent: bidderRequest.gdprConsent.consentString,
        applies: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      data.ccpa = bidderRequest.uspConsent;
    }

    validBidRequests.map(bid => {
      const sizes = (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) || bid.sizes || [];
      const placement = Object.assign({
        divName: bid.bidId,
        adTypes: bid.adTypes || getSize(sizes)
      }, bid.params);

      if (placement.networkId && placement.siteId && placement.unitId && placement.unitName) {
        data.placements.push(placement);
      }
    });

    ret.data = JSON.stringify(data);
    ret.bidRequest = validBidRequests;
    ret.bidderRequest = bidderRequest;
    ret.url = BASE_URI;

    return ret;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    let bid;
    let bids;
    let bidId;
    let bidObj;
    let bidResponses = [];

    bids = bidRequest.bidRequest;

    serverResponse = (serverResponse || {}).body;
    for (let i = 0; i < bids.length; i++) {
      bid = {};
      bidObj = bids[i];
      bidId = bidObj.bidId;

      if (serverResponse) {
        const decision = serverResponse.decisions && serverResponse.decisions[bidId];
        const price = decision && decision.pricing && decision.pricing.clearPrice;

        if (decision && price) {
          bid.requestId = bidId;
          bid.cpm = price;
          bid.width = decision.width;
          bid.height = decision.height;
          bid.unitId = bidObj.params.unitId;
          bid.unitName = bidObj.params.unitName;
          bid.ad = retrieveAd(decision, bid.unitId, bid.unitName);
          bid.currency = 'USD';
          bid.creativeId = decision.adId;
          bid.ttl = 30;
          bid.netRevenue = true;
          bid.referrer = bidRequest.bidderRequest.refererInfo.referer;

          bidResponses.push(bid);
        }
      }
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://sync.serverbid.com/ss/' + siteId + '.html'
      }];
    }

    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      return serverResponses[0].body.pixels;
    } else {
      utils.logWarn(bidder + ': Please enable iframe based user syncing.');
    }
  }
};

const sizeMap = [
  null,
  '120x90',
  '120x90',
  '468x60',
  '728x90',
  '300x250',
  '160x600',
  '120x600',
  '300x100',
  '180x150',
  '336x280',
  '240x400',
  '234x60',
  '88x31',
  '120x60',
  '120x240',
  '125x125',
  '220x250',
  '250x250',
  '250x90',
  '0x0',
  '200x90',
  '300x50',
  '320x50',
  '320x480',
  '185x185',
  '620x45',
  '300x125',
  '800x250'
];

sizeMap[77] = '970x90';
sizeMap[123] = '970x250';
sizeMap[43] = '300x600';
sizeMap[286] = '970x66';
sizeMap[3230] = '970x280';
sizeMap[429] = '486x60';
sizeMap[374] = '700x500';
sizeMap[934] = '300x1050';
sizeMap[1578] = '320x100';
sizeMap[331] = '320x250';
sizeMap[3301] = '320x267';
sizeMap[2730] = '728x250';

function getSize(sizes) {
  const result = [];
  sizes.forEach(function(size) {
    const index = sizeMap.indexOf(size[0] + 'x' + size[1]);
    if (index >= 0) {
      result.push(index);
    }
  });
  return result;
}

function retrieveAd(decision, unitId, unitName) {
  let ad = decision.contents && decision.contents[0] && decision.contents[0].body + utils.createTrackPixelHtml(decision.impressionUrl);

  return ad;
}

registerBidder(spec);

import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes';
import find from 'core-js/library/fn/array/find';

const BIDDER_CODE = 'zedo';
const URL = '//z2.zedo.com/asw/fmb.json';
const SECURE_URL = '//z2.zedo.com/asw/fmb.json';
const SIZE = {
  '300x250': 9,
  '160x600': 88,
  '640x480': 85 // TODO check for 1x1
};

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.channelCode);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests) {
    let data = {
      placements: []
    };
    bidRequests.map(bidRequest => {
      let channelCode = parseInt(bidRequest.params.channelCode);
      let network = parseInt(channelCode / 1000000);
      let channel = channelCode % 1000000;
      let dims = getSizes(bidRequest.sizes);
      let placement = {
        id: bidRequest.bidId,
        network: network,
        channel: channel,
        width: dims[0][0] ? dims[0][0] : 468,
        height: dims[0][1] ? dims[0][1] : 60,
        dimension: dims[0][2] ? dims[0][2] : 9, // TODO : check default
        version: '$prebid.version$',
        transactionId: bidRequest.transactionId
      }
      const videoMediaType = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}`);
      if (bidRequest.mediaType === VIDEO || videoMediaType) {
        placement['renderers'] = [{
          'name': 'Inarticle'
        }]
      } else {
        placement['renderers'] = [{
          'name': 'display'
        }]
      }
      data['placements'].push(placement);
    });
    let reqUrl = utils.getTopWindowLocation().protocol === 'http:' ? URL : SECURE_URL;
    return {
      method: 'GET',
      url: reqUrl,
      data: 'g=' + JSON.stringify(data)
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${request.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
      utils.logError(errorMessage);
      return bids;
    }

    if (serverResponse.ad) {
      serverResponse.ad.forEach(ad => {
        const creativeBid = getCreative(ad);
        if (creativeBid) {
          if (parseInt(creativeBid.cpm) !== 0) {
            const bid = newBid(ad, creativeBid, request);
            bid.mediaType = parseMediaType(creativeBid);
            bids.push(bid);
          }
        }
      });
    }
    return bids;
  },

  getUserSyncs: function (syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        // TODO implement user sync
      }];
    }
  }
};

function getCreative(ad) {
  return ad && ad.creatives && ad.creatives.length && find(ad.creatives, creative => creative.adId);
}
/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param rtbBid
 * @param bidderRequest
 * @return Bid
 */
function newBid(serverBid, creativeBid, bidderRequest) {
  const bid = {
    requestId: serverBid.slotId,
    cpm: creativeBid.cpm,
    creativeId: creativeBid.adId,
    dealId: 99999999,
    currency: 'USD',
    netRevenue: true,
    ttl: 300
  };

  if (creativeBid.creativeDetails.type === 'Vast') {
    Object.assign(bid, {
      width: creativeBid.width,
      height: creativeBid.height,
      vastXml: creativeBid.creativeDetails.adContent,
      ttl: 3600
    });
  } else {
    Object.assign(bid, {
      width: creativeBid.width,
      height: creativeBid.height,
      ad: creativeBid.creativeDetails.adContent
    });
  }

  return bid;
}
/* Turn bid request sizes into ut-compatible format */
function getSizes(requestSizes) {
  let dims = [];
  let sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    let dim = SIZE[sizeObj.width + 'x' + sizeObj.height];
    if (dim) {
      dims.push([sizeObj.width, sizeObj.height, dim]);
    }
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      let dim = SIZE[sizeObj.width + 'x' + sizeObj.height];
      dims.push([sizeObj.width, sizeObj.height, dim]);
    }
  }
  return dims;
}

function parseMediaType(rtbBid) {
  const adType = rtbBid.ad_type;
  if (adType === VIDEO) {
    return VIDEO;
  } else {
    return BANNER;
  }
}

registerBidder(spec);

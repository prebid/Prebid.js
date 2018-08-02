import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, VIDEO } from 'src/mediaTypes';
import find from 'core-js/library/fn/array/find';

const BIDDER_CODE = 'zedo';
const URL = '//z2.zedo.com/asw/fmb.json';
const SECURE_URL = '//z2.zedo.com/asw/fmb.json';
const DIM_TYPE = {
  '7': 'display',
  '9': 'display',
  '14': 'display',
  '70': 'SBR',
  '83': 'CurtainRaiser',
  '85': 'Inarticle',
  '86': 'pswipeup',
  '88': 'Inview',
  // '85': 'pre-mid-post-roll',
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
    return !!(bid.params && bid.params.channelCode && bid.params.dimId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    let data = {
      placements: []
    };
    bidRequests.map(bidRequest => {
      let channelCode = parseInt(bidRequest.params.channelCode);
      let network = parseInt(channelCode / 1000000);
      let channel = channelCode % 1000000;
      let dim = getSizes(bidRequest.sizes);
      let placement = {
        id: bidRequest.bidId,
        network: network,
        channel: channel,
        width: dim[0],
        height: dim[1],
        dimension: bidRequest.params.dimId,
        version: '$prebid.version$',
        keyword: '',
        transactionId: bidRequest.transactionId
      }
      if (bidderRequest && bidderRequest.gdprConsent) {
        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          data.gdpr = Number(bidderRequest.gdprConsent.gdprApplies);
        }
        data.gdpr_consent = bidderRequest.gdprConsent.consentString;
      }
      let dimType = DIM_TYPE[String(bidRequest.params.dimId)]
      if (dimType) {
        placement['renderers'] = [{
          'name': dimType
        }]
      } else { // default to display
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

  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (syncOptions.iframeEnabled) {
      let url = utils.getTopWindowLocation().protocol === 'http:' ? 'http://d3.zedo.com/rs/us/fcs.html' : 'https://tt3.zedo.com/rs/us/fcs.html';
      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          url += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          url += `?gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      return [{
        type: 'iframe',
        url: url
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
    creativeId: creativeBid.adId,
    dealId: 99999999,
    currency: 'USD',
    netRevenue: true,
    ttl: 300
  };

  if (creativeBid.creativeDetails.type === 'VAST') {
    Object.assign(bid, {
      width: creativeBid.width,
      height: creativeBid.height,
      vastXml: creativeBid.creativeDetails.adContent,
      cpm: (parseInt(creativeBid.cpm) * 0.65) / 1000000,
      ttl: 3600
    });
  } else {
    Object.assign(bid, {
      width: creativeBid.width,
      height: creativeBid.height,
      cpm: (parseInt(creativeBid.cpm) * 0.6) / 1000000,
      ad: creativeBid.creativeDetails.adContent
    });
  }

  return bid;
}
/* Turn bid request sizes into compatible format */
function getSizes(requestSizes) {
  let width = 0;
  let height = 0;
  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
    width = parseInt(requestSizes[0], 10);
    height = parseInt(requestSizes[1], 10);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      width = parseInt(size[0], 10);
      height = parseInt(size[1], 10);
      break;
    }
  }
  return [width, height];
}

function parseMediaType(creativeBid) {
  const adType = creativeBid.creativeDetails.type;
  if (adType === 'VAST') {
    return VIDEO;
  } else {
    return BANNER;
  }
}

registerBidder(spec);

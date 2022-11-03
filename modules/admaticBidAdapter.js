import { getValue, logError, deepAccess, getBidIdParameter, isArray } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const ENDPOINT_URL = 'https://layer.serve.admatic.com.tr/pb';
const SYNC_URL = 'https://cdn.serve.admatic.com.tr/showad/sync.js';
const BIDDER_CODE = 'admatic';

export const spec = {
  code: 'admatic',
  supportedMediaTypes: ['video', 'banner'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined') {
      let isValidNetworkId = _validateId(getValue(bid.params, 'networkId'));
      isValid = isValidNetworkId;// && isValidTypeId;
    }

    if (!isValid) {
      logError('AdMatic networkId parameters are required. Bid aborted.');
    }
    return isValid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(buildRequestObject);
    const networkId = getValue(validBidRequests[0].params, 'networkId');
    const currency = getValue(validBidRequests[0].params, 'currency') || 'TRY';

    setTimeout(() => {
      loadExternalScript(SYNC_URL, BIDDER_CODE);
    }, bidderRequest.timeout);

    const payload = {
      'user': {
        'ua': navigator.userAgent
      },
      'blacklist': [],
      'site': {
        'page': location.href,
        'ref': location.origin,
        'publisher': {
          'name': location.hostname,
          'publisherId': networkId
        }
      },
      imp: bids,
      ext: {
        'cur': currency,
        'type': 'admatic'
      }
    };

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
      options: {
        contentType: 'application/json'
      }
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (response, request) => {
    const body = response.body || response;
    const bidResponses = [];
    if (body.data.length > 0) {
      body.data.forEach(function (bid) {
        const resbid = {
          requestId: bid.id,
          cpm: bid.price,
          width: bid.width,
          height: bid.height,
          currency: body.cur,
          netRevenue: true,
          ad: bid.party_tag,
          creativeId: bid.creative_id,
          meta: {
            advertiserDomains: bid && bid.adomain ? bid.adomain : []
          },
          ttl: 360,
          bidder: 'admatic',
          timeToRespond: 1,
          requestTimestamp: 1
        };
        bidResponses.push(resbid);
      });
    };
    return bidResponses;
  }
};

function buildRequestObject(bid) {
  const reqObj = {};
  reqObj.size = getSizes(bid);
  reqObj.id = getBidIdParameter('bidId', bid);
  reqObj.floor = getValue(bid.params, 'floor') || 0.01;
  return reqObj;
}

function getSizes(bid) {
  return concatSizes(bid);
}

function concatSizes(bid) {
  let playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
  let videoSizes = deepAccess(bid, 'mediaTypes.video.sizes');
  let bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');

  if (isArray(bannerSizes) || isArray(playerSize) || isArray(videoSizes)) {
    let mediaTypesSizes = [bannerSizes, videoSizes, playerSize];
    return mediaTypesSizes
      .reduce(function(acc, currSize) {
        if (isArray(currSize)) {
          if (isArray(currSize[0])) {
            currSize.forEach(function (childSize) {
              acc.push({ w: childSize[0], h: childSize[1] });
            })
          }
        }
        return acc;
      }, []);
  }
}

function _validateId(id) {
  return (parseInt(id) > 0);
}

registerBidder(spec);

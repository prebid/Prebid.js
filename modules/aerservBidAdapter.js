import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes';

const BIDDER_CODE = 'aerserv';

const REQUIRED_PARAMS = ['plc'];

const ENVIRONMENTS = {
  dev: 'dev-ads.aerserv.com',
  stage: 'staging-ads.aerserv.com',
  prod: 'ads.aerserv.com',
};

const PATH = '/as/js/prebid/';

const VERSION = '1.0.0';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],

  /**
   * @param {object} bid the bid to validate
   * @returns {bool} true if valid, false otherwise
   */
  isBidRequestValid: function (bid) {
    return utils.hasValidBidRequest(bid.params, REQUIRED_PARAMS, BIDDER_CODE);
  },

  /**
   * @param {bidRequests[]} bidRequests the requests to build
   * @returns {Array} requests
   */
  buildRequests: function (bidRequests) {
    const referrer = utils.getTopWindowUrl();
    const requests = [];

    bidRequests.forEach(bid => {
      const env = ENVIRONMENTS[bid.params['env']] || ENVIRONMENTS['prod'];
      const parameterStr = buildQueryParameters(bid, {url: referrer});
      const type = getAdTypeOfBid(bid);

      requests.push({method: 'GET', url: `//${env}${PATH}${type}/${VERSION}?${parameterStr}`, bidRequest: bid});
    });

    return requests;
  },

  /**
   * @param {*} response The server response
   * @param request The original request
   * @returns {Bid[]} A single bid wrapped in an array.
   */
  interpretResponse: function (response, request) {
    const bidResponses = [];

    if (typeof response !== 'object' || response.error) {
      return bidResponses;
    }

    if (isValidResponse(response, request.bidRequest)) {
      const bidResponse = {
        requestId: request.bidRequest.bidId,
        bidderCode: spec.code,
        cpm: response.cpm || 0,
        width: response.width,
        height: response.height,
        ttl: response.ttl || 600,
        creativeId: response.creativeId,
        currency: response.currency || 'USD',
        netRevenue: response.netRevenue
      };

      switch (getAdTypeOfBid(request.bidRequest)) {
        case VIDEO:
          if (response.vastUrl) {
            bidResponse.vastUrl = response.vastUrl;
          } else {
            bidResponse.vastXml = response.vastXml;
          }
          break;

        default:
          bidResponse.ad = response.ad;
          break;
      }

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function (syncOptions) {
  }
};

function isValidResponse (response, bidRequest) {
  const adType = getAdTypeOfBid(bidRequest);
  return !response.error && response.cpm && response.width && response.height && response.creativeId &&
    ((adType === BANNER && response.ad) || (adType === VIDEO && (response.vastUrl || response.vastXml)));
}

function getFirstSize (sizes) {
  let sizeObj = {};
  if (utils.isArray(sizes) && sizes.length > 0 && utils.isArray(sizes[0]) && sizes[0].length === 2) {
    sizeObj['vpw'] = sizes[0][0];
    sizeObj['vph'] = sizes[0][1];
  }
  return sizeObj;
}

function buildQueryParameters (bid, requestParams) {
  Object.keys(bid.params).filter(param => param !== VIDEO && param !== 'env')
    .forEach(param => requestParams[param] = bid.params[param]);

  if (bid.mediaType === VIDEO) {
    let videoDimensions = getFirstSize(bid.sizes);
    Object.keys(videoDimensions).forEach(param => requestParams[param] = videoDimensions[param]);
    Object.keys(bid.params.video || {}).forEach(param => requestParams[param] = bid.params.video[param]);
  }

  return utils.parseQueryStringParameters(requestParams);
}

function getAdTypeOfBid (bid) {
  if ((bid.mediaType && bid.mediaType === VIDEO) || (typeof bid.mediaTypes === 'object' && VIDEO in bid.mediaTypes)) {
    return VIDEO;
  } else if ((bid.mediaType && bid.mediaType === NATIVE) || (typeof bid.mediaTypes === 'object' && NATIVE in bid.mediaTypes)) {
    return NATIVE;
  } else {
    return BANNER;
  }
}

registerBidder(spec);

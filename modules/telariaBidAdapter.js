import * as utils from '../src/utils.js';
import {createBid as createBidFactory} from '../src/bidfactory.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {VIDEO} from '../src/mediaTypes.js';
import {STATUS} from '../src/constants.json';

const BIDDER_CODE = 'telaria';
const DOMAIN = 'tremorhub.com';
const TAG_ENDPOINT = `ads.${DOMAIN}/ad/tag`;
const EVENTS_ENDPOINT = `events.${DOMAIN}/diag`;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['tremor', 'tremorvideo'],
  supportedMediaTypes: [VIDEO],
  /**
   * Determines if the request is valid
   * @param bid
   * @returns {*|string}
   */
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.adCode && bid.params.supplyCode);
  },

  /**
   * Make a server request from the list of BidRequests.
   * @param validBidRequests list of valid bid requests that have passed isBidRequestValid check
   * @param bidderRequest
   * @returns {Array} of url objects
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let requests = [];

    validBidRequests.forEach(bid => {
      let url = generateUrl(bid, bidderRequest);
      if (url) {
        requests.push({
          method: 'GET',
          url: url,
          bidId: bid.bidId,
          vastUrl: url.split('&fmt=json')[0]
        });
      }
    });

    return requests;
  },

  /**
   * convert the server response into a list of BidObjects that prebid accepts
   * http://prebid.org/dev-docs/bidder-adaptor.html#interpreting-the-response
   * @param serverResponse
   * @param bidderRequest
   * @returns {Array}
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    let bidResult;
    let width, height;

    let bids = [];

    try {
      bidResult = serverResponse.body;

      bidderRequest.url.split('&').forEach(param => {
        let lower = param.toLowerCase();
        if (lower.indexOf('player') > -1) {
          if (lower.indexOf('width') > -1) {
            width = param.split('=')[1];
          } else if (lower.indexOf('height') > -1) {
            height = param.split('=')[1];
          }
        }
      });
    } catch (error) {
      utils.logError(error);
      width = 0;
      height = 0;
    }

    if (!bidResult || bidResult.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (bidResult && bidResult.error) {
        errorMessage += `: ${bidResult.error}`;
      }
      utils.logError(errorMessage);
    } else if (!utils.isEmpty(bidResult.seatbid)) {
      bidResult.seatbid[0].bid.forEach(tag => {
        bids.push(createBid(STATUS.GOOD, bidderRequest, tag, width, height, BIDDER_CODE));
      });
    }

    return bids;
  },
  /**
   * We support pixel syncing only at the moment. Telaria ad server returns 'ext'
   * as an optional parameter if the tag has 'incIdSync' parameter set to true
   * @param syncOptions
   * @param serverResponses
   * @returns {Array}
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.pixelEnabled && serverResponses.length) {
      (utils.deepAccess(serverResponses, '0.body.ext.telaria.userSync') || []).forEach(url => syncs.push({type: 'image', url: url}));
    }
    return syncs;
  },

  /**
   * See http://prebid.org/dev-docs/bidder-adaptor.html#registering-on-timeout for detailed semantic.
   * @param timeoutData bidRequest
   */
  onTimeout: function (timeoutData) {
    let url = getTimeoutUrl(timeoutData);
    if (url) {
      utils.triggerPixel(url);
    }
  }
};

function getDefaultSrcPageUrl() {
  return encodeURIComponent(document.location.href);
}

function getEncodedValIfNotEmpty(val) {
  return !utils.isEmpty(val) ? encodeURIComponent(val) : '';
}

/**
 * Converts the schain object to a url param value. Please refer to
 * https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md
 * (schain for non ORTB section) for more information
 * @param schainObject
 * @returns {string}
 */
function getSupplyChainAsUrlParam(schainObject) {
  if (utils.isEmpty(schainObject)) {
    return '';
  }

  let scStr = `&schain=${schainObject.ver},${schainObject.complete}`;

  schainObject.nodes.forEach((node) => {
    scStr += '!';
    scStr += `${getEncodedValIfNotEmpty(node.asi)},`;
    scStr += `${getEncodedValIfNotEmpty(node.sid)},`;
    scStr += `${getEncodedValIfNotEmpty(node.hp)},`;
    scStr += `${getEncodedValIfNotEmpty(node.rid)},`;
    scStr += `${getEncodedValIfNotEmpty(node.name)},`;
    scStr += `${getEncodedValIfNotEmpty(node.domain)}`;
  });

  return scStr;
}

function getUrlParams(params, schainFromBidRequest) {
  let urlSuffix = '';

  if (!utils.isEmpty(params)) {
    for (let key in params) {
      if (key !== 'schain' && params.hasOwnProperty(key) && !utils.isEmpty(params[key])) {
        urlSuffix += `&${key}=${params[key]}`;
      }
    }
    urlSuffix += getSupplyChainAsUrlParam(!utils.isEmpty(schainFromBidRequest) ? schainFromBidRequest : params['schain']);
  }

  return urlSuffix;
}

export const getTimeoutUrl = function(timeoutData) {
  let params = utils.deepAccess(timeoutData, '0.params.0');

  if (!utils.isEmpty(params)) {
    let url = `https://${EVENTS_ENDPOINT}`;

    params = Object.assign({
      srcPageUrl: getDefaultSrcPageUrl()
    }, params);

    url += `${getUrlParams(params)}`;

    url += '&hb=1&evt=TO';

    return url;
  }
};

/**
 * Generates the url based on the parameters given. Sizes, supplyCode & adCode are required.
 * The format is: [L,W] or [[L1,W1],...]
 * @param bid
 * @param bidderRequest
 * @returns {string}
 */
function generateUrl(bid, bidderRequest) {
  let playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  if (!playerSize) {
    utils.logWarn(`Although player size isn't required it is highly recommended`);
  }

  let width, height;
  if (playerSize) {
    if (utils.isArray(playerSize) && (playerSize.length === 2) && (!isNaN(playerSize[0]) && !isNaN(playerSize[1]))) {
      width = playerSize[0];
      height = playerSize[1];
    } else if (typeof playerSize === 'object') {
      width = playerSize[0][0];
      height = playerSize[0][1];
    }
  }

  let supplyCode = utils.deepAccess(bid, 'params.supplyCode');
  let adCode = utils.deepAccess(bid, 'params.adCode');

  if (supplyCode && adCode) {
    let url = `https://${supplyCode}.${TAG_ENDPOINT}?adCode=${adCode}`;

    if (width) {
      url += (`&playerWidth=${width}`);
    }
    if (height) {
      url += (`&playerHeight=${height}`);
    }

    const params = Object.assign({
      srcPageUrl: getDefaultSrcPageUrl()
    }, bid.params);
    delete params.adCode;

    url += `${getUrlParams(params, bid.schain)}`;

    url += (`&transactionId=${bid.transactionId}`);

    if (bidderRequest) {
      if (bidderRequest.gdprConsent) {
        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          url += (`&gdpr=${(bidderRequest.gdprConsent.gdprApplies ? 1 : 0)}`);
        }
        if (bidderRequest.gdprConsent.consentString) {
          url += (`&gdpr_consent=${bidderRequest.gdprConsent.consentString}`);
        }
      }

      if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
        url += (`&referrer=${encodeURIComponent(bidderRequest.refererInfo.referer)}`);
      }
    }

    return (url + '&hb=1&fmt=json');
  }
}

/**
 * Create and return a bid object based on status and tag
 * @param status
 * @param reqBid
 * @param response
 * @param width
 * @param height
 * @param bidderCode
 */
function createBid(status, reqBid, response, width, height, bidderCode) {
  let bid = createBidFactory(status, reqBid);

  // TTL 5 mins by default, future support for extended imp wait time
  if (response) {
    Object.assign(bid, {
      requestId: reqBid.bidId,
      cpm: response.price,
      creativeId: response.crid || '-1',
      vastXml: response.adm,
      vastUrl: reqBid.vastUrl,
      mediaType: 'video',
      width: width,
      height: height,
      bidderCode: bidderCode,
      adId: response.id,
      currency: 'USD',
      netRevenue: true,
      ttl: 300,
      ad: response.adm
    });
  }

  bid.meta = bid.meta || {};
  if (response && response.adomain && response.adomain.length > 0) {
    bid.meta.advertiserDomains = response.adomain;
  }

  return bid;
}

registerBidder(spec);

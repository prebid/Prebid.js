import * as utils from '../src/utils';
import { BANNER } from '../src/mediaTypes';
import { config } from '../src/config';
import isInteger from 'core-js/library/fn/number/is-integer';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'ix';
const BANNER_SECURE_BID_URL = 'https://as-sec.casalemedia.com/cygnus';
const BANNER_INSECURE_BID_URL = 'http://as.casalemedia.com/cygnus';
const SUPPORTED_AD_TYPES = [BANNER];
const ENDPOINT_VERSION = 7.2;
const CENT_TO_DOLLAR_FACTOR = 100;
const TIME_TO_LIVE = 35;
const NET_REVENUE = true;
const PRICE_TO_DOLLAR_FACTOR = {
  JPY: 1
};

/**
 * Transform valid bid request config object to impression object that will be sent to ad server.
 *
 * @param  {object} bid A valid bid request config object.
 * @return {object}     A impression object that will be sent to ad server.
 */
function bidToBannerImp(bid) {
  const imp = {};

  imp.id = bid.bidId;

  imp.banner = {};
  imp.banner.w = bid.params.size[0];
  imp.banner.h = bid.params.size[1];
  imp.banner.topframe = utils.inIframe() ? 0 : 1;

  imp.ext = {};
  imp.ext.siteID = bid.params.siteId;

  if (bid.params.hasOwnProperty('id') &&
    (typeof bid.params.id === 'string' || typeof bid.params.id === 'number')) {
    imp.ext.sid = String(bid.params.id);
  } else {
    imp.ext.sid = `${bid.params.size[0]}x${bid.params.size[1]}`;
  }

  if (bid.params.hasOwnProperty('bidFloor') && bid.params.hasOwnProperty('bidFloorCur')) {
    imp.bidfloor = bid.params.bidFloor;
    imp.bidfloorcur = bid.params.bidFloorCur;
  }

  return imp;
}

/**
 * Parses a raw bid for the relevant information.
 *
 * @param  {object} rawBid   The bid to be parsed.
 * @param  {string} currency Global currency in bid response.
 * @return {object} bid      The parsed bid.
 */
function parseBid(rawBid, currency) {
  const bid = {};

  if (PRICE_TO_DOLLAR_FACTOR.hasOwnProperty(currency)) {
    bid.cpm = rawBid.price / PRICE_TO_DOLLAR_FACTOR[currency];
  } else {
    bid.cpm = rawBid.price / CENT_TO_DOLLAR_FACTOR;
  }

  bid.requestId = rawBid.impid;
  bid.width = rawBid.w;
  bid.height = rawBid.h;
  bid.ad = rawBid.adm;
  bid.dealId = utils.deepAccess(rawBid, 'ext.dealid');
  bid.ttl = TIME_TO_LIVE;
  bid.netRevenue = NET_REVENUE;
  bid.currency = currency;
  bid.creativeId = rawBid.hasOwnProperty('crid') ? rawBid.crid : '-';

  bid.meta = {};
  bid.meta.networkId = utils.deepAccess(rawBid, 'ext.dspid');
  bid.meta.brandId = utils.deepAccess(rawBid, 'ext.advbrandid');
  bid.meta.brandName = utils.deepAccess(rawBid, 'ext.advbrand');

  return bid;
}

/**
 * Determines whether or not the given object is valid size format.
 *
 * @param  {*}       size The object to be validated.
 * @return {boolean}      True if this is a valid size format, and false otherwise.
 */
function isValidSize(size) {
  return Array.isArray(size) && size.length === 2 && isInteger(size[0]) && isInteger(size[1]);
}

/**
 * Determines whether or not the given size object is an element of the size
 * array.
 *
 * @param  {array}  sizeArray The size array.
 * @param  {object} size      The size object.
 * @return {boolean}          True if the size object is an element of the size array, and false
 *                            otherwise.
 */
function includesSize(sizeArray, size) {
  if (isValidSize(sizeArray)) {
    return sizeArray[0] === size[0] && sizeArray[1] === size[1];
  }

  for (let i = 0; i < sizeArray.length; i++) {
    if (sizeArray[i][0] === size[0] && sizeArray[i][1] === size[1]) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether or not the given bidFloor parameters are valid.
 *
 * @param  {*}       bidFloor    The bidFloor parameter inside bid request config.
 * @param  {*}       bidFloorCur The bidFloorCur parameter inside bid request config.
 * @return {boolean}             True if this is a valid biFfloor parameters format, and false
 *                               otherwise.
 */
function isValidBidFloorParams(bidFloor, bidFloorCur) {
  const curRegex = /^[A-Z]{3}$/;

  return Boolean(typeof bidFloor === 'number' && typeof bidFloorCur === 'string' &&
    bidFloorCur.match(curRegex));
}

export const spec = {

  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param  {object}  bid The bid to validate.
   * @return {boolean}     True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!isValidSize(bid.params.size)) {
      return false;
    }

    if (!includesSize(bid.sizes, bid.params.size)) {
      return false;
    }

    if (bid.hasOwnProperty('mediaType') && bid.mediaType !== 'banner') {
      return false;
    }

    if (bid.hasOwnProperty('mediaTypes') && !utils.deepAccess(bid, 'mediaTypes.banner.sizes')) {
      return false;
    }

    if (typeof bid.params.siteId !== 'string' && typeof bid.params.siteId !== 'number') {
      return false;
    }

    const hasBidFloor = bid.params.hasOwnProperty('bidFloor');
    const hasBidFloorCur = bid.params.hasOwnProperty('bidFloorCur');

    if (hasBidFloor || hasBidFloorCur) {
      return hasBidFloor && hasBidFloorCur &&
        isValidBidFloorParams(bid.params.bidFloor, bid.params.bidFloorCur);
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param  {array}  validBidRequests A list of valid bid request config objects.
   * @param  {object} options          A object contains bids and other info like gdprConsent.
   * @return {object}                  Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, options) {
    const bannerImps = [];
    const userEids = [];
    let validBidRequest = null;
    let bannerImp = null;

    // Always start by assuming the protocol is HTTPS. This way, it will work
    // whether the page protocol is HTTP or HTTPS. Then check if the page is
    // actually HTTP.If we can guarantee it is, then, and only then, set protocol to
    // HTTP.
    let baseUrl = BANNER_SECURE_BID_URL;

    for (let i = 0; i < validBidRequests.length; i++) {
      validBidRequest = validBidRequests[i];

      // Transform the bid request based on the banner format.
      bannerImp = bidToBannerImp(validBidRequest);
      bannerImps.push(bannerImp);
    }

    // RTI ids will be included in the bid request if the function getIdentityInfo() is loaded
    // and if the data for the partner exist
    if (window.headertag && typeof window.headertag.getIdentityInfo === 'function') {
      let identityInfo = window.headertag.getIdentityInfo();
      if (identityInfo && typeof identityInfo === 'object') {
        for (const partnerName in identityInfo) {
          if (identityInfo.hasOwnProperty(partnerName)) {
            let response = identityInfo[partnerName];
            if (!response.responsePending && response.data && typeof response.data === 'object' && Object.keys(response.data).length) {
              userEids.push(response.data);
            }
          }
        }
      }
    }
    const r = {};

    // Since bidderRequestId are the same for different bid request, just use the first one.
    r.id = validBidRequests[0].bidderRequestId;

    r.imp = bannerImps;
    r.site = {};
    r.ext = {};
    r.ext.source = 'prebid';
    if (userEids.length > 0) {
      r.user = {};
      r.user.eids = userEids;
    }

    if (document.referrer && document.referrer !== '') {
      r.site.ref = document.referrer;
    }

    // Apply GDPR information to the request if GDPR is enabled.
    if (options) {
      if (options.gdprConsent) {
        const gdprConsent = options.gdprConsent;

        if (gdprConsent.hasOwnProperty('gdprApplies')) {
          r.regs = {
            ext: {
              gdpr: gdprConsent.gdprApplies ? 1 : 0
            }
          };
        }

        if (gdprConsent.hasOwnProperty('consentString')) {
          r.user = r.user || {};
          r.user.ext = {
            consent: gdprConsent.consentString || ''
          };
        }
      }

      if (options.refererInfo) {
        r.site.page = options.refererInfo.referer;

        if (options.refererInfo.referer && options.refererInfo.referer.indexOf('https') !== 0) {
          baseUrl = BANNER_INSECURE_BID_URL;
        }
      }
    }

    const payload = {};

    // Parse additional runtime configs.
    const otherIxConfig = config.getConfig('ix');
    if (otherIxConfig) {
      // Append firstPartyData to r.site.page if firstPartyData exists.
      if (typeof otherIxConfig.firstPartyData === 'object') {
        const firstPartyData = otherIxConfig.firstPartyData;
        let firstPartyString = '?';
        for (const key in firstPartyData) {
          if (firstPartyData.hasOwnProperty(key)) {
            firstPartyString += `${encodeURIComponent(key)}=${encodeURIComponent(firstPartyData[key])}&`;
          }
        }
        firstPartyString = firstPartyString.slice(0, -1);

        r.site.page += firstPartyString;
      }

      // Create t in payload if timeout is configured.
      if (typeof otherIxConfig.timeout === 'number') {
        payload.t = otherIxConfig.timeout;
      }
    }

    // Use the siteId in the first bid request as the main siteId.
    payload.s = validBidRequests[0].params.siteId;

    payload.v = ENDPOINT_VERSION;
    payload.r = JSON.stringify(r);
    payload.ac = 'j';
    payload.sd = 1;

    return {
      method: 'GET',
      url: baseUrl,
      data: payload
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param  {object} serverResponse A successful response from the server.
   * @return {array}                 An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse) {
    const bids = [];
    let bid = null;

    if (!serverResponse.hasOwnProperty('body') || !serverResponse.body.hasOwnProperty('seatbid')) {
      return bids;
    }

    const responseBody = serverResponse.body;
    const seatbid = responseBody.seatbid;
    for (let i = 0; i < seatbid.length; i++) {
      if (!seatbid[i].hasOwnProperty('bid')) {
        continue;
      }

      // Transform rawBid in bid response to the format that will be accepted by prebid.
      const innerBids = seatbid[i].bid;
      for (let j = 0; j < innerBids.length; j++) {
        bid = parseBid(innerBids[j], responseBody.cur);
        bids.push(bid);
      }
    }

    return bids;
  },

  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */
  transformBidParams: function(params, isOpenRtb) {
    return utils.convertTypes({
      'siteID': 'number'
    }, params);
  }
};

registerBidder(spec);

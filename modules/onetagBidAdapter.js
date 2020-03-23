'use strict';

import { BANNER, VIDEO } from '../src/mediaTypes.js';
const { registerBidder } = require('../src/adapters/bidderFactory.js');

const ENDPOINT = 'https://onetag-sys.com/prebid-request';
const USER_SYNC_ENDPOINT = 'https://onetag-sys.com/usync/';
const BIDDER_CODE = 'onetag';

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(bid) {
  if (typeof bid === 'undefined' || typeof bid.params === 'undefined' || typeof bid.params.pubId !== 'string') {
    return false;
  }
  return isValid(BANNER, bid) || isValid(VIDEO, bid);
}

export function hasTypeVideo(bid) {
  return typeof bid.mediaTypes !== 'undefined' && typeof bid.mediaTypes.video !== 'undefined';
}

export function isValid(type, bid) {
  if (type === BANNER) {
    return parseSizes(bid).length > 0;
  } else if (type === VIDEO && hasTypeVideo(bid)) {
    const context = bid.mediaTypes.video.context;
    if (context === 'outstream') {
      return parseVideoSize(bid).length > 0 && typeof bid.renderer !== 'undefined' && typeof bid.renderer.render !== 'undefined' && typeof bid.renderer.url !== 'undefined';
    } else if (context === 'instream') {
      return parseVideoSize(bid).length > 0;
    }
  }
  return false;
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @param {validBidRequests[]} - an array of bids
 * @return ServerRequest Info describing the request to the server.
 */

function buildRequests(validBidRequests, bidderRequest) {
  const bids = requestsToBids(validBidRequests);
  const bidObject = {'bids': bids};
  const pageInfo = getPageInfo();

  const payload = Object.assign(bidObject, pageInfo);

  if (bidderRequest && bidderRequest.gdprConsent) {
    payload.gdprConsent = {
      consentString: bidderRequest.gdprConsent.consentString,
      consentRequired: bidderRequest.gdprConsent.gdprApplies
    };
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    payload.usPrivacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.userId) {
    payload.userId = bidderRequest.userId;
  }

  const payloadString = JSON.stringify(payload);

  return {
    method: 'POST',
    url: ENDPOINT,
    data: payloadString
  }
}

function interpretResponse(serverResponse, request) {
  let body = serverResponse.body;
  const bids = [];

  if (typeof serverResponse === 'string') {
    try {
      body = JSON.parse(serverResponse);
    } catch (e) {
      return bids;
    }
  }

  if (!body || (body.nobid && body.nobid === true)) {
    return bids;
  }
  if (!body.bids || !Array.isArray(body.bids) || body.bids.length === 0) {
    return bids;
  }

  body.bids.forEach(function(bid) {
    let responseBid = {
      requestId: bid.requestId,
      cpm: bid.cpm,
      width: bid.width,
      height: bid.height,
      creativeId: bid.creativeId,
      dealId: bid.dealId ? bid.dealId : '',
      currency: bid.currency,
      netRevenue: false,
      mediaType: bid.mediaType,
      ttl: bid.ttl || 300
    };

    if (bid.mediaType === BANNER) {
      responseBid.ad = bid.ad;
    } else if (bid.mediaType === VIDEO) {
      responseBid.vastXml = bid.ad;
    }

    bids.push(responseBid);
  });

  return bids;
}

/**
 * Returns information about the page needed by the server in an object to be converted in JSON
 * @returns {{location: *, referrer: (*|string), masked: *, wWidth: (*|Number), wHeight: (*|Number), sWidth, sHeight, date: string, timeOffset: number}}
 */
function getPageInfo() {
  let w, d, l, r, m, p, e, t, s;
  for (w = window, d = w.document, l = d.location.href, r = d.referrer, m = 0, e = encodeURIComponent, t = new Date(), s = screen; w !== w.parent;) {
    try {
      p = w.parent; l = p.location.href; r = p.document.referrer; w = p;
    } catch (e) {
      m = top !== w.parent ? 2 : 1;
      break
    }
  }
  let isDocHidden;
  let xOffset;
  let yOffset;
  try {
    if (typeof w.document.hidden !== 'undefined') {
      isDocHidden = w.document.hidden;
    } else if (typeof w.document['msHidden'] !== 'undefined') {
      isDocHidden = w.document['msHidden'];
    } else if (typeof w.document['webkitHidden'] !== 'undefined') {
      isDocHidden = w.document['webkitHidden'];
    } else {
      isDocHidden = null;
    }
  } catch (e) {
    isDocHidden = null;
  }
  try {
    xOffset = w.pageXOffset;
    yOffset = w.pageYOffset;
  } catch (e) {
    xOffset = null;
    yOffset = null;
  }
  return {
    location: e(l),
    referrer: e(r) || '0',
    masked: m,
    wWidth: w.innerWidth,
    wHeight: w.innerHeight,
    oWidth: w.outerWidth,
    oHeight: w.outerHeight,
    sWidth: s.width,
    sHeight: s.height,
    aWidth: s.availWidth,
    aHeight: s.availHeight,
    sLeft: 'screenLeft' in w ? w.screenLeft : w.screenX,
    sTop: 'screenTop' in w ? w.screenTop : w.screenY,
    xOffset: xOffset,
    yOffset: yOffset,
    docHidden: isDocHidden,
    hLength: history.length,
    date: t.toUTCString(),
    timeOffset: t.getTimezoneOffset()
  };
}

function requestsToBids(bidRequests) {
  const videoBidRequests = bidRequests.filter(bidRequest => hasTypeVideo(bidRequest)).map(bidRequest => {
    const videoObj = {};
    setGeneralInfo.call(videoObj, bidRequest);
    // Pass parameters
    // Context: instream - outstream - adpod
    videoObj['context'] = bidRequest.mediaTypes.video.context;
    // MIME Video Types
    videoObj['mimes'] = bidRequest.mediaTypes.video.mimes;
    // Sizes
    videoObj['playerSize'] = parseVideoSize(bidRequest);
    // Other params
    videoObj['protocols'] = bidRequest.mediaTypes.video.protocols;
    videoObj['maxDuration'] = bidRequest.mediaTypes.video.maxduration;
    videoObj['api'] = bidRequest.mediaTypes.video.api;
    videoObj['type'] = VIDEO;
    return videoObj;
  });
  const bannerBidRequests = bidRequests.filter(bidRequest => isValid(BANNER, bidRequest)).map(bidRequest => {
    const bannerObj = {};
    setGeneralInfo.call(bannerObj, bidRequest);
    bannerObj['sizes'] = parseSizes(bidRequest);
    bannerObj['type'] = BANNER;
    return bannerObj;
  });
  return videoBidRequests.concat(bannerBidRequests);
}

function setGeneralInfo(bidRequest) {
  const params = bidRequest.params;
  this['adUnitCode'] = bidRequest.adUnitCode;
  this['bidId'] = bidRequest.bidId;
  this['bidderRequestId'] = bidRequest.bidderRequestId;
  this['auctionId'] = bidRequest.auctionId;
  this['transactionId'] = bidRequest.transactionId;
  this['pubId'] = params.pubId;
  if (params.pubClick) {
    this['click'] = params.pubClick;
  }
  if (params.dealId) {
    this['dealId'] = params.dealId;
  }
}

function parseVideoSize(bid) {
  const playerSize = bid.mediaTypes.video.playerSize;
  if (typeof playerSize !== 'undefined' && Array.isArray(playerSize) && playerSize.length > 0) {
    return getSizes(playerSize)
  }
  return [];
}

function parseSizes(bid) {
  let ret = [];
  if (typeof bid.mediaTypes !== 'undefined' && typeof bid.mediaTypes.banner !== 'undefined' && typeof bid.mediaTypes.banner.sizes !== 'undefined' && Array.isArray(bid.mediaTypes.banner.sizes) && bid.mediaTypes.banner.sizes.length > 0) {
    return getSizes(bid.mediaTypes.banner.sizes)
  }
  const isVideoBidRequest = hasTypeVideo(bid);
  if (!isVideoBidRequest && bid.sizes && Array.isArray(bid.sizes)) {
    return getSizes(bid.sizes);
  }
  return ret;
}

function getSizes(sizes) {
  const ret = [];
  for (let i = 0, lenght = sizes.length; i < lenght; i++) {
    const size = sizes[i];
    ret.push({width: size[0], height: size[1]})
  }
  return ret;
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  const syncs = [];
  if (syncOptions.iframeEnabled) {
    const rnd = new Date().getTime();
    let params = '?cb=' + rnd;

    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      params += '&gdpr_consent=' + gdprConsent.consentString;
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      }
    }

    if (uspConsent && typeof uspConsent === 'string') {
      params += '&us_privacy=' + uspConsent;
    }

    syncs.push({
      type: 'iframe',
      url: USER_SYNC_ENDPOINT + params
    });
  }
  return syncs;
}

export const spec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs

};

// Starting point
registerBidder(spec);

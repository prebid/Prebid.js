import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {parseSizesInput, isFn, deepAccess, getBidIdParameter, logError, isArray} from '../src/utils.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const CUR = 'USD';
const BIDDER_CODE = 'lm_kiviads';
const ENDPOINT = 'https://pbjs.kiviads.live';

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return boolean True  if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(req) {
  if (req && typeof req.params !== 'object') {
    logError('Params is not defined or is incorrect in the bidder settings');
    return false;
  }

  if (!getBidIdParameter('env', req.params) || !getBidIdParameter('pid', req.params)) {
    logError('Env or pid is not present in bidder params');
    return false;
  }

  if (deepAccess(req, 'mediaTypes.video') && !isArray(deepAccess(req, 'mediaTypes.video.playerSize'))) {
    logError('mediaTypes.video.playerSize is required for video');
    return false;
  }

  return true;
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @param {validBidRequest?pbjs_debug=trues[]} - an array of bids
 * @return ServerRequest Info describing the request to the server.
 */
function buildRequests(validBidRequests, bidderRequest) {
  const {refererInfo = {}, gdprConsent = {}, uspConsent} = bidderRequest;
  const requests = validBidRequests.map(req => {
    const request = {};
    request.bidId = req.bidId;
    request.banner = deepAccess(req, 'mediaTypes.banner');
    request.auctionId = req.ortb2?.source?.tid;
    request.transactionId = req.ortb2Imp?.ext?.tid;
    request.sizes = parseSizesInput(getAdUnitSizes(req));
    request.schain = req.schain;
    request.location = {
      page: refererInfo.page,
      location: refererInfo.location,
      domain: refererInfo.domain,
      whost: window.location.host,
      ref: refererInfo.ref,
      isAmp: refererInfo.isAmp
    };
    request.device = {
      ua: navigator.userAgent,
      lang: navigator.language
    };
    request.env = {
      env: req.params.env,
      pid: req.params.pid
    };
    request.ortb2 = req.ortb2;
    request.ortb2Imp = req.ortb2Imp;
    request.tz = new Date().getTimezoneOffset();
    request.ext = req.params.ext;
    request.bc = req.bidRequestsCount;
    request.floor = getBidFloor(req);

    if (req.userIdAsEids && req.userIdAsEids.length !== 0) {
      request.userEids = req.userIdAsEids;
    } else {
      request.userEids = [];
    }
    if (gdprConsent.gdprApplies) {
      request.gdprApplies = Number(gdprConsent.gdprApplies);
      request.consentString = gdprConsent.consentString;
    } else {
      request.gdprApplies = 0;
      request.consentString = '';
    }
    if (uspConsent) {
      request.usPrivacy = uspConsent;
    } else {
      request.usPrivacy = '';
    }
    if (config.getConfig('coppa')) {
      request.coppa = 1;
    } else {
      request.coppa = 0;
    }

    const video = deepAccess(req, 'mediaTypes.video');
    if (video) {
      request.sizes = parseSizesInput(deepAccess(req, 'mediaTypes.video.playerSize'));
      request.video = video;
    }

    return request;
  });

  return {
    method: 'POST',
    url: ENDPOINT + '/bid',
    data: JSON.stringify(requests),
    withCredentials: true,
    bidderRequest,
    options: {
      contentType: 'application/json',
    }
  };
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {ServerResponse} serverResponse A successful response from the server.
 * @return {Bid[]} An array of bids which were nested inside the server.
 */
function interpretResponse(serverResponse, {bidderRequest}) {
  const response = [];
  if (!isArray(deepAccess(serverResponse, 'body.data'))) {
    return response;
  }

  serverResponse.body.data.forEach(serverBid => {
    const bid = {
      requestId: bidderRequest.bidId,
      dealId: bidderRequest.dealId || null,
      ...serverBid
    };
    response.push(bid);
  });

  return response;
}

/**
 * Register the user sync pixels which should be dropped after the auction.
 *
 * @param {SyncOptions} syncOptions Which user syncs are allowed?
 * @param {ServerResponse[]} serverResponses List of server's responses.
 * @return {UserSync[]} The user syncs which should be dropped.
 */
function getUserSyncs(syncOptions, serverResponses, gdprConsent = {}, uspConsent = '') {
  const syncs = [];
  const pixels = deepAccess(serverResponses, '0.body.data.0.ext.pixels');

  if ((syncOptions.iframeEnabled || syncOptions.pixelEnabled) && isArray(pixels) && pixels.length !== 0) {
    const gdprFlag = `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}`;
    const gdprString = `&gdpr_consent=${encodeURIComponent((gdprConsent.consentString || ''))}`;
    const usPrivacy = `us_privacy=${encodeURIComponent(uspConsent)}`;

    pixels.forEach(pixel => {
      const [type, url] = pixel;
      const sync = {type, url: `${url}&${usPrivacy}${gdprFlag}${gdprString}`};
      if (type === 'iframe' && syncOptions.iframeEnabled) {
        syncs.push(sync)
      } else if (type === 'image' && syncOptions.pixelEnabled) {
        syncs.push(sync)
      }
    });
  }

  return syncs;
}

/**
 * Get valid floor value from getFloor fuction.
 *
 * @param {Object} bid Current bid request.
 * @return {null|Number} Returns floor value when bid.getFloor is function and returns valid floor object with USD currency, otherwise returns null.
 */
export function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return null;
  }

  let floor = bid.getFloor({
    currency: CUR,
    mediaType: '*',
    size: '*'
  });

  if (typeof floor === 'object' && !isNaN(floor.floor) && floor.currency === CUR) {
    return floor.floor;
  }

  return null;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['kivi'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);

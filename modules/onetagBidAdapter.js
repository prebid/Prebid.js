'use strict';

import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { INSTREAM, OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';
import find from 'core-js-pure/features/array/find.js';
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
    if (context === 'outstream' || context === 'instream') {
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
  const payload = {
    bids: requestsToBids(validBidRequests),
    ...getPageInfo()
  };
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
  if (window.localStorage) {
    payload.onetagSid = window.localStorage.getItem('onetag_sid');
  }
  const payloadString = JSON.stringify(payload);
  return {
    method: 'POST',
    url: ENDPOINT,
    data: payloadString
  }
}

function interpretResponse(serverResponse, bidderRequest) {
  const body = serverResponse.body;
  const bids = [];
  const requestData = JSON.parse(bidderRequest.data);
  if (!body || (body.nobid && body.nobid === true)) {
    return bids;
  }
  if (!body.bids || !Array.isArray(body.bids) || body.bids.length === 0) {
    return bids;
  }
  body.bids.forEach(({
    requestId,
    cpm,
    width,
    height,
    creativeId,
    dealId,
    currency,
    mediaType,
    ttl,
    rendererUrl,
    ad,
    vastUrl,
    videoCacheKey
  }) => {
    const responseBid = {
      requestId,
      cpm,
      width,
      height,
      creativeId,
      dealId: dealId == null ? dealId : '',
      currency,
      netRevenue: false,
      mediaType,
      ttl: ttl || 300
    };
    if (mediaType === BANNER) {
      responseBid.ad = ad;
    } else if (mediaType === VIDEO) {
      const {context, adUnitCode} = find(requestData.bids, (item) => item.bidId === requestId);
      if (context === INSTREAM) {
        responseBid.vastUrl = vastUrl;
        responseBid.videoCacheKey = videoCacheKey;
      } else if (context === OUTSTREAM) {
        responseBid.vastXml = ad;
        responseBid.vastUrl = vastUrl;
        if (rendererUrl) {
          responseBid.renderer = createRenderer({requestId, rendererUrl, adUnitCode});
        }
      }
    }
    bids.push(responseBid);
  });
  return bids;
}

function createRenderer(bid, rendererOptions = {}) {
  const renderer = Renderer.install({
    id: bid.requestId,
    url: bid.rendererUrl,
    config: rendererOptions,
    adUnitCode: bid.adUnitCode,
    loaded: false
  });
  try {
    renderer.setRender(onetagRenderer);
  } catch (e) {

  }
  return renderer;
}

function onetagRenderer({renderer, width, height, vastXml, adUnitCode}) {
  renderer.push(() => {
    window.onetag.Player.init({
      width,
      height,
      vastXml,
      nodeId: adUnitCode,
      config: renderer.getConfig()
    });
  });
}

function getFrameNesting() {
  let frame = window;
  try {
    while (frame !== frame.top) {
      // eslint-disable-next-line no-unused-expressions
      frame.location.href;
      frame = frame.parent;
    }
  } catch (e) {}
  return {
    topmostFrame: frame,
    currentFrameNesting: frame.top === frame ? 1 : 2
  }
}

function getDocumentVisibility(window) {
  try {
    if (typeof window.document.hidden !== 'undefined') {
      return window.document.hidden;
    } else if (typeof window.document['msHidden'] !== 'undefined') {
      return window.document['msHidden'];
    } else if (typeof window.document['webkitHidden'] !== 'undefined') {
      return window.document['webkitHidden'];
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Returns information about the page needed by the server in an object to be converted in JSON
 * @returns {{location: *, referrer: (*|string), masked: *, wWidth: (*|Number), wHeight: (*|Number), sWidth, sHeight, date: string, timeOffset: number}}
 */
function getPageInfo() {
  const { topmostFrame, currentFrameNesting } = getFrameNesting();
  return {
    location: encodeURIComponent(topmostFrame.location.href),
    referrer: encodeURIComponent(topmostFrame.document.referrer) || '0',
    masked: currentFrameNesting,
    wWidth: topmostFrame.innerWidth,
    wHeight: topmostFrame.innerHeight,
    oWidth: topmostFrame.outerWidth,
    oHeight: topmostFrame.outerHeight,
    sWidth: topmostFrame.screen.width,
    sHeight: topmostFrame.screen.height,
    aWidth: topmostFrame.screen.availWidth,
    aHeight: topmostFrame.screen.availHeight,
    sLeft: 'screenLeft' in topmostFrame ? topmostFrame.screenLeft : topmostFrame.screenX,
    sTop: 'screenTop' in topmostFrame ? topmostFrame.screenTop : topmostFrame.screenY,
    xOffset: topmostFrame.pageXOffset,
    yOffset: topmostFrame.pageYOffset,
    docHidden: getDocumentVisibility(topmostFrame),
    docHeight: topmostFrame.document.body ? topmostFrame.document.body.scrollHeight : null,
    hLength: history.length,
    timing: getTiming()
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
  const coords = getSpaceCoords(bidRequest.adUnitCode);
  if (coords) {
    this['coords'] = coords;
  }
}

function getSpaceCoords(id) {
  const space = document.getElementById(id);
  try {
    const { top, left, width, height } = space.getBoundingClientRect();
    let window = space.ownerDocument.defaultView;
    const coords = { top: top + window.pageYOffset, left: left + window.pageXOffset, width, height };
    let frame = window.frameElement;
    while (frame != null) {
      const { top, left } = frame.getBoundingClientRect();
      coords.top += top + window.pageYOffset;
      coords.left += left + window.pageXOffset;
      window = window.parent;
      frame = window.frameElement;
    }
    return coords;
  } catch (e) {
    return null;
  }
}

function getTiming() {
  try {
    if (window.performance != null && window.performance.timing != null) {
      const timing = {};
      const perf = window.performance.timing;
      timing.pageLoadTime = perf.loadEventEnd - perf.navigationStart;
      timing.connectTime = perf.responseEnd - perf.requestStart;
      timing.renderTime = perf.domComplete - perf.domLoading;
      return timing;
    }
  } catch (e) {
    return null;
  }
  return null;
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
  let syncs = [];
  let params = '';
  if (gdprConsent && typeof gdprConsent.consentString === 'string') {
    params += '&gdpr_consent=' + gdprConsent.consentString;
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      params += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
    }
  }
  if (uspConsent && typeof uspConsent === 'string') {
    params += '&us_privacy=' + uspConsent;
  }
  if (syncOptions.iframeEnabled) {
    const rnd = new Date().getTime();
    params = '?cb=' + rnd + params;

    syncs.push({
      type: 'iframe',
      url: USER_SYNC_ENDPOINT + params
    });
  }
  if (syncOptions.pixelEnabled) {
    syncs.push({
      type: 'image',
      url: USER_SYNC_ENDPOINT + '?tag=img' + params
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

registerBidder(spec);

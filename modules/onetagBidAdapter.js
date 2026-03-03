'use strict';

import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { INSTREAM, OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepClone, logError, deepAccess, getWinDimensions } from '../src/utils.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { toOrtbNativeRequest } from '../src/native.js';
import { getConnectionInfo } from '../libraries/connectionInfo/connectionUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const ENDPOINT = 'https://onetag-sys.com/prebid-request';
const USER_SYNC_ENDPOINT = 'https://onetag-sys.com/usync/';
const BIDDER_CODE = 'onetag';
const GVLID = 241;
const NATIVE_SUFFIX = 'Ad';

const storage = getStorageManager({ bidderCode: BIDDER_CODE });

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
  return isValid(BANNER, bid) || isValid(VIDEO, bid) || isValid(NATIVE, bid);
}

export function hasTypeVideo(bid) {
  return typeof bid.mediaTypes !== 'undefined' && typeof bid.mediaTypes.video !== 'undefined';
}

export function hasTypeNative(bid) {
  return typeof bid.mediaTypes !== 'undefined' && typeof bid.mediaTypes.native !== 'undefined';
}

export function isValid(type, bid) {
  if (type === BANNER) {
    return parseSizes(bid).length > 0;
  } else if (type === VIDEO && hasTypeVideo(bid)) {
    const context = bid.mediaTypes.video.context;
    if (context === 'outstream' || context === 'instream') {
      return parseVideoSize(bid).length > 0;
    }
  } else if (type === NATIVE) {
    if (typeof bid.mediaTypes.native !== 'object' || bid.mediaTypes.native === null) return false;
    if (!isNativeOrtbVersion(bid)) {
      if (bid.nativeParams === undefined) return false;
      const ortbConversion = toOrtbNativeRequest(bid.nativeParams);
      return ortbConversion && ortbConversion.assets && Array.isArray(ortbConversion.assets) && ortbConversion.assets.length > 0 && ortbConversion.assets.every(asset => isValidAsset(asset));
    }

    let isValidAssets = false;
    let isValidEventTrackers = false;

    const assets = bid.mediaTypes.native?.ortb?.assets;
    const eventTrackers = bid.mediaTypes.native?.ortb?.eventtrackers;

    if (assets && Array.isArray(assets) && assets.length > 0 && assets.every(asset => isValidAsset(asset))) {
      isValidAssets = true;
    }

    if (eventTrackers && Array.isArray(eventTrackers) && eventTrackers.length > 0) {
      if (eventTrackers.every(eventTracker => isValidEventTracker(eventTracker))) {
        isValidEventTrackers = true;
      }
    } else if (!eventTrackers) {
      isValidEventTrackers = true;
    }
    return isValidAssets && isValidEventTrackers;
  }
  return false;
}

const isValidEventTracker = function (et) {
  if (!et.event || !et.methods || !Number.isInteger(et.event) || !Array.isArray(et.methods) || !et.methods.length > 0) {
    return false;
  }
  return true;
}

const isValidAsset = function (asset) {
  if (!asset.hasOwnProperty("id") || !Number.isInteger(asset.id)) return false;
  const hasValidContent = asset.title || asset.img || asset.data || asset.video;
  if (!hasValidContent) return false;
  if (asset.title && (!asset.title.len || !Number.isInteger(asset.title.len))) return false;
  if (asset.data && (!asset.data.type || !Number.isInteger(asset.data.type))) return false;
  if (asset.video && (!asset.video.mimes || !asset.video.minduration || !asset.video.maxduration || !asset.video.protocols)) return false;
  return true;
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @param {Array<Object>} validBidRequests - an array of bids
 * @param bidderRequest
 * @return ServerRequest Info describing the request to the server.
 */
function buildRequests(validBidRequests, bidderRequest) {
  const payload = {
    bids: requestsToBids(validBidRequests),
    ...getPageInfo(bidderRequest)
  };
  if (bidderRequest && bidderRequest.gdprConsent) {
    payload.gdprConsent = {
      consentString: bidderRequest.gdprConsent.consentString,
      consentRequired: bidderRequest.gdprConsent.gdprApplies,
      addtlConsent: bidderRequest.gdprConsent.addtlConsent
    };
  }
  if (bidderRequest && bidderRequest.gppConsent) {
    payload.gppConsent = {
      consentString: bidderRequest.gppConsent.gppString,
      applicableSections: bidderRequest.gppConsent.applicableSections
    }
  }
  if (bidderRequest && bidderRequest.uspConsent) {
    payload.usPrivacy = bidderRequest.uspConsent;
  }
  if (bidderRequest && bidderRequest.ortb2) {
    payload.ortb2 = bidderRequest.ortb2;
  }
  if (validBidRequests && validBidRequests.length !== 0 && validBidRequests[0].userIdAsEids) {
    payload.userId = validBidRequests[0].userIdAsEids;
  }
  const schain = validBidRequests?.[0]?.ortb2?.source?.ext?.schain;
  if (validBidRequests && validBidRequests.length !== 0 && schain && isSchainValid(schain)) {
    payload.schain = schain;
  }
  try {
    if (storage.hasLocalStorage()) {
      payload.onetagSid = storage.getDataFromLocalStorage('onetag_sid');
    }
  } catch (e) { }
  const connection = getConnectionInfo();
  payload.networkConnectionType = connection?.type || null;
  payload.networkEffectiveConnectionType = connection?.effectiveType || null;
  payload.fledgeEnabled = Boolean(bidderRequest?.paapi?.enabled)
  return {
    method: 'POST',
    url: ENDPOINT,
    data: JSON.stringify(payload)
  }
}

function interpretResponse(serverResponse, bidderRequest) {
  const body = serverResponse.body;
  const bids = [];
  const requestData = JSON.parse(bidderRequest.data);
  if (!body || (body.nobid && body.nobid === true)) {
    return bids;
  }
  if (!body.fledgeAuctionConfigs && (!body.bids || !Array.isArray(body.bids) || body.bids.length === 0)) {
    return bids;
  }
  Array.isArray(body.bids) && body.bids.forEach(bid => {
    const responseBid = {
      requestId: bid.requestId,
      cpm: bid.cpm,
      width: bid.width,
      height: bid.height,
      creativeId: bid.creativeId,
      dealId: bid.dealId == null ? bid.dealId : '',
      currency: bid.currency,
      netRevenue: bid.netRevenue || false,
      mediaType: (bid.mediaType === NATIVE + NATIVE_SUFFIX) ? NATIVE : bid.mediaType,
      meta: {
        mediaType: bid.mediaType,
        advertiserDomains: bid.adomain
      },
      ttl: bid.ttl || 300
    };
    if (bid.dsa) {
      responseBid.meta.dsa = bid.dsa;
    }
    if (bid.mediaType === BANNER) {
      responseBid.ad = bid.ad;
    } else if (bid.mediaType === VIDEO) {
      const { context, adUnitCode } = ((requestData.bids) || []).find((item) =>
        item.bidId === bid.requestId &&
        item.type === VIDEO
      );
      if (context === INSTREAM) {
        responseBid.vastUrl = bid.vastUrl;
        responseBid.videoCacheKey = bid.videoCacheKey;
      } else if (context === OUTSTREAM) {
        responseBid.vastXml = bid.ad;
        responseBid.vastUrl = bid.vastUrl;
        if (bid.rendererUrl) {
          responseBid.renderer = createRenderer({ ...bid, adUnitCode });
        }
      }
    } else if (bid.mediaType === NATIVE || bid.mediaType === NATIVE + NATIVE_SUFFIX) {
      responseBid.native = bid.native;
    }
    bids.push(responseBid);
  });

  if (body.fledgeAuctionConfigs && Array.isArray(body.fledgeAuctionConfigs)) {
    const fledgeAuctionConfigs = body.fledgeAuctionConfigs
    return {
      bids,
      paapi: fledgeAuctionConfigs
    }
  } else {
    return bids;
  }
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
    renderer.setRender(({ renderer, width, height, vastXml, adUnitCode }) => {
      renderer.push(() => {
        window.onetag.Player.init({
          ...bid,
          width,
          height,
          vastXml,
          nodeId: adUnitCode,
          config: renderer.getConfig()
        });
      });
    });
  } catch (e) {

  }
  return renderer;
}

function getFrameNesting() {
  let topmostFrame = window;
  let parent = window.parent;
  try {
    while (topmostFrame !== topmostFrame.parent) {
      parent = topmostFrame.parent;
      // eslint-disable-next-line no-unused-expressions
      parent.location.href;
      topmostFrame = topmostFrame.parent;
    }
  } catch (e) { }
  return topmostFrame;
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
 * @returns {{location: *, referrer: (*|string), stack: (*|Array.<String>), numIframes: (*|Number), wWidth: (*|Number), wHeight: (*|Number), sWidth, sHeight, date: string, timeOffset: number}}
 */
function getPageInfo(bidderRequest) {
  const winDimensions = getWinDimensions();
  const topmostFrame = getFrameNesting();
  return {
    location: deepAccess(bidderRequest, 'refererInfo.page', null),
    referrer: deepAccess(bidderRequest, 'refererInfo.ref', null),
    stack: deepAccess(bidderRequest, 'refererInfo.stack', []),
    numIframes: deepAccess(bidderRequest, 'refererInfo.numIframes', 0),
    wWidth: winDimensions.innerWidth,
    wHeight: winDimensions.innerHeight,
    sWidth: winDimensions.screen.width,
    sHeight: winDimensions.screen.height,
    xOffset: topmostFrame.pageXOffset,
    yOffset: topmostFrame.pageYOffset,
    docHidden: getDocumentVisibility(topmostFrame),
    docHeight: topmostFrame.document.body ? topmostFrame.document.body.scrollHeight : null,
    hLength: history.length,
    timing: getTiming(),
    version: {
      prebid: '$prebid.version$',
      adapter: '1.1.6'
    }
  };
}

function requestsToBids(bidRequests) {
  const videoBidRequests = bidRequests.filter(bidRequest => hasTypeVideo(bidRequest)).map(bidRequest => {
    const videoObj = {};
    setGeneralInfo.call(videoObj, bidRequest);
    // Pass parameters
    // Context: instream - outstream - adpod
    videoObj['context'] = bidRequest.mediaTypes.video.context;
    // Sizes
    videoObj['playerSize'] = parseVideoSize(bidRequest);
    // Other params
    videoObj['mediaTypeInfo'] = deepClone(bidRequest.mediaTypes.video);
    videoObj['type'] = VIDEO;
    videoObj['priceFloors'] = getBidFloor(bidRequest, VIDEO, videoObj['playerSize']);
    return videoObj;
  });
  const bannerBidRequests = bidRequests.filter(bidRequest => isValid(BANNER, bidRequest)).map(bidRequest => {
    const bannerObj = {};
    setGeneralInfo.call(bannerObj, bidRequest);
    bannerObj['sizes'] = parseSizes(bidRequest);
    bannerObj['type'] = BANNER;
    bannerObj['mediaTypeInfo'] = deepClone(bidRequest.mediaTypes.banner);
    bannerObj['priceFloors'] = getBidFloor(bidRequest, BANNER, bannerObj['sizes']);
    return bannerObj;
  });
  const nativeBidRequests = bidRequests.filter(bidRequest => isValid(NATIVE, bidRequest)).map(bidRequest => {
    const nativeObj = {};
    setGeneralInfo.call(nativeObj, bidRequest);
    nativeObj['sizes'] = parseSizes(bidRequest);
    nativeObj['type'] = NATIVE + NATIVE_SUFFIX;
    nativeObj['mediaTypeInfo'] = deepClone(bidRequest.mediaTypes.native);
    if (!isNativeOrtbVersion(bidRequest)) {
      const ortbConversion = toOrtbNativeRequest(bidRequest.nativeParams);
      nativeObj['mediaTypeInfo'] = {};
      nativeObj['mediaTypeInfo'].adTemplate = bidRequest.nativeParams.adTemplate;
      nativeObj['mediaTypeInfo'].ortb = ortbConversion;
    }
    nativeObj['priceFloors'] = getBidFloor(bidRequest, NATIVE, nativeObj['sizes']);
    return nativeObj;
  });
  return videoBidRequests.concat(bannerBidRequests).concat(nativeBidRequests);
}

function isNativeOrtbVersion(bidRequest) {
  return bidRequest.mediaTypes.native.ortb && typeof bidRequest.mediaTypes.native.ortb === 'object';
}

function setGeneralInfo(bidRequest) {
  const params = bidRequest.params;
  this['adUnitCode'] = bidRequest.adUnitCode;
  this['bidId'] = bidRequest.bidId;
  this['bidderRequestId'] = bidRequest.bidderRequestId;
  this['auctionId'] = deepAccess(bidRequest, 'ortb2.source.tid');
  this['transactionId'] = deepAccess(bidRequest, 'ortb2Imp.ext.tid');
  this['gpid'] = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
  this['pubId'] = params.pubId;
  this['ext'] = params.ext;
  this['ortb2Imp'] = deepAccess(bidRequest, 'ortb2Imp');
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
    const { top, left, width, height } = getBoundingClientRect(space);
    let window = space.ownerDocument.defaultView;
    const coords = { top: top + window.pageYOffset, left: left + window.pageXOffset, width, height };
    let frame = window.frameElement;
    while (frame != null) {
      const { top, left } = getBoundingClientRect(frame);
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
  const ret = [];
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
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    ret.push({ width: size[0], height: size[1] })
  }
  return ret;
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  const syncs = [];
  let params = '';
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      params += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
    }
    if (typeof gdprConsent.consentString === 'string') {
      params += '&gdpr_consent=' + gdprConsent.consentString;
    }
  }
  if (gppConsent) {
    if (typeof gppConsent.gppString === 'string') {
      params += '&gpp_consent=' + gppConsent.gppString;
    }
  }
  if (uspConsent && typeof uspConsent === 'string') {
    params += '&us_privacy=' + uspConsent;
  }
  if (syncOptions.iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: USER_SYNC_ENDPOINT + '?cb=' + new Date().getTime() + params
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

function getBidFloor(bidRequest, mediaType, sizes) {
  if (typeof bidRequest.getFloor !== 'function') return [];
  const getFloorObject = (size) => {
    const floorData = bidRequest.getFloor({
      currency: 'EUR',
      mediaType: mediaType || '*',
      size: size || null
    }) || {};

    return {
      ...floorData,
      size: size && size.length === 2 ? { width: size[0], height: size[1] } : null,
      floor: floorData.floor != null ? floorData.floor : null
    };
  };

  if (Array.isArray(sizes) && sizes.length > 0) {
    return sizes.map(size => getFloorObject([size.width, size.height]));
  } return [getFloorObject(null)];
}

export function isSchainValid(schain) {
  let isValid = false;
  const requiredFields = ['asi', 'sid', 'hp'];
  if (!schain || !schain.nodes) return isValid;
  isValid = schain.nodes.reduce((status, node) => {
    if (!status) return status;
    return requiredFields.every(field => node.hasOwnProperty(field));
  }, true);
  if (!isValid) {
    logError('OneTag: required schain params missing');
  }
  return isValid;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs

};

registerBidder(spec);

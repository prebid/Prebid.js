import { deepAccess, deepSetValue, logInfo } from '../../src/utils.js';
import {Renderer} from '../../src/Renderer.js';
import { getCurrencyFromBidderRequest } from '../ortb2Utils/currency.js';
import { INSTREAM, OUTSTREAM } from '../../src/video.js';
import { BANNER, NATIVE } from '../../src/mediaTypes.js';

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

/**
 * Register the user sync pixels which should be dropped after the auction.
 *
 /**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 *
 */

/**
 * Register the user sync pixels which should be dropped after the auction.
 *
 * @param {SyncOptions} syncOptions Which user syncs are allowed?
 * @param {ServerResponse[]} serverResponses List of server's responses.
 * @return {UserSync[]} The user syncs which should be dropped.
 */
export function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  if (typeof serverResponses === 'object' &&
  serverResponses != null &&
  serverResponses.length > 0 &&
  serverResponses[0].hasOwnProperty('body') &&
  serverResponses[0].body.hasOwnProperty('ext') &&
  serverResponses[0].body.ext.hasOwnProperty('cookies') &&
  typeof serverResponses[0].body.ext.cookies === 'object') {
    return serverResponses[0].body.ext.cookies.slice(0, 5);
  } else {
    return [];
  }
};

function outstreamRender(response) {
  response.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [response.width, response.height],
      targetId: response.divId,
      adResponse: response.vastXml,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        showVolume: false,
        allowFullscreen: true,
        skippable: false,
        content: response.vastXml
      }
    });
  });
};

export function createRenderer(bid, url) {
  const renderer = Renderer.install({
    id: bid.id,
    url: url,
    loaded: false,
    adUnitCode: bid.ext.adUnitCode,
    targetId: bid.ext.divId,
  });
  renderer.setRender(outstreamRender);
  return renderer;
};

export function enrichImp(imp, bidRequest) {
  deepSetValue(imp, 'tagid', bidRequest.adUnitCode);
  deepSetValue(imp, 'ext.adUnitCode', bidRequest.adUnitCode);
  const divId = bidRequest.params.divId || bidRequest.adUnitCode;
  deepSetValue(imp, 'ext.divId', divId);
  if (imp.video) {
    const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    deepSetValue(imp, 'video.ext.playerSize', playerSize);
    deepSetValue(imp, 'video.ext.context', videoContext);
  }
  return imp;
}

export function enrichRequest(request, amxId, bidderRequest, pageViewId, bidderVersion) {
  if (amxId) {
    deepSetValue(request, 'ext.localStorage.amxId', amxId);
    if (!request.user) request.user = {};
    if (!request.user.ext) request.user.ext = {};
    if (!request.user.ext.eids) request.user.ext.eids = [];
    request.user.ext.eids.push({
      source: 'amxdt.net',
      uids: [{
        id: `${amxId}`,
        atype: 1
      }]
    });
  }
  deepSetValue(request, 'ext.version', '$prebid.version$');
  deepSetValue(request, 'ext.source', 'prebid.js');
  deepSetValue(request, 'ext.pageViewId', pageViewId);
  deepSetValue(request, 'ext.bidderVersion', bidderVersion);
  deepSetValue(request, 'cur', [getCurrencyFromBidderRequest(bidderRequest) || 'USD']);
  if (!request.user) request.user = {};
  return request;
};

export function createResponse(bid, respBody) {
  const response = {
    requestId: bid.impid,
    cpm: bid.price,
    width: bid.w,
    height: bid.h,
    creativeId: bid.crid,
    currency: respBody.cur,
    netRevenue: true,
    ttl: 120,
    mediaType: [OUTSTREAM, INSTREAM].includes(bid.ext.mediaType) ? 'video' : bid.ext.mediaType,
    meta: {
      advertiserDomains: bid.adomain,
      demandSource: bid.ext.ssp,
    },
  };
  if (bid.dealid) response.dealid = bid.dealid;

  if (bid.ext.mediaType === BANNER) response.ad = bid.adm;
  if ([INSTREAM, OUTSTREAM].includes(bid.ext.mediaType)) response.vastXml = bid.adm;

  if (bid.ext.mediaType === OUTSTREAM) {
    response.renderer = createRenderer(bid, OUTSTREAM_RENDERER_URL);
    if (bid.ext.divId) response.divId = bid.ext.divId
  };

  if (bid.ext.mediaType === NATIVE) {
    try {
      response.native = { ortb: JSON.parse(bid.adm) }
    } catch (e) {}
  }
  return response;
}

/**
 * Get the AMX ID
 * @return { string | false } false if localstorageNotEnabled
 */
export function getAmxId(storage, bidderCode) {
  if (!storage.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for ${bidderCode}`);
    return false;
  }
  const amxId = storage.getDataFromLocalStorage('__amuidpb');
  return amxId || false;
}

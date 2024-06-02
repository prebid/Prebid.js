import {config} from '../src/config.js';
import { deepAccess, deepSetValue, generateUUID, logError, logInfo } from '../src/utils.js';
import {Renderer} from '../src/Renderer.js';
import {getStorageManager} from '../src/storageManager.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import { INSTREAM, OUTSTREAM } from '../src/video.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

const BIDDER_CODE = 'nexx360';
const REQUEST_URL = 'https://fast.nexx360.io/booster';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '4.1';
const GVLID = 965;
const NEXXID_KEY = 'nexx360_storage';

const ALIASES = [
  { code: 'revenuemaker' },
  { code: 'first-id', gvlid: 1178 },
  { code: 'adwebone' },
  { code: 'league-m', gvlid: 965 },
  { code: 'prjads' },
  { code: 'pubtech' },
];

export const storage = getStorageManager({
  bidderCode: BIDDER_CODE,
});

/**
 * Get the NexxId
 * @param
 * @return {object | false } false if localstorageNotEnabled
 */

export function getNexx360LocalStorage() {
  if (!storage.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for Nexx360`);
    return false;
  }
  const output = storage.getDataFromLocalStorage(NEXXID_KEY);
  if (output === null) {
    const nexx360Storage = { nexx360Id: generateUUID() };
    storage.setDataInLocalStorage(NEXXID_KEY, JSON.stringify(nexx360Storage));
    return nexx360Storage;
  }
  try {
    return JSON.parse(output)
  } catch (e) {
    return false;
  }
}

function getAdContainer(container) {
  if (document.getElementById(container)) {
    return document.getElementById(container);
  }
}

/**
 * Get the AMX ID
 * @return {string | false } false if localstorageNotEnabled
 */
export function getAmxId() {
  if (!storage.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for Nexx360`);
    return false;
  }
  const amxId = storage.getDataFromLocalStorage('__amuidpb');
  return amxId || false;
}

const converter = ortbConverter({
  context: {
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 90, // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  imp(buildImp, bidRequest, context) {
    // console.log(bidRequest, context);
    const imp = buildImp(bidRequest, context);
    const tagid = bidRequest.params.adUnitName ? bidRequest.params.adUnitName : bidRequest.adUnitCode;
    deepSetValue(imp, 'tagid', tagid);
    deepSetValue(imp, 'ext.adUnitCode', bidRequest.adUnitCode);
    const divId = bidRequest.params.divId ? bidRequest.params.divId : bidRequest.adUnitCode;
    deepSetValue(imp, 'ext.divId', divId);
    const slotEl = getAdContainer(divId);
    if (slotEl) {
      deepSetValue(imp, 'ext.dimensions.slotW', slotEl.offsetWidth);
      deepSetValue(imp, 'ext.dimensions.slotH', slotEl.offsetHeight);
      deepSetValue(imp, 'ext.dimensions.cssMaxW', slotEl.style?.maxWidth);
      deepSetValue(imp, 'ext.dimensions.cssMaxH', slotEl.style?.maxHeight);
    }
    deepSetValue(imp, 'ext.nexx360', bidRequest.params.tagId);
    deepSetValue(imp, 'ext.nexx360.tagId', bidRequest.params.tagId);
    deepSetValue(imp, 'ext.nexx360.videoTagId', bidRequest.params.videoTagId);
    deepSetValue(imp, 'ext.nexx360.allBids', bidRequest.params.allBids);
    if (imp.video) {
      const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
      const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
      deepSetValue(imp, 'video.ext.playerSize', playerSize);
      deepSetValue(imp, 'video.ext.context', videoContext);
    }

    if (bidRequest.params.adUnitName) deepSetValue(imp, 'ext.adUnitName', bidRequest.params.adUnitName);
    if (bidRequest.params.adUnitPath) deepSetValue(imp, 'ext.adUnitPath', bidRequest.params.adUnitPath);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const nexx360LocalStorage = getNexx360LocalStorage();
    if (nexx360LocalStorage) {
      deepSetValue(request, 'ext.nexx360Id', nexx360LocalStorage.nexx360Id);
      deepSetValue(request, 'ext.localStorage.nexx360Id', nexx360LocalStorage.nexx360Id);
    }
    const amxId = getAmxId();
    if (amxId) deepSetValue(request, 'ext.localStorage.amxId', amxId());
    deepSetValue(request, 'ext.version', '$prebid.version$');
    deepSetValue(request, 'ext.source', 'prebid.js');
    deepSetValue(request, 'ext.pageViewId', PAGE_VIEW_ID);
    deepSetValue(request, 'ext.bidderVersion', BIDDER_VERSION);
    deepSetValue(request, 'cur', [config.getConfig('currency.adServerCurrency') || 'USD']);
    if (!request.user) request.user = {};
    if (getAmxId()) {
      if (!request.user.ext) request.user.ext = {};
      if (!request.user.ext.eids) request.user.ext.eids = [];
      request.user.ext.eids.push({
        source: 'amxdt.net',
        uids: [{
          id: `${getAmxId()}`,
          atype: 1
        }]
      });
    }

    return request;
  },
});

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(bid) {
  if (bid.params.adUnitName && (typeof bid.params.adUnitName !== 'string' || bid.params.adUnitName === '')) {
    logError('bid.params.adUnitName needs to be a string');
    return false;
  }
  if (bid.params.adUnitPath && (typeof bid.params.adUnitPath !== 'string' || bid.params.adUnitPath === '')) {
    logError('bid.params.adUnitPath needs to be a string');
    return false;
  }
  if (bid.params.divId && (typeof bid.params.divId !== 'string' || bid.params.divId === '')) {
    logError('bid.params.divId needs to be a string');
    return false;
  }
  if (bid.params.allBids && typeof bid.params.allBids !== 'boolean') {
    logError('bid.params.allBids needs to be a boolean');
    return false;
  }
  if (!bid.params.tagId && !bid.params.videoTagId && !bid.params.nativeTagId) {
    logError('bid.params.tagId or bid.params.videoTagId or  bid.params.nativeTagId must be defined');
    return false;
  }
  return true;
};

/**
 * Make a server request from the list of BidRequests.
 *
 * @return ServerRequest Info describing the request to the server.
 */

function buildRequests(bidRequests, bidderRequest) {
  const data = converter.toORTB({bidRequests, bidderRequest})
  return {
    method: 'POST',
    url: REQUEST_URL,
    data,
  }
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {ServerResponse} serverResponse A successful response from the server.
 * @return {Bid[]} An array of bids which were nested inside the server.
 */

function interpretResponse(serverResponse) {
  const respBody = serverResponse.body;
  if (!respBody || !Array.isArray(respBody.seatbid)) {
    return [];
  }

  const { bidderSettings } = getGlobal();
  const allowAlternateBidderCodes = bidderSettings && bidderSettings.standard ? bidderSettings.standard.allowAlternateBidderCodes : false;

  let bids = [];
  respBody.seatbid.forEach(seatbid => {
    bids = [...bids, ...seatbid.bid.map(bid => {
      const response = {
        requestId: bid.impid,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        dealId: bid.dealid,
        currency: respBody.cur,
        netRevenue: true,
        ttl: 120,
        mediaType: [OUTSTREAM, INSTREAM].includes(bid.ext.mediaType) ? 'video' : bid.ext.mediaType,
        meta: {
          advertiserDomains: bid.adomain,
          demandSource: bid.ext.ssp,
        },
      };
      if (allowAlternateBidderCodes) response.bidderCode = `n360_${bid.ext.ssp}`;

      if (bid.ext.mediaType === BANNER) {
        if (bid.adm) {
          response.ad = bid.adm;
        } else {
          response.adUrl = bid.ext.adUrl;
        }
      }
      if ([INSTREAM, OUTSTREAM].includes(bid.ext.mediaType)) response.vastXml = bid.adm;

      if (bid.ext.mediaType === OUTSTREAM) {
        response.renderer = createRenderer(bid, OUTSTREAM_RENDERER_URL);
        response.divId = bid.ext.divId
      };
      if (bid.ext.mediaType === NATIVE) {
        try {
          response.native = {
            ortb: JSON.parse(bid.adm)
          }
        } catch (e) {}
      }
      return response;
    })];
  });
  return bids;
}

/**
 * Register the user sync pixels which should be dropped after the auction.
 *
 * @param {SyncOptions} syncOptions Which user syncs are allowed?
 * @param {ServerResponse[]} serverResponses List of server's responses.
 * @return {UserSync[]} The user syncs which should be dropped.
 */
function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
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
}

function createRenderer(bid, url) {
  const renderer = Renderer.install({
    id: bid.id,
    url: url,
    loaded: false,
    adUnitCode: bid.ext.adUnitCode,
    targetId: bid.ext.divId,
  });
  renderer.setRender(outstreamRender);
  return renderer;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);

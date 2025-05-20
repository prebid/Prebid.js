import { deepAccess, deepSetValue, generateUUID, logInfo } from '../src/utils.js';
import {Renderer} from '../src/Renderer.js';
import {getStorageManager} from '../src/storageManager.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO } from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import { INSTREAM, OUTSTREAM } from '../src/video.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

const BIDDER_CODE = 'adgrid';
const REQUEST_URL = 'https://fast.nexx360.io/adgrid';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '2.0';
const ADGRID_KEY = 'adgrid';

const ALIASES = [];

export const storage = getStorageManager({
  bidderCode: BIDDER_CODE,
});

/**
 * Get the agdridId from local storage
 * @param
 * @return {object | false } false if localstorageNotEnabled
 */

export function getLocalStorage() {
  if (!storage.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for Adgrid`);
    return false;
  }
  const output = storage.getDataFromLocalStorage(ADGRID_KEY);
  if (output === null) {
    const adgridStorage = { adgridId: generateUUID() };
    storage.setDataInLocalStorage(ADGRID_KEY, JSON.stringify(adgridStorage));
    return adgridStorage;
  }
  try {
    return JSON.parse(output);
  } catch (e) {
    return false;
  }
}

/**
 * Get the AMX ID
 * @return { string | false } false if localstorageNotEnabled
 */
export function getAmxId() {
  if (!storage.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for Adgrid`);
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
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'tagid', bidRequest.adUnitCode);
    deepSetValue(imp, 'ext.adUnitCode', bidRequest.adUnitCode);
    if (bidRequest.params.domainId) deepSetValue(imp, 'ext.adgrid.domainId', bidRequest.params.domainId);
    if (bidRequest.params.placement) deepSetValue(imp, 'ext.adgrid.placement', bidRequest.params.placement);

    if (imp.video) {
      const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
      const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
      deepSetValue(imp, 'video.ext.playerSize', playerSize);
      deepSetValue(imp, 'video.ext.context', videoContext);
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const localStorage = getLocalStorage();
    if (localStorage) {
      deepSetValue(request, 'ext.localStorage.adgridId', localStorage.adgridId);
    }
    const amxId = getAmxId();
    if (amxId) deepSetValue(request, 'ext.localStorage.amxId', amxId);
    deepSetValue(request, 'ext.version', '$prebid.version$');
    deepSetValue(request, 'ext.source', 'prebid.js');
    deepSetValue(request, 'ext.pageViewId', PAGE_VIEW_ID);
    deepSetValue(request, 'ext.bidderVersion', BIDDER_VERSION);
    deepSetValue(request, 'cur', [getCurrencyFromBidderRequest(bidderRequest) || 'USD']);
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
  if (!bid || !bid.params) {
    return false;
  }
  if (typeof bid.params.domainId !== 'number') {
    return false;
  }

  if (typeof bid.params.placement !== 'string') {
    return false;
  }
  return true;
}


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

  let responses = [];
  for (let i = 0; i < respBody.seatbid.length; i++) {
    const seatbid = respBody.seatbid[i];
    for (let j = 0; j < seatbid.bid.length; j++) {
      const bid = seatbid.bid[j];
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
      responses.push(response);
    }
  }
  return responses;
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
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);

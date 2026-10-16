'use strict';

import { logWarn, replaceAuctionPrice } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./roockmobileBidAdapter.d.ts').RoockmobileBidderParams} RoockmobileBidderParams
 * @typedef {BidRequest & { params: RoockmobileBidderParams }} RoockmobileBidRequest
 */

const BIDDER_CODE = 'roockmobile';
const DEFAULT_DOMAIN = 'https://pbjs.rmcdnnode.com';
const BID_PATH = '/pbjs';
const USER_SYNC_PATH = '/usersync';
const USER_SYNC_ENDPOINT = `${DEFAULT_DOMAIN}${USER_SYNC_PATH}`;
const LOG_PREFIX = '[ROOCKMOBILE]: ';

const converter = ortbConverter({
  context: {
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    nativeRequest: { ver: '1.2' }
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (imp && bidRequest.params.tagid) imp.tagid = bidRequest.params.tagid;
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    if (context.bidRequests.some(bid => bid.params.test === 1)) request.test = 1;
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // OpenRTB 2.5 does not define bid.mtype. Prefer the Roockmobile extension and
    // otherwise infer the type from the markup and the matched impression.
    context.mediaType = getMediaType(bid, context.imp);
    const bidResponse = buildBidResponse(bid, context);
    // Banner rendering already owns its nurl; other formats fire it from onBidWon.
    if (bid.nurl && context.mediaType !== BANNER) bidResponse.nurl = bid.nurl;
    // A video nurl is a win notice, not a VAST document URL.
    if (context.mediaType === VIDEO && bid.adm) {
      delete bidResponse.vastUrl;
    }
    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /** @param {RoockmobileBidRequest} bid */
  isBidRequestValid(bid) {
    const params = bid.params || {};
    const credentialsValid = [params.mid, params.token].every(value => typeof value === 'string' && value.trim() !== '');
    const tagid = params.tagid || bid.ortb2Imp?.tagid;
    const valid = credentialsValid && typeof tagid === 'string' && tagid.trim() !== '';
    if (!valid) logWarn(LOG_PREFIX, 'The mid and token parameters and an impression tagid are required.');
    return valid;
  },

  /** @param {RoockmobileBidRequest[]} validBidRequests */
  buildRequests(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      const data = converter.toORTB({ bidRequests: [bid], bidderRequest });
      const query = `mid=${encodeURIComponent(bid.params.mid)}&token=${encodeURIComponent(bid.params.token)}`;
      const domain = getDomain(bid.params.domain);
      return {
        method: 'POST',
        url: `${domain}${BID_PATH}?${query}`,
        data,
        userSyncUrl: `${domain}${USER_SYNC_PATH}`
      };
    });
  },

  interpretResponse(serverResponse, request) {
    serverResponse.roockmobileUserSyncUrl = request.userSyncUrl;
    return converter.fromORTB({ request: request.data, response: serverResponse.body }).bids;
  },

  onBidWon(bid) {
    if (bid.nurl) ajax(replaceAuctionPrice(bid.nurl, bid.originalCpm || bid.cpm), undefined, undefined, { method: 'GET', keepalive: true });
  },

  getUserSyncs(syncOptions, serverResponses = []) {
    const userSyncUrl = serverResponses.find(response => response.roockmobileUserSyncUrl)?.roockmobileUserSyncUrl || USER_SYNC_ENDPOINT;
    if (syncOptions.iframeEnabled) return [{ type: 'iframe', url: userSyncUrl }];
    if (syncOptions.pixelEnabled) return [{ type: 'image', url: userSyncUrl }];
    return [];
  }
};

function getDomain(value) {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_DOMAIN;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowed = ['rmcdnnode.com', 'roockmobile.com'].some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    if (url.protocol !== 'https:' || !allowed) return DEFAULT_DOMAIN;
    return url.origin;
  } catch (e) {
    return DEFAULT_DOMAIN;
  }
}

function getMediaType(bid, imp) {
  if ([BANNER, VIDEO, NATIVE].includes(bid.ext?.mtype)) return bid.ext.mtype;
  if (imp.video && typeof bid.adm === 'string' && /<VAST(?:\s|>)/i.test(bid.adm)) return VIDEO;
  if (imp.native && isNativeMarkup(bid.adm)) return NATIVE;
  if (imp.video && !imp.banner && !imp.native) return VIDEO;
  if (imp.native && !imp.banner && !imp.video) return NATIVE;
  return BANNER;
}

function isNativeMarkup(adm) {
  try {
    const markup = typeof adm === 'string' ? JSON.parse(adm) : adm;
    return Array.isArray((markup?.native || markup)?.assets);
  } catch (e) {
    return false;
  }
}

registerBidder(spec);

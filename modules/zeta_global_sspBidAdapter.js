import { logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { parseDomain } from '../src/refererDetection.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('./zeta_global_sspBidAdapter.d.ts').ZetaGlobalSspBidderParams} ZetaGlobalSspBidderParams
 * @typedef {BidRequest & { params: ZetaGlobalSspBidderParams }} ZetaBidRequest
 */

const BIDDER_CODE = 'zeta_global_ssp';
const ENDPOINT_URL = 'https://ssp.disqus.com/bid/prebid';
const USER_SYNC_URL_IFRAME = 'https://ssp.disqus.com/sync?type=iframe';
const USER_SYNC_URL_IMAGE = 'https://ssp.disqus.com/sync?type=image';
const DEFAULT_CUR = 'USD';
const TTL = 300;
const NET_REV = true;

export const converter = ortbConverter({
  context: {
    netRevenue: NET_REV,
    ttl: TTL,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    const tagid = bidRequest.params?.tagid;
    if (tagid) {
      imp.tagid = tagid;
    }

    // Zeta's endpoint expects the primary size on imp.banner.w/h; keep imp.banner.format
    // only when more than one size was requested.
    if (imp.banner?.format?.length) {
      imp.banner.w = imp.banner.format[0].w;
      imp.banner.h = imp.banner.format[0].h;
      if (imp.banner.format.length === 1) {
        delete imp.banner.format;
      }
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const params = context.bidRequests?.[0]?.params ?? {};

    request.cur = request.cur ?? [DEFAULT_CUR];

    // Zeta-specific extensions.
    request.ext = request.ext ?? {};
    request.ext.tags = params.tags ? params.tags : {};
    request.ext.sid = params.sid ? params.sid : undefined;

    const rInfo = bidderRequest.refererInfo;
    if (rInfo) {
      request.site = request.site ?? {};
      request.site.page = cropPage(rInfo.page || rInfo.topmostLocation);
      request.site.domain = parseDomain(request.site.page, { noLeadingWww: true });
    }

    if (params.test) {
      request.test = params.test;
    }

    return clearEmpties(request);
  },

  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);

    const seat = context.seatbid?.seat;
    if (seat) {
      bidResponse.dspId = seat;
    }

    return bidResponse;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: 469,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {ZetaBidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // check for all required bid fields
    if (!(bid &&
      bid.bidId &&
      bid.params &&
      bid.params.sid)) {
      logWarn('Invalid bid request - missing required bid data');
      return false;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bidRequest objects
   * @param {BidderRequest} bidderRequest - master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const sid = validBidRequests[0]?.params?.sid;
    const url = sid ? ENDPOINT_URL.concat('?sid=', sid) : ENDPOINT_URL;
    return {
      method: 'POST',
      url: url,
      data: converter.toORTB({ bidRequests: validBidRequests, bidderRequest }),
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {ServerRequest} request The payload from the server's response.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    if (!serverResponse?.body) {
      return [];
    }
    return converter.fromORTB({ response: serverResponse.body, request: request.data }).bids;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent, coppa) => {
    let syncurl = '';

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    // CCPA
    if (uspConsent) {
      syncurl += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    // GPP Consent
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      syncurl += '&gpp=' + encodeURIComponent(gppConsent.gppString);
      syncurl += '&gpp_sid=' + encodeURIComponent(gppConsent?.applicableSections?.join(','));
    }

    // COPPA flag is supplied by core's COPPA handler.
    if (coppa) {
      syncurl += '&coppa=1';
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL_IFRAME + syncurl
      }];
    } else {
      return [{
        type: 'image',
        url: USER_SYNC_URL_IMAGE + syncurl
      }];
    }
  }
};

function cropPage(page) {
  if (page) {
    if (page.length > 100) {
      page = page.substring(0, 100);
    }
    if (page.startsWith('https://')) {
      page = page.substring(8);
    } else if (page.startsWith('http://')) {
      page = page.substring(7);
    }
    if (page.startsWith('www.')) {
      page = page.substring(4);
    }
    for (let i = 3; i < page.length; i++) {
      const c = page[i];
      if (c === '#' || c === '?') {
        return page.substring(0, i);
      }
    }
    return page;
  }
  return '';
}

function clearEmpties(o) {
  for (const k in o) {
    if (o[k] === null) {
      delete o[k];
      continue;
    }
    if (!o[k] || typeof o[k] !== 'object') {
      continue;
    }
    clearEmpties(o[k]);
    if (Object.keys(o[k]).length === 0) {
      delete o[k];
    }
  }
  return o;
}

registerBidder(spec);

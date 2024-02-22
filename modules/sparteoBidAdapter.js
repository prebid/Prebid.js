import { deepAccess, deepSetValue, logError, parseSizesInput, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 */

const BIDDER_CODE = 'sparteo';
const GVLID = 1028;
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://bid.sparteo.com/auction';
const USER_SYNC_URL_IFRAME = 'https://sync.sparteo.com/sync/iframe.html?from=prebidjs';
let isSynced = window.sparteoCrossfire?.started || false;

const converter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: TTL // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    if (bidderRequest.bids[0].params.networkId) {
      deepSetValue(request, 'site.publisher.ext.params.networkId', bidderRequest.bids[0].params.networkId);
    }

    if (bidderRequest.bids[0].params.publisherId) {
      deepSetValue(request, 'site.publisher.ext.params.publisherId', bidderRequest.bids[0].params.publisherId);
    }

    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    deepSetValue(imp, 'ext.sparteo.params', bidRequest.params);

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = deepAccess(bid, 'ext.prebid.type');

    const response = buildBidResponse(bid, context);

    if (context.mediaType == 'video') {
      response.nurl = bid.nurl;
      response.vastUrl = deepAccess(bid, 'ext.prebid.cache.vastXml.url') ?? null;
    }

    return response;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    let bannerParams = deepAccess(bid, 'mediaTypes.banner');
    let videoParams = deepAccess(bid, 'mediaTypes.video');

    if (!bid.params) {
      logError('The bid params are missing');
      return false;
    }

    if (!bid.params.networkId && !bid.params.publisherId) {
      logError('The networkId or publisherId is required');
      return false;
    }

    if (!bannerParams && !videoParams) {
      logError('The placement must be of banner or video type');
      return false;
    }

    /**
     * BANNER checks
     */

    if (bannerParams) {
      let sizes = bannerParams.sizes;

      if (!sizes || parseSizesInput(sizes).length == 0) {
        logError('mediaTypes.banner.sizes must be set for banner placement at the right format.');
        return false;
      }
    }

    /**
     * VIDEO checks
     */

    if (videoParams) {
      if (parseSizesInput(videoParams.playerSize).length == 0) {
        logError('mediaTypes.video.playerSize must be set for video placement at the right format.');
        return false;
      }
    }

    return true;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const payload = converter.toORTB({bidRequests, bidderRequest})

    return {
      method: HTTP_METHOD,
      url: bidRequests[0].params.endpoint ? bidRequests[0].params.endpoint : REQUEST_URL,
      data: payload
    };
  },

  interpretResponse: function (serverResponse, requests) {
    const bids = converter.fromORTB({response: serverResponse.body, request: requests.data}).bids;

    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    let syncurl = '';

    if (!isSynced && !window.sparteoCrossfire?.started) {
      // Attaching GDPR Consent Params in UserSync url
      if (gdprConsent) {
        syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
        syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
      }
      if (uspConsent && uspConsent.consentString) {
        syncurl += `&usp_consent=${uspConsent.consentString}`;
      }

      if (syncOptions.iframeEnabled) {
        isSynced = true;

        window.sparteoCrossfire = {
          started: true
        };

        return [{
          type: 'iframe',
          url: USER_SYNC_URL_IFRAME + syncurl
        }];
      }
    }
  },

  onTimeout: function (timeoutData) {},

  onBidWon: function (bid) {
    if (bid && bid.nurl) {
      triggerPixel(bid.nurl, null);
    }
  },

  onSetTargeting: function (bid) {}
};

registerBidder(spec);

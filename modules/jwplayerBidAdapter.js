import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import {
  isArray,
  isFn,
  deepAccess,
  deepSetValue } from '../src/utils.js';
import { config } from '../src/config.js';
const BIDDER_CODE = 'jwplayer';
const URL = 'https://ib.adnxs.com/openrtb2/prebid';

const GVLID = 1046;
const SUPPORTED_AD_TYPES = [VIDEO];

// Video Parameters
// https://docs.prebid.org/dev-docs/bidder-adaptor.html#step-2-accept-video-parameters-and-pass-them-to-your-server
const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'protocols',
  'startdelay',
  'placement',
  'plcmt',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    const params = bid && bid.params;
    if (!params) {
      return false;
    }

    return !!params.placementId && !!params.publisherId && !!params.siteId;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests, or ad units, which should be sent to the server.
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    if (!bidRequests) {
      return;
    }

    return bidRequests.map(bidRequest => {
      const payload = buildRequest(bidRequest, bidderRequest);

      return {
        method: 'POST',
        url: URL,
        data: payload
      }
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param bidderRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const bidResponses = [];
    const serverResponseBody = serverResponse.body;

    const bidId = serverResponse.bidid;
    const cur = serverResponse.cur;

    if (serverResponseBody && isArray(serverResponseBody.seatbid)) {
      serverResponseBody.seatbid.forEach(seatBids => {
        seatBids.bid.forEach(bid => {
          const bidResponse = {
            requestId: bidId,
            cpm: bid.price,
            currency: cur,
            width: bid.w,
            height: bid.h,
            creativeId: bid.adid,
            vastXml: bid.adm,
            netRevenue: true,
            ttl: 500,
            ad: bid.adm,
            meta: {
              advertiserDomains: bid.adomain
            }
          };
          bidResponses.push(bidResponse);
        });
      });
    };
    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {},

  // Optional?
  // onTimeout: function(timeoutData) {},
  // onBidWon: function(bid) {},
  // onSetTargeting: function(bid) {},
  // onBidderError: function({ error, bidderRequest }) {}
};

function buildRequest(bidRequest, bidderRequest) {
  const openrtbRequest = {
    id: bidRequest.bidId,
    imp: buildRequestImpression(bidRequest, bidderRequest),
    site: buildRequestSite(bidderRequest),
    device: buildRequestDevice()
  };

  // GDPR Consent Params
  if (bidderRequest.gdprConsent) {
    deepSetValue(openrtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    deepSetValue(openrtbRequest, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
  }

  // CCPA
  if (bidderRequest.uspConsent) {
    deepSetValue(openrtbRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  if (bidderRequest.schain) {
    deepSetValue(openrtbRequest, 'source.schain', bidderRequest.schain);
  }

  openrtbRequest.tmax = bidderRequest.timeout || 200;

  return JSON.stringify(openrtbRequest);
}

function buildRequestImpression(bidRequest) {
  const impressionObject = {
    id: bidRequest.adUnitCode,
  };

  impressionObject.video = buildImpressionVideo(bidRequest);

  const bidFloorData = buildBidFloorData(bidRequest);
  if (bidFloorData) {
    impressionObject.bidfloor = bidFloorData.floor;
    impressionObject.bidfloorcur = bidFloorData.currency;
  }

  impressionObject.ext = buildImpressionExtension(bidRequest);

  return [impressionObject];
}

function buildImpressionVideo(bidRequest) {
  const videoParams = deepAccess(bidRequest, 'mediaTypes.video', {});

  const video = {};

  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      video[param] = videoParams[param];
    }
  });

  return video;
}

function buildImpressionExtension(bidRequest) {
  return {
    prebid: {
      bidder: {
        jwplayer: {
          placementId: bidRequest.params.placementId
        }
      }
    }
  };
}

function buildBidFloorData(bidRequest) {
  const { params } = bidRequest;
  const currency = params.currency || 'USD';

  let floorData;
  if (isFn(bidRequest.getFloor)) {
    const bidFloorRequest = {
      currency: currency,
      mediaType: VIDEO,
      size: '*'
    };
    floorData = bidRequest.getFloor(bidFloorRequest);
  } else if (params.bidfloor) {
    floorData = { floor: params.bidfloor, currency: currency };
  }

  return floorData;
}

function buildRequestSite(bidderRequest) {
  const site = config.getConfig('ortb2.site') || {};

  site.domain = site.domain || config.publisherDomain || window.location.hostname;
  site.page = site.page || config.pageUrl || window.location.href;

  const referer = bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
  if (!site.ref && referer) {
    site.ref = referer;
  }

  deepSetValue(site, 'publisher.ext.jwplayer.publisherId', bidderRequest.params.publisherId);
  deepSetValue(site, 'publisher.ext.jwplayer.siteId', bidderRequest.params.siteId);

  return site;
}

function buildRequestDevice() {
  return {
    ua: navigator.userAgent
  };
}

registerBidder(spec);

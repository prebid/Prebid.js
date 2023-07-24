import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import { isArray, isFn, deepAccess, deepSetValue, getDNT, logError, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'jwplayer';
const URL = 'https://vpb-server.jwplayer.com/openrtb2/auction';

const GVLID = 1046;
const SUPPORTED_AD_TYPES = [VIDEO];

// Video Parameters
// https://docs.prebid.org/dev-docs/bidder-adaptor.html#step-2-accept-video-parameters-and-pass-them-to-your-server
const VIDEO_ORTB_PARAMS = [
  'pos',
  'w',
  'h',
  'playbackend',
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

  isBidRequestValid: function(bid) {
    const params = bid && bid.params;
    if (!params) {
      return false;
    }

    return !!params.placementId && !!params.publisherId && !!params.siteId;
  },

  buildRequests: function(bidRequests, bidderRequest) {
    if (!bidRequests) {
      return;
    }

    if (!hasContentUrl(bidderRequest.ortb2)) {
      logError(`${BIDDER_CODE}: cannot bid without a valid Content URL. Please populate ortb2.site.content.url`);
      return;
    }

    const warnings = getWarnings(bidderRequest);
    warnings.forEach(warning => {
      logWarn(`${BIDDER_CODE}: ${warning}`);
    })

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
    site: buildRequestSite(bidRequest, bidderRequest),
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

  if (bidRequest.schain) {
    deepSetValue(openrtbRequest, 'source.schain', bidRequest.schain);
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
  } else if (params.bidFloor) {
    floorData = { floor: params.bidFloor, currency: currency };
  }

  return floorData;
}

function buildRequestSite(bidRequest, bidderRequest) {
  const site = bidderRequest.ortb2 || {};

  site.domain = site.domain || config.publisherDomain || window.location.hostname;
  site.page = site.page || config.pageUrl || window.location.href;

  const referer = bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
  if (!site.ref && referer) {
    site.ref = referer;
  }

  const jwplayerPublisherExtChain = 'publisher.ext.jwplayer.';

  deepSetValue(site, jwplayerPublisherExtChain + 'publisherId', bidRequest.params.publisherId);
  deepSetValue(site, jwplayerPublisherExtChain + 'siteId', bidRequest.params.siteId);

  return site;
}

function buildRequestDevice() {
  const device = {
    h: screen.height,
    w: screen.width,
    ua: navigator.userAgent,
    dnt: getDNT() ? 1 : 0,
    js: 1
  };

  const language = getLanguage();
  if (language) {
    device.language = language;
  }

  return device;
}

function getLanguage() {
  const navigatorLanguage = navigator.language;
  if (!navigatorLanguage) {
    return;
  }

  const languageCodeSegments = navigatorLanguage.split('-');
  if (!languageCodeSegments.length) {
    return;
  }

  return languageCodeSegments[0];
}

function hasContentUrl(ortb2) {
  const site = ortb2.site;
  const content = site && site.content;
  return !!(content && content.url);
}

function getWarnings(bidderRequest) {
  const content = bidderRequest.ortb2.site.content;
  const contentChain = 'ortb2.site.content.';
  const warnings = [];
  if (!content.id) {
    warnings.push(getMissingFieldMessage(contentChain + 'id'));
  }

  if (!content.title) {
    warnings.push(getMissingFieldMessage(contentChain + 'title'));
  }

  if (!content.ext && !content.ext.description) {
    warnings.push(getMissingFieldMessage(contentChain + 'ext.description'));
  }

  return warnings;
}

function getMissingFieldMessage(fieldName) {
  return `Optional field ${fieldName} is not populated; we recommend populating for maximum performance.`
}

registerBidder(spec);

import { deepAccess, isArray, logError, logWarn, replaceAuctionPrice, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { ajax } from '../src/ajax.js';
import { getConnectionInfo } from '../libraries/connectionInfo/connectionUtils.js';
import { getDNT } from '../libraries/dnt/index.js';

const BIDDER_CODE = 'axonix';
const BIDDER_VERSION = '2.1.0';
const GVLID = 141;
const CURRENCY = 'USD';
const DEFAULT_REGION = 'us-east-1';

function getBidFloor(bidRequest) {
  let floorInfo = {};

  if (typeof bidRequest.getFloor === 'function') {
    floorInfo = bidRequest.getFloor({
      currency: CURRENCY,
      mediaType: '*',
      size: '*'
    });
  }

  return floorInfo?.floor || 0;
}

function getPageUrl(bidRequest, bidderRequest) {
  const refererPage = deepAccess(bidderRequest, 'refererInfo.page');
  const fallbackPage = deepAccess(bidderRequest, 'ortb2.site.page');
  let pageUrl = bidRequest?.params?.referrer || refererPage || fallbackPage || '';

  if (/^http:/i.test(pageUrl)) {
    pageUrl = pageUrl.replace(/^http:/i, 'https:');
  }
  return pageUrl;
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function getBidderURL(params, path) {
  const { supplyId, region, endpoint } = params;
  let url;

  if (endpoint) {
    url = endpoint;
  } else if (region) {
    url = `https://openrtb-${region}.axonix.com/supply/prebid-js/v2/${supplyId}`;
  } else {
    url = `https://openrtb-${DEFAULT_REGION}.axonix.com/supply/prebid-js/v2/${supplyId}`;
  }

  return url;
}

function getSignalURL(params, path) {
  const { supplyId, region } = params;
  let url;

  if (region) {
    url = `https://openrtb-${region}.axonix.com/supply/prebid-js/${path}/${supplyId}`;
  } else {
    url = `https://openrtb-${DEFAULT_REGION}.axonix.com/supply/prebid-js/${path}/${supplyId}`;
  }

  return url;
}

function getSchain(validBidRequest, bidderRequest) {
  return deepAccess(validBidRequest, 'ortb2.source.ext.schain') ||
    deepAccess(validBidRequest, 'ortb2.source.schain') ||
    deepAccess(bidderRequest, 'ortb2.source.ext.schain') ||
    deepAccess(bidderRequest, 'ortb2.source.schain') ||
    validBidRequest.schain;
}

function getTid(validBidRequest, bidderRequest) {
  const sourceTid = deepAccess(validBidRequest, 'ortb2.source.tid') ||
    deepAccess(bidderRequest, 'ortb2.source.tid') ||
    bidderRequest.auctionId ||
    null;
  const impTid = deepAccess(validBidRequest, 'ortb2Imp.ext.tid') ||
    validBidRequest.transactionId ||
    null;

  return { sourceTid, impTid };
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    if (!bid?.params?.supplyId) {
      return false;
    }
    const mediaTypes = bid.mediaTypes || {};
    const hasBanner = !!mediaTypes[BANNER];
    const hasVideo = !!mediaTypes[VIDEO];
    if (!hasBanner && !hasVideo) {
      return false;
    }
    if (hasVideo) {
      const video = mediaTypes[VIDEO];
      if (!isArray(video.mimes) || video.mimes.length === 0) {
        logError('Video MIME types are required for video bid requests. Ad Unit: ', JSON.stringify(bid));
        return false;
      }
    }
    return true;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const connection = getConnectionInfo();
    const connectionType = connection?.type ?? 'unknown';
    const effectiveType = connection?.effectiveType ?? '';

    const requests = validBidRequests.map(validBidRequest => {
      let app;
      let site;

      const ortb2 = bidderRequest?.ortb2 || {};
      const ortb2Imp = validBidRequest?.ortb2Imp || {};
      const ortb2Site = deepAccess(ortb2, 'site');
      const ortb2App = deepAccess(ortb2, 'app');

      // Backward-compatible behavior: keep legacy app/site logic, then enrich.
      if (typeof config.getConfig('app') === 'object') {
        app = config.getConfig('app');
      } else if (ortb2App && typeof ortb2App === 'object') {
        app = ortb2App;
      } else {
        site = {
          ...(ortb2Site || {}),
          page: getPageUrl(validBidRequest, bidderRequest) || ortb2Site?.page,
        };
      }

      const { sourceTid, impTid } = getTid(validBidRequest, bidderRequest);
      const gdprConsent = bidderRequest?.gdprConsent || null;
      const uspConsent = bidderRequest?.uspConsent || null;
      const gppConsent = bidderRequest?.gppConsent || null;
      const schain = getSchain(validBidRequest, bidderRequest);
      const userIdAsEids = validBidRequest?.userIdAsEids ||
        deepAccess(validBidRequest, 'user.ext.eids') ||
        [];

      const bidForPayload = validBidRequest.mediaTypes?.[BANNER]
        ? {
            ...validBidRequest,
            mediaTypes: {
              ...validBidRequest.mediaTypes,
              [BANNER]: {
                ...validBidRequest.mediaTypes[BANNER],
                mimes: ['image/jpeg', 'image/png', 'image/gif'],
              },
            },
          }
        : validBidRequest;

      const data = {
        // Existing payload fields preserved for server backward compatibility
        app,
        site,
        validBidRequest: bidForPayload,
        connectionType,
        effectiveType,
        devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
        bidfloor: getBidFloor(validBidRequest),
        dnt: getDNT() ? 1 : 0,
        language: navigator.language,
        prebidVersion: '$prebid.version$',
        screenHeight: screen.height,
        screenWidth: screen.width,
        tmax: bidderRequest.timeout,
        ua: navigator.userAgent,

        // Added modern Prebid/ORTB data fields
        ortb2,
        ortb2Imp,
        refererInfo: bidderRequest?.refererInfo,
        schain,
        userIdAsEids,
        sourceTid,
        impTid,
        gdprConsent,
        uspConsent,
        gppConsent,
        regs: deepAccess(ortb2, 'regs') || {},
        user: deepAccess(ortb2, 'user') || {},
        device: deepAccess(ortb2, 'device') || {}
      };

      return {
        method: 'POST',
        url: getBidderURL(validBidRequest.params, 'prebid'),
        options: {
          withCredentials: false,
          contentType: 'application/json'
        },
        data
      };
    });

    return requests;
  },

  interpretResponse: function(serverResponse, request) {
    const response = serverResponse?.body;
    if (!isArray(response)) {
      return [];
    }
    return response
      .filter(resp => resp?.requestId && resp.cpm != null && resp.creativeId)
      .map(resp => ({
        ...resp,
        ttl: resp.ttl ?? 60,
        currency: resp.currency ?? CURRENCY,
        netRevenue: typeof resp.netRevenue === 'boolean' ? resp.netRevenue : true,
      }));
  },

  onTimeout: function(timeoutData) {
    const params = deepAccess(timeoutData, '0.params.0');
    if (params && Object.keys(params).length > 0) {
      ajax(getSignalURL(params, 'timeout/v2'), null, timeoutData[0], {
        method: 'POST',
        options: {
          withCredentials: false,
          contentType: 'application/json'
        }
      });
    }
  },

  onBidWon: function(bid) {
    const { nurl } = bid || {};
    if (nurl) {
      triggerPixel(replaceAuctionPrice(nurl, bid.originalCpm || bid.cpm));
    }
  },

  onBidderError: function({ error, bidderRequest }) {
    logWarn(`${BIDDER_CODE}: bidder endpoint error`, error?.status, deepAccess(bidderRequest, 'auctionId'));
  },

  onDataDeletionRequest: function(bidderRequests) {
    const params = deepAccess(bidderRequests, '0.bids.0.params');
    if (!params?.supplyId) {
      return;
    }

    ajax(getSignalURL(params, 'data-deletion/v2'), null, { bidderRequests }, {
      method: 'POST',
      options: {
        withCredentials: false,
        contentType: 'application/json'
      }
    });
  }
};

registerBidder(spec);

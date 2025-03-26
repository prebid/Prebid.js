import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  cleanObj,
  deepAccess,
  deepSetValue,
  generateUUID,
  getWindowSelf,
  getWindowTop,
  canAccessWindowTop,
  getDNT,
  logInfo,
  triggerPixel,
} from '../src/utils.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { config } from '../src/config.js';
import { parseDomain } from '../src/refererDetection.js';

const BIDDER_CODE = 'valuad';
const AD_URL = 'https://valuad-server-test.appspot.com/adapter';
const WON_URL = 'https://hb-dot-valuad.appspot.com/adapter/win';

export const _VALUAD = (function() {
  const w = (canAccessWindowTop()) ? getWindowTop() : getWindowSelf();

  w.VALUAD = w.VALUAD || {};
  w.VALUAD.pageviewId = w.VALUAD.pageviewId || generateUUID();
  w.VALUAD.sessionId = w.VALUAD.sessionId || generateUUID();
  w.VALUAD.sessionStartTime = w.VALUAD.sessionStartTime || Date.now();
  w.VALUAD.pageLoadTime = w.VALUAD.pageLoadTime || window.performance?.timing?.domContentLoadedEventEnd - window.performance?.timing?.navigationStart;
  w.VALUAD.userActivity = w.VALUAD.userActivity || {
    lastActivityTime: Date.now(),
    pageviewCount: (w.VALUAD.userActivity?.pageviewCount || 0) + 1
  };

  return w.VALUAD;
})();

// Helper functions to enrich data
function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator[language],
    dnt: getDNT() ? 1 : 0,
    js: 1,
    geo: {}
  };

  // Get screen dimensions
  if (window.screen) {
    deviceInfo.w = window.screen.width;
    deviceInfo.h = window.screen.height;
  }

  // Get viewport dimensions
  deviceInfo.ext = {
    vpw: window.innerWidth,
    vph: window.innerHeight
  };

  return deviceInfo;
}

function getSite(bidderRequest) {
  const { refererInfo } = bidderRequest;
  const siteInfo = {
    domain: parseDomain(refererInfo.topmostLocation) || '',
    page: refererInfo.topmostLocation || '',
    referrer: refererInfo.ref || getWindowSelf().document.referrer || '',
    top: refererInfo.reachedTop
  };

  // Add page metadata if available
  const meta = document.querySelector('meta[name="keywords"]');
  if (meta && meta.content) {
    siteInfo.keywords = meta.content;
  }

  return siteInfo;
}

function getSession() {
  return {
    id: _VALUAD.sessionId,
    startTime: _VALUAD.sessionStartTime,
    lastActivityTime: _VALUAD.userActivity.lastActivityTime,
    pageviewCount: _VALUAD.userActivity.pageviewCount,
    pageLoadTime: _VALUAD.pageLoadTime || 0,
    new: _VALUAD.userActivity.pageviewCount === 1
  };
}

// Add detailed ad unit position detection
function detectAdUnitPosition(adUnitCode) {
  const element = document.getElementById(adUnitCode) || document.getElementById(getGptSlotInfoForAdUnitCode(adUnitCode)?.divId);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const docElement = document.documentElement;
  const pageWidth = docElement.clientWidth;
  const pageHeight = docElement.scrollHeight;

  return {
    x: Math.round(rect.left + window.pageXOffset),
    y: Math.round(rect.top + window.pageYOffset),
    w: Math.round(rect.width),
    h: Math.round(rect.height),
    position: `${Math.round(rect.left + window.pageXOffset)}x${Math.round(rect.top + window.pageYOffset)}`,
    viewportVisibility: calculateVisibility(rect),
    pageSize: `${pageWidth}x${pageHeight}`
  };
}

function calculateVisibility(rect) {
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  // Element is not in viewport
  if (rect.bottom < 0 || rect.right < 0 || rect.top > windowHeight || rect.left > windowWidth) {
    return 0;
  }

  // Calculate visible area
  const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
  const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
  const visibleArea = visibleHeight * visibleWidth;
  const totalArea = rect.height * rect.width;

  return totalArea > 0 ? visibleArea / totalArea : 0;
}

function getGdprConsent(bidderRequest) {
  if (!deepAccess(bidderRequest, 'gdprConsent')) {
    return false;
  }

  const {
    apiVersion,
    gdprApplies,
    consentString,
    allowAuctionWithoutConsent
  } = bidderRequest.gdprConsent;

  return cleanObj({
    apiVersion,
    consentString,
    consentRequired: gdprApplies ? 1 : 0,
    allowAuctionWithoutConsent: allowAuctionWithoutConsent ? 1 : 0
  });
}

function getCoppa() {
  return {
    required: config.getConfig('coppa') === true ? 1 : 0
  };
}

function getUspConsent(bidderRequest) {
  return (deepAccess(bidderRequest, 'uspConsent')) ? { uspConsent: bidderRequest.uspConsent } : false;
}

function getSchain(bidRequest) {
  return deepAccess(bidRequest, 'schain');
}

// Enhanced ORTBConverter with additional data
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const device = getDevice();
    const site = getSite(bidderRequest);
    const session = getSession();

    const gdprConsent = getGdprConsent(bidderRequest).consentRequired || 0;
    const gdprConsentString = getGdprConsent(bidderRequest).consentString || '';
    const uspConsent = getUspConsent(bidderRequest).uspConsent || '';
    const coppa = getCoppa().required;
    const { gpp, gpp_sid: gppSid } = deepAccess(bidderRequest, 'ortb2.regs', {});
    const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');

    // Ensure we have required extensions
    deepSetValue(request, 'device', {...request.device, ...device});
    deepSetValue(request, 'site', {...request.site, ...site});

    deepSetValue(request, 'regs', {
      gdpr: gdprConsent,
      coppa: coppa,
      us_privacy: uspConsent,
      ext: {
        gdpr_conset: gdprConsentString,
        gpp: gpp || '',
        gppSid: gppSid || [],
        dsa: dsa,
      }
    });

    deepSetValue(request, 'site.ext.data.valuad_rtd', {
      pageviewId: _VALUAD.pageviewId,
      session: session,
      features: {
        page_dimensions: `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`,
        viewport_dimensions: `${window.innerWidth}x${window.innerHeight}`,
        user_timestamp: Math.floor(Date.now() / 1000),
        dom_loading: window.performance?.timing?.domContentLoadedEventEnd - window.performance?.timing?.navigationStart
      }
    });

    // Add bid parameters
    if (bidderRequest && bidderRequest.bids && bidderRequest.bids.length) {
      deepSetValue(request, 'ext.params', bidderRequest.bids[0].params);
    }

    // Set currency to USD
    deepSetValue(request, 'cur', ['USD']);

    // Add schain if present
    const schain = getSchain(bidderRequest.bids[0]);
    if (schain) {
      deepSetValue(request, 'source.ext.schain', schain);
    }

    return request;
  },

  imp(buildImp, bid, context) {
    const imp = buildImp(bid, context);

    // Add additional impression data
    const positionData = detectAdUnitPosition(bid.adUnitCode);
    if (positionData) {
      deepSetValue(imp, 'ext.data.adg_rtd.adunit_position', positionData.position);
      deepSetValue(imp, 'ext.data.viewability', positionData.viewportVisibility);
    }

    // GPT information
    const gptInfo = getGptSlotInfoForAdUnitCode(bid.adUnitCode);
    if (gptInfo) {
      deepSetValue(imp, 'ext.data.adserver', {
        name: 'gam',
        adslot: gptInfo.gptSlot
      });
      deepSetValue(imp, 'ext.data.pbadslot', gptInfo.gptSlot);

      // If not already set, add gpid
      if (!imp.ext.gpid && gptInfo.gptSlot) {
        deepSetValue(imp, 'ext.gpid', gptInfo.gptSlot);
      }
    }

    // Handle price floors
    if (typeof bid.getFloor === 'function') {
      try {
        const mediaType = Object.keys(bid.mediaTypes)[0];
        let size;

        if (mediaType === BANNER) {
          size = bid.mediaTypes.banner.sizes && bid.mediaTypes.banner.sizes[0];
        } else if (mediaType === VIDEO) {
          size = bid.mediaTypes.video.playerSize;
        }

        if (size) {
          const floor = bid.getFloor({
            currency: 'USD',
            mediaType,
            size
          });

          if (floor && !isNaN(floor.floor) && floor.currency === 'USD') {
            imp.bidfloor = floor.floor;
            imp.bidfloorcur = 'USD';
          }
        }
      } catch (e) {
        logInfo('Valuad: Error getting floor', e);
      }
    }

    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (bid.vbid) {
      bidResponse.vbid = bid.vbid;
    }
    if (context.bidRequest?.params?.placementId) {
      bidResponse.vid = context.bidRequest.params.placementId;
    }
    return bidResponse;
  },
});

const isBidRequestValid = () => (bid = {}) => {
  const { params, bidId, mediaTypes } = bid;

  const foundKeys = bid && bid.params && bid.params.placementId;
  let valid = Boolean(bidId && params && foundKeys);

  if (mediaTypes && mediaTypes[BANNER]) {
    valid = valid && Boolean(mediaTypes[BANNER] && mediaTypes[BANNER].sizes);
  } else if (mediaTypes && mediaTypes[VIDEO]) {
    valid = valid && Boolean(mediaTypes[VIDEO] && mediaTypes[VIDEO].playerSize);
  } else if (mediaTypes && mediaTypes[NATIVE]) {
    valid = valid && Boolean(mediaTypes[NATIVE]);
  } else {
    valid = false;
  }

  return valid;
};

const buildRequests = (adUrl) => (validBidRequests = [], bidderRequest = {}) => {
  // Add bid-level metadata for our server to use
  validBidRequests = validBidRequests.map(req => {
    req.valuadMeta = {
      pageviewId: _VALUAD.pageviewId,
      adUnitPosition: detectAdUnitPosition(req.adUnitCode)
    };
    return req;
  });

  const data = converter.toORTB({ validBidRequests, bidderRequest });

  // Update session data
  _VALUAD.userActivity.lastActivityTime = Date.now();

  return [{
    method: 'POST',
    url: adUrl,
    data
  }];
};

const interpretResponse = () => (response, request) => {
  const bidResponses = converter.fromORTB({response: response.body, request: request.data}).bids;

  // Process server-side data
  if (response.body && response.body.ext && response.body.ext.valuad) {
    // Store any server-side enhanced data for future use
    _VALUAD.serverData = response.body.ext.valuad;
  }

  return bidResponses;
};

const getUserSyncs = () => (syncOptions, serverResponses) => {
  if (!serverResponses.length || serverResponses[0].body === '' || !serverResponses[0].body.userSyncs) {
    return false;
  }

  const syncs = serverResponses[0].body.userSyncs.map(sync => ({
    type: sync.type === 'iframe' ? 'iframe' : 'image',
    url: sync.url
  }));

  return syncs;
};

const onBidWon = (bid) => {
  const {
    adUnitCode, adUnitId, auctionId, bidder, cpm, currency, originalCpm, originalCurrency, size, vbid, vid,
  } = bid;
  const bidStr = JSON.stringify({
    adUnitCode, adUnitId, auctionId, bidder, cpm, currency, originalCpm, originalCurrency, size, vbid, vid,
  });
  const encodedBidStr = window.btoa(bidStr);
  triggerPixel(WON_URL + '?b=' + encodedBidStr);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse: interpretResponse(),
  getUserSyncs: getUserSyncs(),
  onBidWon,
};

registerBidder(spec);

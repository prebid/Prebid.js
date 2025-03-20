import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  deepSetValue,
  generateUUID,
  getWindowSelf,
  getWindowTop,
  canAccessWindowTop,
  getDNT,
  logInfo,
} from '../src/utils.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { config } from '../src/config.js';
import { parseDomain } from '../src/refererDetection.js';

const BIDDER_CODE = 'valuad';
const AD_URL = 'https://valuad-server-test.appspot.com/adapter';
const SYNC_URL = 'https://valuad-server-test.appspot.com/cookie_sync';

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

    // Ensure we have required extensions
    deepSetValue(request, 'device', {...request.device, ...device});
    deepSetValue(request, 'site', {...request.site, ...site});

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
  }
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
  if (response.body && response.body.ext && response.body.ext.valuad_data) {
    // Store any server-side enhanced data for future use
    _VALUAD.serverData = response.body.ext.valuad_data;
  }

  return bidResponses;
};

const getUserSyncs = (syncUrl) => (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
  let url = syncUrl + `/${type}?pbjs=1`;

  if (gdprConsent && gdprConsent.consentString) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      url += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      url += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
    }
  }

  if (uspConsent && uspConsent.consentString) {
    url += `&ccpa_consent=${uspConsent.consentString}`;
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    url += '&gpp=' + gppConsent.gppString;
    url += '&gpp_sid=' + gppConsent.applicableSections.join(',');
  }

  const coppa = config.getConfig('coppa') ? 1 : 0;
  url += `&coppa=${coppa}`;

  // Add our session ID
  url += `&sid=${_VALUAD.sessionId}`;

  return [{
    type,
    url
  }];
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  gvlid: 1234, // Replace with your actual GVL ID for GDPR purposes

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse: interpretResponse(),
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepClone, deepAccess, getWinDimensions, logWarn, logError } from '../src/utils.js';

const BIDDER_CODE = 'revantage';
const ENDPOINT_URL = 'https://bid.revantage.io/bid';
const SYNC_URL = 'https://sync.revantage.io/sync';

const CACHE_DURATION = 30000;
let pageContextCache = null;
let cacheTimestamp = 0;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner'],

  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.feedId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    try {
      const openRtbBidRequest = makeOpenRtbRequest(validBidRequests, bidderRequest);
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(openRtbBidRequest),
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
        bidRequests: validBidRequests
      };
    } catch (e) {
      logError('Revantage: buildRequests failed', e);
      return [];
    }
  },

  interpretResponse: function(serverResponse, request) {
    const bids = [];
    const resp = serverResponse.body;
    const originalBids = request.bidRequests || [];
    const bidIdMap = {};
    originalBids.forEach(b => { bidIdMap[b.bidId] = b; });

    if (!resp || !Array.isArray(resp.bids)) return bids;

    resp.bids.forEach((bid) => {
      if (!bid || bid.error || !bid.raw_response || !bid.price || bid.price <= 0) return;

      const rawResponse = bid.raw_response;
      if (rawResponse && Array.isArray(rawResponse.seatbid)) {
        rawResponse.seatbid.forEach(seatbid => {
          if (Array.isArray(seatbid.bid)) {
            seatbid.bid.forEach(rtbBid => {
              const originalBid = bidIdMap[rtbBid.impid];
              if (originalBid && rtbBid.price > 0 && rtbBid.adm) {
                bids.push({
                  requestId: originalBid.bidId,
                  cpm: rtbBid.price,
                  width: rtbBid.w || getFirstSize(originalBid, 0, 300),
                  height: rtbBid.h || getFirstSize(originalBid, 1, 250),
                  creativeId: rtbBid.adid || rtbBid.id || bid.adid || 'revantage-' + Date.now(),
                  currency: rtbBid.cur || 'USD',
                  netRevenue: true,
                  ttl: 300,
                  ad: rtbBid.adm,
                  meta: {
                    advertiserDomains: rtbBid.adomain || [],
                    dsp: bid.dsp,
                    networkName: 'Revantage'
                  }
                });
              }
            });
          }
        });
      }
    });
    return bids;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    let params = '?cb=' + new Date().getTime();

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      }
      if (typeof gdprConsent.consentString === 'string') {
        params += '&gdpr_consent=' + gdprConsent.consentString;
      }
    }
    if (uspConsent && typeof uspConsent === 'string') {
      params += '&us_privacy=' + uspConsent;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({ type: 'iframe', url: SYNC_URL + params });
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({ type: 'image', url: SYNC_URL + '?tag=img&cb=' + new Date().getTime() + params.substring(params.indexOf('&')) });
    }
    return syncs;
  }
};

// === CROSS-VERSION COMPATIBILITY ===
function getBoundingClientRectSafe(adUnitCode) {
  try {
    if (typeof document === 'undefined') return null;

    let element = null;

    // Strategy 1: Direct ID match
    element = document.getElementById(adUnitCode);

    // Strategy 2: Common ad unit selectors
    if (!element) {
      const selectors = [
        '#' + adUnitCode,
        '.' + adUnitCode,
        '[id="' + adUnitCode + '"]',
        '[class*="' + adUnitCode + '"]',
        '[data-ad-unit="' + adUnitCode + '"]',
        '[data-google-query-id*="' + adUnitCode + '"]',
        'div[id*="' + adUnitCode + '"]',
        '[data-ad-unit-path*="' + adUnitCode + '"]'
      ];

      for (let i = 0; i < selectors.length; i++) {
        try {
          element = document.querySelector(selectors[i]);
          if (element) break;
        } catch (e) {
          // Invalid selector, continue
        }
      }
    }

    if (!element) {
      logWarn('Revantage: Could not find element for ad unit: ' + adUnitCode);
      return null;
    }

    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : {};

    return {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      x: rect.x || rect.left,
      y: rect.y || rect.top
    };
  } catch (e) {
    logWarn('Revantage: getBoundingClientRectSafe failed', e);
    return null;
  }
}

// === MAIN RTB BUILDER ===
function makeOpenRtbRequest(validBidRequests, bidderRequest) {
  const imp = validBidRequests.map(bid => {
    const sizes = getSizes(bid);
    const floor = getBidFloorEnhanced(bid);

    // Enhanced viewability calculation
    let viewability = {};
    try {
      const rect = getBoundingClientRectSafe(bid.adUnitCode) || {};
      const winDims = getWinDimensions();
      viewability = {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        winWidth: winDims.width,
        winHeight: winDims.height,
        viewabilityScore: calculateViewability(rect, winDims),
        inView: isInViewport(rect, winDims)
      };
    } catch (e) {
      logWarn('Revantage: viewability calculation failed', e);
    }

    return {
      id: bid.bidId,
      tagid: bid.adUnitCode,
      banner: {
        w: sizes[0][0],
        h: sizes[0][1],
        format: sizes.map(size => ({ w: size[0], h: size[1] }))
      },
      bidfloor: floor,
      ext: {
        feedId: deepAccess(bid, 'params.feedId'),
        bidder: {
          placementId: deepAccess(bid, 'params.placementId'),
          publisherId: deepAccess(bid, 'params.publisherId')
        },
        viewability: viewability
      }
    };
  });

  const pageContext = getPageContextCached();

  let user = {};
  if (validBidRequests[0] && validBidRequests[0].userIdAsEids) {
    user.eids = deepClone(validBidRequests[0].userIdAsEids);
  }

  const ortb2 = bidderRequest.ortb2 || {};
  const site = {
    domain: typeof window !== 'undefined' ? window.location.hostname : '',
    page: typeof window !== 'undefined' ? window.location.href : '',
    ref: typeof document !== 'undefined' ? document.referrer : ''
  };

  // Merge ortb2 site data
  if (ortb2.site) {
    Object.assign(site, deepClone(ortb2.site));
  }

  const device = {
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    w: typeof screen !== 'undefined' ? screen.width : 0,
    h: typeof screen !== 'undefined' ? screen.height : 0,
    devicetype: getDeviceType()
  };

  // Merge ortb2 device data
  if (ortb2.device) {
    Object.assign(device, deepClone(ortb2.device));
  }

  // Add enhanced device info
  Object.assign(device, getEnhancedDeviceInfo());

  const regs = { ext: {} };
  if (bidderRequest.gdprConsent) {
    regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    user.ext = { consent: bidderRequest.gdprConsent.consentString };
  }
  if (bidderRequest.uspConsent) {
    regs.ext.us_privacy = bidderRequest.uspConsent;
  }

  return {
    id: bidderRequest.auctionId,
    imp: imp,
    site: site,
    device: device,
    user: user,
    regs: regs,
    tmax: bidderRequest.timeout || 1000,
    cur: ['USD'],
    ext: {
      prebid: {
        version: (typeof window !== 'undefined' && window.pbjs && window.pbjs.version) ? window.pbjs.version : 'unknown'
      },
      revantage: {
        pageContext: pageContext,
        enrichment: getBidEnrichmentData(bidderRequest),
        performance: getPerformanceMetrics()
      }
    }
  };
}

// === ENHANCED UTILS ===
function getSizes(bid) {
  if (bid.mediaTypes && bid.mediaTypes.banner && Array.isArray(bid.mediaTypes.banner.sizes)) {
    return bid.mediaTypes.banner.sizes;
  }
  return bid.sizes || [[300, 250]];
}

function getFirstSize(bid, index, defaultVal) {
  const sizes = getSizes(bid);
  return (sizes && sizes[0] && sizes[0][index]) || defaultVal;
}

function getBidFloorEnhanced(bid) {
  let floor = 0;
  if (typeof bid.getFloor === 'function') {
    const sizes = getSizes(bid);
    // Try size-specific floors first
    for (let i = 0; i < sizes.length; i++) {
      try {
        const floorInfo = bid.getFloor({
          currency: 'USD',
          mediaType: 'banner',
          size: sizes[i]
        });
        if (floorInfo && floorInfo.floor > floor && floorInfo.currency === 'USD' && !isNaN(floorInfo.floor)) {
          floor = floorInfo.floor;
        }
      } catch (e) {
        // Continue to next size
      }
    }

    // Fallback to general floor
    if (floor === 0) {
      try {
        const floorInfo = bid.getFloor({ currency: 'USD', mediaType: 'banner', size: '*' });
        if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(floorInfo.floor)) {
          floor = floorInfo.floor;
        }
      } catch (e) {
        logWarn('Revantage: getFloor threw error', e);
      }
    }
  }
  return floor;
}

// === ENHANCED VIEWABILITY ===
function calculateViewability(rect, winDims) {
  if (!rect || !rect.width || !rect.height || !winDims) return 0;

  const visibleArea = Math.max(0,
    Math.min(rect.bottom, winDims.height) - Math.max(rect.top, 0)
  ) * Math.max(0,
    Math.min(rect.right, winDims.width) - Math.max(rect.left, 0)
  );

  const totalArea = rect.width * rect.height;
  return totalArea > 0 ? Math.round((visibleArea / totalArea) * 100) / 100 : 0;
}

function isInViewport(rect, winDims) {
  if (!rect || !winDims) return false;
  return rect.top >= 0 && rect.left >= 0 &&
         rect.bottom <= winDims.height && rect.right <= winDims.width;
}

// === CACHED PAGE CONTEXT ===
function getPageContextCached() {
  const now = Date.now();
  if (!pageContextCache || (now - cacheTimestamp) > CACHE_DURATION) {
    pageContextCache = extractPageContext();
    cacheTimestamp = now;
  }
  return deepClone(pageContextCache);
}

function extractPageContext() {
  try {
    if (typeof document === 'undefined') return {};

    // Only collect raw content data for server-side processing
    return {
      // Basic page info
      title: document.title || '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      domain: typeof window !== 'undefined' ? window.location.hostname : '',
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',

      // Meta tags for server processing
      metaTags: getMetaTags(),

      // Content structure for server analysis
      contentStructure: getContentStructure(),

      // Client-side only metrics
      mediaElements: getMediaElements(),

      // Performance data
      timestamp: Date.now()
    };
  } catch (e) {
    logWarn('Revantage: page context extraction failed', e);
    return {};
  }
}

function getMetaTags() {
  try {
    if (typeof document === 'undefined') return {};

    const metaTags = {};
    const metas = document.querySelectorAll('meta');

    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i];
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');

      if (name && content) {
        metaTags[name] = content;
      }
    }

    // Get canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      metaTags.canonical = canonical.href;
    }

    return metaTags;
  } catch (e) {
    return {};
  }
}

function getContentStructure() {
  try {
    if (typeof document === 'undefined') return {};

    return {
      // Headings for server-side analysis
      headings: {
        h1: getTextFromElements('h1'),
        h2: getTextFromElements('h2', 5), // Limit to avoid bloat
        h3: getTextFromElements('h3', 5)
      },

      // Sample content for server processing
      contentSamples: {
        firstParagraph: getFirstParagraphText(),
        lastModified: document.lastModified || null
      },

      // Structured data (raw JSON for server parsing)
      structuredData: getStructuredDataRaw(),

      // Page elements that affect content type
      pageElements: {
        hasArticle: !!document.querySelector('article'),
        hasVideo: !!document.querySelector('video'),
        hasForm: !!document.querySelector('form'),
        hasProduct: !!document.querySelector('[itemtype*="Product"]'),
        hasBlog: !!document.querySelector('.blog, #blog, [class*="blog"]')
      }
    };
  } catch (e) {
    return {};
  }
}

function getTextFromElements(selector, limit) {
  limit = limit || 3;
  try {
    if (typeof document === 'undefined') return [];
    const elements = document.querySelectorAll(selector);
    const texts = [];

    for (let i = 0; i < Math.min(elements.length, limit); i++) {
      const text = elements[i].textContent;
      if (text && text.trim().length > 0) {
        texts.push(text.trim());
      }
    }
    return texts;
  } catch (e) {
    return [];
  }
}

function getFirstParagraphText() {
  try {
    if (typeof document === 'undefined') return '';
    const firstP = document.querySelector('p');
    if (firstP && firstP.textContent) {
      return firstP.textContent.substring(0, 500); // Limit length
    }
    return '';
  } catch (e) {
    return '';
  }
}

function getStructuredDataRaw() {
  try {
    if (typeof document === 'undefined') return [];
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const structuredData = [];

    for (let i = 0; i < scripts.length; i++) {
      try {
        // Send raw JSON for server-side parsing
        const data = JSON.parse(scripts[i].textContent);
        structuredData.push(data);
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    return structuredData;
  } catch (e) {
    return [];
  }
}

function getMediaElements() {
  try {
    if (typeof document === 'undefined') return {};

    return {
      imageCount: document.querySelectorAll('img').length,
      videoCount: document.querySelectorAll('video').length,
      iframeCount: document.querySelectorAll('iframe').length
    };
  } catch (e) {
    return {};
  }
}

// === ENHANCED DEVICE INFO ===
function getEnhancedDeviceInfo() {
  try {
    const connection = getConnectionInfo();

    return {
      make: detectDeviceBrand(),
      model: detectDeviceModel(),
      os: detectOS(),
      browser: detectBrowser(),
      connection: connection,
      capabilities: {
        touchEnabled: typeof window !== 'undefined' ? ('ontouchstart' in window) : false,
        webGL: typeof window !== 'undefined' ? (!!window.WebGLRenderingContext) : false,
        hasLocalStorage: typeof window !== 'undefined' && typeof window.Storage !== 'undefined',
        hasSessionStorage: typeof window !== 'undefined' && typeof window.Storage !== 'undefined',
        indexedDB: typeof window !== 'undefined' ? (!!window.indexedDB) : false
      }
    };
  } catch (e) {
    return {};
  }
}

function detectDeviceBrand() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Samsung/i.test(ua)) return 'Samsung';
  if (/Pixel/i.test(ua)) return 'Google';
  if (/Huawei/i.test(ua)) return 'Huawei';
  if (/OnePlus/i.test(ua)) return 'OnePlus';
  if (/\bLG\b/i.test(ua)) return 'LG';
  if (/Sony/i.test(ua)) return 'Sony';
  if (/HTC/i.test(ua)) return 'HTC';
  if (/Motorola/i.test(ua)) return 'Motorola';
  return 'Unknown';
}

function detectDeviceModel() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let match;

  if ((match = ua.match(/iPhone (\d+)/i))) return match[1];
  if ((match = ua.match(/iPad(\d+,\d+)/i))) return match[1];
  if ((match = ua.match(/SM-([A-Z0-9]+)/i))) return match[1];
  if ((match = ua.match(/Pixel (\d+)/i))) return match[1];

  return 'Unknown';
}

function detectOS() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows Phone/i.test(ua)) return 'Windows Phone';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

function detectBrowser() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edge/i.test(ua)) return 'Edge';
  if (/Opera/i.test(ua)) return 'Opera';
  if (/MSIE|Trident/i.test(ua)) return 'Internet Explorer';
  return 'Unknown';
}

function getDeviceType() {
  if (typeof screen === 'undefined') return 1;
  const width = screen.width;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  if (/iPhone|iPod/i.test(ua) || (width < 768 && /Mobile/i.test(ua))) return 2; // Mobile
  if (/iPad/i.test(ua) || (width >= 768 && width < 1024)) return 5; // Tablet
  return 1; // Desktop/PC
}

function getConnectionInfo() {
  const connection = typeof navigator !== 'undefined' ? (navigator.connection || navigator.webkitConnection) : undefined;
  if (!connection) return {};
  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
}

function getPageTiming() {
  try {
    if (typeof window === 'undefined' || !window.performance || !window.performance.timing) return {};
    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;
    return {
      domLoading: timing.domLoading - navigationStart,
      domComplete: timing.domComplete - navigationStart,
      loadEventEnd: timing.loadEventEnd - navigationStart
    };
  } catch (e) {
    return {};
  }
}

function getPerformanceMetrics() {
  try {
    if (typeof window === 'undefined') return {};
    const winDims = getWinDimensions();
    return {
      timestamp: Date.now(),
      viewport: {
        width: winDims.width || 0,
        height: winDims.height || 0
      },
      scroll: {
        x: window.pageXOffset || 0,
        y: window.pageYOffset || 0
      },
      timing: getPageTiming()
    };
  } catch (e) {
    return {};
  }
}

function getBidEnrichmentData(bidderRequest) {
  try {
    const ortb2 = bidderRequest ? bidderRequest.ortb2 : {};
    return {
      timestamp: Date.now(),
      firstPartyData: {
        site: ortb2.site || {},
        user: ortb2.user || {},
        device: ortb2.device || {}
      }
    };
  } catch (e) {
    return {};
  }
}

// === REGISTER ===
registerBidder(spec);

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

const DEFAULT_RTD_CONFIG = {
  auctionDelay: 50,  // ms to wait for RTD data
  params: {
    handleRtd: true,
    handleViewability: true,
    handleUserData: true
  }
};

const StorageManager = {
  data: {},

  init() {
    const w = (canAccessWindowTop()) ? getWindowTop() : getWindowSelf();
    w.VALUAD = w.VALUAD || {};
    this.data = w.VALUAD;

    // Load data from persistent storage
    this.loadFromStorage();
    return this;
  },

  loadFromStorage() {
    try {
      // Load session data
      const sessionData = sessionStorage.getItem('valuad_session');
      if (sessionData) {
        this.data.session = JSON.parse(sessionData);
      }

      // Load historical data
      const historicalData = localStorage.getItem('valuad_historical');
      if (historicalData) {
        this.data.historical = JSON.parse(historicalData);
      }

      // Load RTD data
      const rtdData = localStorage.getItem('valuad_rtd');
      if (rtdData) {
        const parsedRtdData = JSON.parse(rtdData);
        // Only load non-expired data
        if (parsedRtdData.expiry && parsedRtdData.expiry > Date.now()) {
          this.data.rtd = parsedRtdData.value;
        }
      }
    } catch (e) {
      logInfo('Valuad: Error loading from storage', e);
    }
  },

  isStorageAvailable(type) {
    try {
      const storage = window[type];
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  },

  saveToStorage() {
    try {
      if (this.isStorageAvailable('localStorage')) {
        // Save session data
        localStorage.setItem('valuad_session', JSON.stringify(this.data.session));

        // Save historical data
        localStorage.setItem('valuad_historical', JSON.stringify(this.data.historical));

        // Save RTD data
        if (this.data.rtd) {
          localStorage.setItem('valuad_rtd', JSON.stringify({
            value: this.data.rtd,
            expiry: Date.now() + (30 * 60 * 1000) // 30 minutes TTL
          }));
        }
      }
      if (this.isStorageAvailable('sessionStorage')) {
        // Save session data
        sessionStorage.setItem('valuad_session', JSON.stringify(this.data.session));
      }
    } catch (e) {
      logInfo('Valuad: Error saving to storage', e);
    }
  },

  set(key, value, persistent = false) {
    this.data[key] = value;
    if (persistent) {
      this.saveToStorage();
    }
    return value;
  },

  get(key) {
    return this.data[key];
  },

  update(key, value, persistent = false) {
    this.data[key] = {
      ...this.data[key],
      ...value,
      lastUpdate: Date.now()
    };
    if (persistent) {
      this.saveToStorage();
    }
    return this.data[key];
  },

  updateHistoricalData(data) {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    this.data.historical = this.data.historical || {};
    this.data.historical[dateKey] = this.data.historical[dateKey] || {
      pageviews: 0,
      adImpressions: {},
      bidRequests: 0,
      bidResponses: 0,
      revenue: 0
    };

    this.data.historical[dateKey] = {
      ...this.data.historical[dateKey],
      ...data
    };

    // Save to localStorage
    localStorage.setItem('valuad_historical', JSON.stringify(this.data.historical));
  },

  getHistoricalData(days = 30) {
    const historical = this.data.historical || {};
    const now = new Date();
    const result = {};

    // Get last N days of data
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (historical[dateKey]) {
        result[dateKey] = historical[dateKey];
      }
    }

    return result;
  },

  updateSessionData(data) {
    const session = this.data.session || {
      id: generateUUID(),
      startTime: Date.now(),
      pageviews: 0,
      adImpressions: {},
      bidRequests: 0,
      bidResponses: 0,
      revenue: 0
    };

    this.data.session = {
      ...session,
      ...data,
      lastUpdate: Date.now()
    };

    // Save to sessionStorage
    sessionStorage.setItem('valuad_session', JSON.stringify(this.data.session));
  },

  cleanup() {
    try {
      // Clean up expired RTD data
      const rtdData = localStorage.getItem('valuad_rtd');
      if (rtdData) {
        const parsed = JSON.parse(rtdData);
        if (parsed.expiry && parsed.expiry < Date.now()) {
          localStorage.removeItem('valuad_rtd');
          delete this.data.rtd;
        }
      }

      // Clean up historical data older than 90 days
      const historical = this.data.historical || {};
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      Object.keys(historical).forEach(dateKey => {
        const [year, month, day] = dateKey.split('-').map(Number);
        const dataDate = new Date(year, month - 1, day);
        if (dataDate < cutoffDate) {
          delete historical[dateKey];
        }
      });

      localStorage.setItem('valuad_historical', JSON.stringify(historical));
    } catch (e) {
      logInfo('Valuad: Error in cleanup', e);
    }
  }
};

export const _VALUAD = (function() {
  const storage = StorageManager.init();

  // Update session data
  storage.updateSessionData({
    pageviews: (storage.get('session')?.pageviews || 0) + 1
  });

  // Initialize RTD data
  storage.set('rtdData', {
    userActivity: {
      lastActivityTime: Date.now(),
      pageviewCount: (storage.get('session')?.pageviews || 0)
    }
  }, true); // true for persistent storage

  // Cleanup expired data periodically
  setInterval(() => storage.cleanup(), 5 * 60 * 1000);

  return storage;
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

function getEids(bidRequest) {
  return deepAccess(bidRequest, 'userIdAsEids');
}

function processVideoParams(bid) {
  const videoParams = deepAccess(bid, 'mediaTypes.video', {});
  const playerSize = videoParams.playerSize || [];

  return cleanObj({
    mimes: videoParams.mimes,
    minduration: videoParams.minduration,
    maxduration: videoParams.maxduration,
    protocols: videoParams.protocols,
    w: playerSize[0]?.[0],
    h: playerSize[0]?.[1],
    startdelay: videoParams.startdelay,
    placement: videoParams.placement,
    linearity: videoParams.linearity,
    skip: videoParams.skip,
    skipmin: videoParams.skipmin,
    skipafter: videoParams.skipafter,
    playbackmethod: videoParams.playbackmethod,
    api: videoParams.api
  });
}

function processNativeAssets(nativeParams) {
  const assets = [];
  let id = 1;

  if (nativeParams.title) {
    assets.push({
      id: id++,
      required: nativeParams.title.required ? 1 : 0,
      title: {
        len: nativeParams.title.len || 140
      }
    });
  }

  if (nativeParams.image) {
    assets.push({
      id: id++,
      required: nativeParams.image.required ? 1 : 0,
      img: {
        type: 3, // Main image
        w: nativeParams.image.sizes[0],
        h: nativeParams.image.sizes[1],
        mimes: nativeParams.image.mimes || ['image/jpeg', 'image/png']
      }
    });
  }

  return assets;
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
    const rtdConfig = getRtdConfig();

    // Get session and historical data
    const sessionData = _VALUAD.get('session') || {};
    const historicalData = _VALUAD.getHistoricalData(30); // Get last 30 days

    // Calculate aggregate metrics from historical data
    const aggregateHistorical = Object.values(historicalData).reduce((acc, daily) => {
      return {
        totalRevenue: (acc.totalRevenue || 0) + (daily.revenue || 0),
        totalImpressions: (acc.totalImpressions || 0) + Object.values(daily.adImpressions || {}).reduce((sum, count) => sum + count, 0),
        totalBidRequests: (acc.totalBidRequests || 0) + (daily.bidRequests || 0),
        totalBidResponses: (acc.totalBidResponses || 0) + (daily.bidResponses || 0),
      };
    }, {});

    // Add enriched data to the request
    deepSetValue(request, 'site.ext.data.valuad_analytics', {
      session: {
        id: sessionData.id,
        startTime: sessionData.startTime,
        pageviews: sessionData.pageviews,
        duration: Date.now() - sessionData.startTime,
        revenue: sessionData.revenue || 0,
        bidRequests: sessionData.bidRequests || 0,
        bidResponses: sessionData.bidResponses || 0,
        adImpressions: sessionData.adImpressions || {},
        lastUpdate: sessionData.lastUpdate
      },
      historical: {
        last30Days: {
          ...aggregateHistorical,
          averageDailyRevenue: aggregateHistorical.totalRevenue / Object.keys(historicalData).length,
          averageDailyImpressions: aggregateHistorical.totalImpressions / Object.keys(historicalData).length,
          bidResponseRate: aggregateHistorical.totalBidResponses / (aggregateHistorical.totalBidRequests || 1),
        },
        // Include today's data separately for immediate context
        today: historicalData[Object.keys(historicalData)[0]] || {},
      }
    });

    // Add performance metrics for the current page
    deepSetValue(request, 'site.ext.data.valuad_rtd', {
      ...request.site.ext.data.valuad_rtd,
      performance: {
        pageLoadTime: _VALUAD.get('pageLoadTime'),
        timeOnPage: Date.now() - sessionData.startTime,
        userInteractions: _VALUAD.get('userActivity')?.interactions || 0,
        maxScroll: _VALUAD.get('userActivity')?.maxScroll || 0,
      }
    });

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

    if (rtdConfig.params.handleRtd) {
      const rtdData = collectRtdData();

      deepSetValue(request, 'site.ext.data.valuad_rtd', {
        ...request.site.ext.data.valuad_rtd,
        ...rtdData,
        config: {
          enabled: true,
          auctionDelay: rtdConfig.auctionDelay
        }
      });
    }

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

    // Add eids if present
    const eids = getEids(bidderRequest.bids[0]);
    if (eids) {
      deepSetValue(request, 'user.ext.eids', eids);
    }

    const ortb2 = bidderRequest.ortb2 || {};
    if (ortb2.site?.ext?.data) {
      deepSetValue(request, 'site.ext.data', {
        ...request.site.ext.data,
        ...ortb2.site.ext.data
      });
    }

    const tmax = bidderRequest.timeout;
    if (tmax) {
      deepSetValue(request, 'tmax', tmax);
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

    if (bid.mediaTypes?.video) {
      imp.video = {
        ...imp.video,
        ...processVideoParams(bid)
      };
    }

    if (bid.mediaTypes?.native) {
      imp.native = {
        ver: '1.2',
        assets: processNativeAssets(bid.mediaTypes.native)
      };
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
  validBidRequests = validBidRequests.map(req => {
    req.valuadMeta = {
      pageviewId: _VALUAD.pageviewId,
      adUnitPosition: detectAdUnitPosition(req.adUnitCode),
      rtd: _VALUAD.rtdData,
      viewability: _VALUAD.viewabilityData?.[req.adUnitCode],
      userActivity: _VALUAD.userActivity
    };

    // Start viewability tracking
    if (getRtdConfig().params.handleViewability) {
      trackViewability(req.adUnitCode);
    }

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

  if (response.body?.ext?.valuad_rtd) {
    const rtdData = response.body.ext.valuad_rtd;
    _VALUAD.setWithExpiry('serverRtdData', rtdData, 5 * 60 * 1000); // 5 minutes TTL

    return bidResponses.map(bid => ({
      ...bid,
      meta: {
        ...bid.meta,
        rtd: {
          segments: rtdData.segments,
          viewability: _VALUAD.getWithExpiry('viewabilityData')?.[bid.adUnitCode],
          performance: rtdData.performance
        }
      }
    }));
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
  try {
    const {
      adUnitCode, adUnitId, auctionId, bidder, cpm, currency, originalCpm, originalCurrency, size, vbid, vid,
    } = bid;

    // Update historical and session data
    _VALUAD.updateHistoricalData({
      revenue: (_VALUAD.get('historical')?.revenue || 0) + cpm,
      adImpressions: {
        [adUnitCode]: (_VALUAD.get('historical')?.adImpressions?.[adUnitCode] || 0) + 1
      }
    });

    _VALUAD.updateSessionData({
      revenue: (_VALUAD.get('session')?.revenue || 0) + cpm,
      adImpressions: {
        [adUnitCode]: (_VALUAD.get('session')?.adImpressions?.[adUnitCode] || 0) + 1
      }
    });

    // Send win notification
    const bidStr = JSON.stringify({
      adUnitCode, adUnitId, auctionId, bidder, cpm, currency, originalCpm, originalCurrency, size, vbid, vid,
    });
    const encodedBidStr = window.btoa(bidStr);
    triggerPixel(WON_URL + '?b=' + encodedBidStr);
  } catch (e) {
    logInfo('Valuad: Error in onBidWon', e);
  }
};

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

// Add RTD configuration getter
function getRtdConfig() {
  return config.getConfig('valuad.rtd') || DEFAULT_RTD_CONFIG;
}

// Add this function to collect more RTD data
function collectRtdData() {
  return {
    page: {
      dimensions: `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location.href,
      title: document.title,
      keywords: Array.from(document.getElementsByTagName('meta'))
        .filter(meta => meta.name === 'keywords')
        .map(meta => meta.content)
        .join(','),
      loadTime: window.performance?.timing?.domContentLoadedEventEnd - window.performance?.timing?.navigationStart,
      referrer: document.referrer
    },
    user: {
      timestamp: Math.floor(Date.now() / 1000),
      language: navigator.language,
      userAgent: navigator.userAgent
    },
    session: {
      id: _VALUAD.sessionId,
      pageviews: _VALUAD.userActivity.pageviewCount,
      duration: Date.now() - _VALUAD.sessionStartTime,
      lastActivity: _VALUAD.userActivity.lastActivityTime
    },
    performance: {
      navigationStart: window.performance?.timing?.navigationStart,
      domInteractive: window.performance?.timing?.domInteractive,
      domComplete: window.performance?.timing?.domComplete,
      loadEventEnd: window.performance?.timing?.loadEventEnd
    }
  };
}

// Add viewability tracking function
function trackViewability(adUnitCode) {
  if ('IntersectionObserver' in window) {
    const element = document.getElementById(adUnitCode);
    if (!element) return null;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const viewabilityData = {
          inView: entry.isIntersecting,
          visibleRatio: entry.intersectionRatio,
          time: Date.now(),
          adUnitCode: adUnitCode
        };

        _VALUAD.update('viewabilityData', {
          [adUnitCode]: viewabilityData
        });
      });
    }, {
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    observer.observe(element);
    return observer;
  }
  return null;
}

// Add event tracking
function initRtdEventListeners() {
  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    maxScroll = Math.max(maxScroll, scrollPercent);
    _VALUAD.userActivity.maxScroll = maxScroll;
  });

  // Track time on page
  const startTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const timeOnPage = Date.now() - startTime;
    _VALUAD.userActivity.timeOnPage = timeOnPage;
  });

  // Track user interactions
  document.addEventListener('click', () => {
    _VALUAD.userActivity.lastActivityTime = Date.now();
    _VALUAD.userActivity.interactions = (_VALUAD.userActivity.interactions || 0) + 1;
  });
}

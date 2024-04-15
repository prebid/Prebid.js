import { ajax } from '../src/ajax.js';
import {
  generateUUID,
  logInfo,
  logError,
  getPerformanceNow,
  isEmpty,
  isEmptyStr,
} from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager, { gdprDataHandler } from '../src/adapterManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { config } from '../src/config.js';

const GVLID = 1122;
const ModuleCode = 'agma';
const analyticsType = 'endpoint';
const scriptVersion = '1.8.0';
const batchDelayInMs = 1000;
const agmaURL = 'https://pbc.agma-analytics.de/v1';
const pageViewId = generateUUID();

// Helper functions
const getScreen = () => {
  const w = window;
  const d = document;
  const e = d.documentElement;
  const g = d.getElementsByTagName('body')[0];
  const x = w.innerWidth || e.clientWidth || g.clientWidth;
  const y = w.innerHeight || e.clientHeight || g.clientHeight;
  return { x, y };
};

const getUserIDs = () => {
  try {
    return getGlobal().getUserIdsAsEids();
  } catch (e) {}
  return [];
};

export const getOrtb2Data = (options) => {
  let site = null;
  let user = null;

  // check if data is provided via config
  if (options.ortb2) {
    if (options.ortb2.user) {
      user = options.ortb2.user;
    }
    if (options.ortb2.site) {
      site = options.ortb2.site;
    }
    if (site && user) {
      return { site, user };
    }
  }
  try {
    const configData = config.getConfig();
    // try to fallback to global config
    if (configData.ortb2) {
      site = site || configData.ortb2.site;
      user = user || configData.ortb2.user;
    }
  } catch (e) {}

  return { site, user };
};

export const getTiming = () => {
  // Timing API V2
  let ttfb = 0;
  try {
    const entry = performance.getEntriesByType('navigation')[0];
    ttfb = Math.round(entry.responseStart - entry.startTime);
  } catch (e) {
    // Timing API V1
    try {
      const entry = performance.timing;
      ttfb = Math.round(entry.responseStart - entry.fetchStart);
    } catch (e) {
      // Timing API not available
      return null;
    }
  }
  const elapsedTime = getPerformanceNow();
  ttfb = ttfb >= 0 && ttfb <= elapsedTime ? ttfb : 0;
  return {
    ttfb,
    elapsedTime,
  };
};

export const getPayload = (auctionIds, options) => {
  if (!options || !auctionIds || auctionIds.length === 0) {
    return false;
  }
  const consentData = gdprDataHandler.getConsentData();
  let gdprApplies = true; // we assume gdpr applies
  let useExtendedPayload = false;
  if (consentData) {
    gdprApplies = consentData.gdprApplies;
    const consents = consentData.vendorData?.vendor?.consents || {};
    useExtendedPayload = consents[GVLID];
  }
  const ortb2 = getOrtb2Data(options);
  const ri = getRefererInfo() || {};

  let payload = {
    auctionIds: auctionIds,
    triggerEvent: options.triggerEvent,
    pageViewId,
    domain: ri.domain,
    gdprApplies,
    code: options.code,
    ortb2: { site: ortb2.site },
    pageUrl: ri.page,
    prebidVersion: '$prebid.version$',
    scriptVersion,
    debug: options.debug,
    timing: getTiming(),
  };

  if (useExtendedPayload) {
    const device = config.getConfig('device') || {};
    const { x, y } = getScreen();
    const userIdsAsEids = getUserIDs();
    payload = {
      ...payload,
      ortb2,
      extended: true,
      timestamp: Date.now(),
      gdprConsentString: consentData.consentString,
      timezoneOffset: new Date().getTimezoneOffset(),
      language: window.navigator.language,
      referrer: ri.topmostLocation,
      pageUrl: ri.page,
      screenWidth: x,
      screenHeight: y,
      deviceWidth: device.w || screen.width,
      deviceHeight: device.h || screen.height,
      userIdsAsEids,
    };
  }
  return payload;
};

const agmaAnalytics = Object.assign(adapter({ analyticsType }), {
  auctionIds: [],
  timer: null,
  track(data) {
    const { eventType, args } = data;
    if (eventType === this.options.triggerEvent && args && args.auctionId) {
      this.auctionIds.push(args.auctionId);
      if (this.timer === null) {
        this.timer = setTimeout(() => {
          this.processBatch();
        }, batchDelayInMs);
      }
    }
  },
  processBatch() {
    const currentBatch = [...this.auctionIds];
    const payload = getPayload(currentBatch, this.options);
    this.auctionIds = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.send(payload);
  },
  send(payload) {
    if (!payload) {
      return;
    }
    return ajax(
      agmaURL,
      () => {
        logInfo(ModuleCode, 'flushed', payload);
      },
      JSON.stringify(payload),
      {
        contentType: 'text/plain',
        method: 'POST',
      }
    );
  },
});

agmaAnalytics.originEnableAnalytics = agmaAnalytics.enableAnalytics;
agmaAnalytics.enableAnalytics = function (config = {}) {
  const { options } = config;

  if (isEmpty(options)) {
    logError(ModuleCode, 'Please set options');
    return false;
  }

  if (options.site && !options.code) {
    logError(ModuleCode, 'Please set `code` - `site` is deprecated');
    options.code = options.site;
  }

  if (!options.code || isEmptyStr(options.code)) {
    logError(ModuleCode, 'Please set `code` option - agma Analytics is disabled');
    return false;
  }

  agmaAnalytics.options = {
    triggerEvent: EVENTS.AUCTION_INIT,
    ...options,
  };

  agmaAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: agmaAnalytics,
  code: ModuleCode,
  gvlid: GVLID,
});

export default agmaAnalytics;

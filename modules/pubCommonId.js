/**
 * This modules adds Publisher Common ID support to prebid.js.  It's a simple numeric id
 * stored in the page's domain.  When the module is included, an id is generated if needed,
 * persisted as a cookie, and automatically appended to all the bidRequest as bid.crumbs.pubcid.
 */
import * as utils from 'src/utils'
import { config } from 'src/config';

const COOKIE_NAME = '_pubcid';
const DEFAULT_EXPIRES = 2628000; // 5-year worth of minutes
const PUB_COMMON = 'PublisherCommonId';

var pubcidEnabled = true;
var interval = DEFAULT_EXPIRES;

export function isPubcidEnabled() { return pubcidEnabled; }
export function getExpInterval() { return interval; }

/**
 * Decorate ad units with pubcid.  This hook function is called before the
 * real pbjs.requestBids is invoked, and can modify its parameter.  The cookie is
 * not updated until this function is called.
 * @param {Object} config This is the same parameter as pbjs.requestBids, and config.adUnits will be updated.
 * @param {function} next The next function in the chain
 */

export function requestBidHook(config, next) {
  let adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
  let pubcid = null;

  // Pass control to the next function if not enabled
  if (!pubcidEnabled) {
    return next.apply(this, arguments);
  }

  if (typeof window[PUB_COMMON] === 'object') {
    // If the page includes its own pubcid object, then use that instead.
    pubcid = window[PUB_COMMON].getId();
    utils.logMessage(PUB_COMMON + ': pubcid = ' + pubcid);
  } else {
    // Otherwise get the existing cookie or create a new id
    pubcid = getCookie(COOKIE_NAME) || utils.generateUUID();

    // Update the cookie with the latest expiration date
    setCookie(COOKIE_NAME, pubcid, interval);
    utils.logMessage('pbjs: pubcid = ' + pubcid);
  }

  // Append pubcid to each bid object, which will be incorporated
  // into bid requests later.
  if (adUnits && pubcid) {
    adUnits.forEach((unit) => {
      unit.bids.forEach((bid) => {
        Object.assign(bid, {crumbs: {pubcid}});
      });
    });
  }
  return next.apply(this, arguments);
}

// Helper to set a cookie
export function setCookie(name, value, expires) {
  let expTime = new Date();
  expTime.setTime(expTime.getTime() + expires * 1000 * 60);
  window.document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' +
    expTime.toGMTString();
}

// Helper to read a cookie
export function getCookie(name) {
  let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? decodeURIComponent(m[2]) : null;
}

/**
 * Configuration function
 * @param {boolean} enable Enable or disable pubcid.  By default the module is enabled.
 * @param {number} expInterval Expiration interval of the cookie in minutes.
 */

export function setConfig({ enable = true, expInterval = DEFAULT_EXPIRES } = {}) {
  pubcidEnabled = enable;
  interval = parseInt(expInterval, 10);
  if (isNaN(interval)) {
    interval = DEFAULT_EXPIRES;
  }
}

/**
 * Initialize module by 1) subscribe to configuration changes and 2) register hook
 */
export function initPubcid() {
  config.getConfig('pubcid', config => setConfig(config.pubcid));

  if (utils.cookiesAreEnabled()) {
    if (!getCookie('_pubcid_optout')) {
      $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook);
    }
  }
}

initPubcid();

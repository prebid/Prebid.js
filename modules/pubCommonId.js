/**
 * This modules adds Publisher Common ID support to prebid.js.  It's a simple numeric id
 * stored in the page's domain.  When the module is included, an id is generated if needed,
 * persisted as a cookie, and automatically appended to all the bidRequest as bid.crumbs.pubcid.
 */
import { logMessage, parseUrl, buildUrl, triggerPixel, generateUUID, isArray } from '../src/utils.js';
import { config } from '../src/config.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

const ID_NAME = '_pubcid';
const OPTOUT_NAME = '_pubcid_optout';
const DEFAULT_EXPIRES = 525600; // 1-year worth of minutes
const PUB_COMMON = 'PublisherCommonId';
const EXP_SUFFIX = '_exp';
const COOKIE = 'cookie';
const LOCAL_STORAGE = 'html5';

let pubcidConfig = {
  enabled: true,
  interval: DEFAULT_EXPIRES,
  typeEnabled: LOCAL_STORAGE,
  create: true,
  extend: true,
  pixelUrl: ''
};

/**
 * Set an item in the storage with expiry time.
 * @param {string} key Key of the item to be stored
 * @param {string} val Value of the item to be stored
 * @param {number} expires Expiry time in minutes
 */

export function setStorageItem(key, val, expires) {
  try {
    if (expires !== undefined && expires != null) {
      const expStr = (new Date(Date.now() + (expires * 60 * 1000))).toUTCString();
      storage.setDataInLocalStorage(key + EXP_SUFFIX, expStr);
    }

    storage.setDataInLocalStorage(key, val);
  } catch (e) {
    logMessage(e);
  }
}

/**
 * Retrieve an item from storage if it exists and hasn't expired.
 * @param {string} key Key of the item.
 * @returns {string|null} Value of the item.
 */
export function getStorageItem(key) {
  let val = null;

  try {
    const expVal = storage.getDataFromLocalStorage(key + EXP_SUFFIX);

    if (!expVal) {
      // If there is no expiry time, then just return the item
      val = storage.getDataFromLocalStorage(key);
    } else {
      // Only return the item if it hasn't expired yet.
      // Otherwise delete the item.
      const expDate = new Date(expVal);
      const isValid = (expDate.getTime() - Date.now()) > 0;
      if (isValid) {
        val = storage.getDataFromLocalStorage(key);
      } else {
        removeStorageItem(key);
      }
    }
  } catch (e) {
    logMessage(e);
  }

  return val;
}

/**
 * Remove an item from storage
 * @param {string} key Key of the item to be removed
 */
export function removeStorageItem(key) {
  try {
    storage.removeDataFromLocalStorage(key + EXP_SUFFIX);
    storage.removeDataFromLocalStorage(key);
  } catch (e) {
    logMessage(e);
  }
}

/**
 * Read a value either from cookie or local storage
 * @param {string} name Name of the item
 * @param {string} type storage type override
 * @returns {string|null} a string if item exists
 */
function readValue(name, type) {
  let value;
  if (!type) { type = pubcidConfig.typeEnabled; }
  if (type === COOKIE) {
    value = storage.getCookie(name);
  } else if (type === LOCAL_STORAGE) {
    value = getStorageItem(name);
  }

  if (value === 'undefined' || value === 'null') { return null; }

  return value;
}

/**
 * Write a value to either cookies or local storage
 * @param {string} name Name of the item
 * @param {string} value Value to be stored
 * @param {number} expInterval Expiry time in minutes
 */
function writeValue(name, value, expInterval) {
  if (name && value) {
    if (pubcidConfig.typeEnabled === COOKIE) {
      setCookie(name, value, expInterval, 'Lax');
    } else if (pubcidConfig.typeEnabled === LOCAL_STORAGE) {
      setStorageItem(name, value, expInterval);
    }
  }
}

/**
 * Add a callback at end of auction to fetch a pixel
 * @param {string} pixelUrl Pixel URL
 * @param {string} id pubcid
 * @returns {boolean} True if callback is queued
 */
function queuePixelCallback(pixelUrl, id) {
  if (!pixelUrl) { return false; }

  id = id || '';

  // Use pubcid as a cache buster
  const urlInfo = parseUrl(pixelUrl);
  urlInfo.search.id = encodeURIComponent('pubcid:' + id);
  const targetUrl = buildUrl(urlInfo);

  events.on(CONSTANTS.EVENTS.AUCTION_END, function auctionEndHandler() {
    events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
    triggerPixel(targetUrl);
  });

  return true;
}

export function isPubcidEnabled() { return pubcidConfig.enabled; }
export function getExpInterval() { return pubcidConfig.interval; }
export function getPubcidConfig() { return pubcidConfig; }

/**
 * Decorate ad units with pubcid.  This hook function is called before the
 * real pbjs.requestBids is invoked, and can modify its parameter.  The cookie is
 * not updated until this function is called.
 * @param {Object} config This is the same parameter as pbjs.requestBids, and config.adUnits will be updated.
 * @param {function} next The next function in the chain
 */

export function requestBidHook(next, config) {
  let adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
  let pubcid = null;

  // Pass control to the next function if not enabled
  if (!pubcidConfig.enabled || !pubcidConfig.typeEnabled) {
    return next.call(this, config);
  }

  if (typeof window[PUB_COMMON] === 'object') {
    // If the page includes its own pubcid object, then use that instead.
    pubcid = window[PUB_COMMON].getId();
    logMessage(PUB_COMMON + ': pubcid = ' + pubcid);
  } else {
    // Otherwise get the existing cookie
    pubcid = readValue(ID_NAME);

    if (!pubcid) {
      if (pubcidConfig.create) {
        // Special handling for local storage to retain previously stored id in cookies
        if (pubcidConfig.typeEnabled === LOCAL_STORAGE) {
          pubcid = readValue(ID_NAME, COOKIE);
        }
        // Generate a new id
        if (!pubcid) {
          pubcid = generateUUID();
        }
        // Update the cookie/storage with the latest expiration date
        writeValue(ID_NAME, pubcid, pubcidConfig.interval);
        // Only return pubcid if it is saved successfully
        pubcid = readValue(ID_NAME);
      }
      queuePixelCallback(pubcidConfig.pixelUrl, pubcid);
    } else if (pubcidConfig.extend) {
      // Update the cookie/storage with the latest expiration date
      if (!queuePixelCallback(pubcidConfig.pixelUrl, pubcid)) {
        writeValue(ID_NAME, pubcid, pubcidConfig.interval);
      }
    }

    logMessage('pbjs: pubcid = ' + pubcid);
  }

  // Append pubcid to each bid object, which will be incorporated
  // into bid requests later.
  if (adUnits && pubcid) {
    adUnits.forEach((unit) => {
      if (unit.bids && isArray(unit.bids)) {
        unit.bids.forEach((bid) => {
          Object.assign(bid, {crumbs: {pubcid}});
        });
      }
    });
  }

  return next.call(this, config);
}

// Helper to set a cookie
export function setCookie(name, value, expires, sameSite) {
  let expTime = new Date();
  expTime.setTime(expTime.getTime() + expires * 1000 * 60);
  storage.setCookie(name, value, expTime.toGMTString(), sameSite);
}

// Helper to read a cookie
export function getCookie(name) {
  return storage.getCookie(name);
}

/**
 * Configuration function
 * @param {boolean} enable Enable or disable pubcid.  By default the module is enabled.
 * @param {number} expInterval Expiration interval of the cookie in minutes.
 * @param {string} type Type of storage to use
 * @param {boolean} create Create the id if missing.  Default is true.
 * @param {boolean} extend Extend the stored value when id is retrieved.  Default is true.
 * @param {string} pixelUrl A pixel URL back to the publisher's own domain that may modify cookie attributes.
 */

export function setConfig({ enable, expInterval, type = 'html5,cookie', create, extend, pixelUrl } = {}) {
  if (enable !== undefined) { pubcidConfig.enabled = enable; }

  if (expInterval !== undefined) { pubcidConfig.interval = parseInt(expInterval, 10); }

  if (isNaN(pubcidConfig.interval)) {
    pubcidConfig.interval = DEFAULT_EXPIRES;
  }

  if (create !== undefined) { pubcidConfig.create = create; }
  if (extend !== undefined) { pubcidConfig.extend = extend; }
  if (pixelUrl !== undefined) { pubcidConfig.pixelUrl = pixelUrl; }

  // Default is to use local storage. Fall back to
  // cookie only if local storage is not supported.

  pubcidConfig.typeEnabled = null;

  const typeArray = type.split(',');
  for (let i = 0; i < typeArray.length; ++i) {
    const name = typeArray[i].trim();
    if (name === COOKIE) {
      if (storage.cookiesAreEnabled()) {
        pubcidConfig.typeEnabled = COOKIE;
        break;
      }
    } else if (name === LOCAL_STORAGE) {
      if (storage.hasLocalStorage()) {
        pubcidConfig.typeEnabled = LOCAL_STORAGE;
        break;
      }
    }
  }
}

/**
 * Initialize module by 1) subscribe to configuration changes and 2) register hook
 */
export function initPubcid() {
  config.getConfig('pubcid', config => setConfig(config.pubcid));

  const optout = (storage.cookiesAreEnabled() && readValue(OPTOUT_NAME, COOKIE)) ||
    (storage.hasLocalStorage() && readValue(OPTOUT_NAME, LOCAL_STORAGE));

  if (!optout) {
    $$PREBID_GLOBAL$$.requestBids.before(requestBidHook);
  }
}

initPubcid();

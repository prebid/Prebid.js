/**
 * This module adds User ID support to prebid.js
 * @module modules/userId
 */

/**
 * @interface Submodule
 */

/**
 * @function
 * @summary performs action to obtain id and return a value in the callback's response argument.
 *  If IdResponse#id is defined, then it will be written to the current active storage.
 *  If IdResponse#callback is defined, then it'll called at the end of auction.
 *  It's permissible to return neither, one, or both fields.
 * @name Submodule#getId
 * @param {SubmoduleConfig} config
 * @param {ConsentData|undefined} consentData
 * @param {(Object|undefined)} cacheIdObj
 * @return {(IdResponse|undefined)} A response object that contains id and/or callback.
 */

/**
 * @function
 * @summary Similar to Submodule#getId, this optional method returns response to for id that exists already.
 *  If IdResponse#id is defined, then it will be written to the current active storage even if it exists already.
 *  If IdResponse#callback is defined, then it'll called at the end of auction.
 *  It's permissible to return neither, one, or both fields.
 * @name Submodule#extendId
 * @param {SubmoduleConfig} config
 * @param {ConsentData|undefined} consentData
 * @param {Object} storedId - existing id, if any
 * @return {(IdResponse|function(callback:function))} A response object that contains id and/or callback.
 */

/**
 * @function
 * @summary decode a stored value for passing to bid requests
 * @name Submodule#decode
 * @param {Object|string} value
 * @param {SubmoduleConfig|undefined} config
 * @return {(Object|undefined)}
 */

/**
 * @property
 * @summary used to link submodule with config
 * @name Submodule#name
 * @type {string}
 */

/**
 * @property
 * @summary use a predefined domain override for cookies or provide your own
 * @name Submodule#domainOverride
 * @type {(undefined|function)}
 */

/**
 * @function
 * @summary Returns the root domain
 * @name Submodule#findRootDomain
 * @returns {string}
 */

/**
 * @typedef {Object} SubmoduleConfig
 * @property {string} name - the User ID submodule name (used to link submodule with config)
 * @property {(SubmoduleStorage|undefined)} storage - browser storage config
 * @property {(SubmoduleParams|undefined)} params - params config for use by the submodule.getId function
 * @property {(Object|undefined)} value - if not empty, this value is added to bid requests for access in adapters
 */

/**
 * @typedef {Object} SubmoduleStorage
 * @property {string} type - browser storage type (html5 or cookie)
 * @property {string} name - key name to use when saving/reading to local storage or cookies
 * @property {number} expires - time to live for browser storage in days
 * @property {(number|undefined)} refreshInSeconds - if not empty, this value defines the maximum time span in seconds before refreshing user ID stored in browser
 */

/**
 * @typedef {Object} LiveIntentCollectConfig
 * @property {(string|undefined)} fpiStorageStrategy - defines whether the first party identifiers that LiveConnect creates and updates are stored in a cookie jar, local storage, or not created at all
 * @property {(number|undefined)} fpiExpirationDays - the expiration time of an identifier created and updated by LiveConnect
 * @property {(string|undefined)} collectorUrl - defines where the LiveIntentId signal pixels are pointing to
 * @property {(string|undefined)} appId - the  unique identifier of the application in question
 */

/**
 * @typedef {Object} SubmoduleParams
 * @property {(string|undefined)} partner - partner url param value
 * @property {(string|undefined)} url - webservice request url used to load Id data
 * @property {(string|undefined)} pixelUrl - publisher pixel to extend/modify cookies
 * @property {(boolean|undefined)} create - create id if missing.  default is true.
 * @property {(boolean|undefined)} extend - extend expiration time on each access.  default is false.
 * @property {(string|undefined)} pid - placement id url param value
 * @property {(string|undefined)} publisherId - the unique identifier of the publisher in question
 * @property {(string|undefined)} ajaxTimeout - the number of milliseconds a resolution request can take before automatically being terminated
 * @property {(array|undefined)} identifiersToResolve - the identifiers from either ls|cookie to be attached to the getId query
 * @property {(LiveIntentCollectConfig|undefined)} liCollectConfig - the config for LiveIntent's collect requests
 * @property {(string|undefined)} pd - publisher provided data for reconciling ID5 IDs
 * @property {(string|undefined)} emailHash - if provided, the hashed email address of a user
 * @property {(string|undefined)} notUse3P - use to retrieve envelope from 3p endpoint
 */

/**
 * @typedef {Object} SubmoduleContainer
 * @property {Submodule} submodule
 * @property {SubmoduleConfig} config
 * @property {(Object|undefined)} idObj - cache decoded id value (this is copied to every adUnit bid)
 * @property {(function|undefined)} callback - holds reference to submodule.getId() result if it returned a function. Will be set to undefined after callback executes
 */

/**
 * @typedef {Object} ConsentData
 * @property {(string|undefined)} consentString
 * @property {(Object|undefined)} vendorData
 * @property {(boolean|undefined)} gdprApplies
 */

/**
 * @typedef {Object} IdResponse
 * @property {(Object|undefined)} id - id data
 * @property {(function|undefined)} callback - function that will return an id
 */

import {find, includes} from '../../src/polyfill.js';
import {config} from '../../src/config.js';
import * as events from '../../src/events.js';
import {getGlobal} from '../../src/prebidGlobal.js';
import {gdprDataHandler} from '../../src/adapterManager.js';
import CONSTANTS from '../../src/constants.json';
import {hook, module, ready as hooksReady} from '../../src/hook.js';
import {buildEidPermissions, createEidsArray, USER_IDS_CONFIG} from './eids.js';
import {getCoreStorageManager} from '../../src/storageManager.js';
import {
  cyrb53Hash,
  deepAccess,
  delayExecution,
  getPrebidInternal,
  isArray,
  isEmptyStr,
  isFn,
  isGptPubadsDefined,
  isNumber,
  isPlainObject,
  logError,
  logInfo,
  logWarn,
  timestamp,
  isEmpty
} from '../../src/utils.js';
import {getPPID as coreGetPPID} from '../../src/adserver.js';
import {defer, GreedyPromise} from '../../src/utils/promise.js';
import {hasPurpose1Consent} from '../../src/utils/gpdr.js';

const MODULE_NAME = 'User ID';
const COOKIE = 'cookie';
const LOCAL_STORAGE = 'html5';
const DEFAULT_SYNC_DELAY = 500;
const NO_AUCTION_DELAY = 0;
const CONSENT_DATA_COOKIE_STORAGE_CONFIG = {
  name: '_pbjs_userid_consent_data',
  expires: 30 // 30 days expiration, which should match how often consent is refreshed by CMPs
};
export const PBJS_USER_ID_OPTOUT_NAME = '_pbjs_id_optout';
export const coreStorage = getCoreStorageManager('userid');

/** @type {string[]} */
let validStorageTypes = [];

/** @type {boolean} */
let addedUserIdHook = false;

/** @type {SubmoduleContainer[]} */
let submodules = [];

/** @type {SubmoduleContainer[]} */
let initializedSubmodules;

/** @type {SubmoduleConfig[]} */
let configRegistry = [];

/** @type {Submodule[]} */
let submoduleRegistry = [];

/** @type {(number|undefined)} */
let timeoutID;

/** @type {(number|undefined)} */
export let syncDelay;

/** @type {(number|undefined)} */
export let auctionDelay;

/** @type {(string|undefined)} */
let ppidSource;

let configListener;

/** @param {Submodule[]} submodules */
export function setSubmoduleRegistry(submodules) {
  submoduleRegistry = submodules;
}

/**
 * @param {SubmoduleContainer} submodule
 * @param {(Object|string)} value
 */
export function setStoredValue(submodule, value) {
  /**
   * @type {SubmoduleStorage}
   */
  const storage = submodule.config.storage;
  const domainOverride = (typeof submodule.submodule.domainOverride === 'function') ? submodule.submodule.domainOverride() : null;

  try {
    const valueStr = isPlainObject(value) ? JSON.stringify(value) : value;
    const expiresStr = (new Date(Date.now() + (storage.expires * (60 * 60 * 24 * 1000)))).toUTCString();
    if (storage.type === COOKIE) {
      coreStorage.setCookie(storage.name, valueStr, expiresStr, 'Lax', domainOverride);
      if (typeof storage.refreshInSeconds === 'number') {
        coreStorage.setCookie(`${storage.name}_last`, new Date().toUTCString(), expiresStr, 'Lax', domainOverride);
      }
    } else if (storage.type === LOCAL_STORAGE) {
      coreStorage.setDataInLocalStorage(`${storage.name}_exp`, expiresStr);
      coreStorage.setDataInLocalStorage(storage.name, encodeURIComponent(valueStr));
      if (typeof storage.refreshInSeconds === 'number') {
        coreStorage.setDataInLocalStorage(`${storage.name}_last`, new Date().toUTCString());
      }
    }
  } catch (error) {
    logError(error);
  }
}

function setPrebidServerEidPermissions(initializedSubmodules) {
  let setEidPermissions = getPrebidInternal().setEidPermissions;
  if (typeof setEidPermissions === 'function' && isArray(initializedSubmodules)) {
    setEidPermissions(buildEidPermissions(initializedSubmodules));
  }
}

/**
/**
 * @param {SubmoduleStorage} storage
 * @param {String|undefined} key optional key of the value
 * @returns {string}
 */
function getStoredValue(storage, key = undefined) {
  const storedKey = key ? `${storage.name}_${key}` : storage.name;
  let storedValue;
  try {
    if (storage.type === COOKIE) {
      storedValue = coreStorage.getCookie(storedKey);
    } else if (storage.type === LOCAL_STORAGE) {
      const storedValueExp = coreStorage.getDataFromLocalStorage(`${storage.name}_exp`);
      // empty string means no expiration set
      if (storedValueExp === '') {
        storedValue = coreStorage.getDataFromLocalStorage(storedKey);
      } else if (storedValueExp) {
        if ((new Date(storedValueExp)).getTime() - Date.now() > 0) {
          storedValue = decodeURIComponent(coreStorage.getDataFromLocalStorage(storedKey));
        }
      }
    }
    // support storing a string or a stringified object
    if (typeof storedValue === 'string' && storedValue.trim().charAt(0) === '{') {
      storedValue = JSON.parse(storedValue);
    }
  } catch (e) {
    logError(e);
  }
  return storedValue;
}

/**
 * makes an object that can be stored with only the keys we need to check.
 * excluding the vendorConsents object since the consentString is enough to know
 * if consent has changed without needing to have all the details in an object
 * @param consentData
 * @returns {{apiVersion: number, gdprApplies: boolean, consentString: string}}
 */
function makeStoredConsentDataHash(consentData) {
  const storedConsentData = {
    consentString: '',
    gdprApplies: false,
    apiVersion: 0
  };

  if (consentData) {
    storedConsentData.consentString = consentData.consentString;
    storedConsentData.gdprApplies = consentData.gdprApplies;
    storedConsentData.apiVersion = consentData.apiVersion;
  }

  return cyrb53Hash(JSON.stringify(storedConsentData));
}

/**
 * puts the current consent data into cookie storage
 * @param consentData
 */
export function setStoredConsentData(consentData) {
  try {
    const expiresStr = (new Date(Date.now() + (CONSENT_DATA_COOKIE_STORAGE_CONFIG.expires * (60 * 60 * 24 * 1000)))).toUTCString();
    coreStorage.setCookie(CONSENT_DATA_COOKIE_STORAGE_CONFIG.name, makeStoredConsentDataHash(consentData), expiresStr, 'Lax');
  } catch (error) {
    logError(error);
  }
}

/**
 * get the stored consent data from local storage, if any
 * @returns {string}
 */
function getStoredConsentData() {
  try {
    return coreStorage.getCookie(CONSENT_DATA_COOKIE_STORAGE_CONFIG.name);
  } catch (e) {
    logError(e);
  }
}

/**
 * test if the consent object stored locally matches the current consent data. if they
 * don't match or there is nothing stored locally, it means a refresh of the user id
 * submodule is needed
 * @param storedConsentData
 * @param consentData
 * @returns {boolean}
 */
function storedConsentDataMatchesConsentData(storedConsentData, consentData) {
  return (
    typeof storedConsentData !== 'undefined' &&
    storedConsentData !== null &&
    storedConsentData === makeStoredConsentDataHash(consentData)
  );
}

/**
   * Find the root domain
   * @param {string|undefined} fullDomain
   * @return {string}
   */
export function findRootDomain(fullDomain = window.location.hostname) {
  if (!coreStorage.cookiesAreEnabled()) {
    return fullDomain;
  }

  const domainParts = fullDomain.split('.');
  if (domainParts.length == 2) {
    return fullDomain;
  }
  let rootDomain;
  let continueSearching;
  let startIndex = -2;
  const TEST_COOKIE_NAME = `_rdc${Date.now()}`;
  const TEST_COOKIE_VALUE = 'writeable';
  do {
    rootDomain = domainParts.slice(startIndex).join('.');
    let expirationDate = new Date(timestamp() + 10 * 1000).toUTCString();

    // Write a test cookie
    coreStorage.setCookie(
      TEST_COOKIE_NAME,
      TEST_COOKIE_VALUE,
      expirationDate,
      'Lax',
      rootDomain,
      undefined
    );

    // See if the write was successful
    const value = coreStorage.getCookie(TEST_COOKIE_NAME, undefined);
    if (value === TEST_COOKIE_VALUE) {
      continueSearching = false;
      // Delete our test cookie
      coreStorage.setCookie(
        TEST_COOKIE_NAME,
        '',
        'Thu, 01 Jan 1970 00:00:01 GMT',
        undefined,
        rootDomain,
        undefined
      );
    } else {
      startIndex += -1;
      continueSearching = Math.abs(startIndex) <= domainParts.length;
    }
  } while (continueSearching);
  return rootDomain;
}

/**
 * @param {SubmoduleContainer[]} submodules
 * @param {function} cb - callback for after processing is done.
 */
function processSubmoduleCallbacks(submodules, cb) {
  let done = () => {};
  if (cb) {
    done = delayExecution(() => {
      clearTimeout(timeoutID);
      cb();
    }, submodules.length);
  }
  submodules.forEach(function (submodule) {
    function callbackCompleted(idObj) {
      // if valid, id data should be saved to cookie/html storage
      if (idObj) {
        if (submodule.config.storage) {
          setStoredValue(submodule, idObj);
        }
        // cache decoded value (this is copied to every adUnit bid)
        submodule.idObj = submodule.submodule.decode(idObj, submodule.config);
      } else {
        logInfo(`${MODULE_NAME}: ${submodule.submodule.name} - request id responded with an empty value`);
      }
      done();
    }
    try {
      submodule.callback(callbackCompleted);
    } catch (e) {
      logError(`Error in userID module '${submodule.submodule.name}':`, e);
      done();
    }
    // clear callback, this prop is used to test if all submodule callbacks are complete below
    submodule.callback = undefined;
  });
}

/**
 * This function will create a combined object for all subModule Ids
 * @param {SubmoduleContainer[]} submodules
 */
function getCombinedSubmoduleIds(submodules) {
  if (!Array.isArray(submodules) || !submodules.length) {
    return {};
  }
  const combinedSubmoduleIds = submodules.filter(i => isPlainObject(i.idObj) && Object.keys(i.idObj).length).reduce((carry, i) => {
    Object.keys(i.idObj).forEach(key => {
      carry[key] = i.idObj[key];
    });
    return carry;
  }, {});

  return combinedSubmoduleIds;
}

/**
 * This function will return a submodule ID object for particular source name
 * @param {SubmoduleContainer[]} submodules
 * @param {string} sourceName
 */
function getSubmoduleId(submodules, sourceName) {
  if (!Array.isArray(submodules) || !submodules.length) {
    return {};
  }
  const submodule = submodules.filter(sub => isPlainObject(sub.idObj) &&
    Object.keys(sub.idObj).length && USER_IDS_CONFIG[Object.keys(sub.idObj)[0]]?.source === sourceName);
  return !isEmpty(submodule) ? submodule[0].idObj : [];
}

/**
 * This function will create a combined object for bidder with allowed subModule Ids
 * @param {SubmoduleContainer[]} submodules
 * @param {string} bidder
 */
function getCombinedSubmoduleIdsForBidder(submodules, bidder) {
  if (!Array.isArray(submodules) || !submodules.length || !bidder) {
    return {};
  }
  return submodules
    .filter(i => !i.config.bidders || !isArray(i.config.bidders) || includes(i.config.bidders, bidder))
    .filter(i => isPlainObject(i.idObj) && Object.keys(i.idObj).length)
    .reduce((carry, i) => {
      Object.keys(i.idObj).forEach(key => {
        carry[key] = i.idObj[key];
      });
      return carry;
    }, {});
}

/**
 * @param {AdUnit[]} adUnits
 * @param {SubmoduleContainer[]} submodules
 */
function addIdDataToAdUnitBids(adUnits, submodules) {
  if ([adUnits].some(i => !Array.isArray(i) || !i.length)) {
    return;
  }
  adUnits.forEach(adUnit => {
    if (adUnit.bids && isArray(adUnit.bids)) {
      adUnit.bids.forEach(bid => {
        const combinedSubmoduleIds = getCombinedSubmoduleIdsForBidder(submodules, bid.bidder);
        if (Object.keys(combinedSubmoduleIds).length) {
          // create a User ID object on the bid,
          bid.userId = combinedSubmoduleIds;
          bid.userIdAsEids = createEidsArray(combinedSubmoduleIds);
        }
      });
    }
  });
}

const INIT_CANCELED = {};

function idSystemInitializer({delay = GreedyPromise.timeout} = {}) {
  const startInit = defer();
  const startCallbacks = defer();
  let cancel;
  let initialized = false;

  function cancelAndTry(promise) {
    if (cancel != null) {
      cancel.reject(INIT_CANCELED);
    }
    cancel = defer();
    return GreedyPromise.race([promise, cancel.promise]);
  }

  // grab a reference to global vars so that the promise chains remain isolated;
  // multiple calls to `init` (from tests) might otherwise cause them to interfere with each other
  let initModules = initializedSubmodules;
  let allModules = submodules;

  function checkRefs(fn) {
    // unfortunately tests have their own global state that needs to be guarded, so even if we keep ours tidy,
    // we cannot let things like submodule callbacks run (they pollute things like the global `server` XHR mock)
    return function(...args) {
      if (initModules === initializedSubmodules && allModules === submodules) {
        return fn(...args);
      }
    }
  }

  let done = cancelAndTry(
    GreedyPromise.all([hooksReady, startInit.promise])
      .then(() => gdprDataHandler.promise)
      .then(checkRefs((consentData) => {
        initSubmodules(initModules, allModules, consentData);
      }))
      .then(() => startCallbacks.promise)
      .then(checkRefs(() => {
        const modWithCb = initModules.filter(item => isFn(item.callback));
        if (modWithCb.length) {
          return new GreedyPromise((resolve) => processSubmoduleCallbacks(modWithCb, resolve));
        }
      }))
  );

  /**
   * with `ready` = true, starts initialization; with `refresh` = true, reinitialize submodules (optionally
   * filtered by `submoduleNames`).
   */
  return function ({refresh = false, submoduleNames = null, ready = false} = {}) {
    if (ready && !initialized) {
      initialized = true;
      startInit.resolve();
      // submodule callbacks should run immediately if `auctionDelay` > 0, or `syncDelay` ms after the
      // auction ends otherwise
      if (auctionDelay > 0) {
        startCallbacks.resolve();
      } else {
        events.on(CONSTANTS.EVENTS.AUCTION_END, function auctionEndHandler() {
          events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
          delay(syncDelay).then(startCallbacks.resolve);
        });
      }
    }
    if (refresh && initialized) {
      done = cancelAndTry(
        done
          .catch(() => null)
          .then(() => gdprDataHandler.promise) // fetch again in case a refresh was forced before this was resolved
          .then(checkRefs((consentData) => {
            const cbModules = initSubmodules(
              initModules,
              allModules.filter((sm) => submoduleNames == null || submoduleNames.includes(sm.submodule.name)),
              consentData,
              true
            ).filter((sm) => {
              return sm.callback != null;
            });
            if (cbModules.length) {
              return new GreedyPromise((resolve) => processSubmoduleCallbacks(cbModules, resolve));
            }
          }))
      );
    }
    return done;
  };
}

let initIdSystem;

function getPPID() {
  // userSync.ppid should be one of the 'source' values in getUserIdsAsEids() eg pubcid.org or id5-sync.com
  const matchingUserId = ppidSource && (getUserIdsAsEids() || []).find(userID => userID.source === ppidSource);
  if (matchingUserId && typeof deepAccess(matchingUserId, 'uids.0.id') === 'string') {
    const ppidValue = matchingUserId.uids[0].id.replace(/[\W_]/g, '');
    if (ppidValue.length >= 32 && ppidValue.length <= 150) {
      return ppidValue;
    } else {
      logWarn(`User ID - Googletag Publisher Provided ID for ${ppidSource} is not between 32 and 150 characters - ${ppidValue}`);
    }
  }
}

/**
 * Hook is executed before adapters, but after consentManagement. Consent data is requied because
 * this module requires GDPR consent with Purpose #1 to save data locally.
 * The two main actions handled by the hook are:
 * 1. check gdpr consentData and handle submodule initialization.
 * 2. append user id data (loaded from cookied/html or from the getId method) to bids to be accessed in adapters.
 * @param {Object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export function requestBidsHook(fn, reqBidsConfigObj, {delay = GreedyPromise.timeout} = {}) {
  GreedyPromise.race([
    getUserIdsAsync(),
    delay(auctionDelay)
  ]).then(() => {
    // pass available user id data to bid adapters
    addIdDataToAdUnitBids(reqBidsConfigObj.adUnits || getGlobal().adUnits, initializedSubmodules);
    const ppid = getPPID();
    if (ppid) {
      if (isGptPubadsDefined()) {
        window.googletag.pubads().setPublisherProvidedId(ppid);
      } else {
        window.googletag = window.googletag || {};
        window.googletag.cmd = window.googletag.cmd || [];
        window.googletag.cmd.push(function() {
          window.googletag.pubads().setPublisherProvidedId(ppid);
        });
      }
    }

    // calling fn allows prebid to continue processing
    fn.call(this, reqBidsConfigObj);
  });
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */
function getUserIds() {
  return getCombinedSubmoduleIds(initializedSubmodules)
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */
function getUserIdsAsEids() {
  return createEidsArray(getUserIds())
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */

function getUserIdsAsEidBySource(sourceName) {
  return createEidsArray(getSubmoduleId(initializedSubmodules, sourceName))[0];
}

/**
 * This function will be exposed in global-name-space so that userIds for a source can be exposed
 * Sample use case is exposing this function to ESP
 */
function getEncryptedEidsForSource(source, encrypt, customFunction) {
  return initIdSystem().then(() => {
    let eidsSignals = {};

    if (isFn(customFunction)) {
      logInfo(`${MODULE_NAME} - Getting encrypted signal from custom function : ${customFunction.name} & source : ${source} `);
      // Publishers are expected to define a common function which will be proxy for signal function.
      const customSignals = customFunction(source);
      eidsSignals[source] = customSignals ? encryptSignals(customSignals) : null; // by default encrypt using base64 to avoid JSON errors
    } else {
      // initialize signal with eids by default
      const eid = getUserIdsAsEidBySource(source);
      logInfo(`${MODULE_NAME} - Getting encrypted signal for eids :${JSON.stringify(eid)}`);
      if (!isEmpty(eid)) {
        eidsSignals[eid.source] = encrypt === true ? encryptSignals(eid) : eid.uids[0].id; // If encryption is enabled append version (1||) and encrypt entire object
      }
    }
    logInfo(`${MODULE_NAME} - Fetching encrypted eids: ${eidsSignals[source]}`);
    return eidsSignals[source];
  })
}

function encryptSignals(signals, version = 1) {
  let encryptedSig = '';
  switch (version) {
    case 1: // Base64 Encryption
      encryptedSig = typeof signals === 'object' ? window.btoa(JSON.stringify(signals)) : window.btoa(signals); // Test encryption. To be replaced with better algo
      break;
    default:
      break;
  }
  return `${version}||${encryptedSig}`;
}

/**
* This function will be exposed in the global-name-space so that publisher can register the signals-ESP.
*/
function registerSignalSources() {
  if (!isGptPubadsDefined()) {
    return;
  }
  window.googletag.encryptedSignalProviders = window.googletag.encryptedSignalProviders || [];
  const encryptedSignalSources = config.getConfig('userSync.encryptedSignalSources');
  if (encryptedSignalSources) {
    const registerDelay = encryptedSignalSources.registerDelay || 0;
    setTimeout(() => {
      encryptedSignalSources['sources'] && encryptedSignalSources['sources'].forEach(({ source, encrypt, customFunc }) => {
        source.forEach((src) => {
          window.googletag.encryptedSignalProviders.push({
            id: src,
            collectorFunction: () => getEncryptedEidsForSource(src, encrypt, customFunc)
          });
        });
      })
    }, registerDelay)
  } else {
    logWarn(`${MODULE_NAME} - ESP : encryptedSignalSources config not defined under userSync Object`);
  }
}

/**
 * Force (re)initialization of ID submodules.
 *
 * This will force a refresh of the specified ID submodules regardless of `auctionDelay` / `syncDelay` settings, and
 * return a promise that resolves to the same value as `getUserIds()` when the refresh is complete.
 * If a refresh is already in progress, it will be canceled (rejecting promises returned by previous calls to `refreshUserIds`).
 *
 * @param submoduleNames? submodules to refresh. If omitted, refresh all submodules.
 * @param callback? called when the refresh is complete
 */
function refreshUserIds({submoduleNames} = {}, callback) {
  return initIdSystem({refresh: true, submoduleNames})
    .then(() => {
      if (callback && isFn(callback)) {
        callback();
      }
      return getUserIds();
    });
}

/**
 * @returns a promise that resolves to the same value as `getUserIds()`, but only once all ID submodules have completed
 * initialization. This can also be used to synchronize calls to other ID accessors, e.g.
 *
 * ```
 * pbjs.getUserIdsAsync().then(() => {
 *   const eids = pbjs.getUserIdsAsEids(); // guaranteed to be completely initialized at this point
 * });
 * ```
 */

function getUserIdsAsync() {
  return initIdSystem().then(
    () => getUserIds(),
    (e) =>
      e === INIT_CANCELED
        // there's a pending refresh - because GreedyPromise runs this synchronously, we are now in the middle
        // of canceling the previous init, before the refresh logic has had a chance to run.
        // Use a "normal" Promise to clear the stack and let it complete (or this will just recurse infinitely)
        ? Promise.resolve().then(getUserIdsAsync)
        : GreedyPromise.reject(e)
  );
}

/**
 * This hook returns updated list of submodules which are allowed to do get user id based on TCF 2 enforcement rules configured
 */
export const validateGdprEnforcement = hook('sync', function (submodules, consentData) {
  return { userIdModules: submodules, hasValidated: consentData && consentData.hasValidated };
}, 'validateGdprEnforcement');

function populateSubmoduleId(submodule, consentData, storedConsentData, forceRefresh) {
  // There are two submodule configuration types to handle: storage or value
  // 1. storage: retrieve user id data from cookie/html storage or with the submodule's getId method
  // 2. value: pass directly to bids
  if (submodule.config.storage) {
    let storedId = getStoredValue(submodule.config.storage);
    let response;

    let refreshNeeded = false;
    if (typeof submodule.config.storage.refreshInSeconds === 'number') {
      const storedDate = new Date(getStoredValue(submodule.config.storage, 'last'));
      refreshNeeded = storedDate && (Date.now() - storedDate.getTime() > submodule.config.storage.refreshInSeconds * 1000);
    }

    if (!storedId || refreshNeeded || forceRefresh || !storedConsentDataMatchesConsentData(storedConsentData, consentData)) {
      // No id previously saved, or a refresh is needed, or consent has changed. Request a new id from the submodule.
      response = submodule.submodule.getId(submodule.config, consentData, storedId);
    } else if (typeof submodule.submodule.extendId === 'function') {
      // If the id exists already, give submodule a chance to decide additional actions that need to be taken
      response = submodule.submodule.extendId(submodule.config, consentData, storedId);
    }

    if (isPlainObject(response)) {
      if (response.id) {
        // A getId/extendId result assumed to be valid user id data, which should be saved to users local storage or cookies
        setStoredValue(submodule, response.id);
        storedId = response.id;
      }

      if (typeof response.callback === 'function') {
        // Save async callback to be invoked after auction
        submodule.callback = response.callback;
      }
    }

    if (storedId) {
      // cache decoded value (this is copied to every adUnit bid)
      submodule.idObj = submodule.submodule.decode(storedId, submodule.config);
    }
  } else if (submodule.config.value) {
    // cache decoded value (this is copied to every adUnit bid)
    submodule.idObj = submodule.config.value;
  } else {
    const response = submodule.submodule.getId(submodule.config, consentData, undefined);
    if (isPlainObject(response)) {
      if (typeof response.callback === 'function') { submodule.callback = response.callback; }
      if (response.id) { submodule.idObj = submodule.submodule.decode(response.id, submodule.config); }
    }
  }
}

function initSubmodules(dest, submodules, consentData, forceRefresh = false) {
  // gdpr consent with purpose one is required, otherwise exit immediately
  let { userIdModules, hasValidated } = validateGdprEnforcement(submodules, consentData);
  if (!hasValidated && !hasPurpose1Consent(consentData)) {
    logWarn(`${MODULE_NAME} - gdpr permission not valid for local storage or cookies, exit module`);
    return [];
  }

  // we always want the latest consentData stored, even if we don't execute any submodules
  const storedConsentData = getStoredConsentData();
  setStoredConsentData(consentData);

  const initialized = userIdModules.reduce((carry, submodule) => {
    try {
      populateSubmoduleId(submodule, consentData, storedConsentData, forceRefresh);
      carry.push(submodule);
    } catch (e) {
      logError(`Error in userID module '${submodule.submodule.name}':`, e);
    }
    return carry;
  }, []);
  if (initialized.length) {
    setPrebidServerEidPermissions(initialized);
  }
  initialized.forEach(updateInitializedSubmodules.bind(null, dest));
  return initialized;
}

function updateInitializedSubmodules(dest, submodule) {
  let updated = false;
  for (let i = 0; i < dest.length; i++) {
    if (submodule.config.name.toLowerCase() === dest[i].config.name.toLowerCase()) {
      updated = true;
      dest[i] = submodule;
      break;
    }
  }

  if (!updated) {
    dest.push(submodule);
  }
}

/**
 * list of submodule configurations with valid 'storage' or 'value' obj definitions
 * * storage config: contains values for storing/retrieving User ID data in browser storage
 * * value config: object properties that are copied to bids (without saving to storage)
 * @param {SubmoduleConfig[]} configRegistry
 * @param {Submodule[]} submoduleRegistry
 * @param {string[]} activeStorageTypes
 * @returns {SubmoduleConfig[]}
 */
function getValidSubmoduleConfigs(configRegistry, submoduleRegistry, activeStorageTypes) {
  if (!Array.isArray(configRegistry)) {
    return [];
  }
  return configRegistry.reduce((carry, config) => {
    // every submodule config obj must contain a valid 'name'
    if (!config || isEmptyStr(config.name)) {
      return carry;
    }
    // Validate storage config contains 'type' and 'name' properties with non-empty string values
    // 'type' must be a value currently enabled in the browser
    if (config.storage &&
      !isEmptyStr(config.storage.type) &&
      !isEmptyStr(config.storage.name) &&
      activeStorageTypes.indexOf(config.storage.type) !== -1) {
      carry.push(config);
    } else if (isPlainObject(config.value)) {
      carry.push(config);
    } else if (!config.storage && !config.value) {
      carry.push(config);
    }
    return carry;
  }, []);
}

/**
 * update submodules by validating against existing configs and storage types
 */
function updateSubmodules() {
  const configs = getValidSubmoduleConfigs(configRegistry, submoduleRegistry, validStorageTypes);
  if (!configs.length) {
    return;
  }
  // do this to avoid reprocessing submodules
  // TODO: the logic does not match the comment - addedSubmodules is always a copy of submoduleRegistry
  // (if it did it would not be correct - it's not enough to find new modules, as others may have been removed or changed)
  const addedSubmodules = submoduleRegistry.filter(i => !find(submodules, j => j.name === i.name));

  submodules.splice(0, submodules.length);
  // find submodule and the matching configuration, if found create and append a SubmoduleContainer
  addedSubmodules.map(i => {
    const submoduleConfig = find(configs, j => j.name && (j.name.toLowerCase() === i.name.toLowerCase() ||
      (i.aliasName && j.name.toLowerCase() === i.aliasName.toLowerCase())));
    if (submoduleConfig && i.name !== submoduleConfig.name) submoduleConfig.name = i.name;
    i.findRootDomain = findRootDomain;
    return submoduleConfig ? {
      submodule: i,
      config: submoduleConfig,
      callback: undefined,
      idObj: undefined
    } : null;
  }).filter(submodule => submodule !== null)
    .forEach((sm) => submodules.push(sm));

  if (!addedUserIdHook && submodules.length) {
    // priority value 40 will load after consentManagement with a priority of 50
    getGlobal().requestBids.before(requestBidsHook, 40);
    coreGetPPID.after((next) => next(getPPID()));
    logInfo(`${MODULE_NAME} - usersync config updated for ${submodules.length} submodules: `, submodules.map(a => a.submodule.name));
    addedUserIdHook = true;
  }
}

/**
 * enable submodule in User ID
 * @param {Submodule} submodule
 */
export function attachIdSystem(submodule) {
  if (!find(submoduleRegistry, i => i.name === submodule.name)) {
    submoduleRegistry.push(submodule);
    updateSubmodules();
    // TODO: a test case wants this to work even if called after init (the setConfig({userId}))
    // so we trigger a refresh. But is that even possible outside of tests?
    initIdSystem({refresh: true, submoduleNames: [submodule.name]});
  }
}

function normalizePromise(fn) {
  // for public methods that return promises, make sure we return a "normal" one - to avoid
  // exposing confusing stack traces
  return function() {
    return Promise.resolve(fn.apply(this, arguments));
  }
}

/**
 * test browser support for storage config types (local storage or cookie), initializes submodules but consentManagement is required,
 * so a callback is added to fire after the consentManagement module.
 * @param {{getConfig:function}} config
 */
export function init(config, {delay = GreedyPromise.timeout} = {}) {
  ppidSource = undefined;
  submodules = [];
  configRegistry = [];
  addedUserIdHook = false;
  initializedSubmodules = [];
  initIdSystem = idSystemInitializer({delay});
  if (configListener != null) {
    configListener();
  }
  submoduleRegistry = [];

  // list of browser enabled storage types
  validStorageTypes = [
    coreStorage.localStorageIsEnabled() ? LOCAL_STORAGE : null,
    coreStorage.cookiesAreEnabled() ? COOKIE : null
  ].filter(i => i !== null);

  // exit immediately if opt out cookie or local storage keys exists.
  if (validStorageTypes.indexOf(COOKIE) !== -1 && coreStorage.getCookie(PBJS_USER_ID_OPTOUT_NAME)) {
    logInfo(`${MODULE_NAME} - opt-out cookie found, exit module`);
    return;
  }
  if (validStorageTypes.indexOf(LOCAL_STORAGE) !== -1 && coreStorage.getDataFromLocalStorage(PBJS_USER_ID_OPTOUT_NAME)) {
    logInfo(`${MODULE_NAME} - opt-out localStorage found, exit module`);
    return;
  }

  // listen for config userSyncs to be set
  configListener = config.getConfig('userSync', conf => {
    // Note: support for 'usersync' was dropped as part of Prebid.js 4.0
    const userSync = conf.userSync;
    ppidSource = userSync.ppid;
    if (userSync && userSync.userIds) {
      configRegistry = userSync.userIds;
      syncDelay = isNumber(userSync.syncDelay) ? userSync.syncDelay : DEFAULT_SYNC_DELAY;
      auctionDelay = isNumber(userSync.auctionDelay) ? userSync.auctionDelay : NO_AUCTION_DELAY;
      updateSubmodules();
      initIdSystem({ready: true});
    }
  });

  // exposing getUserIds function in global-name-space so that userIds stored in Prebid can be used by external codes.
  (getGlobal()).getUserIds = getUserIds;
  (getGlobal()).getUserIdsAsEids = getUserIdsAsEids;
  (getGlobal()).getEncryptedEidsForSource = normalizePromise(getEncryptedEidsForSource);
  (getGlobal()).registerSignalSources = registerSignalSources;
  (getGlobal()).refreshUserIds = normalizePromise(refreshUserIds);
  (getGlobal()).getUserIdsAsync = normalizePromise(getUserIdsAsync);
  (getGlobal()).getUserIdsAsEidBySource = getUserIdsAsEidBySource;
}

// init config update listener to start the application
init(config);

module('userId', attachIdSystem);

/**
 * This module adds Sirdata provider to the real time data module
 * and now supports Seller Defined Audience
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch segments (user-centric) and categories (page-centric) from Sirdata server
 * The module will automatically handle user's privacy and choice in California (IAB TL CCPA Framework) and in Europe (IAB EU TCF FOR GDPR)
 * @module modules/sirdataRtdProvider
 * @requires module:modules/realTimeData
 */
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import {
  deepAccess, checkCookieSupport, deepSetValue, hasDeviceAccess, inIframe, isEmpty,
  logError, logInfo, mergeDeep
} from '../src/utils.js';
import { findIndex } from '../src/polyfill.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'SirdataRTDModule';
const ORTB2_NAME = 'sirdata.com';
const LOG_PREFIX = 'Sirdata RTD: ';
const EUIDS_STORAGE_NAME = 'SDDAN';
// Get the cookie domain from the referer info or fallback to window location hostname
const cookieDomain = getRefererInfo().domain || window.location.hostname;

/** @type {number} */
const GVLID = 53;

/** @type {object} */
const STORAGE = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });
const bidderAliasRegistry = adapterManager.aliasRegistry || {};
const biddersId = { // Partner IDs mapping for different SSPs and DSPs
  'criteo': 27443,
  'openx': 30342,
  'pubmatic': 30345,
  'smaato': 27520,
  'triplelift': 27518,
  'yahoossp': 30339,
  'rubicon': 27452,
  'appnexus': 27446,
  'gourmetads': 33394,
  'mediasquare': 27878,
  'smartadserver': 27440,
  'proxistore': 27484,
  'ix': 27248,
  'sdRtdForGpt': 27449,
  'smilewanted': 28690,
  'taboola': 33379,
  'ttd': 33382,
  'zeta_global': 33385,
  'teads': 33388,
  'conversant': 33391,
  'improvedigital': 33397,
  'invibes': 33400,
  'sublime': 33403,
  'rtbhouse': 33406,
  'zeta_global_ssp': 33385,
};

const eidsProvidersMap = {
  'id5': 'id5-sync.com',
  'id5id': 'id5-sync.com',
  'id5_id': 'id5-sync.com',
  'pubprovided_id': 'pubProvidedId',
  'ppid': 'pubProvidedId',
  'first-id.fr': 'pubProvidedId',
  'sharedid': 'pubcid.org',
  'publishercommonid': 'pubcid.org',
  'pubcid.org': 'pubcid.org',
}

// params
let params = {
  partnerId: 1,
  key: 1,
  actualUrl: getRefererInfo().stack.pop() || getRefererInfo().page,
  cookieAccessGranted: false,
  setGptKeyValues: true,
  contextualMinRelevancyScore: 30,
  preprod: false,
  authorizedEids: ['pubProvidedId', 'id5-sync.com', 'pubcid.org'],
  avoidPostContent: false,
  sirdataDomain: 'cookieless-data.com',
  bidders: []
};

/**
 * Sets a cookie on the top-level domain
 * @param {string} key - The cookie name
 * @param {string} value - The cookie value
 * @param {string} hostname - The hostname for setting the cookie
 * @param {boolean} deleteCookie - The cookie must be deleted
 * @returns {boolean} - True if the cookie was successfully set, otherwise false
 */
export function setCookieOnTopDomain(key, value, hostname, deleteCookie) {
  const subDomains = hostname.split('.');
  let expTime = new Date();
  expTime.setTime(expTime.getTime() + (deleteCookie ? -1 : 365 * 24 * 60 * 60 * 1000)); // Set expiration time
  for (let i = 0; i < subDomains.length; ++i) {
    // Try to write the cookie on this subdomain (we want it to be stored only on the TLD+1)
    const domain = subDomains.slice(subDomains.length - i - 1).join('.');
    try {
      STORAGE.setCookie(key, value, expTime.toUTCString(), 'Lax', '.' + domain);
      // Try to read the cookie to check if we wrote it
      if (STORAGE.getCookie(key, null) === value) return true; // Check if the cookie was set, and if so top domain was found. If deletion with expire date -1 will parse until complete host
    } catch (e) {
      logError(LOG_PREFIX, e);
    }
  }
  return false;
}

/**
 * Retrieves the UID from storage (cookies or local storage)
 * @returns {Array|null} - Array of UID objects or null if no UID found
 */
export function getUidFromStorage() {
  let cUid = STORAGE.getCookie(EUIDS_STORAGE_NAME, null);
  let lsUid = STORAGE.getDataFromLocalStorage(EUIDS_STORAGE_NAME, null);
  if (cUid && (!lsUid || cUid !== lsUid)) {
    STORAGE.setDataInLocalStorage(EUIDS_STORAGE_NAME, cUid, null);
  } else if (lsUid && !cUid) {
    setCookieOnTopDomain(EUIDS_STORAGE_NAME, lsUid, cookieDomain, false);
    cUid = lsUid;
  }
  return cUid ? [{ source: 'sddan.com', uids: [{ id: cUid, atype: 1 }] }] : null;
}

/**
 * Sets the UID in storage (cookies and local storage)
 * @param {string} sddanId - The UID to be set
 * @returns {boolean} - True if the UID was successfully set, otherwise false
 */
export function setUidInStorage(sddanId) {
  if (!sddanId) return false;
  sddanId = encodeURI(sddanId.toString());
  setCookieOnTopDomain(EUIDS_STORAGE_NAME, sddanId, cookieDomain, false);
  STORAGE.setDataInLocalStorage(EUIDS_STORAGE_NAME, sddanId, null);
  return true;
}

/**
 * Merges and cleans objects from two eids arrays based on the 'source' and unique 'id' within the 'uids' array.
 * Processes each array to add unique items or merge uids if the source already exists.
 * @param {Array} euids1 - The first array to process and merge.
 * @param {Array} euids2 - The second array to process and merge.
 * @returns {Array} The merged array with unique sources and uid ids.
 */
export function mergeEuidsArrays(euids1, euids2) {
  if (isEmpty(euids1)) return euids2;
  if (isEmpty(euids2)) return euids1;
  const mergedArray = [];
  // Helper function to process each array
  const processArray = (array) => {
    array.forEach(item => {
      if (item.uids) {
        const foundIndex = findIndex(mergedArray, function (x) {
          return x.source === item.source;
        });
        if (foundIndex !== -1) {
          // Merge uids if the source is found
          item.uids.forEach(uid => {
            if (!mergedArray[foundIndex].uids.some(u => u.id === uid.id)) {
              mergedArray[foundIndex].uids.push(uid);
            }
          });
        } else {
          // Add the entire item if the source does not exist
          mergedArray.push({ ...item, uids: [...item.uids] });
        }
      }
    });
  };
  // Process both euids1 and euids2
  processArray(euids1);
  processArray(euids2);
  return mergedArray;
}

/**
 * Handles data deletion request by removing stored EU IDs
 * @param {Object} moduleConfig - The module configuration
 * @returns {boolean} - True if data was deleted successfully
 */
export function onDataDeletionRequest(moduleConfig) {
  if (moduleConfig && moduleConfig.params) {
    setCookieOnTopDomain(EUIDS_STORAGE_NAME, '', window.location.hostname, true);
    STORAGE.removeDataFromLocalStorage(EUIDS_STORAGE_NAME, null);
  }
  return !getUidFromStorage();
}

/**
 * Sends the page content for semantic analysis to Sirdata's server.
 * @param {string} postContentToken - The token required to post content.
 * @param {string} actualUrl - The actual URL of the current page.
 * @returns {boolean} - True if the content was sent successfully
 */
export function postContentForSemanticAnalysis(postContentToken, actualUrl) {
  if (!postContentToken || !actualUrl) return false;

  try {
    let content = document.implementation.createHTMLDocument('');
    // Clone the current document content to avoid altering the original page content
    content.documentElement.innerHTML = document.documentElement.innerHTML;
    // Sanitize the cloned content to remove unnecessary elements and PII
    content = sanitizeContent(content);
    // Serialize the sanitized content to a string
    const payload = new XMLSerializer().serializeToString(content.documentElement);

    if (payload && payload.length > 300 && payload.length < 300000) {
      const url = `https://contextual.sirdata.io/api/v1/push/contextual?post_content_token=${postContentToken}&url=${encodeURIComponent(actualUrl)}`;

      // Use the Beacon API if supported to send the payload
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon(url, payload);
      } else {
        // Fallback to using AJAX if Beacon API is not supported
        ajax(url, {}, payload, {
          contentType: 'text/plain',
          method: 'POST',
          withCredentials: false, // No user-specific data is tied to the request
          referrerPolicy: 'unsafe-url',
          crossOrigin: true
        });
      }
    }
  } catch (e) {
    logError(LOG_PREFIX, e);
    return false;
  }
  return true;
}

/**
 * Executes a callback function when the document is fully loaded.
 * @param {function} callback - The function to execute when the document is ready.
 */
export function onDocumentReady(callback) {
  if (typeof callback !== 'function') return false;
  try {
    if (document.readyState && document.readyState !== 'loading') {
      callback();
    } else if (typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', callback);
    }
  } catch (e) {
    callback();
  }
  return true;
}

/**
 * Removes Personally Identifiable Information (PII) from the content
 * @param {string} content - The content to be sanitized
 * @returns {string} - The sanitized content
 */
export function removePII(content) {
  const patterns = [
    /\b(?:\d{4}[ -]?){3}\d{4}\b/g, // Credit card numbers
    /\b\d{10,12}\b/g, // US bank account numbers
    /\b\d{5}\d{5}\d{11}\d{2}\b/g, // EU bank account numbers
    /\b(\d{3}-\d{2}-\d{4}|\d{9}|\d{13}|\d{2} \d{2} \d{2} \d{3} \d{3} \d{3})\b/g, // SSN
    /\b[A-Z]{1,2}\d{6,9}\b/g, // Passport numbers
    /\b(\d{8,10}|\d{3}-\d{3}-\d{3}-\d{3}|\d{2} \d{2} \d{2} \d{3} \d{3})\b/g, // ID card numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
    /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,3}\)?[-.\s]?)(\d{2}[-.\s]?){3,4}\d{2}/g // Phone numbers
  ];
  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });
  return content;
}

/**
 * Sanitizes the content by removing unnecessary elements and PII
 * @param {Object} content - The content to be sanitized
 * @returns {Object} - The sanitized content
 */
export function sanitizeContent(content) {
  if (content && content.documentElement.textContent && content.documentElement.textContent.length > 500) {
    // Reduce size by removing useless content
    // Allowed tags
    const allowedTags = [
      'div', 'span', 'a', 'article', 'section', 'p', 'h1', 'h2', 'body', 'b', 'u', 'i', 'big', 'mark', 'ol', 'small', 'strong', 'blockquote',
      'nav', 'menu', 'li', 'ul', 'ins', 'head', 'title', 'main', 'var', 'table', 'caption', 'colgroup', 'col', 'tr', 'td', 'th',
      'summary', 'details', 'dl', 'dt', 'dd'
    ];

    const processElement = (element) => {
      Array.from(element.childNodes).reverse().forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          processElement(child);
          Array.from(child.attributes).forEach(attr => {
            // keeps only id attributes and class attribute if useful for contextualisation
            if (attr.name === 'class' && !/^(main|article|product)/.test(attr.value)) {
              child.removeAttribute(attr.name);
            } else if (attr.name !== 'id') {
              child.removeAttribute(attr.name);
            }
          });
          if (!child.innerHTML.trim() || !allowedTags.includes(child.tagName.toLowerCase())) { // Keeps only allowed Tags (allowedTags)
            child.remove();
          }
        }
      });
    };

    const removeEmpty = (element) => { // remove empty tags
      Array.from(element.childNodes).reverse().forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          removeEmpty(child);
          if (!child.innerHTML.trim()) {
            child.remove();
          }
        } else if (child.nodeType === Node.TEXT_NODE && !child.textContent.trim()) {
          child.remove();
        }
      });
    };

    processElement(content.documentElement);
    removeEmpty(content.documentElement);

    // Clean any potential PII
    content.documentElement.innerHTML = removePII(content.documentElement.innerHTML);

    let htmlContent = content.documentElement.innerHTML;
    // Remove HTML comments
    // This regex removes HTML comments, including those that might not be properly closed
    htmlContent = htmlContent.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
    // Remove multiple spaces
    htmlContent = htmlContent.replace(/\s+/g, ' ');
    // Remove spaces between tags
    htmlContent = htmlContent.replace(/>\s+</g, '><');
    // Assign the cleaned content
    content.documentElement.innerHTML = htmlContent;
  }
  return content;
}

/**
 * Fetches segments and categories from Sirdata server and processes the response
 * @param {Object} reqBidsConfigObj - The bids configuration object
 * @param {function} onDone - The callback function to be called upon completion
 * @param {Object} moduleConfig - The module Config
 * @param {Object} userConsent - The user consent information
 */
export function getSegmentsAndCategories(reqBidsConfigObj, onDone, moduleConfig, userConsent) {
  logInfo(LOG_PREFIX, 'get Segments And Categories');
  const adUnits = (reqBidsConfigObj && reqBidsConfigObj.adUnits) || getGlobal().adUnits;
  if (!adUnits) {
    logInfo(LOG_PREFIX, 'no ad unit, RTD processing is useless');
    onDone();
    return;
  }

  const gdprApplies = deepAccess(userConsent, 'gdpr.gdprApplies') ? userConsent.gdpr.gdprApplies : false;
  const sirdataSubDomain = params.preprod ? 'kvt-preprod' : 'kvt';

  let euids; // empty if no right to access device (publisher or user reject)
  let privacySignals = '';

  // Default global endpoint is cookie-based only if no rules falls into cookieless or consent has been given or GDPR doesn't apply
  if (hasDeviceAccess() && !userConsent.coppa && (isEmpty(userConsent.usp) || userConsent.usp === -1 || (userConsent.usp[0] === '1' && (userConsent.usp[1] !== 'N' && userConsent.usp[2] !== 'Y'))) && (!gdprApplies || (deepAccess(userConsent, 'gdpr.vendorData.vendor.consents') && userConsent.gdpr.vendorData.vendor.consents[GVLID] && deepAccess(userConsent, 'gdpr.vendorData.purpose.consents') && userConsent.gdpr.vendorData.purpose.consents[1] && (userConsent.gdpr.vendorData.purpose.consents[2] || userConsent.gdpr.vendorData.purpose.consents[3]) && userConsent.gdpr.vendorData.purpose.consents[4])) && (isEmpty(userConsent.gpp) || userConsent.gpp.gppString) && checkCookieSupport()) {
    params.sirdataDomain = 'sddan.com'; // cookie based domain
    params.cookieAccessGranted = true; // cookies sent in request

    if (gdprApplies && deepAccess(userConsent, 'gdpr.consentString')) {
      privacySignals = `&gdpr=${gdprApplies}&gdpr_consent=${userConsent.gdpr.consentString}`;
    } else if (!isEmpty(userConsent.usp)) {
      privacySignals = `&ccpa_consent=${userConsent.usp.toString()}`;
    } else if (deepAccess(userConsent, 'gpp.gppString')) {
      const sid = deepAccess(userConsent, 'gpp.applicableSections') ? `&gpp_sid=${userConsent.gpp.applicableSections.join(',')}` : '';
      privacySignals = `&gpp=${userConsent.gpp.gppString}${sid}`;
    }

    // Authorized EUIDS from storage and sync global for graph
    euids = getUidFromStorage(); // Sirdata Id

    if (!isEmpty(params.authorizedEids) && typeof getGlobal().getUserIds === 'function') {
      let filteredEids = {};
      const authorizedEids = params.authorizedEids;
      const globalUserIds = getGlobal().getUserIds();
      const globalUserIdsAsEids = getGlobal().getUserIdsAsEids();

      const hasPubProvidedId = authorizedEids.indexOf('pubProvidedId') !== -1;

      if (hasPubProvidedId && !isEmpty(globalUserIds.pubProvidedId)) { // Publisher allows pubProvidedId
        filteredEids = mergeEuidsArrays(filteredEids, globalUserIds.pubProvidedId);
      }

      if (!hasPubProvidedId || authorizedEids.length > 1) { // Publisher allows other Id providers
        const filteredGlobalEids = globalUserIdsAsEids.filter(entry => authorizedEids.includes(entry.source));
        if (!isEmpty(filteredGlobalEids)) {
          filteredEids = mergeEuidsArrays(filteredEids, filteredGlobalEids);
        }
      }

      if (!isEmpty(filteredEids)) {
        euids = mergeEuidsArrays(euids, filteredEids); // merge ids for graph id
      }
    }
  }

  const url = `https://${sirdataSubDomain}.${params.sirdataDomain}/api/v1/public/p/${params.partnerId.toString()}/d/${params.key.toString()}/s?callback=&allowed_post_content=${!params.avoidPostContent}${privacySignals}${params.actualUrl ? `&url=${encodeURIComponent(params.actualUrl)}` : ''}`;
  const method = isEmpty(euids) ? 'GET' : 'POST';
  const payload = isEmpty(euids) ? null : JSON.stringify({ external_ids: euids });

  try {
    ajax(url, {
      success: function (response, req) {
        if (req.status === 200) {
          try {
            const data = JSON.parse(response);
            if (data && data.segments) {
              addSegmentData(reqBidsConfigObj, data, adUnits, onDone);
            } else {
              onDone();
            }
          } catch (e) {
            onDone();
            logError(LOG_PREFIX, 'unable to parse Sirdata data' + e);
          }
        } else if (req.status === 204) {
          onDone();
        }
      },
      error: function () {
        onDone();
        logError(LOG_PREFIX, 'unable to get Sirdata data');
      }
    }, payload, {
      contentType: 'text/plain',
      method: method,
      withCredentials: params.cookieAccessGranted,
      referrerPolicy: 'unsafe-url',
      crossOrigin: true
    });
  } catch (e) {
    logError(LOG_PREFIX, e);
  }
}

/**
 * Pushes data to OpenRTB 2.5 fragments for the specified bidder
 * @param {Object} ortb2Fragments - The OpenRTB 2.5 fragments
 * @param {string} bidder - The bidder name
 * @param {Object} data - The data to be pushed
 * @param {number} segtaxid - The segment taxonomy ID
 * @param {number} cattaxid - The category taxonomy ID
 * @returns {boolean} - True if data was pushed successfully
 */
export function pushToOrtb2(ortb2Fragments, bidder, data, segtaxid, cattaxid) {
  try {
    if (!isEmpty(data.segments)) {
      if (segtaxid) {
        setOrtb2Sda(ortb2Fragments, bidder, 'user', data.segments, segtaxid);
      } else {
        setOrtb2(ortb2Fragments, bidder, 'user.ext.data', { sd_rtd: { segments: data.segments } });
      }
    }
    if (!isEmpty(data.categories)) {
      if (cattaxid) {
        setOrtb2Sda(ortb2Fragments, bidder, 'site', data.categories, cattaxid);
      } else {
        setOrtb2(ortb2Fragments, bidder, 'site.ext.data', { sd_rtd: { categories: data.categories } });
      }
    }
    if (!isEmpty(data.categories_score) && !cattaxid) {
      setOrtb2(ortb2Fragments, bidder, 'site.ext.data', { sd_rtd: { categories_score: data.categories_score } });
    }
  } catch (e) {
    logError(LOG_PREFIX, e);
  }
  return true;
}

/**
 * Sets OpenRTB 2.5 Seller Defined Audiences (SDA) data
 * @param {Object} ortb2Fragments - The OpenRTB 2.5 fragments
 * @param {string} bidder - The bidder name
 * @param {string} type - The type of data ('user' or 'site')
 * @param {Array} segments - The segments to be set
 * @param {number} segtaxValue - The segment taxonomy value
 * @returns {boolean} - True if data was set successfully
 */
export function setOrtb2Sda(ortb2Fragments, bidder, type, segments, segtaxValue) {
  try {
    let ortb2Data = [{ name: ORTB2_NAME, segment: segments.map(segmentId => ({ id: segmentId })) }];
    if (segtaxValue) ortb2Data[0].ext = { segtax: segtaxValue };
    let ortb2Conf = (type === 'site') ? { site: { content: { data: ortb2Data } } } : { user: { data: ortb2Data } };
    if (bidder) ortb2Conf = { [bidder]: ortb2Conf };
    mergeDeep(ortb2Fragments, ortb2Conf);
  } catch (e) {
    logError(LOG_PREFIX, e);
  }
  return true;
}

/**
 * Sets OpenRTB 2.5 data at the specified path
 * @param {Object} ortb2Fragments - The OpenRTB 2.5 fragments
 * @param {string} bidder - The bidder name
 * @param {string} path - The path to set the data at
 * @param {Object} segments - The segments to be set
 * @returns {boolean} - True if data was set successfully
 */
export function setOrtb2(ortb2Fragments, bidder, path, segments) {
  try {
    if (isEmpty(segments)) return false;
    let ortb2Conf = {};
    deepSetValue(ortb2Conf, path, segments);
    if (bidder) ortb2Conf = { [bidder]: ortb2Conf };
    mergeDeep(ortb2Fragments, ortb2Conf);
  } catch (e) {
    logError(LOG_PREFIX, e);
  }
  return true;
}

/**
 * Loads a custom function for processing ad unit data
 * @param {function} todo - The custom function to be executed
 * @param {Object} adUnit - The ad unit object
 * @param {Object} list - The list of data
 * @param {Object} data - The data object
 * @param {Object} bid - The bid object
 * @returns {boolean} - True if the function was executed successfully
 */
export function loadCustomFunction(todo, adUnit, list, data, bid) {
  try {
    if (typeof todo === 'function') todo(adUnit, list, data, bid);
  } catch (e) {
    logError(LOG_PREFIX, e);
  }
  return true;
}

/**
 * Gets segments and categories array from the data object
 * @param {Object} data - The data object
 * @param {number} minScore - The minimum score threshold for contextual relevancy
 * @param {string} pid - The partner ID (attributed by Sirdata to bidder)
 * @returns {Object} - The segments and categories data
 */
export function getSegAndCatsArray(data, minScore, pid) {
  let sirdataData = { segments: [], categories: [], categories_score: {} };
  minScore = typeof minScore === 'number' ? minScore : 30;
  const { cattaxid, segtaxid, segments } = data;
  const contextualCategories = data.contextual_categories || {};
  // parses contextual categories
  try {
    if (contextualCategories) {
      for (let catId in contextualCategories) {
        if (contextualCategories.hasOwnProperty(catId) && contextualCategories[catId]) {
          let value = contextualCategories[catId];
          if (value >= minScore && !sirdataData.categories.includes(catId)) {
            if (pid === '27440' && cattaxid) { // Equativ only
              sirdataData.categories.push(`${pid}cc${catId}`);
            } else {
              sirdataData.categories.push(catId.toString());
              sirdataData.categories_score[catId] = value;
            }
          }
        }
      }
    }
  } catch (e) {
    logError(LOG_PREFIX, e);
  }
  // parses user-centric segments (empty if no right to access device/process PII)
  try {
    if (segments) {
      for (let segId in segments) {
        if (segments.hasOwnProperty(segId) && segments[segId]) {
          let id = segments[segId].toString();
          if (pid === '27440' && segtaxid) { // Equativ only
            sirdataData.segments.push(`${pid}us${id}`);
          } else {
            sirdataData.segments.push(id);
          }
        }
      }
    }
  } catch (e) {
    logError(LOG_PREFIX, e);
  }
  return sirdataData;
}

/**
 * Applies Seller Defined Audience (SDA) data and specific data for the bidder
 * @param {Object} data - The data object
 * @param {Object} sirdataData - The Sirdata data object
 * @param {boolean} biddersParamsExist - Flag indicating if bidder parameters exist
 * @param {Object} reqBids - The request bids object
 * @param {Object} bid - The bid object
 * @param {number} bidderIndex - The bidder index
 * @param {Object} adUnit - The ad unit object
 * @param {string} aliasActualBidder - The bidder Alias
 * @returns {Object} - The modified Sirdata data
 */
export function applySdaGetSpecificData(data, sirdataData, biddersParamsExist, reqBids, bid, bidderIndex, adUnit, aliasActualBidder) {
  // Apply custom function or return Bidder Specific Data if publisher is ok
  if (bidderIndex && params.bidders[bidderIndex]?.customFunction && typeof (params.bidders[bidderIndex]?.customFunction) === 'function') {
    return loadCustomFunction(params.bidders[bidderIndex].customFunction, adUnit, sirdataData, data, bid);
  }

  // Only share Publisher SDA data if whitelisted
  if (!biddersParamsExist || bidderIndex) {
    // SDA Publisher
    let sirdataDataForSDA = getSegAndCatsArray(data, params.contextualMinRelevancyScore, params.partnerId.toString());
    pushToOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, sirdataDataForSDA, data.segtaxid, data.cattaxid);
  }

  // Always share SDA for curation
  if (!isEmpty(data.shared_taxonomy)) {
    let curationId = (bidderIndex && params.bidders[bidderIndex]?.curationId) || biddersId[aliasActualBidder];
    if (curationId && data.shared_taxonomy[curationId]) {
      // Seller defined audience & bidder specific data
      let curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], params.contextualMinRelevancyScore, curationId.toString());
      if (!isEmpty(curationData)) {
        pushToOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, curationData, data.shared_taxonomy[curationId].segtaxid, data.shared_taxonomy[curationId].cattaxid);
        mergeDeep(sirdataData, curationData);
      }
    }
  }

  return sirdataData;
}

/**
 * Adds segment data to the request bids object and processes the data
 * @param {Object} reqBids - The request bids object
 * @param {Object} data - The data object
 * @param {Array} adUnits - The ad units array
 * @param {function} onDone - The callback function to be called upon completion
 * @returns {Array} - The ad units array
 */
export function addSegmentData(reqBids, data, adUnits, onDone) {
  logInfo(LOG_PREFIX, 'Dispatch Segments And Categories');
  const minScore = params.contextualMinRelevancyScore || 30;
  let sirdataData = getSegAndCatsArray(data, minScore, '');

  const biddersParamsExist = params.bidders.length > 0;

  // Global ortb2 SDA
  if (!isEmpty(data.global_taxonomy)) {
    for (let i in data.global_taxonomy) {
      let globalData;
      if (!isEmpty(data.global_taxonomy[i])) {
        globalData = getSegAndCatsArray(data.global_taxonomy[i], params.contextualMinRelevancyScore, '');
        if (!isEmpty(globalData)) {
          pushToOrtb2(reqBids.ortb2Fragments?.global, '', globalData, data.global_taxonomy[i].segtaxid, data.global_taxonomy[i].cattaxid);
        }
      }
    }
  }

  // Google targeting
  if (typeof window.googletag !== 'undefined' && params.setGptKeyValues) {
    try {
      const gptCurationId = params.gptCurationId || biddersId.sdRtdForGpt;
      let sirdataMergedList = [...sirdataData.segments, ...sirdataData.categories];

      if (gptCurationId && data.shared_taxonomy?.[gptCurationId]) {
        const gamCurationData = getSegAndCatsArray(data.shared_taxonomy[gptCurationId], params.contextualMinRelevancyScore, '');
        sirdataMergedList = [...sirdataMergedList, ...gamCurationData.segments, ...gamCurationData.categories];
      }

      window.googletag.cmd.push(() => {
        window.googletag.pubads().getSlots().forEach(slot => {
          if (typeof slot.setTargeting !== 'undefined' && sirdataMergedList.length > 0) {
            slot.setTargeting('sd_rtd', sirdataMergedList);
          }
        });
      });
    } catch (e) {
      logError(LOG_PREFIX, e);
    }
  }

  adUnits.forEach(adUnit => {
    return adUnit.bids?.forEach(bid => {
      const bidderIndex = findIndex(params.bidders, function (i) { return i.bidder === bid.bidder; });
      try {
        const aliasActualBidder = bidderAliasRegistry[bid.bidder] || bid.bidder;
        if (aliasActualBidder === 'appnexus') {
          let xandrData = applySdaGetSpecificData(data, sirdataData, biddersParamsExist, reqBids, bid, bidderIndex, adUnit, aliasActualBidder);
          // Surprisingly, to date Xandr doesn't support SDA, we need to set specific 'keywords' entries
          if (xandrData.segments.length > 0) {
            setOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, 'user.keywords', `sd_rtd=${xandrData.segments.join(',sd_rtd=')}`);
          }
          if (xandrData.categories.length > 0) {
            setOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, 'site.content.keywords', `sd_rtd=${xandrData.categories.join(',sd_rtd=')}`);
          }
        } else {
          applySdaGetSpecificData(data, sirdataData, biddersParamsExist, reqBids, bid, bidderIndex, adUnit, aliasActualBidder);
        }
      } catch (e) {
        logError(LOG_PREFIX, e);
      }
    });
  });

  // Trigger onDone
  onDone();

  // Postprocessing: should we send async content to categorize content and/or store Sirdata ID (stored in 3PC) within local scope ?
  if (params.sirdataDomain === 'sddan.com') { // Means consent has been given for device and content access
    if (!isEmpty(data.sddan_id) && params.cookieAccessGranted) { // Device access allowed by publisher and cookies are supported
      setUidInStorage(data.sddan_id); // Save Sirdata user ID
    }
    if (!params.avoidPostContent && params.actualUrl && !inIframe() && !isEmpty(data.post_content_token)) {
      onDocumentReady(() => postContentForSemanticAnalysis(data.post_content_token, params.actualUrl));
    }
  }
  return adUnits;
}

/**
 * Initializes the module with the given configuration
 * @param {Object} moduleConfig - The module configuration
 * @returns {boolean} - True if the initialization was successful
 */
export function init(moduleConfig) {
  logInfo(LOG_PREFIX, moduleConfig);
  if (typeof (moduleConfig.params) !== 'object' || !moduleConfig.params.key) return false;
  if (typeof (moduleConfig.params.authorizedEids) !== 'object' || !Array.isArray(moduleConfig.params.authorizedEids)) {
    delete (moduleConfig.params.authorizedEids); // must be array of strings
  } else {
    // we need it if the publishers uses user Id module name instead of key or source
    const resultSet = new Set(
      moduleConfig.params.authorizedEids.map(item => {
        const formattedItem = item.toLowerCase().replace(/\s+/g, '_'); // Normalize
        return eidsProvidersMap[formattedItem] || formattedItem;
      })
    );
    moduleConfig.params.authorizedEids = Array.from(resultSet);
  }
  if (typeof (moduleConfig.params.bidders) !== 'object' || !Array.isArray(moduleConfig.params.bidders)) delete (moduleConfig.params.bidders); // must be array of objects
  delete (moduleConfig.params.sirdataDomain); // delete cookieless domain if specified => shouldn't be overridden by publisher
  params = Object.assign({}, params, moduleConfig.params);
  return true;
}

/**
 * The Sirdata submodule definition
 * @type {Object}
 */
export const sirdataSubmodule = {
  name: SUBMODULE_NAME,
  gvlid: GVLID,
  init: init,
  getBidRequestData: getSegmentsAndCategories
};

// Register the Sirdata submodule with the real time data module
submodule(MODULE_NAME, sirdataSubmodule);

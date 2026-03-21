import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { ajax, fetch } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { generateUUID, getWindowLocation, logError, logInfo, logWarn, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'semantiq';
const LOG_PREFIX = '[SemantIQ RTD Module]: ';
const KEYWORDS_URL = 'https://api.adnz.co/api/ws-semantiq/page-keywords';
const EVENT_COLLECTOR_URL = 'https://api.adnz.co/api/ws-clickstream-collector/submit';
const STORAGE_KEY = `adnz_${SUBMODULE_NAME}`;
const AUDIENZZ_COMPANY_ID = 1;
const FALLBACK_TENANT_IDS = [AUDIENZZ_COMPANY_ID];
const AUDIENZZ_GLOBAL_VENDOR_ID = 783;
const DEFAULT_TIMEOUT = 1000;

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: SUBMODULE_NAME,
});

/**
 * Gets SemantIQ keywords from session storage.
 * @param {string} pageUrl
 * @returns {Object.<string, string | string[]>}
 */
const getStorageKeywords = (pageUrl) => {
  try {
    const storageValue = JSON.parse(storage.getDataFromSessionStorage(STORAGE_KEY));

    if (storageValue?.url === pageUrl) {
      return storageValue.keywords;
    }

    return null;
  } catch (error) {
    logError('Unable to get SemantiQ keywords from session storage', error);

    return null;
  }
};

/**
 * Gets URL of the current page.
 * @returns {string}
 */
const getPageUrl = () => getWindowLocation().href;

/**
 * Gets tenant IDs based on the module params
 * @param {Object} params
 * @returns {number[]}
 */
const getTenantIds = (params = {}) => {
  const { companyId } = params;
  const companyIdArray = Array.isArray(companyId) ? companyId : [companyId];

  return companyIdArray.filter(Boolean).length ? companyIdArray : FALLBACK_TENANT_IDS;
};

/**
 * Gets keywords from cache or SemantIQ service.
 * @param {Object} params
 * @returns {Promise<Object.<string, string | string[]>>}
 */
const getKeywords = (params) => new Promise((resolve, reject) => {
  const pageUrl = getPageUrl();
  const storageKeywords = getStorageKeywords(pageUrl);

  if (storageKeywords) {
    return resolve(storageKeywords);
  }

  const tenantIds = getTenantIds(params);
  const searchParams = new URLSearchParams();

  searchParams.append('url', pageUrl);
  searchParams.append('tenantIds', tenantIds.join(','));

  const requestUrl = `${KEYWORDS_URL}?${searchParams.toString()}`;

  const callbacks = {
    success(responseText, response) {
      try {
        if (response.status !== 200) {
          throw new Error('Invalid response status');
        }

        const data = JSON.parse(responseText);

        if (!data) {
          throw new Error('Failed to parse the response');
        }

        storage.setDataInSessionStorage(STORAGE_KEY, JSON.stringify({ url: pageUrl, keywords: data }));
        resolve(data);
      } catch (error) {
        reject(error);
      }
    },
    error(error) {
      reject(error);
    }
  }

  ajax(requestUrl, callbacks);
});

/**
 * Converts a single key-value pair to an ORTB keyword string.
 * @param {string} key
 * @param {string | string[]} value
 * @returns {string}
 */
export const convertSemantiqKeywordToOrtb = (key, value) => {
  if (!value || !value.length) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((valueItem) => `${key}=${valueItem}`).join(',');
  }

  return `${key}=${value}`;
};

/**
 * Converts SemantIQ keywords to ORTB format.
 * @param {Object.<string, string | string[]>} keywords
 * @returns {string}
 */
export const getOrtbKeywords = (keywords) => Object.entries(keywords).reduce((acc, entry) => {
  const [key, values] = entry;
  const ortbKeywordString = convertSemantiqKeywordToOrtb(key, values);

  return ortbKeywordString ? [...acc, ortbKeywordString] : acc;
}, []).join(',');

/**
 * Dispatches a page impression event to the SemantIQ service.
 *
 * @param {number} companyId
 * @returns {Promise<void>}
 */
const dispatchPageImpressionEvent = (companyId) => {
  window.audienzz = window.audienzz || {};
  window.audienzz.collectorPageImpressionId = window.audienzz.collectorPageImpressionId || generateUUID();
  const pageImpressionId = window.audienzz.collectorPageImpressionId;
  const pageUrl = getPageUrl();

  const payload = {
    company_id: companyId,
    event_id: generateUUID(),
    event_timestamp: new Date().toISOString(),
    event_type: 'pageImpression',
    page_impression_id: pageImpressionId,
    source: 'semantiqPrebidModule',
    page_url: pageUrl,
  };

  return fetch(EVENT_COLLECTOR_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
  });
};

/**
 * Module init
 * @param {Object} config
 * @param {Object} userConsent
 * @return {boolean}
 */
const init = (config, userConsent) => {
  const { params = {} } = config;
  const [mainCompanyId] = getTenantIds(params);

  dispatchPageImpressionEvent(mainCompanyId);

  return true;
};

/**
 * Receives real-time data from SemantIQ service.
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} moduleConfig
 */
const getBidRequestData = (
  reqBidsConfigObj,
  onDone,
  moduleConfig,
) => {
  let isDone = false;

  const { params = {} } = moduleConfig || {};
  const { timeout = DEFAULT_TIMEOUT } = params;

  try {
    logInfo(LOG_PREFIX, { reqBidsConfigObj });

    const { adUnits = [] } = reqBidsConfigObj;

    if (!adUnits.length) {
      logWarn(LOG_PREFIX, 'No ad units found in the request');
      isDone = true;
      onDone();
    }

    getKeywords(params)
      .then((keywords) => {
        const ortbKeywords = getOrtbKeywords(keywords);
        const siteKeywords = reqBidsConfigObj.ortb2Fragments?.global?.site?.keywords;
        const updatedGlobalOrtb = { site: { keywords: [siteKeywords, ortbKeywords].filter(Boolean).join(',') } };

        mergeDeep(reqBidsConfigObj.ortb2Fragments.global, updatedGlobalOrtb);
      })
      .catch((error) => {
        logError(LOG_PREFIX, error);
      })
      .finally(() => {
        isDone = true;
        onDone();
      });
  } catch (error) {
    logError(LOG_PREFIX, error);
    isDone = true;
    onDone();
  }

  setTimeout(() => {
    if (!isDone) {
      logWarn(LOG_PREFIX, 'Timeout exceeded');
      isDone = true;
      onDone();
    }
  }, timeout);
}

/** @type {RtdSubmodule} */
export const semantiqRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData,
  init,
  gvlid: AUDIENZZ_GLOBAL_VENDOR_ID,
};

submodule(MODULE_NAME, semantiqRtdSubmodule);

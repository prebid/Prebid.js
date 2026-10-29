import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { ajax, fetch } from '../src/ajax.js';
import type { XHR } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { generateUUID, getWindowLocation, logError, logInfo, logWarn, mergeDeep } from '../src/utils.js';
import { isPlainObject } from '../src/utils/objects.ts';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';

const MODULE_NAME = 'realTimeData' as const;
const SUBMODULE_NAME = 'semantiq' as const;
const LOG_PREFIX = '[SemantIQ RTD Module]: ';
const KEYWORDS_URL = 'https://api.adnz.co/api/ws-semantiq/page-keywords';
const EVENT_COLLECTOR_URL = 'https://api.adnz.co/api/ws-clickstream-collector/submit';
const STORAGE_KEY = `adnz_${SUBMODULE_NAME}`;
const AUDIENZZ_COMPANY_ID = 1;
const FALLBACK_TENANT_IDS = [AUDIENZZ_COMPANY_ID];
const AUDIENZZ_GLOBAL_VENDOR_ID = 783;
const DEFAULT_TIMEOUT = 1000;

/**
 * Keyword value returned by the SemantIQ page-keywords API.
 * A missing or empty value is omitted from the ORTB keyword string.
 */
export type SemantiqKeywordValue = string | string[] | null | undefined;

/**
 * Keywords keyed by the SemantIQ field name.
 */
export type SemantiqKeywords = Record<string, SemantiqKeywordValue>;

/**
 * Publisher configuration for the SemantIQ RTD module.
 */
export interface SemantiqRtdParams {
  /**
   * Company ID or IDs obtained from Audienzz.
   */
  companyId?: number | number[];
  /**
   * The maximum time to wait for a response, in milliseconds.
   */
  timeout?: number;
}

declare module './rtdModule/spec.ts' {
  interface ProviderConfig {
    semantiq: {
      params?: SemantiqRtdParams;
    };
  }
}

declare global {
  interface Window {
    audienzz?: {
      collectorPageImpressionId?: string;
    };
  }
}

interface StoredSemantiqKeywords {
  url: string;
  keywords: SemantiqKeywords;
}

function isKeywordValue(value: unknown): value is SemantiqKeywordValue {
  if (value == null || typeof value === 'string') {
    return true;
  }

  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSemantiqKeywords(value: unknown): value is SemantiqKeywords {
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.values(value).every(isKeywordValue);
}

function isStoredSemantiqKeywords(value: unknown): value is StoredSemantiqKeywords {
  if (!isPlainObject(value) || typeof value.url !== 'string') {
    return false;
  }

  return isSemantiqKeywords(value.keywords);
}

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: SUBMODULE_NAME,
});

/**
 * Gets SemantIQ keywords from session storage.
 */
const getStorageKeywords = (pageUrl: string): SemantiqKeywords | null => {
  try {
    const storageValue: unknown = JSON.parse(storage.getDataFromSessionStorage(STORAGE_KEY));

    if (!isStoredSemantiqKeywords(storageValue) || storageValue.url !== pageUrl) {
      return null;
    }

    return storageValue.keywords;
  } catch (error) {
    logError('Unable to get SemantiQ keywords from session storage', error);

    return null;
  }
};

/**
 * Gets URL of the current page.
 */
const getPageUrl = (): string => getWindowLocation().href;

function toCompanyIds(companyIdOrIds: number | number[] | undefined): number[] {
  if (Array.isArray(companyIdOrIds)) {
    return companyIdOrIds;
  }

  if (companyIdOrIds == null) {
    return [];
  }

  return [companyIdOrIds];
}

/**
 * Gets tenant IDs from the module params.
 * Falsy company ids are dropped. When none remain, the Audienzz company id is used.
 */
const getTenantIds = (params: SemantiqRtdParams = {}): number[] => {
  const companyIds = toCompanyIds(params.companyId).filter(Boolean);

  if (companyIds.length > 0) {
    return companyIds;
  }

  return FALLBACK_TENANT_IDS;
};

/**
 * Gets keywords from cache or the SemantIQ service.
 */
const getKeywords = (params: SemantiqRtdParams): Promise<SemantiqKeywords> => new Promise((resolve, reject) => {
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

  const rejectKeywords = (error: unknown) => {
    logError(LOG_PREFIX, error);
    reject(error);
  };

  const callbacks = {
    success(responseText: string, response: XHR) {
      if (response.status !== 200) {
        rejectKeywords('Invalid response status');
        return;
      }

      try {
        const data: unknown = JSON.parse(responseText);

        if (!isSemantiqKeywords(data)) {
          rejectKeywords('Failed to parse the response');
          return;
        }

        storage.setDataInSessionStorage(STORAGE_KEY, JSON.stringify({ url: pageUrl, keywords: data }));
        resolve(data);
      } catch (error) {
        rejectKeywords(error);
      }
    },
    error: rejectKeywords,
  };

  ajax(requestUrl, callbacks);
});

/**
 * Converts a single key-value pair to an ORTB keyword string.
 */
export const convertSemantiqKeywordToOrtb = (key: string, value: SemantiqKeywordValue): string => {
  if (typeof value !== 'string' && !Array.isArray(value)) {
    return '';
  }

  if (!value.length) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((valueItem) => `${key}=${valueItem}`).join(',');
  }

  return `${key}=${value}`;
};

/**
 * Converts SemantIQ keywords to ORTB format.
 */
export const getOrtbKeywords = (keywords: SemantiqKeywords): string => Object.entries(keywords).reduce<string[]>((acc, entry) => {
  const [key, values] = entry;
  const ortbKeywordString = convertSemantiqKeywordToOrtb(key, values);

  return ortbKeywordString ? [...acc, ortbKeywordString] : acc;
}, []).join(',');

/**
 * Dispatches a page impression event to the SemantIQ service.
 */
const dispatchPageImpressionEvent = (companyId: number) => {
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
 * Module init.
 */
const init = (config: RTDProviderConfig<'semantiq'>, userConsent: AllConsentData): boolean => {
  const { params = {} } = config;
  const [mainCompanyId] = getTenantIds(params);

  dispatchPageImpressionEvent(mainCompanyId);

  return true;
};

/**
 * Receives real-time data from the SemantIQ service.
 */
const getBidRequestData = (
  reqBidsConfigObj: StartAuctionOptions,
  onDone: () => void,
  moduleConfig?: RTDProviderConfig<'semantiq'>,
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
      return;
    }

    getKeywords(params)
      .then((keywords) => {
        if (isDone) {
          return;
        }

        const ortbKeywords = getOrtbKeywords(keywords);
        const siteKeywords = reqBidsConfigObj.ortb2Fragments?.global?.site?.keywords;
        const updatedGlobalOrtb = { site: { keywords: [siteKeywords, ortbKeywords].filter(Boolean).join(',') } };

        mergeDeep(reqBidsConfigObj.ortb2Fragments.global, updatedGlobalOrtb);
      })
      .catch(() => {
        // The keyword request already logged the failure.
      })
      .finally(() => {
        if (isDone) {
          return;
        }

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
};

export const semantiqRtdSubmodule: RtdProviderSpec<'semantiq'> = {
  name: SUBMODULE_NAME,
  getBidRequestData,
  init,
  gvlid: AUDIENZZ_GLOBAL_VENDOR_ID,
};

submodule(MODULE_NAME, semantiqRtdSubmodule);

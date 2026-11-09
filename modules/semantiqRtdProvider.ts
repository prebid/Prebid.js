import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { ajax, fetch } from '../src/ajax.js';
import type { XHR } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { generateUUID, getWindowLocation, logError, logInfo, logWarn, mergeDeep, uniques } from '../src/utils.js';
import { isPlainObject } from '../src/utils/objects.ts';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { ORTBRequest } from '../src/types/ortb/request.d.ts';
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
const SEGTAX_CONTENT_2_2 = 6;
const SEGTAX_CONTENT_3_0 = 7;

/**
 * IAB content taxonomy, as an ORTB segtax / cattax id.
 */
type SemantiqTaxonomy = typeof SEGTAX_CONTENT_2_2 | typeof SEGTAX_CONTENT_3_0;

/**
 * Taxonomies written to `site.content.data`, in this order.
 */
const CONTENT_TAXONOMIES: SemantiqTaxonomy[] = [SEGTAX_CONTENT_2_2, SEGTAX_CONTENT_3_0];

/**
 * SemantIQ keyword field that holds the category ids for each taxonomy.
 */
const KEYWORD_FIELD_BY_TAXONOMY: Record<SemantiqTaxonomy, string> = {
  [SEGTAX_CONTENT_2_2]: 'iab2_category_id',
  [SEGTAX_CONTENT_3_0]: 'iab_category_id',
};

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

type OrtbSite = NonNullable<ORTBRequest['site']>;

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

const isSemantiqTaxonomy = (value: unknown): value is SemantiqTaxonomy => (
  value === SEGTAX_CONTENT_2_2 || value === SEGTAX_CONTENT_3_0
);

/**
 * Gets the IAB category ids of a taxonomy from SemantIQ keywords.
 * Blank and duplicate ids are dropped.
 */
const getCategoryIds = (keywords: SemantiqKeywords, taxonomy: SemantiqTaxonomy): string[] => {
  const value = keywords[KEYWORD_FIELD_BY_TAXONOMY[taxonomy]] ?? [];
  const ids = Array.isArray(value) ? value : [value];

  return ids
    .map((id) => id.trim())
    .filter(Boolean)
    .filter(uniques);
};

/**
 * Gets `site.content.data`, with one entry per taxonomy that has ids.
 */
const getOrtbContent = (keywords: SemantiqKeywords): Pick<OrtbSite, 'content'> => {
  const data = CONTENT_TAXONOMIES.flatMap((taxonomy) => {
    const ids = getCategoryIds(keywords, taxonomy);

    if (!ids.length) {
      return [];
    }

    return [{
      name: SUBMODULE_NAME,
      ext: { segtax: taxonomy },
      segment: ids.map((id) => ({ id })),
    }];
  });

  return data.length ? { content: { data } } : {};
};

/**
 * Gets `site.cat` in the taxonomy the publisher set in `site.cattax`.
 * Without `site.cattax` 6 or 7, `site.cat` is left alone:
 * the module never sets `site.cattax`, which also applies to `site.sectioncat` and `site.pagecat`.
 */
const getOrtbSiteCategories = (keywords: SemantiqKeywords, site: OrtbSite = {}): Pick<OrtbSite, 'cat'> => {
  if (!isSemantiqTaxonomy(site.cattax)) {
    return {};
  }

  const ids = getCategoryIds(keywords, site.cattax);

  return ids.length ? { cat: ids } : {};
};

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

        const site = reqBidsConfigObj.ortb2Fragments?.global?.site;
        const ortbKeywords = getOrtbKeywords(keywords);
        const updatedGlobalOrtb = {
          site: {
            keywords: [site?.keywords, ortbKeywords].filter(Boolean).join(','),
            ...getOrtbContent(keywords),
            ...getOrtbSiteCategories(keywords, site),
          },
        };

        mergeDeep(reqBidsConfigObj.ortb2Fragments.global, updatedGlobalOrtb);
      }, () => {
        // The keyword request already logged the failure.
      })
      .catch((error) => {
        logError(LOG_PREFIX, error);
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

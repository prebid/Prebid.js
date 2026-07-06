/**
 * This module adds the Mantis RTD provider to the real time data module.
 * The {@link module:modules/realTimeData} module is required.
 * The module will fetch contextual data from the Mantis API
 * and populate ortb2 site and user data before the auction.
 * @module modules/mantisRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import type { XHR } from '../src/ajax.ts';
import { mergeDeep, logMessage, logError, logWarn, logInfo } from '../src/utils.js';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import { isNumber } from '../src/utils/objects.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A scored category entry from the Mantis API. */
interface MantisCategory {
  score: number;
  /** Human-readable label (mantis taxonomy). */
  label?: string;
  /** Taxonomy ID (IAB taxonomy). */
  id?: string;
}

/** Emotion level returned by the Mantis API. */
interface MantisEmotion {
  level: string;
}

/** Brand-safety rating entry per customer. */
interface MantisRating {
  customer: string;
  /** Rating value, or "N/A" when unavailable. */
  rating: string;
}

/** Raw JSON response shape from the Mantis contextual API. */
interface MantisApiResponse {
  categories?: {
    mantis?: MantisCategory[];
    iab?: MantisCategory[];
  };
  emotion?: Record<string, MantisEmotion>;
  ratings?: MantisRating[];
  sentiment?: string;
}

/** Processed targeting values — each field is a comma-separated token string. */
interface MantisStandardTargeting {
  mantis: string;
  mantis_context: string;
  iab_context: string;
}

/** Return type of {@link processMantisData}. */
interface ProcessedMantisData {
  standard: MantisStandardTargeting;
}

/** A single oRTB2 segment object. */
interface Ortb2Segment {
  id: string;
}

/** Named oRTB2 segment group mapping to one Mantis targeting key. */
interface MantisSegmentGroup {
  name: string;
  segment: Ortb2Segment[];
  ext: { segtax: number }
}

/** Structured data passed to {@link setOrtb2FromResponse}. */
interface MantisOrtb2StructuredData {
  site?: { content?: { data?: MantisSegmentGroup[] } };
  user?: { data?: MantisSegmentGroup[] };
}

/** Intermediate subset definition used inside {@link processMantisData}. */
interface MantisSubsetDef {
  subset: keyof Omit<MantisStandardTargeting, 'mantis'>;
  source: MantisCategory[];
  key: keyof MantisCategory;
  filter: number;
  mapTo: keyof MantisCategory;
}

/** Accumulator type for subset processing inside {@link processMantisData}. */
type MantisSubsetAcc = Record<keyof Omit<MantisStandardTargeting, 'mantis'>, string>;
interface MantisModuleParams {
  /** Base URL of the Mantis RTD API endpoint. */
  endpoint: string;
}

// ---------------------------------------------------------------------------
// ProviderConfig augmentation
// ---------------------------------------------------------------------------

declare module './rtdModule/spec' {
  interface ProviderConfig {
    mantis: {
      params: MantisModuleParams;
    };
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUBMODULE_NAME = 'mantis' as const;
const LOG_PREFIX = 'mantisRtdProvider:';
const BASIC_MANTIS_KEYS: ReadonlyArray<keyof MantisStandardTargeting> = [
  'mantis',
  'mantis_context',
  'iab_context',
];

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Build an array of oRTB2 segment objects from processed Mantis targeting data.
 * One segment group is returned for each key in {@link BASIC_MANTIS_KEYS}.
 */
export const getMantisKeysSegmentData = (
  targetingData: ProcessedMantisData | null | undefined
): MantisSegmentGroup[] => {
  if (!targetingData?.standard) {
    logWarn(`${LOG_PREFIX} Empty mantis data received for standard targeting`);
    return [];
  }
  const segments: MantisSegmentGroup[] = [];
  for (const mantisKey of BASIC_MANTIS_KEYS) {
    const keySegments = (targetingData.standard[mantisKey] || '')
      .split(',')
      .map((val: string) => val?.trim())
      .filter(Boolean)
      .map((id: string) => ({ id }));
    segments.push({
      name: mantisKey,
      segment: [...new Map(keySegments.map((s: Ortb2Segment) => [s.id, s])).values()],
      ext: { segtax: 4 }  // https://github.com/InteractiveAdvertisingBureau/Taxonomies/blob/main/Audience%20Taxonomies/Audience%20Taxonomy%201.1.tsv
    });
  }
  return segments;
};

/**
 * Strip query string and fragment from a URL, returning host + pathname only.
 * Returns an empty string and logs an error if the URL is invalid.
 */
export const cleanUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.host + parsedUrl.pathname;
  } catch (error: unknown) {
    logError(`${LOG_PREFIX} Invalid url: ${(error as Error)?.message}`);
    return '';
  }
};

/**
 * Build the Mantis RTD API request URL.
 * @param endpoint - Base URL of the Mantis RTD API.
 */
export function buildApiUrl(endpoint: string): string {
  const url = cleanUrl(window.location.href);
  if (!url) return '';
  const params = [
    'cacheType=public',
    'filter=fullRatings,input,findings,sentiment,emotion,categories',
    `url=${encodeURIComponent(url)}`,
  ];
  return `${endpoint}?${params.join('&')}`;
}

/**
 * Process a raw Mantis API response into a structured targeting object.
 */
export const processMantisData = (mantisData: MantisApiResponse = {}): ProcessedMantisData => {
  const { categories, emotion = {}, ratings = [], sentiment = '' } = mantisData;

  const mantisEmotions = Object.entries(emotion)
    .map(([k, v]: [string, MantisEmotion]) => (k === 'unknown' ? 'emotions-unknown' : `${k}-${v.level}`))
    .join(',');
  //
  const finalMantisEmotions = mantisEmotions || 'emotions-unknown';

  const mantisSentiment = sentiment ? `sentiment-${sentiment}` : 'sentiment-unknown';

  const mantisRatings = ratings
    .filter(({ rating }) => rating !== 'N/A')
    .map(({ customer, rating }) => `${customer}-${rating}`)
    .join(',');
  const finalMantisRatings = mantisRatings || 'unknown';

  const mantis = [finalMantisRatings, mantisSentiment, finalMantisEmotions, 'prebid-rtdmodule']
    .filter(Boolean)
    .join(',');

  const subsets = (
    [
      { subset: 'mantis_context', source: categories?.mantis || [], key: 'score', filter: 0.6, mapTo: 'label' },
      { subset: 'iab_context', source: categories?.iab || [], key: 'score', filter: 0.6, mapTo: 'id' },
    ] as MantisSubsetDef[]
  ).reduce<MantisSubsetAcc>(
    (acc, { subset, source, key, filter, mapTo }) => {
      const filtered = source.filter((entry) => (entry[key] as number) > filter);
      acc[subset] = filtered.length > 0 ? filtered.map((e) => e[mapTo] as string).join(',') : 'unknown';
      return acc;
    },
    { mantis_context: '', iab_context: '' }
  );

  return { standard: { mantis, mantis_context: subsets.mantis_context, iab_context: subsets.iab_context } };
};

/**
 * Merge ortb2StructuredData into the global ortb2 fragments.
 * Returns `true` when data was successfully merged, `false` otherwise.
 */
export function setOrtb2FromResponse(
  reqBidsConfigObj: StartAuctionOptions,
  ortb2StructuredData: MantisOrtb2StructuredData | null | undefined
): boolean {
  const ortb2 = reqBidsConfigObj.ortb2Fragments?.global;
  if (!ortb2 || !ortb2StructuredData || typeof ortb2StructuredData !== 'object') return false;

  if (ortb2StructuredData.site) {
    mergeDeep(ortb2, { site: ortb2StructuredData.site });
    logMessage(`${LOG_PREFIX} merged site data`, ortb2StructuredData.site);
  }
  if (ortb2StructuredData.user) {
    mergeDeep(ortb2, { user: ortb2StructuredData.user });
    logMessage(`${LOG_PREFIX} merged user data`, ortb2StructuredData.user);
  }
  return true;
}

/**
 * Fetch RTD data from the Mantis API and populate ortb2 fragments.
 */
export function getBidRequestData(
  reqBidsConfigObj: StartAuctionOptions,
  onDone: () => void,
  moduleConfig: RTDProviderConfig<'mantis'>,
  _consent: AllConsentData,
  auctionDelay: number
): void {
  const { endpoint } = moduleConfig.params;
  const timeout = isNumber(auctionDelay) ? auctionDelay : 0;

  if (!endpoint) {
    logWarn(`${LOG_PREFIX} missing required param: endpoint, releasing auction.`);
    onDone();
    return;
  }

  const url = buildApiUrl(endpoint);
  if (!url) {
    logError(`${LOG_PREFIX} invalid mantis api endpoint provided, releasing auction.`);
    onDone();
    return;
  }

  let isDone = false;
  let mantisApiTimeout: ReturnType<typeof setTimeout>;

  const completeRequest = (): void => {
    if (!isDone) {
      isDone = true;
      clearTimeout(mantisApiTimeout);
      onDone();
    }
  };

  mantisApiTimeout = setTimeout(() => {
    logWarn(`${LOG_PREFIX} Mantis API timeout reached, completing bid request.`);
    completeRequest();
  }, timeout);

  const onSuccess = (responseText: string): void => {
    if (isDone) {
      logWarn(`${LOG_PREFIX} response arrived after timeout, discarding.`);
      return;
    }
    try {
      const data: MantisApiResponse = JSON.parse(responseText);
      const mantisSegments = getMantisKeysSegmentData(processMantisData(data));
      if (!mantisSegments.length) {
        logInfo(`${LOG_PREFIX} empty mantis data received`);
        completeRequest();
        return;
      }
      const ortb2StructuredData: MantisOrtb2StructuredData = {
        site: { content: { data: mantisSegments } },
        user: { data: mantisSegments },
      };
      if (!setOrtb2FromResponse(reqBidsConfigObj, ortb2StructuredData)) {
        logError(`${LOG_PREFIX} error occurred while setting data in ortb2Fragments.global`);
      }
      completeRequest();
    } catch (e: unknown) {
      logError(`${LOG_PREFIX} failed to process data from Mantis API`, (e as Error)?.message);
      completeRequest();
    }
  };

  const onError = (statusText: string, xhr: XHR): void => {
    if (isDone) return;
    logError(`${LOG_PREFIX} Mantis API request error - ${xhr?.status}, ${statusText}`);
    completeRequest();
  };

  ajax(url, { success: onSuccess, error: onError }, null, { method: 'GET' });
}

/**
 * Module init — validate required config params.
 * @example
 * window.pbjs.setConfig({
 *   realTimeData: {
 *     auctionDelay: 5000,
 *     dataProviders: [{
 *       name: 'mantis',
 *       waitForIt: true,
 *       params: { endpoint: 'https://mantis.example.com' }
 *     }]
 *   }
 * });
 */
function init(moduleConfig: RTDProviderConfig<'mantis'>, _consent: AllConsentData): boolean {
  const { params } = moduleConfig;

  if (!params || typeof params !== 'object') {
    logError(`${LOG_PREFIX} Missing or invalid mantis config`);
    return false;
  }
  if (!params.endpoint) {
    logError(`${LOG_PREFIX} Missing required parameters in mantis config`);
    return false;
  }

  logMessage(`${LOG_PREFIX} Mantis RTD module initialized`);
  return true;
}

export const mantisDataModule: RtdProviderSpec<'mantis'> = {
  name: SUBMODULE_NAME,
  init,
  getBidRequestData,
};

submodule('realTimeData', mantisDataModule as unknown as RtdProviderSpec<string>);

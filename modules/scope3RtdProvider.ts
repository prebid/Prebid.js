/**
 * Scope3 RTD Provider
 *
 * This module integrates Scope3's Agentic Execution Engine (AEE) to provide
 * real-time contextual signals for programmatic advertising optimization.
 */

import { auctionManager } from '../src/auctionManager.js';
import { submodule } from '../src/hook.js';
import { logMessage, logError, logWarn, deepClone, isEmpty, getBidderCodes, mergeDeep } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import type { RtdProviderSpec } from './rtdModule/spec.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { ORTBFragments } from '../src/types/common.d.ts';

declare module './rtdModule/spec' {
  interface ProviderConfig {
    scope3: {
      params: {
        /**
         * Scope3 organization ID (required)
         */
        orgId: string;
        /**
         * API endpoint URL
         */
        endpoint?: string;
        /**
         * Request timeout in milliseconds
         */
        timeout?: number;
        /**
         * List of bidders to target
         */
        bidders?: string[];
        /**
         * GAM targeting key for include signals
         */
        includeKey?: string;
        /**
         * GAM targeting key for exclude signals
         */
        excludeKey?: string;
        /**
         * GAM targeting key for macro data
         */
        macroKey?: string;
        /**
         * Enable publisher-level targeting
         */
        publisherTargeting?: boolean;
        /**
         * Enable advertiser-level targeting
         */
        advertiserTargeting?: boolean;
        /**
         * Enable response caching
         */
        cacheEnabled?: boolean;
        /**
         * Cache TTL in milliseconds
         */
        cacheTtl?: number;
      }
    }
  }
}

interface AEESignals {
  include?: string[];
  exclude?: string[];
  macro?: string;
  bidders?: {
    [bidder: string]: {
      segments?: string[];
      deals?: string[];
    }
  }
}

interface AEEResponse {
  aee_signals?: AEESignals;
}

interface CacheEntry {
  data: AEESignals;
  timestamp: number;
}

const MODULE_NAME = 'scope3RtdProvider';
const MODULE_VERSION = '1.0.0';
const DEFAULT_ENDPOINT = 'https://prebid.scope3.com/prebid';
const DEFAULT_TIMEOUT = 1000;
const DEFAULT_CACHE_TTL = 300000; // 5 minutes

let storage: ReturnType<typeof getStorageManager> | null = null;
let moduleConfig: any | null = null;
let responseCache: Map<string, CacheEntry> = new Map();

/**
 * Initialize the Scope3 RTD Provider
 */
function initModule(config: any): boolean {
  moduleConfig = config;

  if (!storage) {
    storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });
  }

  // Set defaults
  moduleConfig.endpoint = moduleConfig.endpoint || DEFAULT_ENDPOINT;
  moduleConfig.timeout = moduleConfig.timeout || DEFAULT_TIMEOUT;
  moduleConfig.includeKey = moduleConfig.includeKey || 'scope3_include';
  moduleConfig.excludeKey = moduleConfig.excludeKey || 'scope3_exclude';
  moduleConfig.macroKey = moduleConfig.macroKey || 'scope3_macro';
  moduleConfig.publisherTargeting = moduleConfig.publisherTargeting !== false;
  moduleConfig.advertiserTargeting = moduleConfig.advertiserTargeting !== false;
  moduleConfig.cacheEnabled = moduleConfig.cacheEnabled !== false;
  moduleConfig.cacheTtl = moduleConfig.cacheTtl || DEFAULT_CACHE_TTL;

  logMessage(`Scope3 RTD Provider initialized with config:`, moduleConfig);
  return true;
}

/**
 * Extract complete OpenRTB data from the request configuration
 */
function extractOrtb2Data(reqBidsConfigObj: StartAuctionOptions): any {
  // Deep copy the complete OpenRTB object from global fragments to preserve all data
  const ortb2 = reqBidsConfigObj.ortb2Fragments?.global || {};

  // Deep clone to avoid modifying the original
  const ortb2Request = deepClone(ortb2);

  // Build impression array from ad units with full mediaType information
  ortb2Request.imp = reqBidsConfigObj.adUnits?.map(adUnit => ({
    id: adUnit.code,
    banner: adUnit.mediaTypes?.banner ? {
      format: adUnit.mediaTypes.banner.sizes?.map(size => ({
        w: size[0],
        h: size[1]
      })),
      pos: adUnit.mediaTypes.banner.pos
    } : undefined,
    video: adUnit.mediaTypes?.video ? {
      ...adUnit.mediaTypes.video,
      w: adUnit.mediaTypes.video.playerSize?.[0]?.[0],
      h: adUnit.mediaTypes.video.playerSize?.[0]?.[1]
    } : undefined,
    native: adUnit.mediaTypes?.native ? {
      ...adUnit.mediaTypes.native
    } : undefined,
    ext: adUnit.ortb2Imp?.ext || {}
  })) || [];

  return ortb2Request;
}

/**
 * Generate cache key for the request
 */
function generateCacheKey(ortb2Data: any): string {
  const keyParts = [
    ortb2Data.site?.domain || '',
    ortb2Data.site?.page || '',
    ortb2Data.user?.id || '',
    JSON.stringify(ortb2Data.user?.ext?.eids || [])
  ];
  return keyParts.join('|');
}

/**
 * Check if cached data is still valid
 */
function getCachedData(cacheKey: string): AEESignals | null {
  if (!moduleConfig?.cacheEnabled) {
    return null;
  }

  const cached = responseCache.get(cacheKey);
  if (cached) {
    const now = Date.now();
    if (now - cached.timestamp < moduleConfig.cacheTtl) {
      logMessage('Scope3 RTD: Using cached data for key', cacheKey);
      return cached.data;
    } else {
      responseCache.delete(cacheKey);
    }
  }
  return null;
}

/**
 * Store data in cache
 */
function setCachedData(cacheKey: string, data: AEESignals): void {
  if (!moduleConfig?.cacheEnabled) {
    return;
  }

  responseCache.set(cacheKey, {
    data: data,
    timestamp: Date.now()
  });

  // Clean up old cache entries
  const now = Date.now();
  responseCache.forEach((entry, key) => {
    if (now - entry.timestamp > moduleConfig.cacheTtl) {
      responseCache.delete(key);
    }
  });
}

/**
 * Apply agent decisions to the bid request
 */
function applyAgentDecisions(
  reqBidsConfigObj: StartAuctionOptions,
  aeeSignals: AEESignals
): void {
  if (!aeeSignals) return;

  // Initialize fragments if needed
  reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
  reqBidsConfigObj.ortb2Fragments.global = reqBidsConfigObj.ortb2Fragments.global || {};
  reqBidsConfigObj.ortb2Fragments.bidder = reqBidsConfigObj.ortb2Fragments.bidder || {};

  // Apply global AEE signals to multiple locations for better compatibility
  if (aeeSignals.include || aeeSignals.exclude || aeeSignals.macro) {
    reqBidsConfigObj.ortb2Fragments.global.site = reqBidsConfigObj.ortb2Fragments.global.site || {};
    reqBidsConfigObj.ortb2Fragments.global.site.ext = reqBidsConfigObj.ortb2Fragments.global.site.ext || {};
    reqBidsConfigObj.ortb2Fragments.global.site.ext.data = reqBidsConfigObj.ortb2Fragments.global.site.ext.data || {};

    // Primary location for AEE signals
    (reqBidsConfigObj.ortb2Fragments.global.site.ext.data as any).scope3_aee = {
      include: aeeSignals.include || [],
      exclude: aeeSignals.exclude || [],
      macro: aeeSignals.macro || ''
    };

    // Also add as keywords for broader compatibility (s3kw = Scope3 keywords)
    if (aeeSignals.include && aeeSignals.include.length > 0) {
      (reqBidsConfigObj.ortb2Fragments.global.site.ext.data as any).s3kw = aeeSignals.include;
    }

    // Add to site.content.data using OpenRTB segtax format
    if (aeeSignals.include && aeeSignals.include.length > 0) {
      reqBidsConfigObj.ortb2Fragments.global.site.content = reqBidsConfigObj.ortb2Fragments.global.site.content || {};
      reqBidsConfigObj.ortb2Fragments.global.site.content.data = reqBidsConfigObj.ortb2Fragments.global.site.content.data || [];

      // Add as OpenRTB segment taxonomy data
      (reqBidsConfigObj.ortb2Fragments.global.site.content.data as any[]).push({
        name: 'scope3.com',
        ext: {
          segtax: 3333  // Scope3 Agentic Execution Engine (AEE) Targeting Signals
        },
        segment: aeeSignals.include.map(id => ({ id }))
      });
    }

    logMessage('Scope3 RTD: Applied global AEE signals', (reqBidsConfigObj.ortb2Fragments.global.site.ext.data as any).scope3_aee);
  }

  // Apply bidder-specific segments and deals
  if (aeeSignals.bidders && !isEmpty(aeeSignals.bidders)) {
    const allowedBidders = moduleConfig?.bidders || Object.keys(aeeSignals.bidders);

    allowedBidders.forEach(bidder => {
      const bidderData = aeeSignals.bidders![bidder];
      if (!bidderData) return;

      // Initialize bidder fragment
      reqBidsConfigObj.ortb2Fragments.bidder[bidder] = reqBidsConfigObj.ortb2Fragments.bidder[bidder] || {};

      // Apply segments to user.data with proper segtax
      if (bidderData.segments && bidderData.segments.length > 0) {
        reqBidsConfigObj.ortb2Fragments.bidder[bidder].user = reqBidsConfigObj.ortb2Fragments.bidder[bidder].user || {};
        reqBidsConfigObj.ortb2Fragments.bidder[bidder].user.data = reqBidsConfigObj.ortb2Fragments.bidder[bidder].user.data || [];

        reqBidsConfigObj.ortb2Fragments.bidder[bidder].user.data.push({
          name: 'scope3.com',
          ext: {
            segtax: 3333  // Scope3 Agentic Execution Engine (AEE) Targeting Signals
          },
          segment: bidderData.segments.map(seg => ({ id: seg }))
        });

        // For AppNexus, also add as keywords in their expected format
        if (bidder === 'appnexus' || bidder === 'appnexusAst') {
          reqBidsConfigObj.ortb2Fragments.bidder[bidder].site = reqBidsConfigObj.ortb2Fragments.bidder[bidder].site || {};
          reqBidsConfigObj.ortb2Fragments.bidder[bidder].site.keywords = reqBidsConfigObj.ortb2Fragments.bidder[bidder].site.keywords || '';

          // Append Scope3 segments as keywords in AppNexus format
          const s3Keywords = bidderData.segments.map(seg => `s3_seg=${seg}`).join(',');
          if (reqBidsConfigObj.ortb2Fragments.bidder[bidder].site.keywords) {
            reqBidsConfigObj.ortb2Fragments.bidder[bidder].site.keywords += ',' + s3Keywords;
          } else {
            reqBidsConfigObj.ortb2Fragments.bidder[bidder].site.keywords = s3Keywords;
          }
        }

        logMessage(`Scope3 RTD: Applied segments for ${bidder}`, bidderData.segments);
      }

      // Apply deals to ad units
      if (bidderData.deals && bidderData.deals.length > 0) {
        reqBidsConfigObj.adUnits?.forEach(adUnit => {
          adUnit.ortb2Imp = adUnit.ortb2Imp || {};
          adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
          adUnit.ortb2Imp.ext[bidder] = adUnit.ortb2Imp.ext[bidder] || {};
          (adUnit.ortb2Imp.ext[bidder] as any).deals = bidderData.deals;
        });

        logMessage(`Scope3 RTD: Applied deals for ${bidder}`, bidderData.deals);
      }
    });
  }
}

/**
 * Prepare the payload for the Scope3 API
 */
function preparePayload(ortb2Data: any, reqBidsConfigObj: StartAuctionOptions): any {
  // Get bidder list - use configured bidders or extract from ad units
  let bidders = moduleConfig?.bidders;
  if (!bidders || bidders.length === 0) {
    // Get all bidders from the ad units
    bidders = getBidderCodes(reqBidsConfigObj.adUnits);
  }

  return {
    orgId: moduleConfig?.orgId,
    ortb2: ortb2Data,
    bidders: bidders,
    timestamp: Date.now(),
    source: 'prebid-rtd'
  };
}

/**
 * Main RTD provider specification
 */
export const scope3SubModule: RtdProviderSpec<'scope3'> = {
  name: 'scope3',

  init(config, consent) {
    try {
      logMessage('Scope3 RTD: Initializing module', config);

      if (!config || !config.params) {
        logError('Scope3 RTD: Missing configuration or params', config);
        return false;
      }

      if (!config.params.orgId) {
        logError('Scope3 RTD: Missing required orgId parameter. Config params:', config.params);
        return false;
      }

      return initModule(config.params);
    } catch (e) {
      logError('Scope3 RTD: Error during initialization', e);
      return false;
    }
  },

  getBidRequestData(reqBidsConfigObj, callback, config, consent, timeout) {
    try {
      if (!moduleConfig) {
        logWarn('Scope3 RTD: Module not properly initialized');
        callback();
        return;
      }

      // Extract complete OpenRTB data
      const ortb2Data = extractOrtb2Data(reqBidsConfigObj);

      // Check cache first
      const cacheKey = generateCacheKey(ortb2Data);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        applyAgentDecisions(reqBidsConfigObj, cachedData);
        callback();
        return;
      }

      // Prepare payload
      const payload = preparePayload(ortb2Data, reqBidsConfigObj);

      // Make API request
      ajaxBuilder(moduleConfig.timeout)(
        moduleConfig.endpoint!,
        {
          success: (response: string) => {
            try {
              const data = JSON.parse(response) as AEEResponse;
              logMessage('Scope3 RTD: Received response', data);

              if (data.aee_signals) {
                // Cache the response
                setCachedData(cacheKey, data.aee_signals);

                // Apply the signals
                applyAgentDecisions(reqBidsConfigObj, data.aee_signals);
              }
            } catch (e) {
              logError('Scope3 RTD: Error parsing response', e);
            }
            callback();
          },
          error: (error: string) => {
            logWarn('Scope3 RTD: Request failed', error);
            callback();
          }
        },
        JSON.stringify(payload),
        {
          method: 'POST',
          contentType: 'application/json',
          customHeaders: {
            'x-rtd-version': MODULE_VERSION
          }
        }
      );
    } catch (e) {
      logError('Scope3 RTD: Error in getBidRequestData', e);
      callback();
    }
  },

  getTargetingData(adUnits, config, consent, auction) {
    const targetingData = {};

    const ortb: ORTBFragments = auctionManager.index
      .getAuction(auction)
      .getFPD().global;
    const cacheKey = generateCacheKey(ortb);
    const cachedData = getCachedData(cacheKey);

    if (!cachedData) {
      return targetingData;
    }

    const mappedCachedData = {};
    if (cachedData.include) {
      mappedCachedData[moduleConfig.includeKey] = cachedData.include;
    }
    if (cachedData.exclude) {
      mappedCachedData[moduleConfig.excludeKey] = cachedData.exclude;
    }
    if (cachedData.macro) {
      mappedCachedData[moduleConfig.macroKey] = cachedData.macro;
    }

    // Merge the targeting data into the ad units
    adUnits.forEach((adUnit) => {
      targetingData[adUnit] = targetingData[adUnit] || {};
      mergeDeep(targetingData[adUnit], mappedCachedData);
    });

    // If the key contains no data, remove it
    Object.keys(targetingData).forEach((adUnit) => {
      Object.keys(targetingData[adUnit]).forEach((key) => {
        if (!targetingData[adUnit][key] || !targetingData[adUnit][key].length) {
          delete targetingData[adUnit][key];
        }
      });

      // If the ad unit contains no data, remove it
      if (!Object.keys(targetingData[adUnit]).length) {
        delete targetingData[adUnit];
      }
    });

    return targetingData;
  },
};

// Register the submodule
function registerSubModule() {
  submodule('realTimeData', scope3SubModule);
}
registerSubModule();

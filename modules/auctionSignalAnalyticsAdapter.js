/**
 * Auction Signal Analytics Adapter for Prebid.js
 *
 * This adapter collects auction telemetry and sends it to publisher-configured
 * AI/demand partners (Microsoft, OpenAI, etc.). Publishers choose which vendors
 * receive their standardized auction data and can control which fields are shared.
 *
 * Supports three data modes:
 * - 'raw': Full telemetry (default), respects excludeFields
 * - 'index': Only the calculated auction signal score with minimal metadata
 * - 'both': Both raw data and auction signal score in the same payload
 *
 * @module modules/auctionSignalAnalyticsAdapter
 */

import { logInfo, logWarn, logError } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import { getGlobal } from '../src/prebidGlobal.js';

const ADAPTER_CODE = 'auctionSignal'; // Unique identifier for this analytics adapter
const ADAPTER_VERSION = '1.1.0'; // Semantic version for tracking adapter updates
const GVLID = null; // Global Vendor List ID - to be assigned by Prebid.org when contributing

/**
 * Valid data modes for vendors
 * - 'raw': Full telemetry payload (default), respects excludeFields
 * - 'index': Only calculated demand index score with minimal metadata
 * - 'both': Combined payload with both raw data and demand index
 */
const DATA_MODES = ['raw', 'index', 'both'];

/**
 * All available payload fields that can be excluded (for raw mode)
 */
const PAYLOAD_FIELDS = [
  'domain',
  'pageUrl',
  'publisherId',
  'timestamp',
  'auctionId',
  'adapterVersion',
  'pbjsVersion',
  'adUnits',
  'bidderRequests',
  'bidResponses',
  'noBids',
  'uniqueBidders',
  'bidderList',
  'cpmStats',
  'fillRate',
  'auctionDuration'
];

// Logging helper
const log = {
  info: (msg, ...args) => logInfo(`${ADAPTER_CODE} Analytics: ${msg}`, ...args),
  warn: (msg, ...args) => logWarn(`${ADAPTER_CODE} Analytics: ${msg}`, ...args),
  error: (msg, ...args) => logError(`${ADAPTER_CODE} Analytics: ${msg}`, ...args),
};

/**
 * Store for collecting auction data before sending
 * @type {Object.<string, AuctionData>}
 */
const auctionCache = {};

/**
 * @typedef {Object} AuctionData
 * @property {string} auctionId
 * @property {number} auctionStart
 * @property {number} adUnits
 * @property {number} bidderRequests
 * @property {number} bidResponses
 * @property {number} noBids
 * @property {number[]} cpms
 * @property {Set<string>} bidders
 */

/**
 * @typedef {Object} VendorConfig
 * @property {string} name Vendor identifier (e.g., 'microsoft', 'openai')
 * @property {string} endpoint URL to send telemetry data
 * @property {'raw'|'index'|'both'} [dataMode='raw'] What data to send
 * @property {string[]} [excludeFields] Fields to exclude for this vendor (raw mode only)
 */

/**
 * Configuration for the adapter
 * @type {{ vendors: VendorConfig[], publisherId: string|null, excludeFields: string[] }}
 */
let config = {
  vendors: [], // Array of vendor configurations with endpoints
  publisherId: null, // Optional publisher identifier for tracking
  excludeFields: [], // Global fields to exclude from raw payloads
};

/**
 * Create the analytics adapter
 * Extends the base AnalyticsAdapter with custom event tracking
 */
const auctionSignalAdapter = Object.assign(
  adapter({ analyticsType: 'endpoint' }), // Use endpoint-based analytics
  { track: trackEvent } // Override with custom event handler
);

// Store original enable function for extension
auctionSignalAdapter.originEnableAnalytics = auctionSignalAdapter.enableAnalytics;

/**
 * Custom enable function to capture configuration
 * @param {Object} adapterConfig
 */
auctionSignalAdapter.enableAnalytics = function (adapterConfig) {
  if (typeof adapterConfig !== 'object' || adapterConfig === null) {
    log.error('Invalid configuration object provided.');
    return;
  }

  const { options = {} } = adapterConfig;

  // Validate vendors configuration
  if (!options.vendors || !Array.isArray(options.vendors) || options.vendors.length === 0) {
    log.error('No vendors configured. Please provide at least one vendor with name and endpoint.');
    return;
  }

  // Validate each vendor has required fields
  const validVendors = options.vendors.filter(vendor => {
    if (!vendor.name || typeof vendor.name !== 'string') {
      log.warn('Vendor missing name, skipping:', vendor);
      return false;
    }
    if (!vendor.endpoint || typeof vendor.endpoint !== 'string') {
      log.warn(`Vendor "${vendor.name}" missing endpoint, skipping`);
      return false;
    }
    // Validate dataMode if provided
    if (vendor.dataMode && !DATA_MODES.includes(vendor.dataMode)) {
      log.warn(`Vendor "${vendor.name}" has invalid dataMode "${vendor.dataMode}", defaulting to 'raw'`);
      vendor.dataMode = 'raw';
    }
    // Default dataMode to 'raw' if not specified
    if (!vendor.dataMode) {
      vendor.dataMode = 'raw';
    }
    // Validate excludeFields if provided
    if (vendor.excludeFields && !Array.isArray(vendor.excludeFields)) {
      log.warn(`Vendor "${vendor.name}" has invalid excludeFields, ignoring`);
      vendor.excludeFields = [];
    }
    return true;
  });

  if (validVendors.length === 0) {
    log.error('No valid vendors configured after validation.');
    return;
  }

  config.vendors = validVendors;
  config.publisherId = options.publisherId || null;

  // Set global excludeFields
  if (options.excludeFields && Array.isArray(options.excludeFields)) {
    config.excludeFields = options.excludeFields.filter(field => {
      if (!PAYLOAD_FIELDS.includes(field)) {
        log.warn(`Unknown field "${field}" in excludeFields, ignoring`);
        return false;
      }
      return true;
    });
  } else {
    config.excludeFields = [];
  }

  log.info('Enabled with config:', {
    vendors: config.vendors.map(v => ({
      name: v.name,
      endpoint: v.endpoint,
      dataMode: v.dataMode,
      excludeFields: v.excludeFields || 'using global'
    })),
    publisherId: config.publisherId,
    globalExcludeFields: config.excludeFields
  });

  auctionSignalAdapter.originEnableAnalytics(adapterConfig);
};

/**
 * Handle Prebid events
 * @param {Object} param0
 * @param {string} param0.eventType
 * @param {Object} param0.args
 */
function trackEvent({ eventType, args }) {
  switch (eventType) {
    case EVENTS.AUCTION_INIT:
      onAuctionInit(args);
      break;
    case EVENTS.BID_REQUESTED:
      onBidRequested(args);
      break;
    case EVENTS.BID_RESPONSE:
      onBidResponse(args);
      break;
    case EVENTS.NO_BID:
      onNoBid(args);
      break;
    case EVENTS.AUCTION_END:
      onAuctionEnd(args);
      break;
    default:
      break;
  }
}

/**
 * Handle AUCTION_INIT event
 * @param {Object} args
 */
function onAuctionInit(args) {
  const { auctionId, adUnits = [], timestamp } = args;

  auctionCache[auctionId] = {
    auctionId,
    auctionStart: timestamp || Date.now(), // Auction start time for duration calculation
    adUnits: adUnits.length, // Count of ad units in this auction
    bidderRequests: 0, // Running count of bid requests
    bidResponses: 0, // Running count of valid bid responses
    noBids: 0, // Running count of no-bid responses
    cpms: [], // Array of CPM values for statistics
    bidders: new Set(), // Set of unique bidder codes
  };

  log.info(`Auction initialized: ${auctionId} with ${adUnits.length} ad units`);
}

/**
 * Handle BID_REQUESTED event
 * @param {Object} args
 */
function onBidRequested(args) {
  const { auctionId, bidderCode, bids = [] } = args;
  const auction = auctionCache[auctionId];

  if (!auction) {
    log.warn(`Auction ${auctionId} not found in cache`);
    return;
  }

  auction.bidderRequests += bids.length;
  auction.bidders.add(bidderCode);
}

/**
 * Handle BID_RESPONSE event
 * @param {Object} args
 */
function onBidResponse(args) {
  const { auctionId, cpm } = args;
  const auction = auctionCache[auctionId];

  if (!auction) {
    log.warn(`Auction ${auctionId} not found in cache`);
    return;
  }

  auction.bidResponses++;
  if (typeof cpm === 'number' && cpm > 0) {
    auction.cpms.push(cpm);
  }
}

/**
 * Handle NO_BID event
 * @param {Object} args
 */
function onNoBid(args) {
  const { auctionId } = args;
  const auction = auctionCache[auctionId];

  if (!auction) {
    return;
  }

  auction.noBids++;
}

/**
 * Handle AUCTION_END event - send collected data to all configured vendors
 * @param {Object} args
 */
function onAuctionEnd(args) {
  const { auctionId, auctionEnd } = args;
  const auction = auctionCache[auctionId];

  if (!auction) {
    log.warn(`Auction ${auctionId} not found in cache`);
    return;
  }

  const auctionDuration = (auctionEnd || Date.now()) - auction.auctionStart;

  // Calculate CPM statistics
  const cpmStats = calculateCpmStats(auction.cpms);

  // Calculate fill rate
  const totalRequests = auction.bidderRequests;
  const fillRate = totalRequests > 0 ? auction.bidResponses / totalRequests : 0;

  // Calculate the auction signal score
  const auctionSignal = calculateAuctionSignal(fillRate, cpmStats.avg, auction.bidders.size);

  // Get content context from auction ORTB2 data (set by AI RTD providers)
  const contentContext = getContentContext(args);

  // Build the full telemetry payload (for 'raw' and 'both' modes)
  const fullPayload = {
    // Identification fields
    domain: window.location.hostname, // Publisher domain
    pageUrl: window.location.pathname, // Page path (without domain for privacy)
    publisherId: config.publisherId, // Optional publisher ID from config

    // Auction metadata
    timestamp: new Date().toISOString(), // ISO 8601 timestamp
    auctionId: auctionId, // Unique Prebid auction identifier
    adapterVersion: ADAPTER_VERSION, // For tracking adapter version in data
    pbjsVersion: '$prebid.version$', // Prebid.js version (replaced at build time)
    userAgent: navigator.userAgent, // Browser UA for bot/agent detection

    // Auction metrics
    adUnits: auction.adUnits, // Number of ad units in auction
    bidderRequests: auction.bidderRequests, // Total bid requests sent
    bidResponses: auction.bidResponses, // Valid bids received
    noBids: auction.noBids, // No-bid responses
    uniqueBidders: auction.bidders.size, // Count of unique bidders
    bidderList: Array.from(auction.bidders), // Array of bidder codes

    // Value metrics
    cpmStats: cpmStats, // Object with avg, max, min, median CPM
    fillRate: Math.round(fillRate * 100) / 100, // Ratio of responses to requests

    // Timing
    auctionDuration: auctionDuration, // Total auction time in milliseconds
  };

  // Build the index-only payload (minimal, privacy-preserving for 'index' mode)
  const indexPayload = {
    domain: window.location.hostname, // Publisher domain for context
    timestamp: new Date().toISOString(), // When the score was calculated
    userAgent: navigator.userAgent, // For bot detection
    auctionSignal: auctionSignal, // The calculated auction quality score (0-1)
    adUnits: auction.adUnits, // Basic context about auction size
    uniqueBidders: auction.bidders.size, // Bidder diversity indicator
    fillRate: Math.round(fillRate * 100) / 100, // Fill rate for context
  };

  // Add content context to both payloads if available
  if (contentContext) {
    fullPayload.contentContext = contentContext;
    indexPayload.contentContext = contentContext;
    log.info('Content context added to payloads:', contentContext);
  }

  log.info('Sending telemetry to configured vendors');

  // Send to all configured vendors based on their dataMode
  sendTelemetryToVendors(fullPayload, indexPayload, auctionSignal);

  // Clean up cache
  delete auctionCache[auctionId];
}

/**
 * Calculate CPM statistics from an array of CPM values
 * @param {number[]} cpms
 * @returns {Object}
 */
function calculateCpmStats(cpms) {
  if (!cpms || cpms.length === 0) {
    return { avg: 0, max: 0, min: 0, median: 0 };
  }

  const sorted = [...cpms].sort((a, b) => a - b);
  const sum = cpms.reduce((a, b) => a + b, 0);
  const avg = sum / cpms.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Calculate median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    avg: Math.round(avg * 100) / 100,
    max: Math.round(max * 100) / 100,
    min: Math.round(min * 100) / 100,
    median: Math.round(median * 100) / 100,
  };
}

/**
 * Build content context object from site content data
 * @param {Object} siteContent - The site.content object from ORTB2
 * @returns {Object|null} Content context object or null if empty
 */
function buildContextObject(siteContent) {
  if (!siteContent || (!siteContent.language && !siteContent.keywords)) {
    return null;
  }

  const context = {};
  if (siteContent.language) {
    context.language = siteContent.language;
  }
  if (siteContent.keywords && Array.isArray(siteContent.keywords) && siteContent.keywords.length > 0) {
    context.keywords = siteContent.keywords;
  }
  if (Object.keys(context).length > 0) {
    context.source = 'ortb2';
    return context;
  }

  return null;
}

/**
 * Get content context from auction ORTB2 data (set by AI RTD providers)
 * RTD providers add content to auction-specific ortb2Fragments, not global config
 * @param {Object} auctionArgs - The auction end args containing ORTB2 data
 * @returns {Object|null} Content context object or null if not available
 */
function getContentContext(auctionArgs) {
  try {
    // Debug: Log the entire auction structure to see where content ends up
    log.info('Searching for content context in auction data...');

    if (auctionArgs && auctionArgs.bidderRequests) {
      log.info(`Checking ${auctionArgs.bidderRequests.length} bidder requests for ORTB2 content...`);

      for (let i = 0; i < auctionArgs.bidderRequests.length; i++) {
        const bidderRequest = auctionArgs.bidderRequests[i];
        log.info(`BidderRequest[${i}] (${bidderRequest.bidderCode}):`, {
          hasOrtb2: !!bidderRequest.ortb2,
          hasSite: !!bidderRequest.ortb2?.site,
          hasContent: !!bidderRequest.ortb2?.site?.content,
          content: bidderRequest.ortb2?.site?.content
        });

        if (bidderRequest.ortb2?.site?.content) {
          log.info('Content context found in bidder request ORTB2:', bidderRequest.ortb2.site.content);
          return buildContextObject(bidderRequest.ortb2.site.content);
        }
      }
    }

    // Also check if there's content in the main auction args
    if (auctionArgs && auctionArgs.ortb2?.site?.content) {
      log.info('Content context found in main auction ORTB2:', auctionArgs.ortb2.site.content);
      return buildContextObject(auctionArgs.ortb2.site.content);
    }

    // Fallback to global config if not found in auction data
    const pbjs = getGlobal();
    const globalOrtb2 = pbjs.getConfig('ortb2') || {};
    if (globalOrtb2.site?.content) {
      log.info('Content context found in global ORTB2 config:', globalOrtb2.site.content);
      return buildContextObject(globalOrtb2.site.content);
    }

    log.warn('No content context found in auction data or global config');
    return null;
  } catch (error) {
    log.warn('Could not read content context from ORTB2:', error);
    return null;
  }
}

/**
 * Calculate the auction signal score (0-1)
 * This is a normalized score representing demand quality for the inventory
 *
 * Formula: (fillRate * 0.4) + (normalizedCpm * 0.4) + (bidderDiversity * 0.2)
 *
 * @param {number} fillRate - Bid fill rate (0-1)
 * @param {number} avgCpm - Average CPM value
 * @param {number} uniqueBidders - Number of unique bidders
 * @returns {number} Auction signal score between 0 and 1
 */
function calculateAuctionSignal(fillRate, avgCpm, uniqueBidders) {
  // Fill rate component (40% weight)
  // Already normalized 0-1, cap at 1 for safety
  const fillRateScore = Math.min(fillRate, 1);

  // CPM component (40% weight)
  // Normalize to 0-1 scale using $10 as baseline for "excellent" demand
  const normalizedCpm = Math.min(avgCpm / 10, 1); // $10 CPM = score of 1.0

  // Bidder diversity component (20% weight)
  // More bidders = healthier competition, 10 bidders = ideal diversity
  const bidderDiversityScore = Math.min(uniqueBidders / 10, 1);

  // Weighted formula: fillRate*0.4 + cpm*0.4 + diversity*0.2
  const score = (fillRateScore * 0.4) + (normalizedCpm * 0.4) + (bidderDiversityScore * 0.2);

  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Filter payload by removing excluded fields
 * @param {Object} payload - The full telemetry payload
 * @param {string[]} excludeFields - Fields to exclude
 * @returns {Object} Filtered payload
 */
function filterPayload(payload, excludeFields) {
  if (!excludeFields || excludeFields.length === 0) {
    return payload;
  }

  const filtered = { ...payload };
  excludeFields.forEach(field => {
    delete filtered[field];
  });
  return filtered;
}

/**
 * Get the effective exclude fields for a vendor
 * Per-vendor excludeFields overrides global if specified
 * @param {VendorConfig} vendor - Vendor configuration
 * @returns {string[]} Fields to exclude
 */
function getExcludeFieldsForVendor(vendor) {
  // If vendor has its own excludeFields, use that (override global)
  if (vendor.excludeFields && vendor.excludeFields.length > 0) {
    return vendor.excludeFields;
  }
  // Otherwise use global excludeFields
  return config.excludeFields;
}

/**
 * Send telemetry data to all configured vendors based on their dataMode
 * @param {Object} fullPayload - The full telemetry payload (for 'raw' mode)
 * @param {Object} indexPayload - The index-only payload (for 'index' mode)
 * @param {number} auctionSignal - The calculated auction signal score
 */
function sendTelemetryToVendors(fullPayload, indexPayload, auctionSignal) {
  config.vendors.forEach(vendor => {
    let payloadToSend;

    switch (vendor.dataMode) {
      case 'index':
        // Send only the minimal index payload
        payloadToSend = indexPayload;
        log.info(`Sending INDEX-only payload to vendor: ${vendor.name}`);
        break;

      case 'both':
        // Send both raw data and the auction signal
        const excludeFields = getExcludeFieldsForVendor(vendor);
        const filteredFull = filterPayload(fullPayload, excludeFields);
        payloadToSend = {
          ...filteredFull,
          auctionSignal: auctionSignal,
        };
        log.info(`Sending BOTH (raw + index) payload to vendor: ${vendor.name}`);
        break;

      case 'raw':
      default:
        // Send filtered full payload (default behavior)
        const excludeFieldsRaw = getExcludeFieldsForVendor(vendor);
        payloadToSend = filterPayload(fullPayload, excludeFieldsRaw);
        log.info(`Sending RAW payload to vendor: ${vendor.name}`);
        break;
    }

    sendToVendor(vendor, payloadToSend);
  });
}

/**
 * Send telemetry data to a specific vendor
 * @param {VendorConfig} vendor - Vendor configuration
 * @param {Object} payload - The payload to send
 */
function sendToVendor(vendor, payload) {
  ajax(
    vendor.endpoint,
    {
      success: () => {
        log.info(`Telemetry sent successfully to vendor: ${vendor.name}`);
      },
      error: (error) => {
        log.error(`Failed to send telemetry to vendor ${vendor.name}:`, error);
      }
    },
    JSON.stringify(payload),
    {
      method: 'POST',
      contentType: 'application/json',
      withCredentials: false,
    }
  );
}

// Register the adapter
adapterManager.registerAnalyticsAdapter({
  adapter: auctionSignalAdapter,
  code: ADAPTER_CODE,
  gvlid: GVLID,
});

export default auctionSignalAdapter;

// bidderOptimisation.js – Bidder selection / exclusion helper for PubMatic RTD provider

import { deepClone, logWarn, logInfo, parseUrl, generateUUID } from '../../src/utils.js';
import { getRefererInfo } from '../../src/refererDetection.js';
import { auctionManager } from '../../src/auctionManager.js';

const MODULE_NAME = 'Bidder Optimisation';

/* PriceFloors-style helpers for auto-derivation */

// Field matching functions for each schema field
const fieldMatchingFunctions = {
  domain: (ctx) => ctx.domain || getHostname(),
  mediaType: (ctx) => ctx.mediaType || deriveMediaType(ctx.bidRequest, ctx.bidResponse),
  browser: (ctx) => ctx.browser || '*',
  adUnitCode: (ctx) => ctx.adUnitCode || '*'
};

function enumeratePossibleFieldValues(keyFields = [], context) {
  if (!keyFields.length) return [];
  return keyFields.reduce((accum, field) => {
    let exact = fieldMatchingFunctions[field] ? fieldMatchingFunctions[field](context) : '*';
    exact = exact == null ? '*' : String(exact);
    accum.push(exact === '*' ? ['*'] : [exact.toLowerCase(), '*']);
    return accum;
  }, []);
}
const getHostname = (() => {
  let domain;
  return function() {
    if (domain == null) {
      domain = parseUrl(getRefererInfo().topmostLocation, { noDecodeWholeURL: true }).hostname;
    }
    return domain;
  };
})();

/* -------------------------------------------------------------------------- */
/*                       Internal, mutable module state                       */
/* -------------------------------------------------------------------------- */

// The normalised config supplied via pubmaticRtdProvider
let _optConfig = null;

// Cache: auctionId => prepared optimisation data (lower-cased maps etc.)
const _auctionDataCache = {};

/* -------------------------------------------------------------------------- */
/*                                Public API                                  */
/* -------------------------------------------------------------------------- */

/**
 * Injects the optimisation schema coming from pubmaticRtdProvider.
 * A shallow validation + normalisation (lower-casing keys) is performed.
 *
 * @param {Object} cfg The JSON using the two-map schema of “Approach A”.
 */
function pickRandomModel(modelGroups) {
  const valid = modelGroups.filter(m => typeof m.modelWeight === 'number' && m.modelWeight > 0);
  const weightSum = valid.reduce((s, m) => s + m.modelWeight, 0);
  if (!weightSum) return valid[0] || modelGroups[0];
  let rnd = Math.floor(Math.random() * weightSum) + 1;
  for (let m of valid) {
    rnd -= m.modelWeight;
    if (rnd <= 0) return m;
  }
  return valid[0] || modelGroups[0];
}

export function setBidderOptimisationConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    logWarn(`${MODULE_NAME}: invalid config supplied`, cfg);
    return;
  }
  // Handle multiple models with weights
  let modelCfg = cfg;
  if (Array.isArray(cfg.modelGroups) && cfg.modelGroups.length) {
    modelCfg = pickRandomModel(cfg.modelGroups);
  }
  // inherit top-level skipRate if present
  if (cfg.skipRate != null && modelCfg.skipRate == null) {
    modelCfg.skipRate = cfg.skipRate;
  }
  _optConfig = normaliseConfig(modelCfg);
  logInfo(`${MODULE_NAME}: setBidderOptimisationConfig config Decision loaded - version %s`, _optConfig.modelVersion);
}

/**
 * Returns the bidder decision for a single impression context.
 *
 * @param {Object} context  { domain, mediaType, browser, adUnitCode, auctionId }
 * @returns {Object} { excludedBidders, clientBidders, serverBidders, clientSequence, skipped }
 */
/**
 * Helper to derive adUnitCode if not provided, mimicking priceFloors logic
 * Uses auctionManager index to resolve from bidRequest or bidResponse
 * @param {Object} bidRequest
 * @param {Object} bidResponse
 */
function deriveAdUnitCode(bidRequest, bidResponse) {
  if (bidRequest?.adUnitCode) return bidRequest.adUnitCode;
  if (bidResponse?.adUnitCode) return bidResponse.adUnitCode;
  const adUnit = bidResponse ? auctionManager.index.getAdUnit(bidResponse) : null;
  return adUnit?.code || '*';
}

/**
 * Derive mediaType if not supplied.
 */
function deriveAuctionId(ctx) {
  return ctx.auctionId || ctx.bidRequest?.auctionId || auctionManager.getLastAuctionId() || generateUUID();
}

function deriveMediaType(bidRequest, bidResponse) {
  if (bidResponse?.mediaType) return bidResponse.mediaType;
  const mediaTypes = Object.keys(bidRequest?.mediaTypes || {});
  return mediaTypes.length === 1 ? mediaTypes[0] : 'banner';
}

/**
 * Derive mediaType from adUnit definition
 */
function deriveMediaTypeFromAdUnit(adUnit) {
  const keys = Object.keys(adUnit?.mediaTypes || {});
  return keys.length === 1 ? keys[0] : 'banner';
}

export function getBidderDecision(context = {}) {
  // Auto-fill context fields if caller omitted them
  if (!context.domain) {
    context.domain = getHostname();
  }
  if (!context.mediaType) {
    context.mediaType = deriveMediaType(context.bidRequest, context.bidResponse);
  }
  if (!_optConfig) {
    logWarn(`${MODULE_NAME}: getBidderDecision called before config is set`);
    return fallbackDecision();
  }

  // Random skip handling – same semantics as priceFloors
  if (shouldSkip(_optConfig.skipRate)) {
    return { skipped: true };
  }

  // Pull / build auction-level prepared data once per auction
  const auctionId = deriveAuctionId(context);
  if (!_auctionDataCache[auctionId]) {
    _auctionDataCache[auctionId] = buildPreparedData(_optConfig);
  }
  const prep = _auctionDataCache[auctionId];

  // If multiple adUnits, build decision map per adUnit for excluded bidders
  const adUnitsArr = context.reqBidsConfigObj?.adUnits;
  let excludedByAdUnit = undefined;
  if (Array.isArray(adUnitsArr) && adUnitsArr.length) {
    excludedByAdUnit = {};
    adUnitsArr.forEach(au => {
      const auCtx = {
        ...context,
        adUnitCode: au.code,
        mediaType: deriveMediaTypeFromAdUnit(au)
      };
      const rule = getFirstMatchingValue(prep.adUnitOverrides, _optConfig.schema.adUnitKeyFields, auCtx, _optConfig.schema.delimiter);
      excludedByAdUnit[au.code] = rule?.excludedBidders ?? _optConfig.default.excludedBidders;
    });
  }
  
  const auctionRule = getFirstMatchingValue(
    prep.auctionValues,
    _optConfig.schema.auctionKeyFields,
    context,
    _optConfig.schema.delimiter
  );

  // 2) ad-unit overrides (excludedBidders only)
  // const adUnitRuleSingle = getFirstMatchingValue(
  //   prep.adUnitOverrides,
  //   _optConfig.schema.adUnitKeyFields,
  //   context,
  //   _optConfig.schema.delimiter
  // );

  return {
    clientBidders: auctionRule?.clientBidders ?? _optConfig.default.clientBidders,
    serverBidders: auctionRule?.serverBidders ?? _optConfig.default.serverBidders,
    clientSequence: auctionRule?.clientSequence ?? _optConfig.default.clientSequence,
    skipped: false,
    excludedBiddersByAdUnit: excludedByAdUnit
  };
}

/* -------------------------------------------------------------------------- */
/*                               Helper logic                                 */
/* -------------------------------------------------------------------------- */

function fallbackDecision() {
  return { excludedBidders: [], clientBidders: ['*'], serverBidders: [], clientSequence: [], skipped: true };
}

function shouldSkip(skipRate = 0) {
  const rate = parseInt(skipRate, 10);
  return rate > 0 && Math.random() * 100 < rate;
}

/** Lower-cases all rule keys so lookups are case-insensitive */
function normaliseConfig(cfg) {
  const copy = deepClone(cfg);
  const lowerCaseKeys = (obj) =>
    Object.keys(obj || {}).reduce((acc, k) => {
      acc[k.toLowerCase()] = obj[k];
      return acc;
    }, {});
  copy.auctionValues = lowerCaseKeys(copy.auctionValues);
  copy.adUnitOverrides = lowerCaseKeys(copy.adUnitOverrides);
  copy.schema.delimiter = copy.schema.delimiter || '|';
  return copy;
}

function buildPreparedData(cfg) {
  // For now just expose the lower-cased maps; more pre-processing could happen here later.
  return {
    auctionValues: cfg.auctionValues,
    adUnitOverrides: cfg.adUnitOverrides
  };
}

/**
 * Generates all key permutations (exact-to-wildcard) and returns the first hit.
 */
function getFirstMatchingValue(valuesMap, keyFieldOrder, ctx, delim) {
  if (!valuesMap || !keyFieldOrder?.length) return undefined;
  const fieldValues = enumeratePossibleFieldValues(keyFieldOrder, ctx);
  if (!fieldValues.length) return undefined;
  const possibleKeys = generatePossibleEnumerations(fieldValues, delim);
  for (let k of possibleKeys) {
    if (valuesMap.hasOwnProperty(k)) {
      return valuesMap[k];
    }
  }
  return undefined;
}


function generatePossibleEnumerations(arrayOfFields, delimiter) {
  return arrayOfFields
    .reduce((accum, currentVal) => {
      const res = [];
      accum.forEach((base) => {
        currentVal.forEach((val) => {
          res.push(base ? base + delimiter + val : val);
        });
      });
      return res;
    }, [''])
    .filter(Boolean)
    .sort((a, b) => a.split('*').length - b.split('*').length);
}

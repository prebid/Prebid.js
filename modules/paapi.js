/**
 * Collect PAAPI component auction configs from bid adapters and make them available through `pbjs.getPAAPIConfig()`
 */
import {config} from '../src/config.js';
import {getHook, hook, module} from '../src/hook.js';
import {
  deepAccess,
  deepEqual,
  deepSetValue,
  logError,
  logInfo,
  logWarn,
  mergeDeep,
  sizesToSizeTuples
} from '../src/utils.js';
import {IMP, PBS, registerOrtbProcessor, RESPONSE} from '../src/pbjsORTB.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';
import {currencyCompare} from '../libraries/currencyUtils/currency.js';
import {keyCompare, maximum, minimum} from '../src/utils/reducers.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {auctionStore} from '../libraries/weakStore/weakStore.js';
import {adapterMetrics, guardTids} from '../src/adapters/bidderFactory.js';
import {defer} from '../src/utils/promise.js';
import {auctionManager} from '../src/auctionManager.js';

const MODULE = 'PAAPI';

const submodules = [];
const USED = new WeakSet();

export function registerSubmodule(submod) {
  submodules.push(submod);
  submod.init && submod.init({
    getPAAPIConfig,
    expandFilters
  });
}

module('paapi', registerSubmodule);

/* auction configs as returned by getPAAPIConfigs */
const configsForAuction = auctionStore();

/* auction configs returned by adapters, but waiting for end-of-auction signals before they're added to configsForAuction */
const pendingConfigsForAuction = auctionStore();

/* igb returned by adapters, waiting for end-of-auction signals before they're merged into configForAuctions */
const pendingBuyersForAuction = auctionStore();

/* for auction configs that were generated in parallel with auctions (and contain promises), their resolve/reject methods */
const deferredConfigsForAuction = auctionStore();

let latestAuctionForAdUnit = {};
let moduleConfig = {};

config.getConfig('paapi', config => {
  init(config.paapi);
});

export function reset() {
  submodules.splice(0, submodules.length);
  latestAuctionForAdUnit = {};
}

export function init(cfg) {
  if (cfg && cfg.enabled === true) {
    if (!moduleConfig.enabled) {
      attachHandlers();
    }
    moduleConfig = cfg;
    logInfo(`${MODULE} enabled (browser ${isFledgeSupported() ? 'supports' : 'does NOT support'} runAdAuction)`, cfg);
  } else {
    if (moduleConfig.enabled) {
      detachHandlers();
    }
    moduleConfig = {};
    logInfo(`${MODULE} disabled`, cfg);
  }
}

function attachHandlers() {
  getHook('addPaapiConfig').before(addPaapiConfigHook);
  getHook('makeBidRequests').before(addPaapiData);
  getHook('makeBidRequests').after(markForFledge);
  getHook('processBidderRequests').before(parallelPaapiProcessing);
  events.on(EVENTS.AUCTION_INIT, onAuctionInit);
  events.on(EVENTS.AUCTION_END, onAuctionEnd);
}

function detachHandlers() {
  getHook('addPaapiConfig').getHooks({hook: addPaapiConfigHook}).remove();
  getHook('makeBidRequests').getHooks({hook: addPaapiData}).remove();
  getHook('makeBidRequests').getHooks({hook: markForFledge}).remove();
  getHook('processBidderRequests').getHooks({hook: parallelPaapiProcessing}).remove();
  events.off(EVENTS.AUCTION_INIT, onAuctionInit);
  events.off(EVENTS.AUCTION_END, onAuctionEnd);
}

function getStaticSignals(adUnit = {}) {
  const cfg = {};
  const requestedSize = getRequestedSize(adUnit);
  if (requestedSize) {
    cfg.requestedSize = requestedSize;
  }
  return cfg;
}

function getSlotSignals(bidsReceived = [], bidRequests = []) {
  let bidfloor, bidfloorcur;
  if (bidsReceived.length > 0) {
    const bestBid = bidsReceived.reduce(maximum(currencyCompare(bid => [bid.cpm, bid.currency])));
    bidfloor = bestBid.cpm;
    bidfloorcur = bestBid.currency;
  } else {
    const floors = bidRequests.map(bid => typeof bid.getFloor === 'function' && bid.getFloor()).filter(f => f);
    const minFloor = floors.length && floors.reduce(minimum(currencyCompare(floor => [floor.floor, floor.currency])));
    bidfloor = minFloor?.floor;
    bidfloorcur = minFloor?.currency;
  }
  const cfg = {};
  if (bidfloor) {
    deepSetValue(cfg, 'auctionSignals.prebid.bidfloor', bidfloor);
    bidfloorcur && deepSetValue(cfg, 'auctionSignals.prebid.bidfloorcur', bidfloorcur);
  }
  return cfg;
}

export function buyersToAuctionConfigs(igbRequests, merge = mergeBuyers, config = moduleConfig?.componentSeller ?? {}, partitioners = {
  compact: (igbRequests) => partitionBuyers(igbRequests.map(req => req[1])).map(part => [{}, part]),
  expand: partitionBuyersByBidder
}) {
  if (!config.auctionConfig) {
    logWarn(MODULE, 'Cannot use IG buyers: paapi.componentSeller.auctionConfig not set', igbRequests.map(req => req[1]));
    return [];
  }
  const partition = partitioners[config.separateAuctions ? 'expand' : 'compact'];
  return partition(igbRequests)
    .map(([request, igbs]) => {
      const auctionConfig = mergeDeep(merge(igbs), config.auctionConfig);
      auctionConfig.auctionSignals = setFPD(auctionConfig.auctionSignals || {}, request);
      return [request, auctionConfig];
    });
}

function onAuctionEnd({auctionId, bidsReceived, bidderRequests, adUnitCodes, adUnits}) {
  const adUnitsByCode = Object.fromEntries(adUnits?.map(au => [au.code, au]) || []);
  const allReqs = bidderRequests?.flatMap(br => br.bids);
  const paapiConfigs = configsForAuction(auctionId);
  (adUnitCodes || []).forEach(au => {
    if (!paapiConfigs.hasOwnProperty(au)) {
      paapiConfigs[au] = null;
    }
    !latestAuctionForAdUnit.hasOwnProperty(au) && (latestAuctionForAdUnit[au] = null);
  });

  const pendingConfigs = pendingConfigsForAuction(auctionId);
  const pendingBuyers = pendingBuyersForAuction(auctionId);

  if (pendingConfigs && pendingBuyers) {
    Object.entries(pendingBuyers).forEach(([adUnitCode, igbRequests]) => {
      buyersToAuctionConfigs(igbRequests).forEach(([{bidder}, auctionConfig]) => append(pendingConfigs, adUnitCode, {id: getComponentSellerConfigId(bidder), config: auctionConfig}))
    })
  }

  const deferredConfigs = deferredConfigsForAuction(auctionId);

  const adUnitsWithConfigs = Array.from(new Set(Object.keys(pendingConfigs).concat(Object.keys(deferredConfigs))));
  const signals = Object.fromEntries(
    adUnitsWithConfigs.map(adUnitCode => {
      latestAuctionForAdUnit[adUnitCode] = auctionId;
      const forThisAdUnit = (bid) => bid.adUnitCode === adUnitCode;
      return [adUnitCode, {
        ...getStaticSignals(adUnitsByCode[adUnitCode]),
        ...getSlotSignals(bidsReceived?.filter(forThisAdUnit), allReqs?.filter(forThisAdUnit))
      }]
    })
  )

  const configsById = {};
  Object.entries(pendingConfigs || {}).forEach(([adUnitCode, auctionConfigs]) => {
    auctionConfigs.forEach(({id, config}) => append(configsById, id, {
      adUnitCode,
      config: mergeDeep({}, signals[adUnitCode], config)
    }));
  });

  function resolveSignals(signals, deferrals) {
    Object.entries(deferrals).forEach(([signal, {resolve, default: defaultValue}]) => {
      let value = signals.hasOwnProperty(signal) ? signals[signal] : null;
      if (value == null && defaultValue == null) {
        value = undefined;
      } else if (typeof defaultValue === 'object' && typeof value === 'object') {
        value = mergeDeep({}, defaultValue, value);
      } else {
        value = value ?? defaultValue
      }
      resolve(value);
    })
  }

  Object.entries(deferredConfigs).forEach(([adUnitCode, {top, components}]) => {
    resolveSignals(signals[adUnitCode], top);
    Object.entries(components).forEach(([configId, {deferrals}]) => {
      const matchingConfigs = configsById.hasOwnProperty(configId) ? configsById[configId] : [];
      if (matchingConfigs.length > 1) {
        logWarn(`Received multiple PAAPI configs for the same bidder and seller (${configId}), active PAAPI auctions will only see the first`);
      }
      const {config} = matchingConfigs.shift() ?? {config: {...signals[adUnitCode]}}
      resolveSignals(config, deferrals);
    })
  });

  const newConfigs = Object.values(configsById).flatMap(configs => configs);
  const hasDeferredConfigs = Object.keys(deferredConfigs).length > 0;

  if (moduleConfig.parallel && hasDeferredConfigs && newConfigs.length > 0) {
    logError(`Received PAAPI configs after PAAPI auctions were already started in parallel with their contextual auction`, newConfigs)
  }

  newConfigs.forEach(({adUnitCode, config}) => {
    if (paapiConfigs[adUnitCode] == null) {
      paapiConfigs[adUnitCode] = {
        ...signals[adUnitCode],
        componentAuctions: []
      }
    }
    paapiConfigs[adUnitCode].componentAuctions.push(mergeDeep({}, signals[adUnitCode], config));
  });

  if (!moduleConfig.parallel || !hasDeferredConfigs) {
    submodules.forEach(submod => submod.onAuctionConfig?.(auctionId, paapiConfigs));
  }
}

function append(target, key, value) {
  !target.hasOwnProperty(key) && (target[key] = []);
  target[key].push(value);
}

function setFPD(target, {ortb2, ortb2Imp}) {
  ortb2 != null && deepSetValue(target, 'prebid.ortb2', mergeDeep({}, ortb2, target.prebid?.ortb2));
  ortb2Imp != null && deepSetValue(target, 'prebid.ortb2Imp', mergeDeep({}, ortb2Imp, target.prebid?.ortb2Imp));
  return target;
}

function getConfigId(bidderCode, seller) {
  return `${bidderCode}::${seller}`;
}

function getComponentSellerConfigId(bidderCode) {
  return moduleConfig.componentSeller.separateAuctions ? `igb::${bidderCode}` : 'igb';
}

export function addPaapiConfigHook(next, request, paapiConfig) {
  if (getFledgeConfig(config.getCurrentBidder()).enabled) {
    const {adUnitCode, auctionId, bidder} = request;

    // eslint-disable-next-line no-inner-declarations
    function storePendingData(store, data) {
      const target = store(auctionId);
      if (target != null) {
        append(target, adUnitCode, data)
      } else {
        logWarn(MODULE, `Received PAAPI config for auction that has closed (auction '${auctionId}', adUnit '${adUnitCode}')`, data);
      }
    }

    const {config, igb} = paapiConfig;
    if (config) {
      config.auctionSignals = setFPD(config.auctionSignals || {}, request);
      const pbs = config.perBuyerSignals = config.perBuyerSignals ?? {};
      (config.interestGroupBuyers || []).forEach(buyer => {
        pbs[buyer] = setFPD(pbs[buyer] ?? {}, request);
      })
      storePendingData(pendingConfigsForAuction, {id: getConfigId(bidder, config.seller), config});
    }
    if (igb && checkOrigin(igb)) {
      igb.pbs = setFPD(igb.pbs || {}, request);
      storePendingData(pendingBuyersForAuction, [request, igb])
    }
  }
  next(request, paapiConfig);
}

export const IGB_TO_CONFIG = {
  cur: 'perBuyerCurrencies',
  pbs: 'perBuyerSignals',
  ps: 'perBuyerPrioritySignals',
  maxbid: 'auctionSignals.prebid.perBuyerMaxbid',
}

function checkOrigin(igb) {
  if (igb.origin) return true;
  logWarn('PAAPI buyer does not specify origin and will be ignored', igb);
}

/**
 * Convert a list of InterestGroupBuyer (igb) objects into a partial auction config.
 * https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/Protected%20Audience%20Support.md
 */
export function mergeBuyers(igbs) {
  const buyers = new Set();
  return Object.assign(
    igbs.reduce((config, igb) => {
      if (checkOrigin(igb)) {
        if (!buyers.has(igb.origin)) {
          buyers.add(igb.origin);
          Object.entries(IGB_TO_CONFIG).forEach(([igbField, configField]) => {
            if (igb[igbField] != null) {
              const entry = deepAccess(config, configField) || {}
              entry[igb.origin] = igb[igbField];
              deepSetValue(config, configField, entry);
            }
          });
        } else {
          logWarn(MODULE, `Duplicate buyer: ${igb.origin}. All but the first will be ignored`, igbs);
        }
      }
      return config;
    }, {}),
    {
      interestGroupBuyers: Array.from(buyers.keys())
    }
  );
}

/**
 * Partition a list of InterestGroupBuyer (igb) object into sets that can each be merged into a single auction.
 * If the same buyer (origin) appears more than once, it will be split across different partition unless the igb objects
 * are identical.
 */
export function partitionBuyers(igbs) {
  return igbs.reduce((partitions, igb) => {
    if (checkOrigin(igb)) {
      let partition = partitions.find(part => !part.hasOwnProperty(igb.origin) || deepEqual(part[igb.origin], igb));
      if (!partition) {
        partition = {};
        partitions.push(partition);
      }
      partition[igb.origin] = igb;
    }
    return partitions;
  }, []).map(part => Object.values(part));
}

export function partitionBuyersByBidder(igbRequests) {
  const requests = {};
  const igbs = {};
  igbRequests.forEach(([request, igb]) => {
    !requests.hasOwnProperty(request.bidder) && (requests[request.bidder] = request);
    append(igbs, request.bidder, igb);
  })
  return Object.entries(igbs).map(([bidder, igbs]) => [requests[bidder], igbs])
}

/**
 * Expand PAAPI api filters into a map from ad unit code to auctionId.
 *
 * @param auctionId when specified, the result will have this as the value for each entry.
 * when not specified, each ad unit will map to the latest auction that involved that ad unit.
 * @param adUnitCode when specified, the result will contain only one entry (for this ad unit) or be empty (if this ad
 * unit was never involved in an auction).
 * when not specified, the result will contain an entry for every ad unit that was involved in any auction.
 * @return {{[adUnitCode: string]: string}}
 */
function expandFilters({auctionId, adUnitCode} = {}) {
  let adUnitCodes = [];
  if (adUnitCode == null) {
    adUnitCodes = Object.keys(latestAuctionForAdUnit);
  } else if (latestAuctionForAdUnit.hasOwnProperty(adUnitCode)) {
    adUnitCodes = [adUnitCode];
  }
  return Object.fromEntries(
    adUnitCodes.map(au => [au, auctionId ?? latestAuctionForAdUnit[au]])
  );
}

/**
 * Get PAAPI auction configuration.
 *
 * @param {Object} [filters] - Filters object
 * @param {string} [filters.auctionId] optional auction filter; if omitted, the latest auction for each ad unit is used
 * @param {string} [filters.adUnitCode] optional ad unit filter
 * @param {boolean} [includeBlanks=false] if true, include null entries for ad units that match the given filters but do not have any available auction configs.
 * @returns {Object} a map from ad unit code to auction config for the ad unit.
 */
export function getPAAPIConfig(filters = {}, includeBlanks = false) {
  const output = {};
  Object.entries(expandFilters(filters)).forEach(([au, auctionId]) => {
    const auctionConfigs = configsForAuction(auctionId);
    if (auctionConfigs?.hasOwnProperty(au)) {
      // ad unit was involved in a PAAPI auction
      const candidate = auctionConfigs[au];
      if (candidate && !USED.has(candidate)) {
        output[au] = candidate;
        USED.add(candidate);
      } else if (includeBlanks) {
        output[au] = null;
      }
    } else if (auctionId == null && includeBlanks) {
      // ad unit was involved in a non-PAAPI auction
      output[au] = null;
    }
  });
  return output;
}

getGlobal().getPAAPIConfig = (filters) => getPAAPIConfig(filters);

function isFledgeSupported() {
  return 'runAdAuction' in navigator && 'joinAdInterestGroup' in navigator;
}

function getFledgeConfig(bidder) {
  const enabled = moduleConfig.enabled && (bidder == null || !moduleConfig.bidders?.length || moduleConfig.bidders?.includes(bidder));
  return {
    enabled,
    ae: enabled ? moduleConfig.defaultForSlots : undefined
  };
}

/**
 * Given an array of size tuples, return the one that should be used for PAAPI.
 */
export const getPAAPISize = hook('sync', function (sizes) {
  sizes = sizes
    ?.filter(([w, h]) => !(w === h && w <= 5));

  if (sizes?.length) {
    return sizes
      .reduce(maximum(keyCompare(([w, h]) => w * h)));
  }
}, 'getPAAPISize');

function getRequestedSize(adUnit) {
  return adUnit.ortb2Imp?.ext?.paapi?.requestedSize || (() => {
    const size = getPAAPISize(sizesToSizeTuples(adUnit.mediaTypes?.banner?.sizes));
    if (size) {
      return {
        width: size[0],
        height: size[1]
      };
    }
  })();
}

export function addPaapiData(next, adUnits, ...args) {
  if (isFledgeSupported() && moduleConfig.enabled) {
    adUnits.forEach(adUnit => {
      // https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/Protected%20Audience%20Support.md
      const igsAe = adUnit.ortb2Imp?.ext?.igs != null
        ? adUnit.ortb2Imp.ext.igs.ae || 1
        : null;
      const extAe = adUnit.ortb2Imp?.ext?.ae;
      if (igsAe !== extAe && igsAe != null && extAe != null) {
        logWarn(MODULE, `Ad unit defines conflicting ortb2Imp.ext.ae and ortb2Imp.ext.igs, using the latter`, adUnit);
      }
      const ae = igsAe ?? extAe ?? moduleConfig.defaultForSlots;
      if (ae) {
        deepSetValue(adUnit, 'ortb2Imp.ext.ae', ae);
        adUnit.ortb2Imp.ext.igs = Object.assign({
          ae: ae,
          biddable: 1
        }, adUnit.ortb2Imp.ext.igs);
        const requestedSize = getRequestedSize(adUnit);
        if (requestedSize) {
          deepSetValue(adUnit, 'ortb2Imp.ext.paapi.requestedSize', requestedSize);
        }
        adUnit.bids.forEach(bidReq => {
          if (!getFledgeConfig(bidReq.bidder).enabled) {
            deepSetValue(bidReq, 'ortb2Imp.ext.ae', 0);
            bidReq.ortb2Imp.ext.igs = {ae: 0, biddable: 0};
          }
        })
      }
    })
  }
  next(adUnits, ...args);
}

export function markForFledge(next, bidderRequests) {
  if (isFledgeSupported()) {
    bidderRequests.forEach((bidderReq) => {
      const {enabled} = getFledgeConfig(bidderReq.bidderCode);
      Object.assign(bidderReq, {
        paapi: {
          enabled,
          componentSeller: !!moduleConfig.componentSeller?.auctionConfig
        }
      });
    });
  }
  next(bidderRequests);
}

export const ASYNC_SIGNALS = ['auctionSignals', 'sellerSignals', 'perBuyerSignals', 'perBuyerTimeouts', 'directFromSellerSignals'];

const validatePartialConfig = (() => {
  const REQUIRED_SYNC_SIGNALS = [
    {
      props: ['seller'],
      validate: (val) => typeof val === 'string'
    },
    {
      props: ['interestGroupBuyers'],
      validate: (val) => Array.isArray(val) && val.length > 0
    },
    {
      props: ['decisionLogicURL', 'decisionLogicUrl'],
      validate: (val) => typeof val === 'string'
    }
  ];

  return function (config) {
    const invalid = REQUIRED_SYNC_SIGNALS.find(({props, validate}) => props.every(prop => !config.hasOwnProperty(prop) || !config[prop] || !validate(config[prop])));
    if (invalid) {
      logError(`Partial PAAPI config has missing or invalid property "${invalid.props[0]}"`, config)
      return false;
    }
    return true;
  }
})()

/**
 * Adapters can provide a `spec.buildPAAPIConfigs(validBidRequests, bidderRequest)` to be included in PAAPI auctions
 * that can be started in parallel with contextual auctions.
 *
 * If PAAPI is enabled, and an adapter provides `buildPAAPIConfigs`, it is invoked just before `buildRequests`,
 * and takes the same arguments. It should return an array of PAAPI configuration objects with the same format
 * as in `interpretResponse` (`{bidId, config?, igb?}`).
 *
 * Everything returned by `buildPAAPIConfigs` is treated in the same way as if it was returned by `interpretResponse` -
 * except for signals that can be provided asynchronously (cfr. `ASYNC_SIGNALS`), which are replaced by promises.
 * When the (contextual) auction ends, the promises are resolved.
 *
 * If during the auction the adapter's `interpretResponse` returned matching configurations (same `bidId`,
 * and a `config` with the same `seller`, or an `igb` with the same `origin`), the promises resolve to their contents.
 * Otherwise, they resolve to the values provided by `buildPAAPIConfigs`, or an empty object if no value was provided.
 *
 * Promisified auction configs are available from `getPAAPIConfig` immediately after `requestBids`.
 * If the `paapi.parallel` config flag is set, PAAPI submodules are also triggered at the same time
 * (instead of when the auction ends).
 */
export function parallelPaapiProcessing(next, spec, bids, bidderRequest, ...args) {
  function makeDeferrals(defaults = {}) {
    let promises = {};
    const deferrals = Object.fromEntries(ASYNC_SIGNALS.map(signal => {
      const def = defer({promiseFactory: (resolver) => new Promise(resolver)});
      def.default = defaults.hasOwnProperty(signal) ? defaults[signal] : null;
      promises[signal] = def.promise;
      return [signal, def]
    }))
    return [deferrals, promises];
  }

  const {auctionId, paapi: {enabled, componentSeller} = {}} = bidderRequest;
  const auctionConfigs = configsForAuction(auctionId);
  bids.map(bid => bid.adUnitCode).forEach(adUnitCode => {
    latestAuctionForAdUnit[adUnitCode] = auctionId;
    if (!auctionConfigs.hasOwnProperty(adUnitCode)) {
      auctionConfigs[adUnitCode] = null;
    }
  });

  if (enabled && spec.buildPAAPIConfigs) {
    const metrics = adapterMetrics(bidderRequest);
    const tidGuard = guardTids(bidderRequest);
    let partialConfigs;
    metrics.measureTime('buildPAAPIConfigs', () => {
      try {
        partialConfigs = spec.buildPAAPIConfigs(bids.map(tidGuard.bidRequest), tidGuard.bidderRequest(bidderRequest))
      } catch (e) {
        logError(`Error invoking "buildPAAPIConfigs":`, e);
      }
    });
    const requestsById = Object.fromEntries(bids.map(bid => [bid.bidId, bid]));
    (partialConfigs ?? []).forEach(({bidId, config, igb}) => {
      const bidRequest = requestsById.hasOwnProperty(bidId) && requestsById[bidId];
      if (!bidRequest) {
        logError(`Received partial PAAPI config for unknown bidId`, {bidId, config});
      } else {
        const adUnitCode = bidRequest.adUnitCode;
        latestAuctionForAdUnit[adUnitCode] = auctionId;
        const deferredConfigs = deferredConfigsForAuction(auctionId);

        const getDeferredConfig = () => {
          if (!deferredConfigs.hasOwnProperty(adUnitCode)) {
            const [deferrals, promises] = makeDeferrals();
            auctionConfigs[adUnitCode] = {
              ...getStaticSignals(auctionManager.index.getAdUnit(bidRequest)),
              ...promises,
              componentAuctions: []
            }
            deferredConfigs[adUnitCode] = {
              top: deferrals,
              components: {},
              auctionConfig: auctionConfigs[adUnitCode]
            }
          }
          return deferredConfigs[adUnitCode];
        }

        if (config && validatePartialConfig(config)) {
          const configId = getConfigId(bidRequest.bidder, config.seller);
          const deferredConfig = getDeferredConfig();
          if (deferredConfig.components.hasOwnProperty(configId)) {
            logWarn(`Received multiple PAAPI configs for the same bidder and seller; config will be ignored`, {
              config,
              bidder: bidRequest.bidder
            })
          } else {
            const [deferrals, promises] = makeDeferrals(config);
            const auctionConfig = {
              ...getStaticSignals(bidRequest),
              ...config,
              ...promises
            }
            deferredConfig.auctionConfig.componentAuctions.push(auctionConfig)
            deferredConfig.components[configId] = {auctionConfig, deferrals};
          }
        }
        if (componentSeller && igb && checkOrigin(igb)) {
          const configId = getComponentSellerConfigId(spec.code);
          const deferredConfig = getDeferredConfig();
          const partialConfig = buyersToAuctionConfigs([[bidRequest, igb]])[0][1];
          if (deferredConfig.components.hasOwnProperty(configId)) {
            const {auctionConfig, deferrals} = deferredConfig.components[configId];
            if (!auctionConfig.interestGroupBuyers.includes(igb.origin)) {
              const immediate = {};
              Object.entries(partialConfig).forEach(([key, value]) => {
                if (deferrals.hasOwnProperty(key)) {
                  mergeDeep(deferrals[key], {default: value});
                } else {
                  immediate[key] = value;
                }
              })
              mergeDeep(auctionConfig, immediate);
            } else {
              logWarn(`Received the same PAAPI buyer multiple times for the same PAAPI auction. Consider setting paapi.componentSeller.separateAuctions: true`, igb)
            }
          } else {
            const [deferrals, promises] = makeDeferrals(partialConfig);
            const auctionConfig = {
              ...partialConfig,
              ...getStaticSignals(bidRequest),
              ...promises,
            }
            deferredConfig.components[configId] = {auctionConfig, deferrals};
            deferredConfig.auctionConfig.componentAuctions.push(auctionConfig);
          }
        }
      }
    })
  }
  return next.call(this, spec, bids, bidderRequest, ...args);
}

export function onAuctionInit({auctionId}) {
  if (moduleConfig.parallel) {
    auctionManager.index.getAuction({auctionId}).requestsDone.then(() => {
      if (Object.keys(deferredConfigsForAuction(auctionId)).length > 0) {
        submodules.forEach(submod => submod.onAuctionConfig?.(auctionId, configsForAuction(auctionId)));
      }
    })
  }
}

export function setImpExtAe(imp, bidRequest, context) {
  if (!context.bidderRequest.paapi?.enabled) {
    delete imp.ext?.ae;
    delete imp.ext?.igs;
  }
}

registerOrtbProcessor({type: IMP, name: 'impExtAe', fn: setImpExtAe});

export function parseExtIgi(response, ortbResponse, context) {
  paapiResponseParser(
    (ortbResponse.ext?.igi || []).flatMap(igi => {
      return (igi?.igs || []).map(igs => {
        if (igs.impid !== igi.impid && igs.impid != null && igi.impid != null) {
          logWarn(MODULE, 'ORTB response ext.igi.igs.impid conflicts with parent\'s impid', igi);
        }
        return {
          config: igs.config,
          impid: igs.impid ?? igi.impid
        }
      }).concat((igi?.igb || []).map(igb => ({
        igb,
        impid: igi.impid
      })))
    }),
    response,
    context
  )
}

function paapiResponseParser(configs, response, context) {
  configs.forEach((config) => {
    const impCtx = context.impContext[config.impid];
    if (!impCtx?.imp?.ext?.ae) {
      logWarn(MODULE, 'Received auction configuration for an impression that was not in the request or did not ask for it', config, impCtx?.imp);
    } else {
      impCtx.paapiConfigs = impCtx.paapiConfigs || [];
      impCtx.paapiConfigs.push(config);
    }
  });
}

// to make it easier to share code between the PBS adapter and adapters whose backend is PBS, break up
// fledge response processing in two steps: first aggregate all the auction configs by their imp...

export function parseExtPrebidFledge(response, ortbResponse, context) {
  paapiResponseParser(
    (ortbResponse.ext?.prebid?.fledge?.auctionconfigs || []),
    response,
    context
  )
}

registerOrtbProcessor({type: RESPONSE, name: 'extPrebidFledge', fn: parseExtPrebidFledge, dialects: [PBS]});
registerOrtbProcessor({type: RESPONSE, name: 'extIgiIgs', fn: parseExtIgi});

// ...then, make them available in the adapter's response. This is the client side version, for which the
// interpretResponse api is {fledgeAuctionConfigs: [{bidId, config}]}

export function setResponsePaapiConfigs(response, ortbResponse, context) {
  const configs = Object.values(context.impContext)
    .flatMap((impCtx) => (impCtx.paapiConfigs || []).map(cfg => ({
      bidId: impCtx.bidRequest.bidId,
      ...cfg
    })));
  if (configs.length > 0) {
    response.paapi = configs;
  }
}

registerOrtbProcessor({
  type: RESPONSE,
  name: 'paapiConfigs',
  priority: -1,
  fn: setResponsePaapiConfigs,
});

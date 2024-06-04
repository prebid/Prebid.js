/**
 * Collect PAAPI component auction configs from bid adapters and make them available through `pbjs.getPAAPIConfig()`
 */
import {config} from '../src/config.js';
import {getHook, hook, module} from '../src/hook.js';
import {deepSetValue, logInfo, logWarn, mergeDeep, sizesToSizeTuples, deepAccess, deepEqual} from '../src/utils.js';
import {IMP, PBS, registerOrtbProcessor, RESPONSE} from '../src/pbjsORTB.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';
import {currencyCompare} from '../libraries/currencyUtils/currency.js';
import {keyCompare, maximum, minimum} from '../src/utils/reducers.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {auctionStore} from '../libraries/weakStore/weakStore.js';

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

const pendingConfigsForAuction = auctionStore();
const configsForAuction = auctionStore();
const pendingBuyersForAuction = auctionStore();

let latestAuctionForAdUnit = {};
let moduleConfig = {};

['paapi', 'fledgeForGpt'].forEach(ns => {
  config.getConfig(ns, config => {
    init(config[ns], ns);
  });
});

export function reset() {
  submodules.splice(0, submodules.length);
  latestAuctionForAdUnit = {};
}

export function init(cfg, configNamespace) {
  if (configNamespace !== 'paapi') {
    logWarn(`'${configNamespace}' configuration options will be renamed to 'paapi'; consider using setConfig({paapi: [...]}) instead`);
  }
  if (cfg && cfg.enabled === true) {
    moduleConfig = cfg;
    logInfo(`${MODULE} enabled (browser ${isFledgeSupported() ? 'supports' : 'does NOT support'} runAdAuction)`, cfg);
  } else {
    moduleConfig = {};
    logInfo(`${MODULE} disabled`, cfg);
  }
}

getHook('addPaapiConfig').before(addPaapiConfigHook);
getHook('makeBidRequests').after(markForFledge);
events.on(EVENTS.AUCTION_END, onAuctionEnd);

function getSlotSignals(adUnit = {}, bidsReceived = [], bidRequests = []) {
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
  const requestedSize = getRequestedSize(adUnit);
  if (requestedSize) {
    cfg.requestedSize = requestedSize;
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
      return auctionConfig;
    });
}

function onAuctionEnd({auctionId, bidsReceived, bidderRequests, adUnitCodes, adUnits}) {
  const adUnitsByCode = Object.fromEntries(adUnits?.map(au => [au.code, au]) || []);
  const allReqs = bidderRequests?.flatMap(br => br.bids);
  const paapiConfigs = {};
  (adUnitCodes || []).forEach(au => {
    paapiConfigs[au] = null;
    !latestAuctionForAdUnit.hasOwnProperty(au) && (latestAuctionForAdUnit[au] = null);
  });
  const pendingConfigs = pendingConfigsForAuction(auctionId);
  const pendingBuyers = pendingBuyersForAuction(auctionId);
  if (pendingConfigs && pendingBuyers) {
    Object.entries(pendingBuyers).forEach(([adUnitCode, igbRequests]) => {
      buyersToAuctionConfigs(igbRequests).forEach(auctionConfig => append(pendingConfigs, adUnitCode, auctionConfig))
    })
  }
  Object.entries(pendingConfigs || {}).forEach(([adUnitCode, auctionConfigs]) => {
    const forThisAdUnit = (bid) => bid.adUnitCode === adUnitCode;
    const slotSignals = getSlotSignals(adUnitsByCode[adUnitCode], bidsReceived?.filter(forThisAdUnit), allReqs?.filter(forThisAdUnit));
    paapiConfigs[adUnitCode] = {
      ...slotSignals,
      componentAuctions: auctionConfigs.map(cfg => mergeDeep({}, slotSignals, cfg))
    };
    latestAuctionForAdUnit[adUnitCode] = auctionId;
  });
  configsForAuction(auctionId, paapiConfigs);
  submodules.forEach(submod => submod.onAuctionConfig?.(
    auctionId,
    paapiConfigs,
    (adUnitCode) => paapiConfigs[adUnitCode] != null && USED.add(paapiConfigs[adUnitCode]))
  );
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

export function addPaapiConfigHook(next, request, paapiConfig) {
  if (getFledgeConfig().enabled) {
    const {adUnitCode, auctionId} = request;

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
      (config.interestGroupBuyers || []).forEach(buyer => {
        deepSetValue(config, `perBuyerSignals.${buyer}`, setFPD(config.perBuyerSignals?.[buyer] || {}, request));
      })
      storePendingData(pendingConfigsForAuction, config);
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

function getFledgeConfig() {
  const bidder = config.getCurrentBidder();
  const useGlobalConfig = moduleConfig.enabled && (bidder == null || !moduleConfig.bidders?.length || moduleConfig.bidders?.includes(bidder));
  return {
    enabled: config.getConfig('fledgeEnabled') ?? useGlobalConfig,
    ae: config.getConfig('defaultForSlots') ?? (useGlobalConfig ? moduleConfig.defaultForSlots : undefined)
  };
}

/**
 * Given an array of size tuples, return the one that should be used for PAAPI.
 */
export const getPAAPISize = hook('sync', function (sizes) {
  if (sizes?.length) {
    return sizes
      .filter(([w, h]) => !(w === h && w <= 5))
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

export function markForFledge(next, bidderRequests) {
  if (isFledgeSupported()) {
    bidderRequests.forEach((bidderReq) => {
      config.runWithBidder(bidderReq.bidderCode, () => {
        const {enabled, ae} = getFledgeConfig();
        Object.assign(bidderReq, {
          fledgeEnabled: enabled,
          paapi: {
            enabled,
            componentSeller: !!moduleConfig.componentSeller?.auctionConfig
          }
        });
        bidderReq.bids.forEach(bidReq => {
          // https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/Protected%20Audience%20Support.md
          const igsAe = bidReq.ortb2Imp?.ext?.igs != null
            ? bidReq.ortb2Imp.ext.igs.ae || 1
            : null
          const extAe = bidReq.ortb2Imp?.ext?.ae;
          if (igsAe !== extAe && igsAe != null && extAe != null) {
            logWarn(MODULE, `Bid request defines conflicting ortb2Imp.ext.ae and ortb2Imp.ext.igs, using the latter`, bidReq);
          }
          const bidAe = igsAe ?? extAe ?? ae;
          if (bidAe) {
            deepSetValue(bidReq, 'ortb2Imp.ext.ae', bidAe);
            bidReq.ortb2Imp.ext.igs = Object.assign({
              ae: bidAe,
              biddable: 1
            }, bidReq.ortb2Imp.ext.igs)
            const requestedSize = getRequestedSize(bidReq);
            if (requestedSize) {
              deepSetValue(bidReq, 'ortb2Imp.ext.paapi.requestedSize', requestedSize);
            }
          }
        });
      });
    });
  }
  next(bidderRequests);
}

export function setImpExtAe(imp, bidRequest, context) {
  if (!context.bidderRequest.fledgeEnabled) {
    delete imp.ext?.ae;
    delete imp.ext?.igs;
  }
}

registerOrtbProcessor({type: IMP, name: 'impExtAe', fn: setImpExtAe});

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
  name: 'fledgeAuctionConfigs',
  priority: -1,
  fn: setResponsePaapiConfigs,
});

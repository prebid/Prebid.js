/**
 * Collect PAAPI component auction configs from bid adapters and make them available through `pbjs.getPAAPIConfig()`
 */
import {config} from '../src/config.js';
import {getHook, hook, module} from '../src/hook.js';
import {deepSetValue, logInfo, logWarn, mergeDeep, sizesToSizeTuples} from '../src/utils.js';
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

const pendingForAuction = auctionStore();
const configsForAuction = auctionStore();
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

getHook('addComponentAuction').before(addComponentAuctionHook);
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

function onAuctionEnd({auctionId, bidsReceived, bidderRequests, adUnitCodes, adUnits}) {
  const adUnitsByCode = Object.fromEntries(adUnits?.map(au => [au.code, au]) || []);
  const allReqs = bidderRequests?.flatMap(br => br.bids);
  const paapiConfigs = {};
  (adUnitCodes || []).forEach(au => {
    paapiConfigs[au] = null;
    !latestAuctionForAdUnit.hasOwnProperty(au) && (latestAuctionForAdUnit[au] = null);
  });
  Object.entries(pendingForAuction(auctionId) || {}).forEach(([adUnitCode, auctionConfigs]) => {
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

function setFPDSignals(auctionConfig, fpd) {
  auctionConfig.auctionSignals = mergeDeep({}, {prebid: fpd}, auctionConfig.auctionSignals);
}

export function addComponentAuctionHook(next, request, componentAuctionConfig) {
  if (getFledgeConfig().enabled) {
    const {adUnitCode, auctionId, ortb2, ortb2Imp} = request;
    const configs = pendingForAuction(auctionId);
    if (configs != null) {
      setFPDSignals(componentAuctionConfig, {ortb2, ortb2Imp});
      !configs.hasOwnProperty(adUnitCode) && (configs[adUnitCode] = []);
      configs[adUnitCode].push(componentAuctionConfig);
    } else {
      logWarn(MODULE, `Received component auction config for auction that has closed (auction '${auctionId}', adUnit '${adUnitCode}')`, componentAuctionConfig);
    }
  }
  next(request, componentAuctionConfig);
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
 * @param filters
 * @param filters.auctionId? optional auction filter; if omitted, the latest auction for each ad unit is used
 * @param filters.adUnitCode? optional ad unit filter
 * @param includeBlanks if true, include null entries for ad units that match the given filters but do not have any available auction configs.
 * @returns {{}} a map from ad unit code to auction config for the ad unit.
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
        width: size[0].toString(),
        height: size[1].toString()
      };
    }
  })();
}

export function markForFledge(next, bidderRequests) {
  if (isFledgeSupported()) {
    bidderRequests.forEach((bidderReq) => {
      config.runWithBidder(bidderReq.bidderCode, () => {
        const {enabled, ae} = getFledgeConfig();
        Object.assign(bidderReq, {fledgeEnabled: enabled});
        bidderReq.bids.forEach(bidReq => {
          deepSetValue(bidReq, 'ortb2Imp.ext.ae', bidReq.ortb2Imp?.ext?.ae ?? ae);
          const requestedSize = getRequestedSize(bidReq);
          if (requestedSize) {
            deepSetValue(bidReq, 'ortb2Imp.ext.paapi.requestedSize', requestedSize);
          }
        });
      });
    });
  }
  next(bidderRequests);
}

export function setImpExtAe(imp, bidRequest, context) {
  if (imp.ext?.ae && !context.bidderRequest.fledgeEnabled) {
    delete imp.ext?.ae;
  }
}

registerOrtbProcessor({type: IMP, name: 'impExtAe', fn: setImpExtAe});

// to make it easier to share code between the PBS adapter and adapters whose backend is PBS, break up
// fledge response processing in two steps: first aggregate all the auction configs by their imp...

export function parseExtPrebidFledge(response, ortbResponse, context) {
  (ortbResponse.ext?.prebid?.fledge?.auctionconfigs || []).forEach((cfg) => {
    const impCtx = context.impContext[cfg.impid];
    if (!impCtx?.imp?.ext?.ae) {
      logWarn('Received fledge auction configuration for an impression that was not in the request or did not ask for it', cfg, impCtx?.imp);
    } else {
      impCtx.fledgeConfigs = impCtx.fledgeConfigs || [];
      impCtx.fledgeConfigs.push(cfg);
    }
  });
}

registerOrtbProcessor({type: RESPONSE, name: 'extPrebidFledge', fn: parseExtPrebidFledge, dialects: [PBS]});

// ...then, make them available in the adapter's response. This is the client side version, for which the
// interpretResponse api is {fledgeAuctionConfigs: [{bidId, config}]}

export function setResponseFledgeConfigs(response, ortbResponse, context) {
  const configs = Object.values(context.impContext)
    .flatMap((impCtx) => (impCtx.fledgeConfigs || []).map(cfg => ({
      bidId: impCtx.bidRequest.bidId,
      config: cfg.config
    })));
  if (configs.length > 0) {
    response.fledgeAuctionConfigs = configs;
  }
}

registerOrtbProcessor({
  type: RESPONSE,
  name: 'fledgeAuctionConfigs',
  priority: -1,
  fn: setResponseFledgeConfigs,
  dialects: [PBS]
});

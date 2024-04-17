/**
 * Collect PAAPI component auction configs from bid adapters and make them available through `pbjs.getPAAPIConfig()`
 */
import {config} from '../src/config.js';
import {getHook, module} from '../src/hook.js';
import {deepSetValue, logInfo, logWarn, mergeDeep, parseSizesInput} from '../src/utils.js';
import {IMP, PBS, registerOrtbProcessor, RESPONSE} from '../src/pbjsORTB.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';
import {currencyCompare} from '../libraries/currencyUtils/currency.js';
import {maximum, minimum} from '../src/utils/reducers.js';
import {auctionManager} from '../src/auctionManager.js';
import {getGlobal} from '../src/prebidGlobal.js';

const MODULE = 'PAAPI';

const submodules = [];
const USED = new WeakSet();

export function registerSubmodule(submod) {
  submodules.push(submod);
  submod.init && submod.init({getPAAPIConfig});
}

module('paapi', registerSubmodule);

function auctionConfigs() {
  const store = new WeakMap();
  return function (auctionId, init = {}) {
    const auction = auctionManager.index.getAuction({auctionId});
    if (auction == null) return;
    if (!store.has(auction)) {
      store.set(auction, init);
    }
    return store.get(auction);
  };
}

const pendingForAuction = auctionConfigs();
const configsForAuction = auctionConfigs();
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

function onAuctionEnd({auctionId, bidsReceived, bidderRequests, adUnitCodes, adUnits}) {
  const adUnitsByCode = Object.fromEntries(adUnits?.map(au => [au.code, au]) || [])
  const allReqs = bidderRequests?.flatMap(br => br.bids);
  const paapiConfigs = {};
  (adUnitCodes || []).forEach(au => {
    paapiConfigs[au] = null;
    !latestAuctionForAdUnit.hasOwnProperty(au) && (latestAuctionForAdUnit[au] = null);
  });
  Object.entries(pendingForAuction(auctionId) || {}).forEach(([adUnitCode, auctionConfigs]) => {
    const forThisAdUnit = (bid) => bid.adUnitCode === adUnitCode;
    const slotSignals = getSlotSignals(bidsReceived?.filter(forThisAdUnit), allReqs?.filter(forThisAdUnit));
    paapiConfigs[adUnitCode] = {
      ...slotSignals,
      componentAuctions: auctionConfigs.map(cfg => mergeDeep({}, slotSignals, cfg))
    };
    // TODO: need to flesh out size treatment:
    // - which size should the paapi auction pick? (this uses the first one defined)
    // - should we signal it to SSPs, and how?
    // - what should we do if adapters pick a different one?
    // - what does size mean for video and native?
    const size = parseSizesInput(adUnitsByCode[adUnitCode]?.mediaTypes?.banner?.sizes)?.[0]?.split('x');
    if (size) {
      paapiConfigs[adUnitCode].requestedSize = {
        width: size[0],
        height: size[1],
      };
    }
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
 * Get PAAPI auction configuration.
 *
 * @param auctionId? optional auction filter; if omitted, the latest auction for each ad unit is used
 * @param adUnitCode? optional ad unit filter
 * @param includeBlanks if true, include null entries for ad units that match the given filters but do not have any available auction configs.
 * @returns {{}} a map from ad unit code to auction config for the ad unit.
 */
export function getPAAPIConfig({auctionId, adUnitCode} = {}, includeBlanks = false) {
  const output = {};
  const targetedAuctionConfigs = auctionId && configsForAuction(auctionId);
  Object.keys((auctionId != null ? targetedAuctionConfigs : latestAuctionForAdUnit) ?? []).forEach(au => {
    const latestAuctionId = latestAuctionForAdUnit[au];
    const auctionConfigs = targetedAuctionConfigs ?? (latestAuctionId && configsForAuction(latestAuctionId));
    if ((adUnitCode ?? au) === au) {
      let candidate;
      if (targetedAuctionConfigs?.hasOwnProperty(au)) {
        candidate = targetedAuctionConfigs[au];
      } else if (auctionId == null && auctionConfigs?.hasOwnProperty(au)) {
        candidate = auctionConfigs[au];
      }
      if (candidate && !USED.has(candidate)) {
        output[au] = candidate;
        USED.add(candidate);
      } else if (includeBlanks) {
        output[au] = null;
      }
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

export function markForFledge(next, bidderRequests) {
  if (isFledgeSupported()) {
    bidderRequests.forEach((bidderReq) => {
      config.runWithBidder(bidderReq.bidderCode, () => {
        const {enabled, ae} = getFledgeConfig();
        Object.assign(bidderReq, {fledgeEnabled: enabled});
        bidderReq.bids.forEach(bidReq => {
          deepSetValue(bidReq, 'ortb2Imp.ext.ae', bidReq.ortb2Imp?.ext?.ae ?? ae);
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

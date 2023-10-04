/**
 * Fledge modules is responsible for registering fledged auction configs into the GPT slot;
 * GPT is resposible to run the fledge auction.
 */
import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import {deepSetValue, logInfo, logWarn, mergeDeep} from '../src/utils.js';
import {IMP, PBS, registerOrtbProcessor, RESPONSE} from '../src/pbjsORTB.js';
import * as events from '../src/events.js'
import CONSTANTS from '../src/constants.json';
import {currencyCompare} from '../libraries/currencyUtils/currency.js';
import {maximum, minimum} from '../src/utils/reducers.js';
import {getGptSlotForAdUnitCode} from '../libraries/gptUtils/gptUtils.js';

const MODULE = 'fledgeForGpt'
const PENDING = {};

export let isEnabled = false;

config.getConfig('fledgeForGpt', config => init(config.fledgeForGpt));

/**
  * Module init.
  */
export function init(cfg) {
  if (cfg && cfg.enabled === true) {
    if (!isEnabled) {
      getHook('addComponentAuction').before(addComponentAuctionHook);
      getHook('makeBidRequests').after(markForFledge);
      events.on(CONSTANTS.EVENTS.AUCTION_INIT, onAuctionInit);
      events.on(CONSTANTS.EVENTS.AUCTION_END, onAuctionEnd);
      isEnabled = true;
    }
    logInfo(`${MODULE} enabled (browser ${isFledgeSupported() ? 'supports' : 'does NOT support'} fledge)`, cfg);
  } else {
    if (isEnabled) {
      getHook('addComponentAuction').getHooks({hook: addComponentAuctionHook}).remove();
      getHook('makeBidRequests').getHooks({hook: markForFledge}).remove()
      events.off(CONSTANTS.EVENTS.AUCTION_INIT, onAuctionInit);
      events.off(CONSTANTS.EVENTS.AUCTION_END, onAuctionEnd);
      isEnabled = false;
    }
    logInfo(`${MODULE} disabled`, cfg);
  }
}

function setComponentAuction(adUnitCode, auctionConfigs) {
  const gptSlot = getGptSlotForAdUnitCode(adUnitCode);
  if (gptSlot && gptSlot.setConfig) {
    gptSlot.setConfig({
      componentAuction: auctionConfigs.map(cfg => ({
        configKey: cfg.seller,
        auctionConfig: cfg
      }))
    });
    logInfo(MODULE, `register component auction configs for: ${adUnitCode}: ${gptSlot.getAdUnitPath()}`, auctionConfigs);
  } else {
    logWarn(MODULE, `unable to register component auction config for ${adUnitCode}`, auctionConfigs);
  }
}

function onAuctionInit({auctionId}) {
  PENDING[auctionId] = {};
}

function getSlotSignals(bidsReceived = [], bidRequests = []) {
  let bidfloor, bidfloorcur;
  if (bidsReceived.length > 0) {
    const bestBid = bidsReceived.reduce(maximum(currencyCompare(bid => [bid.cpm, bid.currency])));
    bidfloor = bestBid.cpm;
    bidfloorcur = bestBid.currency;
  } else {
    const floors = bidRequests.map(bid => typeof bid.getFloor === 'function' && bid.getFloor()).filter(f => f);
    const minFloor = floors.length && floors.reduce(minimum(currencyCompare(floor => [floor.floor, floor.currency])))
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

function onAuctionEnd({auctionId, bidsReceived, bidderRequests}) {
  try {
    const allReqs = bidderRequests?.flatMap(br => br.bids);
    Object.entries(PENDING[auctionId]).forEach(([adUnitCode, auctionConfigs]) => {
      const forThisAdUnit = (bid) => bid.adUnitCode === adUnitCode;
      const slotSignals = getSlotSignals(bidsReceived?.filter(forThisAdUnit), allReqs?.filter(forThisAdUnit));
      setComponentAuction(adUnitCode, auctionConfigs.map(cfg => mergeDeep({}, slotSignals, cfg)))
    })
  } finally {
    delete PENDING[auctionId];
  }
}

export function addComponentAuctionHook(next, auctionId, adUnitCode, componentAuctionConfig) {
  if (PENDING.hasOwnProperty(auctionId)) {
    !PENDING[auctionId].hasOwnProperty(adUnitCode) && (PENDING[auctionId][adUnitCode] = []);
    PENDING[auctionId][adUnitCode].push(componentAuctionConfig);
  } else {
    logWarn(MODULE, `Received component auction config for auction that has closed (auction '${auctionId}', adUnit '${adUnitCode}')`, componentAuctionConfig)
  }
  next(auctionId, adUnitCode, componentAuctionConfig);
}

function isFledgeSupported() {
  return 'runAdAuction' in navigator && 'joinAdInterestGroup' in navigator
}

export function markForFledge(next, bidderRequests) {
  if (isFledgeSupported()) {
    const globalFledgeConfig = config.getConfig('fledgeForGpt');
    const bidders = globalFledgeConfig?.bidders ?? [];
    bidderRequests.forEach((req) => {
      const useGlobalConfig = globalFledgeConfig?.enabled && (bidders.length == 0 || bidders.includes(req.bidderCode));
      Object.assign(req, config.runWithBidder(req.bidderCode, () => {
        return {
          fledgeEnabled: config.getConfig('fledgeEnabled') ?? (useGlobalConfig ? globalFledgeConfig.enabled : undefined),
          defaultForSlots: config.getConfig('defaultForSlots') ?? (useGlobalConfig ? globalFledgeConfig?.defaultForSlots : undefined)
        }
      }));
    });
  }
  next(bidderRequests);
}

export function setImpExtAe(imp, bidRequest, context) {
  if (context.bidderRequest.fledgeEnabled) {
    imp.ext = Object.assign(imp.ext || {}, {
      ae: imp.ext?.ae ?? context.bidderRequest.defaultForSlots
    })
  } else {
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
  })
}
registerOrtbProcessor({type: RESPONSE, name: 'extPrebidFledge', fn: parseExtPrebidFledge, dialects: [PBS]});

// ...then, make them available in the adapter's response. This is the client side version, for which the
// interpretResponse api is {fledgeAuctionConfigs: [{bidId, config}]}

export function setResponseFledgeConfigs(response, ortbResponse, context) {
  const configs = Object.values(context.impContext)
    .flatMap((impCtx) => (impCtx.fledgeConfigs || []).map(cfg => ({bidId: impCtx.bidRequest.bidId, config: cfg.config})));
  if (configs.length > 0) {
    response.fledgeAuctionConfigs = configs;
  }
}
registerOrtbProcessor({type: RESPONSE, name: 'fledgeAuctionConfigs', priority: -1, fn: setResponseFledgeConfigs, dialects: [PBS]})

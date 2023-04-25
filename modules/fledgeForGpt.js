/**
 * Fledge modules is responsible for registering fledged auction configs into the GPT slot;
 * GPT is resposible to run the fledge auction.
 */
import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import { getGptSlotForAdUnitCode, logInfo, logWarn } from '../src/utils.js';
import {IMP, PBS, registerOrtbProcessor, RESPONSE} from '../src/pbjsORTB.js';

const MODULE = 'fledgeForGpt'

export let isEnabled = false;

config.getConfig('fledgeForGpt', config => init(config.fledgeForGpt));

/**
  * Module init.
  */
export function init(cfg) {
  if (cfg && cfg.enabled === true) {
    if (!isEnabled) {
      getHook('addComponentAuction').before(addComponentAuctionHook);
      isEnabled = true;
    }
    logInfo(`${MODULE} enabled (browser ${isFledgeSupported() ? 'supports' : 'does NOT support'} fledge)`, cfg);
  } else {
    if (isEnabled) {
      getHook('addComponentAuction').getHooks({hook: addComponentAuctionHook}).remove();
      isEnabled = false;
    }
    logInfo(`${MODULE} disabled`, cfg);
  }
}

export function addComponentAuctionHook(next, adUnitCode, componentAuctionConfig) {
  const seller = componentAuctionConfig.seller;
  const gptSlot = getGptSlotForAdUnitCode(adUnitCode);
  if (gptSlot && gptSlot.setConfig) {
    gptSlot.setConfig({
      componentAuction: [{
        configKey: seller,
        auctionConfig: componentAuctionConfig
      }]
    });
    logInfo(MODULE, `register component auction config for: ${adUnitCode} x ${seller}: ${gptSlot.getAdUnitPath()}`, componentAuctionConfig);
  } else {
    logWarn(MODULE, `unable to register component auction config for: ${adUnitCode} x ${seller}.`);
  }

  next(adUnitCode, componentAuctionConfig);
}

function isFledgeSupported() {
  return 'runAdAuction' in navigator && 'joinAdInterestGroup' in navigator
}

export function markForFledge(next, bidderRequests) {
  if (isFledgeSupported()) {
    bidderRequests.forEach((req) => {
      req.fledgeEnabled = config.runWithBidder(req.bidderCode, () => config.getConfig('fledgeEnabled'))
    })
  }
  next(bidderRequests);
}
getHook('makeBidRequests').after(markForFledge);

export function setImpExtAe(imp, bidRequest, context) {
  if (!context.bidderRequest.fledgeEnabled) {
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

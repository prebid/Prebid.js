/**
 * Fledge modules is responsible for registering fledged auction configs into the GPT slot;
 * GPT is resposible to run the fledge auction.
 */
import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import { getGptSlotForAdUnitCode, logInfo, logWarn } from '../src/utils.js';

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
    logInfo(MODULE, `isEnabled`, cfg);
  } else {
    if (isEnabled) {
      getHook('addComponentAuction').getHooks({hook: addComponentAuctionHook}).remove();
      isEnabled = false;
    }
    logInfo(MODULE, `isDisabled`, cfg);
  }
}

export function addComponentAuctionHook(next, bidRequest, componentAuctionConfig) {
  const seller = componentAuctionConfig.seller;
  const adUnitCode = bidRequest.adUnitCode;
  const gptSlot = getGptSlotForAdUnitCode(adUnitCode);
  if (gptSlot && gptSlot.setConfig) {
    delete componentAuctionConfig.bidId;
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

  next(bidRequest, componentAuctionConfig);
}

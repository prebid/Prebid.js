/**
 * GPT-specific slot configuration logic for PAAPI.
 */
import {submodule} from '../src/hook.js';
import {deepAccess, logInfo, logWarn} from '../src/utils.js';
import {getGptSlotForAdUnitCode} from '../libraries/gptUtils/gptUtils.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';

const MODULE = 'fledgeForGpt';

// for backwards compat, we attempt to automatically set GPT configuration as soon as we
// have the auction configs available. Disabling this allows one to call pbjs.setPAAPIConfigForGPT at their
// own pace.
let autoconfig = true;

Object.entries({
  [MODULE]: MODULE,
  'paapi': 'paapi.gpt'
}).forEach(([topic, ns]) => {
  const configKey = `${ns}.autoconfig`;
  config.getConfig(topic, (cfg) => {
    autoconfig = deepAccess(cfg, configKey, true);
  });
});

export function setComponentAuction(adUnitCode, auctionConfigs) {
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

export function onAuctionConfigFactory(setGptConfig = setComponentAuction) {
  return function onAuctionConfig(auctionId, adUnitCode, auctionConfig) {
    if (autoconfig) {
      setGptConfig(adUnitCode, auctionConfig.componentAuctions);
    }
  }
}

export function setPAAPIConfigFactory(
  getPAAPIConfig = (filters) => getGlobal().getPAAPIConfig(filters),
  setGptConfig = setComponentAuction) {
  return function(filters) {
    let some = false;
    Object.entries(
      getPAAPIConfig(filters) || {}
    ).forEach(([au, config]) => {
      some = true;
      setGptConfig(au, config.componentAuctions);
    })
    if (!some) {
      logInfo(`${MODULE}: No component auctions available to set`);
    }
  }
}
/**
 * Configure GPT slots with PAAPI component auctions. Accepts the same filter arguments as `pbjs.getPAAPIConfig`.
 */
getGlobal().setPAAPIConfigForGPT = setPAAPIConfigFactory();

submodule('paapi', {
  name: 'gpt',
  onAuctionConfig: onAuctionConfigFactory()
});

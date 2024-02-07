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

export function configsBySeller(auctionConfigs) {
  return Object.fromEntries(auctionConfigs.map(cfg => [cfg.seller, cfg]))
}

export function setComponentAuction(adUnitCode, auctionConfigs) {
  const gptSlot = getGptSlotForAdUnitCode(adUnitCode);
  if (gptSlot && gptSlot.setConfig) {
    gptSlot.setConfig({
      componentAuction: Object.entries(auctionConfigs)
        .map(([configKey, auctionConfig]) => ({
          configKey,
          auctionConfig
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
      setGptConfig(adUnitCode, configsBySeller(auctionConfig.componentAuctions));
    }
  }
}

export function setPAAPIConfigFactory(
  getPAAPIConfig = (filters) => getGlobal().getPAAPIConfig(filters),
  setGptConfig = setComponentAuction) {
  const PREVIOUSLY_SET = {};
  const resetMap = (keySet) => Object.fromEntries(Array.from(keySet.values()).map(v => [v, null]));

  /**
   * Configure GPT slots with PAAPI auction configs.
   * `filters` are the same filters accepted by `pbjs.getPAAPIConfig`;
   * if reuse = false, this also resets configuration for slots that were previously configured.
   */
  return function(filters = {}) {
    let set = new Set();
    Object.entries(
      getPAAPIConfig(filters) || {}
    ).forEach(([au, config]) => {
      set.add(au);
      config = configsBySeller(config.componentAuctions);
      const sellers = Object.keys(config);
      let previous = PREVIOUSLY_SET[au] || new Set();
      if (!(filters.reuse ?? true) && (filters.adUnitCode ?? au) === au) {
        config = Object.assign(resetMap(previous), config);
        previous = new Set(sellers);
      } else {
        sellers.forEach(seller => previous.add(seller));
      }
      PREVIOUSLY_SET[au] = previous;
      setGptConfig(au, config);
    })
    if (set.size === 0) {
      logInfo(`${MODULE}: No component auctions available to set`);
    }
    if (!(filters.reuse ?? true)) {
      Object.entries(PREVIOUSLY_SET)
        .filter(([au]) => !set.has(au) && (filters.adUnitCode ?? au) === au)
        .forEach(([au, sellers]) => {
          setGptConfig(au, resetMap(sellers));
          delete PREVIOUSLY_SET[au];
        })
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

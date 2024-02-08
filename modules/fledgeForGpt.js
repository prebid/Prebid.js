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

export function slotConfigurator() {
  const PREVIOUSLY_SET = {};
  return [
    function setComponentAuction(adUnitCode, auctionConfigs, reset = true) {
      const gptSlot = getGptSlotForAdUnitCode(adUnitCode);
      if (gptSlot && gptSlot.setConfig) {
        let previous = PREVIOUSLY_SET[adUnitCode] ?? {}
        let configsBySeller = Object.fromEntries(auctionConfigs.map(cfg => [cfg.seller, cfg]));
        const sellers = Object.keys(configsBySeller);
        if (reset) {
          configsBySeller = Object.assign(previous, configsBySeller);
          previous = Object.fromEntries(sellers.map(seller => [seller, null]))
        } else {
          sellers.forEach(seller => {
            previous[seller] = null;
          })
        }
        Object.keys(previous).length ? PREVIOUSLY_SET[adUnitCode] = previous : delete PREVIOUSLY_SET[adUnitCode];
        const componentAuction = Object.entries(configsBySeller)
          .map(([configKey, auctionConfig]) => ({configKey, auctionConfig}));
        if (componentAuction.length > 0) {
          gptSlot.setConfig({componentAuction});
          logInfo(MODULE, `register component auction configs for: ${adUnitCode}: ${gptSlot.getAdUnitPath()}`, auctionConfigs);
        }
      } else if (auctionConfigs.length > 0) {
        logWarn(MODULE, `unable to register component auction config for ${adUnitCode}`, auctionConfigs);
      }
    },
    function getConfiguredSlots() {
      return Object.keys(PREVIOUSLY_SET)
    }
  ]
}

const [setComponentAuction, getConfiguredSlots] = slotConfigurator();

export function onAuctionConfigFactory(setGptConfig = setComponentAuction) {
  return function onAuctionConfig(auctionId, configsByAdUnit, markAsUsed) {
    if (autoconfig) {
      Object.entries(configsByAdUnit).forEach(([adUnitCode, cfg]) => {
        setGptConfig(adUnitCode, cfg?.componentAuctions ?? []);
        markAsUsed(adUnitCode);
      });
    }
  }
}

export function setPAAPIConfigFactory(
  getPAAPIConfig = (filters) => getGlobal().getPAAPIConfig(filters),
  setGptConfig = setComponentAuction,
  getSlots = getConfiguredSlots) {
  /**
   * Configure GPT slots with PAAPI auction configs.
   * `filters` are the same filters accepted by `pbjs.getPAAPIConfig`;
   */
  return function(filters = {}) {
    let set = new Set();
    Object.entries(
      getPAAPIConfig(filters) || {}
    ).forEach(([au, config]) => {
      set.add(au);
      setGptConfig(au, config.componentAuctions, true);
    })
    if (set.size === 0) {
      logInfo(`${MODULE}: No component auctions available to set`);
    }
    if (!filters.auctionId) {
      getSlots()
        .filter(au => !set.has(au) && (filters.adUnitCode ?? au) === au)
        .forEach(au => {
          setGptConfig(au, [], true);
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

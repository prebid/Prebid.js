/**
 * GPT-specific slot configuration logic for PAAPI.
 */
import {getHook, submodule} from '../src/hook.js';
import {deepAccess, logInfo, logWarn, sizeTupleToSizeString} from '../src/utils.js';
import {getGptSlotForAdUnitCode} from '../libraries/gptUtils/gptUtils.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';

// import parent module to keep backwards-compat for NPM consumers after paapi was split from fledgeForGpt
// there's a special case in webpack.conf.js to avoid duplicating build output on non-npm builds
// TODO: remove this in prebid 9
// eslint-disable-next-line prebid/validate-imports
import './paapi.js';
import {keyCompare} from '../src/utils/reducers.js';
const MODULE = 'fledgeForGpt';

let getPAAPIConfig;

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
  return function setComponentAuction(adUnitCode, auctionConfigs, reset = true) {
    const gptSlot = getGptSlotForAdUnitCode(adUnitCode);
    if (gptSlot && gptSlot.setConfig) {
      let previous = PREVIOUSLY_SET[adUnitCode] ?? {};
      let configsBySeller = Object.fromEntries(auctionConfigs.map(cfg => [cfg.seller, cfg]));
      const sellers = Object.keys(configsBySeller);
      if (reset) {
        configsBySeller = Object.assign(previous, configsBySeller);
        previous = Object.fromEntries(sellers.map(seller => [seller, null]));
      } else {
        sellers.forEach(seller => {
          previous[seller] = null;
        });
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
  };
}

const setComponentAuction = slotConfigurator();

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

export const getPAAPISizeHook = (() => {
  /*
    https://github.com/google/ads-privacy/tree/master/proposals/fledge-multiple-seller-testing#faq
    https://support.google.com/admanager/answer/1100453?hl=en

    Ignore any placeholder sizes, where placeholder is defined as a square creative with a side of <= 5 pixels
    Look if there are any sizes that are part of the set of supported ad sizes defined here. If there are, choose the largest supported size by area (width * height)
        For clarity, the set of supported ad sizes includes all of the ad sizes listed under “Top-performing ad sizes”, “Other supported ad sizes”, and “Regional ad sizes”.
    If not, choose the largest remaining size (i.e. that isn’t in the list of supported ad sizes) by area (width * height)
   */
  const SUPPORTED_SIZES = [
    [728, 90],
    [336, 280],
    [300, 250],
    [300, 50],
    [160, 600],
    [1024, 768],
    [970, 250],
    [970, 90],
    [768, 1024],
    [480, 320],
    [468, 60],
    [320, 480],
    [320, 100],
    [320, 50],
    [300, 600],
    [300, 100],
    [250, 250],
    [234, 60],
    [200, 200],
    [180, 150],
    [125, 125],
    [120, 600],
    [120, 240],
    [120, 60],
    [88, 31],
    [980, 120],
    [980, 90],
    [950, 90],
    [930, 180],
    [750, 300],
    [750, 200],
    [750, 100],
    [580, 400],
    [250, 360],
    [240, 400],
  ].sort(keyCompare(([w, h]) => -(w * h)))
    .map(size => [size, sizeTupleToSizeString(size)]);

  return function(next, sizes) {
    if (sizes?.length) {
      const sizeStrings = new Set(sizes.map(sizeTupleToSizeString));
      const preferredSize = SUPPORTED_SIZES.find(([_, sizeStr]) => sizeStrings.has(sizeStr));
      if (preferredSize) {
        next.bail(preferredSize[0]);
        return;
      }
    }
    next(sizes);
  }
})();

export function setPAAPIConfigFactory(
  getConfig = (filters) => getPAAPIConfig(filters, true),
  setGptConfig = setComponentAuction) {
  /**
   * Configure GPT slots with PAAPI auction configs.
   * `filters` are the same filters accepted by `pbjs.getPAAPIConfig`;
   */
  return function(filters = {}) {
    let some = false;
    Object.entries(
      getConfig(filters) || {}
    ).forEach(([au, config]) => {
      if (config != null) {
        some = true;
      }
      setGptConfig(au, config?.componentAuctions || [], true);
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
  onAuctionConfig: onAuctionConfigFactory(),
  init(params) {
    getPAAPIConfig = params.getPAAPIConfig;
    getHook('getPAAPISize').before(getPAAPISizeHook);
  }
});

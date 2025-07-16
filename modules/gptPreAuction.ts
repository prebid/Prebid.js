import { getSignals as getSignalsFn, getSegments as getSegmentsFn, taxonomies } from '../libraries/gptUtils/gptUtils.js';
import { auctionManager } from '../src/auctionManager.js';
import { config } from '../src/config.js';
import { TARGETING_KEYS } from '../src/constants.js';
import { getHook } from '../src/hook.js';
import {
  deepAccess,
  deepSetValue,
  isAdUnitCodeMatchingSlot,
  isGptPubadsDefined,
  logInfo,
  logWarn,
  pick,
  uniques
} from '../src/utils.js';
import type {SlotMatchingFn} from '../src/targeting.ts';
import type {AdUnitCode} from '../src/types/common.d.ts';
import type {AdUnit} from '../src/adUnits.ts';

const MODULE_NAME = 'GPT Pre-Auction';
export let _currentConfig: any = {};
let hooksAdded = false;

export function getSegments(fpd, sections, segtax) {
  return getSegmentsFn(fpd, sections, segtax);
}

export function getSignals(fpd) {
  return getSignalsFn(fpd);
}

export function getSignalsArrayByAuctionsIds(auctionIds, index = auctionManager.index) {
  const signals = auctionIds
    .map(auctionId => index.getAuction({ auctionId })?.getFPD()?.global)
    .map(getSignals)
    .filter(fpd => fpd);

  return signals;
}

export function getSignalsIntersection(signals) {
  const result = {};
  taxonomies.forEach((taxonomy) => {
    const allValues = signals
      .flatMap(x => x)
      .filter(x => x.taxonomy === taxonomy)
      .map(x => x.values);
    result[taxonomy] = allValues.length ? (
      allValues.reduce((commonElements, subArray) => {
        return commonElements.filter(element => subArray.includes(element));
      })
    ) : []
    result[taxonomy] = { values: result[taxonomy] };
  })
  return result;
}

export function getAuctionsIdsFromTargeting(targeting, am = auctionManager) {
  return Object.values(targeting)
    .flatMap(x => Object.entries(x))
    .filter((entry) => entry[0] === TARGETING_KEYS.AD_ID || entry[0].startsWith(TARGETING_KEYS.AD_ID + '_'))
    .flatMap(entry => entry[1])
    .map(adId => am.findBidByAdId(adId)?.auctionId)
    .filter(id => id != null)
    .filter(uniques);
}

export const appendGptSlots = adUnits => {
  const { customGptSlotMatching } = _currentConfig;

  if (!isGptPubadsDefined()) {
    return;
  }

  const adUnitMap = adUnits.reduce((acc, adUnit) => {
    acc[adUnit.code] = acc[adUnit.code] || [];
    acc[adUnit.code].push(adUnit);
    return acc;
  }, {});

  const adUnitPaths = {};

  window.googletag.pubads().getSlots().forEach((slot: googletag.Slot) => {
    const matchingAdUnitCode = Object.keys(adUnitMap).find(customGptSlotMatching
      ? customGptSlotMatching(slot)
      : isAdUnitCodeMatchingSlot(slot));

    if (matchingAdUnitCode) {
      const path = adUnitPaths[matchingAdUnitCode] = slot.getAdUnitPath();
      const adserver = {
        name: 'gam',
        adslot: sanitizeSlotPath(path)
      };
      adUnitMap[matchingAdUnitCode].forEach((adUnit) => {
        deepSetValue(adUnit, 'ortb2Imp.ext.data.adserver', Object.assign({}, adUnit.ortb2Imp?.ext?.data?.adserver, adserver));
      });
    }
  });
  return adUnitPaths;
};

const sanitizeSlotPath = (path) => {
  const gptConfig = config.getConfig('gptPreAuction') || {};

  if (gptConfig.mcmEnabled) {
    return path.replace(/(^\/\d*),\d*\//, '$1/');
  }

  return path;
}

const defaultPreAuction = (adUnit, adServerAdSlot, adUnitPath) => {
  // confirm that GPT is set up
  if (!isGptPubadsDefined()) {
    return;
  }

  // find all GPT slots with this name
  var gptSlots = window.googletag.pubads().getSlots().filter((slot: googletag.Slot) => slot.getAdUnitPath() === adUnitPath);

  if (gptSlots.length === 0) {
    return; // should never happen
  }

  if (gptSlots.length === 1) {
    return adServerAdSlot;
  }

  // else the adunit code must be div id. append it.
  return `${adServerAdSlot}#${adUnit.code}`;
}

export const makeBidRequestsHook = (fn, adUnits, ...args) => {
  const adUnitPaths = appendGptSlots(adUnits);
  const { useDefaultPreAuction, customPreAuction } = _currentConfig;
  adUnits.forEach(adUnit => {
    // init the ortb2Imp if not done yet
    adUnit.ortb2Imp = adUnit.ortb2Imp || {};
    adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
    adUnit.ortb2Imp.ext.data = adUnit.ortb2Imp.ext.data || {};
    const context = adUnit.ortb2Imp.ext;

    const adserverSlot = deepAccess(context, 'data.adserver.adslot');

    // @todo: check if should have precedence over customPreAuction and defaultPreAuction
    if (context.gpid) return;

    let result;
    if (customPreAuction) {
      result = customPreAuction(adUnit, adserverSlot, adUnitPaths?.[adUnit.code]);
    } else if (useDefaultPreAuction) {
      result = defaultPreAuction(adUnit, adserverSlot, adUnitPaths?.[adUnit.code]);
    } else {
      logWarn('Neither customPreAuction, defaultPreAuction and gpid were specified')
    }
    if (result) {
      context.gpid = result;
    }
  });
  return fn.call(this, adUnits, ...args);
};

const setPpsConfigFromTargetingSet = (next, targetingSet) => {
  // set gpt config
  const auctionsIds = getAuctionsIdsFromTargeting(targetingSet);
  const signals = getSignalsIntersection(getSignalsArrayByAuctionsIds(auctionsIds));
  window.googletag.setConfig && window.googletag.setConfig({pps: { taxonomies: signals }});
  next(targetingSet);
};

type GPTPreAuctionConfig = {
  /**
   * allows turning off of module. Default value is true
   */
  enabled?: boolean;
  /**
   * If true, use default behavior for determining GPID and PbAdSlot. Defaults to false.
   */
  useDefaultPreAuction?: boolean;
  customGptSlotMatching?: SlotMatchingFn;
  /**
   * @param adUnitCode Ad unit code
   * @param adServerAdSlot The value of that ad unit's `ortb2Imp.ext.data.adserver.adslot`
   * @returns pbadslot for the ad unit
   */
  customPbAdSlot?: (adUnitCode: AdUnitCode, adServerAdSlot: string) => string;
  /**
   * @param adUnit An ad unit object
   * @param adServerAdSlot The value of that ad unit's `ortb2Imp.ext.data.adserver.adslot`
   * @param gptAdUnitPath GPT ad unit path for the slot matching the PBJS ad unit
   * @returns GPID for the ad unit
   */
  customPreAuction?: (adUnit: AdUnit, adServerAdSlot: string, gptAdUnitPath: string) => string;
  /**
   * Removes extra network IDs when Multiple Customer Management is active. Default is false.
   */
  mcmEnabled?: boolean;
}

declare module '../src/config' {
  interface Config {
    gptPreAuction?: GPTPreAuctionConfig;
  }
}

const handleSetGptConfig = moduleConfig => {
  _currentConfig = pick(moduleConfig, [
    'enabled', enabled => enabled !== false,
    'customGptSlotMatching', customGptSlotMatching =>
      typeof customGptSlotMatching === 'function' && customGptSlotMatching,
    'customPreAuction', customPreAuction => typeof customPreAuction === 'function' && customPreAuction,
    'useDefaultPreAuction', useDefaultPreAuction => useDefaultPreAuction ?? true,
  ]);

  if (_currentConfig.enabled) {
    if (!hooksAdded) {
      getHook('makeBidRequests').before(makeBidRequestsHook);
      getHook('targetingDone').after(setPpsConfigFromTargetingSet)
      hooksAdded = true;
    }
  } else {
    logInfo(`${MODULE_NAME}: Turning off module`);
    _currentConfig = {};
    getHook('makeBidRequests').getHooks({hook: makeBidRequestsHook}).remove();
    getHook('targetingDone').getHooks({hook: setPpsConfigFromTargetingSet}).remove();
    hooksAdded = false;
  }
};

config.getConfig('gptPreAuction', config => handleSetGptConfig(config.gptPreAuction));
handleSetGptConfig({});

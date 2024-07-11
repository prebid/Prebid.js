import { getSignals as getSignalsFn, getSegments as getSegmentsFn, taxonomies } from '../libraries/gptUtils/gptUtils.js';
import { auctionManager } from '../src/auctionManager.js';
import { config } from '../src/config.js';
import { TARGETING_KEYS } from '../src/constants.js';
import { getHook } from '../src/hook.js';
import { find } from '../src/polyfill.js';
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

const MODULE_NAME = 'GPT Pre-Auction';
export let _currentConfig = {};
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

  window.googletag.pubads().getSlots().forEach(slot => {
    const matchingAdUnitCode = find(Object.keys(adUnitMap), customGptSlotMatching
      ? customGptSlotMatching(slot)
      : isAdUnitCodeMatchingSlot(slot));

    if (matchingAdUnitCode) {
      const adserver = {
        name: 'gam',
        adslot: sanitizeSlotPath(slot.getAdUnitPath())
      };
      adUnitMap[matchingAdUnitCode].forEach((adUnit) => {
        deepSetValue(adUnit, 'ortb2Imp.ext.data.adserver', Object.assign({}, adUnit.ortb2Imp?.ext?.data?.adserver, adserver));
      });
    }
  });
};

const sanitizeSlotPath = (path) => {
  const gptConfig = config.getConfig('gptPreAuction') || {};

  if (gptConfig.mcmEnabled) {
    return path.replace(/(^\/\d*),\d*\//, '$1/');
  }

  return path;
}

const defaultPreAuction = (adUnit, adServerAdSlot) => {
  const context = adUnit.ortb2Imp.ext.data;

  // use pbadslot if supplied
  if (context.pbadslot) {
    return context.pbadslot;
  }

  // confirm that GPT is set up
  if (!isGptPubadsDefined()) {
    return;
  }

  // find all GPT slots with this name
  var gptSlots = window.googletag.pubads().getSlots().filter(slot => slot.getAdUnitPath() === adServerAdSlot);

  if (gptSlots.length === 0) {
    return; // should never happen
  }

  if (gptSlots.length === 1) {
    return adServerAdSlot;
  }

  // else the adunit code must be div id. append it.
  return `${adServerAdSlot}#${adUnit.code}`;
}

export const appendPbAdSlot = adUnit => {
  const context = adUnit.ortb2Imp.ext.data;
  const { customPbAdSlot } = _currentConfig;

  // use context.pbAdSlot if set (if someone set it already, it will take precedence over others)
  if (context.pbadslot) {
    return;
  }

  if (customPbAdSlot) {
    context.pbadslot = customPbAdSlot(adUnit.code, deepAccess(context, 'adserver.adslot'));
    return;
  }

  // use data attribute 'data-adslotid' if set
  try {
    const adUnitCodeDiv = document.getElementById(adUnit.code);
    if (adUnitCodeDiv.dataset.adslotid) {
      context.pbadslot = adUnitCodeDiv.dataset.adslotid;
      return;
    }
  } catch (e) {}
  // banner adUnit, use GPT adunit if defined
  if (deepAccess(context, 'adserver.adslot')) {
    context.pbadslot = context.adserver.adslot;
    return;
  }
  context.pbadslot = adUnit.code;
  return true;
};

function warnDeprecation(adUnit) {
  logWarn(`pbadslot is deprecated and will soon be removed, use gpid instead`, adUnit)
}

export const makeBidRequestsHook = (fn, adUnits, ...args) => {
  appendGptSlots(adUnits);
  const { useDefaultPreAuction, customPreAuction } = _currentConfig;
  adUnits.forEach(adUnit => {
    // init the ortb2Imp if not done yet
    adUnit.ortb2Imp = adUnit.ortb2Imp || {};
    adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
    adUnit.ortb2Imp.ext.data = adUnit.ortb2Imp.ext.data || {};
    const context = adUnit.ortb2Imp.ext;
    // if neither new confs set do old stuff
    if (!customPreAuction && !useDefaultPreAuction) {
      warnDeprecation(adUnit);
      const usedAdUnitCode = appendPbAdSlot(adUnit);
      // gpid should be set to itself if already set, or to what pbadslot was (as long as it was not adUnit code)
      if (!context.gpid && !usedAdUnitCode) {
        context.gpid = context.data.pbadslot;
      }
    } else {
      if (context.data?.pbadslot) {
        warnDeprecation(adUnit);
      }
      let adserverSlot = deepAccess(context, 'data.adserver.adslot');
      let result;
      if (customPreAuction) {
        result = customPreAuction(adUnit, adserverSlot);
      } else if (useDefaultPreAuction) {
        result = defaultPreAuction(adUnit, adserverSlot);
      }
      if (result) {
        context.gpid = context.data.pbadslot = result;
      }
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

const handleSetGptConfig = moduleConfig => {
  _currentConfig = pick(moduleConfig, [
    'enabled', enabled => enabled !== false,
    'customGptSlotMatching', customGptSlotMatching =>
      typeof customGptSlotMatching === 'function' && customGptSlotMatching,
    'customPbAdSlot', customPbAdSlot => typeof customPbAdSlot === 'function' && customPbAdSlot,
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

import { isGptPubadsDefined, isAdUnitCodeMatchingSlot, deepAccess, pick, logInfo } from '../src/utils.js';
import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import find from 'core-js-pure/features/array/find.js';

const MODULE_NAME = 'GPT Pre-Auction';
export let _currentConfig = {};
let hooksAdded = false;

export const appendGptSlots = adUnits => {
  const { customGptSlotMatching } = _currentConfig;

  if (!isGptPubadsDefined()) {
    return;
  }

  const adUnitMap = adUnits.reduce((acc, adUnit) => {
    acc[adUnit.code] = adUnit;
    return acc;
  }, {});

  window.googletag.pubads().getSlots().forEach(slot => {
    const matchingAdUnitCode = find(Object.keys(adUnitMap), customGptSlotMatching
      ? customGptSlotMatching(slot)
      : isAdUnitCodeMatchingSlot(slot));

    if (matchingAdUnitCode) {
      const adUnit = adUnitMap[matchingAdUnitCode];
      adUnit.ortb2Imp = adUnit.ortb2Imp || {};
      adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
      adUnit.ortb2Imp.ext.data = adUnit.ortb2Imp.ext.data || {};

      const context = adUnit.ortb2Imp.ext.data;
      context.adserver = context.adserver || {};
      context.adserver.name = 'gam';
      context.adserver.adslot = sanitizeSlotPath(slot.getAdUnitPath());
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

export const appendPbAdSlot = adUnit => {
  adUnit.ortb2Imp = adUnit.ortb2Imp || {};
  adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
  adUnit.ortb2Imp.ext.data = adUnit.ortb2Imp.ext.data || {};
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

export const makeBidRequestsHook = (fn, adUnits, ...args) => {
  appendGptSlots(adUnits);
  adUnits.forEach(adUnit => {
    const usedAdUnitCode = appendPbAdSlot(adUnit);
    // gpid should be set to itself if already set, or to what pbadslot was (as long as it was not adUnit code)
    if (!adUnit.ortb2Imp.ext.gpid && !usedAdUnitCode) {
      adUnit.ortb2Imp.ext.gpid = adUnit.ortb2Imp.ext.data.pbadslot;
    }
  });
  return fn.call(this, adUnits, ...args);
};

const handleSetGptConfig = moduleConfig => {
  _currentConfig = pick(moduleConfig, [
    'enabled', enabled => enabled !== false,
    'customGptSlotMatching', customGptSlotMatching =>
      typeof customGptSlotMatching === 'function' && customGptSlotMatching,
    'customPbAdSlot', customPbAdSlot => typeof customPbAdSlot === 'function' && customPbAdSlot,
  ]);

  if (_currentConfig.enabled) {
    if (!hooksAdded) {
      getHook('makeBidRequests').before(makeBidRequestsHook);
      hooksAdded = true;
    }
  } else {
    logInfo(`${MODULE_NAME}: Turning off module`);
    _currentConfig = {};
    getHook('makeBidRequests').getHooks({hook: makeBidRequestsHook}).remove();
    hooksAdded = false;
  }
};

config.getConfig('gptPreAuction', config => handleSetGptConfig(config.gptPreAuction));
handleSetGptConfig({});

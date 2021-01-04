import { config } from '../src/config.js';
import * as utils from '../src/utils.js';
import { getHook } from '../src/hook.js';
import find from 'core-js-pure/features/array/find.js';

const MODULE_NAME = 'GPT Pre-Auction';
export let _currentConfig = {};
let hooksAdded = false;

export const appendGptSlots = adUnits => {
  const { customGptSlotMatching } = _currentConfig;

  if (!utils.isGptPubadsDefined()) {
    return;
  }

  const adUnitMap = adUnits.reduce((acc, adUnit) => {
    acc[adUnit.code] = adUnit;
    return acc;
  }, {});

  window.googletag.pubads().getSlots().forEach(slot => {
    const matchingAdUnitCode = find(Object.keys(adUnitMap), customGptSlotMatching
      ? customGptSlotMatching(slot)
      : utils.isAdUnitCodeMatchingSlot(slot));

    if (matchingAdUnitCode) {
      const adUnit = adUnitMap[matchingAdUnitCode];
      adUnit.fpd = adUnit.fpd || {};
      adUnit.fpd.context = adUnit.fpd.context || {};

      const context = adUnit.fpd.context;
      context.adServer = context.adServer || {};
      context.adServer.name = 'gam';
      context.adServer.adSlot = slot.getAdUnitPath();
    }
  });
};

export const appendPbAdSlot = adUnit => {
  adUnit.fpd = adUnit.fpd || {};
  adUnit.fpd.context = adUnit.fpd.context || {};
  const context = adUnit.fpd.context;
  const { customPbAdSlot } = _currentConfig;

  if (customPbAdSlot) {
    context.pbAdSlot = customPbAdSlot(adUnit.code, utils.deepAccess(context, 'adServer.adSlot'));
    return;
  }

  // use context.pbAdSlot if set
  if (context.pbAdSlot) {
    return;
  }
  // use data attribute 'data-adslotid' if set
  try {
    const adUnitCodeDiv = document.getElementById(adUnit.code);
    if (adUnitCodeDiv.dataset.adslotid) {
      context.pbAdSlot = adUnitCodeDiv.dataset.adslotid;
      return;
    }
  } catch (e) {}
  // banner adUnit, use GPT adunit if defined
  if (context.adServer) {
    context.pbAdSlot = context.adServer.adSlot;
    return;
  }
  context.pbAdSlot = adUnit.code;
};

export const makeBidRequestsHook = (fn, adUnits, ...args) => {
  appendGptSlots(adUnits);
  adUnits.forEach(adUnit => {
    appendPbAdSlot(adUnit);
  });
  return fn.call(this, adUnits, ...args);
};

const handleSetGptConfig = moduleConfig => {
  _currentConfig = utils.pick(moduleConfig, [
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
    utils.logInfo(`${MODULE_NAME}: Turning off module`);
    _currentConfig = {};
    getHook('makeBidRequests').getHooks({hook: makeBidRequestsHook}).remove();
    hooksAdded = false;
  }
};

config.getConfig('gptPreAuction', config => handleSetGptConfig(config.gptPreAuction));
handleSetGptConfig({});

import { getSignals as getSignalsFn, getSegments as getSegmentsFn, taxonomies } from '../libraries/gptUtils/gptUtils.js';
import { auctionManager } from '../src/auctionManager.js';
import { config } from '../src/config.js';
import { TARGETING_KEYS } from '../src/constants.js';
import { getHook } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import {
  deepAccess,
  deepSetValue,
  isAdUnitCodeMatchingSlot,
  isGptPubadsDefined,
  logError,
  logInfo,
  logWarn,
  pick,
  uniques
} from '../src/utils.js';
import type { AdUnit } from '../src/adUnits.ts';
import type { GptSlot } from '../src/types/gpt.d.ts';

const MODULE_NAME = 'GPT Pre-Auction';
const REQUEST_HOOK_ID = 'gpt-pre-auction-v$prebid.version$';
const REQUEST_BIDS_STUB_PRIORITY = 100;
export const INTERNAL_REQUEST_SYM = Symbol('gptPreAuctionInternalRequest');

export let _currentConfig: any = {};
let hooksAdded = false;
let unregisterGptRequestHook: (() => void) | null = null;
let requestHookQueued = false;
let requestBidsStubAdded = false;

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
    ) : [];
    result[taxonomy] = { values: result[taxonomy] };
  });
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
    const matchingAdUnitCode = Object.keys(adUnitMap).find(isAdUnitCodeMatchingSlot(slot));

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
};

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
};

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
      logWarn('Neither customPreAuction, defaultPreAuction and gpid were specified');
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
  window.googletag.setConfig && window.googletag.setConfig({ pps: { taxonomies: signals } });
  next(targetingSet);
};

export type GPTPreAuctionRequestHookConfig = {
  /**
   * Controls GPT Request Hook integration:
   * - 'disabled' (default): Does not register a GPT request hook.
   * - 'test': Registers the GPT request hook and stubs external pbjs.requestBids() calls.
   */
  mode?: 'disabled' | 'test';
};

export type GPTPreAuctionConfig = {
  /**
   * allows turning off of module. Default value is true
   */
  enabled?: boolean;
  /**
   * If true, use default behavior for determining GPID. Defaults to false.
   */
  useDefaultPreAuction?: boolean;
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
  /**
   * Optional GPT Request Hook integration settings.
   */
  requestHook?: GPTPreAuctionRequestHookConfig;
};

declare module '../src/config' {
  interface Config {
    gptPreAuction?: GPTPreAuctionConfig;
  }
}

const isRequestHookTestMode = () =>
  Boolean(_currentConfig.enabled && _currentConfig.requestHook?.mode === 'test');

export const gptRequestHook = async ({ slots }: { slots: GptSlot[] }) => {
  const pbjs: any = getGlobal();
  if (typeof pbjs.requestBids !== 'function') {
    return;
  }

  const configuredCodes = (pbjs.adUnits || []).map(adUnit => adUnit.code);
  const adUnitCodes = (slots || [])
    .flatMap(slot => configuredCodes.filter(isAdUnitCodeMatchingSlot(slot)))
    .filter(uniques);

  if (adUnitCodes.length === 0) {
    return;
  }

  await pbjs.requestBids({
    adUnitCodes,
    [INTERNAL_REQUEST_SYM]: true
  });

  if (typeof pbjs.setTargetingForGPTAsync === 'function') {
    pbjs.setTargetingForGPTAsync(adUnitCodes);
  }
};

export const requestBidsStub = (next, reqBidOptions) => {
  if (reqBidOptions?.[INTERNAL_REQUEST_SYM]) {
    return next(reqBidOptions);
  }

  logWarn(`${MODULE_NAME}: External pbjs.requestBids() call intercepted because requestHook.mode is 'test'.`);

  if (typeof reqBidOptions?.bidsBackHandler === 'function') {
    try {
      reqBidOptions.bidsBackHandler();
    } catch (e) {
      logError(`${MODULE_NAME}: Error executing bidsBackHandler in requestBids stub`, e);
    }
  }

  reqBidOptions?.defer?.resolve({
    bids: {},
    timedOut: false,
    auctionId: undefined
  });

  return next.bail(undefined);
};

const registerGptRequestHookSync = () => {
  if (unregisterGptRequestHook || !isGptPubadsDefined()) {
    return false;
  }
  const pubads = window.googletag.pubads();
  if (typeof pubads.registerRequestHook !== 'function') {
    return false;
  }
  unregisterGptRequestHook = pubads.registerRequestHook(gptRequestHook, REQUEST_HOOK_ID);
  return true;
};

const enableRequestHookTestMode = () => {
  if (!requestBidsStubAdded) {
    getHook('requestBids').before(requestBidsStub, REQUEST_BIDS_STUB_PRIORITY);
    requestBidsStubAdded = true;
  }

  if (unregisterGptRequestHook || registerGptRequestHookSync() || requestHookQueued) {
    return;
  }

  const googletagBootstrap: any = (window.googletag = window.googletag || ({ cmd: [] } as any));
  const cmdQueue = (googletagBootstrap.cmd = googletagBootstrap.cmd || []);
  requestHookQueued = true;

  const registerWhenReady = () => {
    requestHookQueued = false;
    if (isRequestHookTestMode()) {
      registerGptRequestHookSync();
    }
  };

  if (Array.isArray(cmdQueue)) {
    cmdQueue.unshift(registerWhenReady);
  } else {
    cmdQueue.push(registerWhenReady);
  }
};

const disableRequestHookTestMode = () => {
  if (unregisterGptRequestHook) {
    unregisterGptRequestHook();
    unregisterGptRequestHook = null;
  }
  if (requestBidsStubAdded) {
    getHook('requestBids').getHooks({ hook: requestBidsStub }).remove();
    requestBidsStubAdded = false;
  }
};

const handleSetGptConfig = moduleConfig => {
  _currentConfig = pick(moduleConfig, [
    'enabled', enabled => enabled !== false,
    'customPreAuction', customPreAuction => typeof customPreAuction === 'function' && customPreAuction,
    'useDefaultPreAuction', useDefaultPreAuction => useDefaultPreAuction ?? true,
    'requestHook', requestHook => requestHook?.mode === 'test' ? { mode: 'test' } : undefined
  ]);

  if (_currentConfig.enabled) {
    if (!hooksAdded) {
      getHook('makeBidRequests').before(makeBidRequestsHook);
      getHook('targetingDone').after(setPpsConfigFromTargetingSet);
      hooksAdded = true;
    }
    if (isRequestHookTestMode()) {
      enableRequestHookTestMode();
    } else {
      disableRequestHookTestMode();
    }
  } else {
    logInfo(`${MODULE_NAME}: Turning off module`);
    _currentConfig = {};
    getHook('makeBidRequests').getHooks({ hook: makeBidRequestsHook }).remove();
    getHook('targetingDone').getHooks({ hook: setPpsConfigFromTargetingSet }).remove();
    hooksAdded = false;
    disableRequestHookTestMode();
  }
};

config.getConfig('gptPreAuction', config => handleSetGptConfig(config.gptPreAuction));
handleSetGptConfig({});

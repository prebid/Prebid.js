import { getSignals as getSignalsFn, getSegments as getSegmentsFn, taxonomies } from '../libraries/gptUtils/gptUtils.js';
import { auctionManager } from '../src/auctionManager.js';
import { config } from '../src/config.js';
import { TARGETING_KEYS } from '../src/constants.js';
import { getHook } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import {
  deepSetValue,
  isAdUnitCodeMatchingSlot,
  isGptPubadsDefined,
  logError,
  logInfo,
  logWarn,
  mergeDeep,
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

    const adserverSlot = context.data?.adserver?.adslot;

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
   * - 'test': Opt-in evaluation mode that registers the GPT request hook and stubs
   *   external pbjs.requestBids() calls targeting GPT slots, resolving their
   *   bidsBackHandler asynchronously with empty bids so GPT display()/refresh()
   *   triggers the hook auction. Instream-only video calls pass through un-stubbed,
   *   as do requests whose ad units match no defined GPT slot once
   *   googletag.pubads().getSlots() is populated. Calls made before GPT slots exist
   *   are intercepted and auctioned when GPT later requests matching slots.
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

type InterceptedOptions = {
  labels?: string[];
  ortb2?: Record<string, any>;
  timeout?: number;
  ttlBuffer?: number;
};

type InterceptedCodeEntry = {
  adUnits?: AdUnit[];
  options?: InterceptedOptions;
};

type InterceptStore = {
  codes: () => string[];
  capture: (codes: string[], incomingAdUnits: AdUnit[], globalAdUnits: AdUnit[], reqBidOptions: any) => void;
  evict: (adUnitCode?: string | string[]) => void;
  applyToHookRequest: (adUnitCodes: string[], globalAdUnits: AdUnit[]) => Record<string, any>;
};

type RequestHookSession = {
  store: InterceptStore;
  syncWithGpt: () => void;
  dispose: () => void;
};

let activeSession: RequestHookSession | null = null;

const isInstreamOnly = (adUnit?: AdUnit) => {
  const mediaTypes: any = adUnit?.mediaTypes;
  return mediaTypes?.video?.context === 'instream' && !mediaTypes.banner && !mediaTypes.native;
};

const matchAdUnitCodesForSlots = (slots: GptSlot[] | undefined, candidateCodes: string[]) =>
  (slots || [])
    .flatMap(slot => candidateCodes.filter(isAdUnitCodeMatchingSlot(slot)))
    .filter(uniques);

const getInterceptCodes = (reqBidOptions: any): string[] | null => {
  if (reqBidOptions?.[INTERNAL_REQUEST_SYM]) {
    return null;
  }
  const incomingAdUnits: AdUnit[] = Array.isArray(reqBidOptions?.adUnits) ? reqBidOptions.adUnits : [];
  const targetedCodes: string[] = Array.isArray(reqBidOptions?.adUnitCodes)
    ? reqBidOptions.adUnitCodes.filter(Boolean)
    : [];

  const nonInstreamCodes = targetedCodes.filter((code) => {
    const unitsForCode = incomingAdUnits.filter(adUnit => adUnit?.code === code);
    return unitsForCode.length === 0 || unitsForCode.some(adUnit => !isInstreamOnly(adUnit));
  });

  if (targetedCodes.length > 0 && nonInstreamCodes.length === 0) {
    return null;
  }

  const gptSlots = isGptPubadsDefined() ? (window.googletag.pubads().getSlots() || []) : [];
  if (gptSlots.length > 0 && nonInstreamCodes.length > 0 && matchAdUnitCodesForSlots(gptSlots, nonInstreamCodes).length === 0) {
    return null;
  }

  return nonInstreamCodes;
};

const pickAuctionOptions = (reqBidOptions: any): InterceptedOptions => {
  const options: InterceptedOptions = {};
  if (Array.isArray(reqBidOptions?.labels)) {
    options.labels = reqBidOptions.labels.slice();
  }
  if (reqBidOptions?.ortb2 && typeof reqBidOptions.ortb2 === 'object') {
    options.ortb2 = mergeDeep({}, reqBidOptions.ortb2);
  }
  if (typeof reqBidOptions?.timeout === 'number') {
    options.timeout = reqBidOptions.timeout;
  }
  if (typeof reqBidOptions?.ttlBuffer === 'number') {
    options.ttlBuffer = reqBidOptions.ttlBuffer;
  }
  return options;
};

const mergeAuctionOptions = (optionsList: InterceptedOptions[]): InterceptedOptions => {
  const merged: InterceptedOptions = {};
  optionsList.forEach((opts) => {
    if (opts.labels) {
      merged.labels = (merged.labels || []).concat(opts.labels).filter(uniques);
    }
    if (opts.ortb2) {
      merged.ortb2 = mergeDeep(merged.ortb2 || {}, opts.ortb2);
    }
    if (opts.timeout != null) {
      merged.timeout = merged.timeout == null ? opts.timeout : Math.max(merged.timeout, opts.timeout);
    }
    if (opts.ttlBuffer != null) {
      merged.ttlBuffer = merged.ttlBuffer == null ? opts.ttlBuffer : Math.min(merged.ttlBuffer, opts.ttlBuffer);
    }
  });
  return merged;
};

const createInterceptStore = (): InterceptStore => {
  let entriesByCode: Record<string, InterceptedCodeEntry> = Object.create(null);
  let fallbackOptions: InterceptedOptions | null = null;

  return {
    codes: () => Object.keys(entriesByCode).filter(code => Boolean(entriesByCode[code]?.adUnits)),

    capture: (codes, incomingAdUnits, globalAdUnits, reqBidOptions) => {
      const options = pickAuctionOptions(reqBidOptions);
      if (codes.length === 0) {
        fallbackOptions = options;
        return;
      }
      codes.forEach((code) => {
        const adHocUnits = incomingAdUnits.filter(
          adUnit => adUnit?.code === code && !globalAdUnits.includes(adUnit)
        );
        entriesByCode[code] = {
          adUnits: adHocUnits.length > 0 ? adHocUnits : undefined,
          options
        };
      });
    },

    evict: (adUnitCode) => {
      if (!adUnitCode) {
        entriesByCode = Object.create(null);
        fallbackOptions = null;
        return;
      }
      (Array.isArray(adUnitCode) ? adUnitCode : [adUnitCode]).forEach((code) => {
        if (code) {
          delete entriesByCode[code];
        }
      });
    },

    applyToHookRequest: (adUnitCodes, globalAdUnits) => {
      const overrides: Record<string, any> = {};
      if (adUnitCodes.some(code => Boolean(entriesByCode[code]?.adUnits))) {
        overrides.adUnits = adUnitCodes.flatMap(code =>
          entriesByCode[code]?.adUnits ||
          globalAdUnits.filter(adUnit => adUnit.code === code)
        );
      }

      const optionsList = adUnitCodes
        .map(code => entriesByCode[code]?.options || fallbackOptions)
        .filter((opts): opts is InterceptedOptions => Boolean(opts))
        .filter(uniques);

      return Object.assign(overrides, mergeAuctionOptions(optionsList));
    }
  };
};

const patchRemoveAdUnit = (
  pbjs: any,
  onRemove: (adUnitCode?: string | string[]) => void
): (() => void) => {
  const original = pbjs.removeAdUnit;
  const wrapped = function (this: any, ...args: any[]) {
    onRemove(args[0]);
    return original.apply(this, args);
  };
  pbjs.removeAdUnit = wrapped;
  return () => {
    if (pbjs.removeAdUnit === wrapped) {
      pbjs.removeAdUnit = original;
    }
  };
};

const resolveStubbedRequest = (pbjs: any, reqBidOptions: any) => {
  Promise.resolve().then(() => {
    if (typeof reqBidOptions?.bidsBackHandler === 'function') {
      try {
        reqBidOptions.bidsBackHandler.call(pbjs, {}, false, undefined);
      } catch (e) {
        logError(`${MODULE_NAME}: Error executing bidsBackHandler in requestBids stub`, e);
      }
    }

    reqBidOptions?.defer?.resolve({
      bids: {},
      timedOut: false,
      auctionId: undefined
    });
  });
};

export const gptRequestHook = async ({ slots }: { slots: GptSlot[] }) => {
  const pbjs: any = getGlobal();
  if (typeof pbjs.requestBids !== 'function') {
    return;
  }

  const globalAdUnits: AdUnit[] = Array.isArray(pbjs.adUnits) ? pbjs.adUnits : [];
  const candidateCodes = [
    ...globalAdUnits.map(adUnit => adUnit.code),
    ...(activeSession?.store.codes() || [])
  ].filter(uniques);

  const adUnitCodes = matchAdUnitCodesForSlots(slots, candidateCodes);
  if (adUnitCodes.length === 0) {
    return;
  }

  await pbjs.requestBids({
    adUnitCodes,
    [INTERNAL_REQUEST_SYM]: true,
    ...activeSession?.store.applyToHookRequest(adUnitCodes, globalAdUnits)
  });

  if (typeof pbjs.setTargetingForGPTAsync === 'function') {
    pbjs.setTargetingForGPTAsync(adUnitCodes);
  }
};

export const requestBidsStub = (next, reqBidOptions) => {
  if (!activeSession) {
    return next(reqBidOptions);
  }

  const codes = getInterceptCodes(reqBidOptions);
  if (!codes) {
    return next(reqBidOptions);
  }

  const pbjs: any = getGlobal();
  const globalAdUnits: AdUnit[] = Array.isArray(pbjs.adUnits) ? pbjs.adUnits : [];
  const incomingAdUnits: AdUnit[] = Array.isArray(reqBidOptions?.adUnits) ? reqBidOptions.adUnits : [];
  activeSession.store.capture(codes, incomingAdUnits, globalAdUnits, reqBidOptions);

  logWarn(`${MODULE_NAME}: External pbjs.requestBids() call intercepted because requestHook.mode is 'test'.`);
  resolveStubbedRequest(pbjs, reqBidOptions);
  return next.bail(undefined);
};

const disableRequestHookTestMode = () => {
  const session = activeSession;
  activeSession = null;
  session?.dispose();
};

const createRequestHookSession = (onUnsupported: () => void): RequestHookSession => {
  const store = createInterceptStore();
  const cleanups: Array<() => void> = [];
  let disposed = false;
  let hookRegistered = false;
  let queuedCmd: any = null;

  getHook('requestBids').before(requestBidsStub, REQUEST_BIDS_STUB_PRIORITY);
  cleanups.push(() => {
    getHook('requestBids').getHooks({ hook: requestBidsStub }).remove();
  });

  const pbjs: any = getGlobal();
  if (typeof pbjs?.removeAdUnit === 'function') {
    cleanups.push(patchRemoveAdUnit(pbjs, store.evict));
  }

  const registerGptHook = () => {
    if (disposed || hookRegistered) {
      return;
    }
    if (!isGptPubadsDefined() || typeof window.googletag.pubads().registerRequestHook !== 'function') {
      logWarn(`${MODULE_NAME}: googletag.pubads().registerRequestHook is not available; disabling requestHook test mode.`);
      onUnsupported();
      return;
    }
    cleanups.push(window.googletag.pubads().registerRequestHook(gptRequestHook, REQUEST_HOOK_ID));
    hookRegistered = true;
  };

  const syncWithGpt = () => {
    if (disposed || hookRegistered) {
      return;
    }
    if (isGptPubadsDefined()) {
      registerGptHook();
      return;
    }

    const googletagBootstrap: any = (window.googletag = window.googletag || ({ cmd: [] } as any));
    const cmdQueue = (googletagBootstrap.cmd = googletagBootstrap.cmd || []);
    if (queuedCmd === cmdQueue) {
      return;
    }
    queuedCmd = cmdQueue;

    const registerWhenReady = () => {
      if (queuedCmd === cmdQueue) {
        queuedCmd = null;
      }
      registerGptHook();
    };

    if (Array.isArray(cmdQueue)) {
      cmdQueue.unshift(registerWhenReady);
    } else {
      cmdQueue.push(registerWhenReady);
    }
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    for (let i = cleanups.length - 1; i >= 0; i--) {
      cleanups[i]();
    }
    cleanups.length = 0;
  };

  return { store, syncWithGpt, dispose };
};

const enableRequestHookTestMode = () => {
  if (!activeSession) {
    if (isGptPubadsDefined() && typeof window.googletag.pubads().registerRequestHook !== 'function') {
      logWarn(`${MODULE_NAME}: googletag.pubads().registerRequestHook is not available; skipping requestHook test mode.`);
      return;
    }
    activeSession = createRequestHookSession(disableRequestHookTestMode);
  }
  activeSession.syncWithGpt();
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
    if (_currentConfig.requestHook?.mode === 'test') {
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

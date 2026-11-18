/**
 * This module adds User ID support to prebid.js
 * @module modules/userId
 */

import { config } from '../../src/config.js';
import * as events from '../../src/events.js';
import { addApiMethod, startAuction, type StartAuctionOptions } from '../../src/prebid.js';
import adapterManager from '../../src/adapterManager.js';
import { EVENTS } from '../../src/constants.js';
import { module, ready as hooksReady } from '../../src/hook.js';
import { EID_CONFIG, getEids } from './eids.js';
import { newStorageManager, type StorageManager, type StorageType } from '../../src/storageManager.js';
import {
  deepEqual,
  deepSetValue,
  delayExecution,
  isArray,
  isEmpty,
  isFn,
  isGptPubadsDefined,
  isNumber,
  isPlainObject,
  logError,
  logInfo,
  logWarn,
  mergeDeep
} from '../../src/utils.js';
import { getPPID as coreGetPPID } from '../../src/adserver.js';
import { defer, delay, PbPromise } from '../../src/utils/promise.js';
import { newMetrics, timedAuctionHook, useMetrics } from '../../src/utils/perfMetrics.js';
import { findRootDomain } from '../../src/fpd/rootDomain.js';
import { allConsent, GDPR_ACPIDS, GDPR_GVLIDS } from '../../src/consentHandler.js';
import { MODULE_TYPE_UID } from '../../src/activities/modules.js';
import { isActivityAllowed, registerActivityControl } from '../../src/activities/rules.js';
import { ACTIVITY_ACCESS_DEVICE, ACTIVITY_ENRICH_EIDS } from '../../src/activities/activities.js';
import { activityParams } from '../../src/activities/activityParams.js';
import { USERSYNC_DEFAULT_CONFIG, type UserSyncConfig } from '../../src/userSync.js';
import type { AnyFunction, Wraps } from "../../src/types/functions.d.ts";
import type {
  EID,
  IdProviderSpec,
  ProviderParams,
  ProviderResponse,
  SerializableId,
  UserId,
  UserIdConfig,
  UserIdProvider
} from "./spec.ts";
import {
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  ACTIVITY_PARAM_STORAGE_TYPE,
  ACTIVITY_PARAM_STORAGE_WRITE
} from '../../src/activities/params.js';
import { beforeInitAuction } from '../../src/auction.js';
import {
  canUseStorage,
  coreStorage,
  getConfiguredStorageTypes,
  hasValidStorageTypes,
  type InvocationHandle,
  MODULE_NAME,
  newIdStore,
  populateEnabledStorageTypes,
  type IdStore
} from './storage.ts';

// export so that consumers can `import {type UserIdConfig} from 'prebid.js/modules/userId'`
export { type UserIdConfig } from './spec.ts';
export { COOKIE_SUFFIXES, coreStorage, deleteStoredValue, getConsentHash, HTML5_SUFFIXES, setStoredValue } from './storage.ts';

export const PBJS_USER_ID_OPTOUT_NAME = '_pbjs_id_optout';
export const dep = {
  isAllowed: isActivityAllowed
};

declare module '../../src/userSync' {
  interface UserSyncConfig<P extends string = string> {
    /**
     * EID source to use as PPID for GAM.
     *
     * Publishers using Google AdManager may want to sync one of the identifiers as their Google PPID for frequency capping or reporting.
     * The PPID in GAM (which is unrelated to the PPID UserId Submodule) has strict rules; refer to Google AdManager documentation for them.
     * Please note, Prebid uses a GPT command to sync identifiers for publisher convenience.
     * It doesn’t currently work for instream video requests, as Prebid typically interacts with the player,
     * which in turn may interact with IMA. IMA does has a similar method as GPT, but IMA does not gather this ID from GPT.
     */
    ppid?: string;
    /**
     * Map from userID name (the key in the object returned by `getUserIds`) to names of modules that should be preferred
     * as sources for that ID, in order of decreasing priority.
     */
    idPriority?: {
      [idName: keyof UserId]: UserIdProvider[]
    }
    // Map each name separately: a union passed to UserIdConfig would mix providers' params.
    // P is inferred at the setter, so an unknown name doesn't also match a known provider.
    userIds?: (
      { [K in keyof ProviderParams]: UserIdConfig<K> }[keyof ProviderParams]
      | { [K in P]: UserIdConfig<K> }[P]
    )[];
    // TODO documentation for these is either missing or inscrutable
    encryptedSignalSources?: {
      sources: {
        source: string[]
        encrypt: boolean;
        customFunc: AnyFunction
      }[]
      /**
       * The amount of time (in milliseconds) after which registering of signals will happen. Default value 0 is considered if ‘registerDelay’ is not provided.
       */
      registerDelay?: number;
    }
    /**
     * If true (the default), updating userSync.userIds will not remove previously configured IDs.
     */
    retainConfig?: boolean;
    /**
     * If true, updating userSync.userIds will automatically refresh IDs that have not yet been fetched.
     */
    autoRefresh?: boolean;

    /**
     * If true, user ID modules will only be allowed to save data in the location specified in the configuration.
     */
    enforceStorageType?: boolean;
  }
}

let submodules: SubmoduleContainer<UserIdProvider>[] = [];
let initializedSubmodules;
let configRegistry = [];
let idPriority = {};
let submoduleRegistry: IdProviderSpec<UserIdProvider>[] = [];
let timeoutID;
export let syncDelay;
export let auctionDelay;

let ppidSource;

let configListener;

const uidMetrics = (() => {
  let metrics;
  return () => {
    if (metrics == null) {
      metrics = newMetrics();
    }
    return metrics;
  };
})();

function submoduleMetrics(moduleName) {
  return uidMetrics().fork().renameWith(n => [`userId.mod.${n}`, `userId.mods.${moduleName}.${n}`]);
}

export function setSubmoduleRegistry(submodules) {
  submoduleRegistry = submodules;
  updateEIDConfig(submodules);
}

function processSubmoduleCallbacks(submodules, cb) {
  cb = uidMetrics().fork().startTiming('userId.callbacks.total').stopBefore(cb);
  const done = delayExecution(() => {
    clearTimeout(timeoutID);
    cb();
  }, submodules.length);
  submodules.forEach(function (submodule) {
    // set by submodule.store.handle() in populateSubmoduleId (see IdStore.handle in ./storage.ts)
    const handle: InvocationHandle = submodule.handle;
    handle.onClose = submoduleMetrics(submodule.submodule.name).startTiming('callback').stopBefore(done);
    function setId(id?: SerializableId) {
      if (handle.managed) {
        handle.setId(id);
      } else if (id) {
        try {
          handle.store(id);
        } finally {
          handle.setId(id);
        }
      } else {
        logInfo(`${MODULE_NAME}: ${submodule.submodule.name} - request id responded with an empty value`);
        handle.close();
      }
    }
    try {
      submodule.callback(setId, (key?: string) => submodule.store.read(key));
    } catch (e) {
      logError(`Error in userID module '${submodule.submodule.name}':`, e);
      handle.close();
    }
    // clear callback, this prop is used to test if all submodule callbacks are complete below
    submodule.callback = undefined;
  });
}

function getIds(priorityMap): Partial<UserId> {
  return Object.fromEntries(
    Object.entries(priorityMap)
      .map(([key, getActiveModule]: [string, any]) => [key, getActiveModule()?.idObj?.[key]])
      .filter(([_, value]) => value != null)
  );
}

function getPrimaryIds(submodule) {
  if (submodule.primaryIds) return submodule.primaryIds;
  const ids = Object.keys(submodule.eids ?? {});
  if (ids.length > 1) {
    throw new Error(`ID submodule ${submodule.name} can provide multiple IDs, but does not specify 'primaryIds'`);
  }
  return ids;
}

/**
 * Given a collection of items, where each item maps to any number of IDs (getKeys) and an ID module (getIdMod),
 * return a map from ID key to all items that map to that ID key, in order of priority (highest priority first).
 *
 */
function orderByPriority(items, getKeys, getIdMod) {
  const tally = {};
  items.forEach(item => {
    const module = getIdMod(item);
    const primaryIds = getPrimaryIds(module);
    getKeys(item).forEach(key => {
      const keyItems = tally[key] = tally[key] ?? [];
      const keyPriority = idPriority[key]?.indexOf(module.name) ?? (primaryIds.includes(key) ? 0 : -1);
      const pos = keyItems.findIndex(([priority]) => priority < keyPriority);
      keyItems.splice(pos === -1 ? keyItems.length : pos, 0, [keyPriority, item]);
    });
  });
  return Object.fromEntries(Object.entries(tally).map(([key, items]: [string, any]) => [key, items.map(([_, item]) => item)]));
}

function mkPriorityMaps() {
  const map = {
    submodules: [],
    global: {},
    bidder: {},
    combined: {},
    /**
     * @param {SubmoduleContainer[]} addtlModules
     */
    refresh(addtlModules = []) {
      const refreshing = new Set(addtlModules.map(mod => mod.submodule));
      map.submodules = map.submodules.filter((mod) => !refreshing.has(mod.submodule)).concat(addtlModules);
      update();
    },
    reset() {
      map.submodules = [];
      update();
    }
  };
  function update() {
    const modulesById = orderByPriority(
      map.submodules,
      (submod) => Object.keys(submod.idObj ?? {}),
      (submod) => submod.submodule,
    );
    const global: any = {};
    const bidder: any = {};

    function activeModuleGetter(key, useGlobals, modules) {
      return function () {
        for (const { allowed, bidders, module } of modules) {
          if (!dep.isAllowed(ACTIVITY_ENRICH_EIDS, activityParams(MODULE_TYPE_UID, module?.config?.name, { init: false }))) {
            continue;
          }
          const value = module.idObj?.[key];
          if (value != null) {
            if (allowed) {
              return module;
            } else if (useGlobals) {
              // value != null, allowed = false, useGlobals = true:
              // this module has the preferred ID but it cannot be used (because it's restricted to only some bidders
              // and we are calculating global IDs).
              // since we don't (yet) have a way to express "global except for these bidders" in FPD,
              // do not keep looking for alternative IDs in other (lower priority) modules; the ID will be provided only
              // to the bidders this module is configured for.
              const listModules = (modules) => modules.map(mod => mod.module.submodule.name).join(', ');
              logWarn(`userID modules ${listModules(modules)} provide the same ID ('${key}'); ${module.submodule.name} is the preferred source, but it's configured only for some bidders, unlike ${listModules(modules.filter(mod => mod.bidders == null))}. Other bidders will not see the "${key}" ID.`);
              return null;
            } else if (bidders == null) {
              // value != null, allowed = false, useGlobals = false, bidders == null:
              // this module has the preferred ID but it should not be used because it's not bidder-restricted and
              // we are calculating bidder-specific ids. Do not keep looking in other lower priority modules, as the ID
              // will be set globally.
              return null;
            }
          }
        }
        return null;
      };
    }

    Object.entries(modulesById)
      .forEach(([key, modules]) => {
        let allNonGlobal = true;
        const bidderFilters = new Set<any>();
        modules = modules.map(module => {
          let bidders = null;
          if (Array.isArray(module.config.bidders) && module.config.bidders.length > 0) {
            bidders = module.config.bidders;
            bidders.forEach(bidder => bidderFilters.add(bidder));
          } else {
            allNonGlobal = false;
          }
          return {
            module,
            bidders
          };
        });
        if (!allNonGlobal) {
          global[key] = activeModuleGetter(key, true, modules.map(({ bidders, module }) => ({ allowed: bidders == null, bidders, module })));
        }
        bidderFilters.forEach(bidderCode => {
          bidder[bidderCode] = bidder[bidderCode] ?? {};
          bidder[bidderCode][key] = activeModuleGetter(key, false, modules.map(({ bidders, module }) => ({ allowed: bidders?.includes(bidderCode), bidders, module })));
        });
      });
    const combined = Object.values(bidder).concat([global]).reduce((combo, map) => Object.assign(combo, map), {});
    Object.assign(map, { global, bidder, combined });
  }
  return map;
}

export function enrichEids(ortb2Fragments) {
  const { global: globalFpd, bidder: bidderFpd } = ortb2Fragments;
  const { global: globalMods, bidder: bidderMods } = initializedSubmodules;
  const globalEids = getEids(globalMods);
  if (globalEids.length > 0) {
    deepSetValue(globalFpd, 'user.ext.eids', (globalFpd.user?.ext?.eids ?? []).concat(globalEids));
  }
  Object.entries(bidderMods).forEach(([bidder, moduleMap]) => {
    const bidderEids = getEids(moduleMap);
    if (bidderEids.length > 0) {
      deepSetValue(
        bidderFpd,
        `${bidder}.user.ext.eids`,
        (bidderFpd[bidder]?.user?.ext?.eids ?? []).concat(bidderEids)
      );
    }
  });
  return ortb2Fragments;
}

declare module '../../src/adapterManager' {
  interface BaseBidRequest {
    userIdAsEids?: EID[];
  }
}

export function addIdData({ ortb2Fragments }) {
  ortb2Fragments = ortb2Fragments ?? { global: {}, bidder: {} };
  enrichEids(ortb2Fragments);
}

const INIT_CANCELED = {};

function idSystemInitializer({ mkDelay = delay } = {}) {
  const startInit = defer<void>();
  const startCallbacks = defer<void>();
  let cancel;
  let initStarted = false;
  let initialized = false;
  let initMetrics;

  function cancelAndTry(promise) {
    initMetrics = uidMetrics().fork();
    if (cancel != null) {
      cancel.reject(INIT_CANCELED);
    }
    cancel = defer();
    return PbPromise.race([promise, cancel.promise])
      .finally(initMetrics.startTiming('userId.total'));
  }

  // grab a reference to global vars so that the promise chains remain isolated;
  // multiple calls to `init` (from tests) might otherwise cause them to interfere with each other
  const initModules = initializedSubmodules;
  const allModules = submodules;

  function checkRefs(fn) {
    // unfortunately tests have their own global state that needs to be guarded, so even if we keep ours tidy,
    // we cannot let things like submodule callbacks run (they pollute things like the global `server` XHR mock)
    return function(...args) {
      if (initModules === initializedSubmodules && allModules === submodules) {
        return fn(...args);
      }
    };
  }

  function timeConsent() {
    return allConsent.promise.finally(initMetrics.startTiming('userId.init.consent'));
  }

  // Batches of submodule callbacks that have been discovered but have not finished.
  // A filtered refresh cancels `done`, but the submodules it did not name may still
  // be fetching, so its replacement chain waits for them rather than releasing the
  // auction early. Tracked from discovery rather than from the moment they start,
  // because with `auctionDelay` = 0 callbacks are held until after the auction ends.
  const inFlight = new Set<ReturnType<typeof defer<void>>>();

  function trackBatch() {
    const batch = defer<void>();
    inFlight.add(batch);
    return {
      batch,
      settle: () => {
        inFlight.delete(batch);
        batch.resolve();
      }
    };
  }

  function pendingCallbacks() {
    return inFlight.size
      ? PbPromise.all(Array.from(inFlight, (batch) => batch.promise)).then(() => undefined)
      : null;
  }

  // An unfiltered refresh replaces everything, including work that may never
  // finish. Release the markers it supersedes, or a later filtered refresh would
  // wait on a batch nothing is going to complete.
  function supersedeAll(except) {
    Array.from(inFlight).forEach((batch) => {
      if (batch === except) return;
      inFlight.delete(batch);
      batch.resolve();
    });
  }

  let settleInitial;

  const initChain = PbPromise.all([hooksReady, startInit.promise])
    .then(timeConsent)
    .then(checkRefs(() => {
      initialized = true;
      initSubmodules(initModules, allModules);
      if (initModules.submodules.some(item => isFn(item.callback))) {
        settleInitial = trackBatch().settle;
      }
    }))
    .then(() => startCallbacks.promise.finally(initMetrics.startTiming('userId.callbacks.pending')))
    .then(checkRefs(() => {
      const modWithCb = initModules.submodules.filter(item => isFn(item.callback));
      if (modWithCb.length) {
        return new PbPromise((resolve) => processSubmoduleCallbacks(modWithCb, resolve));
      }
    }));

  // never let the marker outlive the chain that owns it
  initChain.then(() => settleInitial?.(), () => settleInitial?.());

  let done = cancelAndTry(initChain);

  /**
   * with `ready` = true, starts initialization; with `refresh` = true, reinitialize submodules (optionally
   * filtered by `submoduleNames`).
   */
  return function ({ refresh = false, submoduleNames = null, ready = false, forceNewModuleRefresh = true } = {}) {
    if (ready && !initStarted) {
      initStarted = true;
      startInit.resolve();
      // submodule callbacks should run immediately if `auctionDelay` > 0, or `syncDelay` ms after the
      // auction ends otherwise
      if (auctionDelay > 0) {
        startCallbacks.resolve();
      } else {
        events.on(EVENTS.AUCTION_END, function auctionEndHandler() {
          events.off(EVENTS.AUCTION_END, auctionEndHandler);
          mkDelay(syncDelay).then(startCallbacks.resolve);
        });
      }
    }
    if (refresh && initialized) {
      // Captured before the refresh adds a batch of its own. An unfiltered refresh
      // supersedes everything, so it keeps escaping a stuck initialization; a
      // filtered one must not shorten the wait for what it left running.
      // A filtered refresh waits for what it leaves running; an unfiltered one
      // supersedes it, but only once the replacement is installed below.
      const priorCallbacks = submoduleNames == null ? null : pendingCallbacks();
      // Registered now, not when the chain gets there: a second refresh issued
      // before this one has run must still see this batch as outstanding.
      const refreshBatch = trackBatch();
      const settleRefresh = refreshBatch.settle;
      const chain = done
        .catch(() => null)
        .then(timeConsent) // fetch again in case a refresh was forced before this was resolved
        .then(checkRefs(() => {
          const cbModules = initSubmodules(
            initModules,
            allModules.filter((sm) => submoduleNames == null || submoduleNames.includes(sm.submodule.name)),
            true,
            forceNewModuleRefresh
          ).filter((sm) => {
            return sm.callback != null;
          });
          if (cbModules.length) {
            return new PbPromise((resolve) => processSubmoduleCallbacks(cbModules, resolve));
          }
        }));
      chain.then(settleRefresh, settleRefresh);
      done = cancelAndTry(
        priorCallbacks == null ? chain : PbPromise.all([priorCallbacks, chain]).then(() => undefined)
      );
      if (submoduleNames == null) {
        // After the swap, never before: releasing these first can fulfil the chain
        // this refresh just replaced, and a caller can take it for the current one.
        supersedeAll(refreshBatch.batch);
      }
    }
    return done;
  };
}

let initIdSystem;

function getPPID(eids = getUserIdsAsEids() || []) {
  // userSync.ppid should be one of the 'source' values in getUserIdsAsEids() eg pubcid.org or id5-sync.com
  const matchingUserId = ppidSource && eids.find(userID => userID.source === ppidSource);
  if (matchingUserId && typeof matchingUserId?.uids?.[0]?.id === 'string') {
    const ppidValue = matchingUserId.uids[0].id.replace(/[\W_]/g, '');
    // Regex copied from https://support.google.com/admanager/answer/2880055?hl=en#requirements,
    // and removed the uncessary escape character inside the character class
    const regex = /^[0-9a-zA-Z+.=/_\-$,{}]{22,150}$/;
    if (regex.test(ppidValue)) {
      return ppidValue;
    } else {
      logWarn(`User ID - Googletag Publisher Provided ID for ${ppidSource} doesn't match the PPID requirements - ${ppidValue}`);
    }
  }
}

/**
 * Hook is executed before adapters, but after consentManagement. Consent data is requied because
 * this module requires GDPR consent with Purpose #1 to save data locally.
 * The two main actions handled by the hook are:
 * 1. check gdpr consentData and handle submodule initialization.
 * 2. append user id data (loaded from cookied/html or from the getId method) to bids to be accessed in adapters.
 * @param {Object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.ts
 */
export const startAuctionHook = timedAuctionHook('userId', function requestBidsHook(fn, reqBidsConfigObj: StartAuctionOptions, { mkDelay = delay, getIds = getUserIdsAsync } = {}) {
  PbPromise.race([
    getIds().catch(() => null),
    mkDelay(auctionDelay)
  ]).then(() => {
    addIdData(reqBidsConfigObj);
    uidMetrics().join(useMetrics(reqBidsConfigObj.metrics), { propagate: false, includeGroups: true });
    // calling fn allows prebid to continue processing
    fn.call(this, reqBidsConfigObj);
  });
});

/**
 * Alias bid requests' `userIdAsEids` to `ortb2.user.ext.eids`
 * Do this lazily (instead of attaching a copy) so that it also shows EIDs added after the userId module runs (e.g. from RTD modules)
 */
function aliasEidsHook(next, bidderRequests) {
  bidderRequests.forEach(bidderRequest => {
    bidderRequest.bids.forEach(bid =>
      Object.defineProperty(bid, 'userIdAsEids', {
        configurable: true,
        get() {
          return bidderRequest.ortb2.user?.ext?.eids ?? [];
        }
      })
    );
  });
  next(bidderRequests);
}

export function adUnitEidsHook(next, auction) {
  // for backwards-compat, add `userIdAsEids` to ad units' bid objects
  // before auction events are fired
  // these are computed similarly to bid requests' `ortb2`, but unlike them,
  // they are not subject to the same activity checks (since they are not intended for bid adapters)

  const eidsByBidder = {};
  const globalEids = auction.getFPD()?.global?.user?.ext?.eids ?? [];
  function getEids(bidderCode) {
    if (bidderCode == null) return globalEids;
    if (!eidsByBidder.hasOwnProperty(bidderCode)) {
      eidsByBidder[bidderCode] = mergeDeep(
        { eids: [] },
        { eids: globalEids },
        { eids: auction.getFPD()?.bidder?.[bidderCode]?.user?.ext?.eids ?? [] }
      ).eids;
    }
    return eidsByBidder[bidderCode];
  }
  auction.getAdUnits()
    .flatMap(au => au.bids)
    .forEach(bid => {
      const eids = getEids(bid.bidder);
      if (eids.length > 0) {
        bid.userIdAsEids = eids;
      }
    });
  next(auction);
}
/**
 * Is startAuctionHook added
 * @returns {boolean}
 */
function addedStartAuctionHook() {
  return !!startAuction.getHooks({ hook: startAuctionHook }).length;
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */
function getUserIds() {
  return getIds(initializedSubmodules.combined);
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */
function getUserIdsAsEids(): EID[] {
  return getEids(initializedSubmodules.combined);
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */

function getUserIdsAsEidBySource(sourceName: string): EID | undefined {
  return getUserIdsAsEids().filter(eid => eid.source === sourceName)[0];
}

/**
 * This function will be exposed in global-name-space so that userIds for a source can be exposed
 * Sample use case is exposing this function to ESP
 */
function getEncryptedEidsForSource(source, encrypt, customFunction) {
  return retryOnCancel().then(() => {
    const eidsSignals = {};

    if (isFn(customFunction)) {
      logInfo(`${MODULE_NAME} - Getting encrypted signal from custom function : ${customFunction.name} & source : ${source} `);
      // Publishers are expected to define a common function which will be proxy for signal function.
      const customSignals = customFunction(source);
      eidsSignals[source] = customSignals ? encryptSignals(customSignals) : null; // by default encrypt using base64 to avoid JSON errors
    } else {
      // initialize signal with eids by default
      const eid = getUserIdsAsEidBySource(source);
      logInfo(`${MODULE_NAME} - Getting encrypted signal for eids :${JSON.stringify(eid)}`);
      if (!isEmpty(eid)) {
        eidsSignals[eid.source] = encrypt === true ? encryptSignals(eid) : eid.uids[0].id; // If encryption is enabled append version (1||) and encrypt entire object
      }
    }
    logInfo(`${MODULE_NAME} - Fetching encrypted eids: ${eidsSignals[source]}`);
    return eidsSignals[source];
  });
}

function encryptSignals(signals, version = 1) {
  let encryptedSig = '';
  switch (version) {
    case 1: // Base64 Encryption
      encryptedSig = typeof signals === 'object' ? window.btoa(JSON.stringify(signals)) : window.btoa(signals); // Test encryption. To be replaced with better algo
      break;
    default:
      break;
  }
  return `${version}||${encryptedSig}`;
}

/**
 * This function will be exposed in the global-name-space so that publisher can register the signals-ESP.
 */
function registerSignalSources() {
  if (!isGptPubadsDefined()) {
    return;
  }

  const encryptedSignalSources = config.getConfig('userSync.encryptedSignalSources');
  if (encryptedSignalSources) {
    const registerDelay = encryptedSignalSources.registerDelay || 0;
    setTimeout(() => {
      encryptedSignalSources['sources'] && encryptedSignalSources['sources'].forEach(({ source, encrypt, customFunc }) => {
        source.forEach((src) => {
          window.googletag.secureSignalProviders.push({
            id: src,
            collectorFunction: () => getEncryptedEidsForSource(src, encrypt, customFunc)
          });
        });
      });
    }, registerDelay);
  } else {
    logWarn(`${MODULE_NAME} - ESP : encryptedSignalSources config not defined under userSync Object`);
  }
}

function retryOnCancel(initParams?) {
  const ready = initIdSystem(initParams);
  return ready.then(
    () => {
      // if something has changed, try again
      const updated = initIdSystem();
      return updated === ready ? getUserIds() : retryOnCancel();
    },
    (e) => {
      if (e === INIT_CANCELED) {
        // there's a pending refresh - because GreedyPromise runs this synchronously, we are now in the middle
        // of canceling the previous init, before the refresh logic has had a chance to run.
        // Use a "normal" Promise to clear the stack and let it complete (or this will just recurse infinitely)
        return Promise.resolve().then(getUserIdsAsync);
      } else {
        logError('Error initializing userId', e);
        return PbPromise.reject(e);
      }
    }
  );
}

/**
 * Force (re)initialization of ID submodules.
 *
 * This will force a refresh of the specified ID submodules regardless of `auctionDelay` / `syncDelay` settings, and
 * return a promise that resolves to the same value as `getUserIds()` when the refresh is complete.
 * If a refresh is already in progress, it will be canceled (rejecting promises returned by previous calls to `refreshUserIds`).
 *
 * submoduleNames submodules to refresh. If omitted, refresh all submodules.
 * callback called when the refresh is complete
 */
function refreshUserIds({ submoduleNames }: {
  submoduleNames?: string[]
} = {}, callback?: () => void): Promise<Partial<UserId>> {
  return retryOnCancel({ refresh: true, submoduleNames })
    .then((userIds) => {
      if (callback && isFn(callback)) {
        callback();
      }
      return userIds;
    });
}

/**
 * @returns a promise that resolves to the same value as `getUserIds()`, but only once all ID submodules have completed
 * initialization. This can also be used to synchronize calls to other ID accessors, e.g.
 *
 * ```
 * pbjs.getUserIdsAsync().then(() => {
 *   const eids = pbjs.getUserIdsAsEids(); // guaranteed to be completely initialized at this point
 * });
 * ```
 */

function getUserIdsAsync(): Promise<Partial<UserId>> {
  return retryOnCancel();
}

function populateSubmoduleId(submodule: SubmoduleContainer<UserIdProvider>, priorityMaps, forceRefresh) {
  const consentData = allConsent.getConsentData();

  // There are three submodule configuration types to handle:
  // 1. storage: retrieve user id data from cookie/html storage or with the submodule's getId method
  // 2. value: pass directly to bids
  // 3. neither: call getId on every page view
  // a callback left by an earlier invocation is superseded, whether or not this one returns its own
  submodule.callback = undefined;
  if (submodule.config.value && !submodule.config.storage) {
    submodule.idObj = submodule.config.value;
    return;
  }
  // store.handle() also records the new handle as submodule.handle, which processSubmoduleCallbacks reads
  const handle = submodule.store.handle({
    isCurrent: () => priorityMaps === initializedSubmodules,
    onChange: () => {
      priorityMaps.refresh();
      updatePPID(priorityMaps);
    }
  });
  let storedId;
  let response;
  if (submodule.config.storage) {
    storedId = submodule.store.read();
    if (!storedId || forceRefresh || submodule.store.needsRefresh()) {
      const extendedConfig = Object.assign({ enabledStorageTypes: submodule.enabledStorageTypes }, submodule.config);

      // No id previously saved, or a refresh is needed, or consent has changed. Request a new id from the submodule.
      response = submodule.submodule.getId(extendedConfig, consentData, storedId, handle.view);
    } else if (typeof submodule.submodule.extendId === 'function') {
      // If the id exists already, give submodule a chance to decide additional actions that need to be taken
      response = submodule.submodule.extendId(submodule.config, consentData, storedId, handle.view);
    }
  } else {
    response = submodule.submodule.getId(submodule.config, consentData, undefined, handle.view);
  }

  const id = isPlainObject(response) ? response.id : undefined;
  const callback = isPlainObject(response) && typeof response.callback === 'function' ? response.callback : undefined;
  if (handle.managed) {
    submodule.idObj = id ? submodule.submodule.decode(id, submodule.config) : undefined;
  } else {
    if (id) {
      // A getId/extendId result assumed to be valid user id data, which should be saved to users local storage or cookies
      handle.store(id);
      storedId = id;
    }
    if (storedId) {
      // cache decoded value (this is copied to every adUnit bid)
      submodule.idObj = submodule.submodule.decode(storedId, submodule.config);
    }
  }
  submodule.callback = callback;
  if (!callback) {
    handle.close();
  }
}

function updatePPID(priorityMaps) {
  const eids = getEids(priorityMaps.combined);
  if (eids.length && ppidSource) {
    const ppid = getPPID(eids);
    if (ppid) {
      if (isGptPubadsDefined()) {
        window.googletag.pubads().setPublisherProvidedId(ppid);
      } else {
        (window as any).googletag = window.googletag || {};
        (window.googletag as any).cmd = window.googletag.cmd || [];
        window.googletag.cmd.push(function() {
          window.googletag.pubads().setPublisherProvidedId(ppid);
        });
      }
    }
  }
}

function hasOptedOut() {
  if (coreStorage.getDataFromLocalStorage(PBJS_USER_ID_OPTOUT_NAME)) {
    logInfo(`${MODULE_NAME} - opt-out localStorage found, userId disabled`);
    return true;
  }
  if (coreStorage.getCookie(PBJS_USER_ID_OPTOUT_NAME)) {
    logInfo(`${MODULE_NAME} - opt-out cookie found, userId disabled`);
    return true;
  }
  return false;
}

function initSubmodules(priorityMaps, submodules, forceRefresh = false, forceNewModuleRefresh = forceRefresh) {
  return uidMetrics().fork().measureTime('userId.init.modules', function () {
    if (hasOptedOut()) {
      priorityMaps.reset();
      return [];
    }
    if (!submodules.length) return []; // to simplify log messages from here on
    submodules.forEach(submod => populateEnabledStorageTypes(submod));

    /**
     * filter out submodules that:
     *
     *  - cannot use the storage they've been set up with (storage not available / not allowed / disabled)
     *  - are not allowed to perform the `enrichEids` activity
     */
    submodules = submodules.filter((submod) => {
      return (!submod.config.storage || canUseStorage(submod)) &&
        dep.isAllowed(ACTIVITY_ENRICH_EIDS, activityParams(MODULE_TYPE_UID, submod.config.name));
    });

    if (!submodules.length) {
      logWarn(`${MODULE_NAME} - no ID module configured`);
      return [];
    }

    const initialized = submodules.reduce((carry, submodule) => {
      return submoduleMetrics(submodule.submodule.name).measureTime('init', () => {
        try {
          populateSubmoduleId(submodule, priorityMaps, submodule.new ? forceNewModuleRefresh : forceRefresh);
          carry.push(submodule);
        } catch (e) {
          logError(`Error in userID module '${submodule.submodule.name}':`, e);
        }
        return carry;
      });
    }, []);
    priorityMaps.refresh(initialized);
    updatePPID(priorityMaps);
    return initialized;
  });
}

/**
 * list of submodule configurations with valid 'storage' or 'value' obj definitions
 * storage config: contains values for storing/retrieving User ID data in browser storage
 * value config: object properties that are copied to bids (without saving to storage)
 */
export function getValidSubmoduleConfigs(configRegistry) {
  function err(msg, ...args) {
    logWarn(`Invalid userSync.userId config: ${msg}`, ...args);
  }
  if (!Array.isArray(configRegistry)) {
    if (configRegistry != null) {
      err('must be an array', configRegistry);
    }
    return [];
  }
  return configRegistry.filter(config => {
    if (!config?.name) {
      return err('must specify "name"', config);
    } else if (config.storage) {
      if (!config.storage.name || !config.storage.type) {
        return err('must specify "storage.name" and "storage.type"', config);
      } else if (!hasValidStorageTypes(config)) {
        return err('invalid "storage.type"', config);
      }
      ['expires', 'refreshInSeconds'].forEach(param => {
        let value = config.storage[param];
        if (value != null && typeof value !== 'number') {
          value = Number(value);
          if (isNaN(value)) {
            err(`storage.${param} must be a number and will be ignored`, config);
            delete config.storage[param];
          } else {
            config.storage[param] = value;
          }
        }
      });
    }
    return true;
  });
}

function updateEIDConfig(submodules) {
  EID_CONFIG.clear();
  Object.entries(
    orderByPriority(
      submodules,
      (mod) => Object.keys(mod.eids || {}),
      (mod) => mod
    )
  ).forEach(([key, submodules]) => EID_CONFIG.set(key, submodules[0].eids[key]));
}

export function generateSubmoduleContainers(options, configs, prevSubmodules = submodules, registry = submoduleRegistry) {
  const { retainConfig } = options;
  return registry
    .reduce((acc, submodule) => {
      const { name, aliasName } = submodule;
      const matchesName = (query) => [name, aliasName].some(value => value?.toLowerCase() === query.toLowerCase());
      const submoduleConfig = configs.find((configItem) => matchesName(configItem.name));
      const previousSubmodule = prevSubmodules.find(prevSubmodules => matchesName(prevSubmodules.config.name));

      if (!submoduleConfig) {
        if (!retainConfig) return acc;
        return previousSubmodule ? [...acc, Object.assign(previousSubmodule, { dirty: false, new: false })] : acc;
      }

      const newConfig = {
        ...submoduleConfig,
        name: submodule.name
      };

      const newSubmoduleContainer: SubmoduleContainer<UserIdProvider> = {
        submodule,
        config: newConfig,
        callback: undefined,
        idObj: undefined,
        storageMgr: newStorageManager({
          moduleType: MODULE_TYPE_UID,
          moduleName: submoduleConfig.name,
          // since this manager is only using keys provided directly by the publisher,
          // turn off storageControl checks
          advertiseKeys: false,
        }),
        store: undefined,
        dirty: previousSubmodule == null || !deepEqual(newConfig, previousSubmodule.config),
        new: previousSubmodule == null
      };
      newSubmoduleContainer.store = newIdStore(newSubmoduleContainer);

      return [...acc, newSubmoduleContainer];
    }, []);
}

export type SubmoduleContainer<P extends UserIdProvider> = {
  submodule: IdProviderSpec<P>;
  enabledStorageTypes?: StorageType[];
  config: UserIdConfig<P>;
  callback?: ProviderResponse['callback'];
  idObj;
  storageMgr: StorageManager;
  store: IdStore;
  // the latest getId / extendId invocation; an older one completing late is ignored
  handle?: InvocationHandle;
  // true if this module was reconfigured (latest config is different from previous config)
  dirty: boolean;
  // true if this module was added (had no previous config)
  new: boolean;
};

/**
 * update submodules by validating against existing configs and storage types
 */
function updateSubmodules(options = {}) {
  updateEIDConfig(submoduleRegistry);
  const configs = getValidSubmoduleConfigs(configRegistry);
  if (!configs.length) {
    return;
  }

  const updatedContainers = generateSubmoduleContainers(options, configs);
  submodules.splice(0, submodules.length);
  submodules.push(...updatedContainers);

  if (submodules.length) {
    if (!addedStartAuctionHook()) {
      startAuction.before(startAuctionHook, 100); // use higher priority than dataController / rtd
      adapterManager.callDataDeletionRequest.before(requestDataDeletion);
      coreGetPPID.after((next) => next(getPPID()));
    }
    logInfo(`${MODULE_NAME} - usersync config updated for ${submodules.length} submodules: `, submodules.map(a => a.submodule.name));
  }
}

/**
 * This function will update the idPriority according to the provided configuration
 */
function updateIdPriority(idPriorityConfig, submodules) {
  if (idPriorityConfig) {
    const result = {};
    const aliasToName = new Map(submodules.map(s => s.aliasName ? [s.aliasName, s.name] : []));
    Object.keys(idPriorityConfig).forEach(key => {
      const priority = isArray(idPriorityConfig[key]) ? [...idPriorityConfig[key]].reverse() : [];
      result[key] = priority.map(s => aliasToName.has(s) ? aliasToName.get(s) : s);
    });
    idPriority = result;
  } else {
    idPriority = {};
  }
  initializedSubmodules.refresh();
  updateEIDConfig(submodules);
}

export function requestDataDeletion(next, ...args) {
  logInfo('UserID: received data deletion request; deleting all stored IDs...');
  submodules.forEach(submodule => {
    if (typeof submodule.submodule.onDataDeletionRequest === 'function') {
      try {
        submodule.submodule.onDataDeletionRequest(submodule.config, submodule.idObj, ...args);
      } catch (e) {
        logError(`Error calling onDataDeletionRequest for ID submodule ${submodule.submodule.name}`, e);
      }
    }
    submodule.store.remove();
  });
  next.apply(this, args);
}

/**
 * enable submodule in User ID
 */
export function attachIdSystem(submodule: IdProviderSpec<UserIdProvider>) {
  submodule.findRootDomain = findRootDomain;
  if (!(submoduleRegistry || []).find(i => i.name === submodule.name)) {
    submoduleRegistry.push(submodule);
    GDPR_GVLIDS.register(MODULE_TYPE_UID, submodule.name, submodule.gvlid);
    GDPR_ACPIDS.register(MODULE_TYPE_UID, submodule.name, submodule.acpId);
    updateSubmodules();
    // TODO: a test case wants this to work even if called after init (the setConfig({userId}))
    // so we trigger a refresh. But is that even possible outside of tests?
    initIdSystem({ refresh: true, submoduleNames: [submodule.name] });
  }
}

function normalizePromise<T extends AnyFunction>(fn: T): Wraps<T> {
  // for public methods that return promises, make sure we return a "normal" one - to avoid
  // exposing confusing stack traces
  return function(...args) {
    return Promise.resolve(fn.apply(this, args));
  } as any;
}

declare module '../../src/prebidGlobal' {
  interface PrebidJS {
    getUserIds: typeof getUserIds;
    getUserIdsAsync: typeof getUserIdsAsync;
    getUserIdsAsEids: typeof getUserIdsAsEids;
    getEncryptedEidsForSource: typeof getEncryptedEidsForSource;
    registerSignalSources: typeof registerSignalSources;
    refreshUserIds: typeof refreshUserIds;
    getUserIdsAsEidBySource: typeof getUserIdsAsEidBySource;
  }
}

const enforceStorageTypeRule = (userIdsConfig, enforceStorageType) => {
  return (params) => {
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] !== MODULE_TYPE_UID || !params[ACTIVITY_PARAM_STORAGE_WRITE]) return;

    const matchesName = (query) => params[ACTIVITY_PARAM_COMPONENT_NAME]?.toLowerCase() === query?.toLowerCase();
    const submoduleConfig = userIdsConfig.find((configItem) => matchesName(configItem.name));

    if (!submoduleConfig || !submoduleConfig.storage) return;

    if (!getConfiguredStorageTypes(submoduleConfig).includes(params[ACTIVITY_PARAM_STORAGE_TYPE])) {
      const reason = `${submoduleConfig.name} attempts to store data in ${params[ACTIVITY_PARAM_STORAGE_TYPE]} while configuration allows ${submoduleConfig.storage.type}.`;
      if (enforceStorageType) {
        return { allow: false, reason };
      } else {
        logWarn(reason);
      }
    }
  };
};

/**
 * test browser support for storage config types (local storage or cookie), initializes submodules but consentManagement is required,
 * so a callback is added to fire after the consentManagement module.
 * @param {{getConfig:function}} config
 */
export function init(config, { mkDelay = delay } = {}) {
  ppidSource = undefined;
  submodules = [];
  configRegistry = [];
  initializedSubmodules = mkPriorityMaps();
  initIdSystem = idSystemInitializer({ mkDelay });
  allConsent.onChange(() => {
    initIdSystem({ refresh: true });
  });
  if (configListener != null) {
    configListener();
  }
  submoduleRegistry = [];
  let unregisterEnforceStorageTypeRule: () => void;

  // listen for config userSyncs to be set
  configListener = config.getConfig('userSync', conf => {
    // Note: support for 'usersync' was dropped as part of Prebid.js 4.0
    const userSync: UserSyncConfig = conf.userSync;
    if (userSync) {
      ppidSource = userSync.ppid;
      if (userSync.userIds) {
        const { autoRefresh = false, retainConfig = true, enforceStorageType } = userSync;
        configRegistry = userSync.userIds;
        syncDelay = isNumber(userSync.syncDelay) ? userSync.syncDelay : USERSYNC_DEFAULT_CONFIG.syncDelay;
        auctionDelay = isNumber(userSync.auctionDelay) ? userSync.auctionDelay : USERSYNC_DEFAULT_CONFIG.auctionDelay;
        updateSubmodules({ retainConfig });
        unregisterEnforceStorageTypeRule?.();
        unregisterEnforceStorageTypeRule = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'enforceStorageTypeRule', enforceStorageTypeRule(submodules.map(({ config }) => config), enforceStorageType));
        updateIdPriority(userSync.idPriority, submoduleRegistry);
        const submodulesToRefresh = submodules.filter(item => autoRefresh ? item.dirty : item.new);
        if (submodulesToRefresh.length) {
          initIdSystem({ refresh: true, forceNewModuleRefresh: false, submoduleNames: submodulesToRefresh.map(item => item.submodule.name) });
        }
        initIdSystem({ ready: true });
      }
    }
  });
  adapterManager.makeBidRequests.after(aliasEidsHook);
  beforeInitAuction.before(adUnitEidsHook);

  // exposing getUserIds function in global-name-space so that userIds stored in Prebid can be used by external codes.
  addApiMethod('getUserIds', getUserIds);
  addApiMethod('getUserIdsAsEids', getUserIdsAsEids);
  addApiMethod('getEncryptedEidsForSource', normalizePromise(getEncryptedEidsForSource));
  addApiMethod('registerSignalSources', registerSignalSources);
  addApiMethod('refreshUserIds', normalizePromise(refreshUserIds));
  addApiMethod('getUserIdsAsync', normalizePromise(getUserIdsAsync));
  addApiMethod('getUserIdsAsEidBySource', getUserIdsAsEidBySource);
}

export function resetUserIds() {
  config.setConfig({ userSync: {} });
  init(config);
}

// init config update listener to start the application
init(config);

module('userId', attachIdSystem, { postInstallAllowed: true });

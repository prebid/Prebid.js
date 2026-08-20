import { config } from '../../src/config.js';
import { getHook, module } from '../../src/hook.js';
import { logError, logInfo, logWarn, mergeDeep } from '../../src/utils.js';
import * as events from '../../src/events.js';
import { EVENTS, JSON_MAPPING } from '../../src/constants.js';
import adapterManager, { gdprDataHandler, gppDataHandler, uspDataHandler } from '../../src/adapterManager.js';
import { timedAuctionHook } from '../../src/utils/perfMetrics.js';
import { GDPR_GVLIDS } from '../../src/consentHandler.js';
import { MODULE_TYPE_RTD } from '../../src/activities/modules.js';
import { guardOrtb2Fragments } from '../../libraries/objectGuard/ortbGuard.js';
import { activityParamsBuilder } from '../../src/activities/params.js';
import type { StartAuctionOptions } from "../../src/prebid.ts";
import type { ProviderConfig, RTDProvider, RTDProviderConfig } from "./spec.ts";

// export so that consumers can `import {type RTDProviderConfig} from 'prebid.js/modules/rtdModule'`
export { type RTDProviderConfig } from './spec.ts';

const activityParams = activityParamsBuilder((al) => adapterManager.resolveAlias(al));

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const registeredSubModules = [];
/**
 * `init()` result, by registered submodule. Providers are initialized at most once - some of them do
 * not expect to be initialized again - so this keeps track of the ones that were already given a
 * chance to run, and of whether they accepted it.
 */
const initializedSubModules = new Map<any, boolean>();
export let subModules = [];
let _moduleConfig: RealTimeDataConfig;
let _dataProviders = [];
let _userConsent;

/**
 * Register a Real-Time Data (RTD) submodule.
 *
 * @param {Object} submodule The RTD submodule to register.
 * @param {string} submodule.name The name of the RTD submodule.
 * @param {number} [submodule.gvlid] The Global Vendor List ID (GVLID) of the RTD submodule.
 */
export function attachRealTimeDataProvider(submodule) {
  if (registeredSubModules.some((sm) => sm.name === submodule.name)) {
    logWarn(`RTD provider '${submodule.name}' is already registered, ignoring duplicate registration`);
    return;
  }
  registeredSubModules.push(submodule);
  GDPR_GVLIDS.register(MODULE_TYPE_RTD, submodule.name, submodule.gvlid);
  // providers may be loaded after the module was configured (and therefore already initialized);
  // pick them up now, since `realTimeData` configuration is accepted only once.
  initSubModules();
}

/**
 * Unregister a Real-Time Data (RTD) submodule, disabling it for subsequent auctions.
 *
 * FOR TESTS ONLY. Nothing in production unregisters a provider; this exists so that test suites can
 * undo their registrations. Keeping it a standalone export - rather than something handed out by
 * `attachRealTimeDataProvider` - means builds that never reference it can leave it out.
 *
 * @param {Object} submodule the submodule to unregister, as passed to `attachRealTimeDataProvider`.
 */
export function detachRealTimeDataProvider(submodule) {
  const idx = registeredSubModules.indexOf(submodule);
  if (idx >= 0) {
    registeredSubModules.splice(idx, 1);
    initializedSubModules.delete(submodule);
    initSubModules();
  }
}

/**
 * call each sub module event function by config order
 */
const setEventsListeners = (function () {
  let registered = false;
  return function setEventsListeners() {
    if (!registered) {
      Object.entries({
        [EVENTS.AUCTION_INIT]: ['onAuctionInitEvent'],
        [EVENTS.AUCTION_END]: ['onAuctionEndEvent', getAdUnitTargeting],
        [EVENTS.BID_RESPONSE]: ['onBidResponseEvent'],
        [EVENTS.BID_REQUESTED]: ['onBidRequestEvent'],
        [EVENTS.BID_ACCEPTED]: ['onBidAcceptedEvent'],
      }).forEach(([ev, [handler, preprocess]]) => {
        events.on(ev as any, (args) => {
          preprocess && (preprocess as any)(args);
          subModules.forEach(sm => {
            try {
              sm[handler as string] && sm[handler as string](args, sm.config, _userConsent);
            } catch (e) {
              logError(`RTD provider '${sm.name}': error in '${handler}':`, e);
            }
          });
        });
      });
      registered = true;
    }
  };
})();

type RealTimeDataConfig = {
  dataProviders: (RTDProviderConfig<keyof ProviderConfig> | RTDProviderConfig<RTDProvider>)[];
  /**
   * Maximum amount of time (in milliseconds) to delay auctions while waiting for RTD providers.
   */
  auctionDelay?: number;
};

declare module '../../src/config' {
  interface Config {
    [MODULE_NAME]?: RealTimeDataConfig;
  }
}

export function init(config) {
  const confListener = config.getConfig(MODULE_NAME, ({ realTimeData }) => {
    if (!realTimeData.dataProviders) {
      logError('missing parameters for real time module');
      return;
    }
    confListener(); // unsubscribe config listener
    _moduleConfig = realTimeData;
    _dataProviders = realTimeData.dataProviders;
    initializedSubModules.clear();
    setEventsListeners();
    getHook('startAuction').before(setBidRequestsData, 20); // RTD should run before FPD
    adapterManager.callDataDeletionRequest.before(onDataDeletionRequest);
    // the providers available at this point are logged as a list below, rather than one by one
    initSubModules(false);
    logInfo(`Real time data module enabled, using submodules: ${subModules.map((m) => m.name).join(', ')}`);
  });
}

function getConsentData() {
  return {
    gdpr: gdprDataHandler.getConsentData(),
    usp: uspDataHandler.getConsentData(),
    gpp: gppDataHandler.getConsentData(),
    coppa: !!(config.getConfig('coppa'))
  };
}

/**
 * call each sub module init function by config order
 * if no init function / init return failure / module not configured - remove it from submodules list
 *
 * this runs every time a provider is registered or unregistered; providers that were already
 * initialized keep their previous `init` result instead of running again.
 *
 * @param logNewlyEnabled log a message for each provider that is enabled by this pass. Providers can
 *        be registered at any time and independently from one another, so each one is reported as it
 *        becomes available.
 */
function initSubModules(logNewlyEnabled = true) {
  if (!_dataProviders.length) {
    subModules = [];
    return;
  }
  _userConsent = getConsentData();
  const subModulesByOrder = [];
  _dataProviders.forEach(provider => {
    const sm = ((registeredSubModules) || []).find(s => s.name === provider.name);
    if (!sm) {
      return;
    }
    if (!initializedSubModules.has(sm)) {
      const enabled = !!(sm.init && sm.init(provider, _userConsent));
      initializedSubModules.set(sm, enabled);
      if (enabled && logNewlyEnabled) {
        logInfo(`Real time data module: enabling submodule ${sm.name}`);
      }
    }
    if (initializedSubModules.get(sm)) {
      subModulesByOrder.push(Object.assign(sm, { config: provider }));
    }
  });
  subModules = subModulesByOrder;
}

/**
 * loop through configured data providers If the data provider has registered getBidRequestData,
 * call it, providing reqBidsConfigObj, consent data and module params
 * this allows submodules to modify bidders
 * @param {Object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.ts
 */
export const setBidRequestsData = timedAuctionHook('rtd', function setBidRequestsData(fn, reqBidsConfigObj: StartAuctionOptions) {
  _userConsent = getConsentData();

  const relevantSubModules = [];
  const prioritySubModules = [];
  subModules.forEach(sm => {
    if (typeof sm.getBidRequestData !== 'function') {
      return;
    }
    relevantSubModules.push(sm);
    const config = sm.config;
    if (config && config.waitForIt) {
      prioritySubModules.push(sm);
    }
  });

  const shouldDelayAuction = prioritySubModules.length && _moduleConfig?.auctionDelay > 0;
  let callbacksExpected = prioritySubModules.length;
  let isDone = false;
  let waitTimeout;

  if (!relevantSubModules.length) {
    return exitHook();
  }

  const timeout = shouldDelayAuction ? _moduleConfig.auctionDelay : 0;
  waitTimeout = setTimeout(exitHook, timeout);
  const fpdKey = 'ortb2Fragments';

  relevantSubModules.forEach(sm => {
    const fpdGuard = guardOrtb2Fragments(reqBidsConfigObj[fpdKey] ?? {}, activityParams(MODULE_TYPE_RTD, sm.name));
    // submodules need to be able to modify the request object, but we need
    // to protect the FPD portion of it. Use a proxy that passes through everything
    // except 'ortb2Fragments'.
    const request = new Proxy(reqBidsConfigObj, {
      get(target, prop, receiver) {
        if (prop === fpdKey) return fpdGuard;
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        if (prop === fpdKey) {
          mergeDeep(fpdGuard, value);
          return true;
        }
        return Reflect.set(target, prop, value, receiver);
      },
      deleteProperty(target, prop) {
        if (prop === fpdKey) return true;
        return Reflect.deleteProperty(target, prop);
      }
    });
    sm.getBidRequestData(request, onGetBidRequestDataCallback.bind(sm), sm.config, _userConsent, timeout);
  });

  function onGetBidRequestDataCallback() {
    if (isDone) {
      return;
    }
    if (this.config && this.config.waitForIt) {
      callbacksExpected--;
    }
    if (callbacksExpected === 0) {
      setTimeout(exitHook, 0);
    }
  }

  function exitHook() {
    if (isDone) {
      return;
    }
    isDone = true;
    clearTimeout(waitTimeout);
    fn.call(this, reqBidsConfigObj);
  }
});

/**
 * loop through configured data providers If the data provider has registered getTargetingData,
 * call it, providing ad unit codes, consent data and module params
 * the sub mlodle will return data to set on the ad unit
 * this function used to place key values on primary ad server per ad unit
 * @param {Object} auction object received on auction end event
 */
export function getAdUnitTargeting(auction) {
  const relevantSubModules = subModules.filter(sm => typeof sm.getTargetingData === 'function');
  if (!relevantSubModules.length) {
    return;
  }

  // get data
  const adUnitCodes = auction.adUnitCodes;
  if (!adUnitCodes) {
    return;
  }
  const targeting = [];
  for (let i = relevantSubModules.length - 1; i >= 0; i--) {
    const smTargeting = relevantSubModules[i].getTargetingData(adUnitCodes, relevantSubModules[i].config, _userConsent, auction);
    if (smTargeting && typeof smTargeting === 'object') {
      targeting.push(smTargeting);
    } else {
      logWarn('invalid getTargetingData response for sub module', relevantSubModules[i].name);
    }
  }
  // place data on auction adUnits
  const mergedTargeting = mergeDeep({}, ...targeting);
  auction.adUnits.forEach(adUnit => {
    const kv = adUnit.code && mergedTargeting[adUnit.code];
    if (!kv) {
      return;
    }
    logInfo('RTD set ad unit targeting of', kv, 'for', adUnit);
    adUnit[JSON_MAPPING.ADSERVER_TARGETING] = Object.assign(adUnit[JSON_MAPPING.ADSERVER_TARGETING] || {}, kv);
  });
  return auction.adUnits;
}

export function onDataDeletionRequest(next, ...args) {
  subModules.forEach((sm) => {
    if (typeof sm.onDataDeletionRequest === 'function') {
      try {
        sm.onDataDeletionRequest(sm.config);
      } catch (e) {
        logError(`Error executing ${sm.name}.onDataDeletionRequest`, e);
      }
    }
  });
  next.apply(this, args);
}

// `postInstallAllowed` lets provider bundles register through `submodule('realTimeData', ...)` after
// Prebid has booted; `attachRealTimeDataProvider` initializes them on the spot when that happens.
module('realTimeData', attachRealTimeDataProvider, { postInstallAllowed: true });
init(config);

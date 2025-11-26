import {config} from '../../src/config.js';
import {getHook, module} from '../../src/hook.js';
import {logError, logInfo, logWarn, mergeDeep} from '../../src/utils.js';
import * as events from '../../src/events.js';
import { EVENTS, JSON_MAPPING } from '../../src/constants.js';
import adapterManager, {gdprDataHandler, uspDataHandler, gppDataHandler} from '../../src/adapterManager.js';
import {timedAuctionHook} from '../../src/utils/perfMetrics.js';
import {GDPR_GVLIDS} from '../../src/consentHandler.js';
import {MODULE_TYPE_RTD} from '../../src/activities/modules.js';
import {guardOrtb2Fragments} from '../../libraries/objectGuard/ortbGuard.js';
import {activityParamsBuilder} from '../../src/activities/params.js';
import type {StartAuctionOptions} from "../../src/prebid.ts";
import type {ProviderConfig, RTDProvider, RTDProviderConfig} from "./spec.ts";

const activityParams = activityParamsBuilder((al) => adapterManager.resolveAlias(al));

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const registeredSubModules = [];
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
 * @returns {function(): void} A de-registration function that will unregister the module when called.
 */
export function attachRealTimeDataProvider(submodule) {
  registeredSubModules.push(submodule);
  GDPR_GVLIDS.register(MODULE_TYPE_RTD, submodule.name, submodule.gvlid)
  return function detach() {
    const idx = registeredSubModules.indexOf(submodule)
    if (idx >= 0) {
      registeredSubModules.splice(idx, 1);
      initSubModules();
    }
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
        [EVENTS.BID_ACCEPTED]: ['onBidAcceptedEvent']
      }).forEach(([ev, [handler, preprocess]]) => {
        events.on(ev as any, (args) => {
          preprocess && (preprocess as any)(args);
          subModules.forEach(sm => {
            try {
              sm[handler as string] && sm[handler as string](args, sm.config, _userConsent)
            } catch (e) {
              logError(`RTD provider '${sm.name}': error in '${handler}':`, e);
            }
          });
        })
      });
      registered = true;
    }
  }
})();

type RealTimeDataConfig = {
  dataProviders: (RTDProviderConfig<keyof ProviderConfig> | RTDProviderConfig<RTDProvider>)[];
  /**
   * Maximum amount of time (in milliseconds) to delay auctions while waiting for RTD providers.
   */
  auctionDelay?: number;
}

declare module '../../src/config' {
  interface Config {
    [MODULE_NAME]?: RealTimeDataConfig;
  }
}

export function init(config) {
  const confListener = config.getConfig(MODULE_NAME, ({realTimeData}) => {
    if (!realTimeData.dataProviders) {
      logError('missing parameters for real time module');
      return;
    }
    confListener(); // unsubscribe config listener
    _moduleConfig = realTimeData;
    _dataProviders = realTimeData.dataProviders;
    setEventsListeners();
    getHook('startAuction').before(setBidRequestsData, 20); // RTD should run before FPD
    adapterManager.callDataDeletionRequest.before(onDataDeletionRequest);
    initSubModules();
  });
}

function getConsentData() {
  return {
    gdpr: gdprDataHandler.getConsentData(),
    usp: uspDataHandler.getConsentData(),
    gpp: gppDataHandler.getConsentData(),
    coppa: !!(config.getConfig('coppa'))
  }
}

/**
 * call each sub module init function by config order
 * if no init function / init return failure / module not configured - remove it from submodules list
 */
function initSubModules() {
  _userConsent = getConsentData();
  const subModulesByOrder = [];
  _dataProviders.forEach(provider => {
    const sm = ((registeredSubModules) || []).find(s => s.name === provider.name);
    const initResponse = sm && sm.init && sm.init(provider, _userConsent);
    if (initResponse) {
      subModulesByOrder.push(Object.assign(sm, {config: provider}));
    }
  });
  subModules = subModulesByOrder;
  logInfo(`Real time data module enabled, using submodules: ${subModules.map((m) => m.name).join(', ')}`);
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

  relevantSubModules.forEach(sm => {
    const fpdGuard = guardOrtb2Fragments(reqBidsConfigObj.ortb2Fragments || {}, activityParams(MODULE_TYPE_RTD, sm.name));
    sm.getBidRequestData({...reqBidsConfigObj, ortb2Fragments: fpdGuard}, onGetBidRequestDataCallback.bind(sm), sm.config, _userConsent, timeout);
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
      return
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
        logError(`Error executing ${sm.name}.onDataDeletionRequest`, e)
      }
    }
  });
  next.apply(this, args);
}

module('realTimeData', attachRealTimeDataProvider);
init(config);

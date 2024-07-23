/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import {deepSetValue, isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {gdprDataHandler} from '../src/adapterManager.js';
import {registerOrtbProcessor, REQUEST} from '../src/pbjsORTB.js';
import {enrichFPD} from '../src/fpd/enrichment.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {cmpClient} from '../libraries/cmp/cmpClient.js';
import {consentManagementHook, lookupConsentData} from '../libraries/consentManagement/cmUtils.js';
import {GreedyPromise} from '../src/utils/promise.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const CMP_VERSION = 2;

export let userCMP;
export let consentTimeout;
export let gdprScope;
export let staticConsentData;
let dsaPlatform = false;
let actionTimeout;

export let consentDataLoaded;
let addedConsentHook = false;

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};

function lookupStaticConsentData() {
  return new GreedyPromise((resolve) => {
    gdprDataHandler.setConsentData(processCmpData(staticConsentData));
    resolve();
  });
}

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 */
function lookupIabConsent(setProvisionalConsent) {
  return new Promise((resolve, reject) => {
    function cmpResponseCallback(tcfData, success) {
      logInfo('Received a response from CMP', tcfData);
      if (success) {
        try {
          setProvisionalConsent(processCmpData(tcfData));
        } catch (e) {
        }

        if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
          try {
            gdprDataHandler.setConsentData(processCmpData(tcfData));
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      } else {
        reject(Error('CMP unable to register callback function.  Please check CMP setup.'))
      }
    }

    const cmp = cmpClient({
      apiName: '__tcfapi',
      apiVersion: CMP_VERSION,
      apiArgs: ['command', 'version', 'callback', 'parameter'],
    });

    if (!cmp) {
      reject(new Error('TCF2 CMP not found.'))
    }
    if (cmp.isDirect) {
      logInfo('Detected CMP API is directly accessible, calling it now...');
    } else {
      logInfo('Detected CMP is outside the current iframe where Prebid.js is located, calling it now...');
    }

    cmp({
      command: 'addEventListener',
      callback: cmpResponseCallback
    })
  })
}

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gdprConsent object which gets transferred to adapterManager's gdprDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export const requestBidsHook = consentManagementHook('gdpr', () => consentDataLoaded);

function processCmpData(consentObject) {
  function checkData() {
    // if CMP does not respond with a gdprApplies boolean, use defaultGdprScope (gdprScope)
    const gdprApplies = consentObject && typeof consentObject.gdprApplies === 'boolean' ? consentObject.gdprApplies : gdprScope;
    const tcString = consentObject && consentObject.tcString;
    return !!(
      (typeof gdprApplies !== 'boolean') ||
      (gdprApplies === true && (!tcString || !isStr(tcString)))
    );
  }

  if (checkData()) {
    throw Object.assign(new Error(`CMP returned unexpected value during lookup process.`), {args: [consentObject]})
  } else {
    return parseCmpConsent(consentObject);
  }
}

/**
 * Stores CMP data locally in module to make information available in adaptermanager.js for later in the auction
 * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function parseCmpConsent(cmpConsentObject) {
  const consentData = {
    consentString: (cmpConsentObject) ? cmpConsentObject.tcString : undefined,
    vendorData: (cmpConsentObject) || undefined,
    gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : gdprScope
  };
  if (cmpConsentObject && cmpConsentObject.addtlConsent && isStr(cmpConsentObject.addtlConsent)) {
    consentData.addtlConsent = cmpConsentObject.addtlConsent;
  }
  consentData.apiVersion = CMP_VERSION;
  return consentData;
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentDataLoaded = undefined;
  userCMP = undefined;
  consentTimeout = undefined;
  gdprDataHandler.reset();
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int))
 */
export function setConsentConfig(config) {
  // if `config.gdpr`, `config.usp` or `config.gpp` exist, assume new config format.
  // else for backward compatability, just use `config`
  config = config && (config.gdpr || config.usp || config.gpp ? config.gdpr : config);
  if (!config || typeof config !== 'object') {
    logWarn('consentManagement (gdpr) config not defined, exiting consent manager');
    return;
  }
  if (isStr(config.cmpApi)) {
    userCMP = config.cmpApi;
  } else {
    userCMP = DEFAULT_CMP;
    logInfo(`consentManagement config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`);
  }

  if (isNumber(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    logInfo(`consentManagement config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }

  actionTimeout = isNumber(config.actionTimeout) ? config.actionTimeout : null;

  // if true, then gdprApplies should be set to true
  gdprScope = config.defaultGdprScope === true;
  dsaPlatform = !!config.dsaPlatform;

  logInfo('consentManagement module has been activated...');

  if (userCMP === 'static') {
    if (isPlainObject(config.consentData)) {
      staticConsentData = config.consentData;
      if (staticConsentData?.getTCData != null) {
        // accept static config with or without `getTCData` - see https://github.com/prebid/Prebid.js/issues/9581
        staticConsentData = staticConsentData.getTCData;
      }
      consentTimeout = null;
    } else {
      logError(`consentManagement config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }
  if (!addedConsentHook) {
    getGlobal().requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
  consentDataLoaded = lookupConsentData({
    name: 'TCF',
    consentDataHandler: gdprDataHandler,
    cmpHandler: userCMP,
    cmpHandlerMap: cmpCallMap,
    cmpTimeout: consentTimeout,
    actionTimeout,
    getNullConsent: () => parseCmpConsent()
  })
  return consentDataLoaded.catch(() => null);
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));

export function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    const consent = gdprDataHandler.getConsentData();
    if (consent) {
      if (typeof consent.gdprApplies === 'boolean') {
        deepSetValue(ortb2, 'regs.ext.gdpr', consent.gdprApplies ? 1 : 0);
      }
      deepSetValue(ortb2, 'user.ext.consent', consent.consentString);
    }
    if (dsaPlatform) {
      deepSetValue(ortb2, 'regs.ext.dsa.dsarequired', 3);
    }
    return ortb2;
  }));
}

enrichFPD.before(enrichFPDHook);

export function setOrtbAdditionalConsent(ortbRequest, bidderRequest) {
  // this is not a standardized name for addtlConsent, so keep this as an ORTB library processor rather than an FPD enrichment
  const addtl = bidderRequest.gdprConsent?.addtlConsent;
  if (addtl && typeof addtl === 'string') {
    deepSetValue(ortbRequest, 'user.ext.ConsentedProvidersSettings.consented_providers', addtl);
  }
}

registerOrtbProcessor({type: REQUEST, name: 'gdprAddtlConsent', fn: setOrtbAdditionalConsent})

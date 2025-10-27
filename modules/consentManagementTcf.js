/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import {deepSetValue, isStr, logInfo} from '../src/utils.js';
import {config} from '../src/config.js';
import {gdprDataHandler} from '../src/adapterManager.js';
import {registerOrtbProcessor, REQUEST} from '../src/pbjsORTB.js';
import {enrichFPD} from '../src/fpd/enrichment.js';
import {cmpClient} from '../libraries/cmp/cmpClient.js';
import {configParser} from '../libraries/consentManagement/cmUtils.js';

export let consentConfig = {};
export let gdprScope;
let dsaPlatform;
const CMP_VERSION = 2;

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
};

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 */
function lookupIabConsent(setProvisionalConsent) {
  return new Promise((resolve, reject) => {
    function cmpResponseCallback(tcfData, success) {
      logInfo('Received a response from CMP', tcfData);
      if (success) {
        try {
          setProvisionalConsent(parseConsentData(tcfData));
        } catch (e) {
        }

        if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
          try {
            gdprDataHandler.setConsentData(parseConsentData(tcfData));
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

function parseConsentData(consentObject) {
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
    return toConsentData(consentObject);
  }
}

function toConsentData(cmpConsentObject) {
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
  consentConfig = {};
  gdprDataHandler.reset();
}

const parseConfig = configParser({
  namespace: 'gdpr',
  displayName: 'TCF',
  consentDataHandler: gdprDataHandler,
  cmpHandlers: cmpCallMap,
  parseConsentData,
  getNullConsent: () => toConsentData(null)
})
/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int))
 */
export function setConsentConfig(config) {
  // if `config.gdpr`, `config.usp` or `config.gpp` exist, assume new config format.
  // else for backward compatability, just use `config`
  config = config && (config.gdpr || config.usp || config.gpp ? config.gdpr : config);
  if (config?.consentData?.getTCData != null) {
    config.consentData = config.consentData.getTCData;
  }
  gdprScope = config?.defaultGdprScope === true;
  dsaPlatform = !!config?.dsaPlatform;
  consentConfig = parseConfig({gdpr: config});
  return consentConfig.loadConsentData?.()?.catch?.(() => null);
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

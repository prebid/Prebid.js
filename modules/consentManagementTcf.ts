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
import {createCmpEventManager, type CmpEventManager} from '../libraries/cmp/cmpEventUtils.js';
import {CONSENT_GDPR} from "../src/consentHandler.ts";
import type {CMConfig} from "../libraries/consentManagement/cmUtils.ts";

export let consentConfig: any = {};
export let gdprScope;
let dsaPlatform;
const CMP_VERSION = 2;

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
};

// CMP event manager instance for TCF
export let tcfCmpEventManager: CmpEventManager | null = null;

/**
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 * @see https://github.com/InteractiveAdvertisingBureau/iabtcf-es/tree/master/modules/core#iabtcfcore
 */
export type TCFConsentData = {
  apiVersion: typeof CMP_VERSION;
  /**
   * The consent string.
   */
  consentString: string;
  /**
   * True if GDPR is in scope.
   */
  gdprApplies: boolean;
  /**
   * The response from the CMP.
   */
  vendorData: Record<string, unknown>;
  /**
   * Additional consent string, if provided by the CMP.
   * @see https://support.google.com/admanager/answer/9681920?hl=en
   */
  addtlConsent?: `${number}~${string}~${string}`;
}

export interface TCFConfig {
  /**
   *  Defines what the gdprApplies flag should be when the CMP doesn’t respond in time or the static data doesn’t supply.
   *  Defaults to false.
   */
  defaultGdprScope?: boolean;
  /**
   * If true, indicates that the publisher is to be considered an “Online Platform” for the purposes of the Digital Services Act
   */
  dsaPlatform?: boolean;
}

type TCFCMConfig = TCFConfig & CMConfig<TCFConsentData>;

declare module '../src/consentHandler' {
  interface ConsentData {
    [CONSENT_GDPR]: TCFConsentData;
  }
  interface ConsentManagementConfig {
    [CONSENT_GDPR]?: TCFCMConfig;
  }
}

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 */
function lookupIabConsent(setProvisionalConsent) {
  return new Promise<void>((resolve, reject) => {
    function cmpResponseCallback(tcfData, success) {
      logInfo('Received a response from CMP', tcfData);
      if (success) {
        try {
          setProvisionalConsent(parseConsentData(tcfData));
        } catch (e) {
        }

        if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
          try {
            if (tcfData.listenerId !== null && tcfData.listenerId !== undefined) {
              tcfCmpEventManager?.setCmpListenerId(tcfData.listenerId);
            }
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
    if ((cmp as any).isDirect) {
      logInfo('Detected CMP API is directly accessible, calling it now...');
    } else {
      logInfo('Detected CMP is outside the current iframe where Prebid.js is located, calling it now...');
    }

    // Initialize CMP event manager and set CMP API
    if (!tcfCmpEventManager) {
      tcfCmpEventManager = createCmpEventManager('tcf', () => gdprDataHandler.getConsentData());
    }
    tcfCmpEventManager.setCmpApi(cmp);

    cmp({
      command: 'addEventListener',
      callback: cmpResponseCallback
    })
  })
}

function parseConsentData(consentObject): TCFConsentData {
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
  const consentData: TCFConsentData = {
    consentString: (cmpConsentObject) ? cmpConsentObject.tcString : undefined,
    vendorData: (cmpConsentObject) || undefined,
    gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : gdprScope,
    apiVersion: CMP_VERSION
  };
  if (cmpConsentObject && cmpConsentObject.addtlConsent && isStr(cmpConsentObject.addtlConsent)) {
    consentData.addtlConsent = cmpConsentObject.addtlConsent;
  }
  return consentData;
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentConfig = {};
  gdprDataHandler.reset();
}

export function removeCmpListener() {
  // Clean up CMP event listeners before resetting
  if (tcfCmpEventManager) {
    tcfCmpEventManager.removeCmpEventListener();
    tcfCmpEventManager = null;
  }
  resetConsentData();
}

const parseConfig = configParser({
  namespace: 'gdpr',
  displayName: 'TCF',
  consentDataHandler: gdprDataHandler,
  cmpHandlers: cmpCallMap,
  parseConsentData,
  getNullConsent: () => toConsentData(null),
  cmpEventCleanup: removeCmpListener
} as any)

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 */
export function setConsentConfig(config) {
  // if `config.gdpr`, `config.usp` or `config.gpp` exist, assume new config format.
  // else for backward compatability, just use `config`
  const tcfConfig: TCFCMConfig = config && (config.gdpr || config.usp || config.gpp ? config.gdpr : config);
  if ((tcfConfig?.consentData as any)?.getTCData != null) {
    tcfConfig.consentData = (tcfConfig.consentData as any).getTCData;
  }
  gdprScope = tcfConfig?.defaultGdprScope === true;
  dsaPlatform = !!tcfConfig?.dsaPlatform;
  consentConfig = parseConfig({gdpr: tcfConfig});
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

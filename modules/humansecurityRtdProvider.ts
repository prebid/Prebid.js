/**
 * This module adds humansecurity provider to the real time data module
 *
 * The {@link module:modules/realTimeData} module is required
 * The module will inject the HUMAN Security script into the context where Prebid.js is initialized, enriching bid requests with specific
 * data to provide advanced protection against ad fraud and spoofing.
 * @module modules/humansecurityRtdProvider
 * @requires module:modules/realTimeData
 */
import { submodule } from '../src/hook.js';
import { prefixLog, generateUUID, getWindowSelf } from '../src/utils.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getGlobal, PrebidJS } from '../src/prebidGlobal.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { AllConsentData } from '../src/consentHandler.ts';
import type { RTDProvider, RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { AuctionProperties } from '../src/auction.ts';

declare module './rtdModule/spec.ts' {
  interface ProviderConfig {
    humansecurity: {
      params?: {
        clientId?: string;
        verbose?: boolean;
        perBidderOptOut?: string[];
      };
    };
  }
}

interface HumanSecurityImpl {
  connect(
    pbjs: PrebidJS,
    callback: (m: string) => void | null,
    config: RTDProviderConfig<'humansecurity'>
  ): void;

  getBidRequestData(
    reqBidsConfigObj: StartAuctionOptions,
    callback: () => void,
    config: RTDProviderConfig<'humansecurity'>,
    userConsent: AllConsentData
  ): void;

  onAuctionInitEvent(
    pbjs: PrebidJS,
    auctionDetails: AuctionProperties,
    config: RTDProviderConfig<'humansecurity'>,
    userConsent: AllConsentData
  ): void;
}

const SUBMODULE_NAME = 'humansecurity' as const;
const SCRIPT_URL = 'https://sonar.script.ac/prebid/rtd.js';
const MODULE_VERSION = 1;

const { logWarn, logError } = prefixLog(`[${SUBMODULE_NAME}]:`);

let implRef: HumanSecurityImpl | null = null;
let clientId: string = '';
let verbose: boolean = false;
let sessionId: string = '';

/**
 * Injects HUMAN Security script on the page to facilitate pre-bid signal collection.
 */

const load = (config: RTDProviderConfig<'humansecurity'>) => {
  // Load implementation script and pass configuration parameters via data attributes
  clientId = config?.params?.clientId || '';
  if (clientId && (typeof clientId !== 'string' || !/^\w{3,16}$/.test(clientId))) {
    throw new Error(`The 'clientId' parameter must be a short alphanumeric string`);
  }

  // Load/reset the state
  verbose = !!config?.params?.verbose;
  implRef = null;
  sessionId = generateUUID();

  // Get the best domain possible here, it still might be null
  const refDomain = getRefererInfo().domain || '';

  // Once loaded, the implementation script will publish an API using
  // the session ID value it was given in data attributes
  const scriptAttrs = { 'data-sid': sessionId };
  const scriptUrl = `${SCRIPT_URL}?r=${refDomain}${clientId ? `&c=${clientId}` : ''}&mv=${MODULE_VERSION}`;

  loadExternalScript(scriptUrl, MODULE_TYPE_RTD, SUBMODULE_NAME, () => onImplLoaded(config), null, scriptAttrs);
}

/**
 * Retrieves the implementation object created by the loaded script
 * using the session ID as a key
 */

const getImpl = () => {
  // Use cached reference if already resolved
  if (implRef && typeof implRef === 'object' && typeof implRef.connect === 'function') return implRef;

  // Attempt to resolve from window by session ID
  const wnd = getWindowSelf();
  const impl: HumanSecurityImpl = wnd[`sonar_${sessionId}`];

  if (typeof impl !== 'object' || typeof impl.connect !== 'function') {
    verbose && logWarn('onload', 'Unable to access the implementation script');
    return;
  }
  implRef = impl;
  return impl;
}

/**
 * The callback to loadExternalScript
 * Establishes the bridge between this RTD submodule and the loaded implementation
 */

const onImplLoaded = (config: RTDProviderConfig<'humansecurity'>) => {
  const impl = getImpl();
  if (!impl) return;

  // And set up a bridge between the RTD submodule and the implementation.
  impl.connect(getGlobal(), null, config);
}

/**
 * The bridge function will be called by the implementation script
 * to update the token information or report errors
 */

/**
 * https://docs.prebid.org/dev-docs/add-rtd-submodule.html#getbidrequestdata
 */

const getBidRequestData = (
  reqBidsConfigObj: StartAuctionOptions,
  callback: () => void,
  config: RtdProviderSpec<'humansecurity'>,
  userConsent: AllConsentData
) => {
  const impl = getImpl();
  if (!impl || typeof impl.getBidRequestData !== 'function') {
    // Implementation not available; continue auction by invoking the callback.
    callback();
    return;
  }

  impl.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
}

/**
 * Event hooks
 * https://docs.prebid.org/dev-docs/add-rtd-submodule.html#using-event-listeners
 */

const onAuctionInitEvent = (auctionDetails: AuctionProperties, config: RTDProviderConfig<'humansecurity'>, userConsent: AllConsentData) => {
  const impl = getImpl();
  if (!impl || typeof impl.onAuctionInitEvent !== 'function') return;
  impl.onAuctionInitEvent(getGlobal(), auctionDetails, config, userConsent);
}

/**
 * Submodule registration
 */

type RtdProviderSpecWithHooks<P extends RTDProvider> = RtdProviderSpec<P> & {
  onAuctionInitEvent?: (auctionDetails: AuctionProperties, config: RTDProviderConfig<P>, userConsent: AllConsentData) => void;
};

const subModule: RtdProviderSpecWithHooks<'humansecurity'> = ({
  name: SUBMODULE_NAME,
  init: (config, _userConsent) => {
    try {
      load(config);
      return true;
    } catch (err) {
      const message = (err && typeof err === 'object' && 'message' in err)
        ? (err as any).message
        : String(err);
      logError('init', message);
      return false;
    }
  },
  getBidRequestData,
  onAuctionInitEvent,
});

const registerSubModule = () => { submodule('realTimeData', subModule); }
registerSubModule();

/**
 * Exporting local (and otherwise encapsulated to this module) functions
 * for testing purposes
 */

export const __TEST__ = {
  SUBMODULE_NAME,
  SCRIPT_URL,
  main: registerSubModule,
  load,
  onImplLoaded,
  getBidRequestData
};

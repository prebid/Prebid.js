import { logError } from '../../src/utils.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from '../../src/adapterManager.js';
import { submodule } from '../../src/hook.js';
import { DEFAULT_AJAX_TIMEOUT, MODULE_NAME, parseRequestedAttributes, composeIdObject, eids, DEFAULT_DELAY, GVLID } from './liveIntentIdSystemShared.js'

// reference to the client for the liQHub
let cachedClientRef

/**
 * This function is used in tests
 */
export function resetSubmodule() {
  cachedClientRef = undefined
}

window.liQHub = window.liQHub ?? []

function initializeClient(configParams) {
  // only initialize once
  if (cachedClientRef != null) return cachedClientRef

  const clientRef = {}

  const clientDetails = { name: 'prebid', version: '$prebid.version$' }

  const collectConfig = configParams.liCollectConfig ?? {};

  let integration
  if (collectConfig.appId != null) {
    integration = { type: 'application', appId: collectConfig.appId, publisherId: configParams.publisherId }
  } else if (configParams.distributorId != null) {
    integration = { type: 'distributor', distributorId: configParams.distributorId }
  } else {
    integration = { type: 'custom', publisherId: configParams.publisherId, distributorId: configParams.distributorId }
  }

  const partnerCookies = new Set(configParams.identifiersToResolve ?? []);

  const collectSettings = { timeout: collectConfig.ajaxTimeout ?? DEFAULT_AJAX_TIMEOUT }

  let identityPartner
  if (configParams.appId == null && configParams.distributorId != null) {
    identityPartner = configParams.distributorId
  } else if (configParams.partner != null) {
    identityPartner = configParams.partner
  } else {
    identityPartner = 'prebid'
  }

  const resolveSettings = {
    identityPartner,
    timeout: configParams.ajaxTimeout ?? DEFAULT_AJAX_TIMEOUT
  }

  function loadConsent() {
    const consent = {}
    const usPrivacyString = uspDataHandler.getConsentData();
    if (usPrivacyString != null) {
      consent.usPrivacy = { consentString: usPrivacyString }
    }
    const gdprConsent = gdprDataHandler.getConsentData()
    if (gdprConsent != null) {
      consent.gdpr = gdprConsent
    }
    const gppConsent = gppDataHandler.getConsentData();
    if (gppConsent != null) {
      consent.gpp = { consentString: gppConsent.gppString, applicableSections: gppConsent.applicableSections }
    }

    return consent
  }
  const consent = loadConsent()

  window.liQHub.push({
    type: 'register_client',
    clientRef,
    clientDetails,
    integration,
    consent,
    partnerCookies,
    collectSettings,
    resolveSettings
  })

  // fire default collect request
  if (configParams.emailHash != null) {
    window.liQHub.push({ type: 'collect', clientRef, sourceEvent: { hash: configParams.emailHash } })
  } else {
    window.liQHub.push({ type: 'schedule_default_collect', clientRef, delay: configParams.fireEventDelay ?? DEFAULT_DELAY })
  }

  cachedClientRef = clientRef
  return clientRef
}

/**
 * Create requestedAttributes array to pass to liveconnect
 * @function
 * @param {Object} overrides - object with boolean values that will override defaults { 'foo': true, 'bar': false }
 * @returns {Array}
 */

function resolve(configParams, clientRef, callback) {
  function onFailure(error) {
    logError(`${MODULE_NAME}: ID fetch encountered an error: `, error);
    callback();
  }

  const onSuccess = [{ type: 'callback', callback }]

  window.liQHub.push({
    type: 'resolve',
    clientRef,
    requestedAttributes: parseRequestedAttributes(configParams.requestedAttributesOverrides),
    onFailure,
    onSuccess
  })
}

/**
 * @typedef {import('../../modules/userId/index.js').Submodule} Submodule
 */

/** @type {Submodule} */
export const liveIntentIdHubSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   */
  decode(value, config) {
    const configParams = config?.params ?? {};

    // ensure client is initialized and we fired at least one collect request
    initializeClient(configParams)

    return composeIdObject(value);
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   */
  getId(config) {
    const configParams = config?.params ?? {};

    const clientRef = initializeClient(configParams)

    return { callback: function(cb) { resolve(configParams, clientRef, cb); } };
  },
  eids: {
    eids
  }
};

submodule('userId', liveIntentIdHubSubmodule);

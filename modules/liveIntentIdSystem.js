/**
 * This module adds LiveIntentId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/liveIntentIdSystem
 * @requires module:modules/userId
 */
import { triggerPixel, logError } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { LiveConnect } from 'live-connect-js/prebid'; // eslint-disable-line prebid/validate-imports
import { gdprDataHandler, uspDataHandler, gppDataHandler, coppaDataHandler } from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { UID2_EIDS } from '../libraries/uid2Eids/uid2Eids.js';
import {UID1_EIDS} from '../libraries/uid1Eids/uid1Eids.js';
import { getRefererInfo } from '../src/refererDetection.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const DEFAULT_AJAX_TIMEOUT = 5000;
const EVENTS_TOPIC = 'pre_lips';
const MODULE_NAME = 'liveIntentId';
const LI_PROVIDER_DOMAIN = 'liveintent.com';
export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});
const defaultRequestedAttributes = {'nonId': true};
const calls = {
  ajaxGet: (url, onSuccess, onError, timeout) => {
    ajaxBuilder(timeout)(
      url,
      {
        success: onSuccess,
        error: onError
      },
      undefined,
      {
        method: 'GET',
        withCredentials: true
      }
    )
  },
  pixelGet: (url, onload) => triggerPixel(url, onload)
}

let eventFired = false;
let liveConnect = null;

/**
 * This function is used in tests
 */
export function reset() {
  if (window && window.liQ_instances) {
    window.liQ_instances.forEach(i => i.eventBus.off(EVENTS_TOPIC, setEventFiredFlag));
    window.liQ_instances = [];
  }
  liveIntentIdSubmodule.setModuleMode(null);
  eventFired = false;
  liveConnect = null;
}

/**
 * This function is also used in tests
 */
export function setEventFiredFlag() {
  eventFired = true;
}

function parseLiveIntentCollectorConfig(collectConfig) {
  const config = {};
  collectConfig = collectConfig || {};
  collectConfig.appId && (config.appId = collectConfig.appId);
  collectConfig.fpiStorageStrategy && (config.storageStrategy = collectConfig.fpiStorageStrategy);
  collectConfig.fpiExpirationDays && (config.expirationDays = collectConfig.fpiExpirationDays);
  collectConfig.collectorUrl && (config.collectorUrl = collectConfig.collectorUrl);
  config.ajaxTimeout = collectConfig.ajaxTimeout || DEFAULT_AJAX_TIMEOUT;
  return config;
}

/**
 * Create requestedAttributes array to pass to liveconnect
 * @function
 * @param {Object} overrides - object with boolean values that will override defaults { 'foo': true, 'bar': false }
 * @returns {Array}
 */
function parseRequestedAttributes(overrides) {
  function renameAttribute(attribute) {
    if (attribute === 'fpid') {
      return 'idCookie';
    } else {
      return attribute;
    };
  }
  function createParameterArray(config) {
    return Object.entries(config).flatMap(([k, v]) => (typeof v === 'boolean' && v) ? [renameAttribute(k)] : []);
  }
  if (typeof overrides === 'object') {
    return createParameterArray({...defaultRequestedAttributes, ...overrides});
  } else {
    return createParameterArray(defaultRequestedAttributes);
  }
}

function initializeLiveConnect(configParams) {
  if (liveConnect) {
    return liveConnect;
  }

  configParams = configParams || {};
  const fpidConfig = configParams.fpid || {};

  const publisherId = configParams.publisherId || 'any';
  const identityResolutionConfig = {
    publisherId: publisherId,
    requestedAttributes: parseRequestedAttributes(configParams.requestedAttributesOverrides)
  };
  if (configParams.url) {
    identityResolutionConfig.url = configParams.url;
  };

  identityResolutionConfig.ajaxTimeout = configParams.ajaxTimeout || DEFAULT_AJAX_TIMEOUT;

  const liveConnectConfig = parseLiveIntentCollectorConfig(configParams.liCollectConfig);

  if (!liveConnectConfig.appId && configParams.distributorId) {
    liveConnectConfig.distributorId = configParams.distributorId;
    identityResolutionConfig.source = configParams.distributorId;
  } else {
    identityResolutionConfig.source = configParams.partner || 'prebid';
  }

  liveConnectConfig.wrapperName = 'prebid';
  liveConnectConfig.trackerVersion = '$prebid.version$';
  liveConnectConfig.identityResolutionConfig = identityResolutionConfig;
  liveConnectConfig.identifiersToResolve = configParams.identifiersToResolve || [];
  liveConnectConfig.fireEventDelay = configParams.fireEventDelay;

  liveConnectConfig.idCookie = {};
  liveConnectConfig.idCookie.name = fpidConfig.name;
  liveConnectConfig.idCookie.strategy = fpidConfig.strategy == 'html5' ? 'localStorage' : fpidConfig.strategy;

  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString) {
    liveConnectConfig.usPrivacyString = usPrivacyString;
  }
  const gdprConsent = gdprDataHandler.getConsentData();
  if (gdprConsent) {
    liveConnectConfig.gdprApplies = gdprConsent.gdprApplies;
    liveConnectConfig.gdprConsent = gdprConsent.consentString;
  }
  const gppConsent = gppDataHandler.getConsentData();
  if (gppConsent) {
    liveConnectConfig.gppString = gppConsent.gppString;
    liveConnectConfig.gppApplicableSections = gppConsent.applicableSections;
  }
  // The second param is the storage object, LS & Cookie manipulation uses PBJS
  // The third param is the ajax and pixel object, the ajax and pixel use PBJS
  liveConnect = liveIntentIdSubmodule.getInitializer()(liveConnectConfig, storage, calls);
  if (configParams.emailHash) {
    liveConnect.push({ hash: configParams.emailHash });
  }
  return liveConnect;
}

function tryFireEvent() {
  if (!eventFired && liveConnect) {
    const eventDelay = liveConnect.config.fireEventDelay || 500;
    setTimeout(() => {
      const instances = window.liQ_instances;
      instances.forEach(i => i.eventBus.once(EVENTS_TOPIC, setEventFiredFlag));
      if (!eventFired && liveConnect) {
        liveConnect.fire();
      }
    }, eventDelay);
  }
}

/** @type {Submodule} */
export const liveIntentIdSubmodule = {
  moduleMode: '$$LIVE_INTENT_MODULE_MODE$$',
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  setModuleMode(mode) {
    this.moduleMode = mode;
  },
  getInitializer() {
    return (liveConnectConfig, storage, calls) => LiveConnect(liveConnectConfig, storage, calls, this.moduleMode);
  },

  /**
   * decode the stored id value for passing to bid requests. Note that lipb object is a wrapper for everything, and
   * internally it could contain more data other than `lipbid`(e.g. `segments`) depending on the `partner` and
   * `publisherId` params.
   * @function
   * @param {{unifiedId:string}} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {{lipb:Object}}
   */
  decode(value, config) {
    const configParams = (config && config.params) || {};
    function composeIdObject(value) {
      const result = {};

      // old versions stored lipbid in unifiedId. Ensure that we can still read the data.
      const lipbid = value.nonId || value.unifiedId;
      if (lipbid) {
        const lipb = { ...value, lipbid };
        delete lipb.unifiedId;
        result.lipb = lipb;
      }

      // Lift usage of uid2 by exposing uid2 if we were asked to resolve it.
      // As adapters are applied in lexicographical order, we will always
      // be overwritten by the 'proper' uid2 module if it is present.
      if (value.uid2) {
        result.uid2 = { 'id': value.uid2, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.bidswitch) {
        result.bidswitch = { 'id': value.bidswitch, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.medianet) {
        result.medianet = { 'id': value.medianet, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.magnite) {
        result.magnite = { 'id': value.magnite, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.index) {
        result.index = { 'id': value.index, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.openx) {
        result.openx = { 'id': value.openx, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.pubmatic) {
        result.pubmatic = { 'id': value.pubmatic, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.sovrn) {
        result.sovrn = { 'id': value.sovrn, ext: { provider: LI_PROVIDER_DOMAIN } };
      }

      if (value.idCookie) {
        if (!coppaDataHandler.getCoppa()) {
          result.lipb = { ...result.lipb, fpid: value.idCookie };
          result.fpid = { 'id': value.idCookie };
        }
        delete result.lipb.idCookie;
      }

      if (value.thetradedesk) {
        result.lipb = {...result.lipb, tdid: value.thetradedesk}
        result.tdid = { 'id': value.thetradedesk, ext: { rtiPartner: 'TDID', provider: getRefererInfo().domain || LI_PROVIDER_DOMAIN } }
        delete result.lipb.thetradedesk
      }

      return result
    }

    if (!liveConnect) {
      initializeLiveConnect(configParams);
    }
    tryFireEvent();

    return composeIdObject(value);
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    const liveConnect = initializeLiveConnect(configParams);
    if (!liveConnect) {
      return;
    }
    tryFireEvent();
    const result = function(callback) {
      liveConnect.resolve(
        response => {
          callback(response);
        },
        error => {
          logError(`${MODULE_NAME}: ID fetch encountered an error: `, error);
          callback();
        }
      )
    }

    return { callback: result };
  },
  eids: {
    ...UID1_EIDS,
    ...UID2_EIDS,
    'lipb': {
      getValue: function(data) {
        return data.lipbid;
      },
      source: 'liveintent.com',
      atype: 3,
      getEidExt: function(data) {
        if (Array.isArray(data.segments) && data.segments.length) {
          return {
            segments: data.segments
          };
        }
      }
    },
    'bidswitch': {
      source: 'bidswitch.net',
      atype: 3,
      getValue: function(data) {
        return data.id;
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'medianet': {
      source: 'media.net',
      atype: 3,
      getValue: function(data) {
        return data.id;
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'magnite': {
      source: 'rubiconproject.com',
      atype: 3,
      getValue: function(data) {
        return data.id;
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'index': {
      source: 'liveintent.indexexchange.com',
      atype: 3,
      getValue: function(data) {
        return data.id;
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'openx': {
      source: 'openx.net',
      atype: 3,
      getValue: function(data) {
        return data.id;
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'pubmatic': {
      source: 'pubmatic.com',
      atype: 3,
      getValue: function(data) {
        return data.id;
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'sovrn': {
      source: 'liveintent.sovrn.com',
      atype: 3,
      getValue: function(data) {
        return data.id;
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'fpid': {
      source: 'fpid.liveintent.com',
      atype: 1,
      getValue: function(data) {
        return data.id;
      }
    }
  }
};

submodule('userId', liveIntentIdSubmodule);

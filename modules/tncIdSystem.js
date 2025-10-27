/**
 * This module adds TncId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/tncIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { parseUrl, buildUrl, logInfo, logMessage, logError } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'tncId';
const TNC_API_URL = 'https://js.tncid.app/remote.js';
const TNC_DEFAULT_NS = '__tnc';
const TNC_PREBID_NS = '__tncPbjs';
const TNC_PREBIDJS_PROVIDER_ID = 'c8549079-f149-4529-a34b-3fa91ef257d1';
const TNC_LOCAL_VALUE_KEY = 'tncid';
let moduleConfig = null;

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

function fixURL(config, ns) {
  config.params = (config && config.params) ? config.params : {};
  config.params.url = config.params.url || TNC_API_URL;
  const url = parseUrl(config.params.url);
  url.search = url.search || {};
  const providerId = config.params.publisherId || config.params.providerId || url.search.publisherId || url.search.providerId || TNC_PREBIDJS_PROVIDER_ID;
  delete url.search.publisherId;
  url.search.providerId = providerId;
  url.search.ns = ns;
  return url;
}

const loadRemoteScript = function(url) {
  return new Promise((resolve, reject) => {
    const endpoint = buildUrl(url);
    logMessage('TNC Endpoint', endpoint);
    loadExternalScript(endpoint, MODULE_TYPE_UID, MODULE_NAME, resolve);
  });
}

function TNCObject(ns) {
  let tnc = window[ns];
  tnc = typeof tnc !== 'undefined' && tnc !== null && typeof tnc.ready === 'function' ? tnc : {
    ready: function(f) { this.ready.q = this.ready.q || []; return typeof f === 'function' ? (this.ready.q.push(f), this) : new Promise(resolve => this.ready.q.push(resolve)); },
  };
  window[ns] = tnc;
  return tnc;
}

function getlocalValue(key) {
  let value;
  if (storage.hasLocalStorage()) {
    value = storage.getDataFromLocalStorage(key);
  }
  if (!value) {
    value = storage.getCookie(key);
  }

  if (typeof value === 'string') {
    // if it's a json object parse it and return the tncid value, otherwise assume the value is the id
    if (value.charAt(0) === '{') {
      try {
        const obj = JSON.parse(value);
        if (obj) {
          return obj.tncid;
        }
      } catch (e) {
        logError(e);
      }
    } else {
      return value;
    }
  }
  return null;
}

const tncCallback = async function(cb) {
  try {
    let tncNS = TNC_DEFAULT_NS;
    let tncid = getlocalValue(TNC_LOCAL_VALUE_KEY);

    if (!window[tncNS] || typeof window[tncNS].ready !== 'function') {
      tncNS = TNC_PREBID_NS; // Register a new namespace for TNC global object
      const url = fixURL(moduleConfig, tncNS);
      if (!url) return cb();
      TNCObject(tncNS); // create minimal TNC object
      await loadRemoteScript(url); // load remote script
    }
    if (!tncid) {
      await new Promise(resolve => window[tncNS].ready(resolve));
      tncid = await window[tncNS].getTNCID('prebid'); // working directly with (possibly) overridden TNC Object
      logMessage('tncId Module - tncid retrieved from remote script', tncid);
    } else {
      logMessage('tncId Module - tncid already exists', tncid);
      window[tncNS].ready(() => window[tncNS].getTNCID('prebid'));
    }
    return cb(tncid);
  } catch (err) {
    logMessage('tncId Module', err);
    return cb();
  }
}

export const tncidSubModule = {
  name: MODULE_NAME,
  decode(id) {
    return {
      tncid: id
    };
  },
  gvlid: 750,
  /**
   * performs action to obtain id
   * Use a tncid cookie first if it is present, otherwise callout to get a new id
   * @function
   * @param {SubmoduleConfig} [config] Config object with params and storage properties
   * @param {ConsentData} [consentData] GDPR consent
   * @returns {IdResponse}
   */
  getId(config, consentData) {
    const gdpr = (consentData?.gdpr?.gdprApplies === true) ? 1 : 0;
    const consentString = gdpr ? consentData.gdpr.consentString : '';

    if (gdpr && !consentString) {
      logInfo('Consent string is required for TNCID module');
      return;
    }

    moduleConfig = config;

    return {
      callback: function (cb) { return tncCallback(cb); }
      // callback: tncCallback
    }
  },
  eids: {
    'tncid': {
      source: 'thenewco.it',
      atype: 3
    },
  }
}

submodule('userId', tncidSubModule)

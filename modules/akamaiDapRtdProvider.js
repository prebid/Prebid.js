/**
 * This module adds the Akamai DAP RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from DAP
 * @module modules/akamaiDapRtdProvider
 * @requires module:modules/realTimeData
 */
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isPlainObject, mergeDeep, logMessage, logInfo, logError} from '../src/utils.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'dap';

export const SEGMENTS_STORAGE_KEY = 'akamaiDapSegments';
export const storage = getStorageManager(null, SUBMODULE_NAME);

/**
 * Lazy merge objects.
 * @param {String} target
 * @param {String} source
 */
function mergeLazy(target, source) {
  if (!isPlainObject(target)) {
    target = {};
  }
  if (!isPlainObject(source)) {
    source = {};
  }
  return mergeDeep(target, source);
}

/**
 * Add real-time data & merge segments.
 * @param {Object} bidConfig
 * @param {Object} rtd
 * @param {Object} rtdConfig
 */
export function addRealTimeData(rtd) {
  logInfo('DEBUG(addRealTimeData) - ENTER');
  if (isPlainObject(rtd.ortb2)) {
    let ortb2 = config.getConfig('ortb2') || {};
    logMessage('DEBUG(addRealTimeData): merging original: ', ortb2);
    logMessage('DEBUG(addRealTimeData): merging in: ', rtd.ortb2);
    config.setConfig({ortb2: mergeLazy(ortb2, rtd.ortb2)});
  }
  logInfo('DEBUG(addRealTimeData) - EXIT');
}

/**
 * Real-time data retrieval from Audigent
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} rtdConfi
 * @param {Object} userConsent
 */
export function getRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
  logInfo('DEBUG(getRealTimeData) - ENTER');
  logMessage('  - apiHostname: ' + rtdConfig.params.apiHostname);
  logMessage('  - apiVersion:  ' + rtdConfig.params.apiVersion);
  let jsonData = storage.getDataFromLocalStorage(SEGMENTS_STORAGE_KEY);
  if (jsonData) {
    let data = JSON.parse(jsonData);
    if (data.rtd) {
      addRealTimeData(data.rtd);
      onDone();
      logInfo('DEBUG(getRealTimeData) - 1');
      // Don't return - ensure the data is always fresh.
    }
  }

  if (rtdConfig && isPlainObject(rtdConfig.params)) {
    let config = {
      api_hostname: rtdConfig.params.apiHostname,
      api_version: rtdConfig.params.apiVersion,
      domain: rtdConfig.params.domain,
      segtax: rtdConfig.params.segtax
    };
    let identity = {
      type: rtdConfig.params.identityType
    };
    let token = dapUtils.dapGetToken(config, identity, rtdConfig.params.tokenTtl);
    if (token !== null) {
      let membership = dapUtils.dapGetMembership(config, token);
      let udSegment = dapUtils.dapMembershipToRtbSegment(membership, config);
      logMessage('DEBUG(getRealTimeData) - token: ' + token + ', user.data.segment: ', udSegment);
      let data = {
        rtd: {
          ortb2: {
            user: {
              data: [
                udSegment
              ]
            },
            site: {
              ext: {
                data: {
                  dapSAID: membership.said
                }
              }
            }
          }
        }
      };
      storage.setDataInLocalStorage(SEGMENTS_STORAGE_KEY, JSON.stringify(data));
      onDone();
    }
  }
}

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
 */
function init(provider, userConsent) {
  return true;
}

/** @type {RtdSubmodule} */
export const akamaiDapRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getRealTimeData,
  init: init
};

submodule(MODULE_NAME, akamaiDapRtdSubmodule);

export const dapUtils = {

  dapGetToken: function(config, identity, ttl) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let storageName = 'async_dap_token';
    let token = null;

    if (ttl == 0) {
      localStorage.removeItem(storageName);
    }

    let item = JSON.parse(localStorage.getItem(storageName));
    if (item == null) {
      item = {
        expires_at: now - 1,
        token: null
      };
    } else {
      token = item.token;
    }

    if (now > item.expires_at) {
      dapUtils.dapLog('Token missing or expired, fetching a new one...');
      // Trigger a refresh
      let configAsync = {...config};
      dapUtils.dapTokenize(configAsync, identity,
        function(token, status, xhr) {
          item.expires_at = now + ttl;
          item.token = token;
          localStorage.setItem(storageName, JSON.stringify(item));
          dapUtils.dapLog('Successfully updated and stored token; expires in ' + ttl + ' seconds');
          let deviceId100 = xhr.getResponseHeader('Akamai-DAP-100');
          if (deviceId100 != null) {
            localStorage.setItem('dap_deviceId100', deviceId100);
            dapUtils.dapLog('Successfully stored DAP 100 Device ID: ' + deviceId100);
          }
        },
        function(xhr, status, error) {
          logError('ERROR(' + error + '): failed to retrieve token! ' + status);
        }
      );
    }

    return token;
  },

  dapGetMembership: function(config, token) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let storageName = 'async_dap_membership';
    let maxTtl = 3600; // if the cached membership is older than this, return null
    let membership = null;
    let item = JSON.parse(localStorage.getItem(storageName));
    if (item == null || (now - item.expires_at) > maxTtl) {
      item = {
        expires_at: now - 1,
        said: null,
        cohorts: null,
        attributes: null
      };
    } else {
      membership = {
        said: item.said,
        cohorts: item.cohorts,
        attributes: null
      };
    }

    // Always refresh the cached membership.
    let configAsync = {...config};
    dapUtils.dapMembership(configAsync, token,
      function(membership, status, xhr) {
        item.expires_at = now + maxTtl;
        item.said = membership.said;
        item.cohorts = membership.cohorts;
        localStorage.setItem(storageName, JSON.stringify(item));
        dapUtils.dapLog('Successfully updated and stored membership:');
        dapUtils.dapLog(item);
      },
      function(xhr, status, error) {
        logError('ERROR(' + error + '): failed to retrieve membership! ' + status);
      }
    );

    return membership;
  },

  /**
   * DESCRIPTION
   *
   *  Convert a DAP membership response to an OpenRTB2 segment object suitable
   *  for insertion into user.data.segment or site.data.segment.
   */
  dapMembershipToRtbSegment: function(membership, config) {
    let segment = {
      name: 'dap.akamai.com',
      ext: {
        'segtax': config.segtax
      },
      segment: []
    };
    if (membership != null) {
      for (const i of membership.cohorts) {
        segment.segment.push({ id: i });
      }
    }
    return segment;
  },

  dapLog: function(args) {
    let css = '';
    css += 'display: inline-block;';
    css += 'color: #fff;';
    css += 'background: #F28B20;';
    css += 'padding: 1px 4px;';
    css += 'border-radius: 3px';

    logInfo('%cDAP Client', css, args);
  },

  /*******************************************************************************
   *
   * V2 (And Beyond) API
   *
   ******************************************************************************/

  /**
   * SYNOPSIS
   *
   *  dapTokenize( config, identity );
   *
   * DESCRIPTION
   *
   *  Tokenize an identity into a secure, privacy safe pseudonymiziation.
   *
   * PARAMETERS
   *
   *  config: an array of system configuration parameters
   *
   *  identity: an array of identity parameters passed to the tokenizing system
   *
   * EXAMPLE
   *
   *  config = {
   *      api_hostname:   "prebid.dap.akadns.net", // required
   *      domain:         "prebid.org",            // required
   *      api_version:    "x1",             // optional, default "x1"
   *      };
   *
   *  token = null;
   *  identity_email = {
   *      type:           "email",
   *      identity:       "obiwan@jedi.com"
   *      attributes:     { cohorts: [ "100:1641013200", "101:1641013200", "102":3:1641013200" ] },
   *      };
   *  dap_x1_tokenize( config, identity_email,
   *      function( response, status, xhr ) { token = response; },
   *      function( xhr, status, error ) { ; } // handle error
   *
   *  token = null;
   *  identity_signature = { type: "signature:1.0.0" };
   *  dap_x1_tokenize( config, identity_signature,
   *      function( response, status, xhr } { token = response; },
   *      function( xhr, status, error ) { ; } // handle error
   */
  dapTokenize: function(config, identity, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError');
      return;
    }

    if (typeof (config.domain) != 'string') {
      onError(null, 'Invalid config.domain: must be a string', 'ClientError');
      return;
    }

    if (config.domain.length <= 0) {
      onError(null, 'Invalid config.domain: must have non-zero length', 'ClientError');
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError');
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError');
      return;
    }

    if (identity == null || typeof (identity) == typeof (undefined)) {
      onError(null, 'Invalid identity object', 'ClientError');
      return;
    }

    if (!('type' in identity) || typeof (identity.type) != 'string' || identity.type.length <= 0) {
      onError(null, "Identity must contain a valid 'type' field", 'ClientError');
      return;
    }

    let apiParams = {
      'type': identity.type,
    };

    if (typeof (identity.identity) != typeof (undefined)) {
      apiParams.identity = identity.identity;
    }
    if (typeof (identity.attributes) != typeof (undefined)) {
      apiParams.attributes = identity.attributes;
    }

    let method;
    let body;
    let path;
    switch (config.api_version) {
      case 'x1':
      case 'x1-dev':
        method = 'POST';
        path = '/data-activation/' + config.api_version + '/domain/' + config.domain + '/identity/tokenize';
        body = JSON.stringify(apiParams);
        break;
      default:
        onError(null, 'Invalid api_version: ' + config.api_version, 'ClientError');
        return;
    }

    let url = 'https://' + config.api_hostname + path;
    let cb = {
      success: (response, request) => {
        let token = null;
        switch (config.api_version) {
          case 'x1':
          case 'x1-dev':
            token = request.getResponseHeader('Akamai-DAP-Token');
            break;
        }
        onSuccess(token, request.status, request);
      },
      error: (request, error) => {
        onError(request, request.statusText, error);
      }
    };

    ajax(url, cb, body, {
      method: method,
      customHeaders: {
        'Content-Type': 'application/json',
        'Pragma': 'akamai-x-cache-on'
      }
    });
  },

  /**
   * SYNOPSIS
   *
   *  dapMembership( config, token, onSuccess, onError );
   *
   * DESCRIPTION
   *
   *  Return the audience segment membership along with a new Secure Advertising
   *  ID for this token.
   *
   * PARAMETERS
   *
   *  config: an array of system configuration parameters
   *
   *  token: the token previously returned from the tokenize API
   *
   * EXAMPLE
   *
   *  config = {
   *      api_hostname: 'api.dap.akadns.net',
   *      };
   *
   *  // token from dap_x1_tokenize
   *
   *  dapMembership( config, token,
   *      function( membership, status, xhr ) {
   *          // Run auction with membership.segments and membership.said
   *      },
   *      function( xhr, status, error ) {
   *          // error
   *      } );
   *
   */
  dapMembership: function(config, token, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError');
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError');
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError');
      return;
    }

    if (token == null || typeof (token) != 'string') {
      onError(null, 'Invalid token: must be a non-null string', 'ClientError');
      return;
    }
    let path = '/data-activation/' +
               config.api_version +
               '/token/' + token +
               '/membership';

    let url = 'https://' + config.api_hostname + path;

    let cb = {
      success: (response, request) => {
        onSuccess(JSON.parse(response), request.status, request);
      },
      error: (error, request) => {
        onError(request, request.status, error);
      }
    };

    ajax(url, cb, undefined, {
      method: 'GET',
      customHeaders: {}
    });
  }
}

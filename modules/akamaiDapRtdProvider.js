/**
 * This module adds the Akamai DAP RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from DAP
 * @module modules/akamaiDapRtdProvider
 * @requires module:modules/realTimeData
 */
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isPlainObject, mergeDeep, logMessage, logInfo, logError} from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'dap';
const MODULE_CODE = 'akamaidap';

export const DAP_TOKEN = 'async_dap_token';
export const DAP_MEMBERSHIP = 'async_dap_membership';
export const DAP_ENCRYPTED_MEMBERSHIP = 'encrypted_dap_membership';
export const DAP_SS_ID = 'dap_ss_id';
export const DAP_DEFAULT_TOKEN_TTL = 3600; // in seconds
export const DAP_MAX_RETRY_TOKENIZE = 1;
export const DAP_CLIENT_ENTROPY = 'dap_client_entropy'

export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME});
let dapRetryTokenize = 0;

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
 * @param {Object} ortb2 destination object to merge RTD into
 * @param {Object} rtd
 */
export function addRealTimeData(ortb2, rtd) {
  logInfo('DEBUG(addRealTimeData) - ENTER');
  if (isPlainObject(rtd.ortb2)) {
    logMessage('DEBUG(addRealTimeData): merging original: ', ortb2);
    logMessage('DEBUG(addRealTimeData): merging in: ', rtd.ortb2);
    mergeLazy(ortb2, rtd.ortb2);
  }
  logInfo('DEBUG(addRealTimeData) - EXIT');
}

/**
 * Real-time data retrieval from Audigent
 * @param {Object} bidConfig
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
export function getRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
  let entropyDict = JSON.parse(storage.getDataFromLocalStorage(DAP_CLIENT_ENTROPY));
  let loadScriptPromise = new Promise((resolve, reject) => {
    if (rtdConfig && rtdConfig.params && rtdConfig.params.dapEntropyTimeout && Number.isInteger(rtdConfig.params.dapEntropyTimeout)) {
      setTimeout(reject, rtdConfig.params.dapEntropyTimeout, Error('DapEntropy script could not be loaded'));
    }
    if (entropyDict && entropyDict.expires_at > Math.round(Date.now() / 1000.0)) {
      logMessage('Using cached entropy');
      resolve();
    } else {
      if (typeof window.dapCalculateEntropy === 'function') {
        window.dapCalculateEntropy(resolve, reject);
      } else {
        if (rtdConfig && rtdConfig.params && dapUtils.isValidHttpsUrl(rtdConfig.params.dapEntropyUrl)) {
          loadExternalScript(rtdConfig.params.dapEntropyUrl, MODULE_CODE, () => { dapUtils.dapGetEntropy(resolve, reject) });
        } else {
          reject(Error('Please check if dapEntropyUrl is specified and is valid under config.params'));
        }
      }
    }
  });
  loadScriptPromise
    .catch((error) => {
      logError('Entropy could not be calculated due to: ', error.message);
    })
    .finally(() => {
      generateRealTimeData(bidConfig, onDone, rtdConfig, userConsent);
    });
}

export function generateRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
  logInfo('DEBUG(generateRealTimeData) - ENTER');
  logMessage('  - apiHostname: ' + rtdConfig.params.apiHostname);
  logMessage('  - apiVersion:  ' + rtdConfig.params.apiVersion);
  dapRetryTokenize = 0;
  var jsonData = null;
  if (rtdConfig && isPlainObject(rtdConfig.params)) {
    if (rtdConfig.params.segtax == 504) {
      let encMembership = dapUtils.dapGetEncryptedMembershipFromLocalStorage();
      if (encMembership) {
        jsonData = dapUtils.dapGetEncryptedRtdObj(encMembership, rtdConfig.params.segtax)
      }
    } else {
      let membership = dapUtils.dapGetMembershipFromLocalStorage();
      if (membership) {
        jsonData = dapUtils.dapGetRtdObj(membership, rtdConfig.params.segtax)
      }
    }
  }
  if (jsonData) {
    if (jsonData.rtd) {
      addRealTimeData(bidConfig.ortb2Fragments?.global, jsonData.rtd);
      onDone();
      logInfo('DEBUG(generateRealTimeData) - 1');
      // Don't return - ensure the data is always fresh.
    }
  }
  // Calling setTimeout to release the main thread so that the bid request could be sent.
  setTimeout(dapUtils.callDapAPIs, 0, bidConfig, onDone, rtdConfig, userConsent);
}

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
 */
function init(provider, userConsent) {
  if (dapUtils.checkConsent(userConsent) === false) {
    return false;
  }
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

  callDapAPIs: function(bidConfig, onDone, rtdConfig, userConsent) {
    if (rtdConfig && isPlainObject(rtdConfig.params)) {
      let config = {
        api_hostname: rtdConfig.params.apiHostname,
        api_version: rtdConfig.params.apiVersion,
        domain: rtdConfig.params.domain,
        segtax: rtdConfig.params.segtax,
        identity: {type: rtdConfig.params.identityType}
      };
      let refreshMembership = true;
      let token = dapUtils.dapGetTokenFromLocalStorage();
      const ortb2 = bidConfig.ortb2Fragments.global;
      logMessage('token is: ', token);
      if (token !== null) { // If token is not null then check the membership in storage and add the RTD object
        if (config.segtax == 504) { // Follow the encrypted membership path
          dapUtils.dapRefreshEncryptedMembership(ortb2, config, token, onDone) // Get the encrypted membership from server
          refreshMembership = false;
        } else {
          dapUtils.dapRefreshMembership(ortb2, config, token, onDone) // Get the membership from server
          refreshMembership = false;
        }
      }
      dapUtils.dapRefreshToken(ortb2, config, refreshMembership, onDone) // Refresh Token and membership in all the cases
    }
  },
  dapGetEntropy: function(resolve, reject) {
    if (typeof window.dapCalculateEntropy === 'function') {
      window.dapCalculateEntropy(resolve, reject);
    } else {
      reject(Error('window.dapCalculateEntropy function is not defined'))
    }
  },

  dapGetTokenFromLocalStorage: function(ttl) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let token = null;
    let item = JSON.parse(storage.getDataFromLocalStorage(DAP_TOKEN));
    if (item) {
      if (now < item.expires_at) {
        token = item.token;
      }
    }
    return token;
  },

  dapRefreshToken: function(ortb2, config, refreshMembership, onDone) {
    dapUtils.dapLog('Token missing or expired, fetching a new one...');
    // Trigger a refresh
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let item = {}
    let configAsync = {...config};
    dapUtils.dapTokenize(configAsync, config.identity, onDone,
      function(token, status, xhr, onDone) {
        item.expires_at = now + DAP_DEFAULT_TOKEN_TTL;
        let exp = dapUtils.dapExtractExpiryFromToken(token);
        if (typeof exp == 'number') {
          item.expires_at = exp - 10;
        }
        item.token = token;
        storage.setDataInLocalStorage(DAP_TOKEN, JSON.stringify(item));
        dapUtils.dapLog('Successfully updated and stored token; expires at ' + item.expires_at);
        let dapSSID = xhr.getResponseHeader('Akamai-DAP-SS-ID');
        if (dapSSID) {
          storage.setDataInLocalStorage(DAP_SS_ID, JSON.stringify(dapSSID));
        }
        let deviceId100 = xhr.getResponseHeader('Akamai-DAP-100');
        if (deviceId100 != null) {
          storage.setDataInLocalStorage('dap_deviceId100', deviceId100);
          dapUtils.dapLog('Successfully stored DAP 100 Device ID: ' + deviceId100);
        }
        if (refreshMembership) {
          if (config.segtax == 504) {
            dapUtils.dapRefreshEncryptedMembership(ortb2, config, token, onDone);
          } else {
            dapUtils.dapRefreshMembership(ortb2, config, token, onDone);
          }
        }
      },
      function(xhr, status, error, onDone) {
        logError('ERROR(' + error + '): failed to retrieve token! ' + status);
        onDone()
      }
    );
  },

  dapGetMembershipFromLocalStorage: function() {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let membership = null;
    let item = JSON.parse(storage.getDataFromLocalStorage(DAP_MEMBERSHIP));
    if (item) {
      if (now < item.expires_at) {
        membership = {
          said: item.said,
          cohorts: item.cohorts,
          attributes: null
        };
      }
    }
    return membership;
  },

  dapRefreshMembership: function(ortb2, config, token, onDone) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let item = {}
    let configAsync = {...config};
    dapUtils.dapMembership(configAsync, token, onDone,
      function(membership, status, xhr, onDone) {
        item.expires_at = now + DAP_DEFAULT_TOKEN_TTL;
        let exp = dapUtils.dapExtractExpiryFromToken(membership.said)
        if (typeof exp == 'number') {
          item.expires_at = exp - 10;
        }
        item.said = membership.said;
        item.cohorts = membership.cohorts;
        storage.setDataInLocalStorage(DAP_MEMBERSHIP, JSON.stringify(item));
        dapUtils.dapLog('Successfully updated and stored membership:');
        dapUtils.dapLog(item);

        let data = dapUtils.dapGetRtdObj(item, config.segtax)
        dapUtils.checkAndAddRealtimeData(ortb2, data, config.segtax);
        onDone();
      },
      function(xhr, status, error, onDone) {
        logError('ERROR(' + error + '): failed to retrieve membership! ' + status);
        if (status == 403 && dapRetryTokenize < DAP_MAX_RETRY_TOKENIZE) {
          dapRetryTokenize++;
          dapUtils.dapRefreshToken(ortb2, config, true, onDone);
        } else {
          onDone();
        }
      }
    );
  },

  dapGetEncryptedMembershipFromLocalStorage: function() {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let encMembership = null;
    let item = JSON.parse(storage.getDataFromLocalStorage(DAP_ENCRYPTED_MEMBERSHIP));
    if (item) {
      if (now < item.expires_at) {
        encMembership = {
          encryptedSegments: item.encryptedSegments
        };
      }
    }
    return encMembership;
  },

  dapRefreshEncryptedMembership: function(ortb2, config, token, onDone) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let item = {};
    let configAsync = {...config};
    dapUtils.dapEncryptedMembership(configAsync, token, onDone,
      function(encToken, status, xhr, onDone) {
        item.expires_at = now + DAP_DEFAULT_TOKEN_TTL;
        let exp = dapUtils.dapExtractExpiryFromToken(encToken);
        if (typeof exp == 'number') {
          item.expires_at = exp - 10;
        }
        item.encryptedSegments = encToken;
        storage.setDataInLocalStorage(DAP_ENCRYPTED_MEMBERSHIP, JSON.stringify(item));
        dapUtils.dapLog('Successfully updated and stored encrypted membership:');
        dapUtils.dapLog(item);

        let encData = dapUtils.dapGetEncryptedRtdObj(item, config.segtax);
        dapUtils.checkAndAddRealtimeData(ortb2, encData, config.segtax);
        onDone();
      },
      function(xhr, status, error, onDone) {
        logError('ERROR(' + error + '): failed to retrieve encrypted membership! ' + status);
        if (status == 403 && dapRetryTokenize < DAP_MAX_RETRY_TOKENIZE) {
          dapRetryTokenize++;
          dapUtils.dapRefreshToken(ortb2, config, true, onDone);
        } else {
          onDone();
        }
      }
    );
  },

  /**
   * DESCRIPTION
   * Extract expiry value from a token
   */
  dapExtractExpiryFromToken: function(token) {
    let exp = null;
    if (token) {
      const tokenArray = token.split('..');
      if (tokenArray && tokenArray.length > 0) {
        let decode = atob(tokenArray[0])
        let header = JSON.parse(decode.replace(/&quot;/g, '"'));
        exp = header.exp;
      }
    }
    return exp
  },

  /**
   * DESCRIPTION
   *
   *  Convert a DAP membership response to an OpenRTB2 segment object suitable
   *  for insertion into user.data.segment or site.data.segment and add it to the rtd obj.
   */
  dapGetRtdObj: function(membership, segtax) {
    let segment = {
      name: 'dap.akamai.com',
      ext: {
        'segtax': segtax
      },
      segment: []
    };
    if (membership != null) {
      for (const i of membership.cohorts) {
        segment.segment.push({ id: i });
      }
    }
    let data = {
      rtd: {
        ortb2: {
          user: {
            data: [
              segment
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
    return data;
  },

  /**
   * DESCRIPTION
   *
   *  Convert a DAP membership response to an OpenRTB2 segment object suitable
   *  for insertion into user.data.segment or site.data.segment and add it to the rtd obj.
   */
  dapGetEncryptedRtdObj: function(encToken, segtax) {
    let segment = {
      name: 'dap.akamai.com',
      ext: {
        'segtax': segtax
      },
      segment: []
    };
    if (encToken != null) {
      segment.segment.push({ id: encToken.encryptedSegments });
    }
    let encData = {
      rtd: {
        ortb2: {
          user: {
            data: [
              segment
            ]
          }
        }
      }
    };
    return encData;
  },

  checkAndAddRealtimeData: function(ortb2, data, segtax) {
    if (data.rtd) {
      if (segtax == 504 && dapUtils.checkIfSegmentsAlreadyExist(ortb2, data.rtd, 504)) {
        logMessage('DEBUG(handleInit): rtb Object already added');
      } else {
        addRealTimeData(ortb2, data.rtd);
      }
      logInfo('DEBUG(checkAndAddRealtimeData) - 1');
    }
  },

  checkIfSegmentsAlreadyExist: function(ortb2, rtd, segtax) {
    let segmentsExist = false
    if (ortb2.user && ortb2.user.data && ortb2.user.data.length > 0) {
      for (let i = 0; i < ortb2.user.data.length; i++) {
        let element = ortb2.user.data[i]
        if (element.ext && element.ext.segtax == segtax) {
          segmentsExist = true
          logMessage('DEBUG(checkIfSegmentsAlreadyExist): rtb Object already added: ', ortb2.user.data);
          break;
        }
      }
    }
    return segmentsExist
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

  isValidHttpsUrl: function(urlString) {
    let url;
    try {
      url = new URL(urlString);
    } catch (_) {
      return false;
    }
    return url.protocol === 'https:';
  },

  checkConsent: function(userConsent) {
    let consent = true;

    if (userConsent && userConsent.gdpr && userConsent.gdpr.gdprApplies) {
      const gdpr = userConsent.gdpr;
      const hasGdpr = (gdpr && typeof gdpr.gdprApplies === 'boolean' && gdpr.gdprApplies) ? 1 : 0;
      const gdprConsentString = hasGdpr ? gdpr.consentString : '';
      if (hasGdpr && (!gdprConsentString || gdprConsentString === '')) {
        logError('akamaiDapRtd submodule requires consent string to call API');
        consent = false;
      }
    } else if (userConsent && userConsent.usp) {
      const usp = userConsent.usp;
      consent = usp[1] !== 'N' && usp[2] !== 'Y';
    }

    return consent;
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
  dapTokenize: function(config, identity, onDone, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error, onDone) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError', onDone);
      return;
    }

    if (typeof (config.domain) != 'string') {
      onError(null, 'Invalid config.domain: must be a string', 'ClientError', onDone);
      return;
    }

    if (config.domain.length <= 0) {
      onError(null, 'Invalid config.domain: must have non-zero length', 'ClientError', onDone);
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError', onDone);
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError', onDone);
      return;
    }

    if (identity == null || typeof (identity) == typeof (undefined)) {
      onError(null, 'Invalid identity object', 'ClientError', onDone);
      return;
    }

    if (!('type' in identity) || typeof (identity.type) != 'string' || identity.type.length <= 0) {
      onError(null, "Identity must contain a valid 'type' field", 'ClientError', onDone);
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

    let entropyDict = JSON.parse(storage.getDataFromLocalStorage(DAP_CLIENT_ENTROPY));
    if (entropyDict && entropyDict.entropy) {
      apiParams.entropy = entropyDict.entropy;
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
        onError(null, 'Invalid api_version: ' + config.api_version, 'ClientError', onDone);
        return;
    }

    let customHeaders = {'Content-Type': 'application/json'};
    let dapSSID = JSON.parse(storage.getDataFromLocalStorage(DAP_SS_ID));
    if (dapSSID) {
      customHeaders['Akamai-DAP-SS-ID'] = dapSSID;
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
        onSuccess(token, request.status, request, onDone);
      },
      error: (request, error) => {
        onError(request, request.statusText, error, onDone);
      }
    };

    ajax(url, cb, body, {
      method: method,
      customHeaders: customHeaders
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
   *  // token from dap_tokenize
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
  dapMembership: function(config, token, onDone, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error, onDone) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError', onDone);
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError', onDone);
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError', onDone);
      return;
    }

    if (token == null || typeof (token) != 'string') {
      onError(null, 'Invalid token: must be a non-null string', 'ClientError', onDone);
      return;
    }
    let path = '/data-activation/' +
      config.api_version +
      '/token/' + token +
      '/membership';

    let url = 'https://' + config.api_hostname + path;

    let cb = {
      success: (response, request) => {
        onSuccess(JSON.parse(response), request.status, request, onDone);
      },
      error: (error, request) => {
        onError(request, request.status, error, onDone);
      }
    };

    ajax(url, cb, undefined, {
      method: 'GET',
      customHeaders: {}
    });
  },

  /**
   * SYNOPSIS
   *
   *  dapEncryptedMembership( config, token, onSuccess, onError );
   *
   * DESCRIPTION
   *
   *  Return the audience segment membership along with a new Secure Advertising
   *  ID for this token in encrypted format.
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
   *  // token from dap_tokenize
   *
   *  dapEncryptedMembership( config, token,
   *      function( membership, status, xhr ) {
   *          // Run auction with membership.segments and membership.said after decryption
   *      },
   *      function( xhr, status, error ) {
   *          // error
   *      } );
   *
   */
  dapEncryptedMembership: function(config, token, onDone, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error, onDone) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError', onDone);
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError', onDone);
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError', onDone);
      return;
    }

    if (token == null || typeof (token) != 'string') {
      onError(null, 'Invalid token: must be a non-null string', 'ClientError', onDone);
      return;
    }
    let path = '/data-activation/' +
      config.api_version +
      '/token/' + token +
      '/membership/encrypt';

    let url = 'https://' + config.api_hostname + path;

    let cb = {
      success: (response, request) => {
        let encToken = request.getResponseHeader('Akamai-DAP-Token');
        onSuccess(encToken, request.status, request, onDone);
      },
      error: (error, request) => {
        onError(request, request.status, error, onDone);
      }
    };
    ajax(url, cb, undefined, {
      method: 'GET',
      customHeaders: {
        'Content-Type': 'application/json',
        'Pragma': 'akamai-x-get-extracted-values'
      }
    });
  }
}

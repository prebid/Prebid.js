/**
 * DigiTrust Universal Id Submodule.
 * If the full DigiTrust Id library is included the standard functions
 * will be invoked to obtain the user's DigiTrust Id.
 * When the full library is not included this will fall back to the
 * DigiTrust Identity API and generate a mock DigiTrust object.
 */
'use strict';

import { config } from 'src/config';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { getGlobal } from 'src/prebidGlobal';

/**
 * Checks to see if the DigiTrust framework is initialized.
 * @function
 */
function isInitialized() {
  if (window.DigiTrust == null) {
    return false;
  }
  return DigiTrust.isClient; // this is set to true after init
}

let retries = 0;
let retryId = 0;
var isMock = false;
var noop = function () {
};

const MAX_RETRIES = 4;
const DT_ID_SVC = 'https://cdn-cf.digitru.st/id/v1';

var isFunc = function (fn) {
  return typeof (fn) === 'function';
}

function callApi(options) {
  ajax(
    DT_ID_SVC,
    {
      success: options.success,
      error: options.fail
    },
    null,
    {
      method: 'GET'
    }
  );
}

/**
 * Encode the Id per DigiTrust lib
 * @param {any} id
 */
function encId(id) {
  try {
    if (typeof (id) !== 'string') {
      id = JSON.stringify(id);
    }
    return encodeURIComponent(btoa(id));
  } catch (ex) {
    return id;
  }
}

/**
 * Writes the Identity into the expected DigiTrust cookie
 * @param {any} id
 */
function writeDigiId(id) {
  var key = 'DigiTrust.v1.identity';
  var date = new Date();
  date.setTime(date.getTime() + 604800000);
  var exp = 'expires=' + date.toUTCString();
  document.cookie = key + '=' + encId(id) + '; ' + exp + '; path=/;';
}

/**
 * Set up a mock DigiTrust object
 *
 */
function initMockDigitrust() {
  isMock = true;
  var _savedId = null; // closure variable for storing Id to avoid additional requests
  var mock = {
    isClient: true,
    isMock: true,
    getUser: function (obj, callback) {
      var cb = callback || noop;
      if (_savedId != null) {
        cb(_savedId);
        return;
      }

      var opts = {
        success: function (respText, result) {
          var idResult = {
            success: true
          }
          try {
            writeDigiId(respText);
            idResult.identity = JSON.parse(respText);
            _savedId = idResult;
          } catch (ex) {
            idResult.success = false;
          }
          cb(idResult);
        },
        fail: function (statusErr, result) {
          utils.logError('DigiTrustId API error: ' + statusErr);
        }
      }

      callApi(opts);
    }
  }

  if (window) {
    window.DigiTrust = mock;
  }
}

/*
 * Internal implementation to get the Id and trigger callback
 */
function getDigiTrustId(data, consentData, syncDelay, callback) {
  if (!isInitialized()) {
    if (retries >= MAX_RETRIES) {
      utils.logInfo('DigiTrust framework timeout. Fallback to API and mock.');
      initMockDigitrust();
    } else {
      // use expanding envelope
      if (retryId != 0) {
        clearTimeout(retryId);
      }

      retryId = setTimeout(function () {
        getDigiTrustId(data, consentData, syncDelay, callback);
      }, 100 * (1 + retries++));
      return;
    }
  }

  var executeIdRequest = function (data, callback) {
    DigiTrust.getUser({ member: 'prebid' }, function (idResult) {
      var exp = (data && data.storage && data.storage.expires) || 60;
      var rslt = {
        data: null,
        expires: exp
      };
      if (idResult && idResult.success && idResult.identity) {
        if (isMock) {
          // plug in the mock ID
        }

        if (isFunc(callback)) {
          rslt.data = idResult.identity;
          callback(rslt);
        }
      } else {
        // failed
        if (isFunc(callback)) {
          rslt.err = 'Failure getting id';
          callback(rslt);
        }
      }
    });
  }

  executeIdRequest(data, callback);
}

function initializeDigiTrust(config) {
  var dt = window.DigiTrust;
  if (dt && !dt.isClient && config != null) {
    dt.initialize(config.init, config.callback);
  } else if (dt == null) {
    // Assume we are already on a delay and DigiTrust is not on page
    initMockDigitrust();
  }
}

var testHook = {};

/**
 * Exposes the test hook object by attaching to the digitrustIdModule.
 * This method is called in the unit tests to surface internals.
 */
function surfaceTestHook() {
  digitrustIdModule['_testHook'] = testHook;
}

// the Id system module
export const digitrustIdModule =
{
  name: 'digitrust',
  decode: function (idData) {
    try {
      return { 'digitrustid': idData };
    } catch (e) {
      utils.logError('DigiTrust ID submodule decode error');
    }
  },
  getId: getDigiTrustId,
  init: initializeDigiTrust,
  _testInit: surfaceTestHook
}

/**
 * Expose the loader module in the global for later retrieval
 */
function exposeLoader() {
  let pbjs = getGlobal();
  if (!pbjs) {
    utils.logError('DigiTrustLoader failed to find Prebid global');
    return;
  }

  config.setConfig({ digitrustId: true });

  if (pbjs.idsys == null) {
    pbjs.idsys = {};
  }
  pbjs.idsys[digitrustIdModule.name] = digitrustIdModule;
}

testHook.exposeLoader = exposeLoader;
testHook.initMockDigitrust = initMockDigitrust;

// Flag the config to indicate DigiTrust loader is present to the Id system.
exposeLoader();

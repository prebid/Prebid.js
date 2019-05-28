/**
 * This module adds DigiTrust ID support to the User ID module
 * The {@link module:modules/userId} module is required
 * If the full DigiTrust Id library is included the standard functions
 * will be invoked to obtain the user's DigiTrust Id.
 * When the full library is not included this will fall back to the
 * DigiTrust Identity API and generate a mock DigiTrust object.
 * @module modules/digiTrustIdSystem
 * @requires module:modules/userId
 */

// import { config } from 'src/config';
import * as utils from '../src/utils'
import { ajax } from 'src/ajax';
import { attachIdSystem } from '../modules/userId';
// import { getGlobal } from 'src/prebidGlobal';

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

var noop = function () {
};

const MAX_RETRIES = 4;
const DT_ID_SVC = 'https://prebid.digitru.st/id/v1';

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
 * Set up a DigiTrust fascade object to mimic the API
 *
 */
function initDigitrustFascade() {
  var _savedId = null; // closure variable for storing Id to avoid additional requests
  var fascade = {
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
    window.DigiTrust = fascade;
  }
}

/**
 * Encapsulation of needed info for the callback return.
 *
 * @param {any} opts
 */
var ResultWrapper = function (opts) {
  var me = this;
  this.idObj = null;

  var idSystemFn = null;

  /**
   * Callback method that is passed back to the userId module.
   *
   * @param {function} callback
   */
  this.userIdCallback = function (callback) {
    idSystemFn = callback;
    if (me.idObj != null && isFunc(callback)) {
      callback(wrapIdResult());
    }
  }

  /**
   * Return a wrapped result formatted for userId system
   */
  function wrapIdResult() {
    if (me.idObj == null) {
      return null;
    }

    var cp = me.configParams;
    var exp = (cp && cp.storage && cp.storage.expires) || 60;

    var rslt = {
      data: null,
      expires: exp
    };
    if (me.idObj && me.idObj.success && me.idObj.identity) {
      rslt.data = me.idObj.identity;
    } else {
      rslt.err = 'Failure getting id';
    }

    return rslt;
  }

  this.retries = 0;
  this.retryId = 0;

  this.executeIdRequest = function (configParams) {
    DigiTrust.getUser({ member: 'prebid' }, function (idResult) {
      me.idObj = idResult;
      var cb = function () {
        if (isFunc(idSystemFn)) {
          idSystemFn(wrapIdResult());
        }
      }

      cb();
      if (configParams && configParams.callback && isFunc(configParams.callback)) {
        try {
          configParams.callback(idResult);
        } catch (ex) {
          utils.logError('Failure in DigiTrust executeIdRequest', ex);
        }
      }
    });
  }
}

// An instance of the result wrapper object.
var resultHandler = new ResultWrapper();

/*
 * Internal implementation to get the Id and trigger callback
 */
function getDigiTrustId(configParams) {
  if (resultHandler.configParams == null) {
    resultHandler.configParams = configParams;
  }

  if (!isInitialized()) {
    if (resultHandler.retries >= MAX_RETRIES) {
      utils.logInfo('DigiTrust framework timeout. Fallback to API and mock.');
      initDigitrustFascade();
    } else {
      // use expanding envelope
      if (resultHandler.retryId != 0) {
        clearTimeout(resultHandler.retryId);
      }

      resultHandler.retryId = setTimeout(function () {
        getDigiTrustId(configParams);
      }, 100 * (1 + resultHandler.retries++));
      return resultHandler.userIdCallback;
    }
  }

  resultHandler.executeIdRequest(configParams);
  return resultHandler.userIdCallback;
}

function initializeDigiTrust(config) {
  utils.logError('Digitrust Init');
  var dt = window.DigiTrust;
  if (dt && !dt.isClient && config != null) {
    dt.initialize(config.init, config.callback);
  } else if (dt == null) {
    // Assume we are already on a delay and DigiTrust is not on page
    initDigitrustFascade();
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

testHook.initDigitrustFascade = initDigitrustFascade;

/** @type {Submodule} */
export const digiTrustIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'digitrust',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{pubcid:string}}
   */
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
};

attachIdSystem(digiTrustIdSubmodule);

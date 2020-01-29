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

import * as utils from '../src/utils'
import { ajax } from '../src/ajax';
import { submodule } from '../src/hook';

var fallbackTimeout = 1550; // timeout value that allows userId system to execute first
var fallbackTimer = 0; // timer Id for fallback init so we don't double call

/**
 * Checks to see if the DigiTrust framework is initialized.
 * @function
 */
function isInitialized() {
  if (window.DigiTrust == null) {
    return false;
  }
  // eslint-disable-next-line no-undef
  return DigiTrust.isClient; // this is set to true after init
}

/**
 * Tests for presence of the DigiTrust object
 * */
function isPresent() {
  return (window.DigiTrust != null);
}

var noop = function () {
};

const MAX_RETRIES = 2;
const DT_ID_SVC = 'https://prebid.digitru.st/id/v1';
const DT_VENDOR_ID = 64; // cmp gvlVendorId

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
  document.cookie = key + '=' + encId(id) + '; ' + exp + '; path=/;SameSite=none;';
}

/**
 * Set up a DigiTrust facade object to mimic the API
 *
 */
function initDigitrustFacade(config) {
  var _savedId = null; // closure variable for storing Id to avoid additional requests

  clearTimeout(fallbackTimer);
  fallbackTimer = 0;

  var facade = {
    isClient: true,
    isMock: true,
    _internals: {
      callCount: 0,
      initCallback: null
    },
    getUser: function (obj, callback) {
      var isAsync = !!isFunc(callback);
      var cb = isAsync ? callback : noop;
      var errResp = { success: false };
      var inter = facade._internals;
      inter.callCount++;

      // wrap the initializer callback, if present
      var checkAndCallInitializeCb = function (idResponse) {
        if (inter.callCount <= 1 && isFunc(inter.initCallback)) {
          try {
            inter.initCallback(idResponse);
          } catch (ex) {
            utils.logError('Exception in passed DigiTrust init callback');
          }
        }
      }

      if (!isMemberIdValid(obj.member)) {
        if (!isAsync) {
          return errResp
        } else {
          cb(errResp);
          return;
        }
      }

      if (_savedId != null) {
        if (isAsync) {
          checkAndCallInitializeCb(_savedId);
          //          cb(_savedId);
          return;
        } else {
          return _savedId;
        }
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
            delete idResult.identity;
          }
          checkAndCallInitializeCb(idResult);
        },
        fail: function (statusErr, result) {
          utils.logError('DigiTrustId API error: ' + statusErr);
        }
      }

      // check gdpr vendor here. Full DigiTrust library has vendor check built in
      gdprConsent.hasConsent(null, function (hasConsent) {
        if (hasConsent) {
          callApi(opts);
        }
      })

      if (!isAsync) {
        return errResp; // even if it will be successful later, without a callback we report a "failure in this moment"
      }
    }
  }

  if (config && isFunc(config.callback)) {
    facade._internals.initCallback = config.callback;
  }

  if (window && window.DigiTrust == null) {
    window.DigiTrust = facade;
  }
}

/**
 * Tests to see if a member ID is valid within facade
 * @param {any} memberId
 */
var isMemberIdValid = function (memberId) {
  if (memberId && memberId.length > 0) {
    return true;
  } else {
    utils.logError('[DigiTrust Prebid Client Error] Missing member ID, add the member ID to the function call options');
    return false;
  }
};

/**
 * DigiTrust consent handler for GDPR and __cmp.
 * */
var gdprConsent = {
  hasConsent: function (options, consentCb) {
    options = options || { consentTimeout: 1500 };
    var stopTimer;
    var processed = false;
    var consentAnswer = false;
    if (typeof (window.__cmp) !== 'undefined') {
      stopTimer = setTimeout(function () {
        consentAnswer = true;
        consentCb(consentAnswer);
        processed = true;
      }, options.consentTimeout);

      window.__cmp('ping', null, function(pingAnswer) {
        if (pingAnswer.gdprAppliesGlobally) {
          window.__cmp('getVendorConsents', [DT_VENDOR_ID], function (result) {
            if (processed) { return; } // timeout before cmp answer, cancel
            clearTimeout(stopTimer);
            var myconsent = result.vendorConsents[DT_VENDOR_ID];
            consentCb(myconsent);
          });
        } else {
          if (processed) { return; } // timeout before cmp answer, cancel
          clearTimeout(stopTimer);
          consentAnswer = true;
          consentCb(consentAnswer);
        }
      });
    }
    consentAnswer = true;
    consentCb(consentAnswer);
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
    // eslint-disable-next-line no-undef
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

  // First see if we should initialize DigiTrust framework
  if (isPresent() && !isInitialized()) {
    initializeDigiTrust(configParams);
    resultHandler.retryId = setTimeout(function () {
      getDigiTrustId(configParams);
    }, 100 * (1 + resultHandler.retries++));
    return resultHandler.userIdCallback;
  } else if (!isInitialized()) { // Second see if we should build a facade object
    if (resultHandler.retries >= MAX_RETRIES) {
      initDigitrustFacade(configParams); // initialize a facade object that relies on the AJAX call
      resultHandler.executeIdRequest(configParams);
    } else {
      // use expanding envelope
      if (resultHandler.retryId != 0) {
        clearTimeout(resultHandler.retryId);
      }
      resultHandler.retryId = setTimeout(function () {
        getDigiTrustId(configParams);
      }, 100 * (1 + resultHandler.retries++));
    }
    return resultHandler.userIdCallback;
  } else { // Third get the ID
    resultHandler.executeIdRequest(configParams);
    return resultHandler.userIdCallback;
  }
}

function initializeDigiTrust(config) {
  utils.logInfo('Digitrust Init');
  var dt = window.DigiTrust;
  if (dt && !dt.isClient && config != null) {
    dt.initialize(config.init, config.callback);
  } else if (dt == null) {
    // Assume we are already on a delay and DigiTrust is not on page
    initDigitrustFacade(config);
  }
}

var testHook = {};

/**
 * Exposes the test hook object by attaching to the digitrustIdModule.
 * This method is called in the unit tests to surface internals.
 */
export function surfaceTestHook() {
  digiTrustIdSubmodule['_testHook'] = testHook;
  return testHook;
}

testHook.initDigitrustFacade = initDigitrustFacade; // expose for unit tests
testHook.gdpr = gdprConsent;

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
  getId: function (configParams) {
    return {callback: getDigiTrustId(configParams)};
  },
  _testInit: surfaceTestHook
};

// check for fallback init of DigiTrust
function fallbackInit() {
  if (resultHandler.retryId == 0 && !isInitialized()) {
    // this triggers an init
    var conf = {
      member: 'fallback',
      callback: noop
    };
    getDigiTrustId(conf);
  }
}

fallbackTimer = setTimeout(fallbackInit, fallbackTimeout);

submodule('userId', digiTrustIdSubmodule);

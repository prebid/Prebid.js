"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.gppDataHandler = exports.gdprDataHandler = exports.coppaDataHandler = exports.allConsent = exports.VENDORLESS_GVLID = exports.GDPR_GVLIDS = exports.FIRST_PARTY_GVLID = exports.ConsentHandler = void 0;
exports.gvlidRegistry = gvlidRegistry;
exports.multiHandler = multiHandler;
exports.uspDataHandler = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));
var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));
var _utils = require("./utils.js");
var _promise = require("./utils/promise.js");
var _config = require("./config.js");
function _classPrivateMethodInitSpec(obj, privateSet) { _checkPrivateRedeclaration(obj, privateSet); privateSet.add(obj); }
function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateMethodGet(receiver, privateSet, fn) { if (!privateSet.has(receiver)) { throw new TypeError("attempted to get private field on non-instance"); } return fn; }
/**
 * Placeholder gvlid for when vendor consent is not required. When this value is used as gvlid, the gdpr
 * enforcement module will take it to mean "vendor consent was given".
 *
 * see https://github.com/prebid/Prebid.js/issues/8161
 */
const VENDORLESS_GVLID = exports.VENDORLESS_GVLID = Object.freeze({});

/**
 * Placeholder gvlid for when device.ext.cdep is present (Privacy Sandbox cookie deprecation label). When this value is used as gvlid, the gdpr
 * enforcement module will look to see that publisher consent was given.
 *
 * see https://github.com/prebid/Prebid.js/issues/10516
 */
const FIRST_PARTY_GVLID = exports.FIRST_PARTY_GVLID = Object.freeze({});
var _enabled = /*#__PURE__*/new WeakMap();
var _data = /*#__PURE__*/new WeakMap();
var _defer = /*#__PURE__*/new WeakMap();
var _ready = /*#__PURE__*/new WeakMap();
var _dirty = /*#__PURE__*/new WeakMap();
var _hash = /*#__PURE__*/new WeakMap();
var _resolve = /*#__PURE__*/new WeakSet();
class ConsentHandler {
  constructor() {
    _classPrivateMethodInitSpec(this, _resolve);
    _classPrivateFieldInitSpec(this, _enabled, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _data, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _defer, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _ready, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _dirty, {
      writable: true,
      value: true
    });
    _classPrivateFieldInitSpec(this, _hash, {
      writable: true,
      value: void 0
    });
    (0, _defineProperty2.default)(this, "generatedTime", void 0);
    (0, _defineProperty2.default)(this, "hashFields", void 0);
    this.reset();
  }
  /**
   * reset this handler (mainly for tests)
   */
  reset() {
    (0, _classPrivateFieldSet2.default)(this, _defer, (0, _promise.defer)());
    (0, _classPrivateFieldSet2.default)(this, _enabled, false);
    (0, _classPrivateFieldSet2.default)(this, _data, null);
    (0, _classPrivateFieldSet2.default)(this, _ready, false);
    this.generatedTime = null;
  }

  /**
   * Enable this consent handler. This should be called by the relevant consent management module
   * on initialization.
   */
  enable() {
    (0, _classPrivateFieldSet2.default)(this, _enabled, true);
  }

  /**
   * @returns {boolean} true if the related consent management module is enabled.
   */
  get enabled() {
    return (0, _classPrivateFieldGet2.default)(this, _enabled);
  }

  /**
   * @returns {boolean} true if consent data has been resolved (it may be `null` if the resolution failed).
   */
  get ready() {
    return (0, _classPrivateFieldGet2.default)(this, _ready);
  }

  /**
   * @returns a promise than resolves to the consent data, or null if no consent data is available
   */
  get promise() {
    if ((0, _classPrivateFieldGet2.default)(this, _ready)) {
      return _promise.GreedyPromise.resolve((0, _classPrivateFieldGet2.default)(this, _data));
    }
    if (!(0, _classPrivateFieldGet2.default)(this, _enabled)) {
      _classPrivateMethodGet(this, _resolve, _resolve2).call(this, null);
    }
    return (0, _classPrivateFieldGet2.default)(this, _defer).promise;
  }
  setConsentData(data) {
    let time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (0, _utils.timestamp)();
    this.generatedTime = time;
    (0, _classPrivateFieldSet2.default)(this, _dirty, true);
    _classPrivateMethodGet(this, _resolve, _resolve2).call(this, data);
  }
  getConsentData() {
    return (0, _classPrivateFieldGet2.default)(this, _data);
  }
  get hash() {
    if ((0, _classPrivateFieldGet2.default)(this, _dirty)) {
      (0, _classPrivateFieldSet2.default)(this, _hash, (0, _utils.cyrb53Hash)(JSON.stringify((0, _classPrivateFieldGet2.default)(this, _data) && this.hashFields ? this.hashFields.map(f => (0, _classPrivateFieldGet2.default)(this, _data)[f]) : (0, _classPrivateFieldGet2.default)(this, _data))));
      (0, _classPrivateFieldSet2.default)(this, _dirty, false);
    }
    return (0, _classPrivateFieldGet2.default)(this, _hash);
  }
}
exports.ConsentHandler = ConsentHandler;
function _resolve2(data) {
  (0, _classPrivateFieldSet2.default)(this, _ready, true);
  (0, _classPrivateFieldSet2.default)(this, _data, data);
  (0, _classPrivateFieldGet2.default)(this, _defer).resolve(data);
}
class UspConsentHandler extends ConsentHandler {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        usp: consentData,
        generatedAt: this.generatedTime
      };
    }
  }
}
class GdprConsentHandler extends ConsentHandler {
  constructor() {
    super(...arguments);
    (0, _defineProperty2.default)(this, "hashFields", ['gdprApplies', 'consentString']);
  }
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && consentData.vendorData && this.generatedTime) {
      return {
        gdprApplies: consentData.gdprApplies,
        consentStringSize: (0, _utils.isStr)(consentData.vendorData.tcString) ? consentData.vendorData.tcString.length : 0,
        generatedAt: this.generatedTime,
        apiVersion: consentData.apiVersion
      };
    }
  }
}
class GppConsentHandler extends ConsentHandler {
  constructor() {
    super(...arguments);
    (0, _defineProperty2.default)(this, "hashFields", ['applicableSections', 'gppString']);
  }
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        generatedAt: this.generatedTime
      };
    }
  }
}
function gvlidRegistry() {
  const registry = {};
  const flat = {};
  const none = {};
  return {
    /**
     * Register a module's GVL ID.
     * @param {string} moduleType defined in `activities/modules.js`
     * @param {string} moduleName
     * @param {number} gvlid
     */
    register(moduleType, moduleName, gvlid) {
      if (gvlid) {
        (registry[moduleName] = registry[moduleName] || {})[moduleType] = gvlid;
        if (flat.hasOwnProperty(moduleName)) {
          if (flat[moduleName] !== gvlid) flat[moduleName] = none;
        } else {
          flat[moduleName] = gvlid;
        }
      }
    },
    /**
     * Get a module's GVL ID(s).
     *
     * @param {string} moduleName
     * @return {{modules: {[moduleType]: number}, gvlid?: number}} an object where:
     *   `modules` is a map from module type to that module's GVL ID;
     *   `gvlid` is the single GVL ID for this family of modules (only defined
     *   if all modules with this name declared the same ID).
     */
    get(moduleName) {
      const result = {
        modules: registry[moduleName] || {}
      };
      if (flat.hasOwnProperty(moduleName) && flat[moduleName] !== none) {
        result.gvlid = flat[moduleName];
      }
      return result;
    }
  };
}
const gdprDataHandler = exports.gdprDataHandler = new GdprConsentHandler();
const uspDataHandler = exports.uspDataHandler = new UspConsentHandler();
const gppDataHandler = exports.gppDataHandler = new GppConsentHandler();
const coppaDataHandler = exports.coppaDataHandler = (() => {
  function getCoppa() {
    return !!_config.config.getConfig('coppa');
  }
  return {
    getCoppa,
    getConsentData: getCoppa,
    getConsentMeta: getCoppa,
    reset() {},
    get promise() {
      return _promise.GreedyPromise.resolve(getCoppa());
    },
    get hash() {
      return getCoppa() ? '1' : '0';
    }
  };
})();
const GDPR_GVLIDS = exports.GDPR_GVLIDS = gvlidRegistry();
const ALL_HANDLERS = {
  gdpr: gdprDataHandler,
  usp: uspDataHandler,
  gpp: gppDataHandler,
  coppa: coppaDataHandler
};
function multiHandler() {
  let handlers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ALL_HANDLERS;
  handlers = Object.entries(handlers);
  function collector(method) {
    return function () {
      return Object.fromEntries(handlers.map(_ref => {
        let [name, handler] = _ref;
        return [name, handler[method]()];
      }));
    };
  }
  return Object.assign({
    get promise() {
      return _promise.GreedyPromise.all(handlers.map(_ref2 => {
        let [name, handler] = _ref2;
        return handler.promise.then(val => [name, val]);
      })).then(entries => Object.fromEntries(entries));
    },
    get hash() {
      return (0, _utils.cyrb53Hash)(handlers.map(_ref3 => {
        let [_, handler] = _ref3;
        return handler.hash;
      }).join(':'));
    }
  }, Object.fromEntries(['getConsentData', 'getConsentMeta', 'reset'].map(n => [n, collector(n)])));
}
const allConsent = exports.allConsent = multiHandler();
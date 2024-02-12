"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bidderSettings = exports.ScopedSettings = void 0;
var _utils = require("./utils.js");
var _prebidGlobal = require("./prebidGlobal.js");
var _constants = _interopRequireDefault(require("./constants.json"));
function _classPrivateMethodInitSpec(obj, privateSet) { _checkPrivateRedeclaration(obj, privateSet); privateSet.add(obj); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateMethodGet(receiver, privateSet, fn) { if (!privateSet.has(receiver)) { throw new TypeError("attempted to get private field on non-instance"); } return fn; }
var _resolveScope = /*#__PURE__*/new WeakSet();
class ScopedSettings {
  constructor(getSettings, defaultScope) {
    _classPrivateMethodInitSpec(this, _resolveScope);
    this.getSettings = getSettings;
    this.defaultScope = defaultScope;
  }

  /**
   * Get setting value at `path` under the given scope, falling back to the default scope if needed.
   * If `scope` is `null`, get the setting's default value.
   * @param scope {String|null}
   * @param path {String}
   * @returns {*}
   */
  get(scope, path) {
    let value = this.getOwn(scope, path);
    if (typeof value === 'undefined') {
      value = this.getOwn(null, path);
    }
    return value;
  }

  /**
   * Get the setting value at `path` *without* falling back to the default value.
   * @param scope {String}
   * @param path {String}
   * @returns {*}
   */
  getOwn(scope, path) {
    scope = _classPrivateMethodGet(this, _resolveScope, _resolveScope2).call(this, scope);
    return (0, _utils.deepAccess)(this.getSettings(), "".concat(scope, ".").concat(path));
  }

  /**
   * @returns {string[]} all existing scopes except the default one.
   */
  getScopes() {
    return Object.keys(this.getSettings()).filter(scope => scope !== this.defaultScope);
  }

  /**
   * @returns all settings in the given scope, merged with the settings for the default scope.
   */
  settingsFor(scope) {
    return (0, _utils.mergeDeep)({}, this.ownSettingsFor(null), this.ownSettingsFor(scope));
  }

  /**
   * @returns all settings in the given scope, *without* any of the default settings.
   */
  ownSettingsFor(scope) {
    scope = _classPrivateMethodGet(this, _resolveScope, _resolveScope2).call(this, scope);
    return this.getSettings()[scope] || {};
  }
}
exports.ScopedSettings = ScopedSettings;
function _resolveScope2(scope) {
  if (scope == null) {
    return this.defaultScope;
  } else {
    return scope;
  }
}
const bidderSettings = exports.bidderSettings = new ScopedSettings(() => (0, _prebidGlobal.getGlobal)().bidderSettings || {}, _constants.default.JSON_MAPPING.BD_SETTING_STANDARD);
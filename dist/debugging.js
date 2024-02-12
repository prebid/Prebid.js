"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEBUG_KEY = void 0;
exports.debuggingControls = debuggingControls;
exports.debuggingModuleLoader = debuggingModuleLoader;
exports.loadSession = loadSession;
exports.reset = void 0;
var _config = require("./config.js");
var _hook = require("./hook.js");
var _prebidGlobal = require("./prebidGlobal.js");
var _utils = require("./utils.js");
var _bidfactory = require("./bidfactory.js");
var _adloader = require("./adloader.js");
var _promise = require("./utils/promise.js");
const DEBUG_KEY = exports.DEBUG_KEY = "__pbjs_debugging__";
function isDebuggingInstalled() {
  return (0, _prebidGlobal.getGlobal)().installedModules.includes('debugging');
}
function loadScript(url) {
  return new _promise.GreedyPromise(resolve => {
    (0, _adloader.loadExternalScript)(url, 'debugging', resolve);
  });
}
function debuggingModuleLoader() {
  let {
    alreadyInstalled = isDebuggingInstalled,
    script = loadScript
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let loading = null;
  return function () {
    if (loading == null) {
      loading = new _promise.GreedyPromise((resolve, reject) => {
        // run this in a 0-delay timeout to give installedModules time to be populated
        setTimeout(() => {
          if (alreadyInstalled()) {
            resolve();
          } else {
            const url = "https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/debugging-standalone.js";
            (0, _utils.logMessage)("Debugging module not installed, loading it from \"".concat(url, "\"..."));
            (0, _prebidGlobal.getGlobal)()._installDebugging = true;
            script(url).then(() => {
              (0, _prebidGlobal.getGlobal)()._installDebugging({
                DEBUG_KEY,
                hook: _hook.hook,
                config: _config.config,
                createBid: _bidfactory.createBid,
                logger: (0, _utils.prefixLog)('DEBUG:')
              });
            }).then(resolve, reject);
          }
        });
      });
    }
    return loading;
  };
}
function debuggingControls() {
  let {
    load = debuggingModuleLoader(),
    hook = (0, _hook.getHook)('requestBids')
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let promise = null;
  let enabled = false;
  function waitForDebugging(next) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    return (promise || _promise.GreedyPromise.resolve()).then(() => next.apply(this, args));
  }
  function enable() {
    if (!enabled) {
      promise = load();
      // set debugging to high priority so that it has the opportunity to mess with most things
      hook.before(waitForDebugging, 99);
      enabled = true;
    }
  }
  function disable() {
    hook.getHooks({
      hook: waitForDebugging
    }).remove();
    enabled = false;
  }
  function reset() {
    promise = null;
    disable();
  }
  return {
    enable,
    disable,
    reset
  };
}
const ctl = debuggingControls();
const reset = exports.reset = ctl.reset;
function loadSession() {
  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch (e) {}
  if (storage !== null) {
    let debugging = ctl;
    let config = null;
    try {
      config = storage.getItem(DEBUG_KEY);
    } catch (e) {}
    if (config !== null) {
      // just make sure the module runs; it will take care of parsing the config (and disabling itself if necessary)
      debugging.enable();
    }
  }
}
_config.config.getConfig('debugging', function (_ref) {
  let {
    debugging
  } = _ref;
  debugging !== null && debugging !== void 0 && debugging.enabled ? ctl.enable() : ctl.disable();
});
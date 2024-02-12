"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hook = exports.getHook = void 0;
exports.module = _module;
exports.ready = void 0;
exports.setupBeforeHookFnOnce = setupBeforeHookFnOnce;
exports.submodule = submodule;
exports.wrapHook = wrapHook;
var _index = _interopRequireDefault(require("fun-hooks/no-eval/index.js"));
var _promise = require("./utils/promise.js");
let hook = exports.hook = (0, _index.default)({
  ready: _index.default.SYNC | _index.default.ASYNC | _index.default.QUEUE
});
const readyCtl = (0, _promise.defer)();
hook.ready = (() => {
  const ready = hook.ready;
  return function () {
    try {
      return ready.apply(hook, arguments);
    } finally {
      readyCtl.resolve();
    }
  };
})();

/**
 * A promise that resolves when hooks are ready.
 * @type {Promise}
 */
const ready = exports.ready = readyCtl.promise;
const getHook = exports.getHook = hook.get;
function setupBeforeHookFnOnce(baseFn, hookFn) {
  let priority = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 15;
  let result = baseFn.getHooks({
    hook: hookFn
  });
  if (result.length === 0) {
    baseFn.before(hookFn, priority);
  }
}
const submoduleInstallMap = {};
function _module(name, install) {
  let {
    postInstallAllowed = false
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  hook('async', function (submodules) {
    submodules.forEach(args => install(...args));
    if (postInstallAllowed) submoduleInstallMap[name] = install;
  }, name)([]); // will be queued until hook.ready() called in pbjs.processQueue();
}
function submodule(name) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }
  const install = submoduleInstallMap[name];
  if (install) return install(...args);
  getHook(name).before((next, modules) => {
    modules.push(args);
    next(modules);
  });
}

/**
 * Copy hook methods (.before, .after, etc) from a given hook to a given wrapper object.
 */
function wrapHook(hook, wrapper) {
  Object.defineProperties(wrapper, Object.fromEntries(['before', 'after', 'getHooks', 'removeAll'].map(m => [m, {
    get: () => hook[m]
  }])));
  return wrapper;
}
import funHooks from 'fun-hooks/no-eval/index.js';
import {defer} from './utils/promise.js';

export let hook = funHooks({
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

const readyCtl = defer();
hook.ready = (() => {
  const ready = hook.ready;
  return function () {
    try {
      return ready.apply(hook, arguments);
    } finally {
      readyCtl.resolve();
    }
  }
})();

/**
 * A promise that resolves when hooks are ready.
 * @type {Promise}
 */
export const ready = readyCtl.promise;

export const getHook = hook.get;

export function setupBeforeHookFnOnce(baseFn, hookFn, priority = 15) {
  let result = baseFn.getHooks({hook: hookFn});
  if (result.length === 0) {
    baseFn.before(hookFn, priority);
  }
}
const submoduleInstallMap = {};

export function module(name, install, {postInstallAllowed = false} = {}) {
  hook('async', function (submodules) {
    submodules.forEach(args => install(...args));
    if (postInstallAllowed) submoduleInstallMap[name] = install;
  }, name)([]); // will be queued until hook.ready() called in pbjs.processQueue();
}

export function submodule(name, ...args) {
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
export function wrapHook(hook, wrapper) {
  Object.defineProperties(
    wrapper,
    Object.fromEntries(['before', 'after', 'getHooks', 'removeAll'].map((m) => [m, {get: () => hook[m]}]))
  );
  return wrapper;
}

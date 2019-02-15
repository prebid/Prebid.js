
import funHooks from 'fun-hooks';
import { logError } from './utils';

export let hook = funHooks({
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

/**
 * A map of global hook methods to allow easy extension of hooked functions that are intended to be extended globally
 * @type {{}}
 */
export const hooks = hook.hooks;

function createHookManager() {
  let listeners = [];

  /**
   * Creates a hook point and loads any previously stored hook functions that were trying to use this hook point.
   * @param {*} type
   * @param {*} baseFn
   * @param {*} alias
   */
  function registerHook (type, baseFn, alias) {
    let fn = hook(type, baseFn, alias);
    if (alias === undefined) {
      callSubscribers(baseFn);
    } else {
      callSubscribers(alias);
    }
    return fn;
  }

  /**
   * Attempts to add a hook function onto a registered hook point.  If the hook point doesn't exist,
   * the hook function (and related information) will be stored in `listener` array so that it can be
   * loaded once the hook point has been registered.
   * @param {*} hookPoint
   * @param {*} type
   * @param {*} hookFn
   * @param {*} priority
   */
  function subscribeHookFunc (hookPoint, type, hookFn, priority) {
    let hookPointType = typeof hookPoint;

    let doesHookPointExist;
    if (hookPointType === 'string') {
      doesHookPointExist = !!(hooks[hookPoint]);
    } else if (hookPointType === 'function') {
      doesHookPointExist = !!(hookPoint.before);
    } else {
      logError('attempted to subscribe a hook function against an invalid hook point; the hook-point should be a function or a string');
    }

    if (!doesHookPointExist) {
      listeners.push({hookPoint, type, hookFn, priority});
    } else {
      if (getHooks(hookPoint, {hook: hookFn}).length === 0) {
        attachHook(hookPoint, type, hookFn, priority);
      }
    }
  }

  /**
   * Get a particular hook or an array of all hooks.
   * @param {*} hookPoint
   * @param {*} options
   */
  function getHooks (hookPoint, options) {
    let hookPointObj = (typeof hookPoint === 'function') ? hookPoint : hooks[hookPoint];
    return hookPointObj.getHooks(options);
  }

  /**
   * Remove a preivously attached hook function.
   * @param {*} hookPoint
   * @param {*} hookFn
   */
  function removeHook (hookPoint, hookFn) {
    let targetHook = getHooks(hookPoint, {hook: hookFn});
    targetHook.remove();
  }

  function callSubscribers(hookPoint) {
    listeners.forEach(listener => {
      if (listener.hookPoint === hookPoint) {
        let {type, hookFn, priority} = listener;
        attachHook(hookPoint, type, hookFn, priority);
      }
    })
  }

  function attachHook(hookPoint, type, hookFn, priority) {
    let hookPointObj = (typeof hookPoint === 'function') ? hookPoint : hooks[hookPoint];

    if (type === 'before') {
      hookPointObj.before(hookFn, priority);
    } else if (type === 'after') {
      hookPointObj.after(hookFn, priority);
    } else {
      logError('Attempted to attach a hooked function with unknown type; use either \'before\' or \'after\'.');
    }
  }

  return {
    registerHook,
    subscribeHookFunc,
    getHooks,
    removeHook
  }
}
export const hookManager = createHookManager()


import funHooks from 'fun-hooks';

export let hook = funHooks({
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

/**
 * A map of global hook methods to allow easy extension of hooked functions that are intended to be extended globally
 * @type {{}}
 */
export const hooks = hook.hooks;

export function setupBeforeHookFnOnce(baseFn, hookFn, priority = 15) {
  let result = baseFn.getHooks({hook: hookFn});
  if (result.length === 0) {
    baseFn.before(hookFn, priority);
  }
}

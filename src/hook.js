
import funHooks from 'fun-hooks';

export let hook = funHooks({
  useProxy: false,
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

/**
 * A map of global hook methods to allow easy extension of hooked functions that are intended to be extended globally
 * @type {{}}
 */
export const hooks = hook.hooks;

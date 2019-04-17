
import funHooks from 'fun-hooks';

export let hook = funHooks({
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

export const getHook = hook.get;

export function setupBeforeHookFnOnce(baseFn, hookFn, priority = 15) {
  let result = baseFn.getHooks({hook: hookFn});
  if (result.length === 0) {
    baseFn.before(hookFn, priority);
  }
}

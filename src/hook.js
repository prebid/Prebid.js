
import funHooks from 'fun-hooks';

export let hook = funHooks({
  ready: funHooks.SYNC | funHooks.ASYNC | funHooks.QUEUE
});

export const getHook = hook.get;


import funHooks from 'fun-hooks/no-eval';

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

export function module(name, install) {
  hook('async', function (submodules) {
    submodules.forEach(module => install(module));
  }, name)([]); // will be queued until hook.ready() called in pbjs.processQueue();
}

export function submodule(name, spec) {
  getHook(name).before((next, modules) => {
    modules.push(spec);
    next(modules);
  });
}

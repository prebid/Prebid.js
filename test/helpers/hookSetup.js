import { getHook, hook, module } from '../../src/hook.js';

// Specs load submodules without their parent module; give the parent's hook a no-op stand-in, or fun-hooks
// warns "referenced '<name>' but it was never created" on ready.
const PARENT_MODULE_HOOKS = ['userId', 'video', 'realTimeData', 'firstPartyData', 'genericAnalytics'];

before(() => {
  PARENT_MODULE_HOOKS
    .filter(name => typeof getHook(name) !== 'function')
    .forEach(name => module(name, () => {}));
  hook.ready();
});

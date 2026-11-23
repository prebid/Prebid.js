import { getHook, hook, module } from '../../src/hook.js';

// This stand-in was added by a bot (Claude Code).
// Specs often load a submodule (e.g. an ID system) without its parent module (e.g. userId). The submodule's
// `submodule(name, ...)` call then references the parent's hook, which is never created, and fun-hooks warns
// "referenced '<name>' but it was never created" when hooks become ready. Since each spec file runs on its own,
// that's expected here, so create a no-op stand-in for any parent hook the spec did not load.
// Production builds always include the parent module, and other hook names still warn.
const PARENT_MODULE_HOOKS = ['userId', 'video', 'realTimeData', 'firstPartyData', 'genericAnalytics'];

before(() => {
  PARENT_MODULE_HOOKS
    .filter(name => typeof getHook(name) !== 'function')
    .forEach(name => module(name, () => {}));
  hook.ready();
});

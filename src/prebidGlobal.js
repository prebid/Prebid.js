// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global defination should happen BEFORE imports to avoid global undefined errors.
/* global $$DEFINE_PREBID_GLOBAL$$ */
const scope = !$$DEFINE_PREBID_GLOBAL$$ ? {} : window;
const global = scope.$$PREBID_GLOBAL$$ = scope.$$PREBID_GLOBAL$$ || {};
global.cmd = global.cmd || [];
global.que = global.que || [];

// create a pbjs global pointer
if (scope === window) {
  scope._pbjsGlobals = scope._pbjsGlobals || [];
  scope._pbjsGlobals.push('$$PREBID_GLOBAL$$');
}

export function getGlobal() {
  return global;
}

export function registerModule(name) {
  global.installedModules.push(name);
}

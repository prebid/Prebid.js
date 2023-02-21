// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global defination should happen BEFORE imports to avoid global undefined errors.
const scope = !$$DEFINE_PREBID_GLOBAL$$ ? {} : window;
scope.$$PREBID_GLOBAL$$ = (scope.$$PREBID_GLOBAL$$ || {});
scope.$$PREBID_GLOBAL$$.cmd = scope.$$PREBID_GLOBAL$$.cmd || [];
scope.$$PREBID_GLOBAL$$.que = scope.$$PREBID_GLOBAL$$.que || [];

// create a pbjs global pointer
if (scope === window) {
  scope._pbjsGlobals = scope._pbjsGlobals || [];
  scope._pbjsGlobals.push('$$PREBID_GLOBAL$$');
}

export function getGlobal() {
  return scope.$$PREBID_GLOBAL$$;
}

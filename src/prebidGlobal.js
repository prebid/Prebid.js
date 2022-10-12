// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global defination should happen BEFORE imports to avoid global undefined errors.
if (window.$$PREBID_GLOBAL$$)
  console.warn(`Namespace clash happened, with name: ${'window.$$PREBID_GLOBAL$$'} and existing PWT version details: ${JSON.stringify(window?.PWT?.versionDetails)}`);

window.$$PREBID_GLOBAL$$ = (window.$$PREBID_GLOBAL$$ || {});
window.$$PREBID_GLOBAL$$.cmd = window.$$PREBID_GLOBAL$$.cmd || [];
window.$$PREBID_GLOBAL$$.que = window.$$PREBID_GLOBAL$$.que || [];

// create a pbjs global pointer
window._pbjsGlobals = window._pbjsGlobals || [];
window._pbjsGlobals.push('$$PREBID_GLOBAL$$');

export function getGlobal() {
  return window.$$PREBID_GLOBAL$$;
}

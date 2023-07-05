// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global defination should happen BEFORE imports to avoid global undefined errors.
/* eslint-disable */
if (window.$$PREBID_GLOBAL$$) { console.warn(`Namespace clash happened, with name: ${'window.$$PREBID_GLOBAL$$'}, now you can provide your custom namespace, by creating new profile version in the UI. Existing PWT version details: ${JSON.stringify(window?.PWT?.versionDetails)}`); }
/* eslint-disable */

window.$$PREBID_GLOBAL$$ = (window.$$PREBID_GLOBAL$$ || {});
window.$$PREBID_GLOBAL$$.cmd = window.$$PREBID_GLOBAL$$.cmd || [];
window.$$PREBID_GLOBAL$$.que = window.$$PREBID_GLOBAL$$.que || [];

// create a pbjs global pointer
window._pbjsGlobals = window._pbjsGlobals || [];
window._pbjsGlobals.push('$$PREBID_GLOBAL$$');

export function getGlobal() {
  return window.$$PREBID_GLOBAL$$;
}

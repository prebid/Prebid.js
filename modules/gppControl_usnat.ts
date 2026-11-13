import { config } from '../src/config.js';
import { getRules, setupRules } from '../libraries/mspa/activityControls.js';

let unregister: (() => void) | null = null;

// re-exported so that the `consentManagement.gpp.mspa` configuration this module reads (declared
// alongside MSPAConfig) is part of a consumer's program: declaration emit keeps this, but drops the
// value import above, whose bindings no type refers to
export type { MSPAConfig } from '../libraries/mspa/activityControls.js';

config.getConfig('consentManagement', (cfg) => {
  if (cfg?.consentManagement?.gpp != null) {
    if (unregister != null) unregister();
    unregister = setupRules('usnat', [7], getRules(cfg.consentManagement.gpp.mspa?.restrictActivities));
  }
});

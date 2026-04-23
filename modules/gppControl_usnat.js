import { config } from '../src/config.js';
import { getRules, setupRules } from '../libraries/mspa/activityControls.js';

let unregister = null;

config.getConfig('consentManagement', (cfg) => {
  if (cfg?.consentManagement?.gpp != null) {
    if (unregister != null) unregister();
    unregister = setupRules('usnat', [7], getRules(cfg.consentManagement.gpp.mspa?.restrictActivities));
  }
})

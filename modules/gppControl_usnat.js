import {config} from '../src/config.js';
import {setupRules} from '../libraries/mspa/activityControls.js';

let setupDone = false;

config.getConfig('consentManagement', (cfg) => {
  if (cfg?.consentManagement?.gpp != null && !setupDone) {
    setupRules('usnat', [7]);
    setupDone = true;
  }
})

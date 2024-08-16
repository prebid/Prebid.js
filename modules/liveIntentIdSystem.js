function loadModule() {
  // Load appropriate module based on the build flag. Constant folding ensures
  // that the other one will not be included in the bundle.
  // eslint-disable-next-line no-constant-condition
  if ('$$LIVE_INTENT_MODULE_MODE$$' === 'hub') {
    // eslint-disable-next-line no-restricted-globals
    return require('../libraries/liveIntentIdSystem/liveIntentIdHubSystem.js')
  } else {
    // eslint-disable-next-line no-restricted-globals
    return require('../libraries/liveIntentIdSystem/liveIntentIdSystem.js')
  }
}

export const liveIntentIdSubmodule = loadModule()

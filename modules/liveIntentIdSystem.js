function loadModule() {
  // Load appropriate module based on the build flag. Constant folding ensures
  // that the other one will not be included in the bundle.
  // eslint-disable-next-line no-constant-condition
  if ('$$LIVE_INTENT_MODULE_MODE$$' === 'external') {
    // eslint-disable-next-line no-restricted-globals
    return require('../libraries/liveIntentId/externalIdSystem.js')
  } else {
    // eslint-disable-next-line no-restricted-globals
    return require('../libraries/liveIntentId/idSystem.js')
  }
}

export const liveIntentIdSubmodule = loadModule()

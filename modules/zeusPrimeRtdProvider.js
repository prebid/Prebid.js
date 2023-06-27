import { logWarn } from '../src/utils.js'
import { submodule } from '../src/hook.js'

function initModule() {
  logWarn('Zeus Prime has been deprecated. This module will be removed in Prebid 8.')
}

/**
 * @preserve
 * @type {RtdSubmodule}
 */
const zeusPrimeSubmodule = {
  /**
   * @preserve
   * The name of the plugin.
   * @type {string}
   */
  name: 'zeusPrime',

  /**
   * @preserve
   * ZeusPrime use
   */
  init: initModule,
}

/**
 * @preserve
 * Register the Sub Module.
 */
function registerSubModule() {
  submodule('realTimeData', zeusPrimeSubmodule)
}

registerSubModule()

export { zeusPrimeSubmodule }

import { getGlobal } from './prebidGlobal.js';
import { logMessage } from './utils.js';
import { loadExternalScript } from './adloader.js';
import { PbPromise } from './utils/promise.js';
import { MODULE_TYPE_PREBID } from './activities/modules.js';
import { getDistUrlBase } from './buildOptions.js';

/**
 * Build a loader for a module that can be bundled separately and pulled in on
 * demand (a "standalone" bundle). The returned function, on its first call:
 *   - resolves immediately if the module is already compiled into this build;
 *   - otherwise loads `<distUrlBase><bundle>`. That bundle hands control back by
 *     replacing the `installProp` sentinel on the global with an install
 *     function, which is then called with `deps`.
 *
 * The load is attempted at most once. The check runs in a 0-delay timeout to
 * give `installedModules` time to be populated (so a compiled-in module is not
 * loaded - and installed - a second time).
 *
 * Options: `moduleName` (installedModules entry / loader moduleCode),
 * `installProp` (global property used for the sentinel handshake), `bundle`
 * (standalone bundle file name, served from the dist URL base), `deps`
 * (passed to the module's install()), and the `alreadyInstalled` / `script`
 * test seams.
 */
export function standaloneModuleLoader({
  moduleName,
  installProp,
  bundle,
  deps,
  alreadyInstalled = () => getGlobal().installedModules.includes(moduleName),
  script = (url) => new PbPromise((resolve, reject) => {
    loadExternalScript(url, MODULE_TYPE_PREBID, moduleName, { success: resolve, error: reject });
  })
} = {}) {
  let loading = null;
  return function () {
    if (loading == null) {
      loading = new PbPromise((resolve, reject) => {
        // run this in a 0-delay timeout to give installedModules time to be populated
        setTimeout(() => {
          if (alreadyInstalled()) {
            resolve();
          } else {
            const url = `${getDistUrlBase()}${bundle}`;
            logMessage(`${moduleName} module not installed, loading it from "${url}"...`);
            getGlobal()[installProp] = true;
            script(url).then(() => {
              getGlobal()[installProp](deps);
            }).then(resolve, reject);
          }
        });
      });
    }
    return loading;
  };
}

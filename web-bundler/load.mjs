import { METADATA_SUFFIX, resolveDependencies } from './dependencies.mjs';

export function scriptLoader(base, scope) {
  return function (chunk, checksum) {
    const script = document.createElement('script');
    script.__pbjsScope = scope;
    Object.entries({
      src: base + chunk,
      defer: 'defer',
      crossorigin: 'anonymous',
      crossoriginstorage: '*',
      integrity: checksum
    }).forEach(([attr, value]) => script.setAttribute(attr, value));
    return new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };
}

export async function getManifest(loader, checksum) {
  let callback;
  do {
    callback = `__pbjsManifest${(Math.random() + 1).toString(36).substring(2)}`;
  } while (window[callback] != null);
  let manifest;
  window[callback] = function (response) {
    manifest = response;
  };
  return loader(`manifest.js?callback=${callback}`, checksum)
    .then(() => manifest)
    .finally(() => delete window[callback]);
}

export async function loadModules(loader, manifest, modules, resolveDeps = resolveDependencies) {
  const missing = modules.filter(module => !manifest.checksums.hasOwnProperty(module + '.js'));
  if (missing.length > 0) {
    throw new Error(`Cannot find modules: ${missing.join(', ')}`);
  }
  const chunks = resolveDeps(modules, manifest.dependencies, (module) => manifest.checksums.hasOwnProperty(module + METADATA_SUFFIX));
  return Promise.allSettled(
    chunks.map(chunk => loader(chunk, manifest.checksums[chunk]))
  );
}

/**
 * Check if a prebid instance already claimed `globalVarName`, and if not, run load() and call processQueue.
 *
 * `load` MUST resolve only when settled - if it loads N scripts, it must wait for all N to load or fail.
 *  A fast fail (e.g. using Promise.all) can allow later invocations of checkAndRun to see the same globalVarName
 *  as unclaimed even though a script still in flight may set `libLoaded`.
 */
export function checkAndRun(globalVarName, load) {
  if (window[globalVarName]?.libLoaded || window[globalVarName]?.__loading) {
    let debugEnabled = true;
    try {
      debugEnabled = window[globalVarName].getConfig('debug');
    } catch (e) {
    }
    if (debugEnabled) {
      console.warn(`Attempted to load a copy of Prebid.js that clashes with the existing '${globalVarName}' instance. Load aborted.`);
    }
  } else {
    window[globalVarName] = window[globalVarName] || {};
    window[globalVarName].__loading = true;
    return load()
      .finally(() => {
        delete window[globalVarName].__loading;
      }).then(() => {
        window[globalVarName].processQueue();
      });
  }
}


import { METADATA_SUFFIX, resolveDependencies } from './dependencies.mjs';

export function scriptLoader(base, scope) {
  const loaded = scope.__loadedChunks = scope.__loadedChunks || new Map();
  return function (chunk, checksum) {
    const key = `${chunk}:${checksum}`;
    if (loaded.has(key)) {
      return loaded.get(key);
    }
    const script = document.createElement('script');
    script.__pbjsScope = scope;
    Object.entries({
      src: base + chunk,
      defer: 'defer',
      crossorigin: 'anonymous',
      crossoriginstorage: '*',
      integrity: checksum
    }).forEach(([attr, value]) => script.setAttribute(attr, value));
    const result = new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    loaded.set(key, result);
    result.catch(() => loaded.delete(key));
    return result;
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
  return loadChunks(loader, chunks, manifest.checksums);
}

export async function loadChunks(loader, chunks, checksums) {
  // Codex bot: wait for every load before surfacing a failure so late scripts cannot race a retry.
  const results = await Promise.allSettled(
    chunks.map(chunk => loader(chunk, checksums[chunk]))
  );
  const failure = results.find(result => result.status === 'rejected');
  if (failure) {
    throw failure.reason;
  }
  return results;
}

/**
 * Check if a prebid instance already claimed `globalVarName`, and if not, run load(scope) and call processQueue.
 *
 * `load` MUST resolve only when settled - if it loads N scripts, it must wait for all N to load or fail.
 *  A fast fail (e.g. using Promise.all) can allow later invocations of checkAndRun to see the same globalVarName
 *  as unclaimed even though a script still in flight may set `libLoaded`.
 * A settled partial failure retains its scope so the next invocation can reuse its runtime and successful chunks.
 */
export function checkAndRun(globalVarName, load) {
  const existing = window[globalVarName];
  if ((existing?.libLoaded && !existing?.__loadFailed) || existing?.__loading) {
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
    window[globalVarName].__loadScope = window[globalVarName].__loadScope || {};
    return load(window[globalVarName].__loadScope)
      .catch((reason) => {
        // Keep the partially initialized runtime and its loaded chunks available for a retry.
        window[globalVarName].__loadFailed = true;
        throw reason;
      })
      .finally(() => {
        delete window[globalVarName].__loading;
      }).then(() => {
        window[globalVarName].processQueue();
        delete window[globalVarName].__loadFailed;
        delete window[globalVarName].__loadScope;
      });
  }
}

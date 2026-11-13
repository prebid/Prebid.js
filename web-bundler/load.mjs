import { METADATA_SUFFIX, requiresMetadata, resolveDependencies } from './dependencies.mjs';

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

export const MANIFEST = 'manifest.js';
export const METADATA_MANIFEST = 'manifest.metadata.js';
const MANIFEST_KEYS = {
  [MANIFEST]: '__pbjsManifest',
  [METADATA_MANIFEST]: '__pbjsMetadataManifest',
};

/**
 * Called by a manifest script (`manifest.js`, `manifest.metadata.js`) to hand its data to the loader that loaded it,
 * through the script's `__pbjsScope` (see scriptLoader), as the chunks do. The script's URL has no query string, so
 * the browser caches it.
 */
export function provideManifest(script, file, data) {
  // loaders before 11.48 asked for manifest.js through a JSONP callback in its URL
  const callback = new URL(script.src).searchParams.get('callback');
  if (callback) {
    window[callback](data);
  } else if (script.__pbjsScope) {
    script.__pbjsScope[MANIFEST_KEYS[file]] = data;
  }
}

/**
 * Load a manifest script (`manifest.js`, or `manifest.metadata.js` for the metadata chunks' checksums), and
 * resolve to its data.
 */
export async function getManifest(loader, checksum, scope, file = MANIFEST) {
  const key = MANIFEST_KEYS[file];
  return loader(file, checksum)
    .then(() => {
      if (scope[key] == null) {
        throw new Error(`${file} did not provide a manifest`);
      }
      return scope[key];
    })
    .finally(() => delete scope[key]);
}

/**
 * Load the manifest, and the metadata manifest too if any of `modules` needs metadata (storageControl).
 */
export async function getManifests(loader, checksums, scope, modules, requiresMeta = requiresMetadata) {
  const [manifest, metadata] = await Promise.all([
    getManifest(loader, checksums[MANIFEST], scope, MANIFEST),
    modules.some(requiresMeta) ? getManifest(loader, checksums[METADATA_MANIFEST], scope, METADATA_MANIFEST) : null
  ]);
  return metadata == null ? manifest : {
    ...manifest,
    checksums: { ...manifest.checksums, ...metadata.checksums }
  };
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

import { METADATA_SUFFIX, resolveDependencies } from './dependencies.mjs';

export function scriptLoader(base) {
  return function(chunk, checksum) {
    const script = document.createElement('script');
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
  }
}

export async function getManifest(loader, checksum) {
  let callback;
  do {
    callback = `__pbjsManifest${ (Math.random() + 1).toString(36).substring(10) }`
  } while (window[callback] != null);
  let manifest;
  window[callback] = function (response) {
    manifest = response;
  }
  return loader(`manifest.js?callback=${callback}`, checksum)
    .then(() => manifest)
    .finally(() => delete window[callback]);
}

export async function loadModules(loader, manifest, modules, resolveDeps = resolveDependencies) {
  const missing = modules.filter(module => !manifest.checksums.hasOwnProperty(module + '.js'));
  if (missing.length > 0) {
    throw new Error(`Cannot find modules: ${missing.join(', ')}`)
  }
  const chunks = resolveDeps(modules, manifest.dependencies, (module) => manifest.checksums.hasOwnProperty(module + METADATA_SUFFIX));
  return Promise.all(
    chunks.map(chunk => loader(chunk, manifest.checksums[chunk]))
  );
}

export function checkAndRun(globalVarName, load) {
  if (window[globalVarName]?.libLoaded) {
    try {
      if (window[globalVarName].getConfig('debug')) {
        console.warn(`Attempted to load a copy of Prebid.js that clashes with the existing '${globalVarName}' instance. Load aborted.`);
      }
    } catch (e) {}
  } else {
    load().then(() => {
      window[globalVarName].processQueue();
    })
  }
}


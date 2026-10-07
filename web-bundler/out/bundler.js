import { parseParams } from '../options.mjs';
import { checkAndRun, loadModules, scriptLoader, getManifest } from '../load.mjs';
import manifestChecksum from 'manifest.js.checksum';
import {injectBuildOptions} from 'injectBuildOptions';

const options = parseParams(new URL(document.currentScript.src).search);

// webpack jsonp chunks install themselves into currentScript.__pbjsScope if present -
// this allows isolating from other prebid instances on the page
const scope = document.currentScript.__pbjsScope = {};

const global = options.buildOptions.pbGlobal;
checkAndRun(global, () => {
  injectBuildOptions(options.buildOptions);
  const loader = scriptLoader(options.buildOptions.distUrlBase, scope);
  return getManifest(loader, manifestChecksum)
    .then(manifest => loadModules(loader, manifest, options.modules));
});

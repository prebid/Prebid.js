import { parseParams } from '../options.mjs';
import { checkAndRun, loadModules, scriptLoader, getManifest } from '../load.mjs';
import manifestChecksum from 'manifest.js.checksum';
import {injectBuildOptions} from 'injectBuildOptions';

const options = parseParams(new URL(document.currentScript.src).search);

const global = options.buildOptions.pbGlobal;
checkAndRun(global, () => {
  injectBuildOptions(options.buildOptions);
  const loader = scriptLoader(options.buildOptions.distUrlBase);
  return getManifest(loader, manifestChecksum)
    .then(manifest => loadModules(loader, manifest, options.modules));
});

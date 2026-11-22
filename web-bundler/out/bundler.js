import { parseParams } from '../options.mjs';
import { checkAndRun, loadModules, scriptLoader, getManifests, MANIFEST, METADATA_MANIFEST } from '../load.mjs';
import manifestChecksum from 'manifest.js.checksum';
import metadataManifestChecksum from 'manifest.metadata.js.checksum';
import {injectBuildOptions} from 'injectBuildOptions';

const options = parseParams(new URL(document.currentScript.src).search);

// webpack jsonp chunks install themselves into currentScript.__pbjsScope if present -
// this allows isolating from other prebid instances on the page
const scope = document.currentScript.__pbjsScope = {};

const global = options.buildOptions.pbGlobal;
checkAndRun(global, () => {
  injectBuildOptions(options.buildOptions);
  const loader = scriptLoader(options.buildOptions.distUrlBase, scope);
  const checksums = { [MANIFEST]: manifestChecksum, [METADATA_MANIFEST]: metadataManifestChecksum };
  return getManifests(loader, checksums, scope, options.modules)
    .then(manifest => loadModules(loader, manifest, options.modules));
});

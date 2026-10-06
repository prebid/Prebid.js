import { checkAndRun, loadChunks, scriptLoader } from '../load.mjs';
import options from 'buildOptions.mjs';
import checksums from 'checksums.json';
import {injectBuildOptions} from 'injectBuildOptions';


if (!options.defineGlobal) {
  console.warn('Cannot load Prebid.js bundle with defineGlobal = false');
} else {
  const scope = document.currentScript.__pbjsScope = {};
  checkAndRun(options.pbGlobal, () => {
    injectBuildOptions(options);
    const loader = scriptLoader(options.distUrlBase, scope);
    return loadChunks(loader, Object.keys(checksums), checksums);
  });
}

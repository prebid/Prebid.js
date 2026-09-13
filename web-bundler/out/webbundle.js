import { checkAndRun, loadChunks, scriptLoader } from '../load.mjs';
import options from 'buildOptions.mjs';
import checksums from 'checksums.json';
import {injectBuildOptions} from 'injectBuildOptions';


if (!options.defineGlobal) {
  console.warn('Cannot load Prebid.js bundle with defineGlobal = false');
} else {
  checkAndRun(options.pbGlobal, (scope) => {
    document.currentScript.__pbjsScope = scope;
    injectBuildOptions(options);
    const loader = scriptLoader(options.distUrlBase, scope);
    return loadChunks(loader, Object.keys(checksums), checksums);
  });
}

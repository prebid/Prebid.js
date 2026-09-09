import { scriptLoader } from '../load.mjs';

import { checkAndRun } from '../load.mjs'
import options from 'buildOptions.mjs';
import checksums from 'checksums.json';

const scope = document.currentScript.__pbjsScope = {};

checkAndRun(options.pbGlobal, () => {
  const loader = scriptLoader(options.distUrlBase, scope);
  return Promise.all(
    Object.entries(checksums).map(([file, checksum]) => loader(file, checksum))
  );
});

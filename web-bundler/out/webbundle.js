import { scriptLoader } from '../load.mjs';

import { checkAndRun } from '../load.mjs'
import options from 'buildOptions.mjs';
import checksums from 'checksums.json';

checkAndRun(options.pbGlobal, () => {
  const loader = scriptLoader(options.distUrlBase);
  return Promise.all(
    Object.entries(checksums).map(([file, checksum]) => loader(file, checksum))
  );
});

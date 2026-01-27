import execaCommand from 'execa';
import fs from 'fs';
import path from 'path';
import {getPrebidRoot} from './common.mjs';

export const getWebpackBundle = (() => {
  let bundleNo = 0;
  return async function (modules) {
    await execaCommand(`gulp bundle --modules=${modules} --tag=b${bundleNo}`, {cwd: getPrebidRoot(), stdio: 'inherit', shell: true});
    return fs.readFileSync(path.join(getPrebidRoot(), `build/dist/prebid.b${bundleNo}.js`));
  };
})();


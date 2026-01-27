import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {getPrebidRoot} from './common.mjs';
import execaCommand from 'execa';
import _ from 'lodash';

const TEMPLATE_DIR = path.join(import.meta.dirname, 'npm-template');

const INDEX_TEMPLATE = _.template(`
 import pbjs from 'prebid.js';
 <% _.forEach(modules, function(module) {%>
 import 'prebid.js/modules/<%= module %>';
 <% })%>
 pbjs.processQueue();
`);

function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'prebid-'));
}


export async function getNpmBundle(modules) {
  const dir = await tempDir();
  const packageJson = JSON.parse((await fs.readFile(path.join(TEMPLATE_DIR, 'package.json'))).toString());
  packageJson.devDependencies['prebid.js'] = getPrebidRoot();
  await fs.writeFile(path.join(dir, 'package.json'), Buffer.from(JSON.stringify(packageJson, null, 2)));
  await fs.copyFile(path.join(TEMPLATE_DIR, 'webpack.conf.mjs'), path.join(dir, 'webpack.conf.mjs'));
  await fs.writeFile(path.join(dir, 'index.mjs'), INDEX_TEMPLATE({
    modules
  }));
  await execaCommand('npm install', {cwd: dir, stdio: 'inherit', shell: true});
  await execaCommand('npx webpack -c webpack.conf.mjs', {cwd: dir, stdio: 'inherit', shell: true});
  try  {
    return (await fs.readFile(path.join(dir, 'dist/main.js'))).toString();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

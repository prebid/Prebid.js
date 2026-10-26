/**
 * Type checks the published declarations from a consumer's point of view: a skeleton project that
 * depends on `prebid.js`, compiled with each `moduleResolution` the README declares supported, once
 * as a CommonJS package and once as an ES module package.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFile} = require('child_process');
const helpers = require('./gulpHelpers.js');

// keep in sync with the "TypeScript configuration" table in README.md
const COMPILER_SETTINGS = [
  {moduleResolution: 'Bundler', module: 'ESNext'},
  {moduleResolution: 'Bundler', module: 'Preserve'},
  {moduleResolution: 'Node16', module: 'Node16'},
  {moduleResolution: 'NodeNext', module: 'NodeNext'},
];
const PACKAGE_TYPES = ['commonjs', 'module'];

// the usage examples in README.md
const SOURCES = {
  'npm.ts': `
import pbjs from 'prebid.js';
import 'prebid.js/modules/userId';
import 'prebid.js/modules/appnexusBidAdapter';
pbjs.processQueue();
pbjs.getUserIds();
pbjs.requestBids({adUnits: [{code: 'div', mediaTypes: {banner: {sizes: [[300, 250]]}}, bids: [{bidder: 'appnexus', params: {placementId: 1}}]}]});
`,
  'global.ts': `
import 'prebid.js/types.d.ts';
import 'prebid.js/global.d.ts';
pbjs.que.push(() => pbjs.processQueue());
`,
  'customGlobal.ts': `
import type {PrebidJS} from 'prebid.js/types.d.ts';
declare global {
  interface Window {
    myCustomPrebidGlobal: PrebidJS;
  }
}
window.myCustomPrebidGlobal.que.push(() => window.myCustomPrebidGlobal.processQueue());
`,
  // the expected errors fail the check if these types degrade to `any`
  'namedTypes.ts': `
import pbjs from 'prebid.js';
import type {AdUnitDefinition, Bid, BidRequest, EventPayload} from 'prebid.js';
const adUnits: AdUnitDefinition[] = [];
pbjs.requestBids({adUnits});
export let bid: Bid | undefined;
export let request: BidRequest<'appnexus'> | undefined;
export let payload: EventPayload<'bidWon'> | undefined;
// @ts-expect-error
pbjs.notAMethod();
// @ts-expect-error
export let notAnEvent: EventPayload<'notAnEvent'> | undefined;
`,
};

function createConsumer(workDir, {moduleResolution, module}, type) {
  const dir = path.join(workDir, `${moduleResolution}-${module}-${type}`.toLowerCase());
  fs.mkdirSync(path.join(dir, 'node_modules'), {recursive: true});
  fs.symlinkSync(__dirname, path.join(dir, 'node_modules/prebid.js'), 'junction');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({name: 'consumer', private: true, type}));
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      moduleResolution,
      module,
      // the minimums from README.md; `lib` is left to its default
      target: 'ES2015',
      strict: true,
      noEmit: true,
      types: [],
    },
    files: Object.keys(SOURCES),
  }));
  Object.entries(SOURCES).forEach(([name, contents]) => fs.writeFileSync(path.join(dir, name), contents));
  return dir;
}

function typeCheck(dir) {
  return new Promise((resolve) => {
    execFile(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', dir], {cwd: dir}, (error, stdout, stderr) => {
      resolve({dir, ok: !error, output: `${stdout}${stderr}`.trim()});
    });
  });
}

function tsConsumer() {
  if (!fs.existsSync(helpers.getPrecompiledPath('src/prebid.public.d.ts'))) {
    return Promise.reject(new Error(`no declarations under '${helpers.getPrecompiledPath()}', run 'gulp precompile' first`));
  }
  // outside the repository: CI archives the working directory, and the links point back into it
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prebid-ts-consumer-'));
  const consumers = COMPILER_SETTINGS.flatMap(settings => PACKAGE_TYPES.map(type => createConsumer(workDir, settings, type)));
  return Promise.all(consumers.map(typeCheck)).then(results => {
    results.forEach(({dir, ok}) => console.log(`${ok ? 'pass' : 'FAIL'}  ${path.basename(dir)}`));
    const failures = results.filter(({ok}) => !ok);
    if (failures.length > 0) {
      throw new Error(['', ...failures.map(({dir, output}) => `${path.basename(dir)}:\n${output}`)].join('\n\n'));
    }
  }).finally(() => fs.rmSync(workDir, {recursive: true, force: true}));
}

module.exports = {tsConsumer};

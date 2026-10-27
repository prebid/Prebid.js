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
  // same, for types that modules add through augmentation
  'augmentedTypes.ts': `
import pbjs from 'prebid.js';
import type {BidderParams} from 'prebid.js';
import 'prebid.js/modules/userId';
import 'prebid.js/modules/sharedIdSystem';
import 'prebid.js/modules/appnexusBidAdapter';
export const pubcid: string | undefined = pbjs.getUserIds().pubcid;
// @ts-expect-error
export const notANumber: number | undefined = pbjs.getUserIds().pubcid;
export const params: BidderParams['appnexus'] = {placementId: 1};
// @ts-expect-error
export const badParams: BidderParams['appnexus'] = {placementId: true};
`,
};

function createConsumer(workDir, {moduleResolution, module}, type) {
  const dir = path.join(workDir, `${moduleResolution}-${module}-${type}`.toLowerCase());
  fs.mkdirSync(dir);
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

function run(file, args, options) {
  return new Promise((resolve) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      resolve({ok: !error, output: `${stdout}${stderr}`.trim()});
    });
  });
}

function typeCheck(dir, compiler) {
  return run(process.execPath, [require.resolve(`${compiler}/bin/tsc`), '-p', dir], {cwd: dir})
    .then(result => ({name: `${compiler} ${path.basename(dir)}`, ...result}));
}

function npm(args, cwd) {
  return run('npm', args, {cwd}).then(({ok, output}) => {
    if (!ok) {
      throw new Error(`npm ${args.join(' ')} failed:\n${output}`);
    }
  });
}

/**
 * Make 'prebid.js' resolvable from every consumer, which are subdirectories of `workDir`.
 */
const INSTALLERS = {
  // fast, but sees the whole checkout - including devDependencies and files that are not published
  link(workDir) {
    fs.mkdirSync(path.join(workDir, 'node_modules'));
    fs.symlinkSync(__dirname, path.join(workDir, 'node_modules/prebid.js'), 'junction');
    return Promise.resolve();
  },
  // what users get, but needs a generated .npmignore and the registry
  pack(workDir) {
    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({private: true}));
    return npm(['pack', '--ignore-scripts', '--loglevel=warn', '--pack-destination', workDir], __dirname).then(() => {
      const tarball = fs.readdirSync(workDir).find(name => name.endsWith('.tgz'));
      return npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(workDir, tarball)], workDir);
    });
  }
};

function tsConsumer(install, compilers) {
  const task = function () {
    if (!fs.existsSync(helpers.getPrecompiledPath('src/prebid.public.d.ts'))) {
      return Promise.reject(new Error(`no declarations under '${helpers.getPrecompiledPath()}', run 'gulp precompile' first`));
    }
    // outside the repository: CI archives the working directory, and the links point back into it
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prebid-ts-consumer-'));
    return INSTALLERS[install](workDir).then(() => {
      const consumers = COMPILER_SETTINGS.flatMap(settings => PACKAGE_TYPES.map(type => createConsumer(workDir, settings, type)));
      return Promise.all(compilers.flatMap(compiler => consumers.map(dir => typeCheck(dir, compiler))));
    }).then(results => {
      results.forEach(({name, ok}) => console.log(`${ok ? 'pass' : 'FAIL'}  ${name}`));
      const failures = results.filter(({ok}) => !ok);
      if (failures.length > 0) {
        throw new Error(['', ...failures.map(({name, output}) => `${name}:\n${output}`)].join('\n\n'));
      }
    }).finally(() => fs.rmSync(workDir, {recursive: true, force: true}));
  };
  task.displayName = `ts-consumer (${install})`;
  return task;
}

// keep in sync with the minimum TypeScript version in README.md
const TS_MIN = 'typescript-min';
const TS_CURRENT = 'typescript';

module.exports = {tsConsumer, TS_MIN, TS_CURRENT};

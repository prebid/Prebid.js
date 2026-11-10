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
const {globalVarName, defineGlobal} = require('./package.json');

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
  // global.d.ts declares the global configured in package.json, and nothing if there is none
  ...(defineGlobal && {
    'global.ts': `
import 'prebid.js/types.d.ts';
import 'prebid.js/global.d.ts';
${globalVarName}.que.push(() => ${globalVarName}.processQueue());
`,
  }),
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
  // Literal provider names are inferred at the setter, including through the type-only API.
  'providerConfig.ts': `
import pbjs from 'prebid.js';
import type {PrebidJS, UserIdConfig} from 'prebid.js/types.d.ts';
import 'prebid.js/modules/sharedIdSystem';
import 'prebid.js/modules/geolocationRtdProvider';
declare const typedPbjs: PrebidJS;
declare const dynamicName: string;
const sharedId: UserIdConfig<'sharedId'> = {name: 'sharedId', params: {create: false}};
pbjs.setConfig({userSync: {userIds: [sharedId]}});
typedPbjs.setConfig({userSync: {userIds: [{name: 'sharedId', params: {create: true}}, {name: 'custom', params: {anything: 1}}]}});
pbjs.mergeConfig({realTimeData: {dataProviders: [{name: 'geolocation', params: {requestPermission: true}}, {name: 'custom', anything: 1}]}});
pbjs.setConfig({userSync: {userIds: [{name: dynamicName, params: {anything: 1}}]}});
// @ts-expect-error - a known ID provider cannot use the untyped fallback
typedPbjs.setConfig({userSync: {userIds: [{name: 'sharedId', params: {create: 'invalid'}}]}});
// @ts-expect-error - excess params are rejected, even alongside a custom provider
pbjs.setConfig({userSync: {userIds: [{name: 'custom', params: {foo: true}}, {name: 'sharedId', params: {create: false, foo: true}}]}});
// @ts-expect-error - mergeConfig shares the same ID validation
pbjs.mergeConfig({userSync: {userIds: [{name: 'sharedId', params: {create: 'invalid'}}]}});
// @ts-expect-error - known RTD provider params are also checked
typedPbjs.setConfig({realTimeData: {dataProviders: [{name: 'geolocation', params: {requestPermission: 'invalid'}}]}});
// @ts-expect-error - custom RTD providers do not weaken known ones
pbjs.mergeConfig({realTimeData: {dataProviders: [{name: 'custom', params: {anything: 1}}, {name: 'geolocation', params: {foo: true}}]}});
pbjs.setBidderConfig({bidders: [dynamicName], config: {userSync: {userIds: [sharedId]}}});
// @ts-expect-error - bidder config also infers provider names, independent of bidder names
pbjs.setBidderConfig({bidders: [dynamicName], config: {userSync: {userIds: [{name: 'sharedId', params: {create: 'invalid'}}]}}});
// @ts-expect-error - merging bidder config checks RTD params
pbjs.mergeBidderConfig({bidders: ['appnexus'], config: {realTimeData: {dataProviders: [{name: 'geolocation', params: {requestPermission: 'invalid'}}]}}});
`,
  'adUnitConfig.ts': `
import pbjs from 'prebid.js';
import type {AdUnitDefinition, AdUnitBidDefinition} from 'prebid.js';
import type {PrebidJS} from 'prebid.js/types.d.ts';
import 'prebid.js/modules/adapexBidAdapter';
import 'prebid.js/modules/appnexusBidAdapter';
import 'prebid.js/modules/adfBidAdapter';
declare const typedPbjs: PrebidJS;
declare const dynamicBidder: string;
const definition = {code: 'slot', bids: [{bidder: 'adapex', params: {seat: 'publisher'}}]} satisfies AdUnitDefinition<'adapex'>;
const customBid: AdUnitBidDefinition<'adapex' | 'custom'> = {bidder: 'custom', params: {anything: 1}};
pbjs.addAdUnits(definition);
typedPbjs.addAdUnits([{code: 'first', bids: [{bidder: 'adapex', params: {seat: 'publisher'}}, customBid]}, {code: 'stored', bids: [{module: 'pbsBidAdapter', params: {configName: 'stored'}}]}]);
pbjs.requestBids({adUnits: [{code: 'slot', bids: [{bidder: 'adapex', params: {seat: 'publisher'}}, {bidder: 'custom', params: {anything: 1}}]}]});
pbjs.addAdUnits({code: 'dynamic', bids: [{bidder: dynamicBidder, params: {anything: 1}}]});
pbjs.addAdUnits({code: 'unionParams', bids: [{bidder: 'adf', params: {mid: 1}}, {bidder: 'adf', params: {inv: 1, mname: 'tag'}}]});
pbjs.requestBids();
// @ts-expect-error - known bidder parameters cannot fall back to the untyped branch
typedPbjs.addAdUnits({code: 'slot', bids: [{bidder: 'adapex', params: {seat: 42}}]});
// @ts-expect-error - arrays retain validation, including alongside custom aliases
pbjs.addAdUnits([{code: 'slot', bids: [customBid, {bidder: 'adapex', params: {seat: 'publisher', bogus: true}}]}]);
// @ts-expect-error - required parameters stay required
pbjs.addAdUnits({code: 'slot', bids: [{bidder: 'adapex', params: {}}]});
// @ts-expect-error - requestBids also infers bidder names
typedPbjs.requestBids({adUnits: [{code: 'slot', bids: [{bidder: 'custom', params: {}}, {bidder: 'adapex', params: {seat: false}}]}]});
// @ts-expect-error - declared aliases keep their bidder's types
pbjs.addAdUnits({code: 'slot', bids: [{bidder: 'appnexusAst', params: {placementId: true}}]});
// @ts-expect-error - standalone generic definitions validate params too
const invalid: AdUnitDefinition<'adapex'> = {code: 'slot', bids: [{bidder: 'adapex', params: {seat: 42}}]};
// @ts-expect-error - mutually exclusive parameter alternatives are preserved
pbjs.addAdUnits({code: 'slot', bids: [{bidder: 'adf', params: {mid: 1, inv: 1, mname: 'tag'}}]});
`,
  'bidderSettings.ts': `
import pbjs from 'prebid.js';
import type {BidRequest, BidderScopedSettings, BidderSettings, BidderSettingsMap} from 'prebid.js';
import 'prebid.js/modules/adapexBidAdapter';
import 'prebid.js/modules/appnexusBidAdapter';
import 'prebid.js/modules/priceFloors';
const defaults: BidderSettings<string> = {storageAllowed: false};
const scoped: BidderScopedSettings<'adapex'> = {
  bidCpmAdjustment(cpm, _bid, request) {
    const code: 'adapex' = request.bidder;
    const seat: string = request.params.seat;
    // @ts-expect-error - callback params remain specific to the bidder
    request.params.placementId;
    return code && seat ? cpm : 0;
  }
};
const settings = {
  standard: defaults,
  adapex: {
    ...scoped,
    bidDesirabilityAdjustment(cpm, _bid, request) { return request.params.seat ? cpm : 0; },
    inverseBidAdjustment(floor, request) { const seat: string = request.params.seat; return seat ? floor : 0; },
    adserverTargeting: [{key: 'seat', val: (_bid, request) => request.params.seat}]
  },
  custom: {
    bidCpmAdjustment(cpm, _bid, request) {
      const bidder: string = request.bidder;
      const anything: unknown = request.params.anything;
      // @ts-expect-error - custom params retain unknown rather than any
      const wrong: string = request.params.anything;
      return bidder && anything !== wrong ? cpm : 0;
    }
  }
} satisfies BidderSettingsMap;
pbjs.bidderSettings = settings;
pbjs.bidderSettings = {
  appnexus: {bidCpmAdjustment(cpm, _bid, request) {
    const code: 'appnexus' = request.bidder;
    const placement: number | string | undefined = request.params.placementId;
    // @ts-expect-error - whole-object assignment keeps callback parameter checking
    request.params.seat;
    return code && placement ? cpm : 0;
  }}
};
pbjs.bidderSettings.adapex = scoped;
// @ts-expect-error - a callback for a different bidder is rejected
pbjs.bidderSettings.adapex = {bidCpmAdjustment: (cpm: number, _bid: unknown, _request: BidRequest<'appnexus'>) => cpm};
// @ts-expect-error - a named bidder's callback must accept all of that bidder's requests
pbjs.bidderSettings.adapex = {bidCpmAdjustment: (cpm: number, _bid: unknown, _request: BidRequest<'adapex'> & {extraRequiredField: string}) => cpm};
// @ts-expect-error - known settings values stay typed
pbjs.bidderSettings = {adapex: {allowZeroCpmBids: 'invalid'}};
// @ts-expect-error - custom bidders still use the shared settings types
pbjs.bidderSettings = {custom: {storageAllowed: 'invalid'}};
// @ts-expect-error - excess setting keys are rejected
pbjs.bidderSettings = {adapex: {bogus: true}};
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

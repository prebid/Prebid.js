// Command-line build script (console output is its interface).
/* eslint-disable no-console */
// Build Karma's test bundles with Karma's own webpack/Babel configuration - one entry per spec
// file - and give Vitest Browser Mode a tiny ES module per spec that loads them as classic scripts.
// Vite never transforms the bundles (they're served from publicDir); module exports stay the plain
// CommonJS objects that `sinon.stub(namespace, 'fn')` relies on.
//
// Classic scripts, not ES module output: an ES module is strict mode as a whole, and webpack would put
// every bundled module in it - including sloppy-mode CommonJS from node_modules (e.g. dset), where
// assigning to a getter-only property is silently ignored under karma but throws in strict mode.
//
// Environment (mirrors karmaRunner.js):
//   VITEST_FILES   comma separated spec paths (like `gulp test-only --file`); no pipeline_setup, like Karma
//   TEST_CHUNKS    number of chunks the full suite is split into (default 8, as in gulpfile.js)
//   TEST_CHUNK     which chunk to build (1-based); omit to build every spec
//   TEST_PAT       spec file pattern (default *_spec.js)
//   VITEST_SOURCEMAPS=1  emit inline source maps (slower, larger)
//   VITEST_COVERAGE=1    instrument with babel-plugin-istanbul, as karma does with coverage on, and write
//                        lcov to build/coverage/chunks/<chunk>/lcov.info (see README.md, "Coverage")
//
// Run `npx gulp precompile` first, exactly as for `test-only-nobuild`.
const path = require('path');
const fs = require('fs');
// glob is a devDependency; this is a build script, not shipped code.
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');
const webpack = require('webpack');
const karmaConfMaker = require('../../karma.conf.maker.js');
const helpers = require('../../gulpHelpers.js');

const ROOT = path.resolve(__dirname, '../..');
// the test files Vitest collects (one small ES module per spec)
const OUT = path.resolve(ROOT, 'build/vitest-bundles');
// Vite's publicDir (see vitest.config.mjs): served as-is at /wp/...
const PUBLIC = path.resolve(ROOT, 'build/vitest-public');
const SCRIPTS = path.join(PUBLIC, 'wp');

const specName = (spec) => spec.replace(/^test\/spec\//, '').replace(/\.js$/, '');

/**
 * Pick what to bundle. Each group becomes one bundle and one Vitest test file, i.e. one page with one set
 * of module instances, as Karma loads one chunk into one page:
 * - TEST_CHUNKS/TEST_CHUNK/TEST_PAT (as karmaRunner.js): one group per chunk, so a spec that leaks global
 *   or module state can break a later one, which is what the chunked Karma run checks;
 * - VITEST_FILES (like `gulp test-only --file`), or VITEST_ISOLATE_SPECS=1: one group per spec, which instead
 *   finds specs that only pass because of state leaked by others.
 * @returns {{groups: {name: string, specs: string[]}[], pipeline: boolean}} groups to bundle, and whether to
 *   include pipeline_setup (chunk runs only, as Karma)
 */
function selectGroups () {
  const perSpec = (specs) => specs.map(spec => ({ name: specName(spec), specs: [spec] }));
  if (process.env.VITEST_FILES) {
    return { groups: perSpec(process.env.VITEST_FILES.split(',').map(f => f.trim()).filter(Boolean)), pipeline: false };
  }
  // same chunking as karmaRunner.js
  const chunkNum = process.env.TEST_CHUNKS ?? 8;
  const pat = process.env.TEST_PAT ?? '*_spec.js';
  const tests = glob.sync('test/spec/**/' + pat, { cwd: ROOT }).map(f => f.replace(/\\/g, '/')).sort();
  const chunkLen = chunkNum === 'MAX' ? 0 : Math.floor(tests.length / Number(chunkNum));
  let chunks = [[]];
  tests.forEach((fn) => {
    chunks[chunks.length - 1].push(fn);
    if (chunks[chunks.length - 1].length > chunkLen) chunks.push([]);
  });
  chunks = chunks.filter(c => c.length > 0);
  const n = process.env.TEST_CHUNK ? Number(process.env.TEST_CHUNK) : null;
  const selected = n ? [[n, chunks[n - 1]]] : chunks.map((specs, i) => [i + 1, specs]);
  if (process.env.VITEST_ISOLATE_SPECS) {
    return { groups: perSpec(selected.flatMap(([, specs]) => specs)), pipeline: true };
  }
  return { groups: selected.map(([i, specs]) => ({ name: `chunks/chunk-${i}_spec`, specs })), pipeline: true };
}

/**
 * Build the webpack config for the selected groups from karma's own webpack config.
 * @param {object} options
 * @param {{name: string, specs: string[]}[]} options.groups one entry per group
 * @param {boolean} options.pipeline whether to load pipeline_setup first, as karma does for chunk runs
 * @returns {object} webpack configuration
 */
function makeConfig ({ groups, pipeline }) {
  const specs = groups.flatMap(group => group.specs);
  const coverage = !!process.env.VITEST_COVERAGE;
  // Reuse karma's webpack config as-is (babel-loader + @babel/plugin-transform-modules-commonjs,
  // resolution against dist/src, aliases, plugins). Only the entry/output shape changes below.
  const config = karmaConfMaker(coverage, false, false, specs, undefined, 1, false).webpack;

  // Karma loads, sharing one runtime: test_deps, [pipeline_setup], ...specs, hookSetup.
  // Each group gets one entry with the same modules in the same order.
  const pre = ['test/test_deps.js', ...(pipeline ? ['test/pipeline_setup.js'] : [])];
  const post = ['test/helpers/hookSetup.js'];
  config.entry = Object.fromEntries(groups.map(group => {
    return [group.name, [...pre, ...group.specs, ...post].map(f => helpers.getPrecompiledPath(f))];
  }));
  // with coverage, source maps also let babel-plugin-istanbul record each file's inputSourceMap, which
  // coverage.js uses to map counters back to the original sources (as karma-coverage does)
  config.devtool = process.env.VITEST_SOURCEMAPS || coverage ? 'inline-source-map' : false;
  config.output = {
    ...config.output,
    path: SCRIPTS,
    filename: '[name].js',
    chunkFilename: '_chunks/[id].js',
    clean: true,
  };
  // Every group gets its own module instances - Vitest gives each test file a fresh iframe, so the
  // runtime and shared chunks are evaluated once per group - but the shared *code* lives in one file
  // the browser downloads once and caches.
  // VITEST_SPLIT=0 emits fully self-contained bundles instead.
  config.optimization = process.env.VITEST_SPLIT === '0'
    ? { splitChunks: false, runtimeChunk: false, minimize: false }
    : {
        minimize: false,
        runtimeChunk: { name: '_chunks/runtime' },
        splitChunks: {
          chunks: 'all',
          minSize: 0,
          cacheGroups: {
            default: false,
            defaultVendors: false,
            commons: { name: '_chunks/commons', chunks: 'all', minChunks: Number(process.env.VITEST_SPLIT_MIN ?? 2) },
          },
        },
      };
  config.cache = {
    type: 'filesystem',
    cacheDirectory: path.resolve(ROOT, '.cache/webpack-vitest'),
    version: JSON.stringify({ coverage, pipeline }),
  };
  config.stats = 'errors-warnings';
  if (!process.env.VITEST_SOURCEMAPS) {
    // the precompiled modules carry `//# sourceMappingURL=x.js.map` comments that webpack leaves in
    // place when it isn't producing maps; Vite would then try (and fail) to read them
    config.plugins = [...(config.plugins || []), {
      apply (compiler) {
        compiler.hooks.thisCompilation.tap('StripSourceMapComments', (compilation) => {
          compilation.hooks.processAssets.tap({ name: 'StripSourceMapComments', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING }, (assets) => {
            Object.keys(assets).filter(f => f.endsWith('.js')).forEach(file => {
              const src = assets[file].source().toString();
              compilation.updateAsset(file, new webpack.sources.RawSource(src.replace(/\/\/# sourceMappingURL=\S*$/gm, '')));
            });
          });
        });
      }
    }];
  }
  return config;
}

const selection = selectGroups();
const started = Date.now();
webpack(makeConfig(selection), (err, stats) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const info = stats.toJson({ all: false, errors: true, warnings: true });
  if (stats.hasErrors()) {
    info.errors.forEach(e => console.error(e.message));
    process.exit(1);
  }
  // one test file per group: load its entrypoint's scripts (runtime, shared chunk, entry) in order
  fs.rmSync(OUT, { recursive: true, force: true });
  const { entrypoints } = stats.toJson({ all: false, entrypoints: true });
  Object.entries(entrypoints).forEach(([name, { assets }]) => {
    const urls = assets.map(a => '/wp/' + (typeof a === 'string' ? a : a.name));
    const file = path.join(OUT, name + '.js');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `import {loadScripts} from '/test/vitest-webpack/loadScripts.mjs';
await loadScripts(${JSON.stringify(urls)});
`);
  });
  // which source specs each test file runs (used by githubReporter.mjs to locate failures)
  fs.writeFileSync(path.join(OUT, 'groups.json'), JSON.stringify(
    Object.fromEntries(selection.groups.map(group => [`build/vitest-bundles/${group.name}.js`, group.specs])), null, 2));
  const specCount = selection.groups.reduce((n, group) => n + group.specs.length, 0);
  console.log(`built ${selection.groups.length} bundle(s) covering ${specCount} spec file(s) into ${path.relative(ROOT, OUT)} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
});

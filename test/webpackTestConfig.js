// The webpack configuration the unit test bundles are built with (test/vitest-webpack/build.js): the bundle
// build's config (webpack.conf.js), in development mode with inline source maps, compiling ES modules to
// CommonJS so specs can stub a module's exports, and optionally instrumented for coverage.
const _ = require('lodash');
const path = require('path');
const webpackConf = require('../webpack.conf.js');
const helpers = require('../gulpHelpers.js');
const { readPrecompilationKey } = require('../gulp.cache.js');

const root = path.resolve(__dirname, '..');
const cacheDir = path.resolve(root, '.cache/babel-loader');

/**
 * @param {object} [options]
 * @param {boolean} [options.coverage] instrument the sources with babel-plugin-istanbul
 * @param {boolean} [options.singleSpec] the build is for one spec file: keep webpack's filesystem cache
 */
function webpackTestConfig({ coverage = false, singleSpec = false } = {}) {
  // a clone, since this mutates it and parallel builds mustn't trample each other
  const webpackConfig = _.cloneDeep(webpackConf);

  // Keyed on what `dist/src` actually is, rather than on `argv` as the bundle builds are: the variant that
  // matters here is not always visible from the command line (`gulp test` runs `test-all-features-disabled`,
  // `serve-and-test` precompiles with `dev`, and coverage changes the loader options below). Miss any of those
  // and webpack serves modules compiled from the other variant - silently, since the paths and the mtimes are
  // identical. The tree is on disk by the time this runs, so ask it.
  //
  // Note this replaces the `cache` that `webpack.common.js` set up for the bundle builds, version included,
  // which is why it has to state its own.
  const treeKey = readPrecompilationKey();
  Object.assign(webpackConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    // an untracked tree - never precompiled, or precompiled before the stamp existed - offers nothing safe to
    // key on, so reuse nothing
    cache: (treeKey == null || !singleSpec) ? false : {
      type: 'filesystem',
      cacheDirectory: path.resolve(root, '.cache/webpack-test'),
      version: JSON.stringify({ precompilation: treeKey, coverage: !!coverage }),
      // Only for a single-spec build. A store rewrites the cache for the compilation that just ran, so a
      // one-spec build and a full one evict each other's entries - and the full suite is eight compilations,
      // which between them grow this to ~800MB while saving under 10%. A single spec keeps it around 33MB and
      // compiles in a fifth of the time. Stored as soon as the build goes idle, since the run is short.
      idleTimeoutForInitialStore: 0,
    },
  });
  ['entry', 'optimization'].forEach(prop => delete webpackConfig[prop]);
  webpackConfig.resolve = webpackConfig.resolve || {};
  webpackConfig.resolve.alias = webpackConfig.resolve.alias || {};
  Object.assign(webpackConfig.resolve.alias, {
    'web-bundler': path.resolve(root, 'web-bundler')
  });
  webpackConfig.module = webpackConfig.module || {};
  webpackConfig.module.rules = webpackConfig.module.rules || [];
  webpackConfig.module.rules.push({
    test: /\.js$/,
    exclude: [path.resolve('./node_modules'), path.resolve(root, 'web-bundler')],
    loader: 'babel-loader',
    options: {
      cacheDirectory: cacheDir,
      cacheCompression: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'].concat(coverage ? [['babel-plugin-istanbul', {
        // Keep the specs out of coverage: they run start to finish by definition, so counting them swamps the
        // totals for the code they exercise. `exclude` is anchored to `cwd`, which has to be the precompiled
        // tree because that's where the files being instrumented live. Both options are needed - `cwd` on its
        // own is overridden by the nyc config lookup, which walks up to the nearest package.json and resets
        // `cwd` to the repo root.
        cwd: helpers.getPrecompiledPath(),
        exclude: ['test/**']
      }]] : [])
    }
  });
  return webpackConfig;
}

module.exports = { webpackTestConfig };

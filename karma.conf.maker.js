// This configures Karma, describing how to run the tests and where to output code coverage reports.
//
// For more information, see http://karma-runner.github.io/1.0/config/configuration-file.html

var _ = require('lodash');
var webpackConf = require('./webpack.conf.js');
var karmaConstants = require('karma').constants;
const path = require('path');
const helpers = require('./gulpHelpers.js');
const {readPrecompilationKey} = require('./gulp.cache.js');
const cacheDir = path.resolve(__dirname, '.cache/babel-loader');

function newWebpackConfig(codeCoverage, disableFeatures, watchMode, singleSpec) {
  // Make a clone here because we plan on mutating this object, and don't want parallel tasks to trample each other.
  var webpackConfig = _.cloneDeep(webpackConf);

  // Keyed on what `dist/src` actually is, rather than on `argv` as the bundle builds are: the
  // variant that matters here is not always visible from the command line. `gulp test` runs
  // `test-all-features-disabled`, which passes its feature set in directly; `serve-and-test`
  // precompiles with `dev`; and coverage changes the loader options below. Miss any of those and
  // webpack serves modules compiled from the other variant - silently, since the paths and the
  // mtimes are identical. The tree is on disk by the time this runs, so ask it.
  //
  // Note this replaces the `cache` that `webpack.common.js` set up for the bundle builds, version
  // included, which is why it has to state its own.
  const treeKey = readPrecompilationKey();
  Object.assign(webpackConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    // an untracked tree - never precompiled, or precompiled before the stamp existed - offers
    // nothing safe to key on, so reuse nothing
    cache: (treeKey == null || !singleSpec) ? false : {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.cache/webpack-test'),
      version: JSON.stringify({precompilation: treeKey, coverage: !!codeCoverage}),
      // Only for a single-spec run, and only then. A store rewrites the cache for the
      // compilation that just ran, so a `--file` run and a full run evict each other's entries -
      // and the full suite is eight compilations, which between them grow this to ~800MB while
      // saving under 10%. A single spec keeps it around 33MB and compiles in a fifth of the time.
      //
      // Store as soon as the build goes idle, rather than after webpack's default 5s.
      //
      // Nothing closes the compiler in a single run: karma-webpack registers `compiler.close()`
      // - which is what flushes the cache - only on its watch branch, and that branch needs
      // `watch: true` in the webpack options, which its own defaults set to false. So the only
      // way anything is written is webpack's idle timer, and a `--file` run finishes in a
      // couple of seconds and then exits through `karmaRunner`'s `process.exit()`. Left at the
      // default, this cache is populated only by long multi-chunk runs - the ones that need it
      // least - and never by the fast single-spec loop it would actually help.
      //
      // Watch mode keeps the defaults: that process lives long enough for them to fire on their
      // own, and storing after every rebuild would put tens of megabytes of I/O in the save loop.
      ...(watchMode ? {} : {idleTimeoutForInitialStore: 0})
    },
  });
  ['entry', 'optimization'].forEach(prop => delete webpackConfig[prop]);
  webpackConfig.resolve = webpackConfig.resolve || {};
  webpackConfig.resolve.alias = webpackConfig.resolve.alias || {};
  Object.assign(webpackConfig.resolve.alias, {
    'web-bundler': path.resolve(__dirname, 'web-bundler')
  })
  webpackConfig.module = webpackConfig.module || {};
  webpackConfig.module.rules = webpackConfig.module.rules || [];
  webpackConfig.module.rules.push({
    test: /\.js$/,
    exclude: [path.resolve('./node_modules'), path.resolve(__dirname, 'web-bundler')],
    loader: 'babel-loader',
    options: {
      cacheDirectory: cacheDir, cacheCompression: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'].concat(codeCoverage ? [['babel-plugin-istanbul', {
        // The coverage instrumentation options below were written by a bot (Claude Code).
        // Keep the specs out of coverage: they run start to finish by definition, so counting them
        // swamps the totals for the code they exercise. `exclude` is anchored to `cwd`, which has to be
        // the precompiled tree because that's where the files being instrumented live. Both options are
        // needed - `cwd` on its own is overridden by the nyc config lookup, which walks up to the
        // nearest package.json and resets `cwd` to the repo root.
        cwd: helpers.getPrecompiledPath(),
        exclude: ['test/**']
      }]] : [])
    }
  })
  return webpackConfig;
}

function newPluginsArray(browserstack) {
  var plugins = [
    'karma-chrome-launcher',
    'karma-safarinative-launcher',
    'karma-coverage',
    'karma-mocha',
    'karma-chai',
    'karma-sinon',
    'karma-sourcemap-loader',
    'karma-spec-reporter',
    'karma-webpack',
    'karma-mocha-reporter',
    '@chiragrupani/karma-chromium-edge-launcher',
  ];
  if (browserstack) {
    plugins.push('karma-browserstack-launcher');
  }
  plugins.push('karma-firefox-launcher');
  plugins.push('karma-opera-launcher');
  plugins.push('karma-script-launcher');
  return plugins;
}

function setReporters(karmaConf, codeCoverage, browserstack, chunkNo) {
  // In browserstack, the default 'progress' reporter floods the logs.
  // The karma-spec-reporter reports failures more concisely
  if (browserstack) {
    karmaConf.reporters = ['spec'];
    karmaConf.specReporter = {
      maxLogLines: 100,
      suppressErrorSummary: false,
      suppressSkipped: false,
      suppressPassed: true
    };
  }

  if (codeCoverage) {
    karmaConf.reporters.push('coverage');
    karmaConf.coverageReporter = {
      dir: `build/coverage/chunks/${chunkNo}`,
      reporters: [
        { type: 'lcov', subdir: '.' }
      ]
    };
  }
}

function setBrowsers(karmaConf, browserstack) {
  karmaConf.customLaunchers = karmaConf.customLaunchers || {};
  karmaConf.customLaunchers.ChromeNoSandbox = {
    base: 'ChromeHeadless',
    // disable sandbox - necessary within Docker and when using versions installed through @puppeteer/browsers
    flags: ['--no-sandbox']
  }
  if (browserstack) {
    karmaConf.browserStack = {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
      build: process.env.BROWSERSTACK_BUILD_NAME
    }
    if (process.env.BROWSERSTACK_LOCAL_IDENTIFIER) {
      karmaConf.browserStack.startTunnel = false;
      karmaConf.browserStack.tunnelIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    }
    karmaConf.customLaunchers = require('./browsers.json');
    karmaConf.browsers = Object.keys(karmaConf.customLaunchers);
  } else {
    var isDocker = require('is-docker')();
    if (isDocker) {
      karmaConf.browsers = ['ChromeNoSandbox'];
    } else {
      karmaConf.browsers = ['ChromeHeadless'];
    }
  }
}

module.exports = function(codeCoverage, browserstack, watchMode, file, disableFeatures, chunkNo, singleSpec) {
  var webpackConfig = newWebpackConfig(codeCoverage, disableFeatures, watchMode, singleSpec);
  var plugins = newPluginsArray(browserstack);
  if (file) {
    file = Array.isArray(file) ? ['test/pipeline_setup.js', ...file] : [file]
  }

  var files = file ? ['test/test_deps.js', ...file, 'test/helpers/hookSetup.js'].flatMap(f => f) : ['test/test_index.js'];
  files = files.map(helpers.getPrecompiledPath);

  var config = {
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    webpack: webpackConfig,
    webpackMiddleware: {
      stats: 'errors-only',
      noInfo: true
    },
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai', 'sinon', 'webpack'],

    // test files should not be watched or they'll run twice after an update
    // (they are still, in fact, watched through autoWatch: true)
    files: files.map(fn => ({pattern: fn, watched: false, served: true, included: true})),

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: Object.fromEntries(files.map(f => [f, ['webpack', 'sourcemap']])),

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: karmaConstants.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: watchMode,
    autoWatchBatchDelay: 2000,

    reporters: ['mocha'],

    client: {
      mocha: {
        timeout: 3000
      }
    },

    mochaReporter: {
      showDiff: true,
      output: 'minimal'
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: !watchMode,
    browserDisconnectTimeout: 1e4,
    browserNoActivityTimeout: 3e4,
    captureTimeout: 2e4,
    browserDisconnectTolerance: 5,
    concurrency: 5, // browserstack allows us 5 concurrent sessions

    plugins: plugins
  };

  setReporters(config, codeCoverage, browserstack, chunkNo);
  setBrowsers(config, browserstack);
  return config;
}

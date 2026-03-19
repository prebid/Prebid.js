// This configures Karma, describing how to run the tests and where to output code coverage reports.
//
// For more information, see http://karma-runner.github.io/1.0/config/configuration-file.html

var _ = require('lodash');
var webpackConf = require('./webpack.conf.js');
var karmaConstants = require('karma').constants;
const path = require('path');
const helpers = require('./gulpHelpers.js');
const cacheDir = path.resolve(__dirname, '.cache/babel-loader');

function newWebpackConfig(codeCoverage, disableFeatures) {
  // Make a clone here because we plan on mutating this object, and don't want parallel tasks to trample each other.
  var webpackConfig = _.cloneDeep(webpackConf);

  Object.assign(webpackConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.cache/webpack-test')
    },
  });
  ['entry', 'optimization'].forEach(prop => delete webpackConfig[prop]);
  webpackConfig.module = webpackConfig.module || {};
  webpackConfig.module.rules = webpackConfig.module.rules || [];
  webpackConfig.module.rules.push({
    test: /\.js$/,
    exclude: path.resolve('./node_modules'),
    loader: 'babel-loader',
    options: {
      cacheDirectory: cacheDir, cacheCompression: false,
      presets: [['@babel/preset-env', {modules: 'commonjs'}]],
      plugins: codeCoverage ? ['babel-plugin-istanbul'] : []
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

module.exports = function(codeCoverage, browserstack, watchMode, file, disableFeatures, chunkNo) {
  var webpackConfig = newWebpackConfig(codeCoverage, disableFeatures);
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

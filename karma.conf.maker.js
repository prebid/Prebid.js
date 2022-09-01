// This configures Karma, describing how to run the tests and where to output code coverage reports.
//
// For more information, see http://karma-runner.github.io/1.0/config/configuration-file.html

const babelConfig = require('./babelConfig.js');
var _ = require('lodash');
var webpackConf = require('./webpack.conf.js');
var karmaConstants = require('karma').constants;

function newWebpackConfig(codeCoverage, disableFeatures) {
  // Make a clone here because we plan on mutating this object, and don't want parallel tasks to trample each other.
  var webpackConfig = _.cloneDeep(webpackConf);

  Object.assign(webpackConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
  });

  delete webpackConfig.entry;

  webpackConfig.module.rules
    .flatMap((r) => r.use)
    .filter((use) => use.loader === 'babel-loader')
    .forEach((use) => {
      use.options = babelConfig({test: true, disableFeatures});
    });

  if (codeCoverage) {
    webpackConfig.module.rules.push({
      enforce: 'post',
      exclude: /(node_modules)|(test)|(integrationExamples)|(build)|polyfill.js|(src\/adapters\/analytics\/ga.js)/,
      use: {
        loader: '@jsdevtools/coverage-istanbul-loader',
        options: { esModules: true }
      },
      test: /\.js$/
    })
  }
  return webpackConfig;
}

function newPluginsArray(browserstack) {
  var plugins = [
    'karma-chrome-launcher',
    'karma-coverage',
    'karma-es5-shim',
    'karma-mocha',
    'karma-chai',
    'karma-sinon',
    'karma-sourcemap-loader',
    'karma-spec-reporter',
    'karma-webpack',
    'karma-mocha-reporter'
  ];
  if (browserstack) {
    plugins.push('karma-browserstack-launcher');
  }
  plugins.push('karma-firefox-launcher');
  plugins.push('karma-opera-launcher');
  plugins.push('karma-safari-launcher');
  plugins.push('karma-script-launcher');
  plugins.push('karma-ie-launcher');
  return plugins;
}

function setReporters(karmaConf, codeCoverage, browserstack) {
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
      dir: 'build/coverage',
      reporters: [
        { type: 'lcov', subdir: '.' }
      ]
    };
  }
}

function setBrowsers(karmaConf, browserstack) {
  if (browserstack) {
    karmaConf.browserStack = {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
      build: 'Prebidjs Unit Tests ' + new Date().toLocaleString(),
      startTunnel: false,
      localIdentifier: process.env.CIRCLE_WORKFLOW_JOB_ID
    }
    if (process.env.TRAVIS) {
      karmaConf.browserStack.startTunnel = false;
      karmaConf.browserStack.tunnelIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    }
    karmaConf.customLaunchers = require('./browsers.json');
    karmaConf.browsers = Object.keys(karmaConf.customLaunchers);
  } else {
    var isDocker = require('is-docker')();
    if (isDocker) {
      karmaConf.customLaunchers = karmaConf.customLaunchers || {};
      karmaConf.customLaunchers.ChromeCustom = {
        base: 'ChromeHeadless',
        // We must disable the Chrome sandbox when running Chrome inside Docker (Chrome's sandbox needs
        // more permissions than Docker allows by default)
        flags: ['--no-sandbox']
      }
      karmaConf.browsers = ['ChromeCustom'];
    } else {
      karmaConf.browsers = ['ChromeHeadless'];
    }
  }
}

module.exports = function(codeCoverage, browserstack, watchMode, file, disableFeatures) {
  var webpackConfig = newWebpackConfig(codeCoverage, disableFeatures);
  var plugins = newPluginsArray(browserstack);

  var files = file ? ['test/test_deps.js', file] : ['test/test_index.js'];
  // This file opens the /debug.html tab automatically.
  // It has no real value unless you're running --watch, and intend to do some debugging in the browser.
  if (watchMode) {
    files.push('test/helpers/karma-init.js');
  }

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
    frameworks: ['es5-shim', 'mocha', 'chai', 'sinon'],

    files: files,

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/test_index.js': ['webpack', 'sourcemap']
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: karmaConstants.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

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
    browserDisconnectTimeout: 3e5, // default 2000
    browserNoActivityTimeout: 3e5, // default 10000
    captureTimeout: 3e5, // default 60000,
    browserDisconnectTolerance: 3,
    concurrency: 6,

    plugins: plugins
  }

  // To ensure that, we are able to run single spec file
  // here we are adding preprocessors, when file is passed
  if (file) {
    config.files.forEach((file) => {
      config.preprocessors[file] = ['webpack', 'sourcemap'];
    });
    delete config.preprocessors['test/test_index.js'];
  }

  setReporters(config, codeCoverage, browserstack);
  setBrowsers(config, browserstack);
  return config;
}
